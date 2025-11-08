<template>
  <div class="resource-list-container">
    <!-- 页面头部 -->
    <el-card class="header-card" shadow="never">
      <div class="page-header">
        <div>
          <h1 class="page-title">
            <el-icon><FolderOpened /></el-icon>
            资源中心
          </h1>
          <p class="page-subtitle">分享和下载实用资源</p>
        </div>
        <el-button
          type="primary"
          :icon="Upload"
          size="large"
          @click="$router.push('/resources/upload')"
        >
          上传资源
        </el-button>
      </div>
    </el-card>

    <!-- 快捷访问 -->
    <el-row :gutter="16" style="margin-bottom: 20px">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="quick-card" shadow="hover" @click="$router.push('/articles')">
          <div class="quick-content">
            <el-icon :size="32" color="#409eff"><Document /></el-icon>
            <div>
              <h4>技术文章</h4>
              <p>阅读技术博客</p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="quick-card" shadow="hover" @click="$router.push('/chatroom')">
          <div class="quick-content">
            <el-icon :size="32" color="#67c23a"><ChatDotRound /></el-icon>
            <div>
              <h4>聊天室</h4>
              <p>实时交流</p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="quick-card" shadow="hover" @click="$router.push('/messages')">
          <div class="quick-content">
            <el-icon :size="32" color="#e6a23c"><Message /></el-icon>
            <div>
              <h4>私信</h4>
              <p>私密对话</p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="quick-card" shadow="hover" @click="$router.push('/cumulative-stats')">
          <div class="quick-content">
            <el-icon :size="32" color="#f56c6c"><DataAnalysis /></el-icon>
            <div>
              <h4>数据中心</h4>
              <p>统计分析</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选器 -->
    <el-card class="filters-card" shadow="never">
      <el-row :gutter="16">
        <el-col :xs="24" :sm="12" :md="6">
          <el-form-item label="分类">
            <el-select
              v-model="query.category_id"
              placeholder="全部分类"
              clearable
              style="width: 100%"
              @change="handleFilterChange"
            >
              <el-option
                v-for="cat in categories"
                :key="cat.id"
                :label="`${cat.name} (${cat.resource_count})`"
                :value="cat.id"
              />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :xs="24" :sm="12" :md="6">
          <el-form-item label="排序方式">
            <el-select v-model="query.sort_by" style="width: 100%" @change="handleFilterChange">
              <el-option label="最新上传" value="latest" />
              <el-option label="最受欢迎" value="popular" />
              <el-option label="下载最多" value="downloads" />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :xs="24" :sm="24" :md="12">
          <el-form-item label="搜索资源">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索资源标题或描述..."
              :prefix-icon="Search"
              clearable
              @keyup.enter="handleSearch"
            >
              <template #append>
                <el-button :icon="Search" @click="handleSearch" />
              </template>
            </el-input>
          </el-form-item>
        </el-col>
      </el-row>
    </el-card>

    <!-- 分类标签 -->
    <el-card class="tags-card" shadow="never">
      <div class="tags-section">
        <span class="tags-label">分类：</span>
        <div class="tags-container">
          <el-check-tag :checked="!query.category_id" @change="handleCategoryTagClick(null)">
            全部分类
          </el-check-tag>
          <el-check-tag
            v-for="cat in categories"
            :key="cat.id"
            :checked="query.category_id === cat.id"
            @change="handleCategoryTagClick(cat.id)"
          >
            {{ cat.name }}
          </el-check-tag>
        </div>
      </div>
    </el-card>

    <!-- 资源列表 -->
    <template v-if="loading && resources.length === 0">
      <SkeletonLoader type="card" :count="6" />
    </template>

    <div v-else-if="resources.length > 0" class="resources-grid">
      <el-card
        v-for="resource in resources"
        :key="resource.id"
        class="resource-card"
        shadow="hover"
        @click="goToDetail(resource.id)"
      >
        <div class="resource-cover">
          <el-image
            :src="
              resource.cover_image || 'https://via.placeholder.com/400x300/409eff/ffffff?text=资源'
            "
            fit="cover"
            style="width: 100%; height: 180px"
          >
            <template #error>
              <div class="image-slot">
                <el-icon :size="60" color="#c0c4cc"><Picture /></el-icon>
              </div>
            </template>
          </el-image>
        </div>
        <div class="resource-info">
          <h3 class="resource-title">{{ resource.title }}</h3>
          <p class="resource-desc">{{ resource.description }}</p>
          <div class="resource-meta">
            <el-tag v-if="resource.category" type="primary" size="small">
              {{ resource.category.name }}
            </el-tag>
            <span class="file-info">
              {{ formatFileSize(resource.file_size) }} · {{ resource.file_extension }}
            </span>
          </div>
          <div class="resource-stats">
            <span>
              <el-icon><Download /></el-icon>
              {{ resource.download_count }}
            </span>
            <span>
              <el-icon><View /></el-icon>
              {{ resource.view_count }}
            </span>
            <span>
              <el-icon><Star /></el-icon>
              {{ resource.like_count }}
            </span>
          </div>
        </div>
      </el-card>
    </div>

    <el-empty v-else description="暂无资源" />

    <!-- 分页 -->
    <div v-if="total > 0" class="pagination-container">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[12, 24, 36, 48]"
        :total="total"
        background
        layout="sizes, prev, pager, next, total"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'ResourceListView'
}
</script>

