<template>
  <div class="article-detail-container">
    <div
      v-if="loading"
      v-loading="loading"
      class="loading-container"
      element-loading-text="加载中..."
    >
      <div style="height: 600px"></div>
    </div>

    <div v-else-if="article" class="article-content">
      <!-- 文章头部 -->
      <el-card class="article-header-card" shadow="never">
        <h1 class="article-title">{{ article.title }}</h1>

        <div class="article-meta">
          <div class="author-info">
            <el-avatar
              :size="48"
              :src="hasValidAvatar(article.author.avatar) ? article.author.avatar : undefined"
              :alt="article.author.nickname"
              :style="{
                backgroundColor: getAvatarColor(article.author.id),
                cursor: 'pointer',
                fontSize: '20px',
                fontWeight: '600'
              }"
              @click="goToUserDetail(article.author.id)"
            >
              {{ getAvatarInitial(article.author.nickname) }}
            </el-avatar>
            <div class="author-details">
              <div class="author-name">{{ article.author.nickname }}</div>
              <div class="publish-time">
                <el-icon><Clock /></el-icon>
                {{ formatDate(article.created_at) }}
              </div>
            </div>
          </div>
        </div>

        <div class="article-tags">
          <el-tag v-for="cat in article.categories" :key="cat.id" type="primary" effect="light">
            {{ cat.name }}
          </el-tag>
          <el-tag v-for="tag in article.tags" :key="tag.id" type="info" effect="plain">
            #{{ tag.name }}
          </el-tag>
        </div>

        <p v-if="article.description" class="article-description">
          {{ article.description }}
        </p>

        <div class="article-metrics" v-if="overviewMetrics.length">
          <div class="metric-item" v-for="metric in overviewMetrics" :key="metric.key">
            <div class="metric-icon">
              <el-icon><component :is="metric.icon" /></el-icon>
            </div>
            <div class="metric-content">
              <div class="metric-value">{{ metric.value }}</div>
              <div class="metric-label">{{ metric.label }}</div>
            </div>
          </div>
        </div>

        <el-divider v-if="overviewMetrics.length" />
      </el-card>

      <!-- 文章正文 -->
      <el-card class="article-body-card" shadow="never">
        <div class="markdown-body" @click="handleImageClick" v-html="renderedContent"></div>

        <!-- 代码块 -->
        <div v-if="article.code_blocks && article.code_blocks.length > 0" class="code-blocks">
          <el-divider content-position="left">
            <el-icon><Document /></el-icon>
            <span style="margin-left: 8px">代码示例</span>
          </el-divider>

          <el-card
            v-for="(block, index) in article.code_blocks"
            :key="index"
            class="code-block-card"
            shadow="hover"
          >
            <template #header>
              <div class="code-block-header">
                <div class="code-info">
                  <el-tag type="primary" size="small">{{ block.language }}</el-tag>
                  <span v-if="block.description" class="code-description">
                    {{ block.description }}
                  </span>
                </div>
                <el-button size="small" :icon="DocumentCopy" @click="copyCode(block.code_content)">
                  复制代码
                </el-button>
              </div>
            </template>
            <pre class="code-content"><code>{{ block.code_content }}</code></pre>
          </el-card>
        </div>
      </el-card>

      <!-- 操作按钮 -->
      <el-card class="article-actions-card" shadow="never">
        <div class="actions-container">
          <el-button
            :type="article.is_liked ? 'primary' : 'default'"
            :icon="article.is_liked ? StarFilled : Star"
            size="large"
            @click="handleLike"
          >
            {{ article.is_liked ? '已点赞' : '点赞' }} ({{ article.like_count }})
          </el-button>

          <el-button type="default" :icon="ChatDotRound" size="large" @click="scrollToComments">
            评论 ({{ article.comment_count }})
          </el-button>

          <el-button type="default" :icon="Share" size="large" @click="handleShare">分享</el-button>
        </div>
      </el-card>

      <!-- 评论区 -->
      <el-card id="comments-section" class="comments-card" shadow="never">
        <template #header>
          <div class="comments-header">
            <h3 style="margin: 0">
              <el-icon><ChatDotRound /></el-icon>
              评论区 ({{ article.comment_count }})
            </h3>
          </div>
        </template>

        <!-- 评论输入 -->
        <div class="comment-input-section">
          <el-input
            v-model="newComment"
            type="textarea"
            :rows="3"
            placeholder="发表你的评论..."
            maxlength="500"
            show-word-limit
            @keydown="handleCommentKeydown"
          />
          <el-button
            type="primary"
            :disabled="!newComment.trim()"
            style="margin-top: 12px"
            @click="handlePostComment"
          >
            发表评论
          </el-button>
        </div>

        <el-divider />

        <!-- 评论列表（递归显示） -->
        <div v-if="comments.length > 0" class="comments-list">
          <CommentItem
            v-for="comment in comments"
            :key="comment.id"
            :comment="comment"
            :article-id="article.id"
            @comment-posted="handleCommentPosted"
          />
        </div>

        <el-empty v-else description="暂无评论，快来发表第一条评论吧！" />
      </el-card>
    </div>

    <el-empty v-else description="文章不存在" />

    <!-- 图片预览 -->
    <el-image-viewer
      v-if="showImageViewer"
      :url-list="[currentImageUrl]"
      :z-index="3000"
      @close="closeImageViewer"
    />

    <!-- 分享对话框 -->
    <el-dialog
      v-model="shareDialogVisible"
      title="分享文章"
      width="500px"
      :close-on-click-modal="true"
    >
      <div class="share-content">
        <el-alert
          title="分享这篇精彩的文章给更多人"
          type="info"
          :closable="false"
          style="margin-bottom: 20px"
        />

        <div class="share-link-section">
          <el-input :model-value="shareLink" readonly size="large">
            <template #prepend>
              <el-icon><Link /></el-icon>
            </template>
          </el-input>
          <el-button
            type="primary"
            size="large"
            :icon="CopyDocument"
            style="margin-top: 12px; width: 100%"
            @click="copyLink"
          >
            复制链接
          </el-button>
        </div>

        <el-divider>或通过以下方式分享</el-divider>

        <div class="share-methods">
          <el-button class="share-btn" @click="shareToWeChat">
            <span class="share-icon">💬</span>
            微信
          </el-button>
          <el-button class="share-btn" @click="shareToWeibo">
            <span class="share-icon">📱</span>
            微博
          </el-button>
          <el-button class="share-btn" @click="shareToQQ">
            <span class="share-icon">🐧</span>
            QQ
          </el-button>
        </div>
      </div>

      <template #footer>
        <el-button @click="shareDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 微信二维码对话框 -->
    <el-dialog v-model="wechatQrVisible" title="微信扫码分享" width="400px" align-center>
      <div class="qrcode-container">
        <el-alert
          title="使用微信扫描二维码分享文章"
          type="success"
          :closable="false"
          style="margin-bottom: 20px"
        />
        <div class="qrcode-wrapper">
          <canvas ref="qrcodeCanvas" class="qrcode-canvas"></canvas>
        </div>
        <p class="qrcode-tip">扫描二维码即可在微信中打开文章</p>
      </div>
      <template #footer>
        <el-button type="primary" @click="wechatQrVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  Clock,
  View,
  Star,
  StarFilled,
  ChatDotRound,
  Share,
  Document,
  Link,
  CopyDocument,
  DocumentCopy
} from '@element-plus/icons-vue'
import QRCode from 'qrcode'
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CommentItem from '@/components/article/CommentItem.vue'
import { STORAGE_KEYS } from '@/config/storage-keys'
import { globalChatService, type CommentNotification } from '@/services/globalChatService'
import type { ArticleDetail, ArticleComment, CommentAuthor } from '@/types'
import { getArticleDetail, toggleArticleLike, postComment, getArticleComments } from '@/utils/api'
import { getAvatarInitial, getAvatarColor, hasValidAvatar } from '@/utils/ui/avatar'
import {
  countComments,
  insertReplyIntoTree,
  removeCommentById,
  upsertRootComment
} from '@/utils/commentTree'
import { renderMarkdown } from '@/utils/data/markdown'
import toast from '@/utils/ui/toast'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const article = ref<ArticleDetail | null>(null)
const comments = ref<ArticleComment[]>([])
const newComment = ref('')
const shareDialogVisible = ref(false)
const wechatQrVisible = ref(false)
const qrcodeCanvas = ref<HTMLCanvasElement | null>(null)
const showImageViewer = ref(false)
const currentImageUrl = ref('')

