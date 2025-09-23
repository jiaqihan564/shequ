import axios, { type AxiosInstance, type AxiosResponse, type AxiosRequestConfig } from 'axios'

import type {
  ApiResponse,
  LoginResponse,
  LoginForm,
  RegisterForm,
  RegisterResponse,
  RefreshTokenResponse,
  User,
  AppError,
  AvatarHistoryItem,
  AvatarHistoryList
} from '@/types'
import type { NewsItem, FetchNewsParams } from '@/types'

// 创建axios实例
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  // 性能优化配置
  maxRedirects: 3,
  validateStatus: status => status < 500, // 只对5xx错误抛出异常
  maxContentLength: 10 * 1024 * 1024, // 10MB
  maxBodyLength: 10 * 1024 * 1024 // 10MB
})

// 请求缓存
const requestCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 添加认证token
    const token = getAuthToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // 添加请求ID用于追踪
    config.headers['X-Request-ID'] = generateRequestId()

    // 添加时间戳防止缓存
    if (config.method === 'get' && !config.params) {
      config.params = { _t: Date.now() }
    }

    // 缓存检查在响应拦截器中处理，这里只做请求配置

    return config
  },
  error => {
    return Promise.reject(createAppError('REQUEST_ERROR', '请求配置错误', error))
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    // 缓存GET请求的响应
    if (response.config.method === 'get' && response.status === 200) {
      const cacheKey = `${response.config.url}?${JSON.stringify(response.config.params || {})}`
      requestCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      })
    }

    return response
  },
  async error => {
    const originalRequest = error.config

    // 处理认证错误
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      // 如果是登录请求，直接返回错误，不尝试刷新token
      if (originalRequest.url?.includes('/auth/login')) {
        const appError = createAppError(
          error.response?.data?.code?.toString() || 'LOGIN_FAILED',
          error.response?.data?.message || '用户名或密码错误',
          error.response?.data
        )
        return Promise.reject(appError)
      }

      try {
        const newToken = await refreshToken()
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        void refreshError
        // 刷新失败，清除token并跳转到登录页
        clearAuthTokens()
        window.location.href = '/login'
        return Promise.reject(createAppError('AUTH_EXPIRED', '认证已过期，请重新登录'))
      }
    }

    // 处理其他错误
    const appError = createAppError(
      error.response?.data?.code?.toString() || 'API_ERROR',
      error.response?.data?.message || '请求失败',
      error.response?.data
    )

    return Promise.reject(appError)
  }
)

// 工具函数
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
}

function getActiveStorage(): Storage {
  if (localStorage.getItem('auth_token')) return localStorage
  if (sessionStorage.getItem('auth_token')) return sessionStorage
  return localStorage
}

function setAuthTokens(
  token: string,
  refreshToken: string,
  scope: 'local' | 'session' = 'local'
): void {
  const store = scope === 'local' ? localStorage : sessionStorage
  store.setItem('auth_token', token)
  store.setItem('refresh_token', refreshToken)
}

function setUserInfo(user: User, scope: 'local' | 'session' = 'local'): void {
  const store = scope === 'local' ? localStorage : sessionStorage
  const withVersion = { ...user } as any
  if (!withVersion.avatar_version) {
    // 初次写入或无版本时初始化
    withVersion.avatar_version = Date.now()
  }
  store.setItem('user_info', JSON.stringify(withVersion))
}

