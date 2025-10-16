<template>
  <div 
    ref="danmakuRef"
    class="danmaku-item"
    :class="{ paused: isPaused }"
    :style="{ 
      top: `${track * trackHeight}px`,
      animationDuration: `${duration}s`,
      backgroundColor: bgColor
    }"
    @mouseenter="onHover"
    @mouseleave="onLeave"
  >
    <span class="message-content">{{ message.content }}</span>
    
    <!-- 鼠标悬停桥接元素（填补间隙） -->
    <div 
      v-if="showCard" 
      class="hover-bridge"
      @mouseenter="onHover"
      @mouseleave="onLeave"
    ></div>
    
    <!-- 用户信息卡片 -->
    <div 
      v-if="showCard" 
      class="user-info-card"
      @mouseenter="onHover"
      @mouseleave="onLeave"
    >
      <div class="card-header">
        <img :src="avatarUrl" :alt="message.nickname || message.username" class="avatar" />
        <div class="user-info">
          <div class="nickname">{{ message.nickname || message.username }}</div>
          <div class="username">@{{ message.username }}</div>
        </div>
      </div>
      <div class="card-divider"></div>
      <div class="card-content">
        <div class="info-item">
          <span class="label">📅 发送时间:</span>
          <span class="value">{{ formattedTime }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

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
const savedTransform = ref('')

// 用户头像URL
const avatarUrl = computed(() => {
  if (props.message.avatar) {
    return props.message.avatar.startsWith('http') 
      ? props.message.avatar 
      : `http://localhost:8080${props.message.avatar}`
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(props.message.nickname || props.message.username)}&background=667eea&color=fff&size=128`
})

// 格式化时间
const formattedTime = computed(() => {
  const date = new Date(props.message.send_time)
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
})

// 根据用户ID生成背景颜色
const bgColor = computed(() => {
  const colors = [
    'rgba(102, 126, 234, 0.75)',
    'rgba(255, 107, 107, 0.75)',
    'rgba(78, 205, 196, 0.75)',
    'rgba(69, 183, 209, 0.75)',
    'rgba(255, 160, 122, 0.75)',
    'rgba(152, 216, 200, 0.75)',
    'rgba(247, 220, 111, 0.75)',
    'rgba(187, 143, 206, 0.75)'
  ]
  return colors[props.message.user_id % colors.length]
})

const onHover = () => {
  showCard.value = true
  isPaused.value = true
  console.log('鼠标悬停 - 显示用户卡片')
}

const onLeave = (event: MouseEvent) => {
  // 检查鼠标是否移动到用户信息卡片，如果是则不隐藏
  const relatedTarget = event.relatedTarget as HTMLElement
  if (relatedTarget && danmakuRef.value?.contains(relatedTarget)) {
    console.log('鼠标移动到子元素（用户卡片），保持显示')
    return
  }
  
  console.log('鼠标离开 - 隐藏用户卡片')
  showCard.value = false
  isPaused.value = false
}

onMounted(() => {
  // 动画结束后通知父组件
  if (danmakuRef.value) {
    danmakuRef.value.addEventListener('animationend', () => {
      emit('finished')
    })
  }
})
</script>

<style scoped>
.danmaku-item {
  position: absolute;
  left: 100%;
  padding: 8px 16px;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  text-shadow: 
    1px 1px 3px rgba(0, 0, 0, 0.9),
    -1px -1px 3px rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(8px);
  white-space: nowrap;
  animation: danmaku-scroll linear forwards;
  cursor: pointer;
  transition: background-color 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
  z-index: 10;
  pointer-events: auto;
  will-change: transform;
  user-select: none;
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
}

.danmaku-item:hover,
.danmaku-item.paused {
  background-color: rgba(102, 126, 234, 0.95) !important;
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.8) !important;
  z-index: 1000 !important;
  filter: brightness(1.15) !important;
  outline: 2px solid rgba(255, 255, 255, 0.3);
  outline-offset: 2px;
  animation-play-state: paused !important;
}

.message-content {
  position: relative;
  z-index: 1;
}

/* 鼠标悬停桥接元素 */
.hover-bridge {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: max(100%, 300px);
  height: 16px;
  z-index: 10000;
  pointer-events: auto;
  /* 调试用：取消注释可以看到桥接区域 */
  /* background: rgba(255, 0, 0, 0.2); */
}

/* 用户信息卡片 */
.user-info-card {
  position: absolute;
  top: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%);
  width: 280px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(102, 126, 234, 0.3);
  padding: 0;
  z-index: 10001 !important;
  animation: cardFadeIn 0.2s ease;
  pointer-events: auto;
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.card-header {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 12px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #667eea;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.nickname {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.username {
  font-size: 13px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
}

.card-content {
  padding: 12px 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.label {
  color: #6b7280;
}

.value {
  color: #111827;
  font-weight: 500;
}
</style>

