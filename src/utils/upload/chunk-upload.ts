/**
 * 分片上传工具
 */

import SparkMD5 from 'spark-md5'
import { initChunkUpload, uploadChunk as apiUploadChunk, mergeChunks } from '../api/api'
import { logger } from '../ui/logger'

const CHUNK_SIZE = 2 * 1024 * 1024 // 2MB每片

/**
 * 计算文件MD5
 */
export async function calculateFileMD5(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const blobSlice = File.prototype.slice
    const chunkSize = 2 * 1024 * 1024
    const chunks = Math.ceil(file.size / chunkSize)
    let currentChunk = 0
    const spark = new SparkMD5.ArrayBuffer()
    const fileReader = new FileReader()

    fileReader.onload = (e) => {
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
): Promise<string> {
  // 1. 计算文件MD5（作为upload_id）
  const uploadId = await calculateFileMD5(file)
  
  // 2. 文件切片
  const chunks: Blob[] = []
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, file.size)
    chunks.push(file.slice(start, end))
  }

  // 3. 初始化上传
  const initResponse = await initChunkUpload({
    file_name: file.name,
    file_size: file.size,
    total_chunks: totalChunks,
    upload_id: uploadId
  })

  const uploadedChunks = new Set(initResponse.uploaded_chunks || [])
  
  // 4. 上传未上传的分片（串行上传，避免并发问题）
  let completed = uploadedChunks.size

  for (let i = 0; i < totalChunks; i++) {
    if (uploadedChunks.has(i)) {
      // 已上传的分片也计入进度
      continue
    }

    try {
      logger.debug(`上传分片 ${i + 1}/${totalChunks}`)
      await apiUploadChunk(uploadId, i, chunks[i])
      completed++
      onChunkComplete?.(i, totalChunks)
      const progress = Math.round((completed / totalChunks) * 100)
      onProgress?.(progress)
      logger.debug(`分片 ${i + 1} 上传成功，总进度: ${progress}%`)
    } catch (error) {
      logger.error(`分片 ${i + 1} 上传失败:`, error)
      throw new Error(`分片 ${i + 1} 上传失败`)
    }
  }

  // 5. 合并分片
  const mergeResponse = await mergeChunks(uploadId)
  
  return mergeResponse.storage_path
}