function normalizeCommentData(comment: ArticleComment): ArticleComment {
  const replies = Array.isArray(comment.replies) ? comment.replies.map(normalizeCommentData) : []

  const fallbackAuthor: CommentAuthor = {
    id: comment.user_id,
    username: '',
    nickname: '',
    avatar: ''
  }

  const authorData = comment.author ? { ...comment.author } : { ...fallbackAuthor }

  return {
    ...comment,
    author: authorData,
    replies,
    reply_to_user: comment.reply_to_user ? { ...comment.reply_to_user } : undefined,
    like_count: typeof comment.like_count === 'number' ? comment.like_count : 0,
    reply_count: typeof comment.reply_count === 'number' ? comment.reply_count : replies.length,
    status: typeof comment.status === 'number' ? comment.status : 1
  }
}

function syncArticleCommentCount() {
  if (!article.value) return
  article.value.comment_count = countComments(comments.value)
}

// WebSocket 取消订阅函数
let unsubscribeComment: (() => void) | null = null

// 获取当前用户ID
const currentUserId = computed(() => {
  const userInfo =
    localStorage.getItem(STORAGE_KEYS.USER_INFO) || sessionStorage.getItem(STORAGE_KEYS.USER_INFO)
  if (userInfo) {
    try {
      const data = JSON.parse(userInfo)
      return data.id
    } catch {
      return null
    }
  }
  return null
})

