import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import AppLayout from '@/layouts/AppLayout.vue'
import { isTokenExpired, getStoredToken } from '@/utils/tokenValidator'
import { preloadMonacoEditor, smartPreload, clearMonacoCache } from '@/utils/monaco-preloader'
import { STORAGE_KEYS } from '@/config/storage-keys'
import { logger } from '@/utils/ui/logger'

const LoginView = () => import('@/views/auth/LoginView.vue')
const RegisterView = () => import('@/views/auth/RegisterView.vue')
const ResetPasswordView = () => import('@/views/auth/ResetPasswordView.vue')
const HomeView = () => import('@/views/HomeView.vue')
const ProfileView = () => import('@/views/ProfileView.vue')
const UserStatsView = () => import('@/views/statistics/UserStatsView.vue')
const ApiStatsView = () => import('@/views/statistics/ApiStatsView.vue')
const LoginHistoryView = () => import('@/views/history/LoginHistoryView.vue')
const OperationHistoryView = () => import('@/views/history/OperationHistoryView.vue')
const ProfileChangeHistoryView = () => import('@/views/history/ProfileChangeHistoryView.vue')
const CumulativeStatsView = () => import('@/views/statistics/CumulativeStatsView.vue')
const DailyMetricsView = () => import('@/views/statistics/DailyMetricsView.vue')
const RealtimeMetricsView = () => import('@/views/statistics/RealtimeMetricsView.vue')
const LocationDistributionView = () => import('@/views/location/LocationDistributionView.vue')
const ChatRoomView = () => import('@/views/chat/ChatRoomView.vue')
const DanmakuChatView = () => import('@/views/chat/DanmakuChatView.vue')
const ArticleListView = () => import('@/views/article/ArticleListView.vue')
const ArticleDetailView = () => import('@/views/article/ArticleDetailView.vue')
const ArticleEditorView = () => import('@/views/article/ArticleEditorView.vue')
const UserDetailView = () => import('@/views/user/UserDetailView.vue')
const MessageListView = () => import('@/views/message/MessageListView.vue')
const MessageChatView = () => import('@/views/message/MessageChatView.vue')
const ResourceListView = () => import('@/views/resource/ResourceListView.vue')
const ResourceDetailView = () => import('@/views/resource/ResourceDetailView.vue')
const ResourceUploadView = () => import('@/views/resource/ResourceUploadView.vue')
const CodeEditorView = () => import('@/views/code/CodeEditorView.vue')
const CodeHistoryView = () => import('@/views/code/CodeHistoryView.vue')
const CodeShareView = () => import('@/views/code/CodeShareView.vue')
const CodeSquareView = () => import('@/views/code/CodeSquareView.vue')

