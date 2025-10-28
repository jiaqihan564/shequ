import axios, { type AxiosInstance, type AxiosResponse, type AxiosRequestConfig } from 'axios'

import type {
  ApiResponse,
  LoginResponse,
  LoginForm,
  RegisterForm,
  RegisterResponse,
  RefreshTokenResponse,
  User,
  AppError,
  AvatarHistoryItem,
  AvatarHistoryList
} from '@/types'
import type { NewsItem, FetchNewsParams } from '@/types'
import { logger } from '../ui/logger'

// 创建axios实例
const api: AxiosInstance = axios.create({
  baseURL: '/api', // 使用相对路径，通过 Vite 代理转发到后端
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  // 性能优化配置
  maxRedirects: 3,
  validateStatus: status => status < 500, // 只对5xx错误抛出异常
  maxContentLength: 10 * 1024 * 1024, // 10MB
  maxBodyLength: 10 * 1024 * 1024 // 10MB
})

// 请求缓存
const requestCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

// 请求去重：防止相同请求并发发送
const pendingRequests = new Map<string, Promise<any>>()

// 请求取消：组件卸载时取消pending请求
const cancelTokens = new Map<string, AbortController>()

// 生成请求唯一键（用于去重）
function getRequestKey(config: AxiosRequestConfig): string {
  const { method, url, params, data } = config
  return `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`
}

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

    // 为GET请求实现请求去重
    if (config.method === 'get') {
      const requestKey = getRequestKey(config)
      
      // 检查是否有相同的pending请求
      const pendingRequest = pendingRequests.get(requestKey)
      if (pendingRequest) {
        // 返回pending的Promise，避免重复请求
        return Promise.reject({
          __CANCEL__: true,
          promise: pendingRequest
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

// 防止重复跳转登录页的标记
let isRedirectingToLogin = false

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const requestId = response.config.headers?.['X-Request-ID'] as string
    
    // 清理cancel token
    if (requestId) {
      cancelTokens.delete(requestId)
    }
    
    // 清理pending request（如果是GET请求）
    if (response.config.method === 'get') {
      const requestKey = getRequestKey(response.config)
      pendingRequests.delete(requestKey)
    }
    
    // 缓存GET请求的响应
    if (response.config.method === 'get' && response.status === 200) {
      const cacheKey = `${response.config.url}?${JSON.stringify(response.config.params || {})}`
      requestCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      })
    }

    return response
  },
  async error => {
    // 处理请求去重的特殊情况
    if (error.__CANCEL__ && error.promise) {
      try {
        return await error.promise
      } catch (e) {
        throw e
      }
    }
    
    // 处理请求取消
    if (axios.isCancel(error)) {
      logger.debug('请求已取消:', error.message)
      return Promise.reject(createAppError('REQUEST_CANCELLED', '请求已取消'))
    }
    
    const originalRequest = error.config
    
    // 清理cancel token和pending request
    if (originalRequest) {
      const requestId = originalRequest.headers?.['X-Request-ID'] as string
      if (requestId) {
        cancelTokens.delete(requestId)
      }
      
      if (originalRequest.method === 'get') {
        const requestKey = getRequestKey(originalRequest)
        pendingRequests.delete(requestKey)
      }
    }

    // 处理认证错误（401）
    if (error.response?.status === 401) {
      // 如果是登录请求，直接返回错误
      if (originalRequest?.url?.includes('/auth/login')) {
        const appError = createAppError(
          error.response?.data?.code?.toString() || 'LOGIN_FAILED',
          error.response?.data?.message || '用户名或密码错误',
          error.response?.data
        )
        return Promise.reject(appError)
      }

      // 其他401错误：token过期或无效
      if (!isRedirectingToLogin) {
        isRedirectingToLogin = true
        
        // 动态导入 ElMessage（通过 unplugin-auto-import 自动注入）
        if (typeof ElMessage !== 'undefined') {
          ElMessage.warning('登录已过期，请重新登录', { duration: 2000 })
        }
        
        // 清除所有认证信息
        clearAuthTokens()
        
        // 延迟2秒后跳转到登录页
        setTimeout(() => {
          isRedirectingToLogin = false
          window.location.href = '/login'
        }, 2000)
      }
      
      return Promise.reject(createAppError('AUTH_EXPIRED', '认证已过期，请重新登录'))
    }

    // 处理其他错误
    const appError = createAppError(
      error.response?.data?.code?.toString() || 'API_ERROR',
      error.response?.data?.message || '请求失败',
      error.response?.data
    )

    return Promise.reject(appError)
  }
)