// 分享链接
const shareLink = computed(() => {
  if (typeof window !== 'undefined') {
    return window.location.href
  }
  return ''
})

// 渲染文章内容
const renderedContent = computed(() => {
  if (!article.value) return ''
  return renderMarkdown(article.value.content)
})

const overviewMetrics = computed(() => {
  if (!article.value) return []
  return [
    {
      key: 'views',
      label: '浏览',
      value: formatMetricValue(article.value.view_count),
      icon: View
    },
    {
      key: 'likes',
      label: '点赞',
      value: formatMetricValue(article.value.like_count),
      icon: StarFilled
    },
    {
      key: 'comments',
      label: '评论',
      value: formatMetricValue(article.value.comment_count),
      icon: ChatDotRound
    }
  ]
})

async function loadArticle() {
  loading.value = true
  try {
    const id = Number(route.params.id)
    article.value = await getArticleDetail(id)
    await loadComments(id)

    // 订阅实时评论更新
    subscribeToComments(id)
  } catch (error: any) {
    toast.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function loadComments(articleId: number) {
  try {
    const response = await getArticleComments(articleId)
    const list = response.comments || []
    comments.value = list.map(normalizeCommentData)
    syncArticleCommentCount()
  } catch (error) {
    console.error('[评论] 加载评论失败:', error)
    // 确保即使加载失败也能显示空的评论区
    comments.value = []
    syncArticleCommentCount()
  }
}

async function handleLike() {
  if (!article.value) return
  try {
    const isLiked = await toggleArticleLike(article.value.id)
    article.value.is_liked = isLiked
    article.value.like_count += isLiked ? 1 : -1
    toast.success(isLiked ? '点赞成功' : '取消点赞')
  } catch (error: any) {
    toast.error(error.message || '操作失败')
  }
}

function handleCommentKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handlePostComment()
  }
}

