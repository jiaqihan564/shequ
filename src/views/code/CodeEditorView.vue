<template>
  <div class="code-editor-view">
    <div class="editor-header">
      <h2 class="page-title">在线代码编辑器</h2>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="showSnippets">我的代码</button>
        <button class="btn btn-secondary" @click="showHistory">执行历史</button>
      </div>
    </div>

    <div class="editor-container">
      <div class="editor-toolbar">
        <LanguageSelector
          v-model="selectedLanguage"
          class="language-selector"
          @change="onLanguageChange"
        />
        <CodeExampleSelector
          :language="selectedLanguage"
          :current-code="code"
          class="example-selector"
          @load-example="handleLoadExample"
        />
        <div class="toolbar-actions">
          <button class="btn btn-sm btn-secondary" @click="clearCode">清空</button>
          <button class="btn btn-sm btn-primary" :disabled="isRunning" @click="runCode">
            {{ isRunning ? '运行中...' : '运行代码 (Ctrl+Enter)' }}
          </button>
          <button class="btn btn-sm btn-success" @click="showSaveDialog">保存</button>
        </div>
      </div>

      <div class="editor-workspace">
        <div class="editor-panel">
          <div class="panel-header">
            <h3>代码编辑器</h3>
          </div>
          <MonacoEditor
            v-model="code"
            :language="monacoLanguage"
            theme="vs-dark"
            class="code-editor"
          />
        </div>

        <div class="stdin-panel">
          <div class="panel-header">
            <h3>标准输入 (stdin)</h3>
          </div>
          <textarea
            v-model="stdin"
            class="stdin-input"
            placeholder="在此输入程序需要的标准输入（可选）"
          ></textarea>
        </div>
      </div>

      <div class="output-section">
        <OutputPanel
          :output="output"
          :error="errorMessage"
          :execution-time="executionTime"
          :status="executionStatus"
        />
      </div>
    </div>

    <!-- 保存对话框 -->
    <div v-if="showSave" class="modal-overlay" @click="showSave = false">
      <div class="modal-content" @click.stop>
        <h3>保存代码片段</h3>
        <form @submit.prevent="saveCode">
          <div class="form-group">
            <label>标题 *</label>
            <input v-model="saveTitle" type="text" required class="form-input" />
          </div>
          <div class="form-group">
            <label>描述</label>
            <textarea v-model="saveDescription" class="form-input" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input v-model="saveIsPublic" type="checkbox" />
              公开分享（保存后自动生成分享链接）
            </label>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showSave = false">取消</button>
            <button type="submit" class="btn btn-primary">保存</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 分享链接对话框 -->
    <div v-if="showShareLink" class="modal-overlay" @click="showShareLink = false">
      <div class="modal-content share-link-modal" @click.stop>
        <h3>🎉 分享链接已生成</h3>
        <p class="share-tip">您的代码片段已公开，可以通过以下链接分享：</p>

        <div class="share-link-container">
          <input
            :value="shareLink"
            readonly
            class="form-input share-link-input"
            @click="selectShareLink"
          />
          <button class="btn btn-primary copy-btn" @click="copyShareLink">📋 复制链接</button>
        </div>

        <div class="share-actions">
          <button class="btn btn-secondary" @click="openShareLink">🔗 在新标签页中打开</button>
          <button class="btn btn-secondary" @click="viewMySnippets">📚 查看我的代码</button>
        </div>

        <div class="modal-actions">
          <button class="btn btn-primary" @click="showShareLink = false">完成</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

import CodeExampleSelector from '@/components/code/CodeExampleSelector.vue'
import LanguageSelector from '@/components/code/LanguageSelector.vue'
import MonacoEditor from '@/components/code/MonacoEditor.vue'
import OutputPanel from '@/components/code/OutputPanel.vue'
import { codeExamples } from '@/data/code-examples'
import type { LanguageInfo, CodeExample } from '@/types/code'
import { executeCode, saveSnippet, generateShareLink, getSnippetById } from '@/utils/code-api'
import { toast } from '@/utils/toast'
import { logger } from '@/utils/ui/logger'

const router = useRouter()
const route = useRoute()

const selectedLanguage = ref('python')
const code = ref(`# Python 示例代码
print("Hello, World!")

# 获取用户输入
# name = input("请输入你的名字: ")
# print(f"你好, {name}!")`)

