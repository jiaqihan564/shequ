/**
 * 前端性能监控工具
 * 用于监控和分析前端性能指标
 */

export interface PerformanceMetrics {
  // 页面加载性能
  loadTime: number // 页面加载时间
  domContentLoaded: number // DOM内容加载时间
  firstPaint: number // 首次绘制时间
  firstContentfulPaint: number // 首次内容绘制时间
  largestContentfulPaint: number // 最大内容绘制时间
  
  // 交互性能
  timeToInteractive: number // 可交互时间
  firstInputDelay: number // 首次输入延迟
  
  // 资源性能
  resourceCount: number // 资源数量
  totalResourceSize: number // 总资源大小
  
  // 内存
  usedJSHeapSize: number // 已使用的JS堆大小
  totalJSHeapSize: number // 总JS堆大小
  
  // 网络
  apiCallCount: number // API调用次数
  averageApiTime: number // 平均API响应时间
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {}
  private apiTimes: number[] = []
  private observers: PerformanceObserver[] = []

  constructor() {
    this.initObservers()
  }

  /**
   * 初始化性能观察器
   */
  private initObservers() {
    // 观察导航时序
    if ('PerformanceObserver' in window) {
      try {
        // 观察Paint时序
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-paint') {
              this.metrics.firstPaint = entry.startTime
            } else if (entry.name === 'first-contentful-paint') {
              this.metrics.firstContentfulPaint = entry.startTime
            }
          }
        })
        paintObserver.observe({ entryTypes: ['paint'] })
        this.observers.push(paintObserver)

        // 观察LCP
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          this.metrics.largestContentfulPaint = lastEntry.startTime
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
        this.observers.push(lcpObserver)

        // 观察FID
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const fidEntry = entry as any
            this.metrics.firstInputDelay = fidEntry.processingStart - fidEntry.startTime
          }
        })
        fidObserver.observe({ entryTypes: ['first-input'] })
        this.observers.push(fidObserver)
      } catch (e) {
        console.warn('性能观察器初始化失败:', e)
      }
    }
  }

  /**
   * 收集页面加载性能
   */
  collectPageLoadMetrics(): PerformanceMetrics | null {
    if (!('performance' in window)) {
      return null
    }

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (!navigation) {
      return null
    }

    // 计算各项指标
    const loadTime = navigation.loadEventEnd - navigation.fetchStart
    const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart

    // 收集资源性能
    const resources = performance.getEntriesByType('resource')
    const resourceCount = resources.length
    const totalResourceSize = resources.reduce((sum, resource: any) => {
      return sum + (resource.transferSize || 0)
    }, 0)

    // 内存信息
    let usedJSHeapSize = 0
    let totalJSHeapSize = 0
    if ((performance as any).memory) {
      usedJSHeapSize = (performance as any).memory.usedJSHeapSize
      totalJSHeapSize = (performance as any).memory.totalJSHeapSize
    }

    return {
      loadTime,
      domContentLoaded,
      firstPaint: this.metrics.firstPaint || 0,
      firstContentfulPaint: this.metrics.firstContentfulPaint || 0,
      largestContentfulPaint: this.metrics.largestContentfulPaint || 0,
      timeToInteractive: navigation.domInteractive - navigation.fetchStart,
      firstInputDelay: this.metrics.firstInputDelay || 0,
      resourceCount,
      totalResourceSize,
      usedJSHeapSize,
      totalJSHeapSize,
      apiCallCount: this.apiTimes.length,
      averageApiTime: this.calculateAverageApiTime()
    }
  }

  /**
   * 记录API调用时间
   */
  recordApiCall(duration: number): void {
    this.apiTimes.push(duration)
    
    // 只保留最近100次调用
    if (this.apiTimes.length > 100) {
      this.apiTimes.shift()
    }
  }

  /**
   * 计算平均API响应时间
   */
  private calculateAverageApiTime(): number {
    if (this.apiTimes.length === 0) {
      return 0
    }
    const sum = this.apiTimes.reduce((a, b) => a + b, 0)
    return sum / this.apiTimes.length
  }

  /**
   * 获取Web Vitals指标
   */
  getWebVitals(): {
    lcp: number // Largest Contentful Paint
    fid: number // First Input Delay
    cls: number // Cumulative Layout Shift
  } {
    return {
      lcp: this.metrics.largestContentfulPaint || 0,
      fid: this.metrics.firstInputDelay || 0,
      cls: this.getCLS()
    }
  }

  /**
   * 获取累积布局偏移（CLS）
   */
  private getCLS(): number {
    let clsValue = 0
    
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutShift = entry as any
            if (!layoutShift.hadRecentInput) {
              clsValue += layoutShift.value
            }
          }
        })
        observer.observe({ entryTypes: ['layout-shift'] })
        this.observers.push(observer)
      } catch (e) {
        // Ignore
      }
    }

    return clsValue
  }

  /**
   * 生成性能报告
   */
  generateReport(): string {
    const metrics = this.collectPageLoadMetrics()
    if (!metrics) {
      return '性能数据不可用'
    }

    const webVitals = this.getWebVitals()

    return `
# 性能监控报告

## 页面加载性能
- 页面加载时间: ${metrics.loadTime.toFixed(2)}ms
- DOM内容加载: ${metrics.domContentLoaded.toFixed(2)}ms
- 首次绘制(FP): ${metrics.firstPaint.toFixed(2)}ms
- 首次内容绘制(FCP): ${metrics.firstContentfulPaint.toFixed(2)}ms
- 最大内容绘制(LCP): ${metrics.largestContentfulPaint.toFixed(2)}ms
- 可交互时间(TTI): ${metrics.timeToInteractive.toFixed(2)}ms

## Web Vitals (核心指标)
- LCP: ${webVitals.lcp.toFixed(2)}ms ${this.getVitalRating('lcp', webVitals.lcp)}
- FID: ${webVitals.fid.toFixed(2)}ms ${this.getVitalRating('fid', webVitals.fid)}
- CLS: ${webVitals.cls.toFixed(4)} ${this.getVitalRating('cls', webVitals.cls)}

## 资源加载
- 资源数量: ${metrics.resourceCount}
- 总资源大小: ${this.formatBytes(metrics.totalResourceSize)}

## 内存使用
- 已使用堆: ${this.formatBytes(metrics.usedJSHeapSize)}
- 总堆大小: ${this.formatBytes(metrics.totalJSHeapSize)}
- 使用率: ${((metrics.usedJSHeapSize / metrics.totalJSHeapSize) * 100).toFixed(2)}%

## API性能
- API调用次数: ${metrics.apiCallCount}
- 平均响应时间: ${metrics.averageApiTime.toFixed(2)}ms
    `.trim()
  }

  /**
   * 获取Web Vitals评级
   */
  private getVitalRating(metric: string, value: number): string {
    const thresholds: Record<string, { good: number; needsImprovement: number }> = {
      lcp: { good: 2500, needsImprovement: 4000 },
      fid: { good: 100, needsImprovement: 300 },
      cls: { good: 0.1, needsImprovement: 0.25 }
    }

    const threshold = thresholds[metric]
    if (!threshold) return ''

    if (value <= threshold.good) {
      return '✅ 良好'
    } else if (value <= threshold.needsImprovement) {
      return '⚠️ 需改进'
    } else {
      return '❌ 较差'
    }
  }

  /**
   * 格式化字节数
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  /**
   * 打印报告到控制台
   */
  logReport(): void {
    console.log(this.generateReport())
  }

  /**
   * 发送报告到服务器（用于监控）
   */
  async sendReportToServer(endpoint: string): Promise<void> {
    const metrics = this.collectPageLoadMetrics()
    if (!metrics) {
      return
    }

    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          metrics,
          webVitals: this.getWebVitals(),
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('发送性能报告失败:', error)
    }
  }

  /**
   * 清理观察器
   */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
}

