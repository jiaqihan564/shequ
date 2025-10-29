import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import AppLayout from '@/layouts/AppLayout.vue'
import { isTokenExpired, getStoredToken } from '@/utils/tokenValidator'
import { preloadMonacoEditor, smartPreload, clearMonacoCache } from '@/utils/monaco-preloader'

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
  { path: '/', redirect: '/home' },
  { path: '/login', name: 'login', component: LoginView, meta: { title: '登录' } },
  { path: '/register', name: 'register', component: RegisterView, meta: { title: '注册' } },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: ResetPasswordView,
    meta: { title: '重置密码' }
  },
  {
    path: '/chatroom',
    name: 'chatroom',
    component: ChatRoomView,
    meta: { title: '聊天室', requiresAuth: true }
  },
  {
    path: '/danmaku-chat',
    name: 'danmaku-chat',
    component: DanmakuChatView,
    meta: { title: '弹幕聊天室', requiresAuth: true }
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
        meta: { title: '首页', requiresAuth: true }
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
        meta: { title: '技术文章', requiresAuth: true }
      },
      {
        path: 'articles/create',
        name: 'article-create',
        component: ArticleEditorView,
        meta: { title: '发布文章', requiresAuth: true }
      },
      {
        path: 'articles/:id/edit',
        name: 'article-edit',
        component: ArticleEditorView,
        meta: { title: '编辑文章', requiresAuth: true }
      },
      {
        path: 'articles/:id',
        name: 'article-detail',
        component: ArticleDetailView,
        meta: { title: '文章详情', requiresAuth: true }
      },
      {
        path: 'users/:id',
        name: 'user-detail',
        component: UserDetailView,
        meta: { title: '用户详情', requiresAuth: true }
      },
      {
        path: 'messages',
        name: 'messages',
        component: MessageListView,
        meta: { title: '私信', requiresAuth: true }
      },
      {
        path: 'messages/:userId',
        name: 'message-chat',
        component: MessageChatView,
        meta: { title: '对话', requiresAuth: true }
      },
      {
        path: 'resources',
        name: 'resources',
        component: ResourceListView,
        meta: { title: '资源中心', requiresAuth: true }
      },
      {
        path: 'resources/upload',
        name: 'resource-upload',
        component: ResourceUploadView,
        meta: { title: '上传资源', requiresAuth: true }
      },
      {
        path: 'resources/:id',
        name: 'resource-detail',
        component: ResourceDetailView,
        meta: { title: '资源详情', requiresAuth: true }
      },
      {
        path: 'code-editor',
        name: 'code-editor',
        component: CodeEditorView,
        meta: { title: '在线编程', requiresAuth: true }
      },
      {
        path: 'code-square',
        name: 'code-square',
        component: CodeSquareView,
        meta: { title: '代码广场', requiresAuth: true }
      },
      {
        path: 'code-history',
        name: 'code-history',
        component: CodeHistoryView,
        meta: { title: '代码历史', requiresAuth: true }
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
  const token = getStoredToken()
  const isAuthenticated = !!token

  // 检查是否需要认证
  if (requiresAuth && !isAuthenticated) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  // 检查 token 是否过期（即使存在）
  if (requiresAuth && isAuthenticated && isTokenExpired(token)) {
    // Token 已过期，清除所有认证信息
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_info')
    sessionStorage.removeItem('auth_token')
    sessionStorage.removeItem('refresh_token')
    sessionStorage.removeItem('user_info')
    
    // 保存原路径到 sessionStorage 以便登录后返回
    sessionStorage.setItem('redirect_after_login', to.fullPath)
    
    // 跳转到登录页
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  // 检查是否需要管理员权限
  if (requiresAdmin && isAuthenticated) {
    const userInfo = localStorage.getItem('user_info') || sessionStorage.getItem('user_info')
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo)
        if (user.role !== 'admin') {
          // 非管理员访问管理员页面，重定向到首页
          console.warn('需要管理员权限')
          next('/home')
          return
        }
      } catch (error) {
        console.error('解析用户信息失败:', error)
        next('/login')
        return
      }
    } else {
      next('/login')
      return
    }
  }

  // 已登录用户访问登录/注册页面，重定向到首页
  if ((to.path === '/login' || to.path === '/register') && isAuthenticated) {
    next('/home')
    return
  }

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
    const userInfo = localStorage.getItem('user_info') || sessionStorage.getItem('user_info')
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo)
        const hasUsedCodeEditor = localStorage.getItem('code_editor_used') === 'true'
        
        // 判断是否需要预加载
        if (to.path.startsWith('/code-')) {
          // 访问代码相关路由，高优先级预加载
          preloadMonacoEditor('high')
        } else if (to.name === 'home' && (user.role === 'admin' || hasUsedCodeEditor)) {
          // 登录后进入首页，智能预加载
          smartPreload(user.role, hasUsedCodeEditor)
        }
      } catch (error) {
        console.error('[Router] 解析用户信息失败:', error)
      }
    }
  }

  // 用户登出时清除缓存
  if (to.path === '/login' && !token) {
    clearMonacoCache()
  }
})

export default router
