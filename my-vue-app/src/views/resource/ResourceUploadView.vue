<template>
  <div class="resource-upload-container">
    <el-card class="upload-card">
      <template #header>
        <h1 class="page-title">上传资源</h1>
      </template>

      <el-form :model="form" label-position="top" size="large">
        <!-- 基本信息 -->
        <el-form-item label="资源标题" required>
          <el-input v-model="form.title" placeholder="请输入资源标题" maxlength="200" show-word-limit />
        </el-form-item>

        <el-form-item label="资源描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="简单介绍这个资源..." maxlength="1000" show-word-limit />
        </el-form-item>

        <el-form-item label="资源分类">
          <el-select v-model="form.category_id" placeholder="选择分类" style="width: 100%">
            <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
          </el-select>
        </el-form-item>

        <!-- 文件上传 -->
        <el-form-item label="上传文件" required>
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
            drag
            style="width: 100%"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              拖拽文件到此处或 <em>点击选择</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持任意文件类型，单个文件最大5GB
              </div>
            </template>
          </el-upload>
          
          <div v-if="selectedFile" class="file-preview">
            <el-tag type="success">{{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})</el-tag>
          </div>

          <el-progress v-if="uploading" :percentage="uploadProgress" :status="uploadStatus" />
        </el-form-item>

        <!-- 预览图上传 -->
        <el-form-item label="预览图（最多5张）">
          <el-upload
            v-model:file-list="imageFileList"
            :auto-upload="false"
            :limit="5"
            list-type="picture-card"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            :before-upload="beforeImageUpload"
          >
            <el-icon><Plus /></el-icon>
            <template #tip>
              <div class="el-upload__tip">支持 JPG、PNG、GIF、WebP 格式，单张最大5MB</div>
            </template>
          </el-upload>
        </el-form-item>

        <!-- Markdown文档快捷导入 -->
        <el-form-item label="快捷操作">
          <input
            ref="docMdFileInput"
            type="file"
            accept=".md,.markdown"
            style="display: none"
            @change="handleDocMdFileImport"
          />
          <el-button :icon="FolderOpened" @click="selectDocMdFile">
            导入Markdown文件
          </el-button>
          <el-text type="info" size="small" style="margin-left: 12px">
            导入.md文件作为详细文档
          </el-text>
        </el-form-item>

        <!-- 详细文档 -->
        <el-form-item label="详细文档（支持Markdown）">
          <!-- 编辑器工具栏 -->
          <div class="editor-toolbar">
            <el-button-group>
              <el-button
                :icon="Picture"
                size="small"
                @click="selectDocImage"
                :loading="uploadingDocImage"
              >
                {{ uploadingDocImage ? '上传中...' : '插入图片' }}
              </el-button>
              <el-button
                :icon="View"
                size="small"
                @click="toggleDocPreview"
              >
                {{ showDocPreview ? '编辑' : '预览' }}
              </el-button>
            </el-button-group>
            <el-text v-if="uploadingDocImage" type="primary" size="small">
              正在上传图片，请稍候...
            </el-text>
          </div>
          
          <!-- 编辑器 -->
          <el-input
            v-if="!showDocPreview"
            ref="documentEditor"
            v-model="form.document"
            type="textarea"
            placeholder="请输入详细文档，支持Markdown格式...&#10;&#10;提示：&#10;- 点击'插入图片'上传图片&#10;- 点击'预览'查看渲染效果&#10;- 支持标题、列表、代码块等Markdown语法"
            :rows="15"
            :autosize="{ minRows: 15, maxRows: 30 }"
          />
          
          <!-- Markdown预览 -->
          <div v-else class="markdown-preview">
            <div class="preview-header">
              <el-text type="info">预览模式</el-text>
            </div>
            <div class="markdown-body" v-html="documentPreview"></div>
          </div>
        </el-form-item>

        <!-- 操作按钮 -->
        <el-form-item>
          <div class="form-actions">
            <el-button type="primary" size="large" :loading="submitting" @click="handleSubmit">
              {{ submitting ? '上传中...' : '发布资源' }}
            </el-button>
            <el-button size="large" @click="$router.back()">取消</el-button>
          </div>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, UploadFilled, FolderOpened, Picture, View } from '@element-plus/icons-vue'
