<template>
  <div class="code-example-selector">
    <select 
      v-model="selectedExampleId" 
      @change="handleExampleChange" 
      class="example-select"
      :disabled="!examples || examples.length === 0"
    >
      <option value="">选择示例代码...</option>
      <option v-for="example in examples" :key="example.id" :value="example.id">
        {{ example.title }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import codeExamples from '@/data/code-examples'
import type { CodeExample } from '@/types/code'

interface Props {
  language: string
  currentCode: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'load-example': [example: CodeExample]
}>()

const selectedExampleId = ref('')

// 根据当前语言获取示例列表
const examples = computed(() => {
  return codeExamples[props.language] || []
})

// 监听语言变化，重置选择
watch(() => props.language, () => {
  selectedExampleId.value = ''
})

function handleExampleChange() {
  if (!selectedExampleId.value) return
  
  const example = examples.value.find(ex => ex.id === selectedExampleId.value)
  if (!example) return
  
  // 如果编辑器有内容，询问是否替换
  if (props.currentCode.trim() && props.currentCode !== example.code) {
    if (!confirm(`当前代码将被替换为示例"${example.title}"，是否继续？`)) {
      selectedExampleId.value = ''
      return
    }
  }
  
  // 发送加载示例事件
  emit('load-example', example)
  
  // 加载后不重置选择，这样用户可以看到当前加载的是哪个示例
}

// 暴露方法用于外部重置
defineExpose({
  reset: () => {
    selectedExampleId.value = ''
  }
})
</script>

<style scoped>
.code-example-selector {
  display: flex;
  align-items: center;
}

.example-select {
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: border-color 0.3s;
  min-width: 200px;
  max-width: 300px;
}

.example-select:hover:not(:disabled) {
  border-color: #40a9ff;
}

.example-select:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.example-select:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.6;
}

.example-select option {
  padding: 8px;
}

@media (max-width: 768px) {
  .example-select {
    width: 100%;
    max-width: none;
  }
}
</style>