function clearAuthTokens(): void {
  for (const store of [localStorage, sessionStorage]) {
    store.removeItem('auth_token')
    store.removeItem('refresh_token')
    store.removeItem('user_info')
  }
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function createAppError(code: string, message: string, details?: any): AppError {
  return {
    code,
    message,
    details,
    stack: new Error().stack
  }
}

// 统一规范化与深合并后端返回的用户数据
function normalizeUserData(user: any): User {
  const store = getActiveStorage()
  let prev: any = null
  try {
    const raw = store.getItem('user_info')
    prev = raw ? JSON.parse(raw) : null
  } catch {
    prev = null
  }

  const merged: any = {
    ...(prev || {}),
    ...(user || {})
  }

  const mergedProfile: any = {
    ...((prev && prev.profile) || {}),
    ...((user && user.profile) || {})
  }

  // 将根级 nickname/bio 映射进 profile（后端新返回格式）
  if (user && Object.prototype.hasOwnProperty.call(user, 'nickname') && mergedProfile.nickname === undefined) {
    mergedProfile.nickname = user.nickname
  }
  if (user && Object.prototype.hasOwnProperty.call(user, 'bio') && mergedProfile.bio === undefined) {
    mergedProfile.bio = user.bio
  }

  // 关键资料字段空值不覆盖（地址相关前端自治）
  const preferPrev = (nextVal: any, prevVal: any) =>
    nextVal === undefined || nextVal === null || nextVal === '' ? (prevVal ?? '') : nextVal
  mergedProfile.province = preferPrev(mergedProfile.province, prev?.profile?.province)
  mergedProfile.city = preferPrev(mergedProfile.city, prev?.profile?.city)
  mergedProfile.location = preferPrev(mergedProfile.location, prev?.profile?.location)

  merged.profile = mergedProfile

  // 头像归一化与保留策略
  const normalized: any = {
    ...merged,
    avatar: merged.avatar || (merged as any).avatar_url
  }
  if (!normalized.avatar) normalized.avatar = prev?.avatar || ''
  if (!normalized.avatar_version) normalized.avatar_version = prev?.avatar_version || Date.now()

  return normalized as User
}

// 全局事件：用户信息更新
function emitUserUpdated(user: User): void {
  try {
    window.dispatchEvent(new CustomEvent('user:updated', { detail: user }))
  } catch (e) {
    void e
    /* no-op: 事件派发失败忽略 */
  }
}

// 清理过期缓存
function clearExpiredCache(): void {
  const now = Date.now()
  for (const [key, value] of requestCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      requestCache.delete(key)
    }
  }
}

// 定期清理缓存
setInterval(clearExpiredCache, CACHE_DURATION)

// 清除所有缓存
export function clearApiCache(): void {
  requestCache.clear()
}

// 认证相关API
/**
 * 用户登录
 */
export async function login(loginData: LoginForm): Promise<LoginResponse> {
  const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', loginData)

  if (response.data.code === 200 && response.data.data) {
    const { token, user } = response.data.data
    // 统一规范化用户数据（含 nickname/bio 映射到 profile）
    const normalizedUser = normalizeUserData(user)

    // 存储认证信息
    const scope = loginData.rememberMe ? 'local' : 'session'
    setAuthTokens(token, '', scope) // 新API可能没有refreshToken
    setUserInfo(normalizedUser, scope)
    emitUserUpdated(normalizedUser)

    return { ...response.data.data, user: normalizedUser }
  }

  throw createAppError('LOGIN_FAILED', response.data.message || '登录失败')
}

/**
 * 用户注册
 */
export async function register(registerData: RegisterForm): Promise<RegisterResponse> {
  try {
    const response = await api.post<ApiResponse<RegisterResponse>>('/auth/register', registerData)

    if (response.data.code === 201 && response.data.data) {
      const { token, user } = response.data.data
      const normalizedUser = normalizeUserData(user)

      // 存储认证信息
      setAuthTokens(token, '') // 新API可能没有refreshToken
      localStorage.setItem('user_info', JSON.stringify(normalizedUser))
      emitUserUpdated(normalizedUser)

      return { ...response.data.data, user: normalizedUser }
    }

    throw createAppError('REGISTER_FAILED', response.data.message || '注册失败')
  } catch (error) {
    console.error('API: 注册请求失败:', error)
    throw error
  }
}

/**
 * 用户登出
 */
export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout')
  } catch (error) {
    console.error('登出请求失败:', error)
  } finally {
    clearAuthTokens()
  }
}

/**
 * 刷新访问令牌
 */
