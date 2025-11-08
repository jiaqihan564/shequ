<template>
  <section class="community-feed">
    <div class="feed-header">
      <h3 class="feed-title">🔥 社区热门</h3>
      <div class="feed-tabs">
        <button class="tab-btn active">
          💻 热门代码
        </button>
        <button 
          v-if="hasNewContent" 
          class="refresh-btn"
          @click="refreshContent"
          title="点击刷新查看新内容"
        >
          🔄 有{{ newContentCount }}条新内容
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="feed-loading">
      <LoadingSpinner text="加载中..." />
    </div>

    <div v-else-if="error" class="feed-error">
      <p>{{ error }}</p>
      <button class="retry-btn" @click="loadData">重试</button>
    </div>

    <div v-else class="feed-content">
      <!-- 代码列表 -->
      <div class="code-grid">
        <router-link
          v-for="snippet in codeSnippets"
          :key="snippet.id"
          :to="`/code-share/${snippet.share_token || snippet.id}`"
          class="code-card"
        >
          <div class="code-header">
            <div class="author-info">
              <el-avatar
                :size="32"
                :style="{
                  backgroundColor: getAvatarColor(snippet.user_id),
                  fontSize: '14px',
                  fontWeight: '600'
                }"
              >
                {{ getAvatarInitial(snippet.username) }}
              </el-avatar>
              <div class="author-details">
                <span class="author-name">{{ snippet.username }}</span>
                <time class="publish-time">{{ formatRelative(snippet.created_at) }}</time>
              </div>
            </div>
            <span class="language-badge" :class="`lang-${snippet.language}`">
              {{ snippet.language }}
            </span>
          </div>
          <h4 class="code-title">{{ snippet.title }}</h4>
          <p class="code-desc" v-if="snippet.description">{{ snippet.description }}</p>
          <div class="code-preview">
            <pre><code>{{ getCodePreview(snippet.code) }}</code></pre>
          </div>
        </router-link>

        <div v-if="codeSnippets.length === 0" class="empty-state">
          <p>暂无公开代码</p>
          <router-link to="/code" class="create-link">分享你的代码</router-link>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { ElNotification } from 'element-plus'

import LoadingSpinner from '@/shared/ui/LoadingSpinner.vue'
import type { CodeSnippetWithUser } from '@/types/code'
import { getPublicSnippets } from '@/utils/api/code-api'
import { getAvatarInitial, getAvatarColor } from '@/utils/ui/avatar'
import { contentNotificationService } from '@/services/contentNotificationService'

const codeSnippets = ref<CodeSnippetWithUser[]>([])
const isLoading = ref(false)
const error = ref('')
const hasNewContent = ref(false)
const newContentCount = ref(0)

// WebSocket事件处理器的清理函数
let unsubscribeNewCode: (() => void) | null = null
let unsubscribeNewArticle: (() => void) | null = null
let unsubscribeNewResource: (() => void) | null = null

onMounted(() => {
  loadData()
  setupWebSocketListeners()
})

async function loadData() {
  try {
    isLoading.value = true
    error.value = ''
    const res = await getPublicSnippets(1, 8)
    codeSnippets.value = res.items || []
  } catch (e) {
    error.value = '加载失败，请稍后重试'
  } finally {
    isLoading.value = false
  }
}