// 全局性能监控实例
export const performanceMonitor = new PerformanceMonitor()

/**
 * Vue插件：自动收集性能数据
 */
export const PerformancePlugin = {
  install(app: any) {
    // 页面加载完成后收集性能数据
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        setTimeout(() => {
          if (import.meta.env.DEV) {
            performanceMonitor.logReport()
          }
          
          // 生产环境发送到服务器
          if (import.meta.env.PROD) {
            performanceMonitor.sendReportToServer('/api/metrics/frontend')
              .catch(() => {}) // 静默失败
          }
        }, 2000) // 等待2秒收集完整数据
      })
    }

    // 提供全局方法
    app.config.globalProperties.$performance = performanceMonitor
  }
}

/**
 * 性能标记工具
 */
export class PerformanceMark {
  private marks: Map<string, number> = new Map()

  /**
   * 开始标记
   */
  start(name: string): void {
    this.marks.set(name, performance.now())
    performance.mark(`${name}-start`)
  }

  /**
   * 结束标记并返回耗时
   */
  end(name: string): number {
    const startTime = this.marks.get(name)
    if (!startTime) {
      console.warn(`性能标记 "${name}" 不存在`)
      return 0
    }

    const endTime = performance.now()
    const duration = endTime - startTime

    performance.mark(`${name}-end`)
    performance.measure(name, `${name}-start`, `${name}-end`)

    this.marks.delete(name)
    return duration
  }

