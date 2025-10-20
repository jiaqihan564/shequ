/**
 * API响应优化工具
 * 用于优化API响应体大小和处理速度
 */

/**
 * 压缩对象（移除null/undefined字段）
 */
export function compactObject<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {}
  
  for (const key in obj) {
    const value = obj[key]
    if (value !== null && value !== undefined && value !== '') {
      if (typeof value === 'object' && !Array.isArray(value)) {
        result[key] = compactObject(value)
      } else {
        result[key] = value
      }
    }
  }
  
  return result
}

/**
 * 精简响应数据（只保留需要的字段）
 */
export function pickFields<T, K extends keyof T>(
  obj: T,
  fields: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>
  
  for (const field of fields) {
    if (field in obj) {
      result[field] = obj[field]
    }
  }
  
  return result
}

/**
 * 批量精简
 */
export function pickFieldsFromArray<T, K extends keyof T>(
  array: T[],
  fields: K[]
): Array<Pick<T, K>> {
  return array.map(item => pickFields(item, fields))
}

/**
 * 响应数据转换器
 * 用于将服务端响应转换为前端需要的格式
 */
export class ResponseTransformer {
  private transformers = new Map<string, (data: any) => any>()

  /**
   * 注册转换器
   */
  register(key: string, transformer: (data: any) => any): void {
    this.transformers.set(key, transformer)
  }

  /**
   * 执行转换
   */
  transform(key: string, data: any): any {
    const transformer = this.transformers.get(key)
    if (!transformer) {
      return data
    }
    
    try {
      return transformer(data)
    } catch (error) {
      console.error(`转换器执行失败 [${key}]:`, error)
      return data
    }
  }

  /**
   * 批量转换
   */
  transformBatch(key: string, dataArray: any[]): any[] {
    const transformer = this.transformers.get(key)
    if (!transformer) {
      return dataArray
    }

    return dataArray.map(item => {
      try {
        return transformer(item)
      } catch (error) {
        console.error(`批量转换失败 [${key}]:`, error)
        return item
      }
    })
  }
}

// 全局转换器实例
export const responseTransformer = new ResponseTransformer()

// 注册常用转换器
responseTransformer.register('article', (article: any) => {
  // 文章列表不需要完整content
  if (article.content && article.content.length > 200) {
    return {
      ...article,
      content: undefined, // 移除content，只保留description
      hasContent: true
    }
  }
  return article
})

responseTransformer.register('user', (user: any) => {
  // 用户信息精简
  return pickFields(user, [
    'id',
    'username',
    'avatar',
    'nickname',
    'bio'
  ])
})

/**
 * 数据分页优化
 */
export function optimizePagination<T>(
  items: T[],
  page: number,
  pageSize: number
): {
  items: T[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
} {
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const paginatedItems = items.slice(start, end)

  return {
    items: paginatedItems,
    page,
    pageSize,
    total: items.length,
    hasMore: end < items.length
  }
}

/**
 * 虚拟滚动数据切片
 */
export function getVisibleSlice<T>(
  items: T[],
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  buffer: number = 5
): {
  visibleItems: T[]
  startIndex: number
  endIndex: number
} {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer)
  const visibleCount = Math.ceil(containerHeight / itemHeight)
  const endIndex = Math.min(items.length, startIndex + visibleCount + buffer * 2)

  return {
    visibleItems: items.slice(startIndex, endIndex),
    startIndex,
    endIndex
  }
}

/**
 * 数据预加载优化
 */
export class DataPreloader {
  private preloaded = new Map<string, any>()
  private loading = new Set<string>()

  /**
   * 预加载数据
   */
  async preload(
    key: string,
    fetcher: () => Promise<any>
  ): Promise<void> {
    if (this.preloaded.has(key) || this.loading.has(key)) {
      return
    }

    this.loading.add(key)

    try {
      const data = await fetcher()
      this.preloaded.set(key, data)
      console.log(`[预加载] ${key} 完成`)
    } catch (error) {
      console.error(`[预加载] ${key} 失败:`, error)
    } finally {
      this.loading.delete(key)
    }
  }

  /**
   * 获取预加载的数据
   */
  get(key: string): any | null {
    return this.preloaded.get(key) || null
  }

  /**
   * 清除预加载数据
   */
  clear(key?: string): void {
    if (key) {
      this.preloaded.delete(key)
    } else {
      this.preloaded.clear()
    }
  }

  /**
   * 批量预加载
   */
  async preloadBatch(
    items: Array<{ key: string; fetcher: () => Promise<any> }>
  ): Promise<void> {
    await Promise.all(
      items.map(item => this.preload(item.key, item.fetcher))
    )
  }
}

// 全局预加载器
export const dataPreloader = new DataPreloader()

/**
 * 增量更新优化（只更新变化的数据）
 */
export function computeDiff<T extends Record<string, any>>(
  oldData: T,
  newData: T
): Partial<T> {
  const diff: any = {}
  
  for (const key in newData) {
    if (oldData[key] !== newData[key]) {
      diff[key] = newData[key]
    }
  }
  
  return diff
}

/**
 * 深度比较（用于优化更新）
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true
  
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || 
      obj1 === null || obj2 === null) {
    return false
  }
  
  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)
  
  if (keys1.length !== keys2.length) return false
  
  for (const key of keys1) {
    if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
      return false
    }
  }
  
  return true
}

/**
 * 数据归一化（扁平化嵌套结构）
 */
export function normalizeData<T extends { id: number | string }>(
  data: T[],
  idKey: keyof T = 'id'
): {
  byId: Record<string | number, T>
  allIds: Array<string | number>
} {
  const byId: Record<string | number, T> = {}
  const allIds: Array<string | number> = []

  for (const item of data) {
    const id = item[idKey]
    byId[id as any] = item
    allIds.push(id as any)
  }

  return { byId, allIds }
}

/**
 * 反归一化
 */
export function denormalizeData<T>(
  normalized: {
    byId: Record<string | number, T>
    allIds: Array<string | number>
  }
): T[] {
  return normalized.allIds.map(id => normalized.byId[id])
}

/**
 * 响应数据压缩统计
 */
export class CompressionStats {
  private originalSize = 0
  private compressedSize = 0
  private requests = 0

  record(original: number, compressed: number): void {
    this.originalSize += original
    this.compressedSize += compressed
    this.requests++
  }

  getStats() {
    const ratio = this.originalSize > 0 
      ? (this.compressedSize / this.originalSize) * 100 
      : 0

    return {
      requests: this.requests,
      originalSize: this.originalSize,
      compressedSize: this.compressedSize,
      compressionRatio: ratio.toFixed(2) + '%',
      savedBytes: this.originalSize - this.compressedSize,
      savedPercent: (100 - ratio).toFixed(2) + '%'
    }
  }

  reset(): void {
    this.originalSize = 0
    this.compressedSize = 0
    this.requests = 0
  }
}

export const compressionStats = new CompressionStats()

export default {
  compactObject,
  pickFields,
  pickFieldsFromArray,
  ResponseTransformer,
  DataPreloader,
  computeDiff,
  deepEqual,
  normalizeData,
  denormalizeData
}