// 订阅实时评论更新
function subscribeToComments(articleId: number) {
  // 先取消之前的订阅
  if (unsubscribeComment) {
    unsubscribeComment()
  }

  // 订阅评论通知
  unsubscribeComment = globalChatService.onComment((notification: CommentNotification) => {
    // 只处理文章评论，且是当前文章
    if (notification.entity !== 'article' || notification.article_id !== articleId) {
      return
    }

    switch (notification.type) {
      case 'new_comment':
        handleNewComment(notification)
        break

      case 'new_reply':
        handleNewReply(notification)
        break

      case 'comment_deleted':
        handleCommentDeleted(notification)
        break
    }
  })
}

// 处理新评论
function handleNewComment(notification: CommentNotification) {
  if (!article.value) return

  if (notification.comment) {
    const normalized = normalizeCommentData(notification.comment as ArticleComment)
    const [nextComments] = upsertRootComment(comments.value, normalized)
    comments.value = nextComments
    syncArticleCommentCount()

    if (notification.user_id !== currentUserId.value) {
      toast.info(`${notification.nickname || notification.username} 发表了新评论`)
    }
    return
  }

  loadComments(article.value.id)
}

// 处理新回复
function handleNewReply(notification: CommentNotification) {
  if (!article.value) return

  if (notification.comment) {
    const normalized = normalizeCommentData(notification.comment as ArticleComment)
    const [nextComments, inserted] = insertReplyIntoTree(comments.value, normalized)
    if (!inserted) {
      loadComments(article.value.id)
    } else {
      comments.value = nextComments
      syncArticleCommentCount()
      if (notification.user_id !== currentUserId.value) {
        toast.info(`${notification.nickname || notification.username} 发表了回复`)
      }
    }
    return
  }

  loadComments(article.value.id)
}

// 处理评论删除
function handleCommentDeleted(notification: CommentNotification) {
  if (!article.value) return

  if (notification.comment_id) {
    const [nextComments, removed] = removeCommentById(comments.value, notification.comment_id)
    if (removed) {
      comments.value = nextComments
      syncArticleCommentCount()
    } else {
      loadComments(article.value.id)
    }
  } else {
    loadComments(article.value.id)
  }

  toast.info('评论已被删除')
}

async function handlePostComment() {
  if (!article.value || !newComment.value.trim()) {
    toast.warning('请输入评论内容')
    return
  }

  try {
    await postComment(article.value.id, { content: newComment.value })
    newComment.value = ''
    toast.success('评论成功')

    if (globalChatService.connectionStatus.value !== 'connected') {
      await loadComments(article.value.id)
    }
  } catch (error: any) {
    toast.error(error.message || '评论失败')
  }
}

async function handleCommentPosted() {
  if (!article.value) return

  if (globalChatService.connectionStatus.value !== 'connected') {
    await loadComments(article.value.id)
  }
}

function scrollToComments() {
  document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })
}

// 代码复制功能
async function copyCode(code: string) {
  try {
    await navigator.clipboard.writeText(code)
    toast.success('代码已复制到剪贴板')
  } catch (error) {
    // 降级方案：使用传统方法
    const textArea = document.createElement('textarea')
    textArea.value = code
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      toast.success('代码已复制到剪贴板')
    } catch (e) {
      toast.error('复制失败，请手动复制')
    }
    document.body.removeChild(textArea)
  }
}

function formatMetricValue(value: number | null | undefined): string {
  const numeric = typeof value === 'number' ? value : 0
  if (numeric <= 0) return '0'
  if (numeric < 1000) return `${numeric}`
  if (numeric < 10000) return numeric.toLocaleString('zh-CN')
  if (numeric < 100000000) {
    return `${(numeric / 10000).toFixed(1).replace(/\.0$/, '')} 万`
  }
  return `${(numeric / 100000000).toFixed(1).replace(/\.0$/, '')} 亿`
}

