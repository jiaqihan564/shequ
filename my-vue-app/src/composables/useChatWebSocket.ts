import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import { toast } from '@/utils/toast'

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
  type: 'message' | 'online_count' | 'heartbeat' | 'system'
  data: any
}

interface UseChatWebSocketReturn {
  messages: Ref<ChatMessage[]>
  onlineCount: Ref<number>
  connectionStatus: Ref<'connecting' | 'connected' | 'disconnected'>
  sendMessage: (content: string) => Promise<void>
}

const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 10000] // Exponential backoff

export function useChatWebSocket(): UseChatWebSocketReturn {
  const messages = ref<ChatMessage[]>([])
  const onlineCount = ref<number>(0)
  const connectionStatus = ref<'connecting' | 'connected' | 'disconnected'>('disconnected')

  let ws: WebSocket | null = null
  let reconnectAttempts = 0
  let reconnectTimeout: number | null = null
  let heartbeatInterval: number | null = null
  let isManualClose = false

  const getWebSocketUrl = (): string => {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
    if (!token) {
      console.error('No authentication token found')
      return ''
    }

    // Determine WebSocket protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    
    // Get base URL from environment or use current host
    let host = 'localhost:3001'  // Default to backend port 3001
    if (import.meta.env.VITE_API_BASE_URL) {
      // Remove protocol from base URL
      host = import.meta.env.VITE_API_BASE_URL
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '') // Remove trailing slash
    } else if (window.location.host) {
      // Use current host if no base URL is configured
      host = window.location.host
    }

    const wsUrl = `${protocol}//${host}/api/chat/ws?token=${encodeURIComponent(token)}`
    console.log('WebSocket URL:', wsUrl.replace(token, 'TOKEN_HIDDEN'))
    return wsUrl
  }

  const connect = () => {
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
      return
    }

    const wsUrl = getWebSocketUrl()
    if (!wsUrl) {
      console.error('Failed to construct WebSocket URL')
      connectionStatus.value = 'disconnected'
      toast.error('Authentication required. Please login.')
      return
    }

    connectionStatus.value = 'connecting'
    console.log('Connecting to WebSocket...')

    try {
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        connectionStatus.value = 'connected'
        reconnectAttempts = 0
        console.log('✅ WebSocket connected successfully')

        // Start heartbeat
        startHeartbeat()
      }

      ws.onmessage = (event) => {
        try {
          const wsMsg: WSMessage = JSON.parse(event.data)

          switch (wsMsg.type) {
            case 'message':
              // New chat message
              const message = wsMsg.data as ChatMessage
              messages.value.push(message)

              // Limit message list length
              if (messages.value.length > 200) {
                messages.value = messages.value.slice(-200)
              }
              break

            case 'online_count':
              // Online count update
              if (wsMsg.data && typeof wsMsg.data.count === 'number') {
                onlineCount.value = wsMsg.data.count
              }
              break

            case 'system':
              // System message
              console.log('System message:', wsMsg.data)
              break
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        console.error('WebSocket readyState:', ws?.readyState)
        connectionStatus.value = 'disconnected'
      }

      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', {
          code: event.code,
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean
        })
        connectionStatus.value = 'disconnected'
        stopHeartbeat()

        // Attempt reconnection if not manually closed
        if (!isManualClose && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAYS[Math.min(reconnectAttempts, RECONNECT_DELAYS.length - 1)]
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`)

          reconnectTimeout = window.setTimeout(() => {
            reconnectAttempts++
            connect()
          }, delay)
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.error('❌ Max reconnection attempts reached')
          toast.error('Connection failed. Please refresh the page.')
        }
      }
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error)
      connectionStatus.value = 'disconnected'
      toast.error('Failed to connect to chat server')
    }
  }

  const disconnect = () => {
    isManualClose = true
    stopHeartbeat()

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }

    if (ws) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Client disconnect')
      }
      ws = null
    }

    connectionStatus.value = 'disconnected'
  }

  const startHeartbeat = () => {
    stopHeartbeat()
    heartbeatInterval = window.setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        const heartbeatMsg: WSMessage = {
          type: 'heartbeat',
          data: {}
        }
        ws.send(JSON.stringify(heartbeatMsg))
      }
    }, 30000) // Send heartbeat every 30 seconds
  }

  const stopHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
  }

  const sendMessage = async (content: string): Promise<void> => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
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
      ws.send(JSON.stringify(message))
    } catch (error) {
      console.error('Failed to send message:', error)
      throw new Error('Failed to send message')
    }
  }

  onMounted(() => {
    isManualClose = false
    connect()
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    messages,
    onlineCount,
    connectionStatus,
    sendMessage
  }
}

