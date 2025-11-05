import axios from 'axios'
import type {
  ExecuteCodeRequest,
  ExecuteCodeResponse,
  SaveSnippetRequest,
  UpdateSnippetRequest,
  CodeSnippet,
  CodeSnippetsResponse,
  CodeExecutionsResponse,
  ShareSnippetResponse,
  LanguageInfo,
  PublicSnippetsResponse
} from '@/types/code'
import { apiConfig, codeExecutionConfig } from '@/config'
import { addAuthTokenInterceptor, addRequestIdInterceptor, handleResponseError } from './axios-helpers'

// 创建 axios 实例（代码执行专用，使用更长的超时时间）
const request = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: codeExecutionConfig.timeout, // 代码执行需要更长超时
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 使用公共辅助函数
request.interceptors.request.use(
  (config) => {
    config = addAuthTokenInterceptor(config)
    config = addRequestIdInterceptor(config)
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 统一处理响应
request.interceptors.response.use(
  (response) => {
    // 如果响应包含 data 字段，直接返回 data
    if (response.data && response.data.data !== undefined) {
      return { ...response, data: response.data.data }
    }
    return response
  },
  handleResponseError // 使用公共错误处理
)

const API_PREFIX = ''

/**
 * 执行代码
 */
export async function executeCode(data: ExecuteCodeRequest): Promise<ExecuteCodeResponse> {
  const response = await request.post<ExecuteCodeResponse>(`${API_PREFIX}/code/execute`, data)
  return response.data
}

/**
 * 保存代码片段
 */
export async function saveSnippet(data: SaveSnippetRequest): Promise<CodeSnippet> {
  const response = await request.post<CodeSnippet>(`${API_PREFIX}/code/snippets`, data)
  return response.data
}

/**
 * 获取代码片段列表
 */
export async function getSnippets(page = 1, pageSize = 20): Promise<CodeSnippetsResponse> {
  const response = await request.get<CodeSnippetsResponse>(`${API_PREFIX}/code/snippets`, {
    params: { page, page_size: pageSize }
  })
  return response.data
}

/**
 * 获取代码片段详情
 */
export async function getSnippetById(id: number): Promise<CodeSnippet> {
  const response = await request.get<CodeSnippet>(`${API_PREFIX}/code/snippets/${id}`)
  return response.data
}

/**
 * 更新代码片段
 */
export async function updateSnippet(id: number, data: UpdateSnippetRequest): Promise<CodeSnippet> {
  const response = await request.put<CodeSnippet>(`${API_PREFIX}/code/snippets/${id}`, data)
  return response.data
}

/**
 * 删除代码片段
 */
export async function deleteSnippet(id: number): Promise<void> {
  await request.delete(`${API_PREFIX}/code/snippets/${id}`)
}

/**
 * 获取执行历史记录
 */
export async function getExecutionHistory(
  page = 1,
  pageSize = 20
): Promise<CodeExecutionsResponse> {
  const response = await request.get<CodeExecutionsResponse>(`${API_PREFIX}/code/executions`, {
    params: { page, page_size: pageSize }
  })
  return response.data
}

/**
 * 生成分享链接
 */
export async function generateShareLink(id: number): Promise<ShareSnippetResponse> {
  const response = await request.post<ShareSnippetResponse>(
    `${API_PREFIX}/code/snippets/${id}/share`
  )
  return response.data
}

/**
 * 通过分享令牌获取代码片段
 */
export async function getSharedSnippet(token: string): Promise<CodeSnippet> {
  const response = await request.get<CodeSnippet>(`${API_PREFIX}/code/share/${token}`)
  return response.data
}

/**
 * 获取支持的语言列表
 */
export async function getSupportedLanguages(): Promise<LanguageInfo[]> {
  const response = await request.get<LanguageInfo[]>(`${API_PREFIX}/code/languages`)
  return response.data
}

/**
 * 获取公开的代码片段列表
 */
export async function getPublicSnippets(
  page = 1,
  pageSize = 20,
  language?: string
): Promise<PublicSnippetsResponse> {
  const response = await request.get<PublicSnippetsResponse>(`${API_PREFIX}/code/public`, {
    params: { page, page_size: pageSize, language }
  })
  return response.data
}


