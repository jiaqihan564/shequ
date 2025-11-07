// 文章相关类型定义

export interface Article {
  id: number
  user_id: number
  title: string
  description: string
  content: string
  status: number // 0-草稿，1-已发布，2-已删除
  view_count: number
  like_count: number
  comment_count: number
  created_at: string
  updated_at: string
}

export interface ArticleAuthor {
  id: number
  username: string
  nickname: string
  avatar: string
}

export interface ArticleCodeBlock {
  id?: number
  language: string
  code_content: string
  description?: string
  order_index: number
}

export interface ArticleCategory {
  id: number
  name: string
  slug: string
  description?: string
  parent_id: number
  article_count: number
  sort_order: number
  created_at: string
}

export interface ArticleTag {
  id: number
  name: string
  slug: string
  article_count: number
  created_at: string
}

export interface ArticleDetail extends Article {
  author: ArticleAuthor
  code_blocks: ArticleCodeBlock[]
  categories: ArticleCategory[]
  tags: ArticleTag[]
  is_liked: boolean
}

export interface ArticleListItem {
  id: number
  title: string
  description: string
  author: ArticleAuthor
  categories: ArticleCategory[]
  tags: ArticleTag[]
  view_count: number
  like_count: number
  comment_count: number
  created_at: string
  updated_at: string
}

export interface ArticleListResponse {
  articles: ArticleListItem[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface CreateArticleRequest {
  title: string
  description: string
  content: string
  status: number // 0-草稿，1-发布
  code_blocks: ArticleCodeBlock[]
  category_ids: number[]
  tag_ids?: number[]
  tag_names?: string[]
}

export interface UpdateArticleRequest {
  title?: string
  description?: string
  content?: string
  status?: number
  code_blocks?: ArticleCodeBlock[]
  category_ids?: number[]
  tag_ids?: number[]
  tag_names?: string[]
}

export interface CommentAuthor {
  id: number
  username: string
  nickname: string
  avatar: string
}

export interface ArticleComment {
  id: number
  article_id: number
  user_id: number
  parent_id: number
  root_id: number
  reply_to_user_id?: number
  content: string
  like_count: number
  reply_count: number
  status: number
  created_at: string
  updated_at: string
  author?: CommentAuthor // 兼容不同API响应
  user?: CommentAuthor // 兼容不同API响应
  reply_to_user?: CommentAuthor
  replies?: ArticleComment[]
  is_liked?: boolean
}

export interface CreateCommentRequest {
  content: string
  parent_id?: number
  reply_to_user_id?: number
}

export interface CommentsResponse {
  comments: ArticleComment[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface CreateReportRequest {
  article_id?: number
  comment_id?: number
  reason: string
}

export interface ArticleListQuery {
  page?: number
  page_size?: number
  category_id?: number
  tag_id?: number
  user_id?: number
  status?: number
  keyword?: string
  sort_by?: 'latest' | 'hot' | 'popular'
}

// 支持的编程语言列表
export const SUPPORTED_LANGUAGES = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'Python', value: 'python' },
  { label: 'Go', value: 'go' },
  { label: 'Java', value: 'java' },
  { label: 'C', value: 'c' },
  { label: 'C++', value: 'cpp' },
  { label: 'C#', value: 'csharp' },
  { label: 'PHP', value: 'php' },
  { label: 'Ruby', value: 'ruby' },
  { label: 'Rust', value: 'rust' },
  { label: 'Swift', value: 'swift' },
  { label: 'Dart', value: 'dart' },
  { label: 'SQL', value: 'sql' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'SCSS', value: 'scss' },
  { label: 'JSON', value: 'json' },
  { label: 'YAML', value: 'yaml' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'Bash', value: 'bash' },
  { label: 'Shell', value: 'shell' },
  { label: 'Docker', value: 'dockerfile' },
  { label: 'PlainText', value: 'plaintext' }
] as const
