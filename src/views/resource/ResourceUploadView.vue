<template>
  <div class="resource-upload-container">
    <el-card class="upload-card">
      <template #header>
        <h1 class="page-title">上传资源</h1>
      </template>

      <el-form :model="form" label-position="top" size="large">
        <!-- 基本信息 -->
        <el-form-item label="资源标题" required>
          <el-input
            v-model="form.title"
            placeholder="请输入资源标题"
            :maxlength="formLimitsConfig.resourceTitle"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="资源描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="简单介绍这个资源..."
            :maxlength="formLimitsConfig.resourceDescription"
            show-word-limit
          />
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
              拖拽文件到此处或
              <em>点击选择</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">支持任意文件类型，单个文件最大5GB</div>
            </template>
          </el-upload>

          <div v-if="selectedFile" class="file-preview">
            <el-tag type="success">
              {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})
            </el-tag>
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
              <div class="el-upload__tip">支持多种格式，提交时自动极致压缩（~150KB/张）</div>
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
          <el-button :icon="FolderOpened" @click="selectDocMdFile">导入Markdown文件</el-button>
          <el-text type="info" size="small" style="margin-left: 12px">
            导入.md文件作为详细文档
          </el-text>
        </el-form-item>

        <!-- 详细文档 -->
        <el-form-item label="详细文档（支持Markdown）">
          <!-- 编辑器容器 -->
          <div class="editor-wrapper">
            <!-- 编辑器工具栏（放在顶部） -->
            <div class="editor-toolbar-top">
              <el-button-group>
                <el-button
                  :icon="Picture"
                  size="small"
                  :loading="uploadingDocImage"
                  text
                  @click="selectDocImage"
                >
                  {{ uploadingDocImage ? '上传中...' : '插入图片' }}
                </el-button>
                <el-button :icon="View" size="small" text @click="toggleDocPreview">
                  {{ showDocPreview ? '编辑' : '预览' }}
                </el-button>
              </el-button-group>
            <el-text v-if="!uploadingDocImage" type="info" size="small" style="margin-left: 12px">
              支持多种格式，提交时极致压缩（~150KB）
            </el-text>
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
              :rows="20"
              class="editor-textarea"
            />

            <!-- Markdown预览 -->
            <div v-else class="markdown-preview">
              <div class="markdown-body" v-html="documentPreview"></div>
            </div>
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
import { Plus, UploadFilled, FolderOpened, Picture, View } from '@element-plus/icons-vue'
import type { UploadFile, UploadFiles } from 'element-plus'
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'

import { uploadConfig, formLimitsConfig, uiDelayConfig } from '@/config'
import type { ResourceCategory } from '@/types/resource'
import {
  createResource,
  uploadResourceImage,
  uploadDocumentImage,
  getResourceCategories
} from '@/utils/api'
import { uploadFileWithChunks } from '@/utils/chunk-upload'
import { renderMarkdown } from '@/utils/markdown'
import toast from '@/utils/toast'
import { compressAndConvertToPNG } from '@/utils/image-compress'

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

// 本地文档图片存储：blob URL -> File 对象
const localDocImages = new Map<string, File>()

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

  // 如果标题为空，自动设置为文件名（去掉扩展名）
  if (!form.title.trim()) {
    const fileName = file.name
    const lastDotIndex = fileName.lastIndexOf('.')
    const nameWithoutExtension = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName
    form.title = nameWithoutExtension
  }
}

function beforeImageUpload(file: File) {
  const isImage = file.type.startsWith('image/')
  const maxSize = 20 * 1024 * 1024 // 原图最大20MB

  if (!isImage) {
    toast.error('只能上传图片文件')
    return false
  }
  if (file.size > maxSize) {
    toast.error('图片文件过大，请选择小于20MB的图片')
    return false
  }
  // 预览图将在提交时自动压缩，这里只做基本验证
  return true
}

// 文档预览切换
function toggleDocPreview() {
  showDocPreview.value = !showDocPreview.value
}

// 文档图片插入
let savedDocCursorPosition = 0 // 保存文档编辑器光标位置

