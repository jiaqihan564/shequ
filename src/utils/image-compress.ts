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

  // 4. 逐步降低质量直到满足目标大小
  let quality = initialQuality
  let blob: Blob | null = null
  let attempts = 0
  const maxAttempts = 30 // 增加尝试次数

  while (attempts < maxAttempts) {
    blob = await canvasToBlob(canvas, outputFormat, quality)

    // 如果已经小于目标大小，就停止
    if (blob.size <= targetSize) {
      break
    }

    // 如果质量已经到最低但文件还是太大，尝试缩小尺寸
    if (quality <= minQuality && targetWidth > 128 && targetHeight > 128) {
      // 缩小10%
      targetWidth = Math.round(targetWidth * 0.9)
      targetHeight = Math.round(targetHeight * 0.9)
      canvas.width = targetWidth
      canvas.height = targetHeight
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
      
      // 重置质量重新尝试
      quality = initialQuality * 0.8
    } else {
      // 降低质量
      quality -= qualityStep
    }
    
    attempts++
  }

  if (!blob) {
    throw new Error('图片压缩失败')
  }

  // 最后检查：如果还是超过目标大小，强制缩到最小可接受尺寸
  if (blob.size > targetSize) {
    let minSize = 256 // 最小256px
    while (blob.size > targetSize && targetWidth > minSize && targetHeight > minSize) {
      targetWidth = Math.round(targetWidth * 0.85)
      targetHeight = Math.round(targetHeight * 0.85)
      canvas.width = targetWidth
      canvas.height = targetHeight
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
      blob = await canvasToBlob(canvas, outputFormat, minQuality)
    }
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

