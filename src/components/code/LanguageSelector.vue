<template>
  <div class="language-selector">
    <label class="selector-label">编程语言:</label>
    <select :value="modelValue" class="language-select" @change="handleChange">
      <option v-for="lang in languages" :key="lang.id" :value="lang.id">
        {{ lang.name }} ({{ lang.version }})
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

import type { LanguageInfo } from '@/types/code'
import { getSupportedLanguages } from '@/utils/api/code-api'

interface Props {
  modelValue: string
}

defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string, language: LanguageInfo]
}>()

const languages = ref<LanguageInfo[]>([])

onMounted(async () => {
  try {
    languages.value = await getSupportedLanguages()
  } catch (error) {
    console.error('获取语言列表失败:', error)
    // 提供默认语言列表
    languages.value = [
      {
        id: 'python',
        name: 'Python',
        version: '3.10.0',
        piston_name: 'python',
        default_code: 'print("Hello, World!")'
      },
      {
        id: 'javascript',
        name: 'JavaScript',
        version: '18.15.0',
        piston_name: 'javascript',
        default_code: 'console.log("Hello, World!");'
      },
      {
        id: 'java',
        name: 'Java',
        version: '15.0.2',
        piston_name: 'java',
        default_code:
          'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}'
      },
      {
        id: 'cpp',
        name: 'C++',
        version: '10.2.0',
        piston_name: 'cpp',
        default_code:
          '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}'
      }
    ]
  }
})

function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const langId = target.value
  emit('update:modelValue', langId)

  const selectedLang = languages.value.find(l => l.id === langId)
  if (selectedLang) {
    emit('change', langId, selectedLang)
  }
}

defineExpose({
  languages
})
</script>

<style scoped>
.language-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.selector-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.language-select {
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: border-color 0.3s;
  min-width: 200px;
}

.language-select:hover {
  border-color: #40a9ff;
}

.language-select:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

@media (max-width: 768px) {
  .language-selector {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }

  .language-select {
    width: 100%;
  }
}
</style>