function selectDocImage() {
  // 在选择图片前保存当前光标位置
  const textarea = documentEditor.value?.$el?.querySelector('textarea')
  if (textarea) {
    savedDocCursorPosition = textarea.selectionStart || 0
  }

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

  // 验证文件大小（避免选择过大的图片）
  const maxSize = 20 * 1024 * 1024 // 原图最大20MB
  if (file.size > maxSize) {
    toast.error('图片文件过大，请选择小于20MB的图片')
    return
  }

  try {
    // 创建本地预览URL
    const blobUrl = URL.createObjectURL(file)
    
    // 保存到本地图片映射
    localDocImages.set(blobUrl, file)
    
    // 插入到编辑器（使用本地URL）
    insertDocImageMarkdown(blobUrl, file.name.replace(/\.[^/.]+$/, ''))
    
    toast.success('图片已插入，提交时将自动压缩上传')
    
    console.log(`📷 本地文档图片已添加: ${file.name}, URL: ${blobUrl}`)
  } catch (error: any) {
    console.error('插入图片失败:', error)
    toast.error(error.message || '插入图片失败')
  }
}

function insertDocImageMarkdown(url: string, alt: string = '图片') {
  const markdown = `![${alt}](${url})`
  const textarea = documentEditor.value?.$el?.querySelector('textarea')

  if (textarea) {
    // 使用保存的光标位置
    const pos = savedDocCursorPosition
    console.log('插入文档图片 - 保存的光标位置:', pos)
    console.log('插入文档图片 - 当前内容长度:', form.document.length)

    const before = form.document.substring(0, pos)
    const after = form.document.substring(pos)

    // 插入时确保前后有换行
    const needsNewlineBefore = pos > 0 && before[before.length - 1] !== '\n'
    // 确保图片后面总是有换行，这样光标可以定位到新行
    const suffix = '\n'

    const prefix = needsNewlineBefore ? '\n' : ''
    const fullMarkdown = prefix + markdown + suffix

    // 计算新的光标位置（在图片markdown之后）
    const newPos = pos + prefix.length + markdown.length

    form.document = before + fullMarkdown + after

    // 将光标定位到插入的图片markdown之后
    nextTick(() => {
      // 等待 DOM 更新后再设置光标
      nextTick(() => {
        textarea.focus()
        // 使用 setSelectionRange 方法设置光标位置
        textarea.setSelectionRange(newPos, newPos)

        // 改进滚动：确保光标位置可见
        // 计算光标所在行的大致位置
        const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) || 20
        const lines = form.document.substring(0, newPos).split('\n').length
        const cursorTop = lines * lineHeight

        // 如果光标不在可视区域内，滚动到合适位置
        if (
          cursorTop < textarea.scrollTop ||
          cursorTop > textarea.scrollTop + textarea.clientHeight
        ) {
          textarea.scrollTop = Math.max(0, cursorTop - textarea.clientHeight / 2)
        }
      })
    })
  } else {
    form.document += (form.document ? '\n\n' : '') + markdown + '\n'
  }
}

// 导入文档文件
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

  // 验证文件大小
  if (file.size > uploadConfig.markdownMaxSize) {
    toast.error(`文件大小不能超过 ${Math.round(uploadConfig.markdownMaxSize / 1024 / 1024)}MB`)
    input.value = ''
    return
  }

  // 读取文件内容
  const reader = new FileReader()
  reader.onload = e => {
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
    // 1. 上传文件（使用分片上传）
    toast.info('正在上传文件，请稍候...')
    const storagePath = await uploadFileWithChunks(selectedFile.value, progress => {
      uploadProgress.value = progress
    })
    uploadedStoragePath.value = storagePath

    // 2. 压缩并上传预览图到资源专用桶
    const imageUrls: string[] = []

    for (let i = 0; i < imageFileList.value.length; i++) {
      const imgFile = imageFileList.value[i]
      if (imgFile.raw) {
        try {
          toast.info(`正在处理第 ${i + 1} 张预览图...`)

          // 极致压缩预览图到150KB以内
          const maxSizeKB = Math.round(uploadConfig.resourcePreviewImageSize / 1024)
          console.log(`📷 压缩预览图 ${i + 1}: ${imgFile.raw.name}`)
          const compressedFile = await compressAndConvertToPNG(imgFile.raw, maxSizeKB, 0.5)
          console.log(`✅ 预览图压缩完成: ${formatFileSize(imgFile.raw.size)} -> ${formatFileSize(compressedFile.size)}`)

          const url = await uploadResourceImage(compressedFile)
          imageUrls.push(url)
          
          toast.info(`预览图 ${i + 1}/${imageFileList.value.length} 已上传`)
        } catch (e: any) {
          console.error('上传预览图失败:', e)
          toast.warning(`第 ${i + 1} 张图片上传失败，已跳过`)
        }
      }
    }

    // 2.5 处理文档中的本地图片：压缩、转PNG并上传
    await processLocalDocImages()

    // 3. 创建资源记录
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

    setTimeout(
      () => router.push(`/resources/${result.resource_id}`),
      uiDelayConfig.uploadSuccessRedirect
    )
  } catch (error: any) {
    uploadStatus.value = 'exception'
    console.error('上传失败:', error)
    toast.error(error.message || '上传失败，请重试')
  } finally {
    submitting.value = false
  }
}

