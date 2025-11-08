// 资源系统类型定义

export interface ResourceAuthor {
  id: number
  username: string
  nickname: string
  avatar: string
}

export interface ResourceCategory {
  id: number
  name: string
  slug: string
  description?: string
  resource_count?: number
}

export interface ResourceImage {
  id: number
  resource_id: number
  image_url: string
  image_order: number
  is_cover: boolean
  created_at: string
}

export interface Resource {
  id: number
  user_id: number
  title: string
  description: string
  document: string
  category_id?: number
  file_name: string
  file_size: number
  file_type: string
  file_extension: string
  file_hash: string
  storage_path: string
  total_chunks: number      // 分片总数（用于前端下载合并）
  download_count: number
  view_count: number
  like_count: number
  status: number
  created_at: string
  updated_at: string
  author: ResourceAuthor
  images: ResourceImage[]
  category?: ResourceCategory
  tags: string[]
  is_liked: boolean
}

export interface ResourceListItem {
  id: number
  title: string
  description: string
  author: ResourceAuthor
  category?: ResourceCategory
  cover_image: string
  file_name: string
  file_size: number
  file_extension: string
  file_hash: string
  download_count: number
  view_count: number
  like_count: number
  created_at: string
}

export interface ResourceListResponse {
  resources: ResourceListItem[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface CreateResourceRequest {
  title: string
  description: string
  document: string
  category_id?: number
  file_name: string
  file_size: number
  file_type: string
  file_hash: string
  storage_path: string
  total_chunks: number  // 分片总数（用于前端下载合并）
  image_urls: string[]
  tags: string[]
}

// 分片上传相关
export interface InitUploadRequest {
  file_name: string
  file_size: number
  total_chunks: number
  upload_id: string
}

export interface InitUploadResponse {
  upload_id: string
  uploaded_chunks: number[]
  chunk_size: number
}

export interface MergeChunksResponse {
  storage_path: string  // 分片路径前缀
  file_url: string      // 分片基础URL
  total_chunks: number  // 总分片数
}

export interface ResourceChunkDownloadInfo {
  chunk_base_url?: string
  chunk_urls: string[]
  total_chunks: number
  file_name: string
  file_size: number
}

// 资源评论相关类型
export interface ResourceCommentUser {
  id: number
  username: string
  nickname: string
  avatar: string
}

export interface ResourceComment {
  id: number
  resource_id: number
  user_id: number
  parent_id: number
  root_id: number
  content: string
  like_count: number
  reply_count: number
  is_liked: boolean
  user: ResourceCommentUser
  reply_to_user?: ResourceCommentUser
  replies?: ResourceComment[]
  created_at: string
}

export interface ResourceCommentsResponse {
  comments: ResourceComment[]
  total: number
  page: number
  page_size: number
  total_pages: number
}
