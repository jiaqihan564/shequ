import axios, { type AxiosInstance, type AxiosResponse, type AxiosRequestConfig } from 'axios'

import { authManager } from '@/utils/auth/authManager'

import { getAuthToken, generateRequestId, cleanExpiredCache, createCacheKey } from './axios-helpers'
import { logger } from '../ui/logger'

import { apiConfig, apiDefaultsConfig } from '@/config'
import { HTTP_STATUS, isServerErrorStatus } from '@/config/http-status'
import { STORAGE_KEYS } from '@/config/storage-keys'
import type {
  ApiResponse,
  LoginResponse,
  LoginForm,
  RegisterForm,
  RegisterResponse,
  User,
  AppError,
  AvatarHistoryItem,
  AvatarHistoryList
} from '@/types'

// 创建axios实例
const api: AxiosInstance = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json'
  },
  // 性能优化配置
  maxRedirects: apiConfig.maxRedirects,
  validateStatus: status => !isServerErrorStatus(status), // 只对5xx错误抛出异常
  maxContentLength: apiConfig.maxContentLength,
  maxBodyLength: apiConfig.maxBodyLength
})

// 请求缓存
const requestCache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_DURATION = apiConfig.cacheDuration

// 请求取消：组件卸载时取消pending请求
const cancelTokens = new Map<string, AbortController>()

// 定期清理过期缓存（每5分钟）
setInterval(
  () => {
    cleanExpiredCache(requestCache, CACHE_DURATION)
  },
  5 * 60 * 1000
)

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 添加认证token
    const token = getAuthToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // 添加请求ID用于追踪
    const requestId = generateRequestId()
    config.headers['X-Request-ID'] = requestId

    // 为GET请求检查缓存（避免重复请求）
    if (config.method === 'get') {
      const cacheKey = createCacheKey(config.url || '', config.params)
      const cached = requestCache.get(cacheKey)

      // 如果有有效缓存，直接返回缓存数据（模拟响应）
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        logger.debug('使用缓存响应:', cacheKey)
        return Promise.reject({
          __CACHE_HIT__: true,
          cachedResponse: {
            data: cached.data,
            status: HTTP_STATUS.OK,
            statusText: 'OK',
            headers: {},
            config: config
          }
        })
      }
    }

    // 创建取消令牌（用于组件卸载时取消请求）
    const controller = new AbortController()
    config.signal = controller.signal
    cancelTokens.set(requestId, controller)

    // 添加时间戳防止浏览器缓存
    if (config.method === 'get' && !config.params) {
      config.params = { _t: Date.now() }
    }

    return config
  },
  error => {
    return Promise.reject(createAppError('REQUEST_ERROR', '请求配置错误', error))
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const requestId = response.config.headers?.['X-Request-ID'] as string

    // 清理cancel token
    if (requestId) {
      cancelTokens.delete(requestId)
    }

    // 缓存GET请求的响应
    if (response.config.method === 'get' && response.status === HTTP_STATUS.OK) {
      const cacheKey = createCacheKey(response.config.url || '', response.config.params)
      requestCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      })
    }

    return response
  },
  async error => {
    // 处理缓存命中的情况
    if (error.__CACHE_HIT__ && error.cachedResponse) {
      logger.debug('返回缓存响应')
      return error.cachedResponse
    }

    // 处理请求取消
    if (axios.isCancel(error)) {
      logger.debug('请求已取消:', error.message)
      return Promise.reject(createAppError('REQUEST_CANCELLED', '请求已取消'))
    }

    const originalRequest = error.config
    const requestId = originalRequest?.headers?.['X-Request-ID'] as string

    // 清理cancel token
    if (requestId) {
      cancelTokens.delete(requestId)
    }

    // 处理认证错误（401）
    if (error.response?.status === HTTP_STATUS.UNAUTHORIZED) {
      const errorMessage = error.response?.data?.message || '登录已过期'
      const errorCode = error.response?.data?.code
      const requestUrl = originalRequest?.url || 'unknown'

      logger.info('[API拦截器] 捕获到401错误', {
        url: requestUrl,
        message: errorMessage,
        code: errorCode,
        timestamp: new Date().toISOString()
      })

      // 如果是登录请求本身失败，不触发自动登出
      if (originalRequest?.url?.includes('/auth/login')) {
        logger.info('[API拦截器] 登录请求失败，不触发自动登出')
        const appError = createAppError(
          errorCode?.toString() || 'LOGIN_FAILED',
          errorMessage || '用户名或密码错误',
          error.response?.data
        )
        return Promise.reject(appError)
      }

      // 确定失效原因
      let reason = '登录已过期'
      if (errorMessage.includes('无效') || errorCode === 'INVALID_TOKEN') {
        reason = 'Token无效'
      } else if (errorMessage.includes('过期') || errorCode === 'TOKEN_EXPIRED') {
        reason = 'Token已过期'
      } else if (errorMessage.includes('缺少') || errorCode === 'MISSING_TOKEN') {
        reason = '未登录'
      }

      logger.info('[API拦截器] 调用 AuthManager 处理token过期', { reason })

      // 使用 AuthManager 统一处理（带防抖，自动跳转）
      authManager.handleTokenExpiration(reason)

      // 返回错误供调用方处理（但跳转已触发）
      return Promise.reject(
        createAppError('AUTH_EXPIRED', errorMessage || '认证已过期，请重新登录')
      )
    }

    // 处理其他HTTP错误
    if (error.response) {
      logger.warn('[API拦截器] HTTP错误', {
        status: error.response.status,
        url: originalRequest?.url,
        message: error.response?.data?.message
      })

      const appError = createAppError(
        error.response?.data?.code?.toString() || 'API_ERROR',
        error.response?.data?.message || '请求失败',
        error.response?.data
      )
      return Promise.reject(appError)
    }

    // 处理网络错误
    if (error.request) {
      logger.error('[API拦截器] 网络错误', { url: originalRequest?.url })
      return Promise.reject(createAppError('NETWORK_ERROR', '网络连接失败，请检查您的网络'))
    }

    // 处理其他错误
    logger.error('[API拦截器] 未知错误', { error })
    return Promise.reject(createAppError('UNKNOWN_ERROR', error.message || '未知错误'))
  }
)