import type { UploadFile, UploadFiles } from 'element-plus'
import { uploadFileWithChunks } from '@/utils/chunk-upload'
import { createResource, uploadResourceImage, uploadDocumentImage, getResourceCategories } from '@/utils/api'
import type { ResourceCategory } from '@/types/resource'
import toast from '@/utils/toast'
import { renderMarkdown } from '@/utils/markdown'

const router = useRouter()

const uploading = ref(false)
const submitting = ref(false)
const uploadProgress = ref(0)
const uploadStatus = ref<'success' | 'exception' | ''>('')
const selectedFile = ref<File | null>(null)
const uploadedStoragePath = ref('')
const imageFileList = ref<UploadFiles>([])
const categories = ref<ResourceCategory[]>([])
const docMdFileInput = ref<HTMLInputElement | null>(null)
const documentEditor = ref<any>(null)
const uploadingDocImage = ref(false)
const showDocPreview = ref(false)

const documentPreview = computed(() => {
  return renderMarkdown(form.document)
})

const form = reactive({
  title: '',
  description: '',
  category_id: undefined as number | undefined,
  document: '',
  tags: [] as string[]
})

async function loadCategories() {
  try {
    categories.value = await getResourceCategories()
  } catch (error) {
    console.error('加载分类失败:', error)
  }
}

function handleFileChange(file: UploadFile) {
  selectedFile.value = file.raw as File
  console.log('选择文件:', file.name, file.size)
}

function beforeImageUpload(file: File) {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isImage) {
    toast.error('只能上传图片文件')
    return false
  }
  if (!isLt5M) {
    toast.error('图片大小不能超过5MB')
    return false
  }
  return true
}

// 文档预览切换
function toggleDocPreview() {
  showDocPreview.value = !showDocPreview.value
}

// 文档图片插入
function selectDocImage() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = handleDocImageUpload
  input.click()
}

async function handleDocImageUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    toast.error('请选择图片文件')
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    toast.error('图片大小不能超过5MB')
    return
  }

  uploadingDocImage.value = true
  try {
    const url = await uploadDocumentImage(file)
    insertDocImageMarkdown(url, file.name.replace(/\.[^/.]+$/, ''))
    toast.success('图片上传成功')
  } catch (error: any) {
    toast.error(error.message || '图片上传失败')
  } finally {
    uploadingDocImage.value = false
  }
}

function insertDocImageMarkdown(url: string, alt: string = '图片') {
  const markdown = `![${alt}](${url})`
  const textarea = documentEditor.value?.$el?.querySelector('textarea')
  
  if (textarea) {
    const pos = textarea.selectionStart || form.document.length
    const before = form.document.substring(0, pos)
    const after = form.document.substring(pos)
    form.document = before + markdown + after
    
    nextTick(() => {
      textarea.focus()
      const newPos = pos + markdown.length
      textarea.selectionStart = textarea.selectionEnd = newPos
    })
  } else {
    form.document += (form.document ? '\n\n' : '') + markdown
  }
}

// Markdown文档导入
function selectDocMdFile() {
  docMdFileInput.value?.click()
}

