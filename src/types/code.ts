// 代码相关类型定义

export interface CodeSnippet {
  id: number
  user_id: number
  title: string
  language: string
  code: string
  description: string
  is_public: boolean
  share_token?: string
  created_at: string
  updated_at: string
}

export interface CodeSnippetListItem {
  id: number
  title: string
  language: string
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface CodeSnippetWithUser {
  id: number
  user_id: number
  username: string
  title: string
  language: string
  code: string
  description: string
  share_token?: string
  created_at: string
  updated_at: string
}

export interface CodeExecution {
  id: number
  snippet_id?: number
  user_id: number
  language: string
  code: string
  stdin: string
  output: string
  error: string
  execution_time?: number // 毫秒
  memory_usage?: number // 字节
  status: 'success' | 'error' | 'timeout'
  created_at: string
}

export interface ExecuteCodeRequest {
  language: string
  code: string
  stdin?: string
  save_as?: string // 可选：保存代码片段的标题
}

export interface ExecuteCodeResponse {
  output: string
  error?: string
  execution_time: number // 毫秒
  status: 'success' | 'error' | 'timeout'
  snippet_id?: number
}

export interface SaveSnippetRequest {
  title: string
  language: string
  code: string
  description?: string
  is_public?: boolean
}

export interface UpdateSnippetRequest {
  title?: string
  code?: string
  description?: string
  is_public?: boolean
}

export interface ShareSnippetResponse {
  share_token: string
  share_url: string
}

export interface LanguageInfo {
  id: string
  name: string
  version: string
  piston_name: string
  default_code: string
}

export interface CodeSnippetsResponse {
  items: CodeSnippetListItem[]
  total: number
  page: number
  page_size: number
}

export interface CodeExecutionsResponse {
  items: CodeExecution[]
  total: number
  page: number
  page_size: number
}

export interface PublicSnippetsResponse {
  items: CodeSnippetWithUser[]
  total: number
  page: number
  page_size: number
}

// 代码示例
export interface CodeExample {
  id: string
  title: string
  description: string
  code: string
  stdin?: string
  expectedOutput?: string
}

export interface CodeExamplesData {
  [language: string]: CodeExample[]
}
