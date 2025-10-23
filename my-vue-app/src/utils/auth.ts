import type { User } from '@/types'

/**
 * 检查用户是否为管理员
 */
export function isAdmin(user: User | null): boolean {
  if (!user) return false
  return user.role === 'admin'
}

/**
 * 检查用户是否有指定权限
 */
export function hasPermission(user: User | null, _permission: string): boolean {
  if (!user) return false
  
  // 管理员拥有所有权限
  if (user.role === 'admin') return true
  
  // 可以在这里扩展更多权限检查逻辑
  // 例如：基于 permission 字符串检查特定权限
  
  return false
}

/**
 * 获取当前登录用户信息
 */
export function getCurrentUser(): User | null {
  try {
    const userInfo = localStorage.getItem('user_info') || sessionStorage.getItem('user_info')
    if (!userInfo) return null
    return JSON.parse(userInfo) as User
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return null
  }
}

/**
 * 检查用户是否已登录
 */
export function isAuthenticated(): boolean {
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
  return !!token
}