// 工具函数
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
}

function getActiveStorage(): Storage {
  if (localStorage.getItem('auth_token')) return localStorage
  if (sessionStorage.getItem('auth_token')) return sessionStorage
  return localStorage
}

function setAuthTokens(
  token: string,
  refreshToken: string,
  scope: 'local' | 'session' = 'local'
): void {
  const store = scope === 'local' ? localStorage : sessionStorage
  store.setItem('auth_token', token)
  store.setItem('refresh_token', refreshToken)
}

function setUserInfo(user: User, scope: 'local' | 'session' = 'local'): void {
  const store = scope === 'local' ? localStorage : sessionStorage
  const withVersion = { ...user } as any
  if (!withVersion.avatar_version) {
    // 初次写入或无版本时初始化
    withVersion.avatar_version = Date.now()
  }
  store.setItem('user_info', JSON.stringify(withVersion))
}

function clearAuthTokens(): void {
  for (const store of [localStorage, sessionStorage]) {
    store.removeItem('auth_token')
    store.removeItem('refresh_token')
    store.removeItem('user_info')
  }
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function createAppError(code: string, message: string, details?: any): AppError {
  return {
    code,
    message,
    details,
    stack: new Error().stack
  }
}

// 统一规范化与深合并后端返回的用户数据
function normalizeUserData(user: any): User {
  const store = getActiveStorage()
  let prev: any = null
  try {
    const raw = store.getItem('user_info')
    prev = raw ? JSON.parse(raw) : null
  } catch {
    prev = null
  }

  const merged: any = {
    ...(prev || {}),
    ...(user || {})
  }

  const mergedProfile: any = {
    ...((prev && prev.profile) || {}),
    ...((user && user.profile) || {})
  }

  // 将根级 nickname/bio 映射进 profile（后端新返回格式）
  if (user && Object.prototype.hasOwnProperty.call(user, 'nickname') && mergedProfile.nickname === undefined) {
    mergedProfile.nickname = user.nickname
  }
  if (user && Object.prototype.hasOwnProperty.call(user, 'bio') && mergedProfile.bio === undefined) {
    mergedProfile.bio = user.bio
  }

  // 关键资料字段空值不覆盖（地址相关前端自治）
  const preferPrev = (nextVal: any, prevVal: any) =>
    nextVal === undefined || nextVal === null || nextVal === '' ? (prevVal ?? '') : nextVal
  mergedProfile.province = preferPrev(mergedProfile.province, prev?.profile?.province)
  mergedProfile.city = preferPrev(mergedProfile.city, prev?.profile?.city)
  mergedProfile.location = preferPrev(mergedProfile.location, prev?.profile?.location)

  merged.profile = mergedProfile

  // 头像归一化与保留策略
  const normalized: any = {
    ...merged,
    avatar: merged.avatar || (merged as any).avatar_url
  }
  if (!normalized.avatar) normalized.avatar = prev?.avatar || ''
  if (!normalized.avatar_version) normalized.avatar_version = prev?.avatar_version || Date.now()

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

// 定期清理缓存
setInterval(clearExpiredCache, CACHE_DURATION)

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

  if (response.data.code === 200 && response.data.data) {
    const { token, user } = response.data.data
    // 统一规范化用户数据（含 nickname/bio 映射到 profile）
    const normalizedUser = normalizeUserData(user)

    // 存储认证信息
    const scope = loginData.rememberMe ? 'local' : 'session'
    setAuthTokens(token, '', scope) // 新API可能没有refreshToken
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

    if (response.data.code === 201 && response.data.data) {
      const { token, user } = response.data.data
      const normalizedUser = normalizeUserData(user)

      // 存储认证信息
      setAuthTokens(token, '') // 新API可能没有refreshToken
      localStorage.setItem('user_info', JSON.stringify(normalizedUser))
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
 */
export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout')
  } catch (error) {
    logger.error('登出请求失败:', error)
  } finally {
    clearAuthTokens()
  }
}

/**
 * 刷新访问令牌
 */
export async function refreshToken(): Promise<string> {
  const refreshTokenValue =
    localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token')
  if (!refreshTokenValue) {
    throw createAppError('NO_REFRESH_TOKEN', '没有刷新令牌')
  }

  const response = await api.post<ApiResponse<RefreshTokenResponse>>('/auth/refresh', {
    refreshToken: refreshTokenValue
  })

  if (response.data.code === 200 && response.data.data) {
    const { token } = response.data.data
    const store = getActiveStorage()
    store.setItem('auth_token', token)
    return token
  }

  throw createAppError('REFRESH_FAILED', '刷新令牌失败')
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<User> {
  const response = await api.get<ApiResponse<User>>('/auth/me')

  if (response.data.code === 200 && response.data.data) {
    const user = response.data.data
    const normalizedUser = normalizeUserData(user) as any
    const store = getActiveStorage()
    store.setItem('user_info', JSON.stringify(normalizedUser))
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

  if (response.data.code === 200 && response.data.data) {
    const user = response.data.data
    const normalizedUser: any = normalizeUserData(user)
    const store = getActiveStorage()
    store.setItem('user_info', JSON.stringify(normalizedUser))
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

  if (response.data.code !== 200) {
    throw createAppError('CHANGE_PASSWORD_FAILED', response.data.message || '修改密码失败')
  }
}

/**
 * 忘记密码
 */
export async function forgotPassword(email: string): Promise<{ token: string; message: string }> {
  const response = await api.post<ApiResponse<{ token: string; message: string }>>('/auth/forgot-password', { email })

  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }

  throw createAppError('FORGOT_PASSWORD_FAILED', response.data.message || '发送重置邮件失败')
}

/**
 * 重置密码
 */
export async function resetPassword(data: { token: string; newPassword: string }): Promise<void> {
  const response = await api.post<ApiResponse>('/auth/reset-password', data)

  if (response.data.code !== 200) {
    throw createAppError('RESET_PASSWORD_FAILED', response.data.message || '重置密码失败')
  }
}

/**
 * 上传图片（通用）
 * 返回图片的可访问 URL
 */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  // 优先尝试 /upload，其次 /files/upload
  try {
    const res = await api.post<ApiResponse<{ url?: string; path?: string }>>('/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    if (res.data.code === 200 && res.data.data) {
      return res.data.data.url || (res.data.data.path as string)
    }
    throw new Error(res.data.message || '上传失败')
  } catch (e) {
    void e
    const fallback = await api.post<ApiResponse<{ url?: string; path?: string }>>(
      '/files/upload',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    )
    if (fallback.data.code === 200 && fallback.data.data) {
      return fallback.data.data.url || (fallback.data.data.path as string)
    }
    throw createAppError('UPLOAD_FAILED', fallback.data.message || '上传失败')
  }
}

/**
 * 上传资源预览图（到资源专用桶）
 */
export async function uploadResourceImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  
  const response = await api.post<ApiResponse<{ image_url: string }>>('/resources/images/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  
  if (response.data.code === 200 && response.data.data) {
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
  
  const response = await api.post<ApiResponse<{ image_url: string }>>('/resources/documents/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data.image_url
  }
  
  throw createAppError('UPLOAD_DOCUMENT_IMAGE_FAILED', response.data.message || '上传文档图片失败')
}

/**
 * 更新用户头像
 */
export async function updateUserAvatar(avatarUrl: string): Promise<User> {
  try {
    const res = await api.put<ApiResponse<User>>('/auth/me/avatar', { avatar: avatarUrl })
    if (res.data.code === 200 && res.data.data) {
      const user = res.data.data
      const normalizedUser: any = normalizeUserData(user)
      // 头像更新成功，刷新版本号以破缓存
      normalizedUser.avatar_version = Date.now()
      const store = getActiveStorage()
      store.setItem('user_info', JSON.stringify(normalizedUser))
      emitUserUpdated(normalizedUser)
      return normalizedUser
    }
    throw new Error(res.data.message || '更新头像失败')
  } catch (e) {
    void e
    // 兼容没有独立头像接口的后端
    const res = await api.put<ApiResponse<User>>('/auth/me', { avatar: avatarUrl })
    if (res.data.code === 200 && res.data.data) {
      const user = res.data.data
      const normalizedUser: any = normalizeUserData(user)
      normalizedUser.avatar_version = Date.now()
      const store = getActiveStorage()
      store.setItem('user_info', JSON.stringify(normalizedUser))
      emitUserUpdated(normalizedUser)
      return normalizedUser
    }
    throw createAppError('UPDATE_AVATAR_FAILED', res.data.message || '更新头像失败')
  }
}

/**
 * 获取历史头像列表（时间倒序，最多50条）
 * 优先 /user/avatar/history，兼容别名 /avatar/history
 */
export async function getAvatarHistory(): Promise<AvatarHistoryItem[]> {
  try {
    const res = await api.get<ApiResponse<AvatarHistoryList>>('/user/avatar/history')
    if (res.data.code === 200 && res.data.data) {
      return Array.isArray(res.data.data.items) ? res.data.data.items : []
    }
    throw new Error(res.data.message || '获取历史头像失败')
  } catch (e) {
    void e
    const fallback = await api.get<ApiResponse<AvatarHistoryList>>('/avatar/history')
    if (fallback.data.code === 200 && fallback.data.data) {
      return Array.isArray(fallback.data.data.items) ? fallback.data.data.items : []
    }
    throw createAppError('GET_AVATAR_HISTORY_FAILED', fallback.data.message || '获取历史头像失败')
  }
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

// 新闻：基于本地 Mock 的 Top Headlines（全国热点优先，轮播用）
export async function fetchNews(params: FetchNewsParams = {}): Promise<NewsItem[]> {
  const pageSize = Math.max(1, Math.min(params.pageSize ?? 5, 10))

  // 简单内存缓存（与全局 requestCache 一致的键格式）
  const provider = (import.meta as any).env?.VITE_NEWS_PROVIDER || 'mock'
  const cacheKey = `/${provider}/news?${JSON.stringify({ ...params, pageSize })}`
  const cached = requestCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return (cached.data as NewsItem[]).slice(0, pageSize)
  }

  // 本地持久缓存（localStorage），命中限速或离线时回退
  const lsKey = `news_cache_v2_${provider}` // 版本号更新，强制清除旧缓存
  
  // 开发环境下清除旧版本缓存
  if (import.meta.env.DEV) {
    const oldKeys = ['news_cache_v1_mock', 'news_cache_v1_gnews']
    oldKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key)
        logger.debug(`已清除旧缓存: ${key}`)
      }
    })
  }
  
  try {
    const raw = localStorage.getItem(lsKey)
    if (raw) {
      const { data, ts } = JSON.parse(raw)
      if (Date.now() - ts < CACHE_DURATION) {
        requestCache.set(cacheKey, { data, timestamp: ts })
        return (data as NewsItem[]).slice(0, pageSize)
      }
    }
  } catch (e) {
    void e
  }

  // 真实源（newsapi），失败回退到 mock
  if (provider === 'newsapi') {
    try {
      // 使用免费的NewsAPI.org（需要API密钥）
      const apiKey = (import.meta as any).env?.VITE_NEWSAPI_KEY
      if (apiKey) {
        const endpoint = 'https://newsapi.org/v2/top-headlines'
        const query = new URLSearchParams({
          country: params.country || 'cn',
          pageSize: String(pageSize),
          category: params.category || 'general',
          apiKey: apiKey
        }).toString()
        const url = `${endpoint}?${query}`
        const res = await axios.get(url)
        
        if (res.data?.articles && Array.isArray(res.data.articles)) {
          const articles = res.data.articles.map((article: any, index: number) => ({
            id: `news_${Date.now()}_${index}`,
            title: article.title || '无标题',
            source: article.source?.name || '未知来源',
            url: article.url || '#',
            imageUrl: article.urlToImage || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?q=80&w=1200&auto=format&fit=crop',
            publishedAt: article.publishedAt || new Date().toISOString(),
            summary: article.description || ''
          }))
          
          requestCache.set(cacheKey, { data: articles, timestamp: Date.now() })
          try {
            localStorage.setItem(lsKey, JSON.stringify({ data: articles, ts: Date.now() }))
          } catch (e) {
            void e
          }
          return articles.slice(0, pageSize)
        }
      }
    } catch (e) {
      logger.debug('NewsAPI请求失败，回退到模拟数据:', e)
    }
  }

  // RSS新闻源（无需API密钥的免费方案）
  if (provider === 'rss') {
    try {
      // 这里简化处理，实际项目中可以使用RSS解析库
      const mockFromRss: NewsItem[] = [
        {
          id: `rss_${Date.now()}_1`,
          title: '实时：央行宣布新的货币政策调整措施',
          source: '新浪财经',
          url: 'https://finance.sina.com.cn',
          imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1200&auto=format&fit=crop',
          publishedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          summary: '央行今日发布重要货币政策调整通知...'
        },
        {
          id: `rss_${Date.now()}_2`,
          title: '科技前沿：AI大模型在医疗领域取得重大突破',
          source: '网易科技',
          url: 'https://tech.163.com',
          imageUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?q=80&w=1200&auto=format&fit=crop',
          publishedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          summary: '最新研究显示AI在诊断准确率方面显著提升...'
        },
        {
          id: `rss_${Date.now()}_3`,
          title: '国际动态：多国就气候变化问题达成新共识',
          source: '人民日报',
          url: 'http://www.people.com.cn',
          imageUrl: 'https://images.unsplash.com/photo-1569163139394-de44cb2c1dd3?q=80&w=1200&auto=format&fit=crop',
          publishedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
          summary: '联合国气候大会取得积极进展...'
        },
        {
          id: `rss_${Date.now()}_4`,
          title: '体育快讯：国足备战世预赛最新进展',
          source: '新华体育',
          url: 'https://www.xinhuanet.com',
          imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200&auto=format&fit=crop',
          publishedAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
          summary: '国家队主教练公布最新集训名单...'
        },
        {
          id: `rss_${Date.now()}_5`,
          title: '经济观察：数字经济发展呈现新趋势',
          source: '财新网',
          url: 'https://www.caixin.com',
          imageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=1200&auto=format&fit=crop',
          publishedAt: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
          summary: '数字化转型推动经济结构优化升级...'
        }
      ]
      
      requestCache.set(cacheKey, { data: mockFromRss, timestamp: Date.now() })
      try {
        localStorage.setItem(lsKey, JSON.stringify({ data: mockFromRss, ts: Date.now() }))
      } catch (e) {
        void e
      }
        return mockFromRss.slice(0, pageSize)
      } catch (e) {
        logger.debug('RSS新闻获取失败，回退到模拟数据:', e)
      }
    }

  // 模拟外部新闻源（全国热点）；发布时间按当前时间倒序 1-5 分钟内
  const now = Date.now()
  const sources = ['新华网', '央视新闻', '人民日报', '澎湃新闻', '界面新闻', '财新', '凤凰网']
  const headlines = [
    '多地推出稳增长举措，重点项目加速落地',
    '新一代人工智能大模型发布，产业生态加速重构',
    '中秋国庆假期旅游热度攀升，文旅融合亮点频出',
    '我国首个商业航天发射场完成关键节点测试',
    '多部门联合发文支持中小企业数字化转型'
  ]

  const images = [
    'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=1200&auto=format&fit=crop'
  ]

  // 对应的真实新闻链接（示例）
  const newsUrls = [
    'https://www.xinhuanet.com',
    'https://news.cctv.com',
    'http://www.people.com.cn',
    'https://www.thepaper.cn',
    'https://www.jiemian.com'
  ]

  function pick<T>(arr: T[], i: number): T {
    return arr[i % arr.length]
  }

  const mock: NewsItem[] = Array.from({ length: 8 }).map((_, i) => {
    const minuteOffset = (i + 1) * 60 * 1000
    const ts = new Date(now - minuteOffset).toISOString()
    const title = pick(headlines, i)
    const source = pick(sources, i + 2)
    const imageUrl = pick(images, i + 1)
    const url = pick(newsUrls, i) // 使用真实的新闻网站链接
    const id = `n_${btoa(url).replace(/=+$/g, '')}_${i}`
    
    logger.debug(`生成新闻 ${i}: ${title} -> ${url}`)
    
    return { id, title, source, url, imageUrl, publishedAt: ts, summary: '' }
  })

  // 按时间倒序并截取 pageSize
  const items = mock
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, pageSize)

  // 模拟网络延迟 200-400ms
  const delay = 200 + Math.floor(Math.random() * 200)
  await new Promise(resolve => setTimeout(resolve, delay))

  requestCache.set(cacheKey, { data: items, timestamp: Date.now() })
  try {
    localStorage.setItem(lsKey, JSON.stringify({ data: items, ts: Date.now() }))
  } catch (e) {
    void e
  }
  return items
}

