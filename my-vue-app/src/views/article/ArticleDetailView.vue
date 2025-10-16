<template>
  <div class="article-detail-container">
    <div v-if="loading" v-loading="loading" class="loading-container" element-loading-text="加载中...">
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
              @click="goToUserDetail(article.author.id)"
              :style="{ backgroundColor: getAvatarColor(article.author.id), cursor: 'pointer', fontSize: '20px', fontWeight: '600' }"
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
          
          <div class="article-stats">
            <el-tag type="info" effect="plain">
              <el-icon><View /></el-icon> {{ article.view_count }}
            </el-tag>
            <el-tag type="success" effect="plain">
              <el-icon><Star /></el-icon> {{ article.like_count }}
            </el-tag>
            <el-tag type="warning" effect="plain">
              <el-icon><ChatDotRound /></el-icon> {{ article.comment_count }}
            </el-tag>
          </div>
        </div>

        <div class="article-tags">
          <el-tag
            v-for="cat in article.categories"
            :key="cat.id"
            type="primary"
            effect="light"
          >
            {{ cat.name }}
          </el-tag>
          <el-tag
            v-for="tag in article.tags"
            :key="tag.id"
            type="info"
            effect="plain"
          >
            #{{ tag.name }}
          </el-tag>
        </div>
      </el-card>

      <!-- 文章正文 -->
      <el-card class="article-body-card" shadow="never">
        <div v-html="renderedContent" class="markdown-body" @click="handleImageClick"></div>
        
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
                <el-button
                  size="small"
                  :icon="DocumentCopy"
                  @click="copyCode(block.code_content)"
                >
                  复制代码
                </el-button>
              </div>
            </template>
            <pre class="code-content"><code>{{ block.code_content }}</code></pre>
          </el-card>
        </div>
      </el-card>

      <!-- 快捷评论输入框 -->
      <el-card class="quick-comment-card" shadow="never">
        <div class="quick-comment-section">
          <el-input
            v-model="quickComment"
            type="textarea"
            :rows="quickCommentExpanded ? 4 : 1"
            placeholder="写下你的评论..."
            maxlength="500"
            :show-word-limit="quickCommentExpanded"
            @focus="quickCommentExpanded = true"
          />
          <div v-if="quickCommentExpanded" class="quick-comment-actions">
            <el-button size="small" @click="cancelQuickComment">收起</el-button>
            <el-button
              type="primary"
              size="small"
              :disabled="!quickComment.trim()"
              @click="submitQuickComment"
            >
              发表评论
            </el-button>
          </div>
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
          
          <el-button
            type="default"
            :icon="ChatDotRound"
            size="large"
            @click="scrollToComments"
          >
          评论 ({{ article.comment_count }})
          </el-button>
          
          <el-button
            type="default"
            :icon="Share"
            size="large"
            @click="handleShare"
          >
            分享
          </el-button>
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
          />
          <el-button
            type="primary"
            :disabled="!newComment.trim()"
            @click="handlePostComment"
            style="margin-top: 12px"
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
      @close="closeImageViewer"
      :z-index="3000"
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
          <el-input
            :model-value="shareLink"
            readonly
            size="large"
          >
            <template #prepend>
              <el-icon><Link /></el-icon>
            </template>
          </el-input>
          <el-button
            type="primary"
            size="large"
            :icon="CopyDocument"
            @click="copyLink"
            style="margin-top: 12px; width: 100%"
          >
            复制链接
          </el-button>
              </div>

        <el-divider>或通过以下方式分享</el-divider>

        <div class="share-methods">
          <el-button
            class="share-btn"
            @click="shareToWeChat"
          >
            <span class="share-icon">💬</span>
            微信
          </el-button>
          <el-button
            class="share-btn"
            @click="shareToWeibo"
          >
            <span class="share-icon">📱</span>
            微博
          </el-button>
          <el-button
            class="share-btn"
            @click="shareToQQ"
          >
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
    <el-dialog
      v-model="wechatQrVisible"
      title="微信扫码分享"
      width="400px"
      align-center
    >
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
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QRCode from 'qrcode'
import {
  Clock, View, Star, StarFilled, ChatDotRound, Share, Document,
  Link, CopyDocument, DocumentCopy
} from '@element-plus/icons-vue'
import {
  getArticleDetail,
  toggleArticleLike,
  postComment,
  getArticleComments
} from '@/utils/api'
import type { ArticleDetail, ArticleComment } from '@/types'
import toast from '@/utils/toast'
import CommentItem from './CommentItem.vue'
import { getAvatarInitial, getAvatarColor, hasValidAvatar } from '@/utils/avatar'
import { renderMarkdown } from '@/utils/markdown'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const article = ref<ArticleDetail | null>(null)
const comments = ref<ArticleComment[]>([])
const newComment = ref('')
const quickComment = ref('')
const quickCommentExpanded = ref(false)
const shareDialogVisible = ref(false)
const wechatQrVisible = ref(false)
const qrcodeCanvas = ref<HTMLCanvasElement | null>(null)
const showImageViewer = ref(false)
const currentImageUrl = ref('')

