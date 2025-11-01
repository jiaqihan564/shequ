import { createHead } from '@vueuse/head'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import 'highlight.js/styles/atom-one-dark.css'

import App from './App.vue'
import router from './router'
import './style.css'
import './styles/lazy-load.css'
import { lazyLoad } from './directives/lazyLoad'
import { globalChatService } from './services/globalChatService'
import { getStoredToken } from './utils/tokenValidator'
import { STORAGE_KEYS } from './config/storage-keys'

const app = createApp(App)
const pinia = createPinia()
const head = createHead()

// 注册全局指令
app.directive('lazy', lazyLoad)

// 使用插件
app.use(pinia)
app.use(head)
app.use(router)

// 防止重复跳转登录页的标记
let isRedirectingToLogin = false

// 全局错误处理
app.config.errorHandler = (err, instance, info) => {
  console.error('全局错误:', err, info)

  // 处理认证错误
  if (err && typeof err === 'object' && 'code' in err) {
    const errorCode = err.code
    if (errorCode === 'AUTH_EXPIRED' || errorCode === 'TOKEN_EXPIRED') {
      if (!isRedirectingToLogin) {
        isRedirectingToLogin = true
        
        // 清除所有认证信息
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
        localStorage.removeItem(STORAGE_KEYS.USER_INFO)
        sessionStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
        sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
        sessionStorage.removeItem(STORAGE_KEYS.USER_INFO)
        
        // 延迟2秒后跳转
        setTimeout(() => {
          isRedirectingToLogin = false
          window.location.href = '/login'
        }, 2000)
      }
      return
    }
  }

  // 在生产环境中，可以将错误发送到错误监控服务
  if (import.meta.env.PROD) {
    // 这里可以集成错误监控服务，如 Sentry
    console.error('生产环境错误:', { err, instance, info })
  }
}

// 全局未处理的Promise拒绝
window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的Promise拒绝:', event.reason)
  
  // 处理认证错误
  if (event.reason && typeof event.reason === 'object' && 'code' in event.reason) {
    const errorCode = event.reason.code
    if (errorCode === 'AUTH_EXPIRED' || errorCode === 'TOKEN_EXPIRED') {
      if (!isRedirectingToLogin) {
        isRedirectingToLogin = true
        
        // 清除所有认证信息
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
        localStorage.removeItem(STORAGE_KEYS.USER_INFO)
        sessionStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
        sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
        sessionStorage.removeItem(STORAGE_KEYS.USER_INFO)
        
        // 延迟2秒后跳转
        setTimeout(() => {
          isRedirectingToLogin = false
          window.location.href = '/login'
        }, 2000)
      }
      event.preventDefault()
    }
  }
})

// 全局警告处理
app.config.warnHandler = (msg, instance, trace) => {
  console.warn('Vue 警告:', msg, trace)
}

// 性能监控
if (import.meta.env.DEV) {
  app.config.performance = true
}

app.mount('#app')

// 全局 WebSocket 连接管理
// 简化版：只处理用户未认证时的断开连接，连接由 AppLayout 负责
router.afterEach(() => {
  const token = getStoredToken()
  const isAuthenticated = !!token
  
  // 如果用户未认证且 WebSocket 已连接，则断开
  if (!isAuthenticated && globalChatService.connectionStatus.value !== 'disconnected') {
    console.log('[Main] User not authenticated, disconnecting WebSocket')
    globalChatService.disconnect()
  }
})

// 监听登出事件
window.addEventListener('user:logout', () => {
  console.log('[Main] User logout event, disconnecting WebSocket')
  globalChatService.disconnect()
})

// 注册 Service Worker（仅生产环境）
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('[Service Worker] 注册成功:', registration.scope)
        
        // 监听更新
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          console.log('[Service Worker] 发现新版本')
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[Service Worker] 新版本已安装，刷新页面生效')
                // 可以在这里提示用户刷新页面
              }
            })
          }
        })
      })
      .catch((error) => {
        console.error('[Service Worker] 注册失败:', error)
      })
  })
}