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
      <div class="online-info">
        <span class="online-dot"></span>
        <span class="online-count">{{ onlineCount }}人在线</span>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

import DanmakuMessage from '@/components/chat/DanmakuMessage.vue'
import LoadingSpinner from '@/shared/ui/LoadingSpinner.vue'
import { 
  getChatMessages, 
  getNewChatMessages, 
  sendChatMessage, 
  getOnlineCount 
} from '@/utils/api'
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
const onlineCount = ref(0)
const activeDanmakus = ref<Danmaku[]>([])
const lastMessageId = ref(0)
const danmakuContainer = ref<HTMLElement>()

// 配置
const trackCount = 10 // 弹幕轨道数量
const trackHeight = 50 // 每条轨道高度
const baseDuration = 12 // 基础滚动时间（秒）

// 轨道管理
const tracks = ref<{ occupied: boolean; lastEndTime: number }[]>(
  Array.from({ length: trackCount }, () => ({ occupied: false, lastEndTime: 0 }))
)

const canSend = computed(() => {
  return messageInput.value.trim().length > 0 && !sending.value
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

// 发送消息
const sendMessage = async () => {
  if (!canSend.value) return
  
  const content = messageInput.value.trim()
  if (content.length === 0) return
  
  sending.value = true
  try {
    await sendChatMessage(content)
    messageInput.value = ''
    toast.success('发送成功')
  } catch (error: any) {
    toast.error(error?.message || '发送失败')
  } finally {
    sending.value = false
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
    toast.error(error?.message || '加载消息失败')
  } finally {
    loading.value = false
  }
}

// 轮询新消息
let pollInterval: number | null = null
const pollNewMessages = async () => {
  try {
    const result = await getNewChatMessages(lastMessageId.value)
    const messages = result.messages || []
    
    if (messages.length > 0) {
      messages.forEach((msg: ChatMessage) => {
        addDanmaku(msg)
      })
      lastMessageId.value = messages[messages.length - 1].id
    }
  } catch (error) {
    // 静默失败，避免频繁提示
    console.error('轮询新消息失败:', error)
  }
}

// 更新在线人数
const updateOnlineCount = async () => {
  try {
    const count = await getOnlineCount()
    onlineCount.value = count
  } catch (error) {
    console.error('获取在线人数失败:', error)
  }
}

// 返回
const goBack = () => {
  router.back()
}

// 在线人数更新定时器
let onlineInterval: number | null = null

onMounted(() => {
  // 加载初始消息
  loadInitialMessages()
  
  // 启动轮询（每2秒）
  pollInterval = window.setInterval(() => {
    pollNewMessages()
  }, 2000)
  
  // 更新在线人数（每5秒）
  updateOnlineCount()
  onlineInterval = window.setInterval(() => {
    updateOnlineCount()
  }, 5000)
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
  if (onlineInterval) {
    clearInterval(onlineInterval)
    onlineInterval = null
  }
})
</script>

<style scoped>
.chatroom-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

.chatroom-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 100;
}

.back-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateX(-4px);
}

.header-center {
  text-align: center;
  flex: 1;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: white;
  margin: 0 0 4px 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

.online-info {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.2);
  padding: 8px 16px;
  border-radius: 20px;
}

.online-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4ade80;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.2);
  }
}

.online-count {
  color: white;
  font-size: 14px;
  font-weight: 600;
}

/* 弹幕区域 */
.danmaku-area {
  flex: 1;
  position: relative;
  overflow-x: hidden;
  overflow-y: visible;
  pointer-events: none;
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
  color: rgba(255, 255, 255, 0.7);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.empty-text {
  font-size: 16px;
  font-weight: 500;
}

/* 底部输入区域 */
.chatroom-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 100;
}

.input-container {
  flex: 1;
  position: relative;
}

.message-input {
  width: 100%;
  padding: 14px 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  font-size: 15px;
  color: #111827;
  outline: none;
  transition: all 0.3s;
}

.message-input:focus {
  border-color: #fff;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.message-input::placeholder {
  color: #9ca3af;
}

.message-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.input-info {
  position: absolute;
  right: 16px;
  bottom: -20px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.char-count {
  font-weight: 500;
}

.send-btn {
  padding: 14px 32px;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  white-space: nowrap;
}

.send-btn:hover:not(.disabled) {
  background: #f0f0ff;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.send-btn:active:not(.disabled) {
  transform: translateY(0);
}

.send-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

