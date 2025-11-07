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
  created_at?: string // 后端返回的字段名（下划线）
  updated_at?: string // 后端返回的字段名（下划线）
  createdAt?: string // 兼容驼峰命名
  updatedAt?: string // 兼容驼峰命名
}

export type UserRole = 'user' | 'admin' | 'moderator'
export type UserStatus = 'active' | 'inactive' | 'banned' | 'pending'

export interface UserProfile {
  nickname?: string
  firstName?: string
  lastName?: string
  bio?: string
  avatar_url?: string
  website?: string
  location?: string
  province?: string
  city?: string
  birthDate?: string
  socialLinks?: Record<string, string>
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
  refreshToken?: string
  expiresIn?: number
}

export interface RefreshTokenResponse {
  token: string
  expiresIn: number
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

// 组件Props类型
export interface BaseComponentProps {
  class?: string
  id?: string
  'data-testid'?: string
}

export interface LoadingProps extends BaseComponentProps {
  size?: 'small' | 'medium' | 'large'
  color?: string
}

export interface NotificationProps extends BaseComponentProps {
  message: string
  type: NotificationType
  show: boolean
  duration?: number
  closable?: boolean
}

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

// 表单验证规则类型
export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
  message?: string
}

export interface ValidationRules {
  [key: string]: ValidationRule[]
}

// 更严格的表单字段类型
export type FormField = 'username' | 'email' | 'password' | 'confirmPassword' | 'agreeToTerms'

// 表单验证错误类型
export type FormValidationErrors = {
  [K in FormField]?: string
}

// 路由相关类型
export interface RouteMeta {
  title?: string
  requiresAuth?: boolean
  roles?: UserRole[]
  layout?: string
  keepAlive?: boolean
}

// 主题相关类型
export type Theme = 'light' | 'dark' | 'auto'

export interface ThemeConfig {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: string
}

// 设置相关类型
export interface AppSettings {
  theme: Theme
  language: string
  notifications: NotificationSettings
  privacy: PrivacySettings
}

export interface NotificationSettings {
  email: boolean
  push: boolean
  inApp: boolean
  marketing: boolean
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private'
  showEmail: boolean
  showOnlineStatus: boolean
  allowDirectMessages: boolean
}

// 工具类型
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// 事件类型
export interface CustomEvent<T = any> {
  type: string
  payload: T
  timestamp: number
}

// 错误类型
export interface AppError {
  code: string
  message: string
  details?: any
  stack?: string
}

// 状态管理类型
export interface StoreState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: AppError | null
  settings: AppSettings
}

// 通用响应类型
export interface ListResponse<T> {
  items: T[]
  meta: PaginationMeta
}

export interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
  icon?: string
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

// 新闻相关类型
export interface NewsItem {
  id: string
  title: string
  source: string
  url: string
  imageUrl: string
  publishedAt: string
  summary?: string
}

export interface FetchNewsParams {
  pageSize?: number
  lang?: string
  country?: string
  category?: string
}

// 导出文章相关类型
export * from './article'
