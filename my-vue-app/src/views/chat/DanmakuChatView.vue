<template>
  <div class="danmaku-chatroom-container">
    <!-- 顶部导航栏 -->
    <header class="chatroom-header">
      <button class="back-btn" @click="goBack">
        <span>←</span> 返回
      </button>
      <div class="header-center">
        <h2 class="title">💬 弹幕聊天室</h2>
        <p class="subtitle">实时弹幕效果</p>
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

    <!-- 弹幕显示区域 -->
    <div ref="danmakuContainer" class="danmaku-area">
      <DanmakuMessage
        v-for="danmaku in activeDanmakus"
        :key="danmaku.id"
        :message="danmaku.message"
        :track="danmaku.track"
        :track-height="trackHeight"
        :duration="danmaku.duration"
        @finished="onDanmakuFinished(danmaku.id)"
      />
      
      <!-- 无消息提示 -->
      <div v-if="activeDanmakus.length === 0 && !loading" class="empty-hint">
        <div class="empty-icon">💭</div>
        <div class="empty-text">暂无消息，快来发送第一条弹幕吧！</div>
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
          placeholder="输入消息内容（最多100字）..."
          maxlength="100"
          @keyup.enter="sendMessage"
          :disabled="sending"
        />
        <div class="input-info">
          <span class="char-count">{{ messageInput.length }}/100</span>
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

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'

import DanmakuMessage from '@/components/chat/DanmakuMessage.vue'
import LoadingSpinner from '@/shared/ui/LoadingSpinner.vue'
import { useChatWebSocket } from '@/composables/useChatWebSocket'
import { getChatMessages } from '@/utils/api'
import { toast } from '@/utils/toast'

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

interface Danmaku {
  id: number
  message: ChatMessage
  track: number
  duration: number
}

const loading = ref(false)
const sending = ref(false)
const messageInput = ref('')
const messageInputRef = ref<HTMLInputElement>()
const activeDanmakus = ref<Danmaku[]>([])
const lastMessageId = ref(0)
const danmakuContainer = ref<HTMLElement>()

// WebSocket integration
const { 
  messages: wsMessages, 
  onlineCount, 
  connectionStatus, 
  sendMessage: wsSendMessage 
} = useChatWebSocket()

// 配置
const trackCount = 8 // 弹幕轨道数量
const trackHeight = 60 // 每条轨道高度
const baseDuration = 12 // 基础滚动时间（秒）

// 轨道管理
const tracks = ref<{ occupied: boolean; lastEndTime: number }[]>(
  Array.from({ length: trackCount }, () => ({ occupied: false, lastEndTime: 0 }))
)

const canSend = computed(() => {
  return messageInput.value.trim().length > 0 && !sending.value && connectionStatus.value === 'connected'
})

// 查找可用轨道
const findAvailableTrack = (): number => {
  const now = Date.now()
  
  // 查找完全空闲的轨道
  for (let i = 0; i < tracks.value.length; i++) {
    if (!tracks.value[i].occupied) {
      return i
    }
  }
  
  // 查找已结束的轨道
  for (let i = 0; i < tracks.value.length; i++) {
    if (tracks.value[i].lastEndTime < now) {
      return i
    }
  }
  
  // 随机选择一个轨道（避免碰撞）
  return Math.floor(Math.random() * tracks.value.length)
}

// 添加弹幕
const addDanmaku = (message: ChatMessage) => {
  const track = findAvailableTrack()
  const duration = baseDuration + Math.random() * 4 - 2 // 10-14秒随机
  
  const danmaku: Danmaku = {
    id: message.id,
    message,
    track,
    duration
  }
  
  activeDanmakus.value.push(danmaku)
  
  // 标记轨道占用
  tracks.value[track].occupied = true
  tracks.value[track].lastEndTime = Date.now() + duration * 1000
  
  // 限制同屏弹幕数量
  if (activeDanmakus.value.length > 50) {
    activeDanmakus.value.shift()
  }
}

// 弹幕完成
const onDanmakuFinished = (id: number) => {
  const index = activeDanmakus.value.findIndex(d => d.id === id)
  if (index !== -1) {
    const danmaku = activeDanmakus.value[index]
    tracks.value[danmaku.track].occupied = false
    activeDanmakus.value.splice(index, 1)
  }
}

// 发送消息 (via WebSocket)
const sendMessage = async () => {
  if (!canSend.value) return
  
  const content = messageInput.value.trim()
  if (content.length === 0) return
  
  sending.value = true
  try {
    await wsSendMessage(content)
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

// 加载初始消息
const loadInitialMessages = async () => {
  loading.value = true
  try {
    const result = await getChatMessages(30)
    const messages = result.messages || []
    
    // 初始化lastMessageId
    if (messages.length > 0) {
      lastMessageId.value = messages[messages.length - 1].id
      
      // 逐个添加弹幕，间隔100ms
      for (let i = 0; i < messages.length; i++) {
        setTimeout(() => {
          addDanmaku(messages[i])
        }, i * 100)
      }
    }
  } catch (error: any) {
    toast.error(error?.message || 'Failed to load messages')
  } finally {
    loading.value = false
  }
}

// Watch for new WebSocket messages and display them as danmaku
watch(() => wsMessages.value.length, (newLength, oldLength) => {
  if (newLength > oldLength) {
    // New message arrived
    const newMessage = wsMessages.value[newLength - 1]
    addDanmaku(newMessage)
  }
})

// 返回
const goBack = () => {
  router.back()
}

onMounted(() => {
  // 加载历史消息
  loadInitialMessages()

  // 自动聚焦到输入框
  nextTick(() => {
    setTimeout(() => {
      messageInputRef.value?.focus()
    }, 100)
  })
})
</script>

<style scoped>
.danmaku-chatroom-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
  position: relative;
  overflow: hidden;
}

/* 添加动态背景效果 */
.danmaku-chatroom-container::before {
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

/* 弹幕区域 */
.danmaku-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  pointer-events: none;
  padding: 20px 0 40px 0;
}

.danmaku-area > * {
  pointer-events: auto;
}

.empty-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  padding: 40px;
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

