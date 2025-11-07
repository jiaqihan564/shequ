/**
 * 验证规则常量配置
 * 统一管理所有表单验证的数值常量
 */

/**
 * 用户名验证规则
 */
export const USERNAME_VALIDATION = {
  /** 最小长度 */
  MIN_LENGTH: 3,

  /** 最大长度 */
  MAX_LENGTH: 20
} as const

/**
 * 密码验证规则
 */
export const PASSWORD_VALIDATION = {
  /** 最小长度（必须） */
  MIN_LENGTH: 6,

  /** 最大长度 */
  MAX_LENGTH: 50,

  /** 推荐最小长度（用于密码强度提示） */
  RECOMMENDED_MIN_LENGTH: 8
} as const

/**
 * 邮箱或用户名验证规则
 */
export const EMAIL_OR_USERNAME_VALIDATION = {
  /** 最小长度 */
  MIN_LENGTH: 3,

  /** 最大长度 */
  MAX_LENGTH: 50
} as const

/**
 * 手机号验证规则
 */
export const PHONE_VALIDATION = {
  /** 手机号长度 */
  LENGTH: 11,

  /** 第一位数字 */
  FIRST_DIGIT: '1',

  /** 第二位数字范围（最小值） */
  SECOND_DIGIT_MIN: '3',

  /** 第二位数字范围（最大值） */
  SECOND_DIGIT_MAX: '9'
} as const

/**
 * 密码强度判断阈值
 */
export const PASSWORD_STRENGTH = {
  /** 强密码：需要包含的字符类型数量（大写、小写、数字、特殊字符） */
  STRONG_TYPES_COUNT: 4,

  /** 中等密码：需要包含的字符类型数量 */
  MEDIUM_TYPES_COUNT: 2,

  /** 弱密码：少于此数量的字符类型 */
  WEAK_TYPES_COUNT: 2
} as const

/**
 * 导出所有验证常量（方便一次性导入）
 */
export const VALIDATION_CONSTANTS = {
  USERNAME: USERNAME_VALIDATION,
  PASSWORD: PASSWORD_VALIDATION,
  EMAIL_OR_USERNAME: EMAIL_OR_USERNAME_VALIDATION,
  PHONE: PHONE_VALIDATION,
  PASSWORD_STRENGTH
} as const

export default VALIDATION_CONSTANTS
