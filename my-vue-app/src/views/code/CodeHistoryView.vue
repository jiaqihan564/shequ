<template>
  <div class="code-history-view">
    <h2 class="page-title">代码历史</h2>

    <div class="tabs">
      <button
        :class="['tab', { active: activeTab === 'snippets' }]"
        @click="activeTab = 'snippets'"
      >
        我的代码片段
      </button>
      <button
        :class="['tab', { active: activeTab === 'executions' }]"
        @click="activeTab = 'executions'"
      >
        执行记录
      </button>
    </div>

    <!-- 代码片段列表 -->
    <div v-if="activeTab === 'snippets'" class="content-section">
      <div v-if="snippetsLoading" class="loading">加载中...</div>
      <div v-else-if="snippets.length === 0" class="empty">
        <p>还没有保存的代码片段</p>
        <button class="btn btn-primary" @click="goToEditor">开始编程</button>
      </div>
      <div v-else class="snippets-grid">
        <div v-for="snippet in snippets" :key="snippet.id" class="snippet-card">
          <div class="card-header">
            <h3 class="card-title">{{ snippet.title }}</h3>
            <span class="language-badge">{{ snippet.language }}</span>
          </div>
          <div class="card-meta">
            <span class="meta-item">
              创建: {{ formatDate(snippet.created_at) }}
            </span>
            <span v-if="snippet.is_public" class="public-badge">公开</span>
          </div>
          <div class="card-actions">
            <button class="btn-sm btn-primary" @click="loadSnippet(snippet.id)">
              打开
            </button>
            <button class="btn-sm btn-secondary" @click="shareSnippet(snippet.id)">
              分享
            </button>
            <button class="btn-sm btn-danger" @click="deleteSnippetConfirm(snippet.id)">
              删除
            </button>
          </div>
        </div>
      </div>
      <div v-if="snippetsTotal > 0" class="pagination-container">
        <el-pagination
          v-model:current-page="snippetsPage"
          v-model:page-size="snippetsPageSize"
          :page-sizes="[6, 12, 24, 36]"
          :total="snippetsTotal"
          background
          layout="sizes, prev, pager, next, total"
          @current-change="handleSnippetsPageChange"
          @size-change="handleSnippetsPageSizeChange"
        />
      </div>
    </div>

    <!-- 执行记录列表 -->
    <div v-if="activeTab === 'executions'" class="content-section">
      <div v-if="executionsLoading" class="loading">加载中...</div>
      <div v-else-if="executions.length === 0" class="empty">
        <p>还没有执行记录</p>
      </div>
      <div v-else class="executions-list">
        <div v-for="execution in executions" :key="execution.id" class="execution-card">
          <div class="execution-header">
            <span class="language-badge">{{ execution.language }}</span>
            <span
              :class="[
                'status-badge',
                {
                  success: execution.status === 'success',
                  error: execution.status === 'error',
                  timeout: execution.status === 'timeout'
                }
              ]"
            >
              {{ execution.status }}
            </span>
            <span class="execution-time">{{ formatDate(execution.created_at) }}</span>
          </div>
          <div class="execution-stats">
            <span v-if="execution.execution_time" class="stat">
              耗时: {{ execution.execution_time }}ms
            </span>
          </div>
          <details class="execution-details">
            <summary>查看详情</summary>
            <div class="code-preview">
              <h4>代码:</h4>
              <pre>{{ execution.code }}</pre>
            </div>
            <div v-if="execution.output" class="output-preview">
              <h4>输出:</h4>
              <pre>{{ execution.output }}</pre>
            </div>
            <div v-if="execution.error" class="error-preview">
              <h4>错误:</h4>
              <pre>{{ execution.error }}</pre>
            </div>
          </details>
        </div>
      </div>
      <div v-if="executionsTotal > 0" class="pagination-container">
        <el-pagination
          v-model:current-page="executionsPage"
          v-model:page-size="executionsPageSize"
          :page-sizes="[6, 12, 24, 36]"
          :total="executionsTotal"
          background
          layout="sizes, prev, pager, next, total"
          @current-change="handleExecutionsPageChange"
          @size-change="handleExecutionsPageSizeChange"
        />
      </div>
    </div>

    <!-- 分享对话框 -->
    <div v-if="shareDialogVisible" class="modal-overlay" @click="shareDialogVisible = false">
      <div class="modal-content share-link-modal" @click.stop>
        <h3>🎉 分享链接已生成</h3>
        <p class="share-tip">通过以下链接分享您的代码片段：</p>
        
        <div class="share-link-container">
          <input 
            :value="shareUrl" 
            readonly 
            class="share-input" 
            ref="shareInput"
            @click="selectShareInput"
          />
          <button class="btn btn-primary copy-btn" @click="copyShareLink">
            📋 复制链接
          </button>
        </div>

        <div class="share-actions">
          <button class="btn btn-secondary" @click="openShareLink">
            🔗 在新标签页中打开
          </button>
        </div>

        <div class="modal-footer">
          <button class="btn btn-primary" @click="shareDialogVisible = false">
            完成
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  getSnippets,
  getExecutionHistory,
  getSnippetById,
  deleteSnippet,
  generateShareLink
} from '@/utils/code-api'
import { toast } from '@/utils/toast'
import type { CodeSnippetListItem, CodeExecution } from '@/types/code'

