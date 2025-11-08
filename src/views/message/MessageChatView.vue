<template>
  <div class="message-chat-container">
    <!-- 对话头部 -->
    <el-header class="chat-header" height="70px">
      <div class="header-left">
        <el-button :icon="ArrowLeft" circle @click="goBack" />
        <el-avatar
          :size="45"
          :src="hasValidAvatar(otherUser?.avatar) ? otherUser?.avatar : undefined"
          :style="{
            backgroundColor: getAvatarColor(otherUser?.id),
            cursor: 'pointer',
            fontSize: '20px',
            fontWeight: '600'
          }"
          @click="goToUserDetail"
        >
          {{ getAvatarInitial(otherUser?.nickname) }}
        </el-avatar>
        <div class="user-info">
          <h3 class="user-name">{{ otherUser?.nickname }}</h3>
          <el-text type="info" size="small">@{{ otherUser?.username }}</el-text>
        </div>
      </div>
      <div class="header-right">
        <el-button :icon="Refresh" circle :loading="loading" @click="loadMessages" />
      </div>
    </el-header>

    <!-- 消息列表区域 -->
    <el-main ref="messageListRef" class="chat-main">
      <el-scrollbar ref="scrollbarRef" height="100%">
        <div v-if="loadingMessages" class="loading-area">
          <el-skeleton :rows="3" animated />
        </div>

        <div v-else ref="messagesAreaRef" class="messages-area">
          <div
            v-for="(msg, index) in messages"
            :key="msg.id"
            :ref="
              el => {
                if (index === messages.length - 1) lastMessageRef = el
              }
            "
            :class="['message-wrapper', msg.is_self ? 'self' : 'other']"
          >
            <!-- 时间分隔线 -->
            <div v-if="shouldShowTimeDivider(index)" class="time-divider">
              <el-divider>{{ formatMessageTime(msg.created_at) }}</el-divider>
            </div>

            <!-- 消息气泡 -->
            <div class="message-item">
              <!-- 对方消息显示头像 -->
              <el-avatar
                v-if="!msg.is_self"
                :size="36"
                :src="
                  hasValidAvatar(msg.sender?.avatar || otherUser?.avatar)
                    ? msg.sender?.avatar || otherUser?.avatar
                    : undefined
                "
                class="message-avatar"
                :style="{
                  backgroundColor: getAvatarColor(otherUser?.id),
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }"
                @click="goToUserDetail"
              >
                {{ getAvatarInitial(otherUser?.nickname) }}
              </el-avatar>

              <!-- 消息内容 -->
              <div :class="['message-bubble', msg.is_self ? 'self' : 'other']">
                <div class="message-content">{{ msg.content }}</div>
                <div class="message-meta">
                  <span class="message-time">{{ formatBubbleTime(msg.created_at) }}</span>
                  <el-icon v-if="msg.is_self && msg.is_read" color="#67c23a" :size="14">
                    <CircleCheck />
                  </el-icon>
                </div>
              </div>

              <!-- 自己的消息显示头像 -->
              <el-avatar
                v-if="msg.is_self"
                :size="36"
                :src="hasValidAvatar(currentUserAvatar) ? currentUserAvatar : undefined"
                class="message-avatar"
                :style="{
                  backgroundColor: getAvatarColor(currentUserId),
                  fontSize: '16px',
                  fontWeight: '600'
                }"
              >
                {{ getAvatarInitial(currentUserNickname) }}
              </el-avatar>
            </div>
          </div>

          <!-- 加载更多 -->
          <div v-if="hasMore" class="load-more">
            <el-button text @click="loadMoreMessages">加载更早的消息</el-button>
          </div>

          <!-- 空状态 -->
          <div v-if="messages.length === 0 && !loadingMessages" class="empty-messages">
            <el-empty description="还没有消息">
              <el-text type="info">发送第一条消息开始对话吧！</el-text>
            </el-empty>
          </div>
        </div>
      </el-scrollbar>
    </el-main>

    <!-- 输入区域 -->
    <el-footer class="chat-footer" height="auto">
      <div class="input-container">
        <el-input
          ref="messageInputRef"
          v-model="messageInput"
          type="textarea"
          :rows="3"
          :autosize="{ minRows: 3, maxRows: 6 }"
          placeholder="输入消息内容..."
          maxlength="1000"
          show-word-limit
          @keydown.enter.exact="handleEnterSend"
          @keydown.ctrl.enter="insertNewLine"
        />
        <div class="input-actions">
          <el-text type="info" size="small">
            <el-icon><InfoFilled /></el-icon>
            按Enter发送，Ctrl+Enter换行
          </el-text>
          <el-button
            type="primary"
            :icon="Promotion"
            :disabled="!canSend"
            :loading="sending"
            @click="sendMessage"
          >
            发送
          </el-button>
        </div>
      </div>
    </el-footer>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Refresh, Promotion, CircleCheck, InfoFilled } from '@element-plus/icons-vue'
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { STORAGE_KEYS } from '@/config/storage-keys'
import { globalChatService } from '@/services/globalChatService'
import type { User } from '@/types'
import type { PrivateMessage, ConversationUser } from '@/types/message'
import {
  getConversationMessages,
  sendPrivateMessage,
  startConversation,
  markConversationAsRead,
  get
} from '@/utils/api'
import { getAvatarInitial, getAvatarColor, hasValidAvatar } from '@/utils/ui/avatar'
import toast from '@/utils/ui/toast'
import { logger } from '@/utils/ui/logger'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const loadingMessages = ref(false)
const sending = ref(false)
const messages = ref<PrivateMessage[]>([])
const messageInput = ref('')
const messageInputRef = ref<any>()
const otherUser = ref<ConversationUser | null>(null)
const conversationId = ref<number | null>(null)
const hasMore = ref(false)
const messageListRef = ref<HTMLElement>()
const scrollbarRef = ref<any>()
const messagesAreaRef = ref<HTMLElement>()
let lastMessageRef: any = null

