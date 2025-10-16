<template>
  <div class="stats-container">
    <header class="stats-header">
      <h2 class="title">全站累计数据</h2>
      <p class="subtitle">系统运行以来的累计统计数据</p>
    </header>

    <!-- 用户相关 -->
    <div class="stats-section">
      <h3 class="section-title">👥 用户相关</h3>
      <div class="stats-grid">
        <div v-for="item in data.user" :key="item.stat_key" class="stat-card">
          <div class="card-icon user">{{ getIcon(item.stat_key) }}</div>
          <div class="card-content">
            <div class="card-label">{{ item.stat_desc }}</div>
            <div class="card-value">{{ formatNumber(item.stat_value) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- API相关 -->
    <div class="stats-section">
      <h3 class="section-title">📡 API相关</h3>
      <div class="stats-grid">
        <div v-for="item in data.api" :key="item.stat_key" class="stat-card">
          <div class="card-icon api">{{ getIcon(item.stat_key) }}</div>
          <div class="card-content">
            <div class="card-label">{{ item.stat_desc }}</div>
            <div class="card-value">{{ formatNumber(item.stat_value) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 安全相关 -->
    <div class="stats-section">
      <h3 class="section-title">🔐 安全相关</h3>
      <div class="stats-grid">
        <div v-for="item in data.security" :key="item.stat_key" class="stat-card">
          <div class="card-icon security">{{ getIcon(item.stat_key) }}</div>
          <div class="card-content">
            <div class="card-label">{{ item.stat_desc }}</div>
            <div class="card-value">{{ formatNumber(item.stat_value) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 内容相关 -->
    <div class="stats-section">
      <h3 class="section-title">📁 内容相关</h3>
      <div class="stats-grid">
        <div v-for="item in data.content" :key="item.stat_key" class="stat-card">
          <div class="card-icon content">{{ getIcon(item.stat_key) }}</div>
          <div class="card-content">
            <div class="card-label">{{ item.stat_desc }}</div>
            <div class="card-value">{{ formatNumber(item.stat_value) }}</div>
          </div>
        </div>
      </div>
    </div>

    <LoadingSpinner v-if="loading" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

import LoadingSpinner from '@/shared/ui/LoadingSpinner.vue'
import { getCumulativeStats } from '@/utils/api'
import { toast } from '@/utils/toast'

const loading = ref(false)
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
  } catch (error: any) {
    toast.error(error?.message || '加载累计统计失败')
  } finally {
    loading.value = false
  }
}

const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

const getIcon = (statKey: string) => {
  const icons: any = {
    total_users: '👥',
    total_logins: '🔐',
    total_api_calls: '📡',
    total_uploads: '📁',
    total_password_changes: '🔑',
    total_password_resets: '🔄',
    total_errors: '⚠️'
  }
  return icons[statKey] || '📊'
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.stats-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.stats-header {
  margin-bottom: 32px;
}

.title {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 8px 0;
}

.subtitle {
  color: #6b7280;
  font-size: 14px;
  margin: 0;
}

.stats-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.card-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.card-icon.user {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.card-icon.api {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.card-icon.security {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.card-icon.content {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.card-content {
  flex: 1;
}

.card-label {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 6px;
}

.card-value {
  font-size: 36px;
  font-weight: 700;
  color: #111827;
}
</style>

