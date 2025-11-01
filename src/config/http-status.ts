/**
 * HTTP 状态码常量
 * 统一管理所有HTTP状态码，提高代码可读性和可维护性
 */

/**
 * 成功状态码 (2xx)
 */
export const HTTP_STATUS_SUCCESS = {
  /** 200 OK - 请求成功 */
  OK: 200,
  
  /** 201 Created - 资源创建成功 */
  CREATED: 201,
  
  /** 204 No Content - 请求成功但无返回内容 */
  NO_CONTENT: 204,
} as const

/**
 * 重定向状态码 (3xx)
 */
export const HTTP_STATUS_REDIRECT = {
  /** 301 Moved Permanently - 永久重定向 */
  MOVED_PERMANENTLY: 301,
  
  /** 302 Found - 临时重定向 */
  FOUND: 302,
  
  /** 304 Not Modified - 资源未修改 */
  NOT_MODIFIED: 304,
} as const

/**
 * 客户端错误状态码 (4xx)
 */
export const HTTP_STATUS_CLIENT_ERROR = {
  /** 400 Bad Request - 请求参数错误 */
  BAD_REQUEST: 400,
  
  /** 401 Unauthorized - 未授权/认证失败 */
  UNAUTHORIZED: 401,
  
  /** 403 Forbidden - 禁止访问 */
  FORBIDDEN: 403,
  
  /** 404 Not Found - 资源未找到 */
  NOT_FOUND: 404,
  
  /** 422 Unprocessable Entity - 请求格式正确但语义错误 */
  UNPROCESSABLE_ENTITY: 422,
  
  /** 429 Too Many Requests - 请求过多 */
  TOO_MANY_REQUESTS: 429,
} as const

/**
 * 服务器错误状态码 (5xx)
 */
export const HTTP_STATUS_SERVER_ERROR = {
  /** 500 Internal Server Error - 服务器内部错误 */
  INTERNAL_SERVER_ERROR: 500,
  
  /** 502 Bad Gateway - 网关错误 */
  BAD_GATEWAY: 502,
  
  /** 503 Service Unavailable - 服务不可用 */
  SERVICE_UNAVAILABLE: 503,
  
  /** 504 Gateway Timeout - 网关超时 */
  GATEWAY_TIMEOUT: 504,
} as const

/**
 * 所有HTTP状态码的联合
 */
export const HTTP_STATUS = {
  ...HTTP_STATUS_SUCCESS,
  ...HTTP_STATUS_REDIRECT,
  ...HTTP_STATUS_CLIENT_ERROR,
  ...HTTP_STATUS_SERVER_ERROR,
} as const

/**
 * HTTP状态码类型
 */
export type HttpStatusCode = typeof HTTP_STATUS[keyof typeof HTTP_STATUS]

/**
 * 检查是否为成功状态码 (2xx)
 */
export function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300
}

/**
 * 检查是否为重定向状态码 (3xx)
 */
export function isRedirectStatus(status: number): boolean {
  return status >= 300 && status < 400
}

/**
 * 检查是否为客户端错误状态码 (4xx)
 */
export function isClientErrorStatus(status: number): boolean {
  return status >= 400 && status < 500
}

/**
 * 检查是否为服务器错误状态码 (5xx)
 */
export function isServerErrorStatus(status: number): boolean {
  return status >= 500 && status < 600
}

/**
 * 检查是否为错误状态码 (4xx 或 5xx)
 */
export function isErrorStatus(status: number): boolean {
  return status >= 400
}

export default HTTP_STATUS