  /**
   * 获取所有测量结果
   */
  getMeasures(): PerformanceMeasure[] {
    return performance.getEntriesByType('measure') as PerformanceMeasure[]
  }

  /**
   * 清除所有标记
   */
  clear(): void {
    this.marks.clear()
    performance.clearMarks()
    performance.clearMeasures()
  }
}

/**
 * 组件性能跟踪装饰器
 */
export function trackComponentPerformance(componentName: string) {
  const mark = new PerformanceMark()

  return {
    beforeMount() {
      mark.start(`${componentName}-mount`)
    },
    mounted() {
      const duration = mark.end(`${componentName}-mount`)
      if (import.meta.env.DEV) {
        console.log(`[性能] ${componentName} 挂载耗时: ${duration.toFixed(2)}ms`)
      }
      
      if (duration > 100) {
        console.warn(`[性能警告] ${componentName} 挂载较慢: ${duration.toFixed(2)}ms`)
      }
    },
    beforeUpdate() {
      mark.start(`${componentName}-update`)
    },
    updated() {
      const duration = mark.end(`${componentName}-update`)
      if (import.meta.env.DEV && duration > 16) {
        console.warn(`[性能] ${componentName} 更新耗时: ${duration.toFixed(2)}ms (>16ms可能影响流畅度)`)
      }
    }
  }
}

/**
 * 函数执行时间测量
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const mark = new PerformanceMark()
  mark.start(name)
  
  try {
    const result = await fn()
    const duration = mark.end(name)
    
    if (import.meta.env.DEV) {
      console.log(`[性能] ${name} 耗时: ${duration.toFixed(2)}ms`)
    }
    
    return result
  } catch (error) {
    mark.end(name)
    throw error
  }
}

/**
 * 同步函数执行时间测量
 */
export function measure<T>(name: string, fn: () => T): T {
  const mark = new PerformanceMark()
  mark.start(name)
  
  try {
    const result = fn()
    const duration = mark.end(name)
    
    if (import.meta.env.DEV) {
      console.log(`[性能] ${name} 耗时: ${duration.toFixed(2)}ms`)
    }
    
    return result
  } catch (error) {
    mark.end(name)
    throw error
  }
}

/**
 * 长任务监控
 */
