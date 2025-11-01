import { ref, type Ref } from 'vue'
import { toast } from '@/utils/toast'
import { getStoredToken, isTokenExpired } from '@/utils/tokenValidator'

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

interface WSMessage {
  type: 'message' | 'online_count' | 'heartbeat' | 'system' | 'notification' | 'private_message'
  data: any
}

type MessageCallback = (message: ChatMessage) => void
type OnlineCountCallback = (count: number) => void
type SystemMessageCallback = (data: any) => void

const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 10000] // Exponential backoff
const MAX_MESSAGES = 200

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
  private hasLoadedHistory = false // Track if history messages have been loaded

  // Subscription callbacks
  private messageCallbacks: Set<MessageCallback> = new Set()
  private onlineCountCallbacks: Set<OnlineCountCallback> = new Set()
  private systemMessageCallbacks: Set<SystemMessageCallback> = new Set()

  private constructor() {
    console.log('[GlobalChat] Service initialized')
  }

  public static getInstance(): GlobalChatService {
    if (!GlobalChatService.instance) {
      GlobalChatService.instance = new GlobalChatService()
    }
    return GlobalChatService.instance
  }

  private getWebSocketUrl(): string {
    const token = getStoredToken()
    if (!token) {
      console.error('[GlobalChat] No authentication token found')
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
      console.log('[GlobalChat] Using Vite proxy for WebSocket')
    } else {
      // Production: construct full URL from environment variable
      let host = window.location.host // Default to current host
      if (import.meta.env.VITE_API_BASE_URL) {
        // Remove protocol and /api suffix from base URL
        host = import.meta.env.VITE_API_BASE_URL
          .replace(/^https?:\/\//, '')
          .replace(/\/api$/, '')
      }
      wsUrl = `${protocol}//${host}/api/chat/ws?token=${encodeURIComponent(token)}`
    }

    console.log('[GlobalChat] WebSocket URL:', wsUrl.replace(token, 'TOKEN_HIDDEN'))
    return wsUrl
  }

  public connect(): void {
    // Prevent concurrent connection attempts
    if (this.isConnecting) {
      console.log('[GlobalChat] Connection already in progress, skipping')
      return
    }

    // Check token validity before attempting connection
    const token = getStoredToken()
    if (!token || isTokenExpired(token)) {
      console.error('[GlobalChat] Invalid or expired token, cannot connect')
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
        console.log('[GlobalChat] Already connected or connecting')
        return
      }
      
      // Connection is closing - wait for it to finish
      if (state === WebSocket.CLOSING) {
        console.log('[GlobalChat] Connection is closing, please wait...')
        return
      }
      
      // Connection is closed - clean up
      if (state === WebSocket.CLOSED) {
        console.log('[GlobalChat] Cleaning up old closed connection')
        this.ws = null
      }
    }

    const wsUrl = this.getWebSocketUrl()
    if (!wsUrl) {
      console.error('[GlobalChat] Failed to construct WebSocket URL')
      this.connectionStatus.value = 'disconnected'
      this.isConnecting = false
      toast.error('Authentication required. Please login.')
      return
    }

    // Set connecting lock
    this.isConnecting = true

    this.connectionStatus.value = 'connecting'
    console.log('[GlobalChat] Connecting to WebSocket...')

    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        this.connectionStatus.value = 'connected'
        this.reconnectAttempts = 0
        this.isConnecting = false // Release connection lock
        console.log('[GlobalChat] ✅ WebSocket connected successfully')

        // Start heartbeat
        this.startHeartbeat()
      }

      this.ws.onmessage = (event) => {
        try {
          const wsMsg: WSMessage = JSON.parse(event.data)

          switch (wsMsg.type) {
            case 'message':
              // New chat message
              const message = wsMsg.data as ChatMessage
              this.messages.value.push(message)

              // Limit message list length
              if (this.messages.value.length > MAX_MESSAGES) {
                this.messages.value = this.messages.value.slice(-MAX_MESSAGES)
              }

              // Notify subscribers
              this.messageCallbacks.forEach(callback => callback(message))
              break

            case 'online_count':
              // Online count update
              if (wsMsg.data && typeof wsMsg.data.count === 'number') {
                this.onlineCount.value = wsMsg.data.count

                // Notify subscribers
                this.onlineCountCallbacks.forEach(callback => callback(wsMsg.data.count))
              }
              break

            case 'system':
              // System message
              console.log('[GlobalChat] System message:', wsMsg.data)
              this.systemMessageCallbacks.forEach(callback => callback(wsMsg.data))
              break

            case 'notification':
              // Global notification
              console.log('[GlobalChat] Notification:', wsMsg.data)
              if (wsMsg.data?.message) {
                toast.info(wsMsg.data.message)
              }
              break

            case 'private_message':
              // Private message notification
              console.log('[GlobalChat] Private message notification:', wsMsg.data)
              // Trigger unread count refresh
              window.dispatchEvent(new Event('refresh-unread-count'))
              if (wsMsg.data?.message) {
                toast.info(wsMsg.data.message)
              }
              break
          }
        } catch (error) {
          console.error('[GlobalChat] Failed to parse WebSocket message:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('[GlobalChat] ❌ WebSocket error:', error)
        console.error('[GlobalChat] WebSocket readyState:', this.ws?.readyState)
        this.connectionStatus.value = 'disconnected'
        this.isConnecting = false // Release connection lock on error
      }

      this.ws.onclose = (event) => {
        console.log('[GlobalChat] 🔌 WebSocket closed:', {
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
        if (event.code === 1008 || event.code === 1002 || 
            (event.reason && (event.reason.includes('Unauthorized') || event.reason.includes('401')))) {
          console.error('[GlobalChat] ❌ Authentication failed - token may be expired')
          toast.error('登录已过期，请重新登录')
          // Clear reconnection attempts to prevent auto-reconnect with invalid token
          this.reconnectAttempts = MAX_RECONNECT_ATTEMPTS
          return
        }

        // Check token validity before attempting reconnection
        const token = getStoredToken()
        if (!token || isTokenExpired(token)) {
          console.error('[GlobalChat] ❌ Token expired or missing, stopping reconnection')
          this.reconnectAttempts = MAX_RECONNECT_ATTEMPTS
          return
        }

        // Attempt reconnection if not manually closed
        if (!this.isManualClose && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAYS[Math.min(this.reconnectAttempts, RECONNECT_DELAYS.length - 1)]
          console.log(`[GlobalChat] 🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`)

          this.reconnectTimeout = window.setTimeout(() => {
            this.reconnectAttempts++
            this.connect()
          }, delay)
        } else if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.error('[GlobalChat] ❌ Max reconnection attempts reached')
          toast.error('连接失败，请刷新页面')
        }
      }
    } catch (error) {
      console.error('[GlobalChat] ❌ Failed to create WebSocket:', error)
      this.connectionStatus.value = 'disconnected'
      this.isConnecting = false // Release connection lock on exception
      toast.error('Failed to connect to chat server')
    }
  }

  public disconnect(): void {
    console.log('[GlobalChat] Disconnecting...')
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
        console.log('[GlobalChat] Closing WebSocket connection...')
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
    console.log('[GlobalChat] Resetting state...')
    this.messages.value = []
    this.onlineCount.value = 0
    this.reconnectAttempts = 0
    this.isManualClose = false
    this.hasLoadedHistory = false
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
        console.log('[GlobalChat] ❤️ Heartbeat sent')
      }
    }, 30000) // Send heartbeat every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
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
      console.log('[GlobalChat] Message sent:', content.substring(0, 50))
    } catch (error) {
      console.error('[GlobalChat] Failed to send message:', error)
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

  // History management
  public markHistoryLoaded(): void {
    this.hasLoadedHistory = true
    console.log('[GlobalChat] History messages marked as loaded')
  }

  public isHistoryLoaded(): boolean {
    return this.hasLoadedHistory
  }
}

// Export singleton instance
export const globalChatService = GlobalChatService.getInstance()

