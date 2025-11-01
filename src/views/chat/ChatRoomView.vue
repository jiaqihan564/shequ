<template>
  <div class="chatroom-container">
    <!-- 顶部导航栏 -->
    <header class="chatroom-header">
      <button class="back-btn" @click="goBack">
        <span>←</span> 返回
      </button>
      <div class="header-center">
        <h2 class="title">💬 全局聊天室</h2>
        <p class="subtitle">实时弹幕聊天</p>
      </div>
      <div class="header-right">
        <div class="connection-status" :class="connectionStatus">
          <span class="status-dot"></span>
          <span class="status-text">
            {{ connectionStatus === 'connected' ? '已连接' : connectionStatus === 'connecting' ? '连接中' : '未连接' }}
          </span>
        </div>
        <div class="online-info">
          <span class="online-dot"></span>
          <span class="online-count">{{ onlineCount }}人在线</span>
        </div>
      </div>
    </header>

    <!-- 消息列表区域 -->
    <div ref="messagesContainer" class="messages-area">
      <div class="messages-wrapper">
        <!-- 无消息提示 -->
        <div v-if="messages.length === 0 && !loading" class="empty-hint">
          <div class="empty-icon">💭</div>
          <div class="empty-text">暂无消息，快来发送第一条消息吧！</div>
        </div>

        <!-- 消息列表 -->
        <div
          v-for="message in messages"
          :key="message.id"
          class="message-item"
          :class="{ 'own-message': isOwnMessage(message) }"
          @mouseenter="handleMessageHover(message, $event)"
          @mouseleave="handleMessageLeave"
        >
          <img :src="getAvatarUrl(message)" :alt="message.nickname || message.username" class="message-avatar" />
          <div class="message-content-wrapper">
            <div class="message-header">
              <span class="message-username">
                {{ message.nickname || message.username }}
              </span>
              <span class="message-time">{{ formatTime(message.send_time) }}</span>
            </div>
            <div class="message-content">{{ message.content }}</div>
          </div>
        </div>
      </div>

      <!-- 用户信息卡片悬浮显示 -->
      <div
        v-if="hoveredMessage"
        class="user-info-card"
        :style="cardPosition"
        @mouseenter="isCardHovered = true"
        @mouseleave="handleCardLeave"
      >
        <div class="card-header">
          <img :src="getAvatarUrl(hoveredMessage)" :alt="hoveredMessage.nickname || hoveredMessage.username" class="card-avatar" />
          <div class="card-user-info">
            <div class="card-nickname">{{ hoveredMessage.nickname || hoveredMessage.username }}</div>
            <div class="card-username">@{{ hoveredMessage.username }}</div>
          </div>
        </div>
        <div class="card-divider"></div>
        <div class="card-content">
          <div class="info-item">
            <span class="label">📅 发送时间</span>
            <span class="value">{{ formatFullTime(hoveredMessage.send_time) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部输入区域 -->
    <footer class="chatroom-footer">
      <div class="input-container">
        <input
          ref="messageInputRef"
          v-model="messageInput"
          type="text"
          class="message-input"
          placeholder="输入消息内容（最多500字）..."
          maxlength="500"
          @keyup.enter="sendMessage"
          :disabled="sending"
        />
        <div class="input-info">
          <span class="char-count">{{ messageInput.length }}/500</span>
        </div>
      </div>
      <button 
        class="send-btn"
        :class="{ disabled: !canSend }"
        :disabled="!canSend"
        @click="sendMessage"
      >
        <span v-if="!sending">发送</span>
        <span v-else>发送中...</span>
      </button>
    </footer>

    <LoadingSpinner v-if="loading" />
  </div>
</template>

<script lang="ts">
export default {
  name: 'ChatRoomView'
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'

import LoadingSpinner from '@/shared/ui/LoadingSpinner.vue'
import { globalChatService } from '@/services/globalChatService'
import { getChatMessages } from '@/utils/api'
import { toast } from '@/utils/toast'
import { STORAGE_KEYS } from '@/config/storage-keys'

const router = useRouter()

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

interface User {
  id: number
  username: string
  role?: string
  profile?: {
    nickname?: string
  }
}

const loading = ref(false)
const sending = ref(false)
const messageInput = ref('')
const messageInputRef = ref<HTMLInputElement>()
const messagesContainer = ref<HTMLElement>()
const currentUser = ref<User | null>(null)

// WebSocket integration - use global service
const messages = globalChatService.messages
const onlineCount = globalChatService.onlineCount
const connectionStatus = globalChatService.connectionStatus

const lastMessageId = ref(0)

// 用户信息卡片相关
const hoveredMessage = ref<ChatMessage | null>(null)
const cardPosition = ref({ top: '0px', left: '0px' })
const isCardHovered = ref(false)
let hoverTimeout: number | null = null

const canSend = computed(() => {
  return messageInput.value.trim().length > 0 && !sending.value && connectionStatus.value === 'connected'
})

// 判断是否是自己的消息
const isOwnMessage = (message: ChatMessage): boolean => {
  return currentUser.value ? message.user_id === currentUser.value.id : false
}

// 获取头像URL
const getAvatarUrl = (message: ChatMessage): string => {
  if (message.avatar) {
    return message.avatar.startsWith('http') 
      ? message.avatar 
      : `http://localhost:8080${message.avatar}`
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(message.nickname || message.username)}&background=6366f1&color=fff&size=128`
}

// 格式化时间（简短）
const formatTime = (timeStr: string): string => {
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) { // 1分钟内
    return '刚刚'
  } else if (diff < 3600000) { // 1小时内
    return `${Math.floor(diff / 60000)}分钟前`
  } else if (diff < 86400000) { // 24小时内
    return `${Math.floor(diff / 3600000)}小时前`
  } else {
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

// 格式化时间（完整）
const formatFullTime = (timeStr: string): string => {
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 处理消息悬停
const handleMessageHover = (message: ChatMessage, event: MouseEvent) => {
  if (hoverTimeout) {
    clearTimeout(hoverTimeout)
  }
  
  hoverTimeout = window.setTimeout(() => {
    hoveredMessage.value = message
    
    // 调试：打印消息信息
    console.log('悬停消息信息:', {
      id: message.id,
      user_id: message.user_id,
      username: message.username,
      nickname: message.nickname,
      content: message.content
    })
    
    const target = event.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    
    // 判断是否是自己的消息，自己的消息卡片显示在左侧
    const isOwn = isOwnMessage(message)
    
    if (isOwn) {
      // 自己的消息，卡片显示在左侧
      cardPosition.value = {
        top: `${rect.top + window.scrollY}px`,
        left: `${rect.left - 320 - 16}px` // 320是卡片宽度
      }
    } else {
      // 他人的消息，卡片显示在右侧
      cardPosition.value = {
        top: `${rect.top + window.scrollY}px`,
        left: `${rect.right + 16}px`
      }
    }
  }, 300) // 延迟300ms显示
}

// 处理消息离开
const handleMessageLeave = () => {
  if (hoverTimeout) {
    clearTimeout(hoverTimeout)
    hoverTimeout = null
  }
  
  setTimeout(() => {
    if (!isCardHovered.value) {
      hoveredMessage.value = null
    }
  }, 200)
}

// 处理卡片离开
const handleCardLeave = () => {
  isCardHovered.value = false
  hoveredMessage.value = null
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 发送消息 (via WebSocket)
const sendMessage = async () => {
  if (!canSend.value) return
  
  const content = messageInput.value.trim()
  if (content.length === 0) return
  
  sending.value = true
  try {
    await globalChatService.sendMessage(content)
    messageInput.value = ''
    // WebSocket will broadcast the message back
  } catch (error: any) {
    toast.error(error?.message || 'Failed to send message')
  } finally {
    sending.value = false
    // Refocus on input
    nextTick(() => {
      setTimeout(() => {
        messageInputRef.value?.focus()
      }, 100)
    })
  }
}

// 加载初始消息（历史消息，WebSocket 连接后会接收新消息）
const loadInitialMessages = async () => {
  // 如果全局服务已经加载过历史消息，不重复加载
  if (globalChatService.isHistoryLoaded()) {
    console.log('[ChatRoom] Using existing messages from global service')
    scrollToBottom()
    return
  }

  loading.value = true
  try {
    const result = await getChatMessages(100)
    const msgs = result.messages || []
    
    // 填充到 WebSocket 消息列表
    messages.value.push(...msgs)
    
    // 标记历史消息已加载
    globalChatService.markHistoryLoaded()
    
    // 更新 lastMessageId
    if (msgs.length > 0) {
      lastMessageId.value = msgs[msgs.length - 1].id
    }
    
    // 滚动到底部
    scrollToBottom()
  } catch (error: any) {
    toast.error(error?.message || 'Failed to load messages')
  } finally {
    loading.value = false
  }
}

// Auto-scroll when new messages arrive
watch(() => messages.value.length, () => {
  nextTick(() => {
    scrollToBottom()
  })
})

// 返回
const goBack = () => {
  router.back()
}

onMounted(() => {
  // 加载当前用户信息
  try {
    const userInfo = localStorage.getItem(STORAGE_KEYS.USER_INFO) || sessionStorage.getItem(STORAGE_KEYS.USER_INFO)
    if (userInfo) {
      currentUser.value = JSON.parse(userInfo)
    }
  } catch (error) {
    console.error('Failed to get user info:', error)
  }

  // 加载历史消息
  loadInitialMessages()

  // 自动聚焦到输入框
  nextTick(() => {
    setTimeout(() => {
      messageInputRef.value?.focus()
    }, 100)
  })
})

onBeforeUnmount(() => {
  // 清理悬停定时器
  if (hoverTimeout) {
    clearTimeout(hoverTimeout)
    hoverTimeout = null
  }
  
  // Note: 不需要清理 globalChatService 的订阅，因为组件直接使用响应式引用
  // 如果将来使用订阅方法，请在此处清理：
  // if (unsubscribe) {
  //   unsubscribe()
  // }
})
</script>

<style scoped>
.chatroom-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
  position: relative;
  overflow: hidden;
}

/* 添加动态背景效果 */
.chatroom-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.12) 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 50%);
  animation: backgroundShift 15s ease-in-out infinite;
  pointer-events: none;
}

@keyframes backgroundShift {
  0%, 100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1) rotate(2deg);
  }
}

.chatroom-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 32px;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
  z-index: 100;
  position: relative;
}

/* 头部装饰线 */
.chatroom-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(99, 102, 241, 0.5) 25%, 
    rgba(139, 92, 246, 0.5) 75%, 
    transparent 100%);
}

.back-btn {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  padding: 10px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.back-btn span {
  font-size: 18px;
  transition: transform 0.3s ease;
}

.back-btn:hover {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.35) 0%, rgba(139, 92, 246, 0.35) 100%);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateX(-4px);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
}

.back-btn:hover span {
  transform: translateX(-2px);
}

.header-center {
  text-align: center;
  flex: 1;
}

.title {
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 6px 0;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 10px rgba(99, 102, 241, 0.3);
}

.subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  font-weight: 500;
  letter-spacing: 1px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.connection-status.connected {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%);
  border: 1px solid rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.connection-status.connecting {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%);
  border: 1px solid rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

.connection-status.disconnected {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.connection-status.connected .status-dot {
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

.connection-status.connecting .status-dot {
  background: #fbbf24;
  box-shadow: 0 0 8px #fbbf24;
}

.connection-status.disconnected .status-dot {
  background: #ef4444;
  box-shadow: 0 0 8px #ef4444;
}

.status-text {
  font-size: 12px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.online-info {
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%);
  padding: 10px 18px;
  border-radius: 24px;
  border: 1px solid rgba(16, 185, 129, 0.2);
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
  transition: all 0.3s ease;
}

.online-info:hover {
  transform: scale(1.05);
  box-shadow: 0 0 30px rgba(16, 185, 129, 0.25);
}

.online-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 10px #10b981, 0 0 20px rgba(16, 185, 129, 0.5);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
    box-shadow: 0 0 10px #10b981, 0 0 20px rgba(16, 185, 129, 0.5);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.3);
    box-shadow: 0 0 15px #10b981, 0 0 30px rgba(16, 185, 129, 0.7);
  }
}

.online-count {
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* 消息区域 */
.messages-area {
  flex: 1;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px 32px;
}

/* 自定义滚动条 */
.messages-area::-webkit-scrollbar {
  width: 8px;
}

.messages-area::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.messages-area::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.4);
  border-radius: 4px;
  transition: background 0.3s;
}

.messages-area::-webkit-scrollbar-thumb:hover {
  background: rgba(99, 102, 241, 0.6);
}

.messages-wrapper {
  max-width: 1200px;
  margin: 0 auto;
}

.empty-hint {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  padding: 80px 40px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
}

.empty-icon {
  font-size: 80px;
  margin-bottom: 20px;
  animation: float 3s ease-in-out infinite;
  filter: drop-shadow(0 4px 12px rgba(99, 102, 241, 0.3));
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-15px);
  }
}

.empty-text {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0.5px;
}

/* 消息项 */
.message-item {
  display: flex;
  gap: 16px;
  padding: 16px 20px;
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.message-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(99, 102, 241, 0.3);
  transform: translateX(4px);
  box-shadow: 
    0 4px 16px rgba(99, 102, 241, 0.15),
    0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 自己的消息 - 特殊样式 */
.message-item.own-message {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
  border: 1px solid rgba(99, 102, 241, 0.25);
  flex-direction: row-reverse;
}

.message-item.own-message:hover {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
  border-color: rgba(99, 102, 241, 0.4);
  transform: translateX(-4px);
  box-shadow: 
    0 4px 16px rgba(99, 102, 241, 0.25),
    0 2px 8px rgba(139, 92, 246, 0.15);
}

/* 自己消息的header右对齐 */
.message-item.own-message .message-header {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid rgba(99, 102, 241, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.message-item:hover .message-avatar {
  border-color: rgba(99, 102, 241, 0.6);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

/* 自己的消息头像边框 */
.message-item.own-message .message-avatar {
  border: 3px solid transparent;
  background: linear-gradient(white, white) padding-box,
              linear-gradient(135deg, #6366f1, #8b5cf6) border-box;
  box-shadow: 
    0 4px 12px rgba(99, 102, 241, 0.3),
    0 2px 6px rgba(0, 0, 0, 0.2);
}

.message-item.own-message:hover .message-avatar {
  transform: scale(1.08);
  box-shadow: 
    0 6px 18px rgba(99, 102, 241, 0.4),
    0 3px 9px rgba(139, 92, 246, 0.3);
}

.message-content-wrapper {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 12px;
}

.message-username {
  font-size: 15px;
  font-weight: 700;
  background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 0.3px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.message-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 600;
  flex-shrink: 0;
  white-space: nowrap;
}

.message-content {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  font-weight: 500;
}

/* 自己的消息内容样式 */
.message-item.own-message .message-content {
  color: rgba(255, 255, 255, 0.95);
  font-weight: 600;
}

/* 用户信息卡片 */
.user-info-card {
  position: fixed;
  width: 320px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.25),
    0 6px 20px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(99, 102, 241, 0.15);
  z-index: 10000;
  animation: cardFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  pointer-events: auto;
}

/* 卡片顶部装饰 */
.user-info-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%);
  background-size: 200% 100%;
  animation: shimmer 3s linear infinite;
}

@keyframes shimmer {
  0% {
    background-position: 0% 0%;
  }
  100% {
    background-position: 200% 0%;
  }
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.card-header {
  display: flex;
  align-items: center;
  padding: 20px;
  gap: 14px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
}

.card-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid transparent;
  background: linear-gradient(white, white) padding-box,
              linear-gradient(135deg, #6366f1, #8b5cf6) border-box;
  flex-shrink: 0;
  box-shadow: 
    0 4px 12px rgba(99, 102, 241, 0.2),
    0 2px 6px rgba(0, 0, 0, 0.1);
}

.card-user-info {
  flex: 1;
  min-width: 0;
}

.card-nickname {
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0.3px;
}

.card-username {
  font-size: 13px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.card-divider {
  height: 1px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(99, 102, 241, 0.15) 25%, 
    rgba(139, 92, 246, 0.15) 75%, 
    transparent 100%);
}

.card-content {
  padding: 16px 20px 20px;
  background: white;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.04) 0%, rgba(139, 92, 246, 0.04) 100%);
  border-radius: 10px;
  border: 1px solid rgba(99, 102, 241, 0.08);
  transition: all 0.2s ease;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-item:hover {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%);
  border-color: rgba(99, 102, 241, 0.15);
  transform: translateX(3px);
}

.label {
  color: #64748b;
  font-weight: 600;
}

.value {
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: #6366f1;
  display: inline-block;
}

/* 底部输入区域 */
.chatroom-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 32px 28px;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.12);
  z-index: 100;
  position: relative;
}

/* 底部装饰线 */
.chatroom-footer::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(99, 102, 241, 0.4) 25%, 
    rgba(139, 92, 246, 0.4) 75%, 
    transparent 100%);
}

.input-container {
  flex: 1;
  position: relative;
}

.message-input {
  width: 100%;
  padding: 16px 24px;
  border: 2px solid rgba(99, 102, 241, 0.2);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  font-size: 15px;
  color: #1e293b;
  outline: none;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.08),
    inset 0 1px 2px rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.message-input:focus {
  border-color: rgba(99, 102, 241, 0.6);
  background: #ffffff;
  box-shadow: 
    0 8px 24px rgba(99, 102, 241, 0.15),
    0 0 0 4px rgba(99, 102, 241, 0.1),
    inset 0 1px 2px rgba(255, 255, 255, 0.8);
  transform: translateY(-1px);
}

.message-input::placeholder {
  color: #94a3b8;
  font-weight: 500;
}

.message-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.input-info {
  position: absolute;
  right: 20px;
  bottom: -22px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
}

.char-count {
  font-weight: 700;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.8) 0%, rgba(139, 92, 246, 0.8) 100%);
  padding: 2px 8px;
  border-radius: 6px;
}

.send-btn {
  padding: 16px 40px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 4px 16px rgba(99, 102, 241, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
  letter-spacing: 0.5px;
  position: relative;
  overflow: hidden;
}

/* 按钮光泽效果 */
.send-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.6s ease;
}

.send-btn:hover:not(.disabled)::before {
  left: 100%;
}

.send-btn:hover:not(.disabled) {
  background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
  transform: translateY(-3px) scale(1.02);
  box-shadow: 
    0 8px 24px rgba(99, 102, 241, 0.5),
    0 4px 12px rgba(0, 0, 0, 0.3),
    0 0 0 4px rgba(139, 92, 246, 0.2);
}

.send-btn:active:not(.disabled) {
  transform: translateY(-1px) scale(0.98);
  box-shadow: 
    0 4px 12px rgba(99, 102, 241, 0.4),
    0 2px 6px rgba(0, 0, 0, 0.2);
}

.send-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>

