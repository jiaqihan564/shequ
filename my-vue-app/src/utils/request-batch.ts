/**
 * 请求批处理和智能缓存工具
 */

// 请求批处理器
class RequestBatcher<T = any> {
  private pending: Map<string, Promise<T>> = new Map()
  private timeout: number = 50 // 批处理窗口（毫秒）
  private batchQueue: Map<string, { resolve: Function; reject: Function }[]> = new Map()
  private timer: number | null = null

  constructor(timeout: number = 50) {
    this.timeout = timeout
  }

  /**
   * 批处理请求
   * 在指定时间窗口内合并相同的请求
   */
  batch(key: string, fetcher: () => Promise<T>): Promise<T> {
    // 如果已有相同请求正在进行，直接返回
    const existing = this.pending.get(key)
    if (existing) {
      return existing
    }

    // 创建新的批处理Promise
    const promise = new Promise<T>((resolve, reject) => {
      const queue = this.batchQueue.get(key) || []
      queue.push({ resolve, reject })
      this.batchQueue.set(key, queue)

      // 设置定时器，在窗口结束时执行
      if (!this.timer) {
        this.timer = window.setTimeout(() => {
          this.flush()
        }, this.timeout)
      }
    })

    this.pending.set(key, promise)
    return promise
  }

  /**
   * 立即执行所有批处理请求
   */
  private async flush(): Promise<void> {
    this.timer = null

    const batches = Array.from(this.batchQueue.entries())
    this.batchQueue.clear()

    for (const [key, queue] of batches) {
      const promise = this.pending.get(key)
      if (promise) {
        try {
          const result = await promise
          queue.forEach((item) => item.resolve(result))
        } catch (error) {
          queue.forEach((item) => item.reject(error))
        } finally {
          this.pending.delete(key)
        }
      }
    }
  }
}

// 全局请求批处理器
const globalBatcher = new RequestBatcher()

/**
 * 批处理装饰器函数
 */
export function batchRequest<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  return globalBatcher.batch(key, fetcher)
}

// 智能缓存策略
interface CacheEntry<T> {
  data: T
  timestamp: number
  hits: number
  ttl: number
}

interface CacheOptions {
  ttl?: number // 缓存时间（毫秒）
  maxSize?: number // 最大缓存数量
  strategy?: 'lru' | 'lfu' | 'fifo' // 缓存策略
}

/**
 * 智能缓存管理器
 */
export class SmartCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map()
  private accessOrder: string[] = [] // LRU 访问顺序
  private options: Required<CacheOptions>

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: 5 * 60 * 1000, // 默认5分钟
      maxSize: 100,
      strategy: 'lru',
      ...options
    }
  }

  /**
   * 获取缓存
   */
  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.removeFromAccessOrder(key)
      return null
    }

    // 更新访问统计
    entry.hits++
    this.updateAccessOrder(key)

    return entry.data
  }

  /**
   * 设置缓存
   */
  set(key: string, data: T, customTTL?: number): void {
    // 检查缓存大小限制
    if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      this.evict()
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      hits: 0,
      ttl: customTTL || this.options.ttl
    }

    this.cache.set(key, entry)
    this.updateAccessOrder(key)
  }

  /**
   * 删除缓存
   */
  delete(key: string): void {
    this.cache.delete(key)
    this.removeFromAccessOrder(key)
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
    this.accessOrder = []
  }

  /**
   * 缓存淘汰
   */
  private evict(): void {
    switch (this.options.strategy) {
      case 'lru':
        this.evictLRU()
        break
      case 'lfu':
        this.evictLFU()
        break
      case 'fifo':
        this.evictFIFO()
        break
    }
  }

  /**
   * LRU 淘汰：删除最久未使用的
   */
  private evictLRU(): void {
    if (this.accessOrder.length > 0) {
      const key = this.accessOrder.shift()!
      this.cache.delete(key)
    }
  }

  /**
   * LFU 淘汰：删除访问次数最少的
   */
  private evictLFU(): void {
    let minHits = Infinity
    let minKey: string | null = null

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < minHits) {
        minHits = entry.hits
        minKey = key
      }
    }

    if (minKey) {
      this.cache.delete(minKey)
      this.removeFromAccessOrder(minKey)
    }
  }

  /**
   * FIFO 淘汰：删除最先进入的
   */
  private evictFIFO(): void {
    if (this.cache.size > 0) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
      this.removeFromAccessOrder(firstKey)
    }
  }

  /**
   * 更新访问顺序（LRU）
   */
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key)
    this.accessOrder.push(key)
  }

  /**
   * 从访问顺序中移除
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number
    maxSize: number
    hitRate: number
    entries: Array<{ key: string; hits: number; age: number }>
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      hits: entry.hits,
      age: Date.now() - entry.timestamp
    }))

    const totalHits = entries.reduce((sum, e) => sum + e.hits, 0)
    const hitRate = entries.length > 0 ? totalHits / entries.length : 0

    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hitRate,
      entries
    }
  }
}

// 全局智能缓存实例
const globalSmartCache = new SmartCache({
  ttl: 5 * 60 * 1000,
  maxSize: 200,
  strategy: 'lru'
})

/**
 * 带缓存的请求函数
 */
