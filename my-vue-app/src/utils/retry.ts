/**
 * API请求重试机制
 * 支持指数退避、最大重试次数、可重试条件等
 */

export interface RetryOptions {
  maxRetries?: number // 最大重试次数
  initialDelay?: number // 初始延迟（毫秒）
  maxDelay?: number // 最大延迟（毫秒）
  backoffFactor?: number // 退避因子
  retryCondition?: (error: any) => boolean // 可重试条件
  onRetry?: (attempt: number, error: any) => void // 重试回调
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error: any) => {
    // 默认：网络错误或5xx服务器错误可重试
    if (!error.response) {
      return true // 网络错误
    }
    const status = error.response.status
    return status >= 500 && status < 600 // 5xx错误
  },
  onRetry: () => {}
}

/**
 * 执行带重试的异步操作
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: any

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // 检查是否应该重试
      if (attempt >= opts.maxRetries || !opts.retryCondition(error)) {
        throw error
      }

      // 计算延迟时间（指数退避）
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffFactor, attempt),
        opts.maxDelay
      )

      // 触发重试回调
      opts.onRetry(attempt + 1, error)

      console.log(`[重试] 第${attempt + 1}次重试，${delay}ms后执行...`)

      // 等待后重试
      await sleep(delay)
    }
  }

  throw lastError
}

/**
 * 睡眠函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 创建可重试的API调用函数
 */
export function createRetryableFetch<T>(
  fetcher: () => Promise<T>,
  options?: RetryOptions
): () => Promise<T> {
  return () => withRetry(fetcher, options)
}

/**
 * 批量重试（并行）
 */
export async function retryBatch<T>(
  tasks: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<T[]> {
  const retryableTasks = tasks.map(task => () => withRetry(task, options))
  return Promise.all(retryableTasks.map(task => task()))
}

/**
 * 批量重试（串行）
 */
export async function retryBatchSequential<T>(
  tasks: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<T[]> {
  const results: T[] = []
  
  for (const task of tasks) {
    const result = await withRetry(task, options)
    results.push(result)
  }
  
  return results
}

/**
 * 断路器模式
 * 当失败率过高时，暂时停止请求，避免雪崩效应
 */
export class CircuitBreaker {
  private failureCount = 0
  private successCount = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  
  constructor(
    private threshold: number = 5, // 失败阈值
    private timeout: number = 60000, // 断路器打开时间（毫秒）
    private halfOpenRequests: number = 3 // 半开状态允许的请求数
  ) {}

  /**
   * 执行操作
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // 检查状态
    if (this.state === 'open') {
      // 检查是否应该进入半开状态
      if (Date.now() - this.lastFailureTime >= this.timeout) {
        this.state = 'half-open'
        this.failureCount = 0
        console.log('[断路器] 进入半开状态')
      } else {
        throw new Error('断路器已打开，请求被拒绝')
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  /**
   * 成功回调
   */
  private onSuccess(): void {
    this.successCount++
    
    if (this.state === 'half-open') {
      if (this.successCount >= this.halfOpenRequests) {
        this.state = 'closed'
        this.failureCount = 0
        this.successCount = 0
        console.log('[断路器] 恢复正常状态')
      }
    } else {
      this.failureCount = 0
    }
  }

  /**
   * 失败回调
   */
  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    
    if (this.failureCount >= this.threshold) {
      this.state = 'open'
      console.warn(`[断路器] 失败次数达到阈值(${this.threshold})，断路器已打开`)
    }
  }

  /**
   * 获取当前状态
   */
  getState(): string {
    return this.state
  }

  /**
   * 重置断路器
   */
  reset(): void {
    this.state = 'closed'
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = 0
  }
}

/**
 * 创建带断路器的API调用
 */
export function withCircuitBreaker<T>(
  fn: () => Promise<T>,
  breaker: CircuitBreaker
): Promise<T> {
  return breaker.execute(fn)
}

/**
 * 请求去重器（防抖）
 */
export class RequestDeduplicator {
  private pending = new Map<string, Promise<any>>()

  /**
   * 执行去重请求
   */
  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // 检查是否有pending请求
    const pending = this.pending.get(key)
    if (pending) {
      console.log(`[去重] 复用pending请求: ${key}`)
      return pending
    }

    // 创建新请求
    const promise = fn()
      .finally(() => {
        // 请求完成后清理
        this.pending.delete(key)
      })

    this.pending.set(key, promise)
    return promise
  }

  /**
   * 清除指定key
   */
  clear(key: string): void {
    this.pending.delete(key)
  }

  /**
   * 清除所有
   */
  clearAll(): void {
    this.pending.clear()
  }

  /**
   * 获取pending数量
   */
  getPendingCount(): number {
    return this.pending.size
  }
}

// 全局去重器实例
export const requestDeduplicator = new RequestDeduplicator()

/**
 * 超时控制
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError?: Error
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(timeoutError || new Error(`请求超时 (${timeoutMs}ms)`))
    }, timeoutMs)
  })

  return Promise.race([promise, timeout])
}

/**
 * 组合工具：重试 + 超时 + 去重
 */
export async function smartFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    retry?: RetryOptions
    timeout?: number
    deduplicate?: boolean
  } = {}
): Promise<T> {
  const { retry, timeout, deduplicate = true } = options

  const execute = async () => {
    let promise = fetcher()

    // 添加超时
    if (timeout) {
      promise = withTimeout(promise, timeout)
    }

    // 添加重试
    if (retry) {
      return withRetry(() => promise, retry)
    }

    return promise
  }

  // 添加去重
  if (deduplicate) {
    return requestDeduplicator.execute(key, execute)
  }

  return execute()
}

export default {
  withRetry,
  withTimeout,
  CircuitBreaker,
  RequestDeduplicator,
  smartFetch
}

