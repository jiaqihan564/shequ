<template>
  <div class="article-editor-container">
    <el-card class="editor-card">
      <template #header>
        <div class="card-header">
          <h1 class="page-title">{{ isEditMode ? '编辑文章' : '发布文章' }}</h1>
        </div>
      </template>

      <el-form :model="form" label-position="top" size="large">
        <!-- 标题 -->
        <el-form-item label="文章标题" required>
          <el-input
            v-model="form.title"
            placeholder="请输入文章标题"
            maxlength="200"
            show-word-limit
            clearable
          />
        </el-form-item>

        <!-- 描述 -->
        <el-form-item label="文章摘要">
          <el-input
            v-model="form.description"
            type="textarea"
            placeholder="请输入文章摘要（可选）"
            :rows="3"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <!-- 分类 -->
        <el-form-item label="文章分类" required>
          <el-checkbox-group v-model="form.category_ids">
            <el-checkbox
              v-for="cat in categories"
              :key="cat.id"
              :label="cat.id"
              border
            >
              {{ cat.name }} ({{ cat.article_count || 0 }})
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <!-- 标签 -->
        <el-form-item label="文章标签">
          <el-select
            v-model="form.tag_ids"
            multiple
            filterable
            placeholder="选择或搜索标签"
            style="width: 100%"
          >
            <el-option
              v-for="tag in tags"
              :key="tag.id"
              :label="tag.name"
              :value="tag.id"
            >
              <span>{{ tag.name }}</span>
              <span style="float: right; color: #8492a6; font-size: 13px">
                {{ tag.article_count || 0 }} 篇
              </span>
            </el-option>
          </el-select>
        </el-form-item>

        <!-- Markdown导入 -->
        <el-form-item label="快捷操作">
          <input
            ref="mdFileInput"
            type="file"
            accept=".md,.markdown"
            style="display: none"
            @change="handleMdFileImport"
          />
          <el-button
            :icon="FolderOpened"
            @click="selectMdFile"
          >
            导入Markdown文件
          </el-button>
          <el-text type="info" size="small" style="margin-left: 12px">
            支持导入 .md 或 .markdown 文件，文件大小不超过 5MB
          </el-text>
        </el-form-item>

        <!-- 正文 -->
        <el-form-item label="文章正文（支持Markdown）" required>
          <el-input
            v-model="form.content"
            type="textarea"
            placeholder="请输入文章正文，支持Markdown格式..."
            :rows="15"
            :autosize="{ minRows: 15, maxRows: 30 }"
          />
        </el-form-item>

        <!-- 代码块 -->
        <el-form-item label="代码示例">
          <div class="code-blocks-container">
            <el-card
              v-for="(block, index) in form.code_blocks"
              :key="index"
              class="code-block-card"
              shadow="hover"
            >
              <template #header>
                <div class="code-block-header">
                  <span>代码块 {{ index + 1 }}</span>
                  <el-button
                    type="danger"
                    size="small"
                    :icon="Delete"
                    @click="removeCodeBlock(index)"
                  >
                    删除
                  </el-button>
                </div>
              </template>

              <el-form-item label="编程语言" style="margin-bottom: 16px">
                <el-select
                  v-model="block.language"
                  placeholder="选择编程语言"
                  style="width: 100%"
                  filterable
                >
                  <el-option
                    v-for="lang in languages"
                    :key="lang.value"
                    :label="lang.label"
                    :value="lang.value"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="代码说明（可选）" style="margin-bottom: 16px">
                <el-input
                  v-model="block.description"
                  placeholder="简要说明这段代码的作用"
                  clearable
                />
              </el-form-item>

              <el-form-item label="代码内容">
                <el-input
                  v-model="block.code_content"
                  type="textarea"
                  placeholder="粘贴你的代码..."
                  :rows="10"
                  :autosize="{ minRows: 10, maxRows: 20 }"
                />
              </el-form-item>
            </el-card>

            <el-button
              type="primary"
              :icon="Plus"
              plain
              @click="addCodeBlock"
              style="width: 100%"
            >
              添加代码块
            </el-button>
          </div>
        </el-form-item>

        <!-- 操作按钮 -->
        <el-form-item>
          <div class="form-actions">
            <el-button
              type="info"
              size="large"
              :loading="submitting"
              @click="handleSaveDraft"
            >
              保存草稿
            </el-button>
            <el-button
              type="primary"
              size="large"
              :loading="submitting"
              @click="handleSubmit"
            >
              {{ submitting ? '发布中...' : '立即发布' }}
            </el-button>
            <el-button
              size="large"
              @click="$router.push('/articles')"
            >
              取消
            </el-button>
          </div>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus, Delete, FolderOpened } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import {
  createArticle,
  updateArticle,
  getArticleDetail,
  getArticleCategories,
  getArticleTags
} from '@/utils/api'
import type { ArticleCategory, ArticleTag, ArticleCodeBlock } from '@/types'
import { SUPPORTED_LANGUAGES } from '@/types/article'
import toast from '@/utils/toast'

const route = useRoute()
const router = useRouter()

const isEditMode = ref(false)
const submitting = ref(false)
const categories = ref<ArticleCategory[]>([])
const tags = ref<ArticleTag[]>([])
const languages = SUPPORTED_LANGUAGES
const mdFileInput = ref<HTMLInputElement | null>(null)

const form = reactive({
  title: '',
  description: '',
  content: '',
  status: 1, // 1-发布，0-草稿
  code_blocks: [] as ArticleCodeBlock[],
  category_ids: [] as number[],
  tag_ids: [] as number[],
  tag_names: [] as string[]
})