// 工具函数
// getAuthToken 和 generateRequestId 现在从 axios-helpers.ts 导入

function getActiveStorage(): Storage {
  if (localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)) return localStorage
  if (sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)) return sessionStorage
  return localStorage
}

function setAuthTokens(token: string, scope: 'local' | 'session' = 'local'): void {
  const store = scope === 'local' ? localStorage : sessionStorage
  store.setItem(STORAGE_KEYS.AUTH_TOKEN, token)
}

function setUserInfo(user: User, scope: 'local' | 'session' = 'local'): void {
  const store = scope === 'local' ? localStorage : sessionStorage
  const withVersion = { ...user } as { avatar_version?: number; [key: string]: unknown }
  if (!withVersion.avatar_version) {
    // 初次写入或无版本时初始化
    withVersion.avatar_version = Date.now()
  }
  store.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(withVersion))
}

function clearAuthTokens(): void {
  for (const store of [localStorage, sessionStorage]) {
    store.removeItem(STORAGE_KEYS.AUTH_TOKEN)
    store.removeItem(STORAGE_KEYS.USER_INFO)
  }
}

function createAppError(code: string, message: string, details?: unknown): AppError {
  return {
    code,
    message,
    details,
    stack: new Error().stack
  }
}

// 统一规范化与深合并后端返回的用户数据
function normalizeUserData(user: Partial<User>): User {
  const store = getActiveStorage()
  let prev: Partial<User> | null = null
  try {
    const raw = store.getItem(STORAGE_KEYS.USER_INFO)
    prev = raw ? JSON.parse(raw) : null
  } catch {
    prev = null
  }

  const merged: Partial<User> = {
    ...(prev || {}),
    ...(user || {})
  }

  const prevProfile = (prev && prev.profile) || {}
  const userProfile = (user && user.profile) || {}
  const mergedProfile = {
    ...prevProfile,
    ...userProfile
  }

  // 将根级 nickname/bio 映射进 profile（后端新返回格式）
  if (user && 'nickname' in user && mergedProfile.nickname === undefined) {
    mergedProfile.nickname = user.nickname as string
  }
  if (user && 'bio' in user && mergedProfile.bio === undefined) {
    mergedProfile.bio = user.bio as string
  }

  // 关键资料字段空值不覆盖（地址相关前端自治）
  const preferPrev = (nextVal: unknown, prevVal: unknown) =>
    nextVal === undefined || nextVal === null || nextVal === '' ? (prevVal ?? '') : nextVal
  mergedProfile.province = preferPrev(mergedProfile.province, prevProfile.province) as string
  mergedProfile.city = preferPrev(mergedProfile.city, prevProfile.city) as string

  merged.profile = mergedProfile

  // 头像归一化与保留策略
  const normalized = {
    ...merged,
    avatar: merged.avatar || (merged as User & { avatar_url?: string }).avatar_url
  } as User & { avatar_version?: number }

  if (!normalized.avatar) normalized.avatar = prev?.avatar || ''
  if (!normalized.avatar_version) {
    normalized.avatar_version =
      (prev as User & { avatar_version?: number })?.avatar_version || Date.now()
  }

  return normalized as User
}

// 全局事件：用户信息更新
function emitUserUpdated(user: User): void {
  try {
    window.dispatchEvent(new CustomEvent('user:updated', { detail: user }))
  } catch (e) {
    void e
    /* no-op: 事件派发失败忽略 */
  }
}

// 清理过期缓存
function clearExpiredCache(): void {
  const now = Date.now()
  for (const [key, value] of requestCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      requestCache.delete(key)
    }
  }
}

// 定期清理缓存（保存interval ID以便清理）
let cacheCleanupInterval: number | null = null

