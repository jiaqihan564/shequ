import { VALIDATION_CONSTANTS } from '@/config/validation-constants'
import type { ValidationRule, ValidationRules } from '@/types'

// 常用正则表达式（使用配置常量动态生成）
export const REGEX_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  username: new RegExp(
    `^[a-zA-Z0-9_]{${VALIDATION_CONSTANTS.USERNAME.MIN_LENGTH},${VALIDATION_CONSTANTS.USERNAME.MAX_LENGTH}}$`
  ),
  // 密码需为 6-50 位，且至少包含一个字母与一个数字；不强制特殊字符与大小写
  password: new RegExp(
    `^(?=.*[A-Za-z])(?=.*\\d).{${VALIDATION_CONSTANTS.PASSWORD.MIN_LENGTH},${VALIDATION_CONSTANTS.PASSWORD.MAX_LENGTH}}$`
  ),
  phone: new RegExp(
    `^${VALIDATION_CONSTANTS.PHONE.FIRST_DIGIT}[${VALIDATION_CONSTANTS.PHONE.SECOND_DIGIT_MIN}-${VALIDATION_CONSTANTS.PHONE.SECOND_DIGIT_MAX}]\\d{${VALIDATION_CONSTANTS.PHONE.LENGTH - 2}}$`
  ),
  url: /^https?:\/\/.+/,
  chinese: /^[\u4e00-\u9fa5]+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/
} as const

// 验证规则配置
export const VALIDATION_RULES: ValidationRules = {
  username: [
    { required: true, message: '请输入用户名' },
    {
      minLength: VALIDATION_CONSTANTS.USERNAME.MIN_LENGTH,
      message: `用户名至少${VALIDATION_CONSTANTS.USERNAME.MIN_LENGTH}个字符`
    },
    {
      maxLength: VALIDATION_CONSTANTS.USERNAME.MAX_LENGTH,
      message: `用户名不能超过${VALIDATION_CONSTANTS.USERNAME.MAX_LENGTH}个字符`
    },
    { pattern: REGEX_PATTERNS.username, message: '用户名只能包含字母、数字和下划线' }
  ],
  email: [
    { required: true, message: '请输入邮箱地址' },
    { pattern: REGEX_PATTERNS.email, message: '请输入有效的邮箱地址' }
  ],
  password: [
    { required: true, message: '请输入密码' },
    {
      minLength: VALIDATION_CONSTANTS.PASSWORD.MIN_LENGTH,
      message: `密码至少${VALIDATION_CONSTANTS.PASSWORD.MIN_LENGTH}个字符`
    },
    {
      maxLength: VALIDATION_CONSTANTS.PASSWORD.MAX_LENGTH,
      message: `密码不能超过${VALIDATION_CONSTANTS.PASSWORD.MAX_LENGTH}个字符`
    },
    {
      pattern: REGEX_PATTERNS.password,
      message: `密码需为${VALIDATION_CONSTANTS.PASSWORD.MIN_LENGTH}-${VALIDATION_CONSTANTS.PASSWORD.MAX_LENGTH}个字符，且至少包含字母和数字`
    }
  ],
  confirmPassword: [{ required: true, message: '请确认密码' }],
  phone: [
    { required: true, message: '请输入手机号' },
    { pattern: REGEX_PATTERNS.phone, message: '请输入有效的手机号' }
  ],
  agreeToTerms: [
    {
      required: true,
      custom: (value: boolean) => (!value ? '请同意用户协议和隐私政策' : null),
      message: '请同意用户协议和隐私政策'
    }
  ]
}

/**
 * 验证用户名或邮箱
 */
export function validateUsernameOrEmail(value: string): string | null {
  if (!value.trim()) {
    return '请输入用户名或邮箱'
  }

  if (value.length < VALIDATION_CONSTANTS.EMAIL_OR_USERNAME.MIN_LENGTH) {
    return `用户名至少${VALIDATION_CONSTANTS.EMAIL_OR_USERNAME.MIN_LENGTH}个字符`
  }

  if (value.length > VALIDATION_CONSTANTS.EMAIL_OR_USERNAME.MAX_LENGTH) {
    return `用户名不能超过${VALIDATION_CONSTANTS.EMAIL_OR_USERNAME.MAX_LENGTH}个字符`
  }

  // 检查是否为邮箱格式
  if (REGEX_PATTERNS.email.test(value)) {
    return null
  }

  // 检查是否为用户名格式
  if (REGEX_PATTERNS.username.test(value)) {
    return null
  }

  return '请输入有效的用户名或邮箱地址'
}