/**
 * 处理所有本地文档图片：压缩、转PNG、上传并替换URL
 */
async function processLocalDocImages() {
  if (localDocImages.size === 0) {
    console.log('📷 没有本地文档图片需要处理')
    return
  }

  console.log(`📷 开始处理 ${localDocImages.size} 张本地文档图片...`)
  toast.info(`正在处理 ${localDocImages.size} 张文档图片...`)

  const urlMap = new Map<string, string>() // blob URL -> server URL
  let processedCount = 0

  for (const [blobUrl, file] of localDocImages.entries()) {
    try {
      console.log(`📷 [${processedCount + 1}/${localDocImages.size}] 处理图片: ${file.name}`)
      
      // 1. 压缩并转换（极致压缩到150KB以内）
      const maxSizeKB = Math.round(uploadConfig.documentImageTargetSize / 1024)
      const compressedFile = await compressAndConvertToPNG(file, maxSizeKB, 0.5)
      
      console.log(`  ✓ 转换成功: ${file.name} -> ${compressedFile.name}`)
      
      // 2. 上传到服务器
      const serverUrl = await uploadDocumentImage(compressedFile)
      console.log(`  ✓ 上传成功: ${serverUrl}`)
      
      // 3. 保存映射关系
      urlMap.set(blobUrl, serverUrl)
      
      // 4. 释放blob URL
      URL.revokeObjectURL(blobUrl)
      
      processedCount++
      toast.info(`正在上传文档图片 ${processedCount}/${localDocImages.size}...`)
    } catch (error: any) {
      console.error(`❌ 处理图片失败: ${file.name}`, error)
      throw new Error(`图片 ${file.name} 处理失败: ${error.message}`)
    }
  }

  // 5. 替换markdown中的所有blob URL
  let updatedDocument = form.document
  for (const [blobUrl, serverUrl] of urlMap.entries()) {
    // 使用正则全局替换（兼容性更好）
    const regex = new RegExp(blobUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    updatedDocument = updatedDocument.replace(regex, serverUrl)
  }
  form.document = updatedDocument

  // 6. 清空本地图片映射
  localDocImages.clear()

  console.log(`✅ 所有文档图片处理完成`)
  toast.success(`${processedCount} 张文档图片已压缩上传`)
}

function formatFileSize(bytes: number): string {
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

onMounted(() => {
  loadCategories()
})
</script>

<style scoped>
.resource-upload-container {
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 5px 10px;
}

.upload-card {
  border-radius: 8px;
  width: 100%;
}

.upload-card :deep(.el-card__header) {
  padding: 15px 20px;
}

.upload-card :deep(.el-card__body) {
  padding: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: bold;
  margin: 0;
}

.file-preview {
  margin-top: 12px;
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

.editor-wrapper :deep(.el-textarea) {
  height: 100%;
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
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  line-height: 1.6;
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

/* 减少表单项间距 */
:deep(.el-form-item) {
  margin-bottom: 18px;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid #ebeef5;
  width: 100%;
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

@media (max-width: 768px) {
  .resource-upload-container {
    padding: 5px;
  }

  .upload-card :deep(.el-card__header) {
    padding: 10px 15px;
  }

  .upload-card :deep(.el-card__body) {
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
