/**
 * LocalStorage/SessionStorage 键名常量
 * 统一管理所有本地存储的键名，避免硬编码和拼写错误
 */

/**
 * 认证相关的存储键
 */
export const AUTH_STORAGE_KEYS = {
  /** JWT访问令牌 */
  AUTH_TOKEN: 'auth_token',
  
  /** JWT刷新令牌 */
  REFRESH_TOKEN: 'refresh_token',
  
  /** 用户信息 */
  USER_INFO: 'user_info',
  
  /** 记住的用户名（登录表单） */
  REMEMBERED_USERNAME: 'remembered_username',
} as const

/**
 * 功能使用记录相关的存储键
 */
export const FEATURE_STORAGE_KEYS = {
  /** 是否使用过代码编辑器 */
  CODE_EDITOR_USED: 'code_editor_used',
} as const

/**
 * 所有存储键的联合类型
 */
export type StorageKey = 
  | typeof AUTH_STORAGE_KEYS[keyof typeof AUTH_STORAGE_KEYS]
  | typeof FEATURE_STORAGE_KEYS[keyof typeof FEATURE_STORAGE_KEYS]

/**
 * 导出所有存储键（方便一次性导入）
 */
export const STORAGE_KEYS = {
  ...AUTH_STORAGE_KEYS,
  ...FEATURE_STORAGE_KEYS,
} as const

export default STORAGE_KEYS

