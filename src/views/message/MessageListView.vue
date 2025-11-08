<template>
  <div class="message-list-container">
    <!-- 页面头部 -->
    <el-card class="header-card" shadow="never">
      <div class="page-header">
        <div>
          <h1 class="page-title">
            <el-icon><ChatDotRound /></el-icon>
            私信
          </h1>
          <p class="page-subtitle">与好友的私密对话</p>
        </div>
        <el-badge :value="totalUnread" :hidden="totalUnread === 0" type="danger">
          <el-button :icon="Refresh" :loading="loading" @click="loadConversations">刷新</el-button>
        </el-badge>
      </div>
    </el-card>

    <!-- 会话列表 -->
    <el-card class="conversations-card" shadow="hover">
      <el-skeleton v-if="loading" :rows="5" animated />

      <div v-else-if="conversations.length > 0" class="conversations-list">
        <div
          v-for="conv in conversations"
          :key="conv.id"
          class="conversation-item"
          @click.stop="openConversation(conv)"
        >
          <el-badge :value="conv.unread_count" :hidden="conv.unread_count === 0" type="danger">
            <el-avatar
              :size="56"
              :src="hasValidAvatar(conv.other_user.avatar) ? conv.other_user.avatar : undefined"
              :alt="conv.other_user.nickname"
              :style="{
                backgroundColor: getAvatarColor(conv.other_user.id),
                fontSize: '24px',
                fontWeight: '600'
              }"
            >
              {{ getAvatarInitial(conv.other_user.nickname) }}
            </el-avatar>
          </el-badge>

          <div class="conversation-content">
            <div class="conversation-header">
              <span class="user-name">{{ conv.other_user.nickname }}</span>
              <span class="time">{{ formatTime(conv.last_message_time) }}</span>
            </div>
            <div class="last-message">
              <el-text :type="conv.unread_count > 0 ? 'primary' : 'info'" truncated>
                {{ conv.last_message || '暂无消息' }}
              </el-text>
            </div>
          </div>

          <el-icon class="arrow-icon" color="#c0c4cc">
            <ArrowRight />
          </el-icon>
        </div>
      </div>

      <el-empty v-else description="暂无私信" :image-size="120">
        <template #image>
          <el-icon :size="80" color="#c0c4cc">
            <ChatDotRound />
          </el-icon>
        </template>
        <el-text type="info">在文章页面点击用户头像，即可发送私信</el-text>
      </el-empty>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ChatDotRound, Refresh, ArrowRight } from '@element-plus/icons-vue'
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

import { globalChatService } from '@/services/globalChatService'
import type { Conversation } from '@/types/message'
import { getConversations } from '@/utils/api'
import { getAvatarInitial, getAvatarColor, hasValidAvatar } from '@/utils/ui/avatar'
import toast from '@/utils/ui/toast'
import { logger } from '@/utils/ui/logger'

const router = useRouter()

const loading = ref(false)
const conversations = ref<Conversation[]>([])
const totalUnread = ref(0)

let refreshTimer: number | null = null
let unsubscribePrivateMessage: (() => void) | null = null
let unsubscribeMessageRead: (() => void) | null = null

async function loadConversations() {
  loading.value = true
  try {
    const result = await getConversations()
    conversations.value = result.conversations || []
    totalUnread.value = result.total_unread || 0

    // 同时更新全局未读数
    window.dispatchEvent(new Event('refresh-unread-count'))
  } catch (error: any) {
    toast.error(error.message || '加载会话列表失败')
  } finally {
    loading.value = false
  }
}

function openConversation(conv: Conversation) {
  // 防止重复点击
  if (loading.value) return
  
  logger.info('[MessageList] Opening conversation with user:', conv.other_user.id)
  router.push(`/messages/${conv.other_user.id}`)
}