function startCacheCleanup(): void {
  if (cacheCleanupInterval === null) {
    cacheCleanupInterval = window.setInterval(clearExpiredCache, CACHE_DURATION)
  }
}

function stopCacheCleanup(): void {
  if (cacheCleanupInterval !== null) {
    window.clearInterval(cacheCleanupInterval)
    cacheCleanupInterval = null
  }
}

// 启动清理任务
startCacheCleanup()

// 在页面卸载时清理
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    stopCacheCleanup()
    cancelAllRequests()
  })
}

// 清除所有缓存
export function clearApiCache(): void {
  requestCache.clear()
}

// 认证相关API
/**
 * 用户登录
 */
export async function login(loginData: LoginForm): Promise<LoginResponse> {
  const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', loginData)

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    const { token, user } = response.data.data
    // 统一规范化用户数据（含 nickname/bio 映射到 profile）
    const normalizedUser = normalizeUserData(user)

    // 存储认证信息
    const scope = loginData.rememberMe ? 'local' : 'session'
    setAuthTokens(token, scope)
    setUserInfo(normalizedUser, scope)
    emitUserUpdated(normalizedUser)

    return { ...response.data.data, user: normalizedUser }
  }

  throw createAppError('LOGIN_FAILED', response.data.message || '登录失败')
}

/**
 * 用户注册
 */
export async function register(registerData: RegisterForm): Promise<RegisterResponse> {
  try {
    const response = await api.post<ApiResponse<RegisterResponse>>('/auth/register', registerData)

    if (response.data.code === HTTP_STATUS.CREATED && response.data.data) {
      const { token, user } = response.data.data
      const normalizedUser = normalizeUserData(user)

      // 存储认证信息
      setAuthTokens(token)
      localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(normalizedUser))
      emitUserUpdated(normalizedUser)

      return { ...response.data.data, user: normalizedUser }
    }

    throw createAppError('REGISTER_FAILED', response.data.message || '注册失败')
  } catch (error) {
    logger.error('API: 注册请求失败:', error)
    throw error
  }
}

/**
 * 用户登出
 * @param navigateToLogin 是否跳转到登录页，默认true
 */
export async function logout(navigateToLogin: boolean = true): Promise<void> {
  logger.info('[API] 用户主动登出')

  try {
    // 尝试调用服务器登出接口（可能会因为token失效而失败，忽略错误）
    await api.post('/auth/logout')
    logger.info('服务器登出成功')
  } catch (error) {
    logger.warn('服务器登出失败（已忽略）:', error)
  } finally {
    // 清除所有本地数据
    clearAuthTokens()
    clearApiCache()
    cancelAllRequests()

    // 派发登出事件
    try {
      window.dispatchEvent(
        new CustomEvent('user:logout', {
          detail: { reason: '用户主动登出', automatic: false }
        })
      )
    } catch (e) {
      void e
    }

    logger.info('本地登出完成')

    // 跳转到登录页
    if (navigateToLogin) {
      setTimeout(() => {
        window.location.replace('/login')
      }, 300) // 短暂延迟，确保清理完成
    }
  }
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<User> {
  const response = await api.get<ApiResponse<User>>('/auth/me')

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    const user = response.data.data
    const normalizedUser = normalizeUserData(user) as any
    const store = getActiveStorage()
    store.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(normalizedUser))
    emitUserUpdated(normalizedUser)
    return normalizedUser
  }

  throw createAppError('GET_USER_FAILED', '获取用户信息失败')
}

/**
 * 更新用户信息
 */
export async function updateUser(userData: Partial<User>): Promise<User> {
  const response = await api.put<ApiResponse<User>>('/auth/me', userData)

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    const user = response.data.data
    const normalizedUser: any = normalizeUserData(user)
    const store = getActiveStorage()
    store.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(normalizedUser))
    emitUserUpdated(normalizedUser)
    return normalizedUser
  }

  throw createAppError('UPDATE_USER_FAILED', '更新用户信息失败')
}

/**
 * 修改密码
 */
export async function changePassword(data: {
  currentPassword: string
  newPassword: string
}): Promise<void> {
  const response = await api.post<ApiResponse>('/auth/change-password', data)

  if (response.data.code !== HTTP_STATUS.OK) {
    throw createAppError('CHANGE_PASSWORD_FAILED', response.data.message || '修改密码失败')
  }
}

/**
 * 上传图片（通用）
 * 返回图片的可访问 URL
 */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await api.post<ApiResponse<{ url?: string; path?: string }>>('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  if (res.data.code === HTTP_STATUS.OK && res.data.data) {
    return res.data.data.url || (res.data.data.path as string)
  }
  throw createAppError('UPLOAD_FAILED', res.data.message || '上传失败')
}

/**
 * 上传资源预览图（到资源专用桶）
 */
export async function uploadResourceImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)

  const response = await api.post<ApiResponse<{ image_url: string }>>(
    '/resources/images/upload',
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' }
    }
  )

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data.image_url
  }

  throw createAppError('UPLOAD_RESOURCE_IMAGE_FAILED', response.data.message || '上传资源图片失败')
}

