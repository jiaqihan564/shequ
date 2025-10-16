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
          <el-button :icon="Refresh" @click="loadConversations" :loading="loading">
            刷新
          </el-button>
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
          @click="openConversation(conv)"
        >
          <el-badge
            :value="conv.unread_count"
            :hidden="conv.unread_count === 0"
            type="danger"
          >
            <el-avatar
              :size="56"
              :src="hasValidAvatar(conv.other_user.avatar) ? conv.other_user.avatar : undefined"
              :alt="conv.other_user.nickname"
              :style="{ backgroundColor: getAvatarColor(conv.other_user.id), fontSize: '24px', fontWeight: '600' }"
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

      <el-empty
        v-else
        description="暂无私信"
        :image-size="120"
      >
        <template #image>
          <el-icon :size="80" color="#c0c4cc">
            <ChatDotRound />
          </el-icon>
        </template>
        <el-text type="info">
          在文章页面点击用户头像，即可发送私信
        </el-text>
      </el-empty>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChatDotRound, Refresh, ArrowRight
} from '@element-plus/icons-vue'
import { getConversations } from '@/utils/api'
import type { Conversation } from '@/types/message'
import toast from '@/utils/toast'
import { getAvatarInitial, getAvatarColor, hasValidAvatar } from '@/utils/avatar'

const router = useRouter()

const loading = ref(false)
const conversations = ref<Conversation[]>([])
const totalUnread = ref(0)

let refreshTimer: number | null = null

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

// 自动刷新会话列表（每30秒）
function startAutoRefresh() {
  refreshTimer = window.setInterval(() => {
    loadConversations()
  }, 30000)
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

onMounted(() => {
  loadConversations()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
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

