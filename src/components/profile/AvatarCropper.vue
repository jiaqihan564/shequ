<template>
  <div v-if="show" class="avatar-cropper-overlay" @click.self="onCancel">
    <div class="avatar-cropper-modal">
      <div class="cropper-header">
        <h3>裁剪头像</h3>
        <button class="close-btn" @click="onCancel" aria-label="关闭">×</button>
      </div>
      
      <div class="cropper-body">
        <div class="cropper-preview-container">
          <canvas ref="canvasRef" class="cropper-canvas" @mousedown="onMouseDown"></canvas>
        </div>
        
        <div class="cropper-info">
          <p>拖动图片调整位置，滚轮缩放</p>
          <p class="size-tip">将裁剪为正方形并自动压缩到5KB以下</p>
        </div>
        
        <div class="cropper-controls">
          <button class="control-btn" @click="zoomIn" title="放大">
            <span>+</span>
          </button>
          <button class="control-btn" @click="zoomOut" title="缩小">
            <span>−</span>
          </button>
          <button class="control-btn" @click="resetPosition" title="重置">
            <span>⟲</span>
          </button>
        </div>
      </div>
      
      <div class="cropper-footer">
        <button class="btn secondary" @click="onCancel">取消</button>
        <button class="btn primary" @click="onConfirm" :disabled="processing">
          {{ processing ? '处理中...' : '确定' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

interface Props {
  show: boolean
  imageSrc: string
}

interface Emits {
  (e: 'cancel'): void
  (e: 'confirm', blob: Blob): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const canvasRef = ref<HTMLCanvasElement>()
const processing = ref(false)

// 图片状态
let image: HTMLImageElement | null = null
let scale = 1
let offsetX = 0
let offsetY = 0
let isDragging = false
let startX = 0
let startY = 0

// Canvas尺寸
const canvasSize = 400

watch(() => props.show, (newVal) => {
  if (newVal && props.imageSrc) {
    loadImage()
  } else {
    cleanup()
  }
})

function loadImage() {
  image = new Image()
  image.onload = () => {
    initCanvas()
    drawImage()
  }
  image.onerror = () => {
    console.error('图片加载失败')
  }
  image.src = props.imageSrc
}

function initCanvas() {
  if (!canvasRef.value || !image) return
  
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  // 设置canvas尺寸
  canvas.width = canvasSize
  canvas.height = canvasSize
  
  // 计算初始缩放以填充canvas
  const imgRatio = image.width / image.height
  const canvasRatio = 1 // 正方形
  
  if (imgRatio > canvasRatio) {
    // 图片更宽，以高度为准
    scale = canvasSize / image.height
  } else {
    // 图片更高或等比，以宽度为准
    scale = canvasSize / image.width
  }
  
  // 居中
  offsetX = (canvasSize - image.width * scale) / 2
  offsetY = (canvasSize - image.height * scale) / 2
}

function drawImage() {
  if (!canvasRef.value || !image) return
  
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  // 清空画布
  ctx.fillStyle = '#f3f4f6'
  ctx.fillRect(0, 0, canvasSize, canvasSize)
  
  // 绘制图片
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(
    image,
    offsetX,
    offsetY,
    image.width * scale,
    image.height * scale
  )
  ctx.restore()
  
  // 绘制裁剪框（正方形，固定在canvas中心）
  const cropSize = canvasSize
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 2
  ctx.strokeRect(0, 0, cropSize, cropSize)
  
  // 绘制网格线
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.lineWidth = 1
  const gridSize = cropSize / 3
  for (let i = 1; i < 3; i++) {
    // 垂直线
    ctx.beginPath()
    ctx.moveTo(gridSize * i, 0)
    ctx.lineTo(gridSize * i, cropSize)
    ctx.stroke()
    
    // 水平线
    ctx.beginPath()
    ctx.moveTo(0, gridSize * i)
    ctx.lineTo(cropSize, gridSize * i)
    ctx.stroke()
  }
}

// 鼠标拖动
function onMouseDown(e: MouseEvent) {
  isDragging = true
  startX = e.clientX - offsetX
  startY = e.clientY - offsetY
  
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging || !image) return
  
  // 计算新位置
  let newOffsetX = e.clientX - startX
  let newOffsetY = e.clientY - startY
  
  // 限制边界：确保图片完全覆盖裁剪区域
  const imgWidth = image.width * scale
  const imgHeight = image.height * scale
  
  // 左边界：图片右边缘不能超过canvas左边缘
  if (newOffsetX > 0) newOffsetX = 0
  // 右边界：图片左边缘不能超过canvas右边缘
  if (newOffsetX + imgWidth < canvasSize) newOffsetX = canvasSize - imgWidth
  
  // 上边界：图片下边缘不能超过canvas上边缘
  if (newOffsetY > 0) newOffsetY = 0
  // 下边界：图片上边缘不能超过canvas下边缘
  if (newOffsetY + imgHeight < canvasSize) newOffsetY = canvasSize - imgHeight
  
  offsetX = newOffsetX
  offsetY = newOffsetY
  drawImage()
}

function onMouseUp() {
  isDragging = false
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}

// 滚轮缩放
function onWheel(e: WheelEvent) {
  e.preventDefault()
  if (!image) return
  
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  const newScale = scale * delta
  
  // 计算缩放后的图片尺寸
  const newImgWidth = image.width * newScale
  const newImgHeight = image.height * newScale
  
  // 限制最小缩放：确保图片至少覆盖裁剪区域
  const minScale = Math.max(
    canvasSize / image.width,
    canvasSize / image.height
  )
  
  // 限制缩放范围
  if (newScale < minScale || newScale > 10) return
  
  // 以鼠标位置为中心缩放
  const canvas = canvasRef.value
  if (!canvas) return
  
  const rect = canvas.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top
  
  let newOffsetX = mouseX - (mouseX - offsetX) * (newScale / scale)
  let newOffsetY = mouseY - (mouseY - offsetY) * (newScale / scale)
  
  // 限制边界
  if (newOffsetX > 0) newOffsetX = 0
  if (newOffsetX + newImgWidth < canvasSize) newOffsetX = canvasSize - newImgWidth
  if (newOffsetY > 0) newOffsetY = 0
  if (newOffsetY + newImgHeight < canvasSize) newOffsetY = canvasSize - newImgHeight
  
  offsetX = newOffsetX
  offsetY = newOffsetY
  scale = newScale
  
  drawImage()
}

// 控制按钮
function zoomIn() {
  if (!image) return
  
  const newScale = scale * 1.2
  if (newScale > 10) return
  
  const newImgWidth = image.width * newScale
  const newImgHeight = image.height * newScale
  
  // 限制边界
  let newOffsetX = offsetX
  let newOffsetY = offsetY
  
  if (newOffsetX > 0) newOffsetX = 0
  if (newOffsetX + newImgWidth < canvasSize) newOffsetX = canvasSize - newImgWidth
  if (newOffsetY > 0) newOffsetY = 0
  if (newOffsetY + newImgHeight < canvasSize) newOffsetY = canvasSize - newImgHeight
  
  offsetX = newOffsetX
  offsetY = newOffsetY
  scale = newScale
  drawImage()
}

function zoomOut() {
  if (!image) return
  
  const newScale = scale * 0.8
  
  // 限制最小缩放
  const minScale = Math.max(
    canvasSize / image.width,
    canvasSize / image.height
  )
  
  if (newScale < minScale) return
  
  const newImgWidth = image.width * newScale
  const newImgHeight = image.height * newScale
  
  // 限制边界
  let newOffsetX = offsetX
  let newOffsetY = offsetY
  
  if (newOffsetX > 0) newOffsetX = 0
  if (newOffsetX + newImgWidth < canvasSize) newOffsetX = canvasSize - newImgWidth
  if (newOffsetY > 0) newOffsetY = 0
  if (newOffsetY + newImgHeight < canvasSize) newOffsetY = canvasSize - newImgHeight
  
  offsetX = newOffsetX
  offsetY = newOffsetY
  scale = newScale
  drawImage()
}

function resetPosition() {
  initCanvas()
  drawImage()
}

function onCancel() {
  emit('cancel')
}

async function onConfirm() {
  if (!canvasRef.value || processing.value) return
  
  processing.value = true
  
  try {
    // 获取当前canvas内容（已经是正方形384x384）
    const canvas = canvasRef.value
    
    // 创建最终输出canvas（384x384）
    const outputCanvas = document.createElement('canvas')
    outputCanvas.width = 384
    outputCanvas.height = 384
    const outputCtx = outputCanvas.getContext('2d')!
    
    // 将当前canvas内容缩放到384x384
    outputCtx.imageSmoothingEnabled = true
    outputCtx.imageSmoothingQuality = 'high'
    outputCtx.drawImage(canvas, 0, 0, 384, 384)
    
    // 转换为Blob
    outputCanvas.toBlob(
      (blob) => {
        if (blob) {
          emit('confirm', blob)
        } else {
          console.error('裁剪失败：无法生成图片')
        }
        processing.value = false
      },
      'image/jpeg',
      0.9
    )
  } catch (error) {
    console.error('裁剪图片失败:', error)
    processing.value = false
  }
}

function cleanup() {
  if (canvasRef.value) {
    const ctx = canvasRef.value.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvasSize, canvasSize)
    }
  }
  image = null
  scale = 1
  offsetX = 0
  offsetY = 0
}

