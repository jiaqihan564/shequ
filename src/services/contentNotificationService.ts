/**
 * 内容通知服务 - 用于实时接收新文章、新资源和新代码的WebSocket通知
 */

import { getStoredToken } from '@/utils/tokenValidator'

// WebSocket消息类型
export type WSMessageType =
  | 'new_article'
  | 'new_resource'
  | 'new_code'
  | 'article_comment'
  | 'resource_comment'
  | 'heartbeat'
  | 'online_count'

// WebSocket消息结构
export interface WSMessage {
  type: WSMessageType
  data: any
}

// 事件处理器类型
export type EventHandler = (data: any) => void

class ContentNotificationService {
  private ws: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 3000 // 初始重连延迟（毫秒）
  private maxReconnectDelay = 30000 // 最大重连延迟（毫秒）
  private isManualClose = false
  private eventHandlers: Map<WSMessageType, Set<EventHandler>> = new Map()

  // WebSocket服务器地址（根据环境自动选择）
  private getWsUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = import.meta.env.VITE_API_BASE_URL
      ? new URL(import.meta.env.VITE_API_BASE_URL).host
      : window.location.host.replace(':5173', ':8080')
    return `${protocol}//${host}/api/ws`
  }

  /**
   * 连接到WebSocket服务器
   */
  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WS] 已经连接')
      return
    }

    const token = getStoredToken()
    if (!token) {
      console.warn('[WS] 未登录，无法建立WebSocket连接')
      return
    }

    try {
      const wsUrl = this.getWsUrl()
      console.log('[WS] 正在连接到:', wsUrl)
      
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log('[WS] 连接已建立')
        this.reconnectAttempts = 0
        this.reconnectDelay = 3000
        this.startHeartbeat()
      }

      this.ws.onmessage = (event) => {
        try {
          const messages = event.data.split('\n').filter((msg: string) => msg.trim())
          
          for (const msgStr of messages) {
            const message: WSMessage = JSON.parse(msgStr)
            this.handleMessage(message)
          }
        } catch (error) {
          console.error('[WS] 解析消息失败:', error, event.data)
        }
      }

      this.ws.onerror = (error) => {
        console.error('[WS] 连接错误:', error)
      }

      this.ws.onclose = (event) => {
        console.log('[WS] 连接已关闭', event.code, event.reason)
        this.stopHeartbeat()

        // 如果不是手动关闭，则尝试重连
        if (!this.isManualClose) {
          this.scheduleReconnect()
        }
      }
    } catch (error) {
      console.error('[WS] 创建连接失败:', error)
      this.scheduleReconnect()
    }
  }

  /**
   * 断开WebSocket连接
   */
  disconnect() {
    this.isManualClose = true
    this.stopHeartbeat()
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }

    console.log('[WS] 已手动断开连接')
  }

  /**
   * 发送心跳包
   */
  private startHeartbeat() {
    this.stopHeartbeat()
    
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send('heartbeat', { timestamp: Date.now() })
      }
    }, 30000) // 每30秒发送一次心跳
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WS] 达到最大重连次数，停止重连')
      return
    }

    if (this.reconnectTimer) {
      return
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts),
      this.maxReconnectDelay
    )

    console.log(`[WS] 将在 ${delay}ms 后尝试重连（第 ${this.reconnectAttempts + 1} 次）`)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.reconnectAttempts++
      this.isManualClose = false
      this.connect()
    }, delay)
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(message: WSMessage) {
    console.log('[WS] 收到消息:', message.type, message.data)

    // 触发对应类型的所有事件处理器
    const handlers = this.eventHandlers.get(message.type)
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message.data)
        } catch (error) {
          console.error('[WS] 事件处理器执行失败:', error)
        }
      })
    }
  }

  /**
   * 发送消息
   */
  private send(type: string, data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type, data }))
      } catch (error) {
        console.error('[WS] 发送消息失败:', error)
      }
    }
  }

  /**
   * 监听特定类型的消息
   */
  on(type: WSMessageType, handler: EventHandler) {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, new Set())
    }
    this.eventHandlers.get(type)!.add(handler)

    // 返回取消订阅的函数
    return () => {
      this.off(type, handler)
    }
  }

  /**
   * 取消监听特定类型的消息
   */
  off(type: WSMessageType, handler: EventHandler) {
    const handlers = this.eventHandlers.get(type)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  /**
   * 清除所有事件监听器
   */
  clearAllHandlers() {
    this.eventHandlers.clear()
  }

  /**
   * 获取当前连接状态
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * 获取连接状态字符串
   */
  get connectionState(): string {
    if (!this.ws) return 'DISCONNECTED'
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING'
      case WebSocket.OPEN:
        return 'OPEN'
      case WebSocket.CLOSING:
        return 'CLOSING'
      case WebSocket.CLOSED:
        return 'CLOSED'
      default:
        return 'UNKNOWN'
    }
  }
}

// 导出单例实例
export const contentNotificationService = new ContentNotificationService()

// 在用户登录时自动连接
export function initContentNotification() {
  contentNotificationService.connect()
}

// 在用户登出时自动断开
export function destroyContentNotification() {
  contentNotificationService.disconnect()
  contentNotificationService.clearAllHandlers()
}