// WebSocket取消订阅函数
let unsubscribePrivateMessage: (() => void) | null = null
let unsubscribeMessageRead: (() => void) | null = null

// 当前用户信息
const currentUserInfo = computed(() => {
  const userInfo =
    localStorage.getItem(STORAGE_KEYS.USER_INFO) || sessionStorage.getItem(STORAGE_KEYS.USER_INFO)
  if (userInfo) {
    try {
      return JSON.parse(userInfo)
    } catch {
      return null
    }
  }
  return null
})

// 当前用户头像
const currentUserAvatar = computed(() => {
  return currentUserInfo.value?.avatar || ''
})

// 当前用户ID
const currentUserId = computed(() => {
  return currentUserInfo.value?.id || 0
})

// 当前用户昵称
const currentUserNickname = computed(() => {
  return currentUserInfo.value?.profile?.nickname || currentUserInfo.value?.username || '我'
})

// 是否可以发送
const canSend = computed(() => {
  return messageInput.value.trim().length > 0 && !sending.value
})

// 加载对方用户信息和会话
async function initChat() {
  const userId = Number(route.params.userId)
  if (!userId) {
    toast.error('无效的用户ID')
    router.back()
    return
  }

  loading.value = true
  try {
    // 获取对方用户信息
    const user = await get<User>(`/user/${userId}`)
    otherUser.value = {
      id: user.id,
      username: user.username,
      nickname: user.profile?.nickname || user.username,
      avatar: user.avatar || '/default-avatar.png'
    }

    // 开始或获取会话
    const result = await startConversation(userId)
    conversationId.value = result.conversation_id

    // 加载消息
    await loadMessages()

    // 额外的滚动保障，确保组件完全挂载后滚动到底部
    await nextTick()
    setTimeout(() => scrollToBottom(), 300)

    // 自动聚焦到输入框
    nextTick(() => {
      setTimeout(() => {
        messageInputRef.value?.focus()
      }, 100)
    })
  } catch (error: any) {
    toast.error(error.message || '加载会话失败')
    router.back()
  } finally {
    loading.value = false
  }
}

// 加载消息
async function loadMessages(shouldMarkRead = true) {
  if (!conversationId.value) return

  loadingMessages.value = true
  try {
    const result = await getConversationMessages(conversationId.value, 50)
    messages.value = result.messages || []

    // 本地立即标记对方发送给我的消息为已读（实时更新UI）
    messages.value.forEach(msg => {
      if (!msg.is_self) {
        msg.is_read = true
      }
    })

    // 立即调用标记已读API，确保发送者实时收到已读通知
    if (shouldMarkRead) {
      markMessagesAsReadImmediate()
    }

    // 确保DOM完全更新后滚动到底部
    await nextTick()
    await nextTick()
    // 延迟滚动，确保消息列表完全渲染
    setTimeout(() => {
      scrollToBottom(false)
    }, 100)
    // 再次平滑滚动，确保万无一失
    setTimeout(() => scrollToBottom(true), 400)
  } catch (error: any) {
    toast.error(error.message || '加载消息失败')
  } finally {
    loadingMessages.value = false
  }
}

// 立即标记消息为已读
async function markMessagesAsReadImmediate() {
  if (!conversationId.value) return

  try {
    await markConversationAsRead(conversationId.value)
    logger.info('[MessageChat] Messages marked as read immediately on page load')

    // 触发全局未读数刷新
    window.dispatchEvent(new Event('refresh-unread-count'))
  } catch (error) {
    logger.error('[MessageChat] Failed to mark messages as read immediately:', error)
    // 静默失败，不影响用户体验
  }
}