// 统计相关API
/**
 * 获取统计总览
 */
export async function getStatisticsOverview(): Promise<any> {
  const response = await api.get<ApiResponse<any>>('/statistics/overview')
  
  if (response.data.code === 200 && response.data.data) {
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
  
  if (response.data.code === 200 && response.data.data) {
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
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  
  throw createAppError('GET_API_STATS_FAILED', response.data.message || '获取API统计失败')
}

/**
 * 获取接口排行
 */
export async function getEndpointRanking(startDate?: string, endDate?: string): Promise<any> {
  const params: any = {}
  if (startDate) params.start = startDate
  if (endDate) params.end = endDate
  
  const response = await api.get<ApiResponse<any>>('/statistics/ranking', { params })
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  
  throw createAppError('GET_RANKING_FAILED', response.data.message || '获取接口排行失败')
}

// 历史记录相关API
/**
 * 获取登录历史
 */
export async function getLoginHistory(limit = 50): Promise<any> {
  const response = await api.get<ApiResponse<any>>(`/history/login?limit=${limit}`)
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  
  throw createAppError('GET_LOGIN_HISTORY_FAILED', response.data.message || '获取登录历史失败')
}

/**
 * 获取操作历史
 */
export async function getOperationHistory(limit = 50): Promise<any> {
  const response = await api.get<ApiResponse<any>>(`/history/operations?limit=${limit}`)
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  
  throw createAppError('GET_OPERATION_HISTORY_FAILED', response.data.message || '获取操作历史失败')
}

/**
 * 获取资料修改历史
 */
export async function getProfileChangeHistory(limit = 50): Promise<any> {
  const response = await api.get<ApiResponse<any>>(`/history/profile-changes?limit=${limit}`)
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  
  throw createAppError('GET_PROFILE_HISTORY_FAILED', response.data.message || '获取资料修改历史失败')
}

// 累计统计相关API
/**
 * 获取累计统计数据
 */
export async function getCumulativeStats(): Promise<any> {
  const response = await api.get<ApiResponse<any>>('/cumulative-stats')
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  
  throw createAppError('GET_CUMULATIVE_STATS_FAILED', response.data.message || '获取累计统计失败')
}

/**
 * 获取每日指标
 */
export async function getDailyMetrics(startDate?: string, endDate?: string): Promise<any> {
  const params: any = {}
  if (startDate) params.start = startDate
  if (endDate) params.end = endDate
  
  const response = await api.get<ApiResponse<any>>('/daily-metrics', { params })
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  
  throw createAppError('GET_DAILY_METRICS_FAILED', response.data.message || '获取每日指标失败')
}

/**
 * 获取实时指标
 */
export async function getRealtimeMetrics(): Promise<any> {
  const response = await api.get<ApiResponse<any>>('/realtime-metrics')
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  
  throw createAppError('GET_REALTIME_METRICS_FAILED', response.data.message || '获取实时指标失败')
}

/**
 * 获取用户地区分布
 */
export async function getLocationDistribution(): Promise<any> {
  const response = await api.get<ApiResponse<any>>('/location/distribution')
  
  if (response.data.code === 200 && response.data.data) {
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
  
  if (response.data.code === 200 && response.data.data) {
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
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  
  throw createAppError('GET_MESSAGES_FAILED', response.data.message || '获取消息失败')
}

/**
 * 获取新聊天消息（轮询）
 * @deprecated Use WebSocket (useChatWebSocket composable) for real-time messages
 * Kept for backward compatibility only
 */
export async function getNewChatMessages(afterId: number): Promise<any> {
  const response = await api.get<ApiResponse<any>>('/chat/messages/new', {
    params: { after_id: afterId }
  })
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  
  throw createAppError('GET_NEW_MESSAGES_FAILED', response.data.message || '获取新消息失败')
}

/**
 * 删除聊天消息
 */
export async function deleteChatMessage(messageId: number): Promise<void> {
  const response = await api.delete<ApiResponse>(`/chat/messages/${messageId}`)
  
  if (response.data.code !== 200) {
    throw createAppError('DELETE_MESSAGE_FAILED', response.data.message || '删除消息失败')
  }
}

/**
 * 获取在线用户数
 * @deprecated Use WebSocket (useChatWebSocket composable) for real-time online count
 * Kept for backward compatibility only
 */
export async function getOnlineCount(): Promise<number> {
  const response = await api.get<ApiResponse<{ count: number }>>('/chat/online-count')
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data.count
  }
  
  throw createAppError('GET_ONLINE_COUNT_FAILED', response.data.message || '获取在线用户数失败')
}

/**
 * 用户下线
 * @deprecated WebSocket automatically handles disconnections
 * This function is no longer needed and does nothing
 */
export async function userOffline(): Promise<void> {
  // No-op: WebSocket handles disconnections automatically
  console.info('userOffline() is deprecated - WebSocket handles disconnections automatically')
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
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  
  throw createAppError('GET_ARTICLES_FAILED', response.data.message || '获取文章列表失败')
}

/**
 * 获取文章详情
 */
export async function getArticleDetail(id: number): Promise<ArticleDetail> {
  const response = await api.get<ApiResponse<ArticleDetail>>(`/articles/${id}`)
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  
  throw createAppError('GET_ARTICLE_DETAIL_FAILED', response.data.message || '获取文章详情失败')
}

/**
 * 更新文章
 */
export async function updateArticle(id: number, data: UpdateArticleRequest): Promise<void> {
  const response = await api.put<ApiResponse>(`/articles/${id}`, data)
  
  if (response.data.code !== 200) {
    throw createAppError('UPDATE_ARTICLE_FAILED', response.data.message || '更新文章失败')
  }
}

/**
 * 删除文章
 */
export async function deleteArticle(id: number): Promise<void> {
  const response = await api.delete<ApiResponse>(`/articles/${id}`)
  
  if (response.data.code !== 200) {
    throw createAppError('DELETE_ARTICLE_FAILED', response.data.message || '删除文章失败')
  }
}

/**
 * 切换文章点赞
 */
export async function toggleArticleLike(id: number): Promise<boolean> {
  const response = await api.post<ApiResponse<{ is_liked: boolean }>>(`/articles/${id}/like`)
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data.is_liked
  }
  
  throw createAppError('TOGGLE_LIKE_FAILED', response.data.message || '点赞操作失败')
}

/**
 * 发表评论
 */
export async function postComment(articleId: number, data: CreateCommentRequest): Promise<{ comment_id: number }> {
  const response = await api.post<ApiResponse<{ comment_id: number }>>(`/articles/${articleId}/comments`, data)
  
  if (response.data.code === 201 && response.data.data) {
    return response.data.data
  }
  
  throw createAppError('POST_COMMENT_FAILED', response.data.message || '发表评论失败')
}

/**
 * 获取文章评论
 */
export async function getArticleComments(articleId: number, page = 1, pageSize = 20): Promise<CommentsResponse> {
  const response = await api.get<ApiResponse<CommentsResponse>>(`/articles/${articleId}/comments`, {
    params: { page, page_size: pageSize }
  })
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  
  throw createAppError('GET_COMMENTS_FAILED', response.data.message || '获取评论失败')
}

/**
 * 切换评论点赞
 */
export async function toggleCommentLike(commentId: number): Promise<boolean> {
  const response = await api.post<ApiResponse<{ is_liked: boolean }>>(`/comments/${commentId}/like`)
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data.is_liked
  }
  
  throw createAppError('TOGGLE_COMMENT_LIKE_FAILED', response.data.message || '点赞评论失败')
}

/**
 * 删除评论
 */
export async function deleteComment(commentId: number): Promise<void> {
  const response = await api.delete<ApiResponse>(`/comments/${commentId}`)
  
  if (response.data.code !== 200) {
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
  const response = await api.get<ApiResponse<{ categories: ArticleCategory[] }>>('/articles/categories')
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data.categories
  }
  
  throw createAppError('GET_CATEGORIES_FAILED', response.data.message || '获取分类失败')
}

/**
 * 获取所有标签
 */
export async function getArticleTags(): Promise<ArticleTag[]> {
  const response = await api.get<ApiResponse<{ tags: ArticleTag[] }>>('/articles/tags')
  
  if (response.data.code === 200 && response.data.data) {
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
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  
  throw createAppError('GET_CONVERSATIONS_FAILED', response.data.message || '获取会话列表失败')
}

/**
 * 获取会话消息
 */
export async function getConversationMessages(conversationId: number, limit = 50): Promise<MessagesListResponse> {
  const response = await api.get<ApiResponse<MessagesListResponse>>(`/conversations/${conversationId}/messages`, {
    params: { limit }
  })
  
  if (response.data.code === 200 && response.data.data) {
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
  const response = await api.get<ApiResponse<{ unread_count: number }>>('/conversations/unread-count')
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data.unread_count
  }
  
  throw createAppError('GET_UNREAD_COUNT_FAILED', response.data.message || '获取未读数失败')
}

/**
 * 开始与指定用户的会话
 */
export async function startConversation(userId: number): Promise<StartConversationResponse> {
  const response = await api.post<ApiResponse<StartConversationResponse>>(`/conversations/start/${userId}`)
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  
  throw createAppError('START_CONVERSATION_FAILED', response.data.message || '开始会话失败')
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
  MergeChunksResponse
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
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  
  throw createAppError('GET_RESOURCES_FAILED', response.data.message || '获取资源列表失败')
}

/**
 * 获取资源详情
 */
export async function getResourceDetail(id: number): Promise<Resource> {
  const response = await api.get<ApiResponse<Resource>>(`/resources/${id}`)
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  
  throw createAppError('GET_RESOURCE_DETAIL_FAILED', response.data.message || '获取资源详情失败')
}

/**
 * 创建资源
 */
export async function createResource(data: CreateResourceRequest): Promise<{ resource_id: number }> {
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
  
  if (response.data.code !== 200) {
    throw createAppError('DELETE_RESOURCE_FAILED', response.data.message || '删除资源失败')
  }
}

/**
 * 切换资源点赞
 */
export async function toggleResourceLike(id: number): Promise<boolean> {
  const response = await api.post<ApiResponse<{ is_liked: boolean }>>(`/resources/${id}/like`)
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data.is_liked
  }
  
  throw createAppError('TOGGLE_RESOURCE_LIKE_FAILED', response.data.message || '点赞失败')
}

/**
 * 获取资源下载链接
 */
export async function getResourceDownload(id: number): Promise<{ download_url: string; file_name: string; file_size: number }> {
  const response = await api.get<ApiResponse<{ download_url: string; file_name: string; file_size: number }>>(`/resources/${id}/download`)
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  
  throw createAppError('GET_DOWNLOAD_FAILED', response.data.message || '获取下载链接失败')
}

/**
 * 代理下载资源（支持大文件和断点续传）
 */
export function getResourceProxyDownloadUrl(id: number): string {
  const baseURL = api.defaults.baseURL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
  // 使用正确的token key，并同时检查localStorage和sessionStorage
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || ''
  return `${baseURL}/resources/${id}/proxy-download?token=${encodeURIComponent(token)}`
}

/**
 * 获取资源分类
 */
export async function getResourceCategories(): Promise<ResourceCategory[]> {
  const response = await api.get<ApiResponse<{ categories: ResourceCategory[] }>>('/resource-categories')
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data.categories
  }
  
  throw createAppError('GET_RESOURCE_CATEGORIES_FAILED', response.data.message || '获取分类失败')
}

