import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import AppLayout from '@/layouts/AppLayout.vue'

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
const CumulativeStatsView = () => import('@/views/stats/CumulativeStatsView.vue')
const DailyMetricsView = () => import('@/views/stats/DailyMetricsView.vue')
const RealtimeMetricsView = () => import('@/views/stats/RealtimeMetricsView.vue')
const LocationDistributionView = () => import('@/views/location/LocationDistributionView.vue')
const ChatRoomView = () => import('@/views/chat/ChatRoomView.vue')
const ArticleListView = () => import('@/views/article/ArticleListView.vue')
const ArticleDetailView = () => import('@/views/article/ArticleDetailView.vue')
const ArticleEditorView = () => import('@/views/article/ArticleEditorView.vue')

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
        meta: { title: '全站累计', requiresAuth: true }
      },
      {
        path: 'daily-metrics',
        name: 'daily-metrics',
        component: DailyMetricsView,
        meta: { title: '每日指标', requiresAuth: true }
      },
      {
        path: 'realtime-metrics',
        name: 'realtime-metrics',
        component: RealtimeMetricsView,
        meta: { title: '实时监控', requiresAuth: true }
      },
      {
        path: 'user-stats',
        name: 'user-stats',
        component: UserStatsView,
        meta: { title: '用户统计', requiresAuth: true }
      },
      {
        path: 'api-stats',
        name: 'api-stats',
        component: ApiStatsView,
        meta: { title: 'API统计', requiresAuth: true }
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
        meta: { title: '地区分布', requiresAuth: true }
      },
      {
        path: 'chatroom',
        name: 'chatroom',
        component: ChatRoomView,
        meta: { title: '聊天室', requiresAuth: true }
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
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const requiresAuth = to.matched.some(r => r.meta?.requiresAuth)
  const isAuthenticated = !!(
    localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
  )

  if (requiresAuth && !isAuthenticated) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  if ((to.path === '/login' || to.path === '/register') && isAuthenticated) {
    next('/home')
    return
  }

  next()
})

router.afterEach(to => {
  if (to.meta?.title) {
    document.title = `社区 · ${to.meta.title as string}`
  }
})

export default router