// 跳转到用户详情
function goToUserDetail(userId: number) {
  router.push(`/users/${userId}`)
}

// 图片点击查看
function handleImageClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.tagName === 'IMG') {
    const img = target as HTMLImageElement
    currentImageUrl.value = img.src
    showImageViewer.value = true
  }
}

function closeImageViewer() {
  showImageViewer.value = false
  currentImageUrl.value = ''
}

// 分享功能
function handleShare() {
  shareDialogVisible.value = true
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(shareLink.value)
    toast.success('链接已复制到剪贴板')
    shareDialogVisible.value = false
  } catch (error) {
    // 降级方案：使用传统方法
    const textArea = document.createElement('textarea')
    textArea.value = shareLink.value
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      toast.success('链接已复制到剪贴板')
      shareDialogVisible.value = false
    } catch (e) {
      toast.error('复制失败，请手动复制链接')
    }
    document.body.removeChild(textArea)
  }
}

async function shareToWeChat() {
  wechatQrVisible.value = true
  shareDialogVisible.value = false

  // 等待DOM更新
  await nextTick()

  // 生成二维码
  if (qrcodeCanvas.value) {
    try {
      await QRCode.toCanvas(qrcodeCanvas.value, shareLink.value, {
        width: 280,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
    } catch (error) {
      console.error('二维码生成失败:', error)
      toast.error('二维码生成失败')
    }
  }
}

function shareToWeibo() {
  const url = encodeURIComponent(shareLink.value)
  const title = encodeURIComponent(article.value?.title || '')
  window.open(`https://service.weibo.com/share/share.php?url=${url}&title=${title}`, '_blank')
}

function shareToQQ() {
  const url = encodeURIComponent(shareLink.value)
  const title = encodeURIComponent(article.value?.title || '')
  window.open(
    `https://connect.qq.com/widget/shareqq/index.html?url=${url}&title=${title}`,
    '_blank'
  )
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60))
      return minutes <= 0 ? '刚刚' : `${minutes}分钟前`
    }
    return `${hours}小时前`
  } else if (days < 7) {
    return `${days}天前`
  }
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

onMounted(() => {
  loadArticle()

  // 确保 WebSocket 已连接
  if (globalChatService.connectionStatus.value !== 'connected') {
    globalChatService.connect()
  }
})

// 组件卸载时取消订阅
onUnmounted(() => {
  if (unsubscribeComment) {
    unsubscribeComment()
  }
})
</script>

<style scoped>
.article-detail-container {
  width: 100%;
  max-width: none;
  margin: 0 auto;
  padding: 20px 40px;
}

/* 响应式宽度设计 */
@media (min-width: 768px) {
  .article-detail-container {
    width: 100%;
    padding: 20px 60px;
  }
}

@media (min-width: 1200px) {
  .article-detail-container {
    width: 100%;
    padding: 20px 80px;
  }
}

@media (min-width: 1600px) {
  .article-detail-container {
    width: 100%;
    padding: 20px 120px;
  }
}

.loading-container {
  min-height: 600px;
}

.article-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.article-header-card,
.article-body-card,
.article-actions-card,
.comments-card {
  border-radius: 12px;
}

.article-title {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
  margin: 0 0 24px 0;
  line-height: 1.4;
}

.article-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.author-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.publish-time {
  font-size: 13px;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 4px;
}

.article-tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.article-description {
  font-size: 16px;
  color: #606266;
  margin: 16px 0 0;
  line-height: 1.6;
}