// 分享链接
const shareLink = computed(() => {
  if (typeof window !== 'undefined') {
    return window.location.href
  }
  return ''
})

// Markdown渲染
const renderedContent = computed(() => {
  if (!article.value) return ''
  return renderMarkdown(article.value.content)
})

async function loadArticle() {
  loading.value = true
  try {
    const id = Number(route.params.id)
    article.value = await getArticleDetail(id)
    await loadComments(id)
  } catch (error: any) {
    toast.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function loadComments(articleId: number) {
  try {
    const response = await getArticleComments(articleId)
    comments.value = response.comments || []
  } catch (error) {
    console.error('加载评论失败:', error)
    // 确保即使加载失败也能显示空的评论区
    comments.value = []
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

async function handlePostComment() {
  if (!article.value || !newComment.value.trim()) {
    toast.warning('请输入评论内容')
    return
  }
  
  try {
    await postComment(article.value.id, { content: newComment.value })
    newComment.value = ''
    toast.success('评论成功')
    await loadComments(article.value.id)
    if (article.value) article.value.comment_count++
  } catch (error: any) {
    toast.error(error.message || '评论失败')
  }
}

async function handleCommentPosted() {
  // 重新加载评论列表
  if (article.value) {
    await loadComments(article.value.id)
    if (article.value) article.value.comment_count++
  }
}

function scrollToComments() {
  document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })
}

// 快捷评论功能
async function submitQuickComment() {
  if (!article.value || !quickComment.value.trim()) {
    toast.warning('请输入评论内容')
    return
  }
  
  try {
    await postComment(article.value.id, { content: quickComment.value })
    quickComment.value = ''
    quickCommentExpanded.value = false
    toast.success('评论成功')
    await loadComments(article.value.id)
    if (article.value) article.value.comment_count++
    // 滚动到评论区
    setTimeout(() => scrollToComments(), 300)
  } catch (error: any) {
    toast.error(error.message || '评论失败')
  }
}

function cancelQuickComment() {
  quickComment.value = ''
  quickCommentExpanded.value = false
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
  window.open(`https://connect.qq.com/widget/shareqq/index.html?url=${url}&title=${title}`, '_blank')
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
})
</script>

<style scoped>
.article-detail-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
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

.article-stats {
  display: flex;
  gap: 12px;
}

.article-stats .el-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 14px;
}

.article-tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
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
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 16px 0;
  cursor: zoom-in;
  transition: transform 0.3s, box-shadow 0.3s;
}

.markdown-body :deep(img:hover) {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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

.quick-comment-card {
  border-radius: 12px;
}

.quick-comment-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quick-comment-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
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
</style>