/**
 * 验证用户名
 */
export function validateUsername(username: string): string | null {
  return validateField(username, VALIDATION_RULES.username)
}

/**
 * 验证邮箱
 */
export function validateEmail(email: string): string | null {
  return validateField(email, VALIDATION_RULES.email)
}

/**
 * 验证密码
 */
export function validatePassword(password: string): string | null {
  return validateField(password, VALIDATION_RULES.password)
}

/**
 * 检查密码强度（仅提供建议，不阻止验证）
 */
export function checkPasswordStrength(password: string): {
  strength: 'weak' | 'medium' | 'strong'
  suggestions: string[]
} {
  if (!password) {
    return { strength: 'weak', suggestions: [] }
  }

  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  const hasMinLength = password.length >= VALIDATION_CONSTANTS.PASSWORD.RECOMMENDED_MIN_LENGTH

  const suggestions: string[] = []
  let strength: 'weak' | 'medium' | 'strong' = 'weak'

  // 收集建议
  if (!hasMinLength) {
    suggestions.push(`建议密码至少${VALIDATION_CONSTANTS.PASSWORD.RECOMMENDED_MIN_LENGTH}个字符`)
  }
  if (!hasUpperCase) {
    suggestions.push('建议包含大写字母')
  }
  if (!hasLowerCase) {
    suggestions.push('建议包含小写字母')
  }
  if (!hasNumbers) {
    suggestions.push('建议包含数字')
  }
  if (!hasSpecialChar) {
    suggestions.push('建议包含特殊字符')
  }

  // 计算强度（只考虑字符类型，不包括长度）
  const strengthCount = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(
    Boolean
  ).length

  if (strengthCount >= VALIDATION_CONSTANTS.PASSWORD_STRENGTH.STRONG_TYPES_COUNT) {
    strength = 'strong'
  } else if (strengthCount >= VALIDATION_CONSTANTS.PASSWORD_STRENGTH.MEDIUM_TYPES_COUNT) {
    strength = 'medium'
  } else {
    strength = 'weak'
  }

  return { strength, suggestions }
}

/**
 * 验证确认密码
 */
export function validateConfirmPassword(password: string, confirmPassword: string): string | null {
  if (!confirmPassword) {
    return '请确认密码'
  }

  if (password !== confirmPassword) {
    return '两次输入的密码不一致'
  }

  return null
}

/**
 * 通用表单验证函数
 */
export function validateField(value: any, rules: ValidationRule[]): string | null {
  for (const rule of rules) {
    // 必填验证
    if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return rule.message || '此字段为必填项'
    }

    // 如果值为空且不是必填，跳过其他验证
    if (!value && !rule.required) {
      continue
    }

    // 字符串长度验证
    if (value && typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        return rule.message || `至少需要${rule.minLength}个字符`
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        return rule.message || `不能超过${rule.maxLength}个字符`
      }

      // 正则表达式验证
      if (rule.pattern && !rule.pattern.test(value)) {
        return rule.message || '格式不正确'
      }
    }

    // 自定义验证
    if (rule.custom) {
      const customError = rule.custom(value)
      if (customError) {
        return customError
      }
    }
  }

  return null
}

/**
 * 验证整个表单
 */
export function validateForm<T extends Record<string, any>>(
  formData: T,
  rules: ValidationRules
): Record<keyof T, string> {
  const errors: Record<keyof T, string> = {} as Record<keyof T, string>

  for (const [field, fieldRules] of Object.entries(rules)) {
    const value = formData[field as keyof T]
    const error = validateField(value, fieldRules)

    if (error) {
      errors[field as keyof T] = error
    }
  }

  return errors
}

/**
 * 检查表单是否有错误
 */
export function hasFormErrors(errors: Record<string, string>): boolean {
  return Object.values(errors).some(error => error && error.trim() !== '')
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}