export async function cachedRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttl?: number; forceRefresh?: boolean } = {}
): Promise<T> {
  // 强制刷新
  if (options.forceRefresh) {
    const data = await fetcher()
    globalSmartCache.set(key, data, options.ttl)
    return data
  }

  // 尝试从缓存获取
  const cached = globalSmartCache.get(key)
  if (cached !== null) {
    return cached as T
  }

  // 缓存未命中，发起请求
  const data = await fetcher()
  globalSmartCache.set(key, data, options.ttl)
  return data
}

/**
 * 导出全局缓存实例
 */
export { globalSmartCache as smartCache }

/**
 * 请求去重器
 * 防止短时间内重复请求
 */
export class RequestDeduplicator {
  private pending: Map<string, Promise<any>> = new Map()

  async deduplicate<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // 如果有相同的请求正在进行，返回现有Promise
    const existing = this.pending.get(key)
    if (existing) {
      return existing as Promise<T>
    }

    // 创建新请求
    const promise = fetcher().finally(() => {
      // 请求完成后清理
      this.pending.delete(key)
    })

    this.pending.set(key, promise)
    return promise
  }

  clear(): void {
    this.pending.clear()
  }
}

// 全局去重器
const globalDeduplicator = new RequestDeduplicator()

/**
 * 去重请求
 */
export function deduplicateRequest<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  return globalDeduplicator.deduplicate(key, fetcher)
}

/**
 * 请求重试
 */
export async function retryRequest<T>(
  fetcher: () => Promise<T>,
  options: {
    retries?: number
    delay?: number
    backoff?: number
    onRetry?: (error: any, attempt: number) => void
  } = {}
): Promise<T> {
  const {
    retries = 3,
    delay = 1000,
    backoff = 2,
    onRetry
  } = options

  let lastError: any

  for (let i = 0; i <= retries; i++) {
    try {
      return await fetcher()
    } catch (error) {
      lastError = error

      if (i < retries) {
        const waitTime = delay * Math.pow(backoff, i)
        onRetry?.(error, i + 1)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    }
  }

  throw lastError
}

/**
 * 并发控制
 */
export class ConcurrencyController {
  private running: number = 0
  private queue: Array<() => void> = []

  constructor(private maxConcurrency: number = 6) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    while (this.running >= this.maxConcurrency) {
      await new Promise((resolve) => this.queue.push(resolve))
    }

    this.running++

    try {
      return await fn()
    } finally {
      this.running--
      const resolve = this.queue.shift()
      if (resolve) {
        resolve()
      }
    }
  }
}

// 全局并发控制器
const globalConcurrencyController = new ConcurrencyController(6)

/**
 * 并发控制请求
 */
export function concurrentRequest<T>(fetcher: () => Promise<T>): Promise<T> {
  return globalConcurrencyController.run(fetcher)
}