const router = useRouter()
const route = useRoute()

const activeTab = ref<'snippets' | 'executions'>('snippets')

const snippets = ref<CodeSnippetListItem[]>([])
const snippetsLoading = ref(false)
const snippetsPage = ref(1)
const snippetsPageSize = ref(6)
const snippetsTotal = ref(0)

const executions = ref<CodeExecution[]>([])
const executionsLoading = ref(false)
const executionsPage = ref(1)
const executionsPageSize = ref(6)
const executionsTotal = ref(0)

const shareDialogVisible = ref(false)
const shareUrl = ref('')
const shareInput = ref<HTMLInputElement>()

const snippetsTotalPages = computed(() =>
  Math.ceil(snippetsTotal.value / snippetsPageSize.value)
)
const executionsTotalPages = computed(() =>
  Math.ceil(executionsTotal.value / executionsPageSize.value)
)

onMounted(() => {
  const tab = route.query.tab as string
  if (tab === 'executions') {
    activeTab.value = 'executions'
    loadExecutions()
  } else {
    loadSnippets()
  }
})

// 监听 tab 切换，自动加载对应数据
watch(activeTab, (newTab) => {
  if (newTab === 'executions') {
    if (executions.value.length === 0) {
      loadExecutions()
    }
  } else if (newTab === 'snippets') {
    if (snippets.value.length === 0) {
      loadSnippets()
    }
  }
})

async function loadSnippets(page = 1) {
  snippetsLoading.value = true
  try {
    const response = await getSnippets(page, snippetsPageSize.value)
    snippets.value = response.items || []
    snippetsTotal.value = response.total
    snippetsPage.value = page
  } catch (error: any) {
    toast.error('加载代码片段失败: ' + (error.message || '未知错误'))
  } finally {
    snippetsLoading.value = false
  }
}

async function loadExecutions(page = 1) {
  executionsLoading.value = true
  try {
    const response = await getExecutionHistory(page, executionsPageSize.value)
    executions.value = response.items || []
    executionsTotal.value = response.total
    executionsPage.value = page
  } catch (error: any) {
    toast.error('加载执行记录失败: ' + (error.message || '未知错误'))
  } finally {
    executionsLoading.value = false
  }
}

function handleSnippetsPageChange(newPage: number) {
  // 先滚动到顶部，避免滚动时数据变化导致页面撕裂
  window.scrollTo({ top: 0, behavior: 'smooth' })
  loadSnippets(newPage)
}

function handleSnippetsPageSizeChange(newSize: number) {
  // 先滚动到顶部，避免滚动时数据变化导致页面撕裂
  window.scrollTo({ top: 0, behavior: 'smooth' })
  snippetsPageSize.value = newSize
  snippetsPage.value = 1
  loadSnippets(1)
}

function handleExecutionsPageChange(newPage: number) {
  // 先滚动到顶部，避免滚动时数据变化导致页面撕裂
  window.scrollTo({ top: 0, behavior: 'smooth' })
  loadExecutions(newPage)
}

function handleExecutionsPageSizeChange(newSize: number) {
  // 先滚动到顶部，避免滚动时数据变化导致页面撕裂
  window.scrollTo({ top: 0, behavior: 'smooth' })
  executionsPageSize.value = newSize
  executionsPage.value = 1
  loadExecutions(1)
}

async function loadSnippet(id: number) {
  try {
    // 验证代码片段是否存在
    await getSnippetById(id)
    // 跳转到编辑器并加载代码
    router.push({
      path: '/code-editor',
      query: {
        snippet_id: id.toString()
      }
    })
  } catch (error: any) {
    toast.error('加载代码失败: ' + (error.message || '未知错误'))
  }
}

async function shareSnippet(id: number) {
  try {
    const response = await generateShareLink(id)
    // 构建完整的分享链接
    const baseUrl = window.location.origin
    shareUrl.value = `${baseUrl}/code-share/${response.share_token}`
    shareDialogVisible.value = true
  } catch (error: any) {
    toast.error('生成分享链接失败: ' + (error.message || '未知错误'))
  }
}

