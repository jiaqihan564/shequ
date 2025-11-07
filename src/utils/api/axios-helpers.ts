/**
 * Axios 公共辅助函数
 * 提供可复用的拦截器和工具函数
 */

import type { InternalAxiosRequestConfig } from 'axios'

import { STORAGE_KEYS } from '@/config/storage-keys'
import { logger } from '@/utils/ui/logger'

/**
 * 获取认证 token
 */
export function getAuthToken(): string | null {
  return (
    localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
  )
}

/**
 * 生成请求 ID（用于追踪和取消）
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 请求拦截器：添加认证 token
 * 可用于任何 axios 实例
 */
export function addAuthTokenInterceptor(
  config: InternalAxiosRequestConfig
): InternalAxiosRequestConfig {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}

/**
 * 请求拦截器：添加请求 ID
 */
export function addRequestIdInterceptor(
  config: InternalAxiosRequestConfig
): InternalAxiosRequestConfig {
  const requestId = generateRequestId()
  config.headers['X-Request-ID'] = requestId
  return config
}

/**
 * 响应错误处理器：基础版本
 * 简单地提取错误消息
 */
export function handleResponseError(error: unknown): Promise<never> {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as {
      response?: { data?: { message?: string }; status?: number }
      message?: string
    }
    const message = axiosError.response?.data?.message || axiosError.message || '请求失败'
    logger.error('API 请求错误:', {
      message,
      status: axiosError.response?.status
    })
    return Promise.reject(new Error(message))
  }
  return Promise.reject(error)
}

/**
 * 清理过期缓存的辅助函数
 */
export function cleanExpiredCache<T>(
  cache: Map<string, { data: T; timestamp: number }>,
  maxAge: number
): void {
  const now = Date.now()
  const keysToDelete: string[] = []

  cache.forEach((value, key) => {
    if (now - value.timestamp > maxAge) {
      keysToDelete.push(key)
    }
  })

  keysToDelete.forEach(key => cache.delete(key))

  if (keysToDelete.length > 0) {
    logger.debug(`清理了 ${keysToDelete.length} 个过期缓存`)
  }
}

/**
 * 创建缓存键
 */
export function createCacheKey(url: string, params?: Record<string, unknown>): string {
  return `${url}?${JSON.stringify(params || {})}`
}