// 加载更多消息
async function loadMoreMessages() {
  // 待实现：分页加载
  toast.info('功能开发中')
}

// 发送消息
async function sendMessage() {
  if (!canSend.value || !otherUser.value) return

  const content = messageInput.value.trim()
  if (!content) return

  sending.value = true

  // 创建临时消息对象（乐观更新）
  const tempMessage: PrivateMessage = {
    id: Date.now(), // 使用时间戳作为临时ID
    conversation_id: conversationId.value!,
    sender: {
      id: currentUserId.value,
      username: currentUserInfo.value?.username || '',
      nickname: currentUserNickname.value,
      avatar: currentUserAvatar.value
    },
    receiver: otherUser.value,
    content: content,
    is_read: false,
    is_self: true,
    created_at: new Date().toISOString()
  }

  // 立即添加到消息列表（乐观更新）
  messages.value.push(tempMessage)
  messageInput.value = ''

  // 立即滚动到底部
  await nextTick()
  scrollToBottom(false)

  try {
    // 发送消息到服务器
    const response = await sendPrivateMessage({
      receiver_id: otherUser.value.id,
      content: content
    })

    // 更新临时消息的ID为服务器返回的真实ID
    const tempIndex = messages.value.findIndex(msg => msg.id === tempMessage.id)
    if (tempIndex !== -1) {
      messages.value[tempIndex].id = response.message_id
    }

    // 触发全局未读数刷新事件
    window.dispatchEvent(new Event('refresh-unread-count'))
  } catch (error: any) {
    // 发送失败，移除临时消息
    const failedIndex = messages.value.findIndex(msg => msg.id === tempMessage.id)
    if (failedIndex !== -1) {
      messages.value.splice(failedIndex, 1)
    }
    toast.error(error.message || '发送失败')
  } finally {
    sending.value = false
  }
}

// 回车发送
function handleEnterSend(event: KeyboardEvent) {
  event.preventDefault()
  sendMessage()
}

// 插入换行符
function insertNewLine() {
  messageInput.value += '\n'
}

// 处理收到的新私信
async function handleNewPrivateMessage(data: any) {
  if (!data || !data.message) return

  const newMessage = data.message as PrivateMessage

  // 只处理当前会话的消息
  if (newMessage.conversation_id !== conversationId.value) {
    logger.debug('[MessageChat] Received message for different conversation')
    return
  }

  logger.info('[MessageChat] New message received via WebSocket:', newMessage.id)

  // 检查消息是否已存在（避免重复）
  const exists = messages.value.some(msg => msg.id === newMessage.id)
  if (exists) {
    logger.debug('[MessageChat] Message already exists, skipping')
    return
  }

  // 本地立即标记为已读（用户正在当前会话界面）
  newMessage.is_read = true

  // 添加到消息列表
  messages.value.push(newMessage)

  // 滚动到底部
  nextTick(() => {
    scrollToBottom(true)
  })

  // 异步通知后端标记为已读（这样发送者会立即收到已读通知）
  try {
    await markConversationAsRead(conversationId.value!)
    logger.info('[MessageChat] Message marked as read on server')

    // 触发全局未读数刷新
    window.dispatchEvent(new Event('refresh-unread-count'))
  } catch (error) {
    logger.error('[MessageChat] Failed to mark message as read:', error)
    // 静默失败，不影响用户体验
  }
}

// 处理消息已读通知
function handleMessageRead(data: any) {
  logger.debug('[MessageChat] Received message_read notification:', data)

  if (!data || !data.conversation_id) {
    logger.warn('[MessageChat] Invalid message_read data')
    return
  }

  // 只处理当前会话的已读通知
  if (data.conversation_id !== conversationId.value) {
    logger.debug('[MessageChat] Ignoring message_read for different conversation')
    return
  }

  logger.info('[MessageChat] Updating messages as read for conversation:', data.conversation_id)

  // 更新当前会话中所有自己发送的消息为已读
  let updatedCount = 0
  messages.value.forEach(msg => {
    if (msg.is_self && !msg.is_read) {
      msg.is_read = true
      updatedCount++
    }
  })

  logger.info(`[MessageChat] Updated ${updatedCount} messages to read status`)

  // 强制Vue重新渲染（确保UI更新）
  messages.value = [...messages.value]
}

