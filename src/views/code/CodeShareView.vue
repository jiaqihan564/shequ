<template>
  <div class="code-share-view">
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="$router.push('/code-editor')">返回代码编辑器</button>
    </div>
    <div v-else-if="snippet" class="share-content">
      <div class="share-header">
        <h2 class="snippet-title">{{ snippet.title }}</h2>
        <span class="language-badge">{{ snippet.language }}</span>
      </div>

      <div v-if="snippet.description" class="snippet-description">
        {{ snippet.description }}
      </div>

      <div class="snippet-meta">
        <span class="meta-item">创建于: {{ formatDate(snippet.created_at) }}</span>
        <span v-if="snippet.is_public" class="public-badge">公开</span>
      </div>

      <div class="editor-container">
        <MonacoEditor
          :model-value="snippet.code"
          :language="monacoLanguage"
          theme="vs-dark"
          :readonly="true"
          class="code-editor"
        />
      </div>

      <div class="actions">
        <button v-if="isLoggedIn" class="btn btn-primary" @click="forkCode">
          复制到我的编辑器
        </button>
        <button v-else class="btn btn-primary" @click="goToLogin">登录后复制</button>
        <button class="btn btn-secondary" @click="$router.push('/code-editor')">新建代码</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import MonacoEditor from '@/components/code/MonacoEditor.vue'
import { STORAGE_KEYS } from '@/config/storage-keys'
import type { CodeSnippet } from '@/types/code'
import { getSharedSnippet } from '@/utils/api/code-api'

const route = useRoute()
const router = useRouter()

const snippet = ref<CodeSnippet | null>(null)
const loading = ref(true)
const error = ref('')

const isLoggedIn = computed(() => {
  return !!(
    localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
  )
})

const monacoLanguage = computed(() => {
  if (!snippet.value) return 'plaintext'
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
  return langMap[snippet.value.language] || 'plaintext'
})

onMounted(async () => {
  const token = route.params.token as string
  if (!token) {
    error.value = '缺少分享令牌'
    loading.value = false
    return
  }

  try {
    snippet.value = await getSharedSnippet(token)
  } catch (err: any) {
    error.value = err.message || '加载分享代码失败'
  } finally {
    loading.value = false
  }
})

function forkCode() {
  if (snippet.value) {
    router.push({
      path: '/code-editor',
      query: {
        fork: 'true',
        language: snippet.value.language,
        code: encodeURIComponent(snippet.value.code)
      }
    })
  }
}

function goToLogin() {
  router.push({
    path: '/login',
    query: {
      redirect: route.fullPath
    }
  })
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
.code-share-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.loading,
.error {
  text-align: center;
  padding: 60px 20px;
}

.error {
  color: #ff4d4f;
}

.error p {
  margin-bottom: 20px;
  font-size: 16px;
}

.share-content {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.share-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.snippet-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.language-badge {
  padding: 6px 12px;
  background: #f0f5ff;
  color: #1890ff;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
}

.snippet-description {
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  color: #666;
  line-height: 1.6;
}

.snippet-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  font-size: 14px;
  color: #666;
}

.public-badge {
  padding: 4px 8px;
  background: #f6ffed;
  color: #52c41a;
  border-radius: 3px;
  font-size: 13px;
}

.editor-container {
  margin-bottom: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.code-editor {
  height: 500px;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
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

@media (max-width: 768px) {
  .code-share-view {
    padding: 10px;
  }

  .share-content {
    padding: 16px;
  }

  .share-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
