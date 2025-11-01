import type { User } from '@/types'
import { STORAGE_KEYS } from '@/config/storage-keys'

/**
 * 检查用户是否为管理员
 */
export function isAdmin(user: User | null): boolean {
  if (!user) return false
  return user.role === 'admin'
}

/**
 * 检查用户是否有指定权限
 * @param user 用户对象
 * @param permission 权限字符串（预留参数，用于未来权限系统扩展）
 * @returns 当前仅检查是否为管理员
 */
export function hasPermission(user: User | null, permission?: string): boolean {
  void permission // 预留参数，未来可用于细粒度权限控制
  
  if (!user) return false
  
  // 管理员拥有所有权限
  if (user.role === 'admin') return true
  
  // TODO: 实现基于 permission 字符串的细粒度权限检查
  // 例如：检查用户是否有特定的操作权限（edit, delete, create等）
  
  return false
}

/**
 * 获取当前登录用户信息
 */
export function getCurrentUser(): User | null {
  try {
    const userInfo = localStorage.getItem(STORAGE_KEYS.USER_INFO) || sessionStorage.getItem(STORAGE_KEYS.USER_INFO)
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
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
  return !!token
}

