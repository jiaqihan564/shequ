<template>
  <div class="article-list-container">
    <el-card class="header-card" shadow="never">
      <div class="article-header">
        <div>
          <h1 class="page-title">技术文章</h1>
          <p class="page-subtitle">探索优质技术内容，分享编程经验</p>
        </div>
        <el-button
          type="primary"
          size="large"
          :icon="Edit"
          @click="$router.push('/articles/create')"
        >
          发布文章
        </el-button>
      </div>
    </el-card>

    <!-- 筛选器 -->
    <el-card class="filters-card" shadow="never">
      <el-form :inline="true">
        <el-form-item label="分类">
          <el-select
            v-model="query.category_id"
            placeholder="全部分类"
            clearable
            @change="handleFilterChange"
            style="width: 180px"
          >
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="`${cat.name} (${cat.article_count})`"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="排序">
          <el-select
            v-model="query.sort_by"
            @change="handleFilterChange"
            style="width: 140px"
          >
            <el-option label="最新发布" value="latest" />
            <el-option label="最热门" value="hot" />
            <el-option label="最多浏览" value="popular" />
          </el-select>
        </el-form-item>

        <el-form-item label="搜索">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索文章标题或内容..."
            :prefix-icon="Search"
            clearable
            @keyup.enter="handleSearch"
            @clear="handleSearch"
            style="width: 300px"
          >
            <template #append>
              <el-button :icon="Search" @click="handleSearch" />
            </template>
          </el-input>
        </el-form-item>
      </el-form>

      <!-- 标签过滤 -->
      <div v-if="tags.length > 0" class="tags-filter">
        <span class="filter-label">热门标签：</span>
        <el-tag
          v-for="tag in tags.slice(0, 15)"
          :key="tag.id"
          :type="query.tag_id === tag.id ? 'primary' : 'info'"
          :effect="query.tag_id === tag.id ? 'dark' : 'plain'"
          @click="handleTagClick(tag.id)"
          style="cursor: pointer; margin-right: 8px; margin-bottom: 8px"
        >
          {{ tag.name }}
        </el-tag>
      </div>
    </el-card>

    <!-- 加载中 -->
    <div v-if="loading" v-loading="loading" class="loading-container" element-loading-text="加载中...">
      <div style="height: 400px"></div>
    </div>

    <!-- 文章列表 -->
    <div v-else-if="articles.length > 0" class="articles-grid">
      <el-card
        v-for="article in articles"
        :key="article.id"
        class="article-card"
        shadow="hover"
        :body-style="{ padding: '20px' }"
      >
        <router-link :to="`/articles/${article.id}`" class="article-link">
          <h2 class="article-title">{{ article.title }}</h2>
          <p class="article-description">{{ article.description }}</p>

          <div class="article-meta">
            <div class="author" @click.stop="goToUserDetail(article.author.id)">
              <el-avatar
                :size="32"
                :src="hasValidAvatar(article.author.avatar) ? article.author.avatar : undefined"
                :alt="article.author.nickname"
                :style="{ backgroundColor: getAvatarColor(article.author.id), cursor: 'pointer', fontSize: '14px', fontWeight: '600' }"
              >
                {{ getAvatarInitial(article.author.nickname) }}
              </el-avatar>
              <span class="nickname" style="cursor: pointer">{{ article.author.nickname }}</span>
            </div>

            <div class="stats">
              <el-tag type="info" size="small" effect="plain">
                <el-icon><View /></el-icon> {{ article.view_count }}
              </el-tag>
              <el-tag type="success" size="small" effect="plain">
                <el-icon><Star /></el-icon> {{ article.like_count }}
              </el-tag>
              <el-tag type="warning" size="small" effect="plain">
                <el-icon><ChatDotRound /></el-icon> {{ article.comment_count }}
              </el-tag>
            </div>
          </div>

          <el-divider style="margin: 16px 0" />

          <div class="article-footer">
            <div class="categories">
              <el-tag
                v-for="cat in article.categories"
                :key="cat.id"
                type="primary"
                size="small"
                effect="light"
              >
                {{ cat.name }}
              </el-tag>
            </div>
            <time class="time">{{ formatDate(article.created_at) }}</time>
          </div>
        </router-link>
      </el-card>
    </div>

    <!-- 空状态 -->
    <el-card v-else class="empty-card" shadow="never">
      <el-empty description="暂无文章">
        <el-button type="primary" @click="$router.push('/articles/create')">
          发布第一篇文章
        </el-button>
      </el-empty>
    </el-card>

    <!-- 分页 -->
    <div v-if="total > 0 && totalPages > 1" class="pagination-container">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        :pager-count="7"
        background
        layout="prev, pager, next, jumper, total"
        @current-change="goToPage"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Edit, Search, View, Star, ChatDotRound } from '@element-plus/icons-vue'