/**
 * 上传文档图片（到资源专用桶）
 */
export async function uploadDocumentImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)

  const response = await api.post<ApiResponse<{ image_url: string }>>(
    '/resources/documents/upload',
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' }
    }
  )

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data.image_url
  }

  throw createAppError('UPLOAD_DOCUMENT_IMAGE_FAILED', response.data.message || '上传文档图片失败')
}

/**
 * 更新用户头像
 */
export async function updateUserAvatar(avatarUrl: string): Promise<User> {
  const res = await api.put<ApiResponse<User>>('/auth/me', { avatar: avatarUrl })
  if (res.data.code === HTTP_STATUS.OK && res.data.data) {
    const user = res.data.data
    const normalizedUser: any = normalizeUserData(user)
    // 头像更新成功，刷新版本号以破缓存
    normalizedUser.avatar_version = Date.now()
    const store = getActiveStorage()
    store.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(normalizedUser))
    emitUserUpdated(normalizedUser)
    return normalizedUser
  }
  throw createAppError('UPDATE_AVATAR_FAILED', res.data.message || '更新头像失败')
}

/**
 * 获取历史头像列表（时间倒序，最多50条）
 */
export async function getAvatarHistory(): Promise<AvatarHistoryItem[]> {
  const res = await api.get<ApiResponse<AvatarHistoryList>>('/user/avatar/history')
  if (res.data.code === HTTP_STATUS.OK && res.data.data) {
    return Array.isArray(res.data.data.items) ? res.data.data.items : []
  }
  throw createAppError('GET_AVATAR_HISTORY_FAILED', res.data.message || '获取历史头像失败')
}

// 通用API方法
/**
 * GET请求
 */
export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.get<ApiResponse<T>>(url, config)

  if (response.data.code === 200 && response.data.data !== undefined) {
    return response.data.data
  }

  throw createAppError('GET_FAILED', response.data.message || '获取数据失败')
}

/**
 * POST请求
 */
export async function post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.post<ApiResponse<T>>(url, data, config)

  if (response.data.code === 200 && response.data.data !== undefined) {
    return response.data.data
  }

  throw createAppError('POST_FAILED', response.data.message || '提交数据失败')
}

/**
 * PUT请求
 */
export async function put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.put<ApiResponse<T>>(url, data, config)

  if (response.data.code === 200 && response.data.data !== undefined) {
    return response.data.data
  }

  throw createAppError('PUT_FAILED', response.data.message || '更新数据失败')
}

/**
 * DELETE请求
 */
export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.delete<ApiResponse<T>>(url, config)

  if (response.data.code === 200 && response.data.data !== undefined) {
    return response.data.data
  }

  throw createAppError('DELETE_FAILED', response.data.message || '删除数据失败')
}

// 统计相关API
/**
 * 获取统计总览
 */
export async function getStatisticsOverview(): Promise<any> {
  const response = await api.get<ApiResponse<any>>('/statistics/overview')

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError('GET_OVERVIEW_FAILED', response.data.message || '获取统计总览失败')
}

/**
 * 获取用户统计
 */
export async function getUserStatistics(startDate?: string, endDate?: string): Promise<any> {
  const params: any = {}
  if (startDate) params.start = startDate
  if (endDate) params.end = endDate

  const response = await api.get<ApiResponse<any>>('/statistics/users', { params })

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError('GET_USER_STATS_FAILED', response.data.message || '获取用户统计失败')
}

/**
 * 获取API统计
 */
export async function getApiStatistics(startDate?: string, endDate?: string): Promise<any> {
  const params: any = {}
  if (startDate) params.start = startDate
  if (endDate) params.end = endDate

  const response = await api.get<ApiResponse<any>>('/statistics/apis', { params })

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError('GET_API_STATS_FAILED', response.data.message || '获取API统计失败')
}

/**
 * 获取接口排行
 */
export async function getEndpointRanking(startDate?: string, endDate?: string, sortBy?: string, order?: string, limit?: number | 'all'): Promise<any> {
  const params: any = {}
  if (startDate) params.start = startDate
  if (endDate) params.end = endDate
  if (sortBy) params.sort_by = sortBy
  if (order) params.order = order
  if (limit !== undefined) params.limit = limit

  const response = await api.get<ApiResponse<any>>('/statistics/ranking', { params })

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError('GET_RANKING_FAILED', response.data.message || '获取接口排行失败')
}

// 历史记录相关API
/**
 * 获取登录历史
 */
export async function getLoginHistory(limit = apiDefaultsConfig.historyDefaultLimit): Promise<any> {
  const response = await api.get<ApiResponse<any>>(`/history/login?limit=${limit}`)

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError('GET_LOGIN_HISTORY_FAILED', response.data.message || '获取登录历史失败')
}

/**
 * 获取操作历史
 */
export async function getOperationHistory(
  limit = apiDefaultsConfig.historyDefaultLimit
): Promise<any> {
  const response = await api.get<ApiResponse<any>>(`/history/operations?limit=${limit}`)

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError('GET_OPERATION_HISTORY_FAILED', response.data.message || '获取操作历史失败')
}