function selectShareInput() {
  if (shareInput.value) {
    shareInput.value.select()
  }
}

async function copyShareLink() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    toast.success('分享链接已复制到剪贴板')
  } catch (error) {
    // 降级方案：使用传统方法
    if (shareInput.value) {
      shareInput.value.select()
      try {
        document.execCommand('copy')
        toast.success('分享链接已复制到剪贴板')
      } catch (e) {
        toast.error('复制失败，请手动复制链接')
      }
    }
  }
}

function openShareLink() {
  window.open(shareUrl.value, '_blank')
}

async function deleteSnippetConfirm(id: number) {
  if (confirm('确定要删除这个代码片段吗？')) {
    try {
      await deleteSnippet(id)
      toast.success('删除成功')
      loadSnippets(snippetsPage.value)
    } catch (error: any) {
      toast.error('删除失败: ' + (error.message || '未知错误'))
    }
  }
}

function goToEditor() {
  router.push('/code-editor')
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

</script>

<style scoped>
.code-history-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
}

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  border-bottom: 2px solid #f0f0f0;
}

.tab {
  padding: 12px 24px;
  background: transparent;
  border: none;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.3s;
}

.tab:hover {
  color: #1890ff;
}

.tab.active {
  color: #1890ff;
  border-bottom-color: #1890ff;
}

.content-section {
  min-height: 400px;
}

.loading,
.empty {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.empty p {
  margin-bottom: 20px;
  font-size: 16px;
}

.snippets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.snippet-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  transition: box-shadow 0.3s;
}

.snippet-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
  flex: 1;
  margin-right: 8px;
}

.language-badge {
  padding: 4px 8px;
  background: #f0f5ff;
  color: #1890ff;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.card-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #666;
}

.public-badge {
  padding: 2px 6px;
  background: #f6ffed;
  color: #52c41a;
  border-radius: 3px;
  font-size: 12px;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.btn-sm {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: #1890ff;
  color: white;
}

.btn-primary:hover {
  background: #40a9ff;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #d9d9d9;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn-danger {
  background: #ff4d4f;
  color: white;
}

.btn-danger:hover {
  background: #ff7875;
}

.executions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.execution-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
}

.execution-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.success {
  background: #f6ffed;
  color: #52c41a;
}

.status-badge.error {
  background: #fff1f0;
  color: #ff4d4f;
}

.status-badge.timeout {
  background: #fffbe6;
  color: #faad14;
}

.execution-time {
  margin-left: auto;
  font-size: 13px;
  color: #666;
}

.execution-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #666;
}

.execution-details summary {
  cursor: pointer;
  color: #1890ff;
  font-size: 14px;
  user-select: none;
}

.execution-details summary:hover {
  text-decoration: underline;
}

.code-preview,
.output-preview,
.error-preview {
  margin-top: 12px;
}

.code-preview h4,
.output-preview h4,
.error-preview h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #333;
}

.code-preview pre,
.output-preview pre,
.error-preview pre {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.error-preview pre {
  background: #fff1f0;
  color: #ff4d4f;
}

.pagination-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30px 0;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 16px;
}

/* 分享链接对话框样式 */
.share-link-modal {
  max-width: 600px;
}

.share-link-modal h3 {
  color: #52c41a;
  font-size: 20px;
  margin-bottom: 12px;
  text-align: center;
}

.share-tip {
  color: #666;
  margin-bottom: 20px;
  text-align: center;
  font-size: 14px;
}

.share-link-container {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  align-items: stretch;
}

.share-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  font-size: 13px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  color: #1890ff;
  background: #f0f5ff;
  cursor: pointer;
}

.share-input:focus {
  outline: none;
  background: #e6f7ff;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.copy-btn {
  flex-shrink: 0;
  padding: 8px 20px;
  white-space: nowrap;
}

.share-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.share-actions .btn {
  flex: 1;
  font-size: 13px;
}

.modal-footer {
  display: flex;
  justify-content: center;
  gap: 10px;
}

@media (max-width: 768px) {
  .snippets-grid {
    grid-template-columns: 1fr;
  }

  .card-actions {
    flex-wrap: wrap;
  }

  .btn-sm {
    flex: 1;
  }

  /* 移动端分享对话框优化 */
  .share-link-container {
    flex-direction: column;
  }

  .share-input {
    font-size: 12px;
  }

  .copy-btn {
    width: 100%;
  }

  .share-actions {
    flex-direction: column;
  }

  .share-actions .btn {
    width: 100%;
  }
}
</style>


