/**
 * 分片下载和合并工具
 * 前端下载多个分片并合并成完整文件
 */

import { logger } from '../ui/logger'
import toast from '../toast'

/**
 * 下载并合并分片文件
 * @param baseURL 分片基础URL（例如：http://xxx/chunks/abc123）
 * @param totalChunks 总分片数
 * @param fileName 文件名
 * @param onProgress 进度回调
 */
export async function downloadAndMergeChunks(
  baseURL: string,
  totalChunks: number,
  fileName: string,
  onProgress?: (progress: number, downloaded: number, total: number) => void
): Promise<void> {
  logger.info(`开始下载分片文件`, { baseURL, totalChunks, fileName })
  
  try {
    // 1. 下载所有分片
    const chunks: Blob[] = []
    
    for (let i = 0; i < totalChunks; i++) {
      const chunkURL = `${baseURL}/chunk_${i}`
      logger.debug(`下载分片 ${i + 1}/${totalChunks}`, chunkURL)
      
      try {
        const response = await fetch(chunkURL)
        if (!response.ok) {
          throw new Error(`下载分片 ${i} 失败: ${response.statusText}`)
        }
        
        const blob = await response.blob()
        chunks.push(blob)
        
        // 更新进度
        const progress = Math.round(((i + 1) / totalChunks) * 90) // 下载占90%进度
        onProgress?.(progress, i + 1, totalChunks)
        
        logger.debug(`✓ 分片 ${i + 1} 下载成功 (${(blob.size / 1024 / 1024).toFixed(2)}MB)`)
      } catch (error) {
        logger.error(`下载分片 ${i} 失败`, error)
        throw new Error(`下载分片失败，请重试`)
      }
    }
    
    logger.info('所有分片下载完成，开始合并...')
    onProgress?.(95, totalChunks, totalChunks)
    
    // 2. 合并分片
    const mergedBlob = new Blob(chunks)
    logger.info(`文件合并完成，大小: ${(mergedBlob.size / 1024 / 1024).toFixed(2)}MB`)
    
    onProgress?.(98, totalChunks, totalChunks)
    
    // 3. 触发下载
    const url = URL.createObjectURL(mergedBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    
    // 释放URL对象
    setTimeout(() => URL.revokeObjectURL(url), 100)
    
    onProgress?.(100, totalChunks, totalChunks)
    logger.info('✅ 文件下载成功', fileName)
    toast.success('下载完成！')
    
  } catch (error) {
    logger.error('下载失败', error)
    toast.error((error as Error).message || '下载失败，请重试')
    throw error
  }
}

/**
 * 计算文件大小显示
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