function handleDocMdFileImport(event: Event) {
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
  if (file.size > 5 * 1024 * 1024) {
    toast.error('文件大小不能超过 5MB')
    input.value = ''
    return
  }
  
  // 读取文件内容
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      form.document = content.trim()
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

async function handleSubmit() {
  if (!selectedFile.value) {
    toast.warning('请选择要上传的文件')
    return
  }

  if (!form.title) {
    toast.warning('请输入资源标题')
    return
  }

  submitting.value = true
  uploading.value = true
  uploadProgress.value = 0
  uploadStatus.value = ''

  try {
    console.log('开始上传资源文件...')
    
    // 1. 上传文件（使用分片上传）
    toast.info('正在上传文件，请稍候...')
    const storagePath = await uploadFileWithChunks(
      selectedFile.value,
      (progress) => {
        uploadProgress.value = progress
        console.log('上传进度:', progress + '%')
      }
    )
    uploadedStoragePath.value = storagePath
    console.log('文件上传成功，路径:', storagePath)

    // 2. 上传预览图到资源专用桶
    console.log('开始上传预览图，共', imageFileList.value.length, '张')
    const imageUrls: string[] = []
    
    for (let i = 0; i < imageFileList.value.length; i++) {
      const imgFile = imageFileList.value[i]
      if (imgFile.raw) {
        try {
          toast.info(`正在上传第 ${i + 1} 张预览图...`)
          
          const url = await uploadResourceImage(imgFile.raw)
          imageUrls.push(url)
          console.log('预览图上传成功:', url)
        } catch (e: any) {
          console.error('上传预览图失败:', e)
          toast.warning(`第 ${i + 1} 张图片上传失败，已跳过`)
        }
      }
    }
    console.log('预览图上传完成，共', imageUrls.length, '张')

    // 3. 创建资源记录
    console.log('创建资源记录...')
    toast.info('正在保存资源信息...')
    
    const result = await createResource({
      title: form.title,
      description: form.description,
      document: form.document,
      category_id: form.category_id,
      file_name: selectedFile.value.name,
      file_size: selectedFile.value.size,
      file_type: selectedFile.value.type,
      storage_path: storagePath,
      image_urls: imageUrls,
      tags: form.tags
    })

    uploadStatus.value = 'success'
    uploadProgress.value = 100
    toast.success('资源发布成功！')
    console.log('资源创建成功，ID:', result.resource_id)
    
    setTimeout(() => router.push(`/resources/${result.resource_id}`), 1500)
  } catch (error: any) {
    uploadStatus.value = 'exception'
    console.error('上传失败:', error)
    toast.error(error.message || '上传失败，请重试')
  } finally {
    submitting.value = false
  }
}

function formatFileSize(bytes: number): string {
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

onMounted(() => {
  loadCategories()
})
</script>

<style scoped>
.resource-upload-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.upload-card {
  border-radius: 12px;
}

.page-title {
  font-size: 24px;
  font-weight: bold;
  margin: 0;
}

.file-preview {
  margin-top: 12px;
}

.document-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 12px;
  background: linear-gradient(135deg, #f5f7fa 0%, #ecf0f5 100%);
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 12px;
  background: linear-gradient(135deg, #f5f7fa 0%, #ecf0f5 100%);
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.markdown-preview {
  min-height: 300px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.preview-header {
  padding: 12px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
}

.markdown-preview .markdown-body {
  padding: 20px;
  line-height: 1.8;
}

.markdown-preview :deep(h1),
.markdown-preview :deep(h2),
.markdown-preview :deep(h3),
.markdown-preview :deep(h4),
.markdown-preview :deep(h5),
.markdown-preview :deep(h6) {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
  color: #303133;
}

.markdown-preview :deep(h1) {
  font-size: 28px;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 8px;
}

.markdown-preview :deep(h2) {
  font-size: 24px;
  border-bottom: 1px solid #f5f7fa;
  padding-bottom: 6px;
}

.markdown-preview :deep(h3) {
  font-size: 20px;
}

.markdown-preview :deep(p) {
  margin-top: 0;
  margin-bottom: 16px;
}

.markdown-preview :deep(ul),
.markdown-preview :deep(ol) {
  padding-left: 24px;
  margin-bottom: 16px;
}

.markdown-preview :deep(li) {
  margin-bottom: 8px;
}

.markdown-preview :deep(code) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
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
  margin-bottom: 16px;
}

.markdown-preview :deep(pre code) {
  background: transparent;
  padding: 0;
  color: #abb2bf;
  font-size: 14px;
  line-height: 1.5;
}

.markdown-preview :deep(blockquote) {
  margin: 16px 0;
  padding: 12px 16px;
  border-left: 4px solid #409eff;
  background: #ecf5ff;
  color: #606266;
}

.markdown-preview :deep(a) {
  color: #409eff;
  text-decoration: none;
}

.markdown-preview :deep(a:hover) {
  text-decoration: underline;
}

.markdown-preview :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 16px;
}

.markdown-preview :deep(th),
.markdown-preview :deep(td) {
  border: 1px solid #dcdfe6;
  padding: 8px 12px;
}

.markdown-preview :deep(th) {
  background: #f5f7fa;
  font-weight: 600;
}

.markdown-preview :deep(hr) {
  border: none;
  border-top: 1px solid #ebeef5;
  margin: 24px 0;
}

.markdown-preview :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 16px 0;
}

.form-actions {
  display: flex;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

:deep(.el-upload-dragger) {
  padding: 40px;
}

:deep(.el-icon--upload) {
  font-size: 67px;
  color: #409eff;
  margin-bottom: 16px;
}

:deep(.el-upload__text) {
  font-size: 14px;
}

:deep(.el-upload__tip) {
  margin-top: 7px;
  font-size: 12px;
  color: #909399;
}
</style>

