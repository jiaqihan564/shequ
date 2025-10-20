/**
 * 前端性能优化工具集
 * 包含防抖、节流、懒加载等常用性能优化函数
 */

/**
 * 防抖函数
 * @param fn 需要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return function debounced(this: any, ...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      fn.apply(this, args)
      timeoutId = null
    }, delay)
  }
}

/**
 * 节流函数
 * @param fn 需要节流的函数
 * @param limit 限制时间（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number = 300
): (...args: Parameters<T>) => void {
  let inThrottle = false
  let lastResult: ReturnType<T>

  return function throttled(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      lastResult = fn.apply(this, args)
      inThrottle = true

      setTimeout(() => {
        inThrottle = false
      }, limit)
    }

    return lastResult
  }
}

/**
 * 请求动画帧节流
 * 用于优化滚动、resize等高频事件
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  fn: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null

  return function throttled(this: any, ...args: Parameters<T>) {
    if (rafId !== null) {
      return
    }

    rafId = requestAnimationFrame(() => {
      fn.apply(this, args)
      rafId = null
    })
  }
}

/**
 * 空闲时间执行
 * 使用 requestIdleCallback（降级为 setTimeout）
 */
export function idleCallback(
  fn: () => void,
  options?: { timeout?: number }
): void {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(fn, options)
  } else {
    setTimeout(fn, 1)
  }
}

/**
 * 图片懒加载观察器
 */
export class LazyLoadObserver {
  private observer: IntersectionObserver | null = null
  private images: Set<HTMLImageElement> = new Set()

  constructor(options?: IntersectionObserverInit) {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement
              this.loadImage(img)
            }
          })
        },
        {
          rootMargin: '50px',
          threshold: 0.01,
          ...options
        }
      )
    }
  }

  observe(img: HTMLImageElement): void {
    if (!this.observer) {
      // 降级：直接加载
      this.loadImage(img)
      return
    }

    this.images.add(img)
    this.observer.observe(img)
  }

  unobserve(img: HTMLImageElement): void {
    if (this.observer) {
      this.observer.unobserve(img)
    }
    this.images.delete(img)
  }

  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect()
    }
    this.images.clear()
  }

  private loadImage(img: HTMLImageElement): void {
    const src = img.dataset.src
    const srcset = img.dataset.srcset

    if (src) {
      img.src = src
      delete img.dataset.src
    }

    if (srcset) {
      img.srcset = srcset
      delete img.dataset.srcset
    }

    if (this.observer) {
      this.observer.unobserve(img)
    }
  }
}

/**
 * 组件懒加载指令配置
 */
export const lazyLoadDirective = {
  mounted(el: HTMLElement, binding: any) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          binding.value?.()
          observer.disconnect()
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.01
      }
    )

    observer.observe(el)

    // 保存observer以便清理
    ;(el as any).__lazyObserver = observer
  },

  unmounted(el: HTMLElement) {
    const observer = (el as any).__lazyObserver
    if (observer) {
      observer.disconnect()
      delete (el as any).__lazyObserver
    }
  }
}

/**
 * 长列表虚拟滚动辅助函数
 */
export function calculateVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan: number = 3
): { start: number; end: number } {
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const visibleCount = Math.ceil(containerHeight / itemHeight)
  const end = Math.min(totalItems, start + visibleCount + overscan * 2)

  return { start, end }
}

/**
 * 性能标记和测量
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map()

  mark(name: string): void {
    this.marks.set(name, performance.now())
  }

  measure(name: string, startMark: string): number {
    const start = this.marks.get(startMark)
    if (!start) {
      console.warn(`Performance mark "${startMark}" not found`)
      return 0
    }

    const duration = performance.now() - start
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`)
    return duration
  }

  clear(): void {
    this.marks.clear()
  }
}

// 全局性能监控实例
export const perfMonitor = new PerformanceMonitor()

/**
 * 内存优化：对象池
 */
export class ObjectPool<T> {
  private pool: T[] = []
  private factory: () => T
  private reset: (obj: T) => void
  private maxSize: number

  constructor(factory: () => T, reset: (obj: T) => void, maxSize: number = 100) {
    this.factory = factory
    this.reset = reset
    this.maxSize = maxSize
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!
    }
    return this.factory()
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.reset(obj)
      this.pool.push(obj)
    }
  }

  clear(): void {
    this.pool = []
  }

  get size(): number {
    return this.pool.length
  }
}

/**
 * 大数据分批处理
 */
export async function processBatchesAsync<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 50,
  delay: number = 0
): Promise<R[]> {
  const results: R[] = []

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(processor))
    results.push(...batchResults)

    // 可选延迟，避免阻塞主线程
    if (delay > 0 && i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  return results
}

/**
 * 同步批处理（使用 requestIdleCallback）
 */
export function processBatchesIdle<T>(
  items: T[],
  processor: (item: T) => void,
  batchSize: number = 50,
  onComplete?: () => void
): void {
  let index = 0

  function processNextBatch() {
    const end = Math.min(index + batchSize, items.length)

    for (let i = index; i < end; i++) {
      processor(items[i])
    }

    index = end

    if (index < items.length) {
      idleCallback(processNextBatch)
    } else {
      onComplete?.()
    }
  }

  idleCallback(processNextBatch)
}

/**
 * Web Worker 辅助函数
 */
export function createWorker(fn: Function): Worker {
  const blob = new Blob([`(${fn.toString()})()`], { type: 'application/javascript' })
  const url = URL.createObjectURL(blob)
  const worker = new Worker(url)

  // 清理
  worker.addEventListener('error', () => {
    URL.revokeObjectURL(url)
  })

  return worker
}

/**
 * 页面可见性检测
 */
export function onPageVisible(callback: () => void): () => void {
  const handler = () => {
    if (!document.hidden) {
      callback()
    }
  }

  document.addEventListener('visibilitychange', handler)

  return () => {
    document.removeEventListener('visibilitychange', handler)
  }
}

/**
 * 网络状态检测
 */
export function getNetworkSpeed(): 'slow' | 'fast' | 'unknown' {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection

  if (!connection) {
    return 'unknown'
  }

  // 有效连接类型：slow-2g, 2g, 3g, 4g
  const type = connection.effectiveType
  if (type === 'slow-2g' || type === '2g') {
    return 'slow'
  }

  return 'fast'
}

/**
 * 预加载资源
 */
export function preloadResource(url: string, as: 'script' | 'style' | 'image' | 'font' = 'script'): void {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = as
  link.href = url

  if (as === 'font') {
    link.crossOrigin = 'anonymous'
  }

  document.head.appendChild(link)
}

/**
 * 预连接到域名
 */
export function preconnect(url: string): void {
  const link = document.createElement('link')
  link.rel = 'preconnect'
  link.href = url
  document.head.appendChild(link)
}

