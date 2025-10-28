import { createHead } from '@vueuse/head'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import 'highlight.js/styles/atom-one-dark.css'

import App from './App.vue'
import router from './router'
import './style.css'
import './styles/lazy-load.css'
import { lazyLoad } from './directives/lazyLoad'

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
        localStorage.removeItem('auth_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user_info')
        sessionStorage.removeItem('auth_token')
        sessionStorage.removeItem('refresh_token')
        sessionStorage.removeItem('user_info')
        
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
        localStorage.removeItem('auth_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user_info')
        sessionStorage.removeItem('auth_token')
        sessionStorage.removeItem('refresh_token')
        sessionStorage.removeItem('user_info')
        
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