import { getArticles, getArticleCategories, getArticleTags } from '@/utils/api'
import type { ArticleListItem, ArticleCategory, ArticleTag, ArticleListQuery } from '@/types/article'
import toast from '@/utils/toast'
import { getAvatarInitial, getAvatarColor, hasValidAvatar } from '@/utils/avatar'

const router = useRouter()
const loading = ref(false)
const articles = ref<ArticleListItem[]>([])
const categories = ref<ArticleCategory[]>([])
const tags = ref<ArticleTag[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const totalPages = ref(0)
const searchKeyword = ref('')

const query = reactive<ArticleListQuery>({
  page: 1,
  page_size: 20,
  sort_by: 'latest'
})

// 加载数据
async function loadArticles() {
  loading.value = true
  try {
    const response = await getArticles(query)
    articles.value = response.articles
    total.value = response.total
    page.value = response.page
    pageSize.value = response.page_size
    totalPages.value = response.total_pages
  } catch (error: any) {
    toast.error(error.message || '加载文章失败')
  } finally {
    loading.value = false
  }
}

// 加载分类和标签
async function loadMetadata() {
  try {
    const [cats, tagList] = await Promise.all([
      getArticleCategories(),
      getArticleTags()
    ])
    categories.value = cats
    tags.value = tagList
  } catch (error) {
    console.error('加载分类/标签失败:', error)
  }
}

// 筛选变化
function handleFilterChange() {
  query.page = 1
  loadArticles()
}

// 搜索
function handleSearch() {
  query.keyword = searchKeyword.value
  query.page = 1
  loadArticles()
}

// 标签点击
function handleTagClick(tagId: number) {
  if (query.tag_id === tagId) {
    query.tag_id = undefined
  } else {
    query.tag_id = tagId
  }
  query.page = 1
  loadArticles()
}

// 翻页
function goToPage(newPage: number) {
  query.page = newPage
  loadArticles()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 跳转到用户详情
function goToUserDetail(userId: number) {
  router.push(`/users/${userId}`)
}

// 格式化日期
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

onMounted(() => {
  loadMetadata()
  loadArticles()
})
</script>

<style scoped>
.article-list-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
  border-radius: 12px;
}

.article-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.filters-card {
  margin-bottom: 20px;
  border-radius: 12px;
}

.tags-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.filter-label {
  font-weight: 600;
  color: #606266;
  margin-right: 12px;
}

.loading-container {
  min-height: 400px;
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.article-card {
  border-radius: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.article-card:hover {
  transform: translateY(-4px);
}

.article-link {
  text-decoration: none;
  color: inherit;
  display: block;
}

.article-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.3s;
}

.article-card:hover .article-title {
  color: #409eff;
}

.article-description {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin: 0 0 16px 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.author {
  display: flex;
  align-items: center;
  gap: 10px;
}

.nickname {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.stats {
  display: flex;
  gap: 8px;
}

.stats .el-tag {
  display: flex;
  align-items: center;
  gap: 4px;
}

.article-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.categories {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.time {
  font-size: 13px;
  color: #909399;
}

.empty-card {
  margin-top: 40px;
  border-radius: 12px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 30px;
  padding: 20px 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .article-list-container {
    padding: 10px;
  }

  .article-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .articles-grid {
    grid-template-columns: 1fr;
  }

  .filters-card :deep(.el-form) {
    display: block;
  }

  .filters-card :deep(.el-form-item) {
    display: block;
    margin-right: 0;
    margin-bottom: 12px;
  }

  .filters-card :deep(.el-select),
  .filters-card :deep(.el-input) {
    width: 100% !important;
  }
}
</style>
