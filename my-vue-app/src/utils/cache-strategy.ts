/**
 * API 缓存策略配置
 * 为不同类型的API提供差异化的缓存策略
 */

export interface CacheConfig {
  ttl: number // 缓存时间（毫秒）
  forceRefresh?: boolean // 是否强制刷新
  staleWhileRevalidate?: number // 过期后继续使用的时间（毫秒）
}

export const CacheStrategy = {
  // 静态数据（变化很少）
  STATIC: {
    ttl: 60 * 60 * 1000, // 1小时
    staleWhileRevalidate: 24 * 60 * 60 * 1000 // 24小时
  } as CacheConfig,

  // 半静态数据（偶尔变化）
  SEMI_STATIC: {
    ttl: 30 * 60 * 1000, // 30分钟
    staleWhileRevalidate: 2 * 60 * 60 * 1000 // 2小时
  } as CacheConfig,

  // 用户数据（较少变化）
  USER_DATA: {
    ttl: 10 * 60 * 1000, // 10分钟
    staleWhileRevalidate: 30 * 60 * 1000 // 30分钟
  } as CacheConfig,

  // 内容数据（经常变化）
  CONTENT: {
    ttl: 5 * 60 * 1000, // 5分钟
    staleWhileRevalidate: 15 * 60 * 1000 // 15分钟
  } as CacheConfig,

  // 列表数据（频繁变化）
  LIST: {
    ttl: 2 * 60 * 1000, // 2分钟
    staleWhileRevalidate: 5 * 60 * 1000 // 5分钟
  } as CacheConfig,

  // 实时数据（不缓存）
  REALTIME: {
    ttl: 0, // 不缓存
    forceRefresh: true
  } as CacheConfig,

  // 短期缓存（用于防抖）
  SHORT: {
    ttl: 10 * 1000, // 10秒
    staleWhileRevalidate: 30 * 1000 // 30秒
  } as CacheConfig
}

/**
 * API路径缓存策略映射
 */
export const apiCacheConfig: Record<string, CacheConfig> = {
  // 静态数据
  '/articles/categories': CacheStrategy.STATIC,
  '/articles/tags': CacheStrategy.SEMI_STATIC,
  '/resource-categories': CacheStrategy.STATIC,

  // 用户数据
  '/auth/me': CacheStrategy.USER_DATA,
  '/user/profile': CacheStrategy.USER_DATA,
  '/avatar/history': CacheStrategy.USER_DATA,

  // 内容数据
  '/articles/:id': CacheStrategy.CONTENT, // 文章详情
  '/resources/:id': CacheStrategy.CONTENT, // 资源详情

  // 列表数据
  '/articles': CacheStrategy.LIST, // 文章列表
  '/resources': CacheStrategy.LIST, // 资源列表
  '/conversations': CacheStrategy.LIST, // 会话列表

  // 实时数据（不缓存）
  '/chat/messages': CacheStrategy.REALTIME,
  '/chat/messages/new': CacheStrategy.REALTIME,
  '/chat/online-count': CacheStrategy.SHORT, // 短期缓存

  // 统计数据
  '/cumulative-stats': CacheStrategy.CONTENT,
  '/daily-metrics': CacheStrategy.CONTENT,
  '/realtime-metrics': CacheStrategy.SHORT,

  // 历史数据
  '/history/login': CacheStrategy.USER_DATA,
  '/history/operations': CacheStrategy.USER_DATA,
  '/history/profile-changes': CacheStrategy.USER_DATA
}

/**
 * 获取API的缓存配置
 */
export function getCacheConfig(url: string): CacheConfig {
  // 精确匹配
  if (apiCacheConfig[url]) {
    return apiCacheConfig[url]
  }

  // 模式匹配（处理动态路由）
  for (const pattern in apiCacheConfig) {
    if (pattern.includes(':')) {
      const regex = new RegExp('^' + pattern.replace(/:\w+/g, '\\d+') + '$')
      if (regex.test(url)) {
        return apiCacheConfig[pattern]
      }
    }
  }

  // 默认策略
  return CacheStrategy.CONTENT
}

