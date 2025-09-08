import axios, { type AxiosInstance, type AxiosResponse, type AxiosRequestConfig } from 'axios'
import type { 
  ApiResponse, 
  LoginResponse, 
  LoginForm, 
  RegisterForm, 
  RefreshTokenResponse,
  User,
  AppError
} from '@/types'

// 创建axios实例
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 添加认证token
    const token = getAuthToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // 添加请求ID用于追踪
    config.headers['X-Request-ID'] = generateRequestId()
    
    return config
  },
  (error) => {
    return Promise.reject(createAppError('REQUEST_ERROR', '请求配置错误', error))
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config
    
    // 处理认证错误
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        const newToken = await refreshToken()
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        // 刷新失败，清除token并跳转到登录页
        clearAuthTokens()
        window.location.href = '/login'
        return Promise.reject(createAppError('AUTH_EXPIRED', '认证已过期，请重新登录'))
      }
    }
    
    // 处理其他错误
    const appError = createAppError(
      error.response?.data?.code || 'API_ERROR',
      error.response?.data?.message || '请求失败',
      error.response?.data
    )
    
    return Promise.reject(appError)
  }
)

// 工具函数
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token')
}

function setAuthTokens(token: string, refreshToken: string): void {
  localStorage.setItem('auth_token', token)
  localStorage.setItem('refresh_token', refreshToken)
}

function clearAuthTokens(): void {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user_info')
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

// 认证相关API
/**
 * 用户登录
 */
export async function login(loginData: LoginForm): Promise<LoginResponse> {
  const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', loginData)
  
  if (response.data.success && response.data.data) {
    const { token, refreshToken, user } = response.data.data
    
    // 存储认证信息
    setAuthTokens(token, refreshToken)
    localStorage.setItem('user_info', JSON.stringify(user))
    
    return response.data.data
  }
  
  throw createAppError('LOGIN_FAILED', response.data.message || '登录失败')
}

/**
 * 用户注册
 */
export async function register(registerData: RegisterForm): Promise<LoginResponse> {
  const response = await api.post<ApiResponse<LoginResponse>>('/auth/register', registerData)
  
  if (response.data.success && response.data.data) {
    const { token, refreshToken, user } = response.data.data
    
    // 存储认证信息
    setAuthTokens(token, refreshToken)
    localStorage.setItem('user_info', JSON.stringify(user))
    
    return response.data.data
  }
  
  throw createAppError('REGISTER_FAILED', response.data.message || '注册失败')
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
  const refreshTokenValue = localStorage.getItem('refresh_token')
  if (!refreshTokenValue) {
    throw createAppError('NO_REFRESH_TOKEN', '没有刷新令牌')
  }
  
  const response = await api.post<ApiResponse<RefreshTokenResponse>>('/auth/refresh', {
    refreshToken: refreshTokenValue
  })
  
  if (response.data.success && response.data.data) {
    const { token } = response.data.data
    localStorage.setItem('auth_token', token)
    return token
  }
  
  throw createAppError('REFRESH_FAILED', '刷新令牌失败')
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<User> {
  const response = await api.get<ApiResponse<User>>('/auth/me')
  
  if (response.data.success && response.data.data) {
    localStorage.setItem('user_info', JSON.stringify(response.data.data))
    return response.data.data
  }
  
  throw createAppError('GET_USER_FAILED', '获取用户信息失败')
}

/**
 * 更新用户信息
 */
export async function updateUser(userData: Partial<User>): Promise<User> {
  const response = await api.put<ApiResponse<User>>('/auth/me', userData)
  
  if (response.data.success && response.data.data) {
    localStorage.setItem('user_info', JSON.stringify(response.data.data))
    return response.data.data
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
  
  if (!response.data.success) {
    throw createAppError('CHANGE_PASSWORD_FAILED', response.data.message || '修改密码失败')
  }
}

/**
 * 忘记密码
 */
export async function forgotPassword(email: string): Promise<void> {
  const response = await api.post<ApiResponse>('/auth/forgot-password', { email })
  
  if (!response.data.success) {
    throw createAppError('FORGOT_PASSWORD_FAILED', response.data.message || '发送重置邮件失败')
  }
}

/**
 * 重置密码
 */
export async function resetPassword(data: {
  token: string
  newPassword: string
}): Promise<void> {
  const response = await api.post<ApiResponse>('/auth/reset-password', data)
  
  if (!response.data.success) {
    throw createAppError('RESET_PASSWORD_FAILED', response.data.message || '重置密码失败')
  }
}

// 通用API方法
/**
 * GET请求
 */
export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.get<ApiResponse<T>>(url, config)
  
  if (response.data.success && response.data.data !== undefined) {
    return response.data.data
  }
  
  throw createAppError('GET_FAILED', response.data.message || '获取数据失败')
}

/**
 * POST请求
 */
export async function post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.post<ApiResponse<T>>(url, data, config)
  
  if (response.data.success && response.data.data !== undefined) {
    return response.data.data
  }
  
  throw createAppError('POST_FAILED', response.data.message || '提交数据失败')
}

/**
 * PUT请求
 */
export async function put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.put<ApiResponse<T>>(url, data, config)
  
  if (response.data.success && response.data.data !== undefined) {
    return response.data.data
  }
  
  throw createAppError('PUT_FAILED', response.data.message || '更新数据失败')
}

/**
 * DELETE请求
 */
export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.delete<ApiResponse<T>>(url, config)
  
  if (response.data.success && response.data.data !== undefined) {
    return response.data.data
  }
  
  throw createAppError('DELETE_FAILED', response.data.message || '删除数据失败')
}

export default api