.article-metrics {
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  background: linear-gradient(135deg, #f9fbff 0%, #ffffff 100%);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.metric-item:hover {
  border-color: #cfd8f6;
  box-shadow: 0 6px 18px rgba(64, 158, 255, 0.12);
}

.metric-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(64, 158, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #409eff;
}

.metric-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric-value {
  font-size: 22px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}

.metric-label {
  font-size: 13px;
  color: #909399;
}

.markdown-body {
  font-size: 16px;
  line-height: 1.8;
  color: #303133;
  word-wrap: break-word;
}

/* Markdown 标题 */
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
  color: #303133;
}

.markdown-body :deep(h1) {
  font-size: 28px;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 8px;
}

.markdown-body :deep(h2) {
  font-size: 24px;
  border-bottom: 1px solid #f5f7fa;
  padding-bottom: 6px;
}

.markdown-body :deep(h3) {
  font-size: 20px;
}

/* Markdown 段落 */
.markdown-body :deep(p) {
  margin-top: 0;
  margin-bottom: 16px;
}

/* Markdown 列表 */
.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 24px;
  margin-bottom: 16px;
}

.markdown-body :deep(li) {
  margin-bottom: 8px;
}

/* Markdown 代码 */
.markdown-body :deep(code) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  color: #e83e8c;
}

.markdown-body :deep(pre) {
  background: #282c34;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  max-width: 100%;
  margin-bottom: 16px;
}

.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
  color: #abb2bf;
  font-size: 14px;
  line-height: 1.5;
  white-space: inherit;
  word-break: inherit;
  overflow-wrap: inherit;
}

/* Markdown 引用 */
.markdown-body :deep(blockquote) {
  margin: 16px 0;
  padding: 12px 16px;
  border-left: 4px solid #409eff;
  background: #ecf5ff;
  color: #606266;
}

/* Markdown 链接 */
.markdown-body :deep(a) {
  color: #409eff;
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

/* Markdown 表格 */
.markdown-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 16px;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #dcdfe6;
  padding: 8px 12px;
}

.markdown-body :deep(th) {
  background: #f5f7fa;
  font-weight: 600;
}

/* Markdown 分隔线 */
.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid #ebeef5;
  margin: 24px 0;
}

/* Markdown 图片 - 增强显示压缩图片 */
.markdown-body :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
  
  /* 高质量缩放和锐化 */
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  filter: contrast(1.05) saturate(1.1);
  border-radius: 8px;
  margin: 16px 0;
  cursor: zoom-in;
  transition:
    transform 0.3s,
    box-shadow 0.3s;
}

.markdown-body :deep(img:hover) {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  filter: contrast(1.08) saturate(1.15);
}

.code-blocks {
  margin-top: 30px;
}

.code-block-card {
  margin-bottom: 16px;
  border-radius: 8px;
}

.code-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.code-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.code-description {
  font-size: 14px;
  color: #606266;
}

.code-content {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0;
}

.code-content code {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #303133;
}

.actions-container {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.comments-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-input-section {
  margin-bottom: 20px;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 分享对话框样式 */
.share-content {
  padding: 10px 0;
}

.share-link-section {
  margin-bottom: 20px;
}

.share-methods {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 20px;
}

.share-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  height: 80px;
  border: 1px solid #dcdfe6;
}

.share-btn:hover {
  border-color: #409eff;
  background: #ecf5ff;
}

.share-icon {
  font-size: 32px;
}

/* 二维码样式 */
.qrcode-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.qrcode-wrapper {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin: 20px 0;
}

.qrcode-canvas {
  display: block;
  border-radius: 8px;
}

.qrcode-tip {
  color: #606266;
  font-size: 14px;
  text-align: center;
  margin: 10px 0 0 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .article-detail-container {
    padding: 10px;
  }

  .article-title {
    font-size: 24px;
  }

  .article-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .actions-container {
    flex-direction: column;
  }

  .actions-container .el-button {
    width: 100%;
  }

  .share-methods {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .article-metrics {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }
}
</style>