export function monitorLongTasks(): void {
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn(`[性能警告] 检测到长任务: ${entry.duration.toFixed(2)}ms`)
          }
        }
      })
      observer.observe({ entryTypes: ['longtask'] })
    } catch (e) {
      // 某些浏览器不支持longtask
    }
  }
}

/**
 * 内存监控
 */
export function getMemoryInfo(): {
  used: number
  total: number
  limit: number
  usagePercent: number
} | null {
  if (!(performance as any).memory) {
    return null
  }

  const memory = (performance as any).memory
  return {
    used: memory.usedJSHeapSize,
    total: memory.totalJSHeapSize,
    limit: memory.jsHeapSizeLimit,
    usagePercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
  }
}

/**
 * 帧率监控
 */
export class FPSMonitor {
  private lastTime = performance.now()
  private frames = 0
  private fps = 60
  private running = false
  private rafId = 0

  start(): void {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    this.frames = 0
    this.tick()
  }

  stop(): void {
    this.running = false
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
    }
  }

  private tick(): void {
    if (!this.running) return

    this.frames++
    const now = performance.now()
    
    if (now >= this.lastTime + 1000) {
      this.fps = Math.round((this.frames * 1000) / (now - this.lastTime))
      this.frames = 0
      this.lastTime = now
      
      if (this.fps < 30) {
        console.warn(`[性能警告] 帧率过低: ${this.fps} FPS`)
      }
    }

    this.rafId = requestAnimationFrame(() => this.tick())
  }

  getFPS(): number {
    return this.fps
  }
}

/**
 * 渲染性能监控
 */
export function monitorRenderPerformance(threshold = 16): void {
  let lastFrameTime = performance.now()
  
  function checkFrame() {
    const now = performance.now()
    const frameDuration = now - lastFrameTime
    
    if (frameDuration > threshold) {
      console.warn(`[性能] 帧渲染耗时: ${frameDuration.toFixed(2)}ms (阈值: ${threshold}ms)`)
    }
    
    lastFrameTime = now
    requestAnimationFrame(checkFrame)
  }
  
  requestAnimationFrame(checkFrame)
}

/**
 * 资源加载性能分析
 */
export function analyzeResourcePerformance(): {
  slowResources: Array<{ name: string; duration: number; size: number }>
  totalSize: number
  totalDuration: number
} {
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
  
  const slowResources = resources
    .filter(r => r.duration > 500) // 超过500ms的资源
    .map(r => ({
      name: r.name,
      duration: r.duration,
      size: (r as any).transferSize || 0
    }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10) // 前10个最慢的资源

  const totalSize = resources.reduce((sum, r) => sum + ((r as any).transferSize || 0), 0)
  const totalDuration = resources.reduce((sum, r) => sum + r.duration, 0)

  return {
    slowResources,
    totalSize,
    totalDuration
  }
}

/**
 * 检测内存泄漏
 */
export function detectMemoryLeak(threshold = 50): void {
  let lastMemory = 0
  const checks: number[] = []

  setInterval(() => {
    const memoryInfo = getMemoryInfo()
    if (!memoryInfo) return

    const currentMemory = memoryInfo.used
    const increase = currentMemory - lastMemory

    if (lastMemory > 0) {
      checks.push(increase)
      
      // 保留最近10次检查
      if (checks.length > 10) {
        checks.shift()
      }

      // 如果连续增长，可能有内存泄漏
      const continuousGrowth = checks.filter(v => v > 0).length
      if (continuousGrowth >= 8 && increase > threshold * 1024 * 1024) {
        console.warn(
          `[性能警告] 可能存在内存泄漏！`,
          `内存持续增长: ${continuousGrowth}/10 次`,
          `当前使用: ${(currentMemory / 1024 / 1024).toFixed(2)}MB`
        )
      }
    }

    lastMemory = currentMemory
  }, 10000) // 每10秒检查一次
}

export default performanceMonitor