const stdin = ref('')
const output = ref('')
const errorMessage = ref('')
const executionTime = ref<number | null>(null)
const executionStatus = ref<'success' | 'error' | 'timeout'>('success')
const isRunning = ref(false)

const showSave = ref(false)
const saveTitle = ref('')
const saveDescription = ref('')
const saveIsPublic = ref(false)
const showShareLink = ref(false)
const shareLink = ref('')
const shareToken = ref('')

const currentLanguage = ref<LanguageInfo | null>(null)

const monacoLanguage = computed(() => {
  const langMap: Record<string, string> = {
    python: 'python',
    javascript: 'javascript',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    go: 'go',
    rust: 'rust',
    php: 'php',
    ruby: 'ruby',
    swift: 'swift',
    bash: 'shell',
    lua: 'lua',
    scala: 'scala',
    haskell: 'haskell',
    perl: 'perl'
  }
  return langMap[selectedLanguage.value] || 'plaintext'
})

function onLanguageChange(langId: string, language: LanguageInfo) {
  currentLanguage.value = language

  // 自动加载新语言的第一个示例代码
  const examples = codeExamples[langId]
  if (examples && examples.length > 0) {
    const firstExample = examples[0]
    code.value = firstExample.code
    stdin.value = firstExample.stdin || ''
    // 清空输出
    output.value = ''
    errorMessage.value = ''
    executionTime.value = null

    toast.info(`已切换到 ${language.name}，并加载示例代码`)
  }
}

function handleLoadExample(example: CodeExample) {
  code.value = example.code
  if (example.stdin) {
    stdin.value = example.stdin
  } else {
    stdin.value = ''
  }
  toast.success(`已加载示例：${example.title}`)
}

function clearCode() {
  if (confirm('确定要清空代码吗？')) {
    code.value = ''
    stdin.value = ''
  }
}

async function runCode() {
  if (!code.value.trim()) {
    toast.warning('请输入代码')
    return
  }

  isRunning.value = true
  output.value = ''
  errorMessage.value = ''
  executionTime.value = null

  try {
    // 直接发送原始代码（包含中文），让后端和Piston处理
    const result = await executeCode({
      language: selectedLanguage.value,
      code: code.value,
      stdin: stdin.value
    })

    output.value = result.output
    errorMessage.value = result.error || ''
    executionTime.value = result.execution_time
    executionStatus.value = result.status

    if (result.status === 'success') {
      toast.success('代码执行成功')
    } else if (result.status === 'timeout') {
      toast.warning('代码执行超时')
    } else {
      toast.error('代码执行出错')
    }
  } catch (error: any) {
    errorMessage.value = error.message || '执行失败'
    executionStatus.value = 'error'
    toast.error('执行失败: ' + (error.message || '未知错误'))
  } finally {
    isRunning.value = false
  }
}

function showSaveDialog() {
  if (!code.value.trim()) {
    toast.warning('没有可保存的代码')
    return
  }
  saveTitle.value = ''
  saveDescription.value = ''
  saveIsPublic.value = false
  showSave.value = true
}

async function saveCode() {
  if (!saveTitle.value.trim()) {
    toast.warning('请输入标题')
    return
  }

  try {
    const snippet = await saveSnippet({
      title: saveTitle.value,
      language: selectedLanguage.value,
      code: code.value,
      description: saveDescription.value,
      is_public: saveIsPublic.value
    })

    toast.success('保存成功')
    showSave.value = false

    // 如果选择公开，自动生成分享链接
    if (saveIsPublic.value && snippet.id) {
      try {
        const shareResult = await generateShareLink(snippet.id)
        shareToken.value = shareResult.share_token
        // 构建完整的分享链接
        const baseUrl = window.location.origin
        shareLink.value = `${baseUrl}/code-share/${shareResult.share_token}`
        showShareLink.value = true
      } catch (error: any) {
        logger.error('生成分享链接失败:', error)
        toast.warning('代码已保存，但生成分享链接失败')
      }
    }
  } catch (error: any) {
    toast.error('保存失败: ' + (error.message || '未知错误'))
  }
}

function showSnippets() {
  router.push('/code-history?tab=snippets')
}