/**
 * 获取资料修改历史
 */
export async function getProfileChangeHistory(
  limit = apiDefaultsConfig.historyDefaultLimit
): Promise<any> {
  const response = await api.get<ApiResponse<any>>(`/history/profile-changes?limit=${limit}`)

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError(
    'GET_PROFILE_HISTORY_FAILED',
    response.data.message || '获取资料修改历史失败'
  )
}

// 累计统计相关API
/**
 * 获取累计统计数据（5分钟缓存，支持强制刷新）
 * @param forceRefresh 是否强制刷新（绕过缓存）
 */
export async function getCumulativeStats(forceRefresh: boolean = false): Promise<any> {
  const params: any = {}

  // 强制刷新时添加时间戳，绕过缓存
  if (forceRefresh) {
    params._t = Date.now()
  }

  const response = await api.get<ApiResponse<any>>('/cumulative-stats', { params })

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError('GET_CUMULATIVE_STATS_FAILED', response.data.message || '获取累计统计失败')
}

/**
 * 获取每日指标（5分钟缓存，支持强制刷新）
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @param forceRefresh 是否强制刷新（绕过缓存）
 */
export async function getDailyMetrics(
  startDate?: string,
  endDate?: string,
  forceRefresh: boolean = false
): Promise<any> {
  const params: any = {}
  if (startDate) params.start = startDate
  if (endDate) params.end = endDate

  // 强制刷新时添加时间戳，绕过缓存
  if (forceRefresh) {
    params._t = Date.now()
  }

  const response = await api.get<ApiResponse<any>>('/daily-metrics', { params })

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError('GET_DAILY_METRICS_FAILED', response.data.message || '获取每日指标失败')
}

/**
 * 获取实时指标（5分钟缓存，支持强制刷新）
 * @param forceRefresh 是否强制刷新（绕过缓存）
 */
export async function getRealtimeMetrics(forceRefresh: boolean = false): Promise<any> {
  const params: any = {}

  // 强制刷新时添加时间戳，绕过缓存
  if (forceRefresh) {
    params._t = Date.now()
  }

  const response = await api.get<ApiResponse<any>>('/realtime-metrics', { params })

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError('GET_REALTIME_METRICS_FAILED', response.data.message || '获取实时指标失败')
}

/**
 * 获取用户地区分布
 */
export async function getLocationDistribution(): Promise<any> {
  const response = await api.get<ApiResponse<any>>('/location/distribution')

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError('GET_LOCATION_DIST_FAILED', response.data.message || '获取地区分布失败')
}

// 聊天室相关API
/**
 * 发送聊天消息
 */
export async function sendChatMessage(content: string): Promise<any> {
  const response = await api.post<ApiResponse<any>>('/chat/send', { content })

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError('SEND_MESSAGE_FAILED', response.data.message || '发送消息失败')
}

/**
 * 获取聊天消息列表
 */
export async function getChatMessages(limit: number = 50, beforeId: number = 0): Promise<any> {
  const response = await api.get<ApiResponse<any>>('/chat/messages', {
    params: { limit, before_id: beforeId }
  })

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError('GET_MESSAGES_FAILED', response.data.message || '获取消息失败')
}

/**
 * 删除聊天消息
 */
export async function deleteChatMessage(messageId: number): Promise<void> {
  const response = await api.delete<ApiResponse>(`/chat/messages/${messageId}`)

  if (response.data.code !== HTTP_STATUS.OK) {
    throw createAppError('DELETE_MESSAGE_FAILED', response.data.message || '删除消息失败')
  }
}

// ========================================
// 文章相关API
// ========================================

import type {
  CreateArticleRequest,
  UpdateArticleRequest,
  ArticleDetail,
  ArticleListResponse,
  ArticleListQuery,
  CreateCommentRequest,
  CommentsResponse,
  CreateReportRequest,
  ArticleCategory,
  ArticleTag
} from '@/types/article'

/**
 * 创建文章
 */
export async function createArticle(data: CreateArticleRequest): Promise<{ article_id: number }> {
  const response = await api.post<ApiResponse<{ article_id: number }>>('/articles', data)

  if (response.data.code === 201 && response.data.data) {
    return response.data.data
  }

  throw createAppError('CREATE_ARTICLE_FAILED', response.data.message || '创建文章失败')
}

/**
 * 获取文章列表
 */
export async function getArticles(query: ArticleListQuery = {}): Promise<ArticleListResponse> {
  const response = await api.get<ApiResponse<ArticleListResponse>>('/articles', { params: query })

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError('GET_ARTICLES_FAILED', response.data.message || '获取文章列表失败')
}

/**
 * 获取文章详情
 */
export async function getArticleDetail(id: number): Promise<ArticleDetail> {
  const response = await api.get<ApiResponse<ArticleDetail>>(`/articles/${id}`)

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError('GET_ARTICLE_DETAIL_FAILED', response.data.message || '获取文章详情失败')
}

