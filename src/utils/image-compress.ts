/**
 * 图片压缩工具
 * 用于在前端压缩图片到指定大小
 */

export interface CompressOptions {
  /** 目标文件大小（字节），默认10KB */
  targetSizeKB?: number
  /** 最大宽度/高度（像素），默认512 */
  maxDimension?: number
  /** 输出格式，默认'image/jpeg' */
  outputFormat?: 'image/jpeg' | 'image/png' | 'image/webp'
  /** 初始质量，默认0.9 */
  initialQuality?: number
  /** 最小质量，默认0.1 */
  minQuality?: number
  /** 质量递减步长，默认0.05 */
  qualityStep?: number
}

export interface CompressResult {
  /** 压缩后的Blob */
  blob: Blob
  /** 压缩后的File */
  file: File
  /** 原始大小（字节） */
  originalSize: number
  /** 压缩后大小（字节） */
  compressedSize: number
  /** 压缩率（百分比） */
  compressionRatio: number
  /** 原始图片宽度 */
  originalWidth: number
  /** 原始图片高度 */
  originalHeight: number
  /** 图片宽度 */
  width: number
  /** 图片高度 */
  height: number
  /** 是否被缩放 */
  resized: boolean
}

/**
 * 压缩图片到指定大小
 * @param file 原始图片文件
 * @param options 压缩选项
 * @returns 压缩结果
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<CompressResult> {
  const {
    targetSizeKB = 10, // 默认10KB
    maxDimension = 512, // 默认512px
    outputFormat = 'image/jpeg',
    initialQuality = 0.9,
    minQuality = 0.1,
    qualityStep = 0.05
  } = options

  const targetSize = targetSizeKB * 1024
  const originalSize = file.size

  // 1. 读取图片
  const img = await loadImage(file)
  const originalWidth = img.width
  const originalHeight = img.height

  // 2. 计算缩放后的尺寸（保持宽高比）
  let targetWidth = originalWidth
  let targetHeight = originalHeight
  let resized = false

  if (originalWidth > maxDimension || originalHeight > maxDimension) {
    const ratio = Math.min(maxDimension / originalWidth, maxDimension / originalHeight)
    targetWidth = Math.round(originalWidth * ratio)
    targetHeight = Math.round(originalHeight * ratio)
    resized = true
  }

  // 3. 创建canvas并绘制缩放后的图片
  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')!

  // 使用高质量缩放算法
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

  // 4. 逐步降低质量和尺寸，确保压缩到目标大小以下
  let quality = initialQuality
  let blob: Blob | null = null
  let attempts = 0
  const maxAttempts = 50 // 增加尝试次数

  // 先尝试降低质量
  while (attempts < maxAttempts) {
    blob = await canvasToBlob(canvas, outputFormat, quality)

    // 如果已经小于目标大小，就停止
    if (blob.size <= targetSize) {
      break
    }

    // 如果质量已经到最低但文件还是太大，开始缩小尺寸
    if (quality <= minQuality) {
      if (targetWidth > 128 && targetHeight > 128) {
        // 缩小10%
        targetWidth = Math.round(targetWidth * 0.9)
        targetHeight = Math.round(targetHeight * 0.9)
        canvas.width = targetWidth
        canvas.height = targetHeight
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
        
        // 重置质量，用更低的质量重新尝试
        quality = Math.max(minQuality, initialQuality * 0.7)
      } else {
        // 尺寸已经很小了，只能进一步降低质量
        quality = Math.max(0.1, quality * 0.9)
      }
    } else {
      // 降低质量
      quality = Math.max(minQuality, quality - qualityStep)
    }
    
    attempts++
  }

  if (!blob) {
    throw new Error('图片压缩失败')
  }

  // 最终强制检查：如果还是超过目标大小，必须压缩到目标以下
  let finalAttempts = 0
  while (blob.size > targetSize && finalAttempts < 30) {
    // 计算需要缩小的比例
    const ratio = Math.sqrt(targetSize / blob.size) * 0.92 // 更激进的缩小
    
    if (targetWidth > 64 && targetHeight > 64) {
      // 按比例缩小
      targetWidth = Math.max(64, Math.round(targetWidth * ratio))
      targetHeight = Math.max(64, Math.round(targetHeight * ratio))
      canvas.width = targetWidth
      canvas.height = targetHeight
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
      
      // 使用更低的质量
      const finalQuality = Math.max(0.05, 0.1 * (targetSize / blob.size))
      blob = await canvasToBlob(canvas, outputFormat, finalQuality)
    } else {
      // 已经是最小尺寸，继续降低质量
      const ultraLowQuality = Math.max(0.01, 0.05 * (targetSize / blob.size))
      blob = await canvasToBlob(canvas, outputFormat, ultraLowQuality)
      
      // 如果还是太大，无法再压缩
      if (blob.size > targetSize) {
        console.warn('图片已压缩到最小尺寸和质量，但仍超过目标大小')
        break
      }
    }
    
    finalAttempts++
  }

  // 最后一次检查：如果还是超过目标，强制降低到目标以下
  if (blob.size > targetSize && targetWidth > 64) {
    console.warn(`⚠️ 执行最终强制压缩：${blob.size} -> ${targetSize} 字节`)
    // 强制缩小到目标大小
    while (blob.size > targetSize && targetWidth > 64) {
      targetWidth = Math.round(targetWidth * 0.9)
      targetHeight = Math.round(targetHeight * 0.9)
      canvas.width = targetWidth
      canvas.height = targetHeight
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
      blob = await canvasToBlob(canvas, outputFormat, 0.01) // 最低质量
    }
  }

  // 最终检查
  if (blob.size > targetSize) {
    console.error(`❌ 无法压缩到目标大小：当前 ${blob.size} 字节，目标 ${targetSize} 字节`)
    throw new Error(`图片压缩失败：无法压缩到 ${Math.round(targetSize / 1024)}KB 以下`)
  }

  // 5. 创建新的File对象
  const compressedFile = new File([blob], file.name, {
    type: outputFormat,
    lastModified: Date.now()
  })

  const compressionRatio = ((originalSize - blob.size) / originalSize) * 100

  return {
    blob,
    file: compressedFile,
    originalSize,
    compressedSize: blob.size,
    compressionRatio,
    originalWidth,
    originalHeight,
    width: targetWidth,
    height: targetHeight,
    resized
  }
}

/**
 * 加载图片
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }

    img.src = url
  })
}

/**
 * Canvas转Blob
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Canvas转换失败'))
        }
      },
      mimeType,
      quality
    )
  })
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 验证是否为图片文件
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/**
 * 获取图片尺寸（不加载完整图片）
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.width, height: img.height })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('无法读取图片尺寸'))
    }

    img.src = url
  })
}

/**
 * 压缩并转换图片（极致压缩版）
 * 支持所有浏览器可识别的图片格式（jpg, jpeg, png, gif, webp, bmp等）
 * @param file 原始图片文件
 * @param maxSizeKB 最大文件大小（KB），默认200KB
 * @param targetQuality 目标压缩质量（0-1），默认0.6（极致压缩）
 * @returns 转换后的文件
 */
