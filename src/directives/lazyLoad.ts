/**
 * 图片懒加载指令
 * 使用 Intersection Observer API 实现高性能图片懒加载
 * 
 * 使用方式：
 * <img v-lazy="imageUrl" alt="..." />
 * <img v-lazy="{ src: imageUrl, placeholder: placeholderUrl }" alt="..." />
 */

import type { DirectiveBinding } from 'vue'
import { lazyLoadConfig } from '@/config'

// 占位符图片（Base64 编码的1x1透明GIF）
const DEFAULT_PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

// 加载失败时的占位符
const ERROR_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E加载失败%3C/text%3E%3C/svg%3E'

// IntersectionObserver 实例（全局共享）
let observer: IntersectionObserver | null = null

// 已加载的图片缓存（避免重复加载）
const loadedImages = new Set<string>()

// 加载队列（限制并发加载数）
const loadQueue: Array<() => void> = []
let activeLoads = 0
const MAX_CONCURRENT_LOADS = lazyLoadConfig.maxConcurrent

/**
 * 获取或创建 IntersectionObserver
 */
function getObserver(): IntersectionObserver {
  if (observer) {
    return observer
  }

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement
          const src = img.dataset.lazySrc

          if (src && !loadedImages.has(src)) {
            loadImage(img, src)
          }

          // 图片已开始加载，停止观察
          observer?.unobserve(img)
        }
      })
    },
    {
      rootMargin: `${lazyLoadConfig.rootMargin}px`, // 提前指定px开始加载
      threshold: lazyLoadConfig.intersectionThreshold
    }
  )

  return observer
}

/**
 * 加载图片（带并发控制）
 */
function loadImage(img: HTMLImageElement, src: string) {
  const doLoad = () => {
    activeLoads++

    const tempImg = new Image()
    tempImg.onload = () => {
      img.src = src
      img.classList.add('lazy-loaded')
      img.classList.remove('lazy-loading')
      loadedImages.add(src)

      activeLoads--
      processQueue()
    }

    tempImg.onerror = () => {
      img.src = img.dataset.lazyError || ERROR_PLACEHOLDER
      img.classList.add('lazy-error')
      img.classList.remove('lazy-loading')

      activeLoads--
      processQueue()
    }

    img.classList.add('lazy-loading')
    tempImg.src = src
  }

  if (activeLoads < MAX_CONCURRENT_LOADS) {
    doLoad()
  } else {
    loadQueue.push(doLoad)
  }
}

/**
 * 处理加载队列
 */
function processQueue() {
  if (loadQueue.length > 0 && activeLoads < MAX_CONCURRENT_LOADS) {
    const load = loadQueue.shift()
    if (load) {
      load()
    }
  }
}

/**
 * 解析指令值
 */
function parseBinding(binding: DirectiveBinding): {
  src: string
  placeholder?: string
  error?: string
} {
  if (typeof binding.value === 'string') {
    return { src: binding.value }
  }
  return binding.value || {}
}

/**
 * v-lazy 指令定义
 */
export const lazyLoad = {
  mounted(el: HTMLImageElement, binding: DirectiveBinding) {
    const { src, placeholder, error } = parseBinding(binding)

    if (!src) {
      console.warn('v-lazy: 未提供图片地址')
      return
    }

    // 设置占位符
    el.src = placeholder || DEFAULT_PLACEHOLDER
    
    // 保存原始src和error图片
    el.dataset.lazySrc = src
    if (error) {
      el.dataset.lazyError = error
    }

    // 添加样式类
    el.classList.add('lazy-image')

    // 如果图片已经在缓存中，直接加载
    if (loadedImages.has(src)) {
      el.src = src
      el.classList.add('lazy-loaded')
      return
    }

    // 如果浏览器支持原生懒加载（loading="lazy"）
    if ('loading' in HTMLImageElement.prototype) {
      el.loading = 'lazy'
      el.src = src
      el.classList.add('lazy-loaded')
      loadedImages.add(src)
      return
    }

    // 使用 IntersectionObserver 进行懒加载
    const obs = getObserver()
    obs.observe(el)
  },

  updated(el: HTMLImageElement, binding: DirectiveBinding) {
    const { src, placeholder } = parseBinding(binding)
    const oldSrc = el.dataset.lazySrc

    // 如果src改变了，重新加载
    if (src !== oldSrc && src) {
      el.dataset.lazySrc = src
      
      if (loadedImages.has(src)) {
        el.src = src
      } else {
        el.src = placeholder || DEFAULT_PLACEHOLDER
        el.classList.remove('lazy-loaded', 'lazy-error', 'lazy-loading')
        
        const obs = getObserver()
        obs.observe(el)
      }
    }
  },

  unmounted(el: HTMLImageElement) {
    // 停止观察
    if (observer) {
      observer.unobserve(el)
    }
  }
}

/**
 * 预加载图片（用于关键图片）
 */
export function preloadImage(src: string): Promise<void> {
  if (loadedImages.has(src)) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      loadedImages.add(src)
      resolve()
    }
    img.onerror = reject
    img.src = src
  })
}

/**
 * 批量预加载图片
 */
export function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(urls.map(preloadImage))
}

/**
 * 清除图片加载缓存
 */
export function clearImageCache() {
  loadedImages.clear()
}

export default lazyLoad