/**
 * 更新文章
 */
export async function updateArticle(id: number, data: UpdateArticleRequest): Promise<void> {
  const response = await api.put<ApiResponse>(`/articles/${id}`, data)

  if (response.data.code !== HTTP_STATUS.OK) {
    throw createAppError('UPDATE_ARTICLE_FAILED', response.data.message || '更新文章失败')
  }
}

/**
 * 删除文章
 */
export async function deleteArticle(id: number): Promise<void> {
  const response = await api.delete<ApiResponse>(`/articles/${id}`)

  if (response.data.code !== HTTP_STATUS.OK) {
    throw createAppError('DELETE_ARTICLE_FAILED', response.data.message || '删除文章失败')
  }
}

/**
 * 切换文章点赞
 */
export async function toggleArticleLike(id: number): Promise<boolean> {
  const response = await api.post<ApiResponse<{ is_liked: boolean }>>(`/articles/${id}/like`)

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data.is_liked
  }

  throw createAppError('TOGGLE_LIKE_FAILED', response.data.message || '点赞操作失败')
}

/**
 * 发表评论
 */
export async function postComment(
  articleId: number,
  data: CreateCommentRequest
): Promise<{ comment_id: number }> {
  const response = await api.post<ApiResponse<{ comment_id: number }>>(
    `/articles/${articleId}/comments`,
    data
  )

  if (response.data.code === 201 && response.data.data) {
    return response.data.data
  }

  throw createAppError('POST_COMMENT_FAILED', response.data.message || '发表评论失败')
}

/**
 * 获取文章评论
 */
export async function getArticleComments(
  articleId: number,
  page = 1,
  pageSize = 20
): Promise<CommentsResponse> {
  const response = await api.get<ApiResponse<CommentsResponse>>(`/articles/${articleId}/comments`, {
    params: { page, page_size: pageSize }
  })

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError('GET_COMMENTS_FAILED', response.data.message || '获取评论失败')
}

/**
 * 切换评论点赞
 */
export async function toggleCommentLike(commentId: number): Promise<boolean> {
  const response = await api.post<ApiResponse<{ is_liked: boolean }>>(`/comments/${commentId}/like`)

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data.is_liked
  }

  throw createAppError('TOGGLE_COMMENT_LIKE_FAILED', response.data.message || '点赞评论失败')
}

/**
 * 删除评论
 */
export async function deleteComment(commentId: number): Promise<void> {
  const response = await api.delete<ApiResponse>(`/comments/${commentId}`)

  if (response.data.code !== HTTP_STATUS.OK) {
    throw createAppError('DELETE_COMMENT_FAILED', response.data.message || '删除评论失败')
  }
}

/**
 * 举报文章或评论
 */
export async function reportContent(data: CreateReportRequest): Promise<void> {
  const response = await api.post<ApiResponse>('/articles/report', data)

  if (response.data.code !== 201) {
    throw createAppError('REPORT_FAILED', response.data.message || '举报失败')
  }
}

/**
 * 获取所有分类
 */
export async function getArticleCategories(): Promise<ArticleCategory[]> {
  const response =
    await api.get<ApiResponse<{ categories: ArticleCategory[] }>>('/articles/categories')

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data.categories
  }

  throw createAppError('GET_CATEGORIES_FAILED', response.data.message || '获取分类失败')
}

/**
 * 获取所有标签
 */
export async function getArticleTags(): Promise<ArticleTag[]> {
  const response = await api.get<ApiResponse<{ tags: ArticleTag[] }>>('/articles/tags')

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data.tags
  }

  throw createAppError('GET_TAGS_FAILED', response.data.message || '获取标签失败')
}

// ========================================
// 私信相关API
// ========================================

import type {
  ConversationsListResponse,
  MessagesListResponse,
  SendMessageRequest,
  SendMessageResponse,
  StartConversationResponse
} from '@/types/message'

/**
 * 获取会话列表
 */
export async function getConversations(): Promise<ConversationsListResponse> {
  const response = await api.get<ApiResponse<ConversationsListResponse>>('/conversations')

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError('GET_CONVERSATIONS_FAILED', response.data.message || '获取会话列表失败')
}

/**
 * 获取会话消息
 */
export async function getConversationMessages(
  conversationId: number,
  limit = 50
): Promise<MessagesListResponse> {
  const response = await api.get<ApiResponse<MessagesListResponse>>(
    `/conversations/${conversationId}/messages`,
    {
      params: { limit }
    }
  )

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError('GET_MESSAGES_FAILED', response.data.message || '获取消息失败')
}

/**
 * 发送私信
 */
export async function sendPrivateMessage(data: SendMessageRequest): Promise<SendMessageResponse> {
  const response = await api.post<ApiResponse<SendMessageResponse>>('/messages/send', data)

  if (response.data.code === 201 && response.data.data) {
    return response.data.data
  }

  throw createAppError('SEND_MESSAGE_FAILED', response.data.message || '发送消息失败')
}

