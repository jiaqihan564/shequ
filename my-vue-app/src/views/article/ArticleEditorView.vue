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
          <!-- 编辑器容器 -->
          <div class="editor-wrapper">
            <!-- 编辑器工具栏（放在顶部） -->
            <div class="editor-toolbar-top">
              <el-button-group>
                <el-button
                  :icon="Picture"
                  size="small"
                  @click="selectImage"
                  :loading="uploading"
                  text
                >
                  {{ uploading ? '上传中...' : '插入图片' }}
                </el-button>
                <el-button
                  :icon="View"
                  size="small"
                  @click="togglePreview"
                  text
                >
                  {{ showPreview ? '编辑' : '预览' }}
                </el-button>
              </el-button-group>
              <el-text v-if="uploading" type="primary" size="small">
                正在上传图片，请稍候...
              </el-text>
            </div>

            <!-- 编辑器 -->
            <el-input
              v-if="!showPreview"
              ref="contentEditor"
              v-model="form.content"
              type="textarea"
              placeholder="请输入文章正文，支持Markdown格式...&#10;&#10;提示：&#10;- 点击'插入图片'上传图片&#10;- 点击'预览'查看渲染效果&#10;- 支持标题、列表、代码块等Markdown语法"
              :rows="20"
              class="editor-textarea"
            />

            <!-- Markdown预览 -->
            <div v-else class="markdown-preview">
              <div class="markdown-body" v-html="previewContent"></div>
            </div>
          </div>
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
import { ref, onMounted, reactive, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus, Delete, FolderOpened, Picture, View } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import {
  createArticle,
  updateArticle,
  getArticleDetail,
  getArticleCategories,
  getArticleTags,
  uploadImage
} from '@/utils/api'
import type { ArticleCategory, ArticleTag, ArticleCodeBlock } from '@/types'
import { SUPPORTED_LANGUAGES } from '@/types/article'
import toast from '@/utils/toast'
import { renderMarkdown } from '@/utils/markdown'

const route = useRoute()
const router = useRouter()

const isEditMode = ref(false)
const submitting = ref(false)
const uploading = ref(false)
const showPreview = ref(false)
const categories = ref<ArticleCategory[]>([])
const tags = ref<ArticleTag[]>([])
const languages = SUPPORTED_LANGUAGES
const mdFileInput = ref<HTMLInputElement | null>(null)
const contentEditor = ref<any>(null)

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

// Markdown预览
const previewContent = computed(() => {
  return renderMarkdown(form.content)
})

function togglePreview() {
  showPreview.value = !showPreview.value
}

// 图片上传功能
function selectImage() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = handleImageUpload
  input.click()
}

async function handleImageUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    toast.error('请选择图片文件')
    return
  }

  // 验证文件大小（5MB限制）
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    toast.error('图片大小不能超过5MB')
    return
  }

  uploading.value = true
  try {
    const url = await uploadImage(file)
    insertImageMarkdown(url, file.name.replace(/\.[^/.]+$/, ''))
    toast.success('图片上传成功')
  } catch (error: any) {
    toast.error(error.message || '图片上传失败')
  } finally {
    uploading.value = false
  }
}

