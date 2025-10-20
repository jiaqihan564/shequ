/**
 * WebSocket 工具类
 * 用于聊天室实时通信，替代轮询机制
 * 
 * 特性：
 * - 自动重连
 * - 心跳检测
 * - 消息队列
 * - 事件订阅
 */

import { ref, onBeforeUnmount } from 'vue'

// ChatMessage 类型定义（如果 @/types 中没有，在这里定义）
interface ChatMessage {
  id: number
  user_id: number
  username: string
  nickname?: string
  avatar?: string
  content: string
  message_type: number
  send_time: string
  status: number
  created_at: string
}

type MessageType = 'message' | 'online_count' | 'system'

interface WebSocketMessage {
  type: MessageType
  data: any
}

interface WebSocketOptions {
  url: string
  reconnectInterval?: number // 重连间隔（毫秒）
  maxReconnectAttempts?: number // 最大重连次数
  heartbeatInterval?: number // 心跳间隔（毫秒）
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: Event) => void
  onMessage?: (message: WebSocketMessage) => void
}

export class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private reconnectInterval: number
  private maxReconnectAttempts: number
  private reconnectAttempts = 0
  private heartbeatInterval: number
  private heartbeatTimer: number | null = null
  private isManualClose = false
  private messageQueue: string[] = []
  private eventHandlers: Map<string, Set<(data: any) => void>> = new Map()
  
  private options: WebSocketOptions

  constructor(options: WebSocketOptions) {
    this.options = options
    this.url = options.url
    this.reconnectInterval = options.reconnectInterval || 3000
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10
    this.heartbeatInterval = options.heartbeatInterval || 30000
  }

  /**
   * 连接WebSocket
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.warn('WebSocket已连接')
      return
    }

    try {
      console.log('正在连接WebSocket...', this.url)
      this.ws = new WebSocket(this.url)

      this.ws.onopen = this.handleOpen.bind(this)
      this.ws.onclose = this.handleClose.bind(this)
      this.ws.onerror = this.handleError.bind(this)
      this.ws.onmessage = this.handleMessage.bind(this)
    } catch (error) {
      console.error('WebSocket连接失败:', error)
      this.reconnect()
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.isManualClose = true
    this.stopHeartbeat()
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * 发送消息
   */
  send(data: any): void {
    const message = typeof data === 'string' ? data : JSON.stringify(data)

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message)
    } else {
      // 连接未就绪，加入队列
      this.messageQueue.push(message)
      console.warn('WebSocket未连接，消息已加入队列')
    }
  }

  /**
   * 订阅事件
   */
  on(eventType: string, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set())
    }
    this.eventHandlers.get(eventType)!.add(handler)
  }

  /**
   * 取消订阅
   */
  off(eventType: string, handler: (data: any) => void): void {
    const handlers = this.eventHandlers.get(eventType)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  /**
   * 触发事件
   */
  private emit(eventType: string, data: any): void {
    const handlers = this.eventHandlers.get(eventType)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error('事件处理器错误:', error)
        }
      })
    }
  }

  /**
   * 处理连接打开
   */
  private handleOpen(): void {
    console.log('WebSocket已连接')
    this.reconnectAttempts = 0
    this.startHeartbeat()

    // 发送队列中的消息
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      if (message) {
        this.ws?.send(message)
      }
    }

    this.options.onOpen?.()
    this.emit('open', null)
  }

  /**
   * 处理连接关闭
   */
  private handleClose(event: CloseEvent): void {
    console.log('WebSocket已断开', event.code, event.reason)
    this.stopHeartbeat()

    this.options.onClose?.()
    this.emit('close', event)

    // 如果不是手动关闭，尝试重连
    if (!this.isManualClose) {
      this.reconnect()
    }
  }

  /**
   * 处理错误
   */
  private handleError(error: Event): void {
    console.error('WebSocket错误:', error)
    this.options.onError?.(error)
    this.emit('error', error)
  }

  /**
   * 处理接收消息
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)
      
      // 触发通用消息处理器
      this.options.onMessage?.(message)
      
      // 触发特定类型的事件
      this.emit(message.type, message.data)
      this.emit('message', message)
    } catch (error) {
      console.error('解析WebSocket消息失败:', error)
    }
  }

  /**
   * 重连
   */
  private reconnect(): void {
    if (this.isManualClose) {
      return
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('WebSocket重连失败：已达最大重连次数')
      this.emit('reconnect_failed', this.reconnectAttempts)
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(
      this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1),
      30000 // 最大30秒
    )

    console.log(`WebSocket将在 ${delay}ms 后重连（第${this.reconnectAttempts}次）`)
    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay })

    setTimeout(() => {
      this.connect()
    }, delay)
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat()
    
    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' })
      }
    }, this.heartbeatInterval)
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /**
   * 获取连接状态
   */
  getReadyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

/**
 * 创建聊天室WebSocket连接
 */
export function createChatWebSocket(token: string): WebSocketClient {
  // 获取WebSocket URL
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.hostname
  const port = import.meta.env.DEV ? '3001' : window.location.port
  const wsUrl = `${protocol}//${host}:${port}/api/chat/ws?token=${token}`

  const ws = new WebSocketClient({
    url: wsUrl,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
    
    onOpen: () => {
      console.log('聊天室WebSocket已连接')
    },
    
    onClose: () => {
      console.log('聊天室WebSocket已断开')
    },
    
    onError: (error) => {
      console.error('聊天室WebSocket错误:', error)
    }
  })

  return ws
}

/**
 * Vue Composable: 使用WebSocket
 */
export function useWebSocket(token: string) {
  const ws = ref<WebSocketClient | null>(null)
  const messages = ref<ChatMessage[]>([])
  const onlineCount = ref(0)
  const isConnected = ref(false)
  const isReconnecting = ref(false)

  // 连接WebSocket
  const connect = () => {
    if (ws.value) {
      ws.value.disconnect()
    }

    const client = createChatWebSocket(token)
    ws.value = client

    // 监听连接事件
    client.on('open', () => {
      isConnected.value = true
      isReconnecting.value = false
    })

    client.on('close', () => {
      isConnected.value = false
    })

    client.on('reconnecting', () => {
      isReconnecting.value = true
    })

    // 监听消息
    client.on('message', (data: ChatMessage) => {
      messages.value.push(data)
    })

    // 监听在线用户数
    client.on('online_count', (data: { count: number }) => {
      onlineCount.value = data.count
    })

    client.connect()
  }

  // 发送消息
  const sendMessage = (content: string) => {
    if (ws.value?.isConnected()) {
      ws.value.send({
        content
      })
    } else {
      console.error('WebSocket未连接')
      throw new Error('WebSocket未连接')
    }
  }

  // 断开连接
  const disconnect = () => {
    ws.value?.disconnect()
    ws.value = null
    isConnected.value = false
  }

  // 组件卸载时自动断开
  onBeforeUnmount(() => {
    disconnect()
  })

  return {
    connect,
    disconnect,
    sendMessage,
    messages,
    onlineCount,
    isConnected,
    isReconnecting
  }
}

export default WebSocketClient

