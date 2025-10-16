<template>
  <div class="realtime-container">
    <header class="realtime-header">
      <h2 class="title">实时监控</h2>
      <p class="subtitle">系统实时运行状态 · 每5秒自动刷新</p>
      <div class="auto-refresh">
        <span class="refresh-dot" :class="{ active: autoRefresh }"></span>
        <span class="refresh-text">{{ autoRefresh ? '自动刷新中' : '已暂停' }}</span>
      </div>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="card-icon online">👤</div>
        <div class="card-content">
          <div class="card-label">在线用户</div>
          <div class="card-value">{{ metrics.online_users || 0 }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="card-icon qps">⚡</div>
        <div class="card-content">
          <div class="card-label">当前QPS</div>
          <div class="card-value">{{ metrics.current_qps || 0 }}<span class="unit">/s</span></div>
        </div>
      </div>

      <div class="stat-card">
        <div class="card-icon cpu">💻</div>
        <div class="card-content">
          <div class="card-label">CPU使用率</div>
          <div class="card-value">{{ (metrics.system_cpu || 0).toFixed(1) }}<span class="unit">%</span></div>
        </div>
      </div>

      <div class="stat-card">
        <div class="card-icon memory">🧠</div>
        <div class="card-content">
          <div class="card-label">内存使用率</div>
          <div class="card-value">{{ (metrics.system_memory || 0).toFixed(1) }}<span class="unit">%</span></div>
        </div>
      </div>
    </div>

    <div class="status-section">
      <div class="status-card">
        <div class="status-header">
          <h3>服务状态</h3>
          <span class="status-indicator" :class="metrics.service_status">
            <span class="status-dot"></span>
            {{ getStatusText(metrics.service_status) }}
          </span>
        </div>
        <div class="status-info">
          <div class="info-item">
            <span class="info-label">最后错误时间：</span>
            <span class="info-value">{{ metrics.last_error_time || '无' }}</span>
          </div>
        </div>
      </div>
    </div>

    <LoadingSpinner v-if="loading" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

import LoadingSpinner from '@/shared/ui/LoadingSpinner.vue'
import { getRealtimeMetrics } from '@/utils/api'
import { toast } from '@/utils/toast'

const loading = ref(false)
const autoRefresh = ref(true)
const metrics = ref<any>({})
let refreshTimer: any = null

const loadData = async () => {
  try {
    const data = await getRealtimeMetrics()
    metrics.value = data || {}
  } catch (error: any) {
    if (autoRefresh.value) {
      toast.error(error?.message || '加载实时指标失败')
    }
  }
}

const startAutoRefresh = () => {
  loadData()
  refreshTimer = setInterval(() => {
    if (autoRefresh.value) {
      loadData()
    }
  }, 5000) // 每5秒刷新
}

const getStatusText = (status: string) => {
  const statusMap: any = {
    running: '运行中',
    stopped: '已停止',
    error: '错误',
    starting: '启动中'
  }
  return statusMap[status] || '未知'
}

onMounted(() => {
  loading.value = true
  loadData().finally(() => {
    loading.value = false
  })
  startAutoRefresh()
})

onBeforeUnmount(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.realtime-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.realtime-header {
  margin-bottom: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.auto-refresh {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f3f4f6;
  border-radius: 20px;
}

.refresh-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9ca3af;
}

.refresh-dot.active {
  background: #10b981;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.refresh-text {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.card-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.card-content {
  flex: 1;
}

.card-label {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 4px;
}

.card-value {
  font-size: 32px;
  font-weight: 700;
  color: #111827;
}

.unit {
  font-size: 16px;
  font-weight: 400;
  color: #6b7280;
  margin-left: 4px;
}

.status-section {
  margin-bottom: 24px;
}

.status-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.status-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.status-indicator.running {
  background: #d1fae5;
  color: #065f46;
}

.status-indicator.stopped {
  background: #fee2e2;
  color: #991b1b;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-label {
  font-size: 14px;
  color: #6b7280;
  margin-right: 8px;
}

.info-value {
  font-size: 14px;
  color: #111827;
  font-weight: 500;
}
</style>

