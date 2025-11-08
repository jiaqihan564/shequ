/**
 * 分片上传工具（支持并行上传）
 */

import SparkMD5 from 'spark-md5'

import { initChunkUpload, uploadChunk as apiUploadChunk, mergeChunks } from '../api/api'
import { logger } from '../ui/logger'

import { uploadConfig } from '@/config'

const CHUNK_SIZE = uploadConfig.chunkSize
const CHUNK_CONCURRENCY = uploadConfig.chunkConcurrency
const MAX_RETRIES = uploadConfig.chunkMaxRetries
const RETRY_BASE_DELAY = uploadConfig.chunkRetryBaseDelay

/**
 * 并发控制器 - 限制同时执行的任务数
 */
class ConcurrencyController {
  private running = 0
  private queue: Array<() => void> = []

  constructor(private limit: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    while (this.running >= this.limit) {
      await new Promise(resolve => this.queue.push(resolve as () => void))
    }

    this.running++
    try {
      return await fn()
    } finally {
      this.running--
      const next = this.queue.shift()
      if (next) next()
    }
  }
}

/**
 * 计算文件MD5
 */
export async function calculateFileMD5(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const blobSlice = File.prototype.slice
    const chunkSize = uploadConfig.chunkSize
    const chunks = Math.ceil(file.size / chunkSize)
    let currentChunk = 0
    const spark = new SparkMD5.ArrayBuffer()
    const fileReader = new FileReader()

    fileReader.onload = e => {
      spark.append(e.target?.result as ArrayBuffer)
      currentChunk++

      if (currentChunk < chunks) {
        loadNext()
      } else {
        resolve(spark.end())
      }
    }

    fileReader.onerror = () => {
      reject(new Error('文件读取失败'))
    }

    function loadNext() {
      const start = currentChunk * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      fileReader.readAsArrayBuffer(blobSlice.call(file, start, end))
    }

    loadNext()
  })
}

/**
 * 分片上传文件（支持断点续传）
 */
export async function uploadFileWithChunks(
  file: File,
  onProgress?: (progress: number) => void,
  onChunkComplete?: (chunkIndex: number, total: number) => void
): Promise<{ storagePath: string; totalChunks: number; fileHash: string }> {
  // 1. 计算文件MD5（作为upload_id）
  const uploadId = await calculateFileMD5(file)

  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

  // 3. 初始化上传
  const initResponse = await initChunkUpload({
    file_name: file.name,
    file_size: file.size,
    total_chunks: totalChunks,
    upload_id: uploadId
  })

  const uploadedChunks = new Set(initResponse.uploaded_chunks || [])
  const alreadyUploaded = uploadedChunks.size === totalChunks && totalChunks > 0

  if (alreadyUploaded) {
    logger.info(`检测到文件已存在，跳过分片上传`, {
      uploadId,
      totalChunks
    })
    onProgress?.(95)
  }

  // 4. 并行上传未上传的分片（受限并发，支持重试）
  let completed = uploadedChunks.size
  const concurrencyController = new ConcurrencyController(CHUNK_CONCURRENCY)

  logger.info(`开始上传分片 (并发数: ${CHUNK_CONCURRENCY}, 总分片: ${totalChunks}, 已完成: ${completed})`)

  // 创建上传任务数组
  const uploadTasks: Promise<void>[] = []

  for (let i = 0; i < totalChunks; i++) {
    if (uploadedChunks.has(i)) {
      // 已上传的分片跳过
      continue
    }

    // 为每个分片创建独立的上传任务
    const chunkIndex = i
    const uploadTask = concurrencyController.run(async () => {
      // 支持重试
      let retries = MAX_RETRIES
      let lastError: Error | null = null

      while (retries > 0) {
        try {
          const attemptNum = MAX_RETRIES - retries + 1
          if (attemptNum > 1) {
            logger.debug(
              `上传分片 ${chunkIndex + 1}/${totalChunks} (重试: ${attemptNum}/${MAX_RETRIES})`
            )
          } else {
            logger.debug(`上传分片 ${chunkIndex + 1}/${totalChunks}`)
          }

          const start = chunkIndex * CHUNK_SIZE
          const end = Math.min(start + CHUNK_SIZE, file.size)
          const chunkBlob = file.slice(start, end)

          await apiUploadChunk(uploadId, chunkIndex, chunkBlob)

          // 上传成功
          completed++
          onChunkComplete?.(chunkIndex, totalChunks)
          const progress = Math.round((completed / totalChunks) * 100)
          onProgress?.(progress)
          logger.debug(`✓ 分片 ${chunkIndex + 1} 上传成功 (${progress}%)`)

          return // 成功，退出重试循环
        } catch (error) {
          retries--
          lastError = error as Error
          logger.warn(
            `✗ 分片 ${chunkIndex + 1} 上传失败 (剩余重试: ${retries})`,
            error
          )

          if (retries > 0) {
            // 指数退避：1s, 2s, 4s...
            const waitTime = RETRY_BASE_DELAY * Math.pow(2, MAX_RETRIES - retries - 1)
            logger.debug(`等待 ${waitTime}ms 后重试...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
          }
        }
      }

      // 所有重试都失败
      if (lastError) {
        const errorMsg = `上传失败，请检查网络连接后重试`
        logger.error(`分片 ${chunkIndex + 1} 上传失败（已重试${MAX_RETRIES}次）: ${lastError.message || '网络连接失败'}`)
        throw new Error(errorMsg)
      }
    })

    uploadTasks.push(uploadTask)
  }

  // 等待所有分片上传完成
  try {
    await Promise.all(uploadTasks)
    logger.info(`所有分片上传完成 (${totalChunks}/${totalChunks})`)
  } catch (error) {
    logger.error('分片上传失败:', error)
    throw error
  }

  // 5. 保存分片信息（新方案：不合并，直接返回分片信息）
  logger.info('保存分片信息...')
  onProgress?.(99) // 显示99%，表示正在处理
  
  try {
    const mergeResponse = await mergeChunks(uploadId)
    onProgress?.(100) // 信息保存完成，显示100%
    logger.info('分片信息保存成功', mergeResponse)
    return {
      storagePath: mergeResponse.storage_path,
      totalChunks: mergeResponse.total_chunks,
      fileHash: uploadId
    }
  } catch (error) {
    logger.error('保存分片信息失败:', error)
    throw new Error('文件处理失败，请稍后重试')
  }
}
