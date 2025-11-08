import { ref, watch, type Ref } from 'vue'

import { websocketConfig } from '@/config'
import { messageCache } from '@/services/messageCache'
import type { ArticleComment, ChatMessage } from '@/types'
import type { ArticleListItem } from '@/types/article'
import type { ResourceListItem } from '@/types/resource'
import { getChatMessages } from '@/utils/api'
import { toast } from '@/utils/ui/toast'
import { getStoredToken, isTokenExpired } from '@/utils/tokenValidator'
import { logger } from '@/utils/ui/logger'

interface CommentNotification {
  type: 'new_comment' | 'new_reply' | 'comment_deleted'
  entity?: 'article' | 'resource'
  article_id?: number
  resource_id?: number
  comment_id: number
  parent_id?: number
  user_id: number
  username: string
  nickname?: string
  avatar?: string
  content: string
  created_at: string
  reply_to_user?: {
    id: number
    nickname: string
  }
  comment?: ArticleComment | any
}

interface ContentBroadcastPayload<T> {
  action: 'created'
  data: Partial<T> | null
  raw: unknown
}

type ContentBroadcastCallback<T> = (payload: ContentBroadcastPayload<T>) => void

interface WSMessage {
  type:
    | 'message'
    | 'online_count'
    | 'heartbeat'
    | 'system'
    | 'notification'
    | 'private_message'
    | 'message_read'
    | 'article_comment'
    | 'article_reply'
    | 'resource_comment'
    | 'resource_reply'
    | 'comment_deleted'
    | 'new_article'
    | 'new_resource'
  data: unknown
}

type MessageCallback = (message: ChatMessage) => void
type OnlineCountCallback = (count: number) => void
type SystemMessageCallback = (data: unknown) => void
type PrivateMessageCallback = (data: any) => void
type MessageReadCallback = (data: any) => void
type CommentCallback = (data: CommentNotification) => void

class GlobalChatService {
  private static instance: GlobalChatService

  // Reactive state
  public messages: Ref<ChatMessage[]> = ref([])
  public onlineCount: Ref<number> = ref(0)
  public connectionStatus: Ref<'connecting' | 'connected' | 'disconnected'> = ref('disconnected')

  // WebSocket instance and timers
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private reconnectTimeout: number | null = null
  private heartbeatInterval: number | null = null
  private isManualClose = false
  private isConnecting = false // Lock to prevent concurrent connections
  private connectionPromise: Promise<void> | null = null // Promise for async connection
  private isInitialized = false // Track if service has been initialized

  // Subscription callbacks
  private messageCallbacks: Set<MessageCallback> = new Set()
  private onlineCountCallbacks: Set<OnlineCountCallback> = new Set()
  private systemMessageCallbacks: Set<SystemMessageCallback> = new Set()
  private privateMessageCallbacks: Set<PrivateMessageCallback> = new Set()
  private messageReadCallbacks: Set<MessageReadCallback> = new Set()
  private commentCallbacks: Set<CommentCallback> = new Set()
  private articleBroadcastCallbacks: Set<ContentBroadcastCallback<ArticleListItem>> = new Set()
  private resourceBroadcastCallbacks: Set<ContentBroadcastCallback<ResourceListItem>> = new Set()

  private constructor() {
    logger.info('[GlobalChat] Service initialized')
    this.setupAutoCaching()
  }

  public static getInstance(): GlobalChatService {
    if (!GlobalChatService.instance) {
      GlobalChatService.instance = new GlobalChatService()
    }
    return GlobalChatService.instance
  }

  /**
   * 快速启动服务 - 优化的初始化流程
   * 1. 立即恢复缓存消息（用户立即看到内容）
   * 2. 并行连接WebSocket和拉取最新消息
   * 3. 合并结果并更新UI
   */
  public async quickStart(): Promise<void> {
    if (this.isInitialized) {
      logger.info('[GlobalChat] Already initialized, skipping quickStart')
      return
    }

    logger.info('[GlobalChat] Quick start initiated')
    this.isInitialized = true

    // 步骤1: 立即恢复缓存消息（给用户立即看到内容）
    const cached = messageCache.restore()
    if (cached.length > 0) {
      this.messages.value = cached
      logger.info(`[GlobalChat] ✅ Restored ${cached.length} cached messages`)
    }

    // 步骤2: 并行操作 - WebSocket连接 + API拉取
    const results = await Promise.allSettled([
      this.connectWithTimeout(5000),
      this.fetchRecentMessages(100)
    ])

    // 步骤3: 处理结果
    const [wsResult, apiResult] = results

    if (wsResult.status === 'fulfilled') {
      logger.info('[GlobalChat] ✅ WebSocket connected successfully')
    } else {
      logger.error('[GlobalChat] ❌ WebSocket connection failed:', wsResult.reason)
      // 即使连接失败，用户仍能看到缓存和API拉取的消息
    }

    if (apiResult.status === 'fulfilled' && apiResult.value) {
      const newMessages = apiResult.value
      if (newMessages.length > 0) {
        // 合并消息（去重）
        this.mergeMessages(newMessages)
        logger.info(`[GlobalChat] ✅ Merged ${newMessages.length} messages from API`)
      }
    } else if (apiResult.status === 'rejected') {
      logger.error('[GlobalChat] ❌ Failed to fetch messages:', apiResult.reason)
    }
  }