// 滚动到底部 - 增强版，支持多种滚动方法
function scrollToBottom(smooth = true) {
  // 方法1: 使用scrollIntoView滚动到最后一条消息（最可靠）
  const scrollToLastMessage = () => {
    if (lastMessageRef && typeof lastMessageRef.scrollIntoView === 'function') {
      lastMessageRef.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      })
      return true
    }
    return false
  }

  // 方法2: 使用scrollbar容器滚动到底部（备用方案）
  const scrollByContainer = () => {
    if (scrollbarRef.value) {
      const scrollContainer = scrollbarRef.value.$refs.wrap
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto'
        })
        return true
      }
    }
    return false
  }

  // 立即尝试方法1
  if (scrollToLastMessage()) return

  // 方法1失败，尝试方法2
  if (scrollByContainer()) return

  // 都失败了，延迟重试
  setTimeout(() => {
    scrollToLastMessage() || scrollByContainer()
  }, 100)
  setTimeout(() => {
    scrollToLastMessage() || scrollByContainer()
  }, 300)
  setTimeout(() => {
    scrollToLastMessage() || scrollByContainer()
  }, 500)
}

// 返回
function goBack() {
  router.push('/messages')
}

// 跳转到用户详情
function goToUserDetail() {
  if (otherUser.value) {
    router.push(`/users/${otherUser.value.id}`)
  }
}

// 是否显示时间分隔线
function shouldShowTimeDivider(index: number): boolean {
  if (index === 0) return true

  const current = new Date(messages.value[index].created_at)
  const previous = new Date(messages.value[index - 1].created_at)

  // 超过5分钟显示时间
  return current.getTime() - previous.getTime() > 5 * 60 * 1000
}

// 格式化消息时间（分隔线）
function formatMessageTime(timeString: string): string {
  const date = new Date(timeString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (days === 1) {
    return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (days < 7) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return (
      weekdays[date.getDay()] +
      ' ' +
      date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    )
  }

  return date.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化气泡时间
function formatBubbleTime(timeString: string): string {
  const date = new Date(timeString)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 设置WebSocket监听
function setupWebSocketListeners() {
  // 订阅私信消息
  unsubscribePrivateMessage = globalChatService.onPrivateMessage(handleNewPrivateMessage)

  // 订阅消息已读通知
  unsubscribeMessageRead = globalChatService.onMessageRead(handleMessageRead)

  logger.info('[MessageChat] WebSocket listeners setup complete')
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

  logger.info('[MessageChat] WebSocket listeners cleaned up')
}

onMounted(() => {
  initChat()
  setupWebSocketListeners()
})

onUnmounted(() => {
  cleanupWebSocketListeners()
})
</script>

<style scoped>
.message-chat-container {
  height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

/* 头部样式 */
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 8px;
}

/* 主体消息区域 */
.chat-main {
  flex: 1;
  padding: 0;
  overflow: hidden;
  background: #f5f7fa;
}

.loading-area {
  padding: 20px;
}

.messages-area {
  padding: 20px;
  min-height: 100%;
}

/* 消息列表 */
.message-wrapper {
  margin-bottom: 20px;
}

.time-divider {
  margin: 16px 0;
}

:deep(.time-divider .el-divider__text) {
  background: #f5f7fa;
  padding: 0 12px;
  font-size: 12px;
  color: #909399;
}

.message-item {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.message-wrapper.self .message-item {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

/* 消息气泡 */
.message-bubble {
  max-width: 60%;
  min-width: 80px;
  padding: 10px 14px;
  border-radius: 12px;
  word-break: break-word;
  position: relative;
}

.message-bubble.other {
  background: #fff;
  border: 1px solid #ebeef5;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.message-bubble.other::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 12px;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 6px 8px 6px 0;
  border-color: transparent #fff transparent transparent;
}

.message-bubble.self {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: #fff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.message-bubble.self::before {
  content: '';
  position: absolute;
  right: -8px;
  top: 12px;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 6px 0 6px 8px;
  border-color: transparent transparent transparent #409eff;
}

.message-content {
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 4px;
  white-space: pre-wrap;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
}

.message-time {
  font-size: 11px;
  opacity: 0.8;
}

.message-bubble.other .message-time {
  color: #909399;
}

.message-bubble.self .message-time {
  color: #fff;
}

/* 加载更多 */
.load-more {
  text-align: center;
  margin: 20px 0;
}

.empty-messages {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}

/* 底部输入区域 */
.chat-footer {
  padding: 16px 20px;
  background: #fff;
  border-top: 1px solid #ebeef5;
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05);
}

.input-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Element Plus 组件覆盖 */
:deep(.el-textarea__inner) {
  border-radius: 8px;
  padding: 10px 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .message-bubble {
    max-width: 75%;
  }

  .chat-header {
    padding: 8px 12px;
  }

  .messages-area {
    padding: 12px;
  }

  .chat-footer {
    padding: 12px;
  }
}
</style>