onMounted(() => {
  if (canvasRef.value) {
    canvasRef.value.addEventListener('wheel', onWheel, { passive: false })
  }
})

onUnmounted(() => {
  cleanup()
  if (canvasRef.value) {
    canvasRef.value.removeEventListener('wheel', onWheel)
  }
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})
</script>

<style scoped>
.avatar-cropper-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.avatar-cropper-modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.cropper-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cropper-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  font-size: 32px;
  line-height: 1;
  color: #9ca3af;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.cropper-body {
  padding: 24px;
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cropper-preview-container {
  width: 400px;
  height: 400px;
  background: #f9fafb;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.cropper-canvas {
  display: block;
  cursor: move;
  width: 100%;
  height: 100%;
}

.cropper-info {
  margin-top: 16px;
  text-align: center;
}

.cropper-info p {
  margin: 4px 0;
  font-size: 14px;
  color: #6b7280;
}

.size-tip {
  font-size: 13px;
  color: #9ca3af;
}

.cropper-controls {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}

.control-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.control-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.control-btn:active {
  transform: scale(0.95);
}

.cropper-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 10px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  min-width: 80px;
}

.btn.secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn.secondary:hover {
  background: #e5e7eb;
}

.btn.primary {
  background: #3b82f6;
  color: white;
}

.btn.primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn.primary:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}

/* 响应式 */
@media (max-width: 640px) {
  .avatar-cropper-modal {
    width: 95%;
    max-height: 95vh;
  }
  
  .cropper-preview-container {
    width: 320px;
    height: 320px;
  }
  
  .cropper-header {
    padding: 16px 20px;
  }
  
  .cropper-body {
    padding: 20px;
  }
  
  .cropper-footer {
    padding: 12px 20px;
  }
}
</style>
