<template>
  <div class="monaco-editor-wrapper">
    <!-- 加载中状态 -->
    <div v-if="isLoading" class="monaco-loading">
      <div class="loading-spinner"></div>
      <p class="loading-text">编辑器加载中...</p>
    </div>
    
    <!-- 加载错误状态 -->
    <div v-else-if="loadError" class="monaco-error">
      <p class="error-text">{{ loadError }}</p>
    </div>
    
    <!-- 编辑器容器 -->
    <div ref="editorContainer" class="monaco-editor-container" :class="{ 'is-loading': isLoading }"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import type * as Monaco from 'monaco-editor'
import { getLoadedMonaco, markCodeEditorUsed } from '@/utils/monaco-preloader'

interface Props {
  modelValue: string
  language?: string
  theme?: 'vs' | 'vs-dark' | 'hc-black'
  readonly?: boolean
  options?: Monaco.editor.IStandaloneEditorConstructionOptions
}

const props = withDefaults(defineProps<Props>(), {
  language: 'javascript',
  theme: 'vs-dark',
  readonly: false,
  options: () => ({})
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

const editorContainer = ref<HTMLElement>()
const isLoading = ref(false)
const loadError = ref<string | null>(null)
let editor: Monaco.editor.IStandaloneCodeEditor | null = null
let monacoModule: typeof Monaco | null = null

/**
 * 异步加载 Monaco Editor
 * 1. 优先使用预加载的实例
 * 2. 如果未预加载，则动态导入
 * 3. 记录用户使用过代码编辑器
 */
async function loadMonacoEditor(): Promise<typeof Monaco> {
  isLoading.value = true
  loadError.value = null
  
  try {
    // 1. 优先使用预加载的实例
    let monaco = getLoadedMonaco()
    
    if (monaco) {
      console.log('[MonacoEditor] 使用预加载的 Monaco Editor 实例')
    } else {
      // 2. 如果未预加载，动态导入
      console.log('[MonacoEditor] 预加载未完成，动态导入 Monaco Editor...')
      monaco = await import('monaco-editor')
    }
    
    // 3. 记录用户使用过代码编辑器（用于智能预加载）
    markCodeEditorUsed()
    
    return monaco
  } catch (error) {
    console.error('[MonacoEditor] 加载失败:', error)
    loadError.value = '编辑器加载失败，请刷新页面重试'
    throw error
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  if (!editorContainer.value) return

  try {
    // 异步加载 Monaco Editor
    monacoModule = await loadMonacoEditor()
    
    // 创建编辑器实例
    editor = monacoModule.editor.create(editorContainer.value, {
      value: props.modelValue,
      language: props.language,
      theme: props.theme,
      readOnly: props.readonly,
      automaticLayout: true,
      minimap: { enabled: true },
      fontSize: 14,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      ...props.options
    })

    // 监听内容变化
    editor.onDidChangeModelContent(() => {
      const value = editor?.getValue() || ''
      emit('update:modelValue', value)
      emit('change', value)
    })
  } catch (error) {
    console.error('[MonacoEditor] 初始化失败:', error)
  }
})

onUnmounted(() => {
  editor?.dispose()
})

// 监听语言变化
watch(
  () => props.language,
  (newLang) => {
    if (editor && monacoModule) {
      const model = editor.getModel()
      if (model) {
        monacoModule.editor.setModelLanguage(model, newLang)
      }
    }
  }
)

// 监听主题变化
watch(
  () => props.theme,
  (newTheme) => {
    if (monacoModule) {
      monacoModule.editor.setTheme(newTheme)
    }
  }
)

// 监听外部值变化
watch(
  () => props.modelValue,
  (newValue) => {
    if (editor && editor.getValue() !== newValue) {
      editor.setValue(newValue)
    }
  }
)

// 监听只读状态变化
watch(
  () => props.readonly,
  (newReadonly) => {
    editor?.updateOptions({ readOnly: newReadonly })
  }
)

// 暴露编辑器实例供父组件使用
defineExpose({
  getEditor: () => editor,
  setValue: (value: string) => editor?.setValue(value),
  getValue: () => editor?.getValue() || '',
  focus: () => editor?.focus()
})
</script>

<style scoped>
.monaco-editor-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.monaco-editor-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.monaco-editor-container.is-loading {
  opacity: 0;
  pointer-events: none;
}

/* 加载中样式 */
.monaco-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #1e1e1e;
  z-index: 10;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top-color: #007acc;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  margin-top: 16px;
  color: #cccccc;
  font-size: 14px;
}

/* 错误样式 */
.monaco-error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #1e1e1e;
  z-index: 10;
}

.error-text {
  color: #f48771;
  font-size: 14px;
}
</style>



