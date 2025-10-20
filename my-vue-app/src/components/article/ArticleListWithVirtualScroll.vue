<template>
  <div class="article-list-virtual">
    <OptimizedVirtualList
      ref="virtualListRef"
      :items="articles"
      :item-height="180"
      container-height="calc(100vh - 200px)"
      :buffer="3"
      :loading="loading"
      :has-more="hasMore"
      @load-more="handleLoadMore"
    >
      <template #default="{ item }">
        <el-card class="article-card" shadow="hover" @click="navigateToArticle(item.id)">
          <div class="article-header">
            <h3 class="article-title">{{ item.title }}</h3>
            <el-tag v-if="item.categories && item.categories[0]" size="small" type="primary">
              {{ item.categories[0].name }}
            </el-tag>
          </div>
          
          <p class="article-description">{{ item.description }}</p>
          
          <div class="article-meta">
            <div class="author-info">
              <el-avatar 
                v-lazy="item.author?.avatar || defaultAvatar" 
                :size="24" 
                :src="item.author?.avatar"
              />
              <span class="author-name">{{ item.author?.nickname || item.author?.username }}</span>
            </div>
            
            <div class="article-stats">
              <span class="stat-item">
                <el-icon><View /></el-icon>
                {{ formatCount(item.view_count) }}
              </span>
              <span class="stat-item">
                <el-icon><Star /></el-icon>
                {{ formatCount(item.like_count) }}
              </span>
              <span class="stat-item">
                <el-icon><ChatDotRound /></el-icon>
                {{ formatCount(item.comment_count) }}
              </span>
            </div>
            
            <span class="article-time">{{ formatTime(item.created_at) }}</span>
          </div>
          
          <div v-if="item.tags && item.tags.length" class="article-tags">
            <el-tag
              v-for="tag in item.tags.slice(0, 3)"
              :key="tag.id"
              size="small"
              effect="plain"
            >
              {{ tag.name }}
            </el-tag>
          </div>
        </el-card>
      </template>

      <template #empty>
        <el-empty description="暂无文章" />
      </template>
    </OptimizedVirtualList>

    <!-- 回到顶部按钮 -->
    <el-backtop target=".virtual-list-container" :bottom="80" :right="40" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { View, Star, ChatDotRound } from '@element-plus/icons-vue'
import OptimizedVirtualList from '@/components/shared/OptimizedVirtualList.vue'
import { getArticles } from '@/utils/api'
import type { ArticleListItem } from '@/types/article'

const router = useRouter()
const virtualListRef = ref()

// 数据
const articles = ref<ArticleListItem[]>([])
const loading = ref(false)
const hasMore = ref(true)
const currentPage = ref(1)
const pageSize = 20

// 默认头像
const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

// 加载文章列表
const loadArticles = async (page: number) => {
  if (loading.value) return

  try {
    loading.value = true
    const response = await getArticles({
      page,
      page_size: pageSize,
      sort_by: 'latest'
    })

    if (page === 1) {
      articles.value = response.articles || []
    } else {
      articles.value = [...articles.value, ...(response.articles || [])]
    }

    hasMore.value = articles.value.length < response.total
  } catch (error) {
    console.error('加载文章列表失败:', error)
    ElMessage.error('加载失败，请重试')
  } finally {
    loading.value = false
  }
}

// 加载更多
const handleLoadMore = () => {
  if (!hasMore.value || loading.value) return
  currentPage.value++
  loadArticles(currentPage.value)
}

// 导航到文章详情
const navigateToArticle = (id: number) => {
  router.push(`/articles/${id}`)
}

// 格式化数字
const formatCount = (count: number): string => {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}w`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`
  }
  return count.toString()
}

// 格式化时间
const formatTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) {
    return '刚刚'
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`
  } else if (diff < 7 * day) {
    return `${Math.floor(diff / day)}天前`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

// 初始化
onMounted(() => {
  loadArticles(1)
})

// 暴露刷新方法
const refresh = () => {
  currentPage.value = 1
  loadArticles(1)
  virtualListRef.value?.scrollToTop()
}

defineExpose({
  refresh
})
</script>

<style scoped>
.article-list-virtual {
  width: 100%;
  height: 100%;
}

.article-card {
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.article-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.article-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
}

.article-title {
  flex: 1;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.article-description {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-name {
  font-weight: 500;
  color: #606266;
}

.article-stats {
  display: flex;
  gap: 12px;
  flex: 1;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.article-time {
  white-space: nowrap;
}

.article-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 响应式 */
@media (max-width: 768px) {
  .article-title {
    font-size: 16px;
  }

  .article-meta {
    flex-wrap: wrap;
    gap: 8px;
  }

  .article-stats {
    gap: 8px;
  }
}
</style>