/**
 * 获取未读消息数
 */
export async function getUnreadMessageCount(): Promise<number> {
  const response = await api.get<ApiResponse<{ unread_count: number }>>(
    '/conversations/unread-count'
  )

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data.unread_count
  }

  throw createAppError('GET_UNREAD_COUNT_FAILED', response.data.message || '获取未读数失败')
}

/**
 * 开始与指定用户的会话
 */
export async function startConversation(userId: number): Promise<StartConversationResponse> {
  const response = await api.post<ApiResponse<StartConversationResponse>>(
    `/conversations/start/${userId}`
  )

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError('START_CONVERSATION_FAILED', response.data.message || '开始会话失败')
}

/**
 * 标记会话消息为已读
 */
export async function markConversationAsRead(conversationId: number): Promise<void> {
  const response = await api.post<ApiResponse<null>>(`/conversations/${conversationId}/mark-read`)

  if (response.data.code === HTTP_STATUS.OK) {
    return
  }

  throw createAppError('MARK_READ_FAILED', response.data.message || '标记已读失败')
}

// ========================================
// 资源相关API
// ========================================

import type {
  Resource,
  ResourceListResponse,
  ResourceCategory,
  CreateResourceRequest,
  InitUploadRequest,
  InitUploadResponse,
  MergeChunksResponse,
  ResourceChunkDownloadInfo
} from '@/types/resource'

/**
 * 获取资源列表
 */
export async function getResources(params?: {
  page?: number
  page_size?: number
  category_id?: number
  keyword?: string
  sort_by?: string
  user_id?: number
}): Promise<ResourceListResponse> {
  const response = await api.get<ApiResponse<ResourceListResponse>>('/resources', { params })

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError('GET_RESOURCES_FAILED', response.data.message || '获取资源列表失败')
}

/**
 * 获取资源详情
 */
export async function getResourceDetail(id: number): Promise<Resource> {
  const response = await api.get<ApiResponse<Resource>>(`/resources/${id}`)

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError('GET_RESOURCE_DETAIL_FAILED', response.data.message || '获取资源详情失败')
}

/**
 * 创建资源
 */
export async function createResource(
  data: CreateResourceRequest
): Promise<{ resource_id: number }> {
  const response = await api.post<ApiResponse<{ resource_id: number }>>('/resources', data)

  if (response.data.code === 201 && response.data.data) {
    return response.data.data
  }

  throw createAppError('CREATE_RESOURCE_FAILED', response.data.message || '创建资源失败')
}

/**
 * 删除资源
 */
export async function deleteResource(id: number): Promise<void> {
  const response = await api.delete<ApiResponse>(`/resources/${id}`)

  if (response.data.code !== HTTP_STATUS.OK) {
    throw createAppError('DELETE_RESOURCE_FAILED', response.data.message || '删除资源失败')
  }
}

/**
 * 切换资源点赞
 */
export async function toggleResourceLike(id: number): Promise<boolean> {
  const response = await api.post<ApiResponse<{ is_liked: boolean }>>(`/resources/${id}/like`)

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data.is_liked
  }

  throw createAppError('TOGGLE_RESOURCE_LIKE_FAILED', response.data.message || '点赞失败')
}

/**
 * 获取资源下载链接
 */
export async function getResourceDownload(
  id: number
): Promise<{ download_url: string; file_name: string; file_size: number }> {
  const response = await api.get<
    ApiResponse<{ download_url: string; file_name: string; file_size: number }>
  >(`/resources/${id}/download`)

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError('GET_DOWNLOAD_FAILED', response.data.message || '获取下载链接失败')
}

/**
 * 代理下载资源（支持大文件和断点续传）
 */
export function getResourceProxyDownloadUrl(id: number): string {
  const baseURL =
    api.defaults.baseURL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
  // 使用正确的token key，并同时检查localStorage和sessionStorage
  const token =
    localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) ||
    sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) ||
    ''
  return `${baseURL}/resources/${id}/proxy-download?token=${encodeURIComponent(token)}`
}

/**
 * 获取资源分片下载信息
 */
export async function getResourceChunkDownloadInfo(
  id: number
): Promise<ResourceChunkDownloadInfo> {
  const response = await api.get<ApiResponse<ResourceChunkDownloadInfo>>(
    `/resources/${id}/proxy-download`
  )

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    const data = response.data.data
    if (!data.chunk_base_url && Array.isArray(data.chunk_urls) && data.chunk_urls.length > 0) {
      const first = data.chunk_urls[0]
      data.chunk_base_url = first.replace(/\/chunk_\d+$/, '')
    }
    return data
  }

  throw createAppError(
    'GET_RESOURCE_CHUNK_INFO_FAILED',
    response.data.message || '获取资源下载信息失败'
  )
}

/**
 * 获取资源分类
 */
export async function getResourceCategories(): Promise<ResourceCategory[]> {
  const response =
    await api.get<ApiResponse<{ categories: ResourceCategory[] }>>('/resource-categories')

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data.categories
  }

  throw createAppError('GET_RESOURCE_CATEGORIES_FAILED', response.data.message || '获取分类失败')
}