function formatRelative(iso: string): string {
  try {
    const ts = new Date(iso).getTime()
    const diff = Math.max(0, Date.now() - ts)
    const m = Math.floor(diff / 60000)
    if (m < 1) return '刚刚'
    if (m < 60) return `${m} 分钟前`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h} 小时前`
    const d = Math.floor(h / 24)
    if (d < 7) return `${d} 天前`
    return new Date(iso).toLocaleDateString('zh-CN')
  } catch {
    return ''
  }
}

function getCodePreview(code: string): string {
  const lines = code.split('\n').slice(0, 5)
  return lines.join('\n') + (code.split('\n').length > 5 ? '\n...' : '')
}

// 设置WebSocket监听器
function setupWebSocketListeners() {
  // 监听新代码片段
  unsubscribeNewCode = contentNotificationService.on('new_code', (data) => {
    
    // 显示通知
    ElNotification({
      title: '新代码发布',
      message: `${data.snippet?.username || '某用户'} 分享了新代码`,
      type: 'info',
      duration: 3000,
      position: 'top-right'
    })
    
    // 标记有新内容
    hasNewContent.value = true
    newContentCount.value++
  })

  // 监听新文章
  unsubscribeNewArticle = contentNotificationService.on('new_article', (data) => {
    
    ElNotification({
      title: '新文章发布',
      message: `${data.article?.author?.username || '某用户'} 发布了新文章`,
      type: 'info',
      duration: 3000,
      position: 'top-right'
    })
    
    hasNewContent.value = true
    newContentCount.value++
  })

  // 监听新资源
  unsubscribeNewResource = contentNotificationService.on('new_resource', (data) => {
    
    ElNotification({
      title: '新资源发布',
      message: `${data.resource?.author?.username || '某用户'} 发布了新资源`,
      type: 'info',
      duration: 3000,
      position: 'top-right'
    })
    
    hasNewContent.value = true
    newContentCount.value++
  })
}

// 刷新内容
async function refreshContent() {
  hasNewContent.value = false
  newContentCount.value = 0
  await loadData()
}

// 清理WebSocket监听器
onUnmounted(() => {
  if (unsubscribeNewCode) unsubscribeNewCode()
  if (unsubscribeNewArticle) unsubscribeNewArticle()
  if (unsubscribeNewResource) unsubscribeNewResource()
})
</script>

<style scoped>
.community-feed {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  overflow: hidden;
}

.feed-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.feed-title {
  font-size: 18px;
  font-weight: 800;
  color: #111827;
  margin: 0;
}

.feed-tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: default;
}

.refresh-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid #10b981;
  background: #ecfdf5;
  color: #10b981;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  animation: pulse 2s ease-in-out infinite;
}

.refresh-btn:hover {
  background: #d1fae5;
  border-color: #059669;
  color: #059669;
  transform: translateY(-1px);
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
  }
}

.feed-loading,
.feed-error {
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.feed-error p {
  color: #ef4444;
  margin: 0;
}

.retry-btn {
  padding: 8px 20px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: var(--color-primary);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background: #f9fafb;
}

.feed-content {
  padding: 16px;
}

.code-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.code-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 14px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}

.code-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(17, 24, 39, 0.08);
  border-color: var(--color-primary);
}

.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.author-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.author-name {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.publish-time {
  font-size: 11px;
  color: #9ca3af;
}

.language-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  background: #dbeafe;
  color: #1e40af;
}

.lang-javascript {
  background: #fef3c7;
  color: #92400e;
}

.lang-python {
  background: #dbeafe;
  color: #1e40af;
}

.lang-go {
  background: #e0e7ff;
  color: #3730a3;
}

.lang-java {
  background: #fee2e2;
  color: #991b1b;
}

.code-title {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.code-desc {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.code-preview {
  background: #1e293b;
  border-radius: 8px;
  padding: 10px;
  overflow: hidden;
  flex-grow: 1;
  display: flex;
  align-items: flex-start;
}

.code-preview pre {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: #e2e8f0;
  overflow: hidden;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  width: 100%;
}

.code-preview code {
  font-family: inherit;
}

.empty-state {
  grid-column: 1 / -1;
  padding: 60px 20px;
  text-align: center;
  color: #9ca3af;
}

.empty-state p {
  margin: 0 0 16px 0;
  font-size: 14px;
}

.create-link {
  display: inline-block;
  padding: 8px 20px;
  border-radius: 8px;
  background: var(--color-primary);
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s ease;
}

.create-link:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

@media (max-width: 768px) {
  .code-grid {
    grid-template-columns: 1fr;
  }
  
  .feed-content {
    padding: 12px;
  }
  
  .feed-header {
    padding: 12px 16px;
  }
}
</style>