function showHistory() {
  router.push('/code-history?tab=executions')
}

// 分享链接功能
function selectShareLink(event: Event) {
  const input = event.target as HTMLInputElement
  input.select()
}

async function copyShareLink() {
  try {
    await navigator.clipboard.writeText(shareLink.value)
    toast.success('分享链接已复制到剪贴板')
  } catch (error) {
    // 降级方案：使用传统方法
    const textArea = document.createElement('textarea')
    textArea.value = shareLink.value
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      toast.success('分享链接已复制到剪贴板')
    } catch (e) {
      toast.error('复制失败，请手动复制链接')
    }
    document.body.removeChild(textArea)
  }
}

function openShareLink() {
  window.open(shareLink.value, '_blank')
}

function viewMySnippets() {
  showShareLink.value = false
  router.push('/code-history?tab=snippets')
}

// 键盘快捷键
function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    runCode()
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)

  // 检查是否从 query 参数加载代码片段
  const snippetId = route.query.snippet_id
  if (snippetId) {
    try {
      const snippet = await getSnippetById(Number(snippetId))
      selectedLanguage.value = snippet.language
      code.value = snippet.code
      saveTitle.value = snippet.title
      saveDescription.value = snippet.description || ''
      saveIsPublic.value = snippet.is_public
      toast.success(`已加载代码片段: ${snippet.title}`)
    } catch (error: any) {
      toast.error('加载代码片段失败: ' + (error.message || '未知错误'))
    }
  }
  // 检查是否是从分享页面复制代码
  else if (route.query.fork === 'true' && route.query.code) {
    try {
      const language = route.query.language as string
      const codeContent = decodeURIComponent(route.query.code as string)
      selectedLanguage.value = language || 'python'
      code.value = codeContent

      // 如果有标题，也加载标题
      if (route.query.title) {
        saveTitle.value = decodeURIComponent(route.query.title as string)
      }

      toast.success('已复制代码到编辑器')
    } catch (error) {
      logger.error('加载代码失败:', error)
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.code-editor-view {
  padding: 20px;
  max-width: 1600px;
  margin: 0 auto;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.editor-container {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 20px;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 12px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  flex-wrap: wrap;
}

.language-selector {
  flex-shrink: 0;
}

.example-selector {
  flex-shrink: 0;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
}

.encoding-warning {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #856404;
}

.warning-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.warning-text {
  line-height: 1.5;
}

.warning-text a {
  color: #0056b3;
  text-decoration: underline;
  cursor: pointer;
}

.warning-text a:hover {
  color: #004085;
}

.editor-workspace {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.editor-panel,
.stdin-panel {
  background: white;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.panel-header {
  padding: 12px 16px;
  background: #f7f7f7;
  border-bottom: 1px solid #e0e0e0;
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.code-editor {
  height: 500px;
}

.stdin-input {
  width: 100%;
  height: 500px;
  padding: 12px;
  border: none;
  resize: none;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  background: #fafafa;
}

.stdin-input:focus {
  outline: none;
  background: white;
}

.output-section {
  height: 300px;
  background: white;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

.btn-primary {
  background: #1890ff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #40a9ff;
}

.btn-success {
  background: #52c41a;
  color: white;
}

.btn-success:hover {
  background: #73d13d;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #d9d9d9;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn:disabled {
  opacity: 0.6;
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
  margin-bottom: 20px;
  font-size: 18px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
}

.form-input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  width: auto;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
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

.share-link-input {
  flex: 1;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  color: #1890ff;
  background: #f0f5ff;
  border-color: #91d5ff;
  cursor: pointer;
}

.share-link-input:focus {
  background: #e6f7ff;
  border-color: #1890ff;
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

@media (max-width: 1024px) {
  .editor-workspace {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .code-editor-view {
    padding: 10px;
  }

  .editor-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .editor-toolbar {
    gap: 12px;
  }

  .language-selector,
  .example-selector {
    width: 100%;
  }

  .toolbar-actions {
    width: 100%;
    flex-wrap: wrap;
    margin-left: 0;
  }

  .btn {
    flex: 1;
    min-width: auto;
  }

  /* 移动端分享对话框优化 */
  .share-link-container {
    flex-direction: column;
  }

  .share-link-input {
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
