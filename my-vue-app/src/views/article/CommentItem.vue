<template>
  <div :class="['comment-item', { 'is-reply': isReply }]">
    <el-avatar
      :size="isReply ? 32 : 40"
      :src="comment.user?.avatar || comment.author?.avatar || '/default-avatar.png'"
      :alt="comment.user?.nickname || comment.author?.nickname"
    />
    <div class="comment-content">
      <div class="comment-header">
        <div class="commenter-info">
          <span class="commenter-name">{{ comment.user?.nickname || comment.author?.nickname }}</span>
          <span v-if="comment.reply_to_user" class="reply-to">
            回复 @{{ comment.reply_to_user.nickname }}
          </span>
        </div>
        <span class="comment-time">{{ formatDate(comment.created_at) }}</span>
      </div>
      <div class="comment-text">{{ comment.content }}</div>
      <div class="comment-actions">
        <el-button
          text
          :type="comment.is_liked ? 'primary' : 'default'"
          :icon="comment.is_liked ? StarFilled : Star"
          size="small"
          @click="handleLike"
        >
          {{ comment.like_count || 0 }}
        </el-button>
        <el-button
          text
          :icon="ChatDotRound"
          size="small"
          @click="toggleReplyBox"
        >
          回复{{ comment.reply_count > 0 ? ` (${comment.reply_count})` : '' }}
        </el-button>
      </div>

      <!-- 回复输入框 -->
      <div v-if="showReplyBox" class="reply-input-box">
        <el-input
          v-model="replyContent"
          type="textarea"
          :rows="3"
          :placeholder="`回复 @${comment.user?.nickname || comment.author?.nickname}...`"
          maxlength="500"
          show-word-limit
        />
        <div class="reply-actions">
          <el-button size="small" @click="cancelReply">取消</el-button>
          <el-button
            type="primary"
            size="small"
            :disabled="!replyContent.trim()"
            @click="submitReply"
          >
            发表回复
          </el-button>
        </div>
      </div>

      <!-- 递归显示子评论 -->
      <div v-if="comment.replies && comment.replies.length > 0" class="replies-list">
        <CommentItem
          v-for="reply in comment.replies"
          :key="reply.id"
          :comment="reply"
          :article-id="articleId"
          :is-reply="true"
          @like="$emit('like', $event)"
          @comment-posted="$emit('comment-posted')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Star, StarFilled, ChatDotRound } from '@element-plus/icons-vue'
import { postComment, toggleCommentLike } from '@/utils/api'
import type { ArticleComment } from '@/types'
import toast from '@/utils/toast'

interface Props {
  comment: ArticleComment
  articleId: number
  isReply?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isReply: false
})

const emit = defineEmits<{
  reply: [comment: ArticleComment]
  like: [commentId: number]
  commentPosted: []
}>()

const showReplyBox = ref(false)
const replyContent = ref('')

function toggleReplyBox() {
  showReplyBox.value = !showReplyBox.value
  if (!showReplyBox.value) {
    replyContent.value = ''
  }
}

function cancelReply() {
  showReplyBox.value = false
  replyContent.value = ''
}

async function submitReply() {
  if (!replyContent.value.trim()) {
    toast.warning('请输入回复内容')
    return
  }

  try {
    await postComment(props.articleId, {
      content: replyContent.value,
      parent_id: props.comment.id,
      reply_to_user_id: props.comment.user_id || props.comment.user?.id
    })
    
    replyContent.value = ''
    showReplyBox.value = false
    toast.success('回复成功')
    emit('comment-posted')
  } catch (error: any) {
    toast.error(error.message || '回复失败')
  }
}

async function handleLike() {
  try {
    const isLiked = await toggleCommentLike(props.comment.id)
    // 更新本地状态
    props.comment.is_liked = isLiked
    props.comment.like_count = (props.comment.like_count || 0) + (isLiked ? 1 : -1)
    emit('like', props.comment.id)
  } catch (error: any) {
    toast.error(error.message || '操作失败')
  }
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
  return date.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.comment-item {
  display: flex;
  gap: 12px;
  padding-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
}

.comment-item.is-reply {
  padding-bottom: 16px;
  border-bottom: none;
  margin-top: 16px;
}

.comment-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.comment-content {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 8px;
}

.commenter-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.commenter-name {
  font-weight: 600;
  color: #303133;
  font-size: 15px;
}

.reply-to {
  font-size: 13px;
  color: #909399;
}

.comment-time {
  font-size: 13px;
  color: #909399;
}

.comment-text {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 8px;
  word-break: break-word;
}

.comment-actions {
  display: flex;
  gap: 12px;
}

.reply-input-box {
  margin-top: 12px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.reply-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.replies-list {
  margin-top: 16px;
  padding-left: 20px;
  border-left: 2px solid #ebeef5;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .comment-item {
    gap: 8px;
  }

  .replies-list {
    padding-left: 12px;
  }

  .comment-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