  /**
   * 带超时的连接方法
   */
  private connectWithTimeout(timeoutMs: number): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      // 如果已经连接，立即返回
      if (this.connectionStatus.value === 'connected') {
        resolve()
        this.connectionPromise = null
        return
      }

      // 开始连接
      this.connect()

      // 监听连接状态
      const checkInterval = setInterval(() => {
        if (this.connectionStatus.value === 'connected') {
          clearInterval(checkInterval)
          clearTimeout(timeout)
          this.connectionPromise = null
          resolve()
        }
      }, 100)

      // 超时处理
      const timeout = setTimeout(() => {
        clearInterval(checkInterval)
        this.connectionPromise = null
        reject(new Error(`Connection timeout after ${timeoutMs}ms`))
      }, timeoutMs)
    })

    return this.connectionPromise
  }

  /**
   * 拉取最近的消息
   */
  private async fetchRecentMessages(limit: number = 100): Promise<ChatMessage[]> {
    try {
      const result = await getChatMessages(limit)
      return result.messages || []
    } catch (error) {
      logger.error('[GlobalChat] Failed to fetch messages:', error)
      return []
    }
  }

  /**
   * 合并消息（去重）
   */
  private mergeMessages(newMessages: ChatMessage[]): void {
    if (newMessages.length === 0) return

    const existingIds = new Set(this.messages.value.map(m => m.id))
    const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id))

    if (uniqueNewMessages.length > 0) {
      // 合并并按时间排序
      this.messages.value = [...this.messages.value, ...uniqueNewMessages].sort(
        (a, b) => new Date(a.send_time).getTime() - new Date(b.send_time).getTime()
      )

      // 限制消息数量
      if (this.messages.value.length > websocketConfig.maxMessages) {
        this.messages.value = this.messages.value.slice(-websocketConfig.maxMessages)
      }
    }
  }

  /**
   * 设置自动缓存 - 监听消息变化并自动保存
   */
  private setupAutoCaching(): void {
    watch(
      this.messages,
      newMessages => {
        if (newMessages.length > 0) {
          messageCache.save(newMessages)
        }
      },
      { deep: true }
    )
    logger.debug('[GlobalChat] Auto-caching enabled')
  }

  private extractContentPayload<T>(payload: unknown, candidateKeys: string[]): Partial<T> | null {
    if (!payload || typeof payload !== 'object') {
      return null
    }

    const record = payload as Record<string, unknown>

    if ('id' in record) {
      return record as Partial<T>
    }

    for (const key of candidateKeys) {
      if (record[key]) {
        const candidate = this.extractContentPayload<T>(record[key], candidateKeys)
        if (candidate && 'id' in candidate) {
          return candidate
        }
      }
    }

    if ('data' in record && record.data) {
      const candidate = this.extractContentPayload<T>(record.data, candidateKeys)
      if (candidate && 'id' in candidate) {
        return candidate
      }
    }

    return null
  }

  private emitContentBroadcast<T>(
    callbacks: Set<ContentBroadcastCallback<T>>,
    action: 'created',
    rawPayload: unknown,
    candidateKeys: string[]
  ): void {
    if (callbacks.size === 0) return

    const content = this.extractContentPayload<T>(rawPayload, candidateKeys)
    const payload: ContentBroadcastPayload<T> = {
      action,
      data: content ? { ...content } : null,
      raw: rawPayload
    }

    callbacks.forEach(callback => {
      try {
        callback(payload)
      } catch (error) {
        logger.error('[GlobalChat] Error in content broadcast callback:', error)
      }
    })
  }

  private getWebSocketUrl(): string {
    const token = getStoredToken()
    if (!token) {
      logger.error('[GlobalChat] No authentication token found')
      return ''
    }

    // Determine WebSocket protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'

    // In development with Vite proxy, use relative path to leverage proxy
    // This avoids CORS issues and automatically handles WebSocket upgrade
    const isDevelopment = import.meta.env.DEV

    let wsUrl: string
    if (isDevelopment) {
      // Use relative path - Vite proxy will forward to backend
      // Example: ws://localhost:3000/api/chat/ws -> http://localhost:3001/api/chat/ws
      wsUrl = `${protocol}//${window.location.host}/api/chat/ws?token=${encodeURIComponent(token)}`
      logger.info('[GlobalChat] Using Vite proxy for WebSocket')
    } else {
      // Production: construct full URL from environment variable
      let host = window.location.host // Default to current host
      if (import.meta.env.VITE_API_BASE_URL) {
        // Remove protocol and /api suffix from base URL
        host = import.meta.env.VITE_API_BASE_URL.replace(/^https?:\/\//, '').replace(/\/api$/, '')
      }
      wsUrl = `${protocol}//${host}/api/chat/ws?token=${encodeURIComponent(token)}`
    }

    logger.debug('[GlobalChat] WebSocket URL:', wsUrl.replace(token, 'TOKEN_HIDDEN'))
    return wsUrl
  }

  public connect(): void {
    // Prevent concurrent connection attempts
    if (this.isConnecting) {
      logger.info('[GlobalChat] Connection already in progress, skipping')
      return
    }

    // Check token validity before attempting connection
    const token = getStoredToken()
    if (!token || isTokenExpired(token)) {
      logger.error('[GlobalChat] Invalid or expired token, cannot connect')
      this.connectionStatus.value = 'disconnected'
      this.isConnecting = false
      return
    }

    // Reset manual close flag to allow auto-reconnection
    this.isManualClose = false

    // Check existing connection state
    if (this.ws) {
      const state = this.ws.readyState

      // Already connected or connecting - skip
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
        logger.info('[GlobalChat] Already connected or connecting')
        return
      }

      // Connection is closing - wait for it to finish
      if (state === WebSocket.CLOSING) {
        logger.info('[GlobalChat] Connection is closing, please wait...')
        return
      }

      // Connection is closed - clean up
      if (state === WebSocket.CLOSED) {
        logger.info('[GlobalChat] Cleaning up old closed connection')
        this.ws = null
      }
    }

    const wsUrl = this.getWebSocketUrl()
    if (!wsUrl) {
      logger.error('[GlobalChat] Failed to construct WebSocket URL')
      this.connectionStatus.value = 'disconnected'
      this.isConnecting = false
      toast.error('Authentication required. Please login.')
      return
    }

    // Set connecting lock
    this.isConnecting = true

    this.connectionStatus.value = 'connecting'
    logger.info('[GlobalChat] Connecting to WebSocket...')

    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        this.connectionStatus.value = 'connected'
        this.reconnectAttempts = 0
        this.isConnecting = false // Release connection lock
        logger.info('[GlobalChat] ✅ WebSocket connected successfully')

        // Start heartbeat
        this.startHeartbeat()
      }

      this.ws.onmessage = event => {
        this.processWebSocketPayload(event.data)
      }

      this.ws.onerror = error => {
        logger.error('[GlobalChat] ❌ WebSocket error:', error)
        logger.error('[GlobalChat] WebSocket readyState:', this.ws?.readyState)
        this.connectionStatus.value = 'disconnected'
        this.isConnecting = false // Release connection lock on error
      }

      this.ws.onclose = event => {
        logger.info('[GlobalChat] 🔌 WebSocket closed:', {
          code: event.code,
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean
        })
        this.connectionStatus.value = 'disconnected'
        this.isConnecting = false // Release connection lock
        this.stopHeartbeat()

        // Check if connection closed due to authentication failure
        // Code 1008: Policy Violation (used for auth failures)
        // Code 1002: Protocol Error
        if (
          event.code === 1008 ||
          event.code === 1002 ||
          (event.reason && (event.reason.includes('Unauthorized') || event.reason.includes('401')))
        ) {
          logger.error('[GlobalChat] ❌ Authentication failed - token may be expired')
          toast.error('登录已过期，请重新登录')
          // Clear reconnection attempts to prevent auto-reconnect with invalid token
          this.reconnectAttempts = websocketConfig.maxReconnectAttempts
          return
        }

        // Check token validity before attempting reconnection
        const token = getStoredToken()
        if (!token || isTokenExpired(token)) {
          logger.error('[GlobalChat] ❌ Token expired or missing, stopping reconnection')
          this.reconnectAttempts = websocketConfig.maxReconnectAttempts
          return
        }

        // Attempt reconnection if not manually closed
        if (!this.isManualClose && this.reconnectAttempts < websocketConfig.maxReconnectAttempts) {
          const delay =
            websocketConfig.reconnectDelays[
              Math.min(this.reconnectAttempts, websocketConfig.reconnectDelays.length - 1)
            ]
          logger.info(
            `[GlobalChat] 🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${websocketConfig.maxReconnectAttempts})`
          )

          this.reconnectTimeout = window.setTimeout(() => {
            this.reconnectAttempts++
            this.connect()
          }, delay)
        } else if (this.reconnectAttempts >= websocketConfig.maxReconnectAttempts) {
          logger.error('[GlobalChat] ❌ Max reconnection attempts reached')
          toast.error('连接失败，请刷新页面')
        }
      }
    } catch (error) {
      logger.error('[GlobalChat] ❌ Failed to create WebSocket:', error)
      this.connectionStatus.value = 'disconnected'
      this.isConnecting = false // Release connection lock on exception
      toast.error('Failed to connect to chat server')
    }
  }

  public disconnect(): void {
    logger.info('[GlobalChat] Disconnecting...')
    this.isManualClose = true
    this.isConnecting = false // Release connection lock
    this.stopHeartbeat()

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.ws) {
      const state = this.ws.readyState
      // Only close if not already closed or closing
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
        logger.info('[GlobalChat] Closing WebSocket connection...')
        this.ws.close(1000, 'Client disconnect')
      }
      this.ws = null
    }

    this.connectionStatus.value = 'disconnected'
  }

  // Reset internal state only (does not disconnect WebSocket)
  // Use this only when you want to clear messages/counters without closing the connection
  // For full cleanup, call disconnect() first
  public reset(): void {
    logger.info('[GlobalChat] Resetting state...')
    this.messages.value = []
    this.onlineCount.value = 0
    this.reconnectAttempts = 0
    this.isManualClose = false
    this.isInitialized = false
    messageCache.clear()
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const heartbeatMsg: WSMessage = {
          type: 'heartbeat',
          data: {}
        }
        this.ws.send(JSON.stringify(heartbeatMsg))
        logger.debug('[GlobalChat] ❤️ Heartbeat sent')
      }
    }, websocketConfig.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private processWebSocketPayload(data: string | ArrayBuffer | Blob): void {
    if (typeof data === 'string') {
      this.processWebSocketTextMessage(data)
      return
    }

    if (data instanceof Blob) {
      data
        .text()
        .then(text => this.processWebSocketTextMessage(text))
        .catch(error => {
          logger.error('[GlobalChat] Failed to read Blob message from WebSocket:', error)
        })
      return
    }

    if (data instanceof ArrayBuffer) {
      const text = new TextDecoder('utf-8').decode(data)
      this.processWebSocketTextMessage(text)
      return
    }

    logger.warn('[GlobalChat] Received unsupported WebSocket message type', data)
  }

  private processWebSocketTextMessage(rawText: string): void {
    const fragments = rawText
      .split('\n')
      .map(fragment => fragment.trim())
      .filter(fragment => fragment.length > 0)

    for (const fragment of fragments) {
      try {
        const wsMsg: WSMessage = JSON.parse(fragment)
        this.dispatchWebSocketMessage(wsMsg)
      } catch (error) {
        logger.error('[GlobalChat] Failed to parse WebSocket message:', error, fragment)
      }
    }
  }

  private dispatchWebSocketMessage(wsMsg: WSMessage): void {
    switch (wsMsg.type) {
      case 'message': {
        // New chat message
        const message = wsMsg.data as ChatMessage
        this.messages.value.push(message)

        // Limit message list length
        if (this.messages.value.length > websocketConfig.maxMessages) {
          this.messages.value = this.messages.value.slice(-websocketConfig.maxMessages)
        }

        // Notify subscribers
        this.messageCallbacks.forEach(callback => callback(message))
        break
      }

      case 'online_count':
        // Online count update
        if (wsMsg.data && typeof wsMsg.data === 'object' && 'count' in wsMsg.data) {
          const countData = wsMsg.data as { count: number }
          this.onlineCount.value = countData.count

          // Notify subscribers
          this.onlineCountCallbacks.forEach(callback => callback(countData.count))
        }
        break

      case 'system':
        // System message
        logger.info('[GlobalChat] System message:', wsMsg.data)
        this.systemMessageCallbacks.forEach(callback => callback(wsMsg.data))
        break

      case 'notification':
        // Global notification
        logger.info('[GlobalChat] Notification:', wsMsg.data)
        if (wsMsg.data && typeof wsMsg.data === 'object' && 'message' in wsMsg.data) {
          const notifData = wsMsg.data as { message: string }
          toast.info(notifData.message)
        }
        break

      case 'private_message':
        // Private message notification
        logger.info('[GlobalChat] Private message received')
        // Trigger unread count refresh
        window.dispatchEvent(new Event('refresh-unread-count'))
        // Notify subscribers
        this.privateMessageCallbacks.forEach(callback => {
          try {
            callback(wsMsg.data)
          } catch (error) {
            logger.error('[GlobalChat] Error in private message callback:', error)
          }
        })
        break

      case 'message_read':
        // Message read notification
        logger.info('[GlobalChat] Message read notification')
        // Notify subscribers
        this.messageReadCallbacks.forEach(callback => {
          try {
            callback(wsMsg.data)
          } catch (error) {
            logger.error('[GlobalChat] Error in message read callback:', error)
          }
        })
        break

      case 'article_comment':
      case 'article_reply':
      case 'resource_comment':
      case 'resource_reply':
      case 'comment_deleted': {
        // Comment notifications (article and resource)
        logger.info('[GlobalChat] Comment notification received:', wsMsg.type)

        if (!wsMsg.data || typeof wsMsg.data !== 'object') {
          logger.warn('[GlobalChat] Invalid comment notification payload', wsMsg.data)
          break
        }

        const notification = wsMsg.data as CommentNotification

        // 确保 comment.replies 至少是空数组，避免前端判空
        if (notification.comment && !Array.isArray(notification.comment.replies)) {
          notification.comment.replies = notification.comment.replies
            ? [...notification.comment.replies]
            : []
        }

        this.commentCallbacks.forEach(callback => {
          try {
            callback(notification)
          } catch (error) {
            logger.error('[GlobalChat] Error in comment callback:', error)
          }
        })
        break
      }

      case 'new_article': {
        this.emitContentBroadcast<ArticleListItem>(
          this.articleBroadcastCallbacks,
          'created',
          wsMsg.data,
          ['article', 'data']
        )
        break
      }

      case 'new_resource': {
        this.emitContentBroadcast<ResourceListItem>(
          this.resourceBroadcastCallbacks,
          'created',
          wsMsg.data,
          ['resource', 'data']
        )
        break
      }

      default:
        logger.warn('[GlobalChat] Received unknown message type:', wsMsg.type)
    }
  }

  public async sendMessage(content: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected')
    }

    if (!content.trim()) {
      throw new Error('Message content cannot be empty')
    }

    const message: WSMessage = {
      type: 'message',
      data: {
        content: content.trim()
      }
    }

    try {
      this.ws.send(JSON.stringify(message))
      logger.debug('[GlobalChat] Message sent:', content.substring(0, 50))
    } catch (error) {
      logger.error('[GlobalChat] Failed to send message:', error)
      throw new Error('Failed to send message')
    }
  }

  // Subscription methods
  public onMessage(callback: MessageCallback): () => void {
    this.messageCallbacks.add(callback)
    return () => this.messageCallbacks.delete(callback)
  }

  public onOnlineCount(callback: OnlineCountCallback): () => void {
    this.onlineCountCallbacks.add(callback)
    return () => this.onlineCountCallbacks.delete(callback)
  }

  public onSystemMessage(callback: SystemMessageCallback): () => void {
    this.systemMessageCallbacks.add(callback)
    return () => this.systemMessageCallbacks.delete(callback)
  }

  public onPrivateMessage(callback: PrivateMessageCallback): () => void {
    this.privateMessageCallbacks.add(callback)
    return () => this.privateMessageCallbacks.delete(callback)
  }

  public onMessageRead(callback: MessageReadCallback): () => void {
    this.messageReadCallbacks.add(callback)
    return () => this.messageReadCallbacks.delete(callback)
  }

  public onComment(callback: CommentCallback): () => void {
    this.commentCallbacks.add(callback)
    return () => this.commentCallbacks.delete(callback)
  }

  public onArticleBroadcast(callback: ContentBroadcastCallback<ArticleListItem>): () => void {
    this.articleBroadcastCallbacks.add(callback)
    return () => this.articleBroadcastCallbacks.delete(callback)
  }

  public onResourceBroadcast(callback: ContentBroadcastCallback<ResourceListItem>): () => void {
    this.resourceBroadcastCallbacks.add(callback)
    return () => this.resourceBroadcastCallbacks.delete(callback)
  }

  /**
   * Get cache information
   */
  public getCacheInfo() {
    return messageCache.getInfo()
  }
}

// Export types for use in components
export type { CommentNotification, ContentBroadcastPayload }

// Export singleton instance
export const globalChatService = GlobalChatService.getInstance()