<script setup lang="ts">
import {
  FolderOpened,
  Upload,
  Search,
  Download,
  View,
  Star,
  Document,
  ChatDotRound,
  Message,
  DataAnalysis,
  Picture
} from '@element-plus/icons-vue'
import { ref, onMounted, reactive, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'

import SkeletonLoader from '@/components/shared/SkeletonLoader.vue'
import type { ResourceListItem, ResourceCategory, ResourceAuthor } from '@/types/resource'
import { getResources, getResourceCategories } from '@/utils/api'
import toast from '@/utils/ui/toast'
import { globalChatService, type ContentBroadcastPayload } from '@/services/globalChatService'

const router = useRouter()

const loading = ref(false)
const resources = ref<ResourceListItem[]>([])
const categories = ref<ResourceCategory[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(12)
const searchKeyword = ref('')

const query = reactive({
  page: 1,
  page_size: 12,
  sort_by: 'latest' as string,
  category_id: undefined as number | undefined,
  keyword: '' as string
})

let unsubscribeResourceBroadcast: (() => void) | null = null
const pendingResourceReload = ref(false)
const hasResourceRealtimeNotice = ref(false)

function isViewingDefaultResourceLatest(): boolean {
  return (
    query.page === 1 &&
    (!query.sort_by || query.sort_by === 'latest') &&
    !query.category_id &&
    !query.keyword
  )
}

function toResourceListItemFromPayload(raw: any): ResourceListItem | null {
  if (!raw || typeof raw !== 'object') return null

  const id = Number(raw.id ?? raw.ID)
  if (!Number.isFinite(id) || id <= 0) return null

  const authorRaw = raw.author ?? raw.Author ?? {}
  const author: ResourceAuthor = {
    id: Number(authorRaw.id ?? authorRaw.ID ?? 0),
    username: authorRaw.username ?? authorRaw.Username ?? '',
    nickname: authorRaw.nickname ?? authorRaw.Nickname ?? '',
    avatar: authorRaw.avatar ?? authorRaw.Avatar ?? ''
  }

  const categoryRaw = raw.category ?? raw.Category ?? null
  const category = categoryRaw
    ? ({
        id: Number(categoryRaw.id ?? categoryRaw.ID ?? 0),
        name: categoryRaw.name ?? categoryRaw.Name ?? '',
        slug: categoryRaw.slug ?? categoryRaw.Slug ?? '',
        description: categoryRaw.description ?? categoryRaw.Description ?? '',
        resource_count: Number(categoryRaw.resource_count ?? categoryRaw.ResourceCount ?? 0),
        created_at: categoryRaw.created_at ?? categoryRaw.CreatedAt ?? ''
      } as ResourceCategory)
    : undefined

  const createdAt = raw.created_at ?? raw.CreatedAt ?? new Date().toISOString()

  return {
    id,
    title: raw.title ?? raw.Title ?? '',
    description: raw.description ?? raw.Description ?? '',
    author,
    category,
    cover_image: raw.cover_image ?? raw.CoverImage ?? '',
    file_name: raw.file_name ?? raw.FileName ?? '',
    file_size: Number(raw.file_size ?? raw.FileSize ?? 0),
    file_extension: raw.file_extension ?? raw.FileExtension ?? '',
    file_hash: raw.file_hash ?? raw.FileHash ?? '',
    download_count: Number(raw.download_count ?? raw.DownloadCount ?? 0),
    view_count: Number(raw.view_count ?? raw.ViewCount ?? 0),
    like_count: Number(raw.like_count ?? raw.LikeCount ?? 0),
    created_at: createdAt
  }
}

function insertResourceAtTop(item: ResourceListItem): void {
  const existingIndex = resources.value.findIndex(resource => resource.id === item.id)
  if (existingIndex !== -1) {
    resources.value.splice(existingIndex, 1)
  } else {
    total.value += 1
  }

  resources.value.unshift(item)

  const limit = query.page_size || pageSize.value || 12
  if (resources.value.length > limit) {
    resources.value = resources.value.slice(0, limit)
  }
}

async function loadResources() {
  loading.value = true
  try {
    const response = await getResources(query)
    resources.value = response.resources || []
    total.value = response.total
    page.value = response.page
    pageSize.value = response.page_size
  } catch (error: any) {
    toast.error(error.message || '加载资源失败')
  } finally {
    loading.value = false
    if (isViewingDefaultResourceLatest()) {
      hasResourceRealtimeNotice.value = false
    }
    if (pendingResourceReload.value) {
      pendingResourceReload.value = false
      void loadResources()
    }
  }
}

async function loadCategories() {
  try {
    categories.value = await getResourceCategories()
  } catch (error: any) {
    console.error('加载分类失败:', error)
  }
}

function handleFilterChange() {
  // 先滚动到顶部，避免数据变化导致的视觉问题
  window.scrollTo({ top: 0, behavior: 'smooth' })
  query.page = 1
  loadResources()
}

function handleSearch() {
  // 先滚动到顶部，避免数据变化导致的视觉问题
  window.scrollTo({ top: 0, behavior: 'smooth' })
  query.keyword = searchKeyword.value
  query.page = 1
  loadResources()
}

function handleCategoryTagClick(categoryId: number | null) {
  // 先滚动到顶部，避免数据变化导致的视觉问题
  window.scrollTo({ top: 0, behavior: 'smooth' })
  query.category_id = categoryId || undefined
  query.page = 1
  loadResources()
}

function goToDetail(id: number) {
  router.push(`/resources/${id}`)
}

function handlePageChange(newPage: number) {
  // 先滚动到顶部，避免滚动时数据变化导致页面撕裂
  window.scrollTo({ top: 0, behavior: 'smooth' })
  query.page = newPage
  loadResources()
}

function handleSizeChange(newSize: number) {
  // 先滚动到顶部，避免滚动时数据变化导致页面撕裂
  window.scrollTo({ top: 0, behavior: 'smooth' })
  query.page_size = newSize
  query.page = 1
  page.value = 1
  loadResources()
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

function handleRealtimeResource(payload: ContentBroadcastPayload<ResourceListItem>): void {
  if (!payload || payload.action !== 'created') {
    return
  }

  const normalized = payload.data ? toResourceListItemFromPayload(payload.data) : null

  if (isViewingDefaultResourceLatest()) {
    if (normalized) {
      insertResourceAtTop(normalized)
      toast.success(`新资源发布：${normalized.title}`)
    } else if (loading.value) {
      pendingResourceReload.value = true
    } else {
      void loadResources()
    }
    return
  }

  if (!hasResourceRealtimeNotice.value) {
    toast.info('有新资源发布，切换到“最新上传”第一页即可查看最新内容')
    hasResourceRealtimeNotice.value = true
  }
}

function subscribeToRealtimeResources() {
  if (unsubscribeResourceBroadcast) {
    unsubscribeResourceBroadcast()
  }
  unsubscribeResourceBroadcast = globalChatService.onResourceBroadcast(handleRealtimeResource)

  if (globalChatService.connectionStatus.value !== 'connected') {
    globalChatService.connect()
  }
}

function cleanupRealtimeResources() {
  if (unsubscribeResourceBroadcast) {
    unsubscribeResourceBroadcast()
    unsubscribeResourceBroadcast = null
  }
}

watch(
  () => [query.page, query.sort_by, query.category_id, query.keyword],
  () => {
    if (hasResourceRealtimeNotice.value && isViewingDefaultResourceLatest()) {
      hasResourceRealtimeNotice.value = false
      if (loading.value) {
        pendingResourceReload.value = true
      } else {
        void loadResources()
      }
    }
  }
)

onMounted(() => {
  loadCategories()
  loadResources()
  subscribeToRealtimeResources()
})

onUnmounted(() => {
  cleanupRealtimeResources()
})
</script>

<style scoped>
.resource-list-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.header-card,
.filters-card,
.tags-card {
  margin-bottom: 20px;
  border-radius: 12px;
}

.tags-section {
  display: flex;
  align-items: flex-start;
  gap: 12px;
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

.resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.resource-card {
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.3s;
}

.resource-card:hover {
  transform: translateY(-4px);
}

.resource-cover {
  margin: -20px -20px 16px -20px;
  border-radius: 12px 12px 0 0;
  overflow: hidden;
  background: #ffffff;
}

.image-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 180px;
  background: linear-gradient(135deg, #f5f7fa 0%, #ecf0f5 100%);
}

.resource-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.resource-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.resource-desc {
  font-size: 14px;
  color: #606266;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.resource-meta,
.resource-stats {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 13px;
  color: #909399;
}

.file-info {
  color: #606266;
}

/* 快捷访问卡片 */
.quick-card {
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.3s;
}

.quick-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.quick-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.quick-content h4 {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 4px 0;
}

.quick-content p {
  font-size: 13px;
  color: #909399;
  margin: 0;
}

/* 分类标签 */
.tags-label {
  font-size: 14px;
  color: #606266;
  font-weight: 600;
  flex-shrink: 0;
  padding-top: 4px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  flex: 1;
}

.tag-item {
  cursor: pointer;
  transition: all 0.3s;
}

.tag-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 30px;
  padding: 20px 0;
}
</style>