async function loadMetadata() {
  try {
    const [cats, tagList] = await Promise.all([
      getArticleCategories(),
      getArticleTags()
    ])
    categories.value = cats
    tags.value = tagList
  } catch (error) {
    console.error('加载元数据失败:', error)
  }
}

async function loadArticle() {
  const id = Number(route.params.id)
  if (!id) return

  try {
    const article = await getArticleDetail(id)
    form.title = article.title
    form.description = article.description
    form.content = article.content
    form.code_blocks = article.code_blocks || []
    form.category_ids = article.categories.map(c => c.id)
    form.tag_ids = article.tags.map(t => t.id)
    isEditMode.value = true
  } catch (error: any) {
    toast.error(error.message || '加载文章失败')
    router.push('/articles')
  }
}

function addCodeBlock() {
  form.code_blocks.push({
    language: '',
    code_content: '',
    description: '',
    order_index: form.code_blocks.length
  })
}

function removeCodeBlock(index: number) {
  form.code_blocks.splice(index, 1)
}

// Markdown文件导入功能
function selectMdFile() {
  mdFileInput.value?.click()
}

async function handleMdFileImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (!file) return
  
  // 验证文件类型
  if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown')) {
    toast.error('请选择 .md 或 .markdown 文件')
    input.value = ''
    return
  }
  
  // 验证文件大小（5MB限制）
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    toast.error('文件大小不能超过 5MB')
    input.value = ''
    return
  }
  
  // 如果当前已有内容，需要确认
  const hasContent = form.title || form.content || form.description
  if (hasContent) {
    try {
      await ElMessageBox.confirm(
        '导入文件将覆盖当前内容，是否继续？',
        '确认导入',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    } catch {
      input.value = ''
      return
    }
  }
  
  // 读取文件内容
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      parseMarkdownContent(content)
      toast.success(`成功导入文件：${file.name}`)
    } catch (error) {
      toast.error('文件读取失败')
    }
    input.value = ''
  }
  
  reader.onerror = () => {
    toast.error('文件读取失败')
    input.value = ''
  }
  
  reader.readAsText(file, 'UTF-8')
}

function parseMarkdownContent(content: string) {
  // 检查是否有YAML Front Matter
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
  const match = content.match(frontMatterRegex)
  
  if (match) {
    // 解析YAML Front Matter
    const yamlContent = match[1]
    const markdownContent = match[2]
    
    // 简单解析YAML（基本的键值对）
    const lines = yamlContent.split('\n')
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':')
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim().replace(/^["']|["']$/g, '')
        const normalizedKey = key.trim().toLowerCase()
        
        if (normalizedKey === 'title') {
          form.title = value
        } else if (normalizedKey === 'description' || normalizedKey === 'summary') {
          form.description = value
        } else if (normalizedKey === 'tags') {
          // 尝试解析标签数组 [tag1, tag2] 或 tag1, tag2
          const tagsStr = value.replace(/^\[|\]$/g, '').trim()
          const tagNames = tagsStr.split(',').map(t => t.trim()).filter(t => t)
          form.tag_names = tagNames
        }
      }
    }
    
    form.content = markdownContent.trim()
  } else {
    // 没有Front Matter，直接使用内容
    // 尝试从第一行提取标题
    const lines = content.split('\n')
    const firstLine = lines[0]?.trim()
    
    if (firstLine && firstLine.startsWith('#')) {
      // 第一行是标题
      form.title = firstLine.replace(/^#+\s*/, '')
      form.content = lines.slice(1).join('\n').trim()
    } else {
      form.content = content.trim()
    }
  }
}

async function handleSubmit() {
  if (form.category_ids.length === 0) {
    toast.warning('请至少选择一个分类')
    return
  }

  if (!form.title.trim()) {
    toast.warning('请输入文章标题')
    return
  }

  if (!form.content.trim()) {
    toast.warning('请输入文章正文')
    return
  }

  submitting.value = true
  try {
    form.status = 1 // 发布状态
    
    if (isEditMode.value) {
      await updateArticle(Number(route.params.id), form)
      toast.success('文章更新成功')
    } else {
      const result = await createArticle(form)
      toast.success('文章发布成功')
      router.push(`/articles/${result.article_id}`)
      return
    }
    router.push('/articles')
  } catch (error: any) {
    toast.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

async function handleSaveDraft() {
  if (!form.title || !form.content) {
    toast.warning('标题和正文不能为空')
    return
  }

  submitting.value = true
  try {
    form.status = 0 // 草稿状态
    
    if (isEditMode.value) {
      await updateArticle(Number(route.params.id), form)
    } else {
      await createArticle(form)
    }
    toast.success('草稿保存成功')
    router.push('/articles')
  } catch (error: any) {
    toast.error(error.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadMetadata()
  if (route.params.id) {
    loadArticle()
  }
})
</script>

<style scoped>
.article-editor-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.editor-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 24px;
  font-weight: bold;
  margin: 0;
  color: #303133;
}

.code-blocks-container {
  width: 100%;
}

.code-block-card {
  margin-bottom: 16px;
  border-radius: 8px;
}

.code-block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #ebeef5;
}

/* Element Plus 组件自定义样式 */
:deep(.el-checkbox) {
  margin-right: 12px;
  margin-bottom: 12px;
}

:deep(.el-checkbox.is-bordered) {
  padding: 9px 20px 9px 10px;
}

:deep(.el-textarea__inner) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
}

:deep(.el-form-item__label) {
  font-weight: 600;
  color: #303133;
}

@media (max-width: 768px) {
  .article-editor-container {
    padding: 10px;
  }

  .form-actions {
    flex-direction: column;
  }

  .form-actions button {
    width: 100%;
  }
}
</style>
