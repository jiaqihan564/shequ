// 用户相关类型
export interface User {
  id: number
  username: string
  email: string
  auth_status: number
  account_status: number
  avatar?: string
  avatar_url?: string
  role?: UserRole
  status?: UserStatus
  profile?: UserProfile
  created_at?: string
  updated_at?: string
  updatedAt?: string // 兼容驼峰命名（用于头像版本fallback）
}

export type UserRole = 'user' | 'admin' | 'moderator'
export type UserStatus = 'active' | 'inactive' | 'banned' | 'pending'

export interface UserProfile {
  nickname?: string
  bio?: string
  avatar_url?: string
  province?: string
  city?: string
}

// 认证相关类型
export interface LoginForm {
  username: string
  password: string
  rememberMe: boolean
  captcha?: string
}

export interface RegisterForm {
  username: string
  email: string
  password: string
  confirmPassword: string
  agreeToTerms: boolean
  captcha?: string
  province?: string // 用户注册时的省份
  city?: string // 用户注册时的城市
}

export interface RegisterResponse {
  token: string
  user: User
}

export interface LoginResponse {
  user: User
  token: string
  expiresIn?: number
}

// 表单验证错误类型
export interface FormErrors {
  [key: string]: string | undefined
}

// API响应类型
export interface ApiResponse<T = any> {
  code: number
  message: string
  data?: T
  errors?: Record<string, string[]>
  meta?: PaginationMeta
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

// 错误类型
export interface AppError {
  code: string
  message: string
  details?: any
  stack?: string
}

// 头像历史类型
export interface AvatarHistoryItem {
  key: string
  url: string
  size: number
  last_modified: number
}

export interface AvatarHistoryList {
  items: AvatarHistoryItem[]
}

// 导出文章相关类型
export * from './article'

// 导出消息相关类型
export * from './message'