export async function compressAndConvertToPNG(
  file: File,
  maxSizeKB: number = 200,
  targetQuality: number = 0.6
): Promise<File> {
  console.log(`🖼️ 开始极致压缩: ${file.name} (${formatFileSize(file.size)}) -> 目标 ${maxSizeKB}KB`)

  // 加载图片
  const img = await loadImage(file)
  const originalWidth = img.width
  const originalHeight = img.height

  // 创建canvas
  const canvas = document.createElement('canvas')
  let width = originalWidth
  let height = originalHeight

  // 极致压缩：初始尺寸就很小
  const maxDimension = 1200 // 最大边长1200px
  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
    console.log(`📏 缩小尺寸: ${originalWidth}x${originalHeight} -> ${width}x${height}`)
  }

  // 超大图片直接缩到800px
  if (originalWidth > 3000 || originalHeight > 3000) {
    const ratio = Math.min(800 / originalWidth, 800 / originalHeight)
    width = Math.round(originalWidth * ratio)
    height = Math.round(originalHeight * ratio)
    console.log(`📏 超大图片压缩到: ${width}x${height}`)
  }

  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  // 绘制图片（使用白色背景，处理透明图片）
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)

  // 使用JPEG格式（压缩率最高）
  let quality = targetQuality
  const format: 'image/jpeg' = 'image/jpeg'
  let blob = await canvasToBlob(canvas, format, quality)
  const maxSize = maxSizeKB * 1024 // 转换为字节

  console.log(`🔄 初始压缩 (JPEG): ${formatFileSize(blob.size)}, 质量: ${quality.toFixed(2)}`)

  let attempts = 0
  const maxAttempts = 50 // 增加尝试次数

  // 极致压缩循环
  while (blob.size > maxSize && attempts < maxAttempts) {
    attempts++

    // 策略1: 质量高于0.3，快速降低质量
    if (quality > 0.3) {
      quality = Math.max(0.3, quality - 0.1)
    }
    // 策略2: 尺寸还不够小，继续缩小
    else if (width > 500 || height > 500) {
      width = Math.round(width * 0.8) // 每次缩小20%
      height = Math.round(height * 0.8)
      canvas.width = width
      canvas.height = height
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, width, height)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)
      quality = 0.5 // 重置质量
      console.log(`📐 缩小到: ${width}x${height}`)
    }
    // 策略3: 已经很小了，继续降质量
    else if (quality > 0.15) {
      quality = Math.max(0.15, quality - 0.05)
    }
    // 策略4: 最后手段，进一步缩小尺寸
    else if (width > 300 || height > 300) {
      width = Math.round(width * 0.75)
      height = Math.round(height * 0.75)
      canvas.width = width
      canvas.height = height
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      quality = 0.4
      console.log(`📐 进一步缩小: ${width}x${height}`)
    }
    // 策略5: 极限压缩
    else {
      quality = Math.max(0.05, quality - 0.02)
    }

    blob = await canvasToBlob(canvas, format, quality)
    
    if (attempts % 5 === 0 || blob.size <= maxSize) {
      console.log(`🔄 尝试 ${attempts}: ${formatFileSize(blob.size)}, ${width}x${height}, Q:${quality.toFixed(2)}`)
    }
  }

  // 最终强制压缩
  if (blob.size > maxSize) {
    console.warn(`⚠️ 进入极限压缩模式...`)
    while (blob.size > maxSize && (width > 200 || height > 200)) {
      width = Math.max(200, Math.round(width * 0.7))
      height = Math.max(200, Math.round(height * 0.7))
      canvas.width = width
      canvas.height = height
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      blob = await canvasToBlob(canvas, format, 0.3)
      console.log(`💪 极限: ${width}x${height}, ${formatFileSize(blob.size)}`)
    }
  }

  const compressionRatio = ((file.size - blob.size) / file.size * 100).toFixed(1)
  console.log(`✅ 压缩完成: ${formatFileSize(file.size)} -> ${formatFileSize(blob.size)} (节省${compressionRatio}%)`)

  // 生成新的文件名（根据实际格式）
  const originalName = file.name.replace(/\.[^/.]+$/, '')
  const extension = format === 'image/jpeg' ? 'jpg' : 'png'
  const newFileName = `${originalName}.${extension}`

  return new File([blob], newFileName, {
    type: format,
    lastModified: Date.now()
  })
}

