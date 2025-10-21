<template>
  <div class="output-panel">
    <div class="output-header">
      <div class="output-tabs">
        <button
          :class="['tab', { active: activeTab === 'output' }]"
          @click="activeTab = 'output'"
        >
          输出
        </button>
        <button :class="['tab', { active: activeTab === 'error' }]" @click="activeTab = 'error'">
          错误
        </button>
      </div>
      <div v-if="executionTime !== null || memoryUsage !== null" class="stats">
        <span v-if="executionTime !== null" class="stat-item">
          <span class="stat-label">执行时间:</span>
          <span class="stat-value">{{ executionTime }}ms</span>
        </span>
        <span v-if="memoryUsage !== null" class="stat-item">
          <span class="stat-label">内存:</span>
          <span class="stat-value">{{ formatMemory(memoryUsage) }}</span>
        </span>
        <span class="stat-item">
          <span
            :class="[
              'status-badge',
              {
                success: status === 'success',
                error: status === 'error',
                timeout: status === 'timeout'
              }
            ]"
          >
            {{ statusText }}
          </span>
        </span>
      </div>
    </div>
    <div class="output-content">
      <div v-if="activeTab === 'output'" class="output-text">
        <pre v-if="output">{{ output }}</pre>
        <div v-else class="placeholder">运行代码后将在此处显示输出结果</div>
      </div>
      <div v-else class="error-text">
        <pre v-if="error" class="error-content">{{ error }}</pre>
        <div v-else class="placeholder">无错误信息</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  output?: string
  error?: string
  executionTime?: number | null
  memoryUsage?: number | null
  status?: 'success' | 'error' | 'timeout'
}

const props = withDefaults(defineProps<Props>(), {
  output: '',
  error: '',
  executionTime: null,
  memoryUsage: null,
  status: 'success'
})

const activeTab = ref<'output' | 'error'>('output')

const statusText = computed(() => {
  switch (props.status) {
    case 'success':
      return '成功'
    case 'error':
      return '错误'
    case 'timeout':
      return '超时'
    default:
      return '未知'
  }
})

function formatMemory(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}
</script>

<style scoped>
.output-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 4px;
  overflow: hidden;
}

.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #252526;
  border-bottom: 1px solid #3e3e42;
}

.output-tabs {
  display: flex;
  gap: 4px;
}

.tab {
  padding: 6px 12px;
  background: transparent;
  border: none;
  color: #d4d4d4;
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
  transition: background-color 0.2s;
}

.tab:hover {
  background: #2a2d2e;
}

.tab.active {
  background: #1e1e1e;
  color: #ffffff;
}

.stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-label {
  color: #858585;
}

.stat-value {
  color: #4ec9b0;
  font-weight: 500;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
}

.status-badge.success {
  background: #1a7f37;
  color: #ffffff;
}

.status-badge.error {
  background: #da3633;
  color: #ffffff;
}

.status-badge.timeout {
  background: #f0ad4e;
  color: #000000;
}

.output-content {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

.output-text pre,
.error-text pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.error-content {
  color: #f48771;
}

.placeholder {
  color: #858585;
  font-style: italic;
  text-align: center;
  padding: 24px;
}
</style>


