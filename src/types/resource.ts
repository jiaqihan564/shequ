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
  storage_path: string
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
  storage_path: string
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
  storage_path: string
  file_url: string
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
