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
import { authManager } from './utils/auth/authManager'

const app = createApp(App)
const pinia = createPinia()
const head = createHead()

// 注册全局指令
app.directive('lazy', lazyLoad)

// 使用插件
app.use(pinia)
app.use(head)
app.use(router)

// 全局错误处理 - 捕获Vue组件中的错误
app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue错误处理器] 捕获到错误:', {
    error: err,
    errorInfo: info,
    component: instance?.$options?.name || 'Unknown'
  })

  // 检查是否是认证相关错误
  if (err && typeof err === 'object') {
    const errorCode = err.code || err.name
    const isAuthError = 
      errorCode === 'AUTH_EXPIRED' || 
      errorCode === 'TOKEN_EXPIRED' ||
      errorCode === 'INVALID_TOKEN' ||
      (err.message && err.message.includes('认证'))
    
    if (isAuthError) {
      console.log('[Vue错误处理器] 检测到认证错误，确保 AuthManager 已处理')
      // AuthManager 已在 API 拦截器中调用，这里只是保险
      // 不需要重复调用，因为可能已经在跳转中
      return
    }
  }

  // 在生产环境中，可以将错误发送到错误监控服务
  if (import.meta.env.PROD) {
    // 这里可以集成错误监控服务，如 Sentry
    console.error('[生产环境] 错误详情:', { err, instance, info })
  }
}

// 全局未处理的Promise拒绝 - 最后的保险机制
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Promise拒绝处理器] 捕获到未处理的Promise拒绝:', event.reason)
  
  // 检查是否是认证错误
  if (event.reason && typeof event.reason === 'object') {
    const errorCode = event.reason.code || event.reason.name
    const errorMessage = event.reason.message || ''
    
    // 认证相关错误码
    const isAuthError = 
      errorCode === 'AUTH_EXPIRED' || 
      errorCode === 'TOKEN_EXPIRED' ||
      errorCode === 'INVALID_TOKEN' ||
      errorCode === 'MISSING_TOKEN' ||
      errorMessage.includes('认证') ||
      errorMessage.includes('登录')
    
    if (isAuthError) {
      console.log('[Promise拒绝处理器] 检测到认证错误，由 API 拦截器已处理')
      event.preventDefault() // 防止控制台报错
      return
    }
  }
  
  // 其他未处理的Promise拒绝
  console.error('[Promise拒绝处理器] 其他错误:', event.reason)
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

// 开发环境下输出调试信息
if (import.meta.env.DEV) {
  console.log('[App] 应用已启动')
  console.log('[App] AuthManager状态:', authManager.getStatus())
  console.log('[App] 访问 window.__authManager__ 进行调试')
}

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
window.addEventListener('user:logout', (event) => {
  const detail = event.detail || {}
  console.log('[Main] 收到登出事件', {
    reason: detail.reason,
    automatic: detail.automatic,
    timestamp: detail.timestamp
  })
  
  // 断开 WebSocket 连接
  globalChatService.disconnect()
  
  // 如果是自动登出（token过期），记录额外信息
  if (detail.automatic) {
    console.log('[Main] 自动登出（token过期）')
  }
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