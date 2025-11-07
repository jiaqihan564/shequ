/**
 * AuthManager - 认证状态管理器
 *
 * 职责：
 * - 集中管理token过期处理
 * - 防止重复跳转
 * - 提供清晰的状态追踪
 * - 统一清理认证信息
 */

import { STORAGE_KEYS } from '@/config/storage-keys'
import { logger } from '@/utils/ui/logger'

class AuthManager {
  private isHandlingExpiration = false
  private expirationHandledAt = 0
  private readonly EXPIRATION_COOLDOWN = 3000 // 3秒冷却期，防止重复处理

  /**
   * 处理token过期
   * @param reason 过期原因
   */
  handleTokenExpiration(reason: string = '登录已过期'): void {
    const now = Date.now()

    logger.info('[AuthManager] 收到token过期请求', {
      reason,
      isHandlingExpiration: this.isHandlingExpiration,
      timeSinceLastHandling: now - this.expirationHandledAt,
      timestamp: new Date().toISOString()
    })

    // 防抖机制：如果正在处理或冷却期内，跳过
    if (this.isHandlingExpiration) {
      logger.info('[AuthManager] ⚠️ 已经在处理token过期，跳过重复请求')
      return
    }

    if (now - this.expirationHandledAt < this.EXPIRATION_COOLDOWN) {
      const remaining = this.EXPIRATION_COOLDOWN - (now - this.expirationHandledAt)
      logger.info(`[AuthManager] ⚠️ 冷却期内 (剩余${remaining}ms)，跳过重复请求`)
      return
    }

    // 标记为正在处理
    this.isHandlingExpiration = true
    this.expirationHandledAt = now

    logger.info('[AuthManager] ✅ 开始处理token过期')

    // 执行登出流程
    this.performLogout(reason)
  }

  /**
   * 执行登出操作
   * @param reason 登出原因
   */
  private performLogout(reason: string): void {
    logger.info('[AuthManager] 步骤1/4: 开始清理认证信息')

    // 1. 清除所有认证信息和缓存
    this.clearAllAuthData()

    logger.info('[AuthManager] 步骤2/4: 设置强制登出标记')

    // 2. 设置强制登出标记（告诉路由守卫允许跳转）
    sessionStorage.setItem('__force_logout__', 'true')

    logger.info('[AuthManager] 步骤3/4: 派发登出事件')

    // 3. 派发全局登出事件
    this.dispatchLogoutEvent(reason)

    logger.info('[AuthManager] 步骤4/4: 执行跳转')

    // 4. 显示提示并跳转
    this.showMessageAndRedirect(reason)
  }

  /**
   * 清除所有认证数据
   */
  private clearAllAuthData(): void {
    const keysToRemove = [
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER_INFO
    ]

    // 从localStorage和sessionStorage中清除
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    })

    logger.info('[AuthManager] ✅ 认证数据已清除', { keys: keysToRemove })
  }

  /**
   * 派发登出事件
   */
  private dispatchLogoutEvent(reason: string): void {
    try {
      const event = new CustomEvent('user:logout', {
        detail: { reason, automatic: true, timestamp: Date.now() }
      })
      window.dispatchEvent(event)
      logger.info('[AuthManager] ✅ 登出事件已派发')
    } catch (error) {
      logger.error('[AuthManager] ❌ 派发登出事件失败:', error)
    }
  }

  /**
   * 显示提示信息并跳转到登录页
   */
  private showMessageAndRedirect(reason: string): void {
    // 尝试显示提示消息
    this.showToast(reason)

    // 立即执行跳转
    const loginUrl = `/login?expired=${Date.now()}`

    console.log('[AuthManager] 🚀 准备跳转到:', loginUrl)

    try {
      // 使用 location.replace 而不是 location.href
      // replace 不会留下历史记录，且不可被其他代码取消
      window.location.replace(loginUrl)

      console.log('[AuthManager] ✅ location.replace 已调用')
    } catch (error) {
      console.error('[AuthManager] ❌ location.replace 失败:', error)

      // 备用方案：使用 href
      try {
        window.location.href = loginUrl
        console.log('[AuthManager] ⚠️ 使用备用方案 location.href')
      } catch (error2) {
        console.error('[AuthManager] ❌ location.href 也失败:', error2)
      }
    }

    // 终极保险：50ms后检查是否成功跳转
    setTimeout(() => {
      if (window.location.pathname !== '/login') {
        console.warn('[AuthManager] ⚠️ 首次跳转可能失败，尝试顶层窗口跳转')
        try {
          window.top?.location.replace('/login')
        } catch (error) {
          console.error('[AuthManager] ❌ 顶层窗口跳转也失败:', error)
          // 最后的尝试
          window.location.href = '/login'
        }
      } else {
        console.log('[AuthManager] ✅ 跳转成功')
      }
    }, 50)
  }

  /**
   * 显示Toast消息
   */
  private showToast(message: string): void {
    try {
      // 尝试使用Element Plus的消息组件
      if (typeof (window as any).ElMessage !== 'undefined') {
        ;(window as any).ElMessage.warning({
          message: `${message}，正在跳转...`,
          duration: 1000,
          showClose: false
        })
      } else {
        // 降级到原生alert
        console.log('[AuthManager] ElMessage未定义，使用console.warn')
        console.warn(`${message}，正在跳转到登录页...`)
      }
    } catch (error) {
      console.error('[AuthManager] 显示消息失败:', error)
    }
  }

  /**
   * 重置状态（用于测试或特殊情况）
   */
  reset(): void {
    this.isHandlingExpiration = false
    console.log('[AuthManager] 状态已重置')
  }

  /**
   * 获取当前状态（用于调试）
   */
  getStatus(): { isHandling: boolean; lastHandledAt: number; cooldownRemaining: number } {
    const now = Date.now()
    const cooldownRemaining = Math.max(
      0,
      this.EXPIRATION_COOLDOWN - (now - this.expirationHandledAt)
    )

    return {
      isHandling: this.isHandlingExpiration,
      lastHandledAt: this.expirationHandledAt,
      cooldownRemaining
    }
  }
}

// 创建单例实例
export const authManager = new AuthManager()

// 开发环境下暴露到window对象，方便调试
if (import.meta.env.DEV) {
  ;(window as any).__authManager__ = authManager
  console.log('[AuthManager] 已初始化（开发模式，可通过 window.__authManager__ 访问）')
}