function formatTime(timeString: string | null): string {
  if (!timeString) return ''

  const date = new Date(timeString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60))
      if (minutes < 1) return '刚刚'
      return `${minutes}分钟前`
    }
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (days === 1) {
    return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (days < 7) {
    return `${days}天前`
  }

  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

// 处理收到的新私信
function handleNewPrivateMessage(data: any) {
  logger.info('[MessageList] Received private message notification', data)

  if (!data || !data.message) {
    // 如果没有详细消息数据，则完整刷新列表
    loadConversations()
    return
  }

  const message = data.message
  const conversationId = message.conversation_id

  // 查找对应的会话
  const convIndex = conversations.value.findIndex(c => c.id === conversationId)

  if (convIndex !== -1) {
    const conv = conversations.value[convIndex]

    // 更新会话的最后一条消息
    conv.last_message = message.content
    conv.last_message_time = message.created_at

    // 如果消息不是自己发的，增加未读数
    if (!message.is_self) {
      conv.unread_count += 1
      totalUnread.value += 1
      logger.info(`[MessageList] Increased unread count for conversation ${conversationId}`)

      // 触发全局未读数刷新
      window.dispatchEvent(new Event('refresh-unread-count'))
    }

    // 将该会话移到列表顶部（最新消息优先）
    if (convIndex > 0) {
      const movedConv = conversations.value.splice(convIndex, 1)[0]
      conversations.value.unshift(movedConv)
    }

    // 强制Vue响应式更新
    conversations.value = [...conversations.value]
  } else {
    // 新会话，重新加载列表
    logger.info('[MessageList] New conversation detected, reloading list')
    loadConversations()
  }
}

// 处理消息已读通知
function handleMessageRead(data: any) {
  logger.info('[MessageList] Received message read notification', data)

  if (!data || !data.conversation_id) return

  // 更新对应会话的未读数
  const conversationId = data.conversation_id
  const conv = conversations.value.find(c => c.id === conversationId)

  if (conv && conv.unread_count > 0) {
    // 减少该会话的未读数
    const oldUnread = conv.unread_count
    conv.unread_count = 0

    // 更新总未读数
    totalUnread.value = Math.max(0, totalUnread.value - oldUnread)
    logger.info(`[MessageList] Updated unread count: ${oldUnread} -> 0`)

    // 强制Vue响应式更新
    conversations.value = [...conversations.value]

    // 触发全局未读数刷新
    window.dispatchEvent(new Event('refresh-unread-count'))
  }
}

// 设置WebSocket监听
function setupWebSocketListeners() {
  // 订阅私信消息
  unsubscribePrivateMessage = globalChatService.onPrivateMessage(handleNewPrivateMessage)

  // 订阅消息已读通知
  unsubscribeMessageRead = globalChatService.onMessageRead(handleMessageRead)

  logger.info('[MessageList] WebSocket listeners setup complete')
}

// 清理WebSocket监听
function cleanupWebSocketListeners() {
  if (unsubscribePrivateMessage) {
    unsubscribePrivateMessage()
    unsubscribePrivateMessage = null
  }

  if (unsubscribeMessageRead) {
    unsubscribeMessageRead()
    unsubscribeMessageRead = null
  }

  logger.info('[MessageList] WebSocket listeners cleaned up')
}

// 自动刷新会话列表（轮询作为备用，主要靠WebSocket）
function startAutoRefresh() {
  // 降低轮询频率，因为主要依赖WebSocket实时更新
  refreshTimer = window.setInterval(() => {
    loadConversations()
  }, 60000) // 改为60秒
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

onMounted(() => {
  loadConversations()
  setupWebSocketListeners()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
  cleanupWebSocketListeners()
})
</script>

<style scoped>
.message-list-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
  border-radius: 12px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.conversations-card {
  border-radius: 12px;
  min-height: 400px;
}

.conversations-list {
  display: flex;
  flex-direction: column;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid #ebeef5;
  cursor: pointer;
  transition: all 0.3s;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.conversation-item * {
  pointer-events: none;
}

.conversation-item:last-child {
  border-bottom: none;
}

.conversation-item:hover {
  background: #f5f7fa;
}

.conversation-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.user-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.time {
  font-size: 13px;
  color: #909399;
  flex-shrink: 0;
}

.last-message {
  font-size: 14px;
  color: #606266;
}

.arrow-icon {
  font-size: 20px;
  transition: transform 0.3s;
}

.conversation-item:hover .arrow-icon {
  transform: translateX(4px);
}

@media (max-width: 768px) {
  .message-list-container {
    padding: 10px;
  }

  .page-title {
    font-size: 24px;
  }
}
</style>