const routes: RouteRecordRaw[] = [
  { 
    path: '/', 
    redirect: () => {
      // 动态重定向：管理员跳转到个人资料页，普通用户跳转到首页
      const token = getStoredToken()
      if (token && !isTokenExpired(token)) {
        const userInfo = localStorage.getItem(STORAGE_KEYS.USER_INFO) || 
                        sessionStorage.getItem(STORAGE_KEYS.USER_INFO)
        if (userInfo) {
          try {
            const user = JSON.parse(userInfo)
            if (user.role === 'admin') {
              return '/profile'
            }
          } catch (error) {
            logger.error('[Router] 解析用户信息失败:', error)
          }
        }
      }
      return '/home'
    }
  },
  { path: '/login', name: 'login', component: LoginView, meta: { title: '登录' } },
  { path: '/register', name: 'register', component: RegisterView, meta: { title: '注册' } },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: ResetPasswordView,
    meta: { title: '重置密码' }
  },
  // 聊天室全屏路由（不使用 AppLayout）
  {
    path: '/chatroom',
    name: 'chatroom',
    component: ChatRoomView,
    meta: { title: '聊天室', requiresAuth: true, userOnly: true }
  },
  {
    path: '/danmaku-chat',
    name: 'danmaku-chat',
    component: DanmakuChatView,
    meta: { title: '弹幕聊天室', requiresAuth: true, userOnly: true }
  },
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: 'home',
        name: 'home',
        component: HomeView,
        meta: { title: '首页', requiresAuth: true, userOnly: true }
      },
      {
        path: 'profile',
        name: 'profile',
        component: ProfileView,
        meta: { title: '个人资料', requiresAuth: true }
      },
      {
        path: 'cumulative-stats',
        name: 'cumulative-stats',
        component: CumulativeStatsView,
        meta: { title: '全站累计', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'daily-metrics',
        name: 'daily-metrics',
        component: DailyMetricsView,
        meta: { title: '每日指标', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'realtime-metrics',
        name: 'realtime-metrics',
        component: RealtimeMetricsView,
        meta: { title: '实时监控', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'user-stats',
        name: 'user-stats',
        component: UserStatsView,
        meta: { title: '用户统计', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'api-stats',
        name: 'api-stats',
        component: ApiStatsView,
        meta: { title: 'API统计', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'login-history',
        name: 'login-history',
        component: LoginHistoryView,
        meta: { title: '登录历史', requiresAuth: true }
      },
      {
        path: 'operation-history',
        name: 'operation-history',
        component: OperationHistoryView,
        meta: { title: '操作历史', requiresAuth: true }
      },
      {
        path: 'profile-history',
        name: 'profile-history',
        component: ProfileChangeHistoryView,
        meta: { title: '资料修改历史', requiresAuth: true }
      },
      {
        path: 'location-distribution',
        name: 'location-distribution',
        component: LocationDistributionView,
        meta: { title: '地区分布', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'articles',
        name: 'articles',
        component: ArticleListView,
        meta: { title: '技术文章', requiresAuth: true, userOnly: true }
      },
      {
        path: 'articles/create',
        name: 'article-create',
        component: ArticleEditorView,
        meta: { title: '发布文章', requiresAuth: true, userOnly: true }
      },
      {
        path: 'articles/:id/edit',
        name: 'article-edit',
        component: ArticleEditorView,
        meta: { title: '编辑文章', requiresAuth: true, userOnly: true }
      },
      {
        path: 'articles/:id',
        name: 'article-detail',
        component: ArticleDetailView,
        meta: { title: '文章详情', requiresAuth: true, userOnly: true }
      },
      {
        path: 'users/:id',
        name: 'user-detail',
        component: UserDetailView,
        meta: { title: '用户详情', requiresAuth: true, userOnly: true }
      },
      {
        path: 'messages',
        name: 'messages',
        component: MessageListView,
        meta: { title: '私信', requiresAuth: true, userOnly: true }
      },
      {
        path: 'messages/:userId',
        name: 'message-chat',
        component: MessageChatView,
        meta: { title: '对话', requiresAuth: true, userOnly: true }
      },
      {
        path: 'resources',
        name: 'resources',
        component: ResourceListView,
        meta: { title: '资源中心', requiresAuth: true, userOnly: true }
      },
      {
        path: 'resources/upload',
        name: 'resource-upload',
        component: ResourceUploadView,
        meta: { title: '上传资源', requiresAuth: true, userOnly: true }
      },
      {
        path: 'resources/:id',
        name: 'resource-detail',
        component: ResourceDetailView,
        meta: { title: '资源详情', requiresAuth: true, userOnly: true }
      },
      {
        path: 'code-editor',
        name: 'code-editor',
        component: CodeEditorView,
        meta: { title: '在线编程', requiresAuth: true, userOnly: true }
      },
      {
        path: 'code-square',
        name: 'code-square',
        component: CodeSquareView,
        meta: { title: '代码广场', requiresAuth: true, userOnly: true }
      },
      {
        path: 'code-history',
        name: 'code-history',
        component: CodeHistoryView,
        meta: { title: '代码历史', requiresAuth: true, userOnly: true }
      }
    ]
  },
  {
    path: '/code-share/:token',
    name: 'code-share',
    component: CodeShareView,
    meta: { title: '分享代码' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const requiresAuth = to.matched.some(r => r.meta?.requiresAuth)
  const requiresAdmin = to.matched.some(r => r.meta?.requiresAdmin)
  
  // 检查是否是强制登出跳转（由AuthManager触发）
  const forceLogout = sessionStorage.getItem('__force_logout__')
  if (forceLogout) {
    sessionStorage.removeItem('__force_logout__')
    logger.info('[Router] 检测到强制登出标记，清理完成')
    
    // 如果目标是登录页或注册页，直接通过
    if (to.path === '/login' || to.path === '/register') {
      next()
      return
    }
    
    // 否则重定向到登录页
    logger.info('[Router] 强制重定向到登录页')
    next({ path: '/login', query: { expired: 'true' } })
    return
  }
  
  // 获取token并检查基本有效性
  const token = getStoredToken()
  const hasValidToken = !!token && !isTokenExpired(token)

  // 需要认证但没有有效token，跳转登录页
  if (requiresAuth && !hasValidToken) {
    logger.info('[Router] 需要认证但token无效，跳转登录页', {
      path: to.path,
      hasToken: !!token,
      isExpired: token ? isTokenExpired(token) : null
    })
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  // 检查管理员权限 - 防止普通用户通过URL直接访问管理员页面
  if (requiresAdmin && hasValidToken) {
    const userInfo = localStorage.getItem(STORAGE_KEYS.USER_INFO) || 
                     sessionStorage.getItem(STORAGE_KEYS.USER_INFO)
    
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo)
        if (user.role !== 'admin') {
          logger.warn('[Router] 普通用户尝试访问管理员页面，已拦截并重定向到个人资料页', {
            path: to.path,
            userRole: user.role
          })
          next({ path: '/profile', replace: true })
          return
        }
      } catch (error) {
        logger.error('[Router] 解析用户信息失败:', error)
        next({ path: '/login', replace: true })
        return
      }
    } else {
      logger.warn('[Router] 需要管理员权限但用户信息不存在')
      next({ path: '/login', replace: true })
      return
    }
  }

  // 检查普通用户专属页面 - 防止管理员访问普通用户界面（历史记录除外）
  const userOnly = to.matched.some(r => r.meta?.userOnly)
  if (userOnly && hasValidToken) {
    const userInfo = localStorage.getItem(STORAGE_KEYS.USER_INFO) || 
                     sessionStorage.getItem(STORAGE_KEYS.USER_INFO)
    
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo)
        if (user.role === 'admin') {
          logger.warn('[Router] 管理员尝试访问普通用户专属页面，已拦截并重定向到个人资料页', {
            path: to.path,
            userRole: user.role
          })
          next({ path: '/profile', replace: true })
          return
        }
      } catch (error) {
        logger.error('[Router] 解析用户信息失败:', error)
        next({ path: '/login', replace: true })
        return
      }
    }
  }

  // 已登录用户访问登录/注册页面，重定向到首页（普通用户）或个人资料页（管理员）
  if ((to.path === '/login' || to.path === '/register') && hasValidToken) {
    const userInfo = localStorage.getItem(STORAGE_KEYS.USER_INFO) || 
                     sessionStorage.getItem(STORAGE_KEYS.USER_INFO)
    
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo)
        if (user.role === 'admin') {
          logger.info('[Router] 已登录的管理员访问登录页，重定向到个人资料页')
          next('/profile')
          return
        }
      } catch (error) {
        logger.error('[Router] 解析用户信息失败:', error)
      }
    }
    
    logger.info('[Router] 已登录用户访问登录页，重定向到首页')
    next('/home')
    return
  }

  // 通过所有检查
  next()
})

router.afterEach(to => {
  // 设置页面标题
  if (to.meta?.title) {
    document.title = `社区 · ${to.meta.title as string}`
  }

  // 智能预加载 Monaco Editor
  const token = getStoredToken()
  if (token && !isTokenExpired(token)) {
    const userInfo = localStorage.getItem(STORAGE_KEYS.USER_INFO) || sessionStorage.getItem(STORAGE_KEYS.USER_INFO)
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo)
        const hasUsedCodeEditor = localStorage.getItem(STORAGE_KEYS.CODE_EDITOR_USED) === 'true'
        
        // 判断是否需要预加载
        if (to.path.startsWith('/code-')) {
          // 访问代码相关路由，高优先级预加载
          preloadMonacoEditor('high')
        } else if (to.name === 'home' && (user.role === 'admin' || hasUsedCodeEditor)) {
          // 登录后进入首页，智能预加载
          smartPreload(user.role, hasUsedCodeEditor)
        }
      } catch (error) {
        logger.error('[Router] 解析用户信息失败:', error)
      }
    }
  }

  // 用户登出时清除缓存
  if (to.path === '/login' && !token) {
    clearMonacoCache()
  }
})

export default router