/**
 * 智能缓存管理器
 */
export class SmartCacheManager {
  private cache: Map<string, CacheEntry> = new Map()
  private maxSize: number
  private cleanupInterval: number

  constructor(maxSize = 1000, cleanupInterval = 5 * 60 * 1000) {
    this.maxSize = maxSize
    this.cleanupInterval = cleanupInterval

    // 定期清理过期缓存
    setInterval(() => this.cleanup(), cleanupInterval)
  }

  /**
   * 获取缓存
   */
  get(key: string, config: CacheConfig): any | null {
    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    const now = Date.now()
    const age = now - entry.timestamp

    // 检查是否过期
    if (age <= config.ttl) {
      // 未过期，返回缓存
      entry.hits++
      entry.lastAccess = now
      return entry.data
    }

    // 检查是否在stale-while-revalidate期间
    if (config.staleWhileRevalidate && age <= config.ttl + config.staleWhileRevalidate) {
      // 返回过期数据，但标记需要重新验证
      entry.needsRevalidation = true
      entry.lastAccess = now
      return entry.data
    }

    // 完全过期
    this.cache.delete(key)
    return null
  }

  /**
   * 设置缓存
   */
  set(key: string, data: any): void {
    // 检查容量限制
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      lastAccess: Date.now(),
      hits: 0,
      needsRevalidation: false
    })
  }

  /**
   * 检查是否需要重新验证
   */
  needsRevalidation(key: string): boolean {
    const entry = this.cache.get(key)
    return entry?.needsRevalidation || false
  }

  /**
   * 标记已重新验证
   */
  markRevalidated(key: string): void {
    const entry = this.cache.get(key)
    if (entry) {
      entry.needsRevalidation = false
      entry.timestamp = Date.now()
    }
  }

  /**
   * 删除缓存
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now()
    const maxAge = 60 * 60 * 1000 // 1小时
    let removed = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.lastAccess > maxAge) {
        this.cache.delete(key)
        removed++
      }
    }

    if (removed > 0) {
      console.log(`清理过期缓存: ${removed}个，剩余: ${this.cache.size}个`)
    }
  }

  /**
   * 淘汰最少使用的缓存（LRU）
   */
  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    let totalHits = 0
    let needsRevalidation = 0

    for (const entry of this.cache.values()) {
      totalHits += entry.hits
      if (entry.needsRevalidation) {
        needsRevalidation++
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalHits,
      needsRevalidation,
      hitRate: totalHits / Math.max(this.cache.size, 1)
    }
  }
}

interface CacheEntry {
  data: any
  timestamp: number
  lastAccess: number
  hits: number
  needsRevalidation: boolean
}

// 全局缓存管理器实例
export const cacheManager = new SmartCacheManager(1000, 5 * 60 * 1000)

/**
 * 辅助函数：包装API调用使用智能缓存
 */
export async function withSmartCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  config?: CacheConfig
): Promise<T> {
  const cacheConfig = config || CacheStrategy.CONTENT

  // 尝试从缓存获取
  const cached = cacheManager.get(key, cacheConfig)
  if (cached !== null) {
    // 检查是否需要后台重新验证
    if (cacheManager.needsRevalidation(key)) {
      // 异步重新验证，返回缓存数据
      fetcher()
        .then(data => {
          cacheManager.set(key, data)
          cacheManager.markRevalidated(key)
        })
        .catch(err => {
          console.warn('后台重新验证失败:', err)
        })
    }
    return cached
  }

  // 缓存未命中，执行请求
  const data = await fetcher()
  
  // 如果允许缓存，存入缓存
  if (!cacheConfig.forceRefresh && cacheConfig.ttl > 0) {
    cacheManager.set(key, data)
  }

  return data
}

