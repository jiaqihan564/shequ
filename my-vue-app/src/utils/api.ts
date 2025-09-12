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

// 创建axios实例
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
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

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 添加认证token
    const token = getAuthToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // 添加请求ID用于追踪
    config.headers['X-Request-ID'] = generateRequestId()

    // 添加时间戳防止缓存
    if (config.method === 'get' && !config.params) {
      config.params = { _t: Date.now() }
    }

    // 缓存检查在响应拦截器中处理，这里只做请求配置

    return config
  },
  error => {
    return Promise.reject(createAppError('REQUEST_ERROR', '请求配置错误', error))
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
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
    const originalRequest = error.config

    // 处理认证错误
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      // 如果是登录请求，直接返回错误，不尝试刷新token
      if (originalRequest.url?.includes('/auth/login')) {
        const appError = createAppError(
          error.response?.data?.code?.toString() || 'LOGIN_FAILED',
          error.response?.data?.message || '用户名或密码错误',
          error.response?.data
        )
        return Promise.reject(appError)
      }

      try {
        const newToken = await refreshToken()
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        void refreshError
        // 刷新失败，清除token并跳转到登录页
        clearAuthTokens()
        window.location.href = '/login'
        return Promise.reject(createAppError('AUTH_EXPIRED', '认证已过期，请重新登录'))
      }
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
    // 头像字段归一化：后端可能返回 avatar_url
    const normalizedUser = { ...user, avatar: user.avatar || (user as any).avatar_url }

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
      const normalizedUser = { ...user, avatar: user.avatar || (user as any).avatar_url }

      // 存储认证信息
      setAuthTokens(token, '') // 新API可能没有refreshToken
      localStorage.setItem('user_info', JSON.stringify(normalizedUser))
      emitUserUpdated(normalizedUser)

      return { ...response.data.data, user: normalizedUser }
    }

    throw createAppError('REGISTER_FAILED', response.data.message || '注册失败')
  } catch (error) {
    console.error('API: 注册请求失败:', error)
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
    console.error('登出请求失败:', error)
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
    const normalizedUser = { ...user, avatar: user.avatar || (user as any).avatar_url } as any
    if (!normalizedUser.avatar_version) normalizedUser.avatar_version = Date.now()
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
    const normalizedUser = { ...user, avatar: user.avatar || (user as any).avatar_url } as any
    if (!normalizedUser.avatar_version) normalizedUser.avatar_version = Date.now()
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
export async function forgotPassword(email: string): Promise<void> {
  const response = await api.post<ApiResponse>('/auth/forgot-password', { email })

  if (response.data.code !== 200) {
    throw createAppError('FORGOT_PASSWORD_FAILED', response.data.message || '发送重置邮件失败')
  }
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
 * 更新用户头像
 */
export async function updateUserAvatar(avatarUrl: string): Promise<User> {
  try {
    const res = await api.put<ApiResponse<User>>('/auth/me/avatar', { avatar: avatarUrl })
    if (res.data.code === 200 && res.data.data) {
      const user = res.data.data
      const normalizedUser = { ...user, avatar: user.avatar || (user as any).avatar_url } as any
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
      const normalizedUser = { ...user, avatar: user.avatar || (user as any).avatar_url } as any
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

export default api