export async function refreshToken(): Promise<string> {
  const refreshTokenValue =
    localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token')
  if (!refreshTokenValue) {
    throw createAppError('NO_REFRESH_TOKEN', '没有刷新令牌')
  }

  const response = await api.post<ApiResponse<RefreshTokenResponse>>('/auth/refresh', {
    refreshToken: refreshTokenValue
  })

  if (response.data.code === 200 && response.data.data) {
    const { token } = response.data.data
    const store = getActiveStorage()
    store.setItem('auth_token', token)
    return token
  }

  throw createAppError('REFRESH_FAILED', '刷新令牌失败')
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<User> {
  const response = await api.get<ApiResponse<User>>('/auth/me')

  if (response.data.code === 200 && response.data.data) {
    const user = response.data.data
    const normalizedUser = normalizeUserData(user) as any
    const store = getActiveStorage()
    store.setItem('user_info', JSON.stringify(normalizedUser))
    emitUserUpdated(normalizedUser)
    return normalizedUser
  }

  throw createAppError('GET_USER_FAILED', '获取用户信息失败')
}

/**
 * 更新用户信息
 */
export async function updateUser(userData: Partial<User>): Promise<User> {
  const response = await api.put<ApiResponse<User>>('/auth/me', userData)

  if (response.data.code === 200 && response.data.data) {
    const user = response.data.data
    const normalizedUser: any = normalizeUserData(user)
    const store = getActiveStorage()
    store.setItem('user_info', JSON.stringify(normalizedUser))
    emitUserUpdated(normalizedUser)
    return normalizedUser
  }

  throw createAppError('UPDATE_USER_FAILED', '更新用户信息失败')
}

/**
 * 修改密码
 */
export async function changePassword(data: {
  currentPassword: string
  newPassword: string
}): Promise<void> {
  const response = await api.post<ApiResponse>('/auth/change-password', data)

  if (response.data.code !== 200) {
    throw createAppError('CHANGE_PASSWORD_FAILED', response.data.message || '修改密码失败')
  }
}

/**
 * 忘记密码
 */
export async function forgotPassword(email: string): Promise<void> {
  const response = await api.post<ApiResponse>('/auth/forgot-password', { email })

  if (response.data.code !== 200) {
    throw createAppError('FORGOT_PASSWORD_FAILED', response.data.message || '发送重置邮件失败')
  }
}

/**
 * 重置密码
 */
export async function resetPassword(data: { token: string; newPassword: string }): Promise<void> {
  const response = await api.post<ApiResponse>('/auth/reset-password', data)

  if (response.data.code !== 200) {
    throw createAppError('RESET_PASSWORD_FAILED', response.data.message || '重置密码失败')
  }
}

/**
 * 上传图片（通用）
 * 返回图片的可访问 URL
 */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  // 优先尝试 /upload，其次 /files/upload
  try {
    const res = await api.post<ApiResponse<{ url?: string; path?: string }>>('/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    if (res.data.code === 200 && res.data.data) {
      return res.data.data.url || (res.data.data.path as string)
    }
    throw new Error(res.data.message || '上传失败')
  } catch (e) {
    void e
    const fallback = await api.post<ApiResponse<{ url?: string; path?: string }>>(
      '/files/upload',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    )
    if (fallback.data.code === 200 && fallback.data.data) {
      return fallback.data.data.url || (fallback.data.data.path as string)
    }
    throw createAppError('UPLOAD_FAILED', fallback.data.message || '上传失败')
  }
}

/**
 * 更新用户头像
 */
export async function updateUserAvatar(avatarUrl: string): Promise<User> {
  try {
    const res = await api.put<ApiResponse<User>>('/auth/me/avatar', { avatar: avatarUrl })
    if (res.data.code === 200 && res.data.data) {
      const user = res.data.data
      const normalizedUser: any = normalizeUserData(user)
      // 头像更新成功，刷新版本号以破缓存
      normalizedUser.avatar_version = Date.now()
      const store = getActiveStorage()
      store.setItem('user_info', JSON.stringify(normalizedUser))
      emitUserUpdated(normalizedUser)
      return normalizedUser
    }
    throw new Error(res.data.message || '更新头像失败')
  } catch (e) {
    void e
    // 兼容没有独立头像接口的后端
    const res = await api.put<ApiResponse<User>>('/auth/me', { avatar: avatarUrl })
    if (res.data.code === 200 && res.data.data) {
      const user = res.data.data
      const normalizedUser: any = normalizeUserData(user)
      normalizedUser.avatar_version = Date.now()
      const store = getActiveStorage()
      store.setItem('user_info', JSON.stringify(normalizedUser))
      emitUserUpdated(normalizedUser)
      return normalizedUser
    }
    throw createAppError('UPDATE_AVATAR_FAILED', res.data.message || '更新头像失败')
  }
}

/**
 * 获取历史头像列表（时间倒序，最多50条）
 * 优先 /user/avatar/history，兼容别名 /avatar/history
 */
export async function getAvatarHistory(): Promise<AvatarHistoryItem[]> {
  try {
    const res = await api.get<ApiResponse<AvatarHistoryList>>('/user/avatar/history')
    if (res.data.code === 200 && res.data.data) {
      return Array.isArray(res.data.data.items) ? res.data.data.items : []
    }
    throw new Error(res.data.message || '获取历史头像失败')
  } catch (e) {
    void e
    const fallback = await api.get<ApiResponse<AvatarHistoryList>>('/avatar/history')
    if (fallback.data.code === 200 && fallback.data.data) {
      return Array.isArray(fallback.data.data.items) ? fallback.data.data.items : []
    }
    throw createAppError('GET_AVATAR_HISTORY_FAILED', fallback.data.message || '获取历史头像失败')
  }
}

