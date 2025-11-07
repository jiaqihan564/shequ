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