/**
 * 发表资源评论
 */
export async function postResourceComment(resourceId: number, data: { content: string; parent_id?: number; reply_to_user_id?: number }) {
  const response = await api.post<ApiResponse<{ comment_id: number }>>(`/resources/${resourceId}/comments`, data)
  
  if (response.data.code === 201 || response.data.code === 200) {
    return response.data.data
  }
  
  throw createAppError('POST_RESOURCE_COMMENT_FAILED', response.data.message || '评论失败')
}

/**
 * 获取资源评论列表
 */
export async function getResourceComments(resourceId: number, params?: { page?: number; page_size?: number }) {
  const response = await api.get<ApiResponse<any>>(`/resources/${resourceId}/comments`, { params })
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  
  throw createAppError('GET_RESOURCE_COMMENTS_FAILED', response.data.message || '获取评论失败')
}

/**
 * 切换资源评论点赞
 */
export async function toggleResourceCommentLike(commentId: number): Promise<boolean> {
  const response = await api.post<ApiResponse<{ is_liked: boolean }>>(`/resource-comments/${commentId}/like`)
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data.is_liked
  }
  
  throw createAppError('TOGGLE_RESOURCE_COMMENT_LIKE_FAILED', response.data.message || '操作失败')
}

/**
 * 初始化分片上传
 */
