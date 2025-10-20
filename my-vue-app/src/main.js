import { createHead } from '@vueuse/head'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'highlight.js/styles/atom-one-dark.css'

import App from './App.vue'
import router from './router'
import './style.css'
import './styles/lazy-load.css'
import { lazyLoad } from './directives/lazyLoad'

const app = createApp(App)
const pinia = createPinia()
const head = createHead()

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 注册全局指令
app.directive('lazy', lazyLoad)

// 使用插件
app.use(ElementPlus)
app.use(pinia)
app.use(head)
app.use(router)

// 全局错误处理
app.config.errorHandler = (err, instance, info) => {
  console.error('全局错误:', err, info)

  // 在生产环境中，可以将错误发送到错误监控服务
  if (import.meta.env.PROD) {
    // 这里可以集成错误监控服务，如 Sentry
    console.error('生产环境错误:', { err, instance, info })
  }
}

// 全局警告处理
app.config.warnHandler = (msg, instance, trace) => {
  console.warn('Vue 警告:', msg, trace)
}

// 全局属性
app.config.globalProperties.$log = console.log

// 性能监控
if (import.meta.env.DEV) {
  app.config.performance = true
}

app.mount('#app')
