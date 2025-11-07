<template>
  <div class="history-container">
    <header class="history-header">
      <h2 class="title">资料修改历史</h2>
      <p class="subtitle">查看您的资料变更记录</p>
    </header>

    <div class="history-list">
      <div v-for="item in history" :key="item.id" class="history-item">
        <div class="item-icon">
          {{ getFieldIcon(item.field_name) }}
        </div>
        <div class="item-content">
          <div class="item-title">{{ getFieldLabel(item.field_name) }}</div>
          <div class="item-change">
            <div class="change-row">
              <span class="change-label">修改前:</span>
              <span class="change-value old">{{ item.old_value || '（空）' }}</span>
            </div>
            <div class="change-arrow">→</div>
            <div class="change-row">
              <span class="change-label">修改后:</span>
              <span class="change-value new">{{ item.new_value || '（空）' }}</span>
            </div>
          </div>
          <div class="item-meta">
            <span class="meta-item">🕒 {{ formatTime(item.change_time) }}</span>
            <span v-if="item.ip_address" class="meta-item">📍 {{ item.ip_address }}</span>
          </div>
        </div>
      </div>
      <div v-if="!history.length && !loading" class="empty">暂无修改记录</div>
    </div>

    <LoadingSpinner v-if="loading" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

import LoadingSpinner from '@/shared/ui/LoadingSpinner.vue'
import { getProfileChangeHistory } from '@/utils/api'
import { toast } from '@/utils/toast'

const loading = ref(false)
const history = ref<any[]>([])

const loadData = async () => {
  loading.value = true
  try {
    const data = await getProfileChangeHistory(10)
    history.value = data || []
  } catch (error: any) {
    toast.error(error?.message || '加载修改历史失败')
  } finally {
    loading.value = false
  }
}

const formatTime = (time: string) => {
  const d = new Date(time)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const getFieldLabel = (fieldName: string) => {
  const labels: any = {
    nickname: '昵称',
    bio: '个人简介',
    avatar: '头像',
    email: '邮箱',
    phone: '手机号'
  }
  return labels[fieldName] || fieldName
}

const getFieldIcon = (fieldName: string) => {
  const icons: any = {
    nickname: '👤',
    bio: '📝',
    avatar: '📸',
    email: '📧',
    phone: '📱'
  }
  return icons[fieldName] || '📋'
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
  background: linear-gradient(135deg, #183cd9, #764ba2);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
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
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.item-content {
  flex: 1;
}

.item-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 12px;
}

.item-change {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.change-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.change-label {
  font-size: 13px;
  color: #9ca3af;
}

.change-value {
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 4px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.change-value.old {
  background: #fee2e2;
  color: #991b1b;
}

.change-value.new {
  background: #d1fae5;
  color: #065f46;
}

.change-arrow {
  font-size: 18px;
  color: #667eea;
  font-weight: bold;
}

.item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.meta-item {
  font-size: 13px;
  color: #9ca3af;
}

.empty {
  text-align: center;
  color: #9ca3af;
  padding: 60px 20px;
  font-size: 14px;
}
</style>
