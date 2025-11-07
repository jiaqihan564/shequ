/**
 * 消息缓存服务 - 使用 localStorage 缓存聊天消息
 * 用于在页面刷新后快速恢复消息，提升用户体验
 */

import { logger } from '@/utils/ui/logger'

interface ChatMessage {
  id: number
  user_id: number
  username: string
  nickname?: string
  avatar?: string
  content: string
  send_time: string
  message_type: number
}

export class MessageCache {
  private readonly CACHE_KEY = 'chat_messages_cache'
  private readonly MAX_CACHE_SIZE = 100 // 最多缓存100条消息
  private readonly CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24小时过期

  /**
   * 保存消息到缓存
   */
  save(messages: ChatMessage[]): void {
    try {
      const cacheData = {
        messages: messages.slice(-this.MAX_CACHE_SIZE),
        timestamp: Date.now()
      }
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData))
      logger.debug(`[MessageCache] Saved ${cacheData.messages.length} messages to cache`)
    } catch (error) {
      logger.error('[MessageCache] Failed to save messages:', error)
      // 可能是 localStorage 满了，尝试清理
      this.clear()
    }
  }

  /**
   * 从缓存恢复消息
   */
  restore(): ChatMessage[] {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY)
      if (!cached) {
        logger.debug('[MessageCache] No cached messages found')
        return []
      }

      const cacheData = JSON.parse(cached)
      
      // 检查缓存是否过期
      const age = Date.now() - (cacheData.timestamp || 0)
      if (age > this.CACHE_EXPIRY_MS) {
        logger.info('[MessageCache] Cache expired, clearing...')
        this.clear()
        return []
      }

      const messages = cacheData.messages || []
      logger.info(`[MessageCache] Restored ${messages.length} messages from cache (age: ${Math.round(age / 1000)}s)`)
      return messages
    } catch (error) {
      logger.error('[MessageCache] Failed to restore messages:', error)
      this.clear()
      return []
    }
  }

  /**
   * 清空缓存
   */
  clear(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY)
      logger.debug('[MessageCache] Cache cleared')
    } catch (error) {
      logger.error('[MessageCache] Failed to clear cache:', error)
    }
  }

  /**
   * 获取缓存信息
   */
  getInfo(): { count: number; age: number } | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY)
      if (!cached) return null

      const cacheData = JSON.parse(cached)
      const age = Date.now() - (cacheData.timestamp || 0)
      
      return {
        count: (cacheData.messages || []).length,
        age: Math.round(age / 1000) // 秒
      }
    } catch {
      return null
    }
  }
}

// 导出单例
export const messageCache = new MessageCache()

