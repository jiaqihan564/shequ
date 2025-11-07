/**
 * Service Worker for Monaco Editor Caching
 *
 * 功能：
 * 1. 预缓存 Monaco Editor 相关资源
 * 2. 拦截网络请求，优先从缓存返回
 * 3. 自动清理旧版本缓存
 * 4. 支持主线程消息通信
 */

// 缓存名称（版本号用于缓存更新）
const CACHE_NAME = 'monaco-editor-cache-v1'

// 需要预缓存的资源列表（可选，根据实际需要配置）
const PRECACHE_URLS = []

/**
 * install 事件：Service Worker 安装时触发
 * 用于预缓存资源
 */
self.addEventListener('install', event => {
  console.log('[Service Worker] 安装中...')

  // 立即激活，不等待旧的 Service Worker 停止
  self.skipWaiting()

  // 预缓存资源
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] 预缓存资源')
      return cache.addAll(PRECACHE_URLS)
    })
  )
})

/**
 * activate 事件：Service Worker 激活时触发
 * 用于清理旧版本缓存
 */
self.addEventListener('activate', event => {
  console.log('[Service Worker] 激活中...')

  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // 删除非当前版本的缓存
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] 删除旧缓存:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        // 立即控制所有页面
        return self.clients.claim()
      })
  )
})

/**
 * fetch 事件：拦截网络请求
 * 实现缓存优先策略（Cache First）
 */
self.addEventListener('fetch', event => {
  // 只处理需要缓存的请求
  if (!shouldCacheRequest(event.request)) {
    return
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 如果缓存中存在，直接返回
      if (cachedResponse) {
        console.log('[Service Worker] 从缓存返回:', event.request.url)
        return cachedResponse
      }

      // 否则发起网络请求
      console.log('[Service Worker] 网络请求:', event.request.url)
      return fetch(event.request)
        .then(networkResponse => {
          // 只缓存成功的响应
          if (networkResponse && networkResponse.status === 200) {
            // 克隆响应，因为响应流只能使用一次
            const responseClone = networkResponse.clone()

            caches.open(CACHE_NAME).then(cache => {
              console.log('[Service Worker] 缓存资源:', event.request.url)
              cache.put(event.request, responseClone)
            })
          }

          return networkResponse
        })
        .catch(error => {
          console.error('[Service Worker] 网络请求失败:', error)
          // 可以返回一个离线页面或默认内容
          throw error
        })
    })
  )
})

/**
 * 判断请求是否需要缓存
 *
 * @param {Request} request - 请求对象
 * @returns {boolean} 是否需要缓存
 */
function shouldCacheRequest(request) {
  const url = request.url

  // 只缓存 GET 请求
  if (request.method !== 'GET') {
    return false
  }

  // 缓存 Monaco Editor 相关资源
  if (url.includes('monaco-editor')) {
    return true
  }

  // 缓存静态资源（JS、CSS）
  if (url.includes('/assets/') && (url.endsWith('.js') || url.endsWith('.css'))) {
    return true
  }

  return false
}

/**
 * message 事件：接收来自主线程的消息
 * 用于手动清理缓存或执行其他操作
 */
self.addEventListener('message', event => {
  console.log('[Service Worker] 收到消息:', event.data)

  if (event.data && event.data.type === 'SKIP_WAITING') {
    // 立即激活新的 Service Worker
    self.skipWaiting()
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    // 清除所有缓存
    event.waitUntil(
      caches
        .keys()
        .then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => {
              console.log('[Service Worker] 清除缓存:', cacheName)
              return caches.delete(cacheName)
            })
          )
        })
        .then(() => {
          // 通知主线程缓存已清除
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({ type: 'CACHE_CLEARED' })
            })
          })
        })
    )
  }
})

console.log('[Service Worker] 已加载')
