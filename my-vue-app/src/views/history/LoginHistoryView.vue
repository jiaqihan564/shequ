<template>
  <div class="history-container">
    <header class="history-header">
      <h2 class="title">登录历史</h2>
      <p class="subtitle">查看您的登录记录</p>
    </header>

    <div class="history-list">
      <div v-for="item in history" :key="item.id" class="history-item">
        <div class="item-icon" :class="item.login_status === 1 ? 'success' : 'failed'">
          {{ item.login_status === 1 ? '✓' : '✗' }}
        </div>
        <div class="item-content">
          <div class="item-title">
            {{ item.login_status === 1 ? '登录成功' : '登录失败' }}
          </div>
          <div class="item-meta">
            <span class="meta-item">🕒 {{ formatTime(item.login_time) }}</span>
            <span class="meta-item">📍 {{ item.login_ip || '未知' }}</span>
            <span v-if="item.user_agent" class="meta-item">💻 {{ parseUserAgent(item.user_agent) }}</span>
          </div>
        </div>
      </div>
      <div v-if="!history.length && !loading" class="empty">暂无登录记录</div>
    </div>

    <LoadingSpinner v-if="loading" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

import LoadingSpinner from '@/shared/ui/LoadingSpinner.vue'
import { getLoginHistory } from '@/utils/api'
import { toast } from '@/utils/toast'

const loading = ref(false)
const history = ref<any[]>([])

const loadData = async () => {
  loading.value = true
  try {
    const data = await getLoginHistory(50)
    history.value = data || []
  } catch (error: any) {
    toast.error(error?.message || '加载登录历史失败')
  } finally {
    loading.value = false
  }
}

const formatTime = (time: string) => {
  const d = new Date(time)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const parseUserAgent = (ua: string) => {
  if (!ua) return '未知设备'
  if (ua.includes('Chrome')) return 'Chrome浏览器'
  if (ua.includes('Firefox')) return 'Firefox浏览器'
  if (ua.includes('Safari')) return 'Safari浏览器'
  if (ua.includes('Edge')) return 'Edge浏览器'
  return '其他浏览器'
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.history-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

.history-header {
  margin-bottom: 24px;
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

.history-list {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.history-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid #f3f4f6;
}

.history-item:last-child {
  border-bottom: none;
}

.item-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  flex-shrink: 0;
}

.item-icon.success {
  background: #d1fae5;
  color: #10b981;
}

.item-icon.failed {
  background: #fee2e2;
  color: #ef4444;
}

.item-content {
  flex: 1;
}

.item-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
}

.item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.meta-item {
  font-size: 13px;
  color: #6b7280;
}

.empty {
  text-align: center;
  color: #9ca3af;
  padding: 60px 20px;
  font-size: 14px;
}
</style>

