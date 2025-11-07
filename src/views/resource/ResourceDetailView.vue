<template>
  <div class="resource-detail-container">
    <div v-if="loading" v-loading="loading" style="height: 400px"></div>

    <div v-else-if="resource" class="resource-content">
      <!-- 资源信息卡片 -->
      <el-card class="info-card" shadow="never">
        <div class="resource-header">
          <div>
            <h1 class="resource-title">{{ resource.title }}</h1>
            <p class="resource-description">{{ resource.description }}</p>
          </div>
          <div class="resource-actions">
            <el-button type="primary" :icon="Download" size="large" @click="handleDownload">
              下载资源
            </el-button>
            <el-button :icon="resource.is_liked ? StarFilled : Star" @click="handleLike">
              {{ resource.is_liked ? '已点赞' : '点赞' }} ({{ resource.like_count }})
            </el-button>
          </div>
        </div>

        <el-divider />

        <el-row :gutter="20">
          <el-col :span="12">
            <div class="info-item">
              <span class="label">文件名：</span>
              <span class="value">{{ resource.file_name }}</span>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="info-item">
              <span class="label">文件大小：</span>
              <span class="value">{{ formatFileSize(resource.file_size) }}</span>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="info-item">
              <span class="label">下载次数：</span>
              <span class="value">{{ resource.download_count }}</span>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="info-item">
              <span class="label">浏览次数：</span>
              <span class="value">{{ resource.view_count }}</span>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <!-- 预览图轮播 -->
      <el-card
        v-if="resource.images && resource.images.length > 0"
        class="images-card"
        shadow="never"
      >
        <template #header>
          <h3>预览图 ({{ resource.images.length }}张)</h3>
        </template>
        <el-carousel height="400px" indicator-position="outside" arrow="always">
          <el-carousel-item v-for="(img, index) in resource.images" :key="img.id">
            <el-image
              :src="img.image_url"
              fit="contain"
              style="width: 100%; height: 100%"
              :preview-src-list="imageUrls"
              :initial-index="index"
            />
          </el-carousel-item>
        </el-carousel>
      </el-card>

      <!-- 详细文档 -->
      <el-card v-if="resource.document" class="document-card" shadow="never">
        <template #header>
          <h3>详细文档</h3>
        </template>
        <div class="markdown-body" @click="handleImageClick" v-html="renderedDocument"></div>
      </el-card>

      <!-- 操作按钮 -->
      <el-card class="resource-actions-card" shadow="never">
        <div class="actions-container">
          <el-button
            :type="resource.is_liked ? 'primary' : 'default'"
            :icon="resource.is_liked ? StarFilled : Star"
            size="large"
            @click="handleLike"
          >
            {{ resource.is_liked ? '已点赞' : '点赞' }} ({{ resource.like_count }})
          </el-button>

          <el-button type="default" :icon="ChatDotRound" size="large" @click="scrollToComments">
            评论 ({{ commentCount }})
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
              评论区 ({{ commentCount }})
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
            @click="submitComment"
          >
            发表评论
          </el-button>
        </div>

        <el-divider />

        <!-- 评论列表 -->
        <div v-if="comments.length > 0" class="comments-list">
          <ResourceCommentItem
            v-for="comment in comments"
            :key="comment.id"
            :comment="comment"
            :resource-id="resource.id"
            @comment-posted="handleCommentPosted"
          />
        </div>

        <el-empty v-else description="暂无评论，快来发表第一条评论吧！" />
      </el-card>
    </div>

    <el-empty v-else description="资源不存在" />

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
      title="分享资源"
      width="500px"
      :close-on-click-modal="true"
    >
      <div class="share-content">
        <el-alert
          title="分享这个精彩的资源给更多人"
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
          title="使用微信扫描二维码分享资源"
          type="success"
          :closable="false"
          style="margin-bottom: 20px"
        />
        <div class="qrcode-wrapper">
          <canvas ref="qrcodeCanvas" class="qrcode-canvas"></canvas>
        </div>
        <p class="qrcode-tip">扫描二维码即可在微信中打开资源</p>
      </div>
      <template #footer>
        <el-button type="primary" @click="wechatQrVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  Download,
  Star,
  StarFilled,
  ChatDotRound,
  Share,
  CopyDocument,
  Link
} from '@element-plus/icons-vue'
import QRCode from 'qrcode'
import { ref, onMounted, computed, nextTick, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

import ResourceCommentItem from '@/components/resource/ResourceCommentItem.vue'
import { STORAGE_KEYS } from '@/config/storage-keys'
import { globalChatService, type CommentNotification } from '@/services/globalChatService'
import type { Resource, ResourceComment } from '@/types/resource'
import {
  getResourceDetail,
  toggleResourceLike,
  getResourceProxyDownloadUrl,
  postResourceComment,
  getResourceComments
} from '@/utils/api'
import {
  countComments,
  insertReplyIntoTree,
  removeCommentById,
  upsertRootComment
} from '@/utils/commentTree'
import { renderMarkdown } from '@/utils/markdown'
import toast from '@/utils/toast'
import { logger } from '@/utils/ui/logger'

const route = useRoute()

const loading = ref(true)
const resource = ref<Resource | null>(null)
const comments = ref<ResourceComment[]>([])
const newComment = ref('')
const shareDialogVisible = ref(false)
const wechatQrVisible = ref(false)
const qrcodeCanvas = ref<HTMLCanvasElement | null>(null)
const commentCount = ref(0)
const showImageViewer = ref(false)
const currentImageUrl = ref('')

let unsubscribeComment: (() => void) | null = null

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

const imageUrls = computed(() => {
  return resource.value?.images.map(img => img.image_url) || []
})

const renderedDocument = computed(() => {
  if (!resource.value?.document) return ''
  return renderMarkdown(resource.value.document)
})

const shareLink = computed(() => {
  if (typeof window !== 'undefined') {
    return window.location.href
  }
  return ''
})

function normalizeResourceComment(comment: ResourceComment): ResourceComment {
  const replies = Array.isArray(comment.replies)
    ? comment.replies.map(normalizeResourceComment)
    : []

  return {
    ...comment,
    user: comment.user ? { ...comment.user } : undefined,
    reply_to_user: comment.reply_to_user ? { ...comment.reply_to_user } : undefined,
    replies,
    reply_count: typeof comment.reply_count === 'number' ? comment.reply_count : replies.length
  }
}

function syncResourceCommentCount() {
  commentCount.value = countComments(comments.value)
}

function handleNewResourceComment(notification: CommentNotification) {
  if (!notification.comment) {
    if (resource.value) {
      loadComments(resource.value.id)
    }
    return
  }

  const normalized = normalizeResourceComment(notification.comment as any)
  const [nextComments, isNew] = upsertRootComment(comments.value, normalized)
  comments.value = nextComments
  syncResourceCommentCount()

  if (notification.user_id !== currentUserId.value && isNew) {
    toast.info(`${notification.nickname || notification.username} 发表了新评论`)
  }
}

function handleNewResourceReply(notification: CommentNotification) {
  if (!notification.comment) {
    if (resource.value) {
      loadComments(resource.value.id)
    }
    return
  }

  const normalized = normalizeResourceComment(notification.comment as any)
  const [nextComments, inserted] = insertReplyIntoTree(comments.value, normalized)

  if (!inserted) {
    logger.warn('[资源评论] 找不到回复所属的父评论，回退到重新加载')
    if (resource.value) {
      loadComments(resource.value.id)
    }
    return
  }

  comments.value = nextComments
  syncResourceCommentCount()

  if (notification.user_id !== currentUserId.value) {
    toast.info(`${notification.nickname || notification.username} 发表了回复`)
  }
}

function handleResourceCommentDeleted(notification: CommentNotification) {
  const [nextComments, removed] = removeCommentById(comments.value, notification.comment_id)

  if (!removed) {
    logger.warn('[资源评论] 未能本地删除评论，回退到重新加载')
    if (resource.value) {
      loadComments(resource.value.id)
    }
    return
  }

  comments.value = nextComments
  syncResourceCommentCount()
  toast.info('评论已被删除')
}

function subscribeToComments(resourceId: number) {
  if (unsubscribeComment) {
    unsubscribeComment()
  }

  unsubscribeComment = globalChatService.onComment((notification: CommentNotification) => {
    // 只处理资源评论，且是当前资源
    if (notification.entity !== 'resource' || notification.resource_id !== resourceId) {
      return
    }

    logger.debug('[资源评论] 收到 WebSocket 通知:', {
      type: notification.type,
      resource_id: notification.resource_id,
      current_resource: resourceId,
      user_id: notification.user_id,
      current_user: currentUserId.value,
      is_self: notification.user_id === currentUserId.value
    })

    switch (notification.type) {
      case 'new_comment':
        handleNewResourceComment(notification)
        break
      case 'new_reply':
        handleNewResourceReply(notification)
        break
      case 'comment_deleted':
        handleResourceCommentDeleted(notification)
        break
    }
  })

  logger.debug('[资源评论] 已订阅 WebSocket 通知', {
    resourceId,
    status: globalChatService.connectionStatus.value
  })
}

async function loadResource() {
  const id = Number(route.params.id)
  loading.value = true

  try {
    resource.value = await getResourceDetail(id)
    await loadComments(id)

    // 订阅实时评论更新
    subscribeToComments(id)
  } catch (error: any) {
    toast.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function loadComments(resourceId: number) {
  try {
    const response = await getResourceComments(resourceId)
    comments.value = (response.comments || []).map(normalizeResourceComment)
    syncResourceCommentCount()

    logger.debug('[资源评论] 加载评论成功:', {
      resourceId,
      total: response.total,
      commentsCount: comments.value.length,
      timestamp: new Date().toLocaleTimeString()
    })
  } catch (error) {
    logger.error('[资源评论] 加载评论失败:', error)
    comments.value = []
    commentCount.value = 0
  }
}

async function handleDownload() {
  if (!resource.value) return

  try {
    toast.info('正在准备下载...')

    // 使用代理下载URL（支持大文件和断点续传）
    const downloadUrl = getResourceProxyDownloadUrl(resource.value.id)

    // 创建隐藏的a标签触发下载
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = resource.value.file_name
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // 更新下载次数显示
    resource.value.download_count++
    toast.success('下载已开始')
  } catch (error: any) {
    toast.error(error.message || '下载失败')
  }
}

async function handleLike() {
  if (!resource.value) return

  try {
    const isLiked = await toggleResourceLike(resource.value.id)
    resource.value.is_liked = isLiked
    resource.value.like_count += isLiked ? 1 : -1
    toast.success(isLiked ? '点赞成功' : '取消点赞')
  } catch (error: any) {
    toast.error(error.message || '操作失败')
  }
}

// 评论功能
function handleCommentKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    submitComment()
  }
}

async function submitComment() {
  if (!resource.value || !newComment.value.trim()) {
    toast.warning('请输入评论内容')
    return
  }

  try {
    logger.debug('[资源评论] 发表评论开始')
    await postResourceComment(resource.value.id, { content: newComment.value })
    newComment.value = ''
    toast.success('评论成功')
    logger.debug('[资源评论] 评论发表成功，等待 WebSocket 推送')

    // 如果 WebSocket 未连接，回退到手动刷新
    if (globalChatService.connectionStatus.value !== 'connected') {
      logger.warn('[资源评论] WebSocket 未连接，回退到手动刷新评论列表')
      await loadComments(resource.value.id)
    }
  } catch (error: any) {
    logger.error('[资源评论] 评论发表失败:', error)
    toast.error(error.message || '评论失败')
  }
}

async function handleCommentPosted() {
  if (!resource.value) return

  // 仅在 WebSocket 未连接时才手动刷新
  if (globalChatService.connectionStatus.value !== 'connected') {
    logger.warn('[资源评论] WebSocket 未连接，子组件请求刷新评论列表')
    await loadComments(resource.value.id)
  }
}

function scrollToComments() {
  document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })
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
  const title = encodeURIComponent(resource.value?.title || '')
  window.open(`https://service.weibo.com/share/share.php?url=${url}&title=${title}`, '_blank')
}

