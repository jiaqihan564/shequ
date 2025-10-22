<template>
  <div 
    ref="danmakuRef"
    class="danmaku-item"
    :class="{ paused: isPaused }"
    :style="{ 
      top: `${track * trackHeight}px`,
      animationDuration: `${duration}s`,
      background: bgColor
    }"
    @mouseenter="handleDanmakuEnter"
    @mouseleave="handleDanmakuLeave"
  >
    <span class="message-content">{{ message.content }}</span>
    
    <!-- 用户信息卡片 -->
    <div 
      v-if="showCard" 
      class="user-info-card"
      @mouseenter="handleCardEnter"
      @mouseleave="handleCardLeave"
    >
      <div class="card-header">
        <img :src="avatarUrl" :alt="message.nickname || message.username" class="card-avatar" />
        <div class="card-user-info">
          <div class="card-nickname">{{ message.nickname || message.username }}</div>
          <div class="card-username">@{{ message.username }}</div>
        </div>
      </div>
      <div class="card-divider"></div>
      <div class="card-content">
        <div class="info-item">
          <span class="label">📅 发送时间</span>
          <span class="value">{{ formattedFullTime }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

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

interface Props {
  message: ChatMessage
  track: number
  trackHeight: number
  duration?: number
}

const props = withDefaults(defineProps<Props>(), {
  duration: 12
})

const emit = defineEmits<{
  finished: []
}>()

const danmakuRef = ref<HTMLElement>()
const showCard = ref(false)
const isPaused = ref(false)
const isHovering = ref(false)
let hideTimeout: number | null = null

// 用户头像URL
const avatarUrl = computed(() => {
  if (props.message.avatar) {
    return props.message.avatar.startsWith('http') 
      ? props.message.avatar 
      : `http://localhost:8080${props.message.avatar}`
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(props.message.nickname || props.message.username)}&background=667eea&color=fff&size=128`
})

// 格式化时间（完整）
const formattedFullTime = computed(() => {
  const date = new Date(props.message.send_time)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
})

// 根据用户ID生成背景颜色 - 现代化渐变配色
const bgColor = computed(() => {
  const gradients = [
    'linear-gradient(135deg, rgba(99, 102, 241, 0.85) 0%, rgba(139, 92, 246, 0.85) 100%)', // 靛紫渐变
    'linear-gradient(135deg, rgba(236, 72, 153, 0.85) 0%, rgba(219, 39, 119, 0.85) 100%)', // 粉红渐变
    'linear-gradient(135deg, rgba(14, 165, 233, 0.85) 0%, rgba(6, 182, 212, 0.85) 100%)', // 天蓝渐变
    'linear-gradient(135deg, rgba(16, 185, 129, 0.85) 0%, rgba(5, 150, 105, 0.85) 100%)', // 翠绿渐变
    'linear-gradient(135deg, rgba(251, 146, 60, 0.85) 0%, rgba(249, 115, 22, 0.85) 100%)', // 橙色渐变
    'linear-gradient(135deg, rgba(168, 85, 247, 0.85) 0%, rgba(147, 51, 234, 0.85) 100%)', // 紫色渐变
    'linear-gradient(135deg, rgba(234, 179, 8, 0.85) 0%, rgba(202, 138, 4, 0.85) 100%)', // 金黄渐变
    'linear-gradient(135deg, rgba(239, 68, 68, 0.85) 0%, rgba(220, 38, 38, 0.85) 100%)' // 红色渐变
  ]
  return gradients[props.message.user_id % gradients.length]
})

// 处理弹幕鼠标进入
const handleDanmakuEnter = () => {
  // 清除可能存在的隐藏定时器
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }
  
  // 设置状态
  isHovering.value = true
  showCard.value = true
  isPaused.value = true
}

// 处理弹幕鼠标离开
const handleDanmakuLeave = () => {
  isHovering.value = false
  
  // 延迟100ms检查，给鼠标移动到卡片的时间
  hideTimeout = window.setTimeout(() => {
    if (!isHovering.value) {
      showCard.value = false
      isPaused.value = false
    }
  }, 100)
}

// 处理卡片鼠标进入
const handleCardEnter = () => {
  // 清除隐藏定时器
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }
  
  // 标记为悬停状态
  isHovering.value = true
}

// 处理卡片鼠标离开
const handleCardLeave = () => {
  isHovering.value = false
  
  // 延迟检查，避免子元素间移动触发
  hideTimeout = window.setTimeout(() => {
    if (!isHovering.value) {
      showCard.value = false
      isPaused.value = false
    }
  }, 100)
}

onMounted(() => {
  // 动画结束后通知父组件
  if (danmakuRef.value) {
    danmakuRef.value.addEventListener('animationend', () => {
      emit('finished')
    })
  }
})

onUnmounted(() => {
  // 清理定时器
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }
})
</script>

<style scoped>
.danmaku-item {
  position: absolute;
  left: 100%;
  padding: 10px 20px;
  border-radius: 28px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  text-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.5),
    0 1px 3px rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(12px) saturate(150%);
  white-space: nowrap;
  animation: danmaku-scroll linear forwards;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
  pointer-events: auto;
  will-change: transform;
  user-select: none;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.25),
    0 2px 6px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  letter-spacing: 0.3px;
}

@keyframes danmaku-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(calc(-100vw - 100%));
  }
}

.danmaku-item.paused {
  animation-play-state: paused !important;
  z-index: 1000 !important;
}

.danmaku-item:hover,
.danmaku-item.paused {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.95) 0%, rgba(139, 92, 246, 0.95) 100%) !important;
  box-shadow: 
    0 12px 32px rgba(99, 102, 241, 0.6),
    0 6px 16px rgba(139, 92, 246, 0.4),
    0 0 0 3px rgba(255, 255, 255, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.3);
}

.message-content {
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

/* 用户信息卡片 */
.user-info-card {
  position: absolute;
  top: calc(100% + 16px);
  left: 50%;
  transform: translateX(-50%);
  width: 300px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.25),
    0 6px 20px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(99, 102, 241, 0.15);
  padding: 0;
  z-index: 10001 !important;
  animation: cardFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: auto;
  overflow: hidden;
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
    transform: translateX(-50%) translateY(-12px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
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
  transition: all 0.3s ease;
}

.card-avatar:hover {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 
    0 6px 18px rgba(99, 102, 241, 0.3),
    0 3px 9px rgba(0, 0, 0, 0.15);
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
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.04) 0%, rgba(139, 92, 246, 0.04) 100%);
  border-radius: 10px;
  border: 1px solid rgba(99, 102, 241, 0.08);
  transition: all 0.2s ease;
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
  color: #1e293b;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>