function insertImageMarkdown(url: string, alt: string = '图片') {
  const markdown = `![${alt}](${url})`

  // 尝试在光标位置插入
  const textarea = contentEditor.value?.$el?.querySelector('textarea')
  if (textarea) {
    const pos = textarea.selectionStart || 0
    const before = form.content.substring(0, pos)
    const after = form.content.substring(pos)
    
    // 插入时确保前后有换行
    const needsNewlineBefore = pos > 0 && before[before.length - 1] !== '\n'
    const needsNewlineAfter = after.length > 0 && after[0] !== '\n'
    
    const prefix = needsNewlineBefore ? '\n' : ''
    const suffix = needsNewlineAfter ? '\n' : ''
    const fullMarkdown = prefix + markdown + suffix
    
    form.content = before + fullMarkdown + after

    // 恢复光标位置（在插入的Markdown之后）
    nextTick(() => {
      textarea.focus()
      const newPos = pos + prefix.length + markdown.length
      textarea.selectionStart = textarea.selectionEnd = newPos
      
      // 滚动到光标位置
      textarea.scrollTop = textarea.scrollHeight * (newPos / form.content.length)
    })
  } else {
    // 降级：追加到末尾
    form.content += (form.content ? '\n\n' : '') + markdown
  }
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
        
        if (normalizedKey === 'title' && !form.title.trim()) {
          form.title = value
        } else if ((normalizedKey === 'description' || normalizedKey === 'summary') && !form.description.trim()) {
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
    // 尝试从第一行提取标题（仅当标题为空时）
    const lines = content.split('\n')
    const firstLine = lines[0]?.trim()
    
    if (firstLine && firstLine.startsWith('#') && !form.title.trim()) {
      // 第一行是标题，且当前标题为空
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

onMounted(() => {
  loadMetadata()
  if (route.params.id) {
    loadArticle()
  }
})
</script>

<style scoped>
.article-editor-container {
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 5px 10px;
}

.editor-card {
  border-radius: 8px;
  width: 100%;
}

.editor-card :deep(.el-card__header) {
  padding: 15px 20px;
}

.editor-card :deep(.el-card__body) {
  padding: 20px;
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
  margin-bottom: 12px;
  border-radius: 8px;
  width: 100%;
}

.code-block-card :deep(.el-card__header) {
  padding: 12px 16px;
}

.code-block-card :deep(.el-card__body) {
  padding: 16px;
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
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid #ebeef5;
  width: 100%;
}

/* Element Plus 组件自定义样式 */
:deep(.el-checkbox) {
  margin-right: 12px;
  margin-bottom: 12px;
}

:deep(.el-checkbox.is-bordered) {
  padding: 9px 20px 9px 10px;
}

:deep(.el-textarea) {
  height: 100%;
  display: flex;
  flex-direction: column;
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

/* 编辑器容器 */
.editor-wrapper {
  position: relative;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
  display: flex;
  flex-direction: column;
  height: 550px;
  width: 100%;
}

.editor-wrapper .editor-textarea {
  border: none;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.editor-wrapper :deep(.el-textarea__inner) {
  border: none;
  border-radius: 0;
  box-shadow: none;
  resize: none;
  height: 100% !important;
  min-height: 100% !important;
  max-height: 100% !important;
  font-size: 14px;
  padding: 12px;
}

/* 编辑器工具栏（顶部） */
.editor-toolbar-top {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
  background: #f8f8f8;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}

/* Markdown预览 */
.markdown-preview {
  background: #fff;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
}

.markdown-preview .markdown-body {
  padding: 20px;
  font-size: 14px;
  line-height: 1.8;
  color: #303133;
  flex: 1;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 自定义滚动条样式 */
.markdown-preview .markdown-body::-webkit-scrollbar {
  width: 12px;
}

.markdown-preview .markdown-body::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-left: 1px solid #e1e4e8;
}

.markdown-preview .markdown-body::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 6px;
  border: 2px solid #f1f1f1;
}

.markdown-preview .markdown-body::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Markdown 样式（复用文章详情页的样式） */
.markdown-preview :deep(h1),
.markdown-preview :deep(h2),
.markdown-preview :deep(h3) {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  color: #303133;
}

.markdown-preview :deep(h1) {
  font-size: 28px;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 8px;
}

.markdown-preview :deep(h2) {
  font-size: 24px;
}

.markdown-preview :deep(h3) {
  font-size: 20px;
}

.markdown-preview :deep(p) {
  margin-bottom: 16px;
}

.markdown-preview :deep(code) {
  font-family: 'Consolas', 'Monaco', monospace;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  color: #e83e8c;
}

.markdown-preview :deep(pre) {
  background: #282c34;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 16px 0;
}

.markdown-preview :deep(pre code) {
  background: transparent;
  color: #abb2bf;
}

.markdown-preview :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 16px 0;
}

.markdown-preview :deep(blockquote) {
  margin: 16px 0;
  padding: 12px 16px;
  border-left: 4px solid #409eff;
  background: #ecf5ff;
}

.markdown-preview :deep(ul),
.markdown-preview :deep(ol) {
  padding-left: 24px;
  margin-bottom: 16px;
}

/* 减少表单项间距 */
:deep(.el-form-item) {
  margin-bottom: 18px;
}

@media (max-width: 768px) {
  .article-editor-container {
    padding: 5px;
  }

  .editor-card :deep(.el-card__header) {
    padding: 10px 15px;
  }

  .editor-card :deep(.el-card__body) {
    padding: 15px;
  }

  .form-actions {
    flex-direction: column;
  }

  .form-actions button {
    width: 100%;
  }
}
</style>