export async function initChunkUpload(data: InitUploadRequest): Promise<InitUploadResponse> {
  const response = await api.post<ApiResponse<InitUploadResponse>>('/upload/init', data)
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  
  throw createAppError('INIT_UPLOAD_FAILED', response.data.message || '初始化上传失败')
}

/**
 * 上传分片
 */
export async function uploadChunk(uploadId: string, chunkIndex: number, chunkData: Blob): Promise<void> {
  const formData = new FormData()
  formData.append('upload_id', uploadId)
  formData.append('chunk_index', chunkIndex.toString())
  formData.append('chunk', chunkData)
  
  const response = await api.post<ApiResponse>('/upload/chunk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  
  if (response.data.code !== 200) {
    throw createAppError('UPLOAD_CHUNK_FAILED', response.data.message || '上传分片失败')
  }
}

/**
 * 合并分片
 */
export async function mergeChunks(uploadId: string): Promise<MergeChunksResponse> {
  const response = await api.post<ApiResponse<MergeChunksResponse>>('/upload/merge', { upload_id: uploadId })
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  
  throw createAppError('MERGE_CHUNKS_FAILED', response.data.message || '合并分片失败')
}

/**
 * 查询上传进度
 */
export async function getUploadStatus(uploadId: string): Promise<any> {
  const response = await api.get<ApiResponse<any>>(`/upload/status/${uploadId}`)
  
  if (response.data.code === 200 && response.data.data) {
    return response.data.data
  }
  
  throw createAppError('GET_UPLOAD_STATUS_FAILED', response.data.message || '查询进度失败')
}

/**
 * 取消上传
 */
export async function cancelUpload(uploadId: string): Promise<void> {
  const response = await api.post<ApiResponse>(`/upload/cancel/${uploadId}`)
  
  if (response.data.code !== 200) {
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
  pendingRequests.clear()
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
