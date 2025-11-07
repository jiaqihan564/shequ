<template>
  <div class="code-square-view">
    <div class="page-header">
      <div>
        <h2 class="page-title">代码广场</h2>
        <p class="page-subtitle">探索公开分享的代码片段</p>
      </div>
      <button class="btn btn-primary" @click="$router.push('/code-editor')">新建代码</button>
    </div>

    <!-- 筛选器 -->
    <div class="filters-section">
      <div class="filter-group">
        <label class="filter-label">编程语言：</label>
        <div class="language-filters">
          <button
            :class="['filter-btn', { active: selectedLanguage === '' }]"
            @click="filterByLanguage('')"
          >
            全部
          </button>
          <button
            v-for="lang in languages"
            :key="lang"
            :class="['filter-btn', { active: selectedLanguage === lang }]"
            @click="filterByLanguage(lang)"
          >
            {{ getLanguageDisplayName(lang) }}
          </button>
        </div>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading">加载中...</div>

    <!-- 空状态 -->
    <div v-else-if="snippets.length === 0" class="empty">
      <p>暂无公开的代码片段</p>
      <button class="btn btn-primary" @click="$router.push('/code-editor')">
        创建第一个公开代码
      </button>
    </div>

    <!-- 代码片段列表 -->
    <div v-else class="snippets-grid">
      <div v-for="snippet in snippets" :key="snippet.id" class="snippet-card">
        <div class="card-header">
          <div class="header-top">
            <h3 class="snippet-title" @click="viewSnippet(snippet)">{{ snippet.title }}</h3>
            <span class="author-badge">@{{ snippet.username }}</span>
          </div>
          <div class="header-bottom">
            <span class="language-badge">{{ getLanguageDisplayName(snippet.language) }}</span>
            <span class="time-badge">{{ formatDate(snippet.created_at) }}</span>
          </div>
        </div>

        <div v-if="snippet.description" class="snippet-description">
          {{ snippet.description }}
        </div>

        <div class="code-preview">
          <div class="code-header">
            <span class="code-icon">📝</span>
            <span class="code-label">代码预览</span>
          </div>
          <pre><code>{{ getCodePreview(snippet.code) }}</code></pre>
        </div>

        <div class="card-footer">
          <div class="card-actions">
            <button class="action-btn run-btn" title="运行代码" @click="runSnippet(snippet)">
              <span class="btn-icon">▶️</span>
              <span class="btn-text">运行</span>
            </button>
            <button class="action-btn view-btn" title="查看完整代码" @click="viewSnippet(snippet)">
              <span class="btn-icon">👁️</span>
              <span class="btn-text">查看</span>
            </button>
            <button class="action-btn fork-btn" title="复制到编辑器" @click="forkSnippet(snippet)">
              <span class="btn-icon">📋</span>
              <span class="btn-text">复制</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="total > 0" class="pagination-container">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[6, 12, 24, 36]"
        :total="total"
        background
        layout="sizes, prev, pager, next, total"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>

    <!-- 运行代码对话框 -->
    <div v-if="runDialogVisible" class="modal-overlay" @click="closeRunDialog">
      <div class="modal-content run-modal" @click.stop>
        <div class="modal-header">
          <h3>运行代码: {{ currentRunSnippet?.title }}</h3>
          <button class="close-btn" @click="closeRunDialog">×</button>
        </div>

        <div class="run-dialog-body">
          <!-- 代码显示 -->
          <div class="section">
            <label class="section-label">代码 ({{ currentRunSnippet?.language }})</label>
            <div class="code-display">
              <pre><code>{{ currentRunSnippet?.code }}</code></pre>
            </div>
          </div>

          <!-- 标准输入 -->
          <div class="section">
            <label class="section-label">标准输入 (可选)</label>
            <textarea
              v-model="stdin"
              class="stdin-input"
              placeholder="在此输入程序需要的标准输入..."
              rows="4"
            ></textarea>
          </div>

          <!-- 输出结果 -->
          <div v-if="executionResult" class="section">
            <label class="section-label">
              输出结果
              <div class="execution-stats">
                <span v-if="executionResult.execution_time" class="stat-badge time-stat">
                  ⏱️ {{ executionResult.execution_time }}ms
                </span>
                <span :class="['stat-badge', 'status-stat', executionResult.status]">
                  {{ getStatusText(executionResult.status) }}
                </span>
              </div>
            </label>
            <div :class="['output-display', executionResult.status]">
              <pre v-if="executionResult.output">{{ executionResult.output }}</pre>
              <pre v-if="executionResult.error" class="error-text">{{ executionResult.error }}</pre>
              <div v-if="!executionResult.output && !executionResult.error" class="empty-output">
                无输出
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeRunDialog">关闭</button>
          <button class="btn btn-primary" :disabled="isRunning" @click="executeCurrentCode">
            {{ isRunning ? '运行中...' : '运行代码' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import type { CodeSnippetWithUser, ExecuteCodeResponse } from '@/types/code'
import { getPublicSnippets, executeCode } from '@/utils/code-api'
import { toast } from '@/utils/toast'

const router = useRouter()

const snippets = ref<CodeSnippetWithUser[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(6)
const total = ref(0)
const selectedLanguage = ref('')

// 运行对话框相关
const runDialogVisible = ref(false)
const currentRunSnippet = ref<CodeSnippetWithUser | null>(null)
const stdin = ref('')
const executionResult = ref<ExecuteCodeResponse | null>(null)
const isRunning = ref(false)

// 所有支持的语言列表（共15种）
const languages = [
  'python',
  'javascript',
  'java',
  'cpp',
  'c',
  'go',
  'rust',
  'php',
  'ruby',
  'swift',
  'bash',
  'lua',
  'scala',
  'haskell',
  'perl'
]

onMounted(() => {
  loadSnippets()
})

async function loadSnippets() {
  loading.value = true
  try {
    const response = await getPublicSnippets(
      page.value,
      pageSize.value,
      selectedLanguage.value || undefined
    )
    snippets.value = response.items || []
    total.value = response.total
  } catch (error: any) {
    toast.error('加载公开代码片段失败: ' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

function filterByLanguage(language: string) {
  // 先滚动到顶部，避免数据变化导致的视觉问题
  window.scrollTo({ top: 0, behavior: 'smooth' })
  selectedLanguage.value = language
  page.value = 1 // 重置到第一页
  loadSnippets()
}

function handlePageChange(newPage: number) {
  // 先滚动到顶部，避免滚动时数据变化导致页面撕裂
  window.scrollTo({ top: 0, behavior: 'smooth' })
  // 然后更新页码并加载数据
  page.value = newPage
  loadSnippets()
}

function handleSizeChange(newSize: number) {
  // 先滚动到顶部，避免滚动时数据变化导致页面撕裂
  window.scrollTo({ top: 0, behavior: 'smooth' })
  pageSize.value = newSize
  page.value = 1
  loadSnippets()
}

function viewSnippet(snippet: CodeSnippetWithUser) {
  if (snippet.share_token) {
    router.push(`/code-share/${snippet.share_token}`)
  } else {
    toast.warning('该代码片段尚未生成分享链接')
  }
}

function forkSnippet(snippet: CodeSnippetWithUser) {
  router.push({
    path: '/code-editor',
    query: {
      fork: 'true',
      language: snippet.language,
      code: encodeURIComponent(snippet.code),
      title: encodeURIComponent(`Fork: ${snippet.title}`)
    }
  })
}

function getCodePreview(code: string): string {
  const lines = code.split('\n')
  const previewLines = lines.slice(0, 10)
  if (lines.length > 10) {
    previewLines.push('...')
  }
  return previewLines.join('\n')
}

function getLanguageDisplayName(lang: string): string {
  const displayNames: Record<string, string> = {
    python: 'Python',
    javascript: 'JavaScript',
    java: 'Java',
    cpp: 'C++',
    c: 'C',
    go: 'Go',
    rust: 'Rust',
    php: 'PHP',
    ruby: 'Ruby',
    swift: 'Swift',
    bash: 'Bash',
    lua: 'Lua',
    scala: 'Scala',
    haskell: 'Haskell',
    perl: 'Perl'
  }
  return displayNames[lang] || lang
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60))
      return minutes <= 1 ? '刚刚' : `${minutes}分钟前`
    }
    return `${hours}小时前`
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }
}

function getStatusText(status: 'success' | 'error' | 'timeout'): string {
  switch (status) {
    case 'success':
      return '✅ 成功'
    case 'error':
      return '❌ 错误'
    case 'timeout':
      return '⏰ 超时'
    default:
      return '未知'
  }
}

function runSnippet(snippet: CodeSnippetWithUser) {
  currentRunSnippet.value = snippet
  stdin.value = ''
  executionResult.value = null
  runDialogVisible.value = true
}

async function executeCurrentCode() {
  if (!currentRunSnippet.value) return

  isRunning.value = true
  executionResult.value = null

  try {
    const result = await executeCode({
      language: currentRunSnippet.value.language,
      code: currentRunSnippet.value.code,
      stdin: stdin.value
    })
    executionResult.value = result

    if (result.status === 'success') {
      toast.success('代码执行成功')
    } else if (result.status === 'error') {
      toast.warning('代码执行出错')
    }
  } catch (error: any) {
    toast.error('执行失败: ' + (error.message || '未知错误'))
    executionResult.value = {
      output: '',
      error: error.message || '执行失败',
      execution_time: 0,
      status: 'error'
    }
  } finally {
    isRunning.value = false
  }
}

function closeRunDialog() {
  runDialogVisible.value = false
  currentRunSnippet.value = null
  stdin.value = ''
  executionResult.value = null
}
</script>

<style scoped>
.code-square-view {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.filters-section {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-label {
  font-weight: 600;
  color: #374151;
  font-size: 14px;
  margin-bottom: 4px;
}

.language-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.filter-btn {
  padding: 6px 16px;
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  color: #374151;
  font-weight: 500;
  white-space: nowrap;
}

.filter-btn:hover {
  border-color: #9ca3af;
  background: #f9fafb;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.filter-btn.active {
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  border-color: #4f46e5;
  color: #fff;
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3);
}

.loading,
.empty {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.empty {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.empty p {
  margin-bottom: 20px;
  font-size: 16px;
}

.snippets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
  gap: 24px;
  margin-bottom: 30px;
}

@media (max-width: 768px) {
  .snippets-grid {
    grid-template-columns: 1fr;
  }
}

.snippet-card {
  background: linear-gradient(to bottom, #ffffff 0%, #fafbfc 100%);
  border-radius: 16px;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.snippet-card:hover {
  box-shadow: 0 8px 24px rgba(79, 70, 229, 0.15);
  transform: translateY(-4px);
  border-color: #c7d2fe;
}

.card-header {
  padding: 20px 20px 16px 20px;
  background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
  border-bottom: 2px solid #f0f1f5;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.snippet-title {
  font-size: 19px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  cursor: pointer;
  transition: all 0.2s;
  word-break: break-word;
  flex: 1;
  line-height: 1.4;
}

.snippet-title:hover {
  color: #4f46e5;
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}

.author-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  color: #fff;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
}

.header-bottom {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.language-badge {
  display: inline-flex;
  align-items: center;
  padding: 5px 14px;
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
  color: #4338ca;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: 1.5px solid #c7d2fe;
}

.time-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.snippet-description {
  color: #4b5563;
  font-size: 14px;
  line-height: 1.7;
  padding: 0 20px 12px 20px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-weight: 400;
}

.code-preview {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  margin: 0 20px 16px 20px;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid #334155;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  height: 280px;
}

.code-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(51, 65, 85, 0.5);
  border-bottom: 1px solid #475569;
  flex-shrink: 0;
}

.code-icon {
  font-size: 14px;
}

.code-label {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.code-preview pre {
  margin: 0;
  padding: 16px;
  overflow: auto;
  flex: 1;
  min-height: 0;
}

.code-preview code {
  color: #e2e8f0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.7;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.code-preview pre::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.code-preview pre::-webkit-scrollbar-track {
  background: #0f172a;
}

.code-preview pre::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 4px;
}

.code-preview pre::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

.card-footer {
  padding: 16px 20px;
  background: #fafbfc;
  border-top: 1px solid #e5e7eb;
}

.card-actions {
  display: flex;
  gap: 10px;
  justify-content: stretch;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.action-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition:
    width 0.3s,
    height 0.3s;
}

.action-btn:hover::before {
  width: 200px;
  height: 200px;
}

.btn-icon {
  font-size: 16px;
  position: relative;
  z-index: 1;
}

.btn-text {
  position: relative;
  z-index: 1;
}

.run-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #fff;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
}

.run-btn:hover {
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
  transform: translateY(-2px);
}

.view-btn {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: #fff;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);
}

.view-btn:hover {
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  transform: translateY(-2px);
}

.fork-btn {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #fff;
  box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);
}

.fork-btn:hover {
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
  transform: translateY(-2px);
}

.action-btn:active {
  transform: translateY(0);
}

.pagination-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30px 0;
}

/* 按钮样式 */
.btn,
.btn-sm {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

.btn-primary,
.btn-sm.btn-primary {
  background: #4f46e5;
  color: #fff;
}

.btn-primary:hover,
.btn-sm.btn-primary:hover {
  background: #4338ca;
}

.btn-secondary,
.btn-sm.btn-secondary {
  background: #fff;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover,
.btn-sm.btn-secondary:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.btn:disabled,
.btn-sm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-success,
.btn-sm.btn-success {
  background: #10b981;
  color: #fff;
}

.btn-success:hover,
.btn-sm.btn-success:hover {
  background: #059669;
}

/* 运行对话框样式 */
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
  padding: 20px;
}

.modal-content {
  background: #fff;
  border-radius: 12px;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.run-modal {
  max-width: 1000px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  color: #9ca3af;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.run-dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.section {
  margin-bottom: 20px;
}

.section:last-child {
  margin-bottom: 0;
}

.section-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
  font-size: 14px;
}

.execution-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.stat-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.time-stat {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1e40af;
  border: 1px solid #93c5fd;
}

.status-stat {
  font-weight: 700;
}

.status-stat.success {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #065f46;
  border: 1px solid #6ee7b7;
}

.status-stat.error {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #991b1b;
  border: 1px solid #fca5a5;
}

.status-stat.timeout {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
  border: 1px solid #fcd34d;
}

.code-display {
  background: #1e293b;
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  max-height: 300px;
}

.code-display pre {
  margin: 0;
}

.code-display code {
  color: #e2e8f0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.stdin-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  resize: vertical;
  transition: border-color 0.2s;
}

.stdin-input:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.output-display {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.output-display.success {
  background: #f0fdf4;
  border-color: #86efac;
}

.output-display.error {
  background: #fef2f2;
  border-color: #fca5a5;
}

.output-display pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: #1f2937;
}

.error-text {
  color: #dc2626 !important;
}

.empty-output {
  color: #9ca3af;
  font-style: italic;
  text-align: center;
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
}

@media (max-width: 768px) {
  .code-square-view {
    padding: 12px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .page-header .btn {
    width: 100%;
  }

  .filters-section {
    padding: 16px;
  }

  .filter-btn {
    font-size: 12px;
    padding: 5px 12px;
  }

  .card-actions {
    flex-direction: column;
    gap: 8px;
  }

  .action-btn {
    width: 100%;
  }

  .btn-icon {
    font-size: 18px;
  }

  .btn-text {
    font-size: 14px;
  }

  .modal-content {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .run-dialog-body {
    padding: 16px;
  }
}
</style>