// 通用API方法
/**
 * GET请求
 */
export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.get<ApiResponse<T>>(url, config)

  if (response.data.code === 200 && response.data.data !== undefined) {
    return response.data.data
  }

  throw createAppError('GET_FAILED', response.data.message || '获取数据失败')
}

/**
 * POST请求
 */
export async function post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.post<ApiResponse<T>>(url, data, config)

  if (response.data.code === 200 && response.data.data !== undefined) {
    return response.data.data
  }

  throw createAppError('POST_FAILED', response.data.message || '提交数据失败')
}

/**
 * PUT请求
 */
export async function put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.put<ApiResponse<T>>(url, data, config)

  if (response.data.code === 200 && response.data.data !== undefined) {
    return response.data.data
  }

  throw createAppError('PUT_FAILED', response.data.message || '更新数据失败')
}

/**
 * DELETE请求
 */
export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.delete<ApiResponse<T>>(url, config)

  if (response.data.code === 200 && response.data.data !== undefined) {
    return response.data.data
  }

  throw createAppError('DELETE_FAILED', response.data.message || '删除数据失败')
}

// 新闻：基于本地 Mock 的 Top Headlines（全国热点优先，轮播用）
export async function fetchNews(params: FetchNewsParams = {}): Promise<NewsItem[]> {
  const pageSize = Math.max(1, Math.min(params.pageSize ?? 5, 10))

  // 简单内存缓存（与全局 requestCache 一致的键格式）
  const provider = (import.meta as any).env?.VITE_NEWS_PROVIDER || 'mock'
  const proxyBase = (import.meta as any).env?.VITE_NEWS_PROXY_URL || '/news'
  const cacheKey = `/${provider}/news?${JSON.stringify({ ...params, pageSize })}`
  const cached = requestCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return (cached.data as NewsItem[]).slice(0, pageSize)
  }

  // 本地持久缓存（localStorage），命中限速或离线时回退
  const lsKey = `news_cache_v2_${provider}` // 版本号更新，强制清除旧缓存
  
  // 开发环境下清除旧版本缓存
  if (import.meta.env.DEV) {
    const oldKeys = ['news_cache_v1_mock', 'news_cache_v1_gnews']
    oldKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key)
        console.log(`已清除旧缓存: ${key}`)
      }
    })
  }
  
  try {
    const raw = localStorage.getItem(lsKey)
    if (raw) {
      const { data, ts } = JSON.parse(raw)
      if (Date.now() - ts < CACHE_DURATION) {
        requestCache.set(cacheKey, { data, timestamp: ts })
        return (data as NewsItem[]).slice(0, pageSize)
      }
    }
  } catch (e) {
    void e
  }

  // 真实源（newsapi），失败回退到 mock
  if (provider === 'newsapi') {
    try {
      // 使用免费的NewsAPI.org（需要API密钥）
      const apiKey = (import.meta as any).env?.VITE_NEWSAPI_KEY
      if (apiKey) {
        const endpoint = 'https://newsapi.org/v2/top-headlines'
        const query = new URLSearchParams({
          country: params.country || 'cn',
          pageSize: String(pageSize),
          category: params.category || 'general',
          apiKey: apiKey
        }).toString()
        const url = `${endpoint}?${query}`
        const res = await axios.get(url)
        
        if (res.data?.articles && Array.isArray(res.data.articles)) {
          const articles = res.data.articles.map((article: any, index: number) => ({
            id: `news_${Date.now()}_${index}`,
            title: article.title || '无标题',
            source: article.source?.name || '未知来源',
            url: article.url || '#',
            imageUrl: article.urlToImage || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?q=80&w=1200&auto=format&fit=crop',
            publishedAt: article.publishedAt || new Date().toISOString(),
            summary: article.description || ''
          }))
          
          requestCache.set(cacheKey, { data: articles, timestamp: Date.now() })
          try {
            localStorage.setItem(lsKey, JSON.stringify({ data: articles, ts: Date.now() }))
          } catch (e) {
            void e
          }
          return articles.slice(0, pageSize)
        }
      }
    } catch (e) {
      console.log('NewsAPI请求失败，回退到模拟数据:', e)
    }
  }

  // RSS新闻源（无需API密钥的免费方案）
  if (provider === 'rss') {
    try {
      // 使用公开的RSS聚合服务
      const rssUrls = [
        'https://news.sina.com.cn/roll/#pageid=153&lid=2509&k=&num=50&page=1',
        'https://news.163.com/special/0001386F/rank_whole.html'
      ]
      
      // 这里简化处理，实际项目中可以使用RSS解析库
      const mockFromRss: NewsItem[] = [
        {
          id: `rss_${Date.now()}_1`,
          title: '实时：央行宣布新的货币政策调整措施',
          source: '新浪财经',
          url: 'https://finance.sina.com.cn',
          imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1200&auto=format&fit=crop',
          publishedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          summary: '央行今日发布重要货币政策调整通知...'
        },
        {
          id: `rss_${Date.now()}_2`,
          title: '科技前沿：AI大模型在医疗领域取得重大突破',
          source: '网易科技',
          url: 'https://tech.163.com',
          imageUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?q=80&w=1200&auto=format&fit=crop',
          publishedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          summary: '最新研究显示AI在诊断准确率方面显著提升...'
        },
        {
          id: `rss_${Date.now()}_3`,
          title: '国际动态：多国就气候变化问题达成新共识',
          source: '人民日报',
          url: 'http://www.people.com.cn',
          imageUrl: 'https://images.unsplash.com/photo-1569163139394-de44cb2c1dd3?q=80&w=1200&auto=format&fit=crop',
          publishedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
          summary: '联合国气候大会取得积极进展...'
        },
        {
          id: `rss_${Date.now()}_4`,
          title: '体育快讯：国足备战世预赛最新进展',
          source: '新华体育',
          url: 'https://www.xinhuanet.com',
          imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200&auto=format&fit=crop',
          publishedAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
          summary: '国家队主教练公布最新集训名单...'
        },
        {
          id: `rss_${Date.now()}_5`,
          title: '经济观察：数字经济发展呈现新趋势',
          source: '财新网',
          url: 'https://www.caixin.com',
          imageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=1200&auto=format&fit=crop',
          publishedAt: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
          summary: '数字化转型推动经济结构优化升级...'
        }
      ]
      
      requestCache.set(cacheKey, { data: mockFromRss, timestamp: Date.now() })
      try {
        localStorage.setItem(lsKey, JSON.stringify({ data: mockFromRss, ts: Date.now() }))
      } catch (e) {
        void e
      }
      return mockFromRss.slice(0, pageSize)
    } catch (e) {
      console.log('RSS新闻获取失败，回退到模拟数据:', e)
    }
  }

  // 模拟外部新闻源（全国热点）；发布时间按当前时间倒序 1-5 分钟内
  const now = Date.now()
  const sources = ['新华网', '央视新闻', '人民日报', '澎湃新闻', '界面新闻', '财新', '凤凰网']
  const headlines = [
    '多地推出稳增长举措，重点项目加速落地',
    '新一代人工智能大模型发布，产业生态加速重构',
    '中秋国庆假期旅游热度攀升，文旅融合亮点频出',
    '我国首个商业航天发射场完成关键节点测试',
    '多部门联合发文支持中小企业数字化转型'
  ]

  const images = [
    'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=1200&auto=format&fit=crop'
  ]

  // 对应的真实新闻链接（示例）
  const newsUrls = [
    'https://www.xinhuanet.com',
    'https://news.cctv.com',
    'http://www.people.com.cn',
    'https://www.thepaper.cn',
    'https://www.jiemian.com'
  ]

  function pick<T>(arr: T[], i: number): T {
    return arr[i % arr.length]
  }

  const mock: NewsItem[] = Array.from({ length: 8 }).map((_, i) => {
    const minuteOffset = (i + 1) * 60 * 1000
    const ts = new Date(now - minuteOffset).toISOString()
    const title = pick(headlines, i)
    const source = pick(sources, i + 2)
    const imageUrl = pick(images, i + 1)
    const url = pick(newsUrls, i) // 使用真实的新闻网站链接
    const id = `n_${btoa(url).replace(/=+$/g, '')}_${i}`
    
    // 调试：打印生成的URL
    if (import.meta.env.DEV) {
      console.log(`生成新闻 ${i}: ${title} -> ${url}`)
    }
    
    return { id, title, source, url, imageUrl, publishedAt: ts, summary: '' }
  })

  // 按时间倒序并截取 pageSize
  const items = mock
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, pageSize)

  // 模拟网络延迟 200-400ms
  const delay = 200 + Math.floor(Math.random() * 200)
  await new Promise(resolve => setTimeout(resolve, delay))

  requestCache.set(cacheKey, { data: items, timestamp: Date.now() })
  try {
    localStorage.setItem(lsKey, JSON.stringify({ data: items, ts: Date.now() }))
  } catch (e) {
    void e
  }
  return items
}

export default api