/**
 * 发表资源评论
 */
export async function postResourceComment(
  resourceId: number,
  data: { content: string; parent_id?: number; reply_to_user_id?: number }
) {
  const response = await api.post<ApiResponse<{ comment_id: number }>>(
    `/resources/${resourceId}/comments`,
    data
  )

  if (response.data.code === 201 || response.data.code === 200) {
    return response.data.data
  }

  throw createAppError('POST_RESOURCE_COMMENT_FAILED', response.data.message || '评论失败')
}

/**
 * 获取资源评论列表
 */
export async function getResourceComments(
  resourceId: number,
  params?: { page?: number; page_size?: number }
) {
  const response = await api.get<ApiResponse<any>>(`/resources/${resourceId}/comments`, { params })

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError('GET_RESOURCE_COMMENTS_FAILED', response.data.message || '获取评论失败')
}

/**
 * 切换资源评论点赞
 */
export async function toggleResourceCommentLike(commentId: number): Promise<boolean> {
  const response = await api.post<ApiResponse<{ is_liked: boolean }>>(
    `/resource-comments/${commentId}/like`
  )

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data.is_liked
  }

  throw createAppError('TOGGLE_RESOURCE_COMMENT_LIKE_FAILED', response.data.message || '操作失败')
}

/**
 * 初始化分片上传
 */
export async function initChunkUpload(data: InitUploadRequest): Promise<InitUploadResponse> {
  const response = await api.post<ApiResponse<InitUploadResponse>>('/upload/init', data)

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError('INIT_UPLOAD_FAILED', response.data.message || '初始化上传失败')
}

/**
 * 上传分片
 */
export async function uploadChunk(
  uploadId: string,
  chunkIndex: number,
  chunkData: Blob
): Promise<void> {
  const formData = new FormData()
  formData.append('upload_id', uploadId)
  formData.append('chunk_index', chunkIndex.toString())
  formData.append('chunk', chunkData)

  const response = await api.post<ApiResponse>('/upload/chunk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

  if (response.data.code !== HTTP_STATUS.OK) {
    throw createAppError('UPLOAD_CHUNK_FAILED', response.data.message || '上传分片失败')
  }
}

/**
 * 合并分片
 * 注意：合并大文件可能需要较长时间，使用更长的超时时间
 */
export async function mergeChunks(uploadId: string): Promise<MergeChunksResponse> {
  const response = await api.post<ApiResponse<MergeChunksResponse>>(
    '/upload/merge',
    {
      upload_id: uploadId
    },
    {
      timeout: 900000 // 15分钟超时，适用于大文件合并（100MB文件可能需要5-10分钟）
    }
  )

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError('MERGE_CHUNKS_FAILED', response.data.message || '文件处理失败，请稍后重试')
}

/**
 * 查询上传进度
 */
export async function getUploadStatus(uploadId: string): Promise<any> {
  const response = await api.get<ApiResponse<any>>(`/upload/status/${uploadId}`)

  if (response.data.code === HTTP_STATUS.OK && response.data.data) {
    return response.data.data
  }

  throw createAppError('GET_UPLOAD_STATUS_FAILED', response.data.message || '查询进度失败')
}

/**
 * 取消上传
 */
export async function cancelUpload(uploadId: string): Promise<void> {
  const response = await api.post<ApiResponse>(`/upload/cancel/${uploadId}`)

  if (response.data.code !== HTTP_STATUS.OK) {
    throw createAppError('CANCEL_UPLOAD_FAILED', response.data.message || '取消上传失败')
  }
}

/**
 * 取消指定请求ID的请求
 */
export function cancelRequest(requestId: string): void {
  const controller = cancelTokens.get(requestId)
  if (controller) {
    controller.abort()
    cancelTokens.delete(requestId)
  }
}

/**
 * 取消所有pending请求（组件卸载时使用）
 */
export function cancelAllRequests(): void {
  cancelTokens.forEach(controller => {
    controller.abort()
  })
  cancelTokens.clear()
}

/**
 * 获取当前pending请求数量
 */
export function getPendingRequestCount(): number {
  return cancelTokens.size
}

/**
 * useRequestCleanup - Vue组合式API钩子，自动清理组件卸载时的请求
 * 使用示例:
 * <script setup>
 * import { useRequestCleanup } from '@/utils/api'
 * useRequestCleanup()
 * </script>
 */
export function useRequestCleanup(): void {
  if (typeof window !== 'undefined') {
    // 在组件卸载时取消所有请求
    const cleanup = () => {
      const count = getPendingRequestCount()
      if (count > 0) {
        logger.debug(`组件卸载，取消 ${count} 个pending请求`)
        cancelAllRequests()
      }
    }

    // 使用 onBeforeUnmount (如果在Vue组件中)
    if (typeof (globalThis as any).onBeforeUnmount === 'function') {
      ;(globalThis as any).onBeforeUnmount(cleanup)
    }
  }
}

export default api