function shareToQQ() {
  const url = encodeURIComponent(shareLink.value)
  const title = encodeURIComponent(resource.value?.title || '')
  window.open(
    `https://connect.qq.com/widget/shareqq/index.html?url=${url}&title=${title}`,
    '_blank'
  )
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

onMounted(() => {
  loadResource()

  // 确保 WebSocket 已连接
  if (globalChatService.connectionStatus.value !== 'connected') {
    logger.debug('[资源评论] WebSocket 未连接，正在连接...')
    globalChatService.connect()
  }
})

// 组件卸载时取消订阅
onUnmounted(() => {
  if (unsubscribeComment) {
    unsubscribeComment()
    logger.debug('[资源评论] 已取消评论订阅')
  }
})
</script>

<style scoped>
.resource-detail-container {
  width: 100%;
  max-width: none;
  margin: 0 auto;
  padding: 20px 40px;
}

/* 响应式宽度设计 */
@media (min-width: 768px) {
  .resource-detail-container {
    width: 100%;
    padding: 20px 60px;
  }
}

@media (min-width: 1200px) {
  .resource-detail-container {
    width: 100%;
    padding: 20px 80px;
  }
}

@media (min-width: 1600px) {
  .resource-detail-container {
    width: 100%;
    padding: 20px 120px;
  }
}

.resource-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-card,
.images-card,
.document-card {
  border-radius: 12px;
}

.resource-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.resource-title {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin: 0 0 12px 0;
}

.resource-description {
  font-size: 16px;
  color: #606266;
  margin: 0;
}

.resource-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.info-item {
  padding: 8px 0;
  display: flex;
  gap: 8px;
}

.info-item .label {
  font-weight: 600;
  color: #606266;
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
  margin-bottom: 16px;
}

.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
  color: #abb2bf;
  font-size: 14px;
  line-height: 1.5;
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

/* Markdown 图片 */
.markdown-body :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
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
}

/* 操作按钮 */
.resource-actions-card {
  border-radius: 12px;
}

.actions-container {
  display: flex;
  gap: 12px;
  justify-content: center;
}

/* 评论区 */
.comments-card {
  border-radius: 12px;
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

/* 分享对话框 */
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
  .share-methods {
    grid-template-columns: 1fr;
  }
}
</style>
