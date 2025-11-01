<template>
  <div class="user-detail-container">
    <div v-if="loading" v-loading="loading" class="loading-container" element-loading-text="加载中...">
      <div style="height: 400px"></div>
    </div>

    <div v-else-if="user" class="user-content">
      <!-- 用户信息卡片 -->
      <el-card class="user-info-card" shadow="hover">
        <div class="user-header">
          <el-avatar
            :size="100"
            :src="getUserAvatar(user)"
            :style="!getUserAvatar(user) ? { backgroundColor: getAvatarColor(user.id), fontSize: '40px', fontWeight: '600' } : {}"
          >
            {{ getAvatarInitial(user.profile?.nickname || user.username) }}
          </el-avatar>
          <div class="user-info">
            <h1 class="username">{{ user.profile?.nickname || user.username }}</h1>
            <span class="user-role">{{ user.role }}</span>
            <span class="join-date">
              <el-icon><Calendar /></el-icon>
              加入于 {{ formatDate(user.created_at) }}
            </span>
            <p v-if="user.profile?.bio" class="bio">{{ user.profile.bio }}</p>
          </div>
          <div v-if="!isSelf" class="user-actions">
            <el-button type="primary" :icon="ChatDotRound" @click="startChat">
              发私信
            </el-button>
          </div>
        </div>

        <!-- 统计数据 -->
        <el-divider />
        <el-row :gutter="20">
          <el-col :xs="24" :sm="8">
            <el-statistic :value="userStats.article_count || 0" title="发布文章">
              <template #prefix>
                <el-icon color="#409eff"><Document /></el-icon>
              </template>
            </el-statistic>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-statistic :value="userStats.total_likes || 0" title="获得点赞">
              <template #prefix>
                <el-icon color="#f56c6c"><Star /></el-icon>
              </template>
            </el-statistic>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-statistic :value="userStats.total_comments || 0" title="收到评论">
              <template #prefix>
                <el-icon color="#67c23a"><ChatDotRound /></el-icon>
              </template>
            </el-statistic>
          </el-col>
        </el-row>
      </el-card>

      <!-- 用户文章列表 -->
      <el-card class="articles-card" shadow="hover">
        <template #header>
          <h3 class="section-title">
            <el-icon><Document /></el-icon>
            TA的文章
          </h3>
        </template>

        <div v-if="articles.length > 0" class="articles-list">
          <div v-for="article in articles" :key="article.id" class="article-item" @click="goToArticle(article.id)">
            <div class="article-main">
              <h4 class="article-title">{{ article.title }}</h4>
              <p class="article-desc">{{ article.description }}</p>
              <div class="article-stats">
                <el-tag type="info" size="small" effect="plain">
                  <el-icon><View /></el-icon> {{ article.view_count }}
                </el-tag>
                <el-tag type="success" size="small" effect="plain">
                  <el-icon><Star /></el-icon> {{ article.like_count }}
                </el-tag>
                <span class="article-time">{{ formatDate(article.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>

        <el-empty v-else description="暂无文章" />

        <el-pagination
          v-if="total > pageSize"
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          @current-change="handlePageChange"
          style="margin-top: 20px; text-align: center"
        />
      </el-card>
    </div>

    <el-empty v-else description="用户不存在" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Calendar, ChatDotRound, Document, Star, View
} from '@element-plus/icons-vue'
import { get } from '@/utils/api'
import { getArticles, startConversation } from '@/utils/api'
import type { User } from '@/types'
import type { ArticleListItem } from '@/types/article'
import toast from '@/utils/toast'
import { getAvatarInitial, getAvatarColor, hasValidAvatar } from '@/utils/avatar'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const user = ref<User | null>(null)
const userStats = ref<any>({})
const articles = ref<ArticleListItem[]>([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

const currentUserId = computed(() => {
  const userInfo = localStorage.getItem('user_info') || sessionStorage.getItem('user_info')
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

const isSelf = computed(() => {
  return user.value?.id === currentUserId.value
})

// 获取用户头像（兼容多种字段名）
function getUserAvatar(user: User | null): string | undefined {
  if (!user) return undefined
  
  // 尝试多个可能的字段
  const avatarUrl = user.avatar || user.avatar_url || user.profile?.avatar_url
  
  if (!avatarUrl || avatarUrl.trim() === '' || avatarUrl === '/default-avatar.png') {
    return undefined
  }
  
  return avatarUrl
}

async function loadUser() {
  const userId = Number(route.params.id)
  if (!userId) return

  loading.value = true
  try {
    user.value = await get<User>(`/user/${userId}`)
    
    // 调试：查看后端返回的实际数据
    console.log('用户详情数据:', user.value)
    console.log('头像字段:', {
      avatar: user.value.avatar,
      avatar_url: user.value.avatar_url,
      profile_avatar: user.value.profile?.avatar_url
    })
    console.log('hasValidAvatar结果:', hasValidAvatar(user.value.avatar))
    
    // 加载用户文章
    await loadArticles()
  } catch (error: any) {
    toast.error(error.message || '加载用户信息失败')
  } finally {
    loading.value = false
  }
}

async function loadArticles() {
  const userId = Number(route.params.id)
  
  try {
    const response = await getArticles({
      user_id: userId,
      page: page.value,
      page_size: pageSize.value
    })
    
    articles.value = response.articles || []
    total.value = response.total || 0
    
    // 计算统计数据
    userStats.value = {
      article_count: response.total || 0,
      total_likes: articles.value.reduce((sum, a) => sum + a.like_count, 0),
      total_comments: articles.value.reduce((sum, a) => sum + a.comment_count, 0)
    }
  } catch (error: any) {
    console.error('加载文章失败:', error)
  }
}

function handlePageChange() {
  // 先滚动到顶部，避免滚动时数据变化导致页面撕裂
  window.scrollTo({ top: 0, behavior: 'smooth' })
  loadArticles()
}

async function startChat() {
  if (!user.value) return
  
  try {
    await startConversation(user.value.id)
    router.push(`/messages/${user.value.id}`)
  } catch (error: any) {
    toast.error(error.message || '开始会话失败')
  }
}

function goToArticle(articleId: number) {
  router.push(`/articles/${articleId}`)
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return '未知'
  
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    return '未知'
  }
  
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

onMounted(() => {
  loadUser()
})
</script>

<style scoped>
.user-detail-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.loading-container {
  min-height: 400px;
}

.user-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.user-info-card,
.articles-card {
  border-radius: 12px;
}

.user-header {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.username {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin: 0;
}

.user-role {
  font-size: 14px;
  color: #409eff;
  font-weight: 500;
  margin: 0;
}

.join-date {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #909399;
  margin: 0;
}

.join-date .el-icon {
  font-size: 14px;
}

.bio {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin: 8px 0 0 0;
}

.user-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.articles-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.article-item {
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.article-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.1);
  transform: translateX(4px);
}

.article-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.article-desc {
  font-size: 14px;
  color: #606266;
  margin: 0 0 12px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-stats {
  display: flex;
  gap: 12px;
  align-items: center;
}

.article-time {
  font-size: 13px;
  color: #909399;
  margin-left: auto;
}

:deep(.el-statistic) {
  text-align: center;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

@media (max-width: 768px) {
  .user-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .user-actions {
    width: 100%;
  }
}
</style>
