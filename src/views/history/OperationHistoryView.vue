<template>
  <div class="history-container">
    <header class="history-header">
      <h2 class="title">操作历史</h2>
      <p class="subtitle">查看您的操作记录</p>
    </header>

    <div class="history-list">
      <div v-for="item in history" :key="item.id" class="history-item">
        <div class="item-icon" :class="getOperationClass(item.operation_type)">
          {{ getOperationIcon(item.operation_type) }}
        </div>
        <div class="item-content">
          <div class="item-title">{{ item.operation_type }}</div>
          <div class="item-desc">{{ item.operation_desc }}</div>
          <div class="item-meta">
            <span class="meta-item">🕒 {{ formatTime(item.operation_time) }}</span>
            <span v-if="item.ip_address" class="meta-item">📍 {{ item.ip_address }}</span>
          </div>
        </div>
      </div>
      <div v-if="!history.length && !loading" class="empty">暂无操作记录</div>
    </div>

    <LoadingSpinner v-if="loading" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

import LoadingSpinner from '@/shared/ui/LoadingSpinner.vue'
import { getOperationHistory } from '@/utils/api'
import { toast } from '@/utils/ui/toast'

const loading = ref(false)
const history = ref<any[]>([])

const loadData = async () => {
  loading.value = true
  try {
    const data = await getOperationHistory(10)
    history.value = data || []
  } catch (error: any) {
    toast.error(error?.message || '加载操作历史失败')
  } finally {
    loading.value = false
  }
}

const formatTime = (time: string) => {
  const d = new Date(time)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const getOperationIcon = (type: string) => {
  const icons: any = {
    登录: '🔐',
    注册: '✨',
    修改昵称: '✏️',
    修改简介: '📝',
    修改密码: '🔑',
    上传头像: '📸'
  }
  return icons[type] || '📋'
}

const getOperationClass = (type: string) => {
  if (type === '登录') return 'login'
  if (type === '注册') return 'register'
  if (type.includes('修改')) return 'update'
  return 'default'
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
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.item-icon.login {
  background: #dbeafe;
  color: #1e40af;
}

.item-icon.register {
  background: #fce7f3;
  color: #be123c;
}

.item-icon.update {
  background: #fef3c7;
  color: #92400e;
}

.item-icon.default {
  background: #f3f4f6;
  color: #6b7280;
}

.item-content {
  flex: 1;
}

.item-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
}

.item-desc {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 8px;
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
