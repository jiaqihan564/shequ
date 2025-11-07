/**
 * Monaco Editor 预加载服务
 *
 * 功能：
 * 1. 在浏览器空闲时异步预加载 Monaco Editor，避免阻塞主线程
 * 2. 智能判断是否需要预加载（基于用户角色和历史使用记录）
 * 3. 缓存已加载的实例，避免重复加载
 * 4. 提供加载状态查询和缓存清理功能
 */

import type * as Monaco from 'monaco-editor'

import { uiDelayConfig } from '@/config'
import { STORAGE_KEYS } from '@/config/storage-keys'
import { logger } from '@/utils/ui/logger'

// Monaco Editor 实例缓存
let monacoInstance: typeof Monaco | null = null

// 加载中的 Promise，防止重复加载
let loadingPromise: Promise<typeof Monaco> | null = null

// 是否正在加载中
let isLoading = false

/**
 * 预加载 Monaco Editor
 *
 * @param priority - 加载优先级：'high' 使用 setTimeout(0) 立即加载，'low' 使用 requestIdleCallback 空闲加载
 * @returns Promise<void>
 */
export async function preloadMonacoEditor(priority: 'high' | 'low' = 'low'): Promise<void> {
  // 如果已经加载，直接返回
  if (monacoInstance) {
    logger.debug('[Monaco Preloader] 已经加载，无需重复预加载')
    return Promise.resolve()
  }

  // 如果正在加载中，返回现有的 Promise
  if (loadingPromise) {
    logger.debug('[Monaco Preloader] 正在加载中，等待完成...')
    return loadingPromise.then(() => {})
  }

  logger.info(`[Monaco Preloader] 开始预加载 (优先级: ${priority})`)

  // 创建加载 Promise
  loadingPromise = new Promise((resolve, reject) => {
    const loadMonaco = async () => {
      try {
        isLoading = true
        logger.info('[Monaco Preloader] 动态导入 Monaco Editor...')

        // 动态导入 Monaco Editor
        const monaco = await import('monaco-editor')

        // 缓存实例
        monacoInstance = monaco

        logger.info('[Monaco Preloader] Monaco Editor 预加载完成')
        resolve(monaco)
      } catch (error) {
        logger.error('[Monaco Preloader] 预加载失败:', error)
        reject(error)
      } finally {
        isLoading = false
        loadingPromise = null
      }
    }

    // 根据优先级选择加载策略
    if (priority === 'high') {
      // 高优先级：立即加载（下一个事件循环）
      setTimeout(loadMonaco, 0)
    } else {
      // 低优先级：浏览器空闲时加载
      if ('requestIdleCallback' in window) {
        requestIdleCallback(loadMonaco, { timeout: uiDelayConfig.monacoPreloadTimeout })
      } else {
        // 降级方案：使用 setTimeout
        setTimeout(loadMonaco, uiDelayConfig.monacoPreloadFallback)
      }
    }
  })

  return loadingPromise.then(() => {})
}

/**
 * 获取已加载的 Monaco Editor 实例
 *
 * @returns Monaco Editor 实例或 null
 */
export function getLoadedMonaco(): typeof Monaco | null {
  if (monacoInstance) {
    console.log('[Monaco Preloader] 返回已缓存的 Monaco Editor 实例')
  }
  return monacoInstance
}

/**
 * 检查 Monaco Editor 是否已加载
 *
 * @returns boolean
 */
export function isMonacoLoaded(): boolean {
  return monacoInstance !== null
}

/**
 * 检查 Monaco Editor 是否正在加载中
 *
 * @returns boolean
 */
export function isMonacoLoading(): boolean {
  return isLoading
}

/**
 * 清除 Monaco Editor 缓存
 * 用于用户登出时释放内存
 */
export function clearMonacoCache(): void {
  console.log('[Monaco Preloader] 清除 Monaco Editor 缓存')
  monacoInstance = null
  loadingPromise = null
  isLoading = false
}

/**
 * 智能预加载 Monaco Editor
 * 根据用户角色和历史使用记录判断是否需要预加载
 *
 * @param userRole - 用户角色 ('admin' | 'user')
 * @param hasUsedCodeEditor - 用户是否使用过代码编辑器
 */
export function smartPreload(userRole: string, hasUsedCodeEditor: boolean): void {
  // 管理员：无条件低优先级预加载（管理员更可能使用代码编辑器）
  if (userRole === 'admin') {
    console.log('[Monaco Preloader] 检测到管理员用户，启动智能预加载')
    preloadMonacoEditor('low')
    return
  }

  // 普通用户：检查是否使用过代码编辑器
  if (hasUsedCodeEditor) {
    console.log('[Monaco Preloader] 检测到用户曾使用过代码编辑器，启动智能预加载')
    preloadMonacoEditor('low')
    return
  }

  console.log('[Monaco Preloader] 用户未使用过代码编辑器，跳过预加载')
}

/**
 * 标记用户使用过代码编辑器
 * 用于智能预加载的历史记录
 */
export function markCodeEditorUsed(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CODE_EDITOR_USED, 'true')
    console.log('[Monaco Preloader] 已标记用户使用过代码编辑器')
  } catch (error) {
    console.warn('[Monaco Preloader] 无法写入 localStorage:', error)
  }
}
