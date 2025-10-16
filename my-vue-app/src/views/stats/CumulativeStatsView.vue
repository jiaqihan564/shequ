<template>
  <div class="cumulative-stats-container">
    <!-- 页面头部 -->
    <el-card class="header-card" shadow="never">
      <div class="page-header">
        <div>
          <h1 class="page-title">全站累计统计</h1>
          <p class="page-subtitle">系统运行以来的累计统计数据</p>
        </div>
        <el-button :icon="Refresh" @click="loadData" :loading="loading">
          刷新数据
        </el-button>
      </div>
      <div v-if="lastUpdateTime" class="update-time">
        <el-text type="info" size="small">
          <el-icon><Clock /></el-icon>
          最后更新：{{ lastUpdateTime }}
        </el-text>
      </div>
    </el-card>

    <!-- 加载骨架屏 -->
    <el-skeleton v-if="loading" :rows="6" animated />

    <!-- 数据展示 -->
    <div v-else>
      <!-- 用户数据 -->
      <el-card class="stats-section-card" shadow="hover">
        <template #header>
          <div class="section-header">
            <h3 class="section-title">
              <el-icon color="#409eff"><User /></el-icon>
              用户数据
            </h3>
          </div>
        </template>
        <el-row :gutter="20">
          <el-col
            v-for="item in data.user"
            :key="item.stat_key"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6"
          >
            <el-statistic
              :value="item.stat_value"
              :title="item.stat_desc"
            >
              <template #prefix>
                <el-icon :style="{ color: getUserColor(item.stat_key) }">
                  <component :is="getUserIcon(item.stat_key)" />
                </el-icon>
              </template>
            </el-statistic>
          </el-col>
        </el-row>
      </el-card>

      <!-- API数据 -->
      <el-card class="stats-section-card" shadow="hover">
        <template #header>
          <div class="section-header">
            <h3 class="section-title">
              <el-icon color="#67c23a"><DataAnalysis /></el-icon>
              API数据
            </h3>
          </div>
        </template>
        <el-row :gutter="20">
          <el-col
            v-for="item in data.api"
            :key="item.stat_key"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6"
          >
            <el-statistic
              :value="item.stat_value"
              :title="item.stat_desc"
            >
              <template #prefix>
                <el-icon :style="{ color: getApiColor(item.stat_key) }">
                  <component :is="getApiIcon(item.stat_key)" />
                </el-icon>
              </template>
            </el-statistic>
          </el-col>
        </el-row>
      </el-card>

      <!-- 安全数据 -->
      <el-card class="stats-section-card" shadow="hover">
        <template #header>
          <div class="section-header">
            <h3 class="section-title">
              <el-icon color="#f56c6c"><Lock /></el-icon>
              安全数据
            </h3>
          </div>
        </template>
        <el-row :gutter="20">
          <el-col
            v-for="item in data.security"
            :key="item.stat_key"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6"
          >
            <el-statistic
              :value="item.stat_value"
              :title="item.stat_desc"
            >
              <template #prefix>
                <el-icon :style="{ color: getSecurityColor(item.stat_key) }">
                  <component :is="getSecurityIcon(item.stat_key)" />
                </el-icon>
              </template>
            </el-statistic>
          </el-col>
        </el-row>
      </el-card>

      <!-- 内容数据 -->
      <el-card v-if="data.content && data.content.length > 0" class="stats-section-card" shadow="hover">
        <template #header>
          <div class="section-header">
            <h3 class="section-title">
              <el-icon color="#e6a23c"><Document /></el-icon>
              内容数据
            </h3>
          </div>
        </template>
        <el-row :gutter="20">
          <el-col
            v-for="item in data.content"
            :key="item.stat_key"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6"
          >
            <el-statistic
              :value="item.stat_value"
              :title="item.stat_desc"
            >
              <template #prefix>
                <el-icon :style="{ color: getContentColor(item.stat_key) }">
                  <component :is="getContentIcon(item.stat_key)" />
                </el-icon>
              </template>
            </el-statistic>
          </el-col>
        </el-row>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  Refresh, Clock, User, DataAnalysis, Lock, Document,
  UserFilled, Key, Connection, Upload, EditPen, Warning
} from '@element-plus/icons-vue'
import { getCumulativeStats } from '@/utils/api'
import toast from '@/utils/toast'

const loading = ref(false)
const lastUpdateTime = ref('')
const data = ref<any>({
  user: [],
  api: [],
  security: [],
  content: []
})

const loadData = async () => {
  loading.value = true
  try {
    const result = await getCumulativeStats()
    data.value = result || { user: [], api: [], security: [], content: [] }
    lastUpdateTime.value = new Date().toLocaleString('zh-CN')
  } catch (error: any) {
    toast.error(error?.message || '加载累计统计失败')
  } finally {
    loading.value = false
  }
}

// 用户数据图标和颜色
function getUserIcon(statKey: string) {
  const icons: any = {
    total_users: UserFilled,
    total_logins: Key,
    active_users: User
  }
  return icons[statKey] || UserFilled
}

function getUserColor(statKey: string) {
  return '#409eff'
}

// API数据图标和颜色
function getApiIcon(statKey: string) {
  const icons: any = {
    total_api_calls: Connection,
    total_uploads: Upload,
    api_success: DataAnalysis,
    api_errors: Warning
  }
  return icons[statKey] || Connection
}

function getApiColor(statKey: string) {
  if (statKey.includes('error')) return '#f56c6c'
  return '#67c23a'
}

// 安全数据图标和颜色
function getSecurityIcon(statKey: string) {
  const icons: any = {
    total_password_changes: EditPen,
    total_password_resets: Key,
    security_events: Lock
  }
  return icons[statKey] || Lock
}

function getSecurityColor(statKey: string) {
  if (statKey.includes('error') || statKey.includes('fail')) return '#f56c6c'
  return '#e6a23c'
}

// 内容数据图标和颜色
function getContentIcon(statKey: string) {
  return Document
}

function getContentColor(statKey: string) {
  return '#409eff'
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.cumulative-stats-container {
  max-width: 1400px;
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
  margin-bottom: 12px;
}

.page-title {
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

.update-time {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.stats-section-card {
  margin-bottom: 20px;
  border-radius: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

/* Statistic 组件样式优化 */
:deep(.el-statistic) {
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  text-align: center;
  transition: all 0.3s;
}

:deep(.el-statistic:hover) {
  background: #ecf5ff;
  transform: translateY(-2px);
}

:deep(.el-statistic__head) {
  font-size: 14px;
  color: #606266;
  margin-bottom: 12px;
}

:deep(.el-statistic__content) {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
}

:deep(.el-statistic .el-icon) {
  font-size: 24px;
  margin-right: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .cumulative-stats-container {
    padding: 10px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .page-title {
    font-size: 24px;
  }
}
</style>
