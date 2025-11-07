/**
 * 统一配置管理模块
 * 从环境变量读取配置，提供类型安全的访问接口
 */

// ==================== 辅助函数 ====================

/**
 * 获取环境变量（字符串）
 */
function getEnvString(key: string, defaultValue: string = ''): string {
  return import.meta.env[key] || defaultValue
}

/**
 * 获取环境变量（数字）
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = import.meta.env[key]
  if (value === undefined || value === '') return defaultValue
  const num = Number(value)
  return isNaN(num) ? defaultValue : num
}

/**
 * 获取环境变量（布尔值）
 */
function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = import.meta.env[key]
  if (value === undefined || value === '') return defaultValue
  return value === 'true' || value === '1'
}

// ==================== API 配置 ====================

export const apiConfig = {
  /** API 基础 URL */
  baseURL: getEnvString('VITE_API_BASE_URL', '/api'),

  /** API 请求超时时间（毫秒） */
  timeout: getEnvNumber('VITE_API_TIMEOUT', 10000),

  /** API 最大重定向次数 */
  maxRedirects: getEnvNumber('VITE_API_MAX_REDIRECTS', 3),

  /** API 最大内容大小（字节） */
  maxContentLength: getEnvNumber('VITE_API_MAX_CONTENT_SIZE_MB', 10) * 1024 * 1024,

  /** API 最大请求体大小（字节） */
  maxBodyLength: getEnvNumber('VITE_API_MAX_BODY_SIZE_MB', 10) * 1024 * 1024,

  /** API 响应缓存时长（毫秒） */
  cacheDuration: getEnvNumber('VITE_API_CACHE_DURATION_MS', 300000),

  /** 认证过期跳转延迟（毫秒） */
  authRedirectDelay: getEnvNumber('VITE_AUTH_REDIRECT_DELAY_MS', 2000)
}

// ==================== 应用配置 ====================

export const appConfig = {
  /** 应用标题 */
  title: getEnvString('VITE_APP_TITLE', '技术交流社区'),

  /** 应用描述 */
  description: getEnvString('VITE_APP_DESCRIPTION', '现代化的技术交流社区平台')
}

// ==================== 功能开关 ====================

export const featureFlags = {
  /** 启用分析统计 */
  enableAnalytics: getEnvBoolean('VITE_ENABLE_ANALYTICS', false),

  /** 启用 PWA */
  enablePWA: getEnvBoolean('VITE_ENABLE_PWA', false)
}

// ==================== 第三方服务配置 ====================

export const thirdPartyConfig = {
  /** Google Analytics ID */
  googleAnalyticsId: getEnvString('VITE_GOOGLE_ANALYTICS_ID', ''),

  /** Sentry DSN */
  sentryDSN: getEnvString('VITE_SENTRY_DSN', '')
}

// ==================== 代码执行配置 ====================

export const codeExecutionConfig = {
  /** 代码执行超时时间（毫秒） */
  timeout: getEnvNumber('VITE_CODE_EXECUTION_TIMEOUT', 30000)
}

// ==================== 地理位置配置 ====================

export const geoConfig = {
  /** 高德地图 API Key */
  amapKey: getEnvString('VITE_AMAP_KEY', ''),

  /** 地理位置缓存时长（毫秒） */
  cacheTTL: getEnvNumber('VITE_GEO_CACHE_TTL_MS', 86400000),

  /** 地理位置 API 请求超时（毫秒） */
  timeout: getEnvNumber('VITE_GEO_TIMEOUT_MS', 5000),

  /** 浏览器定位超时（毫秒） */
  browserTimeout: getEnvNumber('VITE_GEO_BROWSER_TIMEOUT_MS', 7000),

  /** 浏览器定位缓存时长（毫秒） */
  browserMaxAge: getEnvNumber('VITE_GEO_BROWSER_MAX_AGE_MS', 300000)
}

// ==================== 用户认证配置 ====================

export const authConfig = {
  /** 默认省份（地理位置获取失败时使用） */
  defaultProvince: getEnvString('VITE_DEFAULT_PROVINCE', '山东'),

  /** 默认城市（地理位置获取失败时使用） */
  defaultCity: getEnvString('VITE_DEFAULT_CITY', '威海'),

  /** 注册时地理位置检测超时（毫秒） */
  registerGeoTimeout: getEnvNumber('VITE_REGISTER_GEO_TIMEOUT_MS', 3000)
}

// ==================== 文件上传配置 ====================

export const uploadConfig = {
  /** 分片上传：每片大小（字节） */
  chunkSize: getEnvNumber('VITE_UPLOAD_CHUNK_SIZE_MB', 2) * 1024 * 1024,

  /** 图片最大大小（字节） */
  imageMaxSize: getEnvNumber('VITE_IMAGE_MAX_SIZE_MB', 5) * 1024 * 1024,

  /** 文章图片最大大小（字节） - 极致压缩 */
  articleImageMaxSize: getEnvNumber('VITE_ARTICLE_IMAGE_MAX_SIZE_KB', 200) * 1024, // 改为200KB

  /** Markdown 文件最大大小（字节） */
  markdownMaxSize: getEnvNumber('VITE_MARKDOWN_MAX_SIZE_MB', 5) * 1024 * 1024,

  /** 文章 Markdown 文件最大大小（字节） */
  articleMarkdownMaxSize: getEnvNumber('VITE_ARTICLE_MD_MAX_SIZE_MB', 5) * 1024 * 1024,

  /** 文档图片目标大小（字节） - 极致压缩 */
  documentImageTargetSize: getEnvNumber('VITE_DOCUMENT_IMAGE_TARGET_KB', 150) * 1024, // 目标150KB

  /** 资源预览图目标大小（字节） - 极致压缩 */
  resourcePreviewImageSize: getEnvNumber('VITE_RESOURCE_PREVIEW_IMAGE_KB', 150) * 1024 // 目标150KB
}

// ==================== 图片懒加载配置 ====================

export const lazyLoadConfig = {
  /** 最大并发加载数 */
  maxConcurrent: getEnvNumber('VITE_LAZY_LOAD_MAX_CONCURRENT', 4),

  /** 提前加载距离（像素） */
  rootMargin: getEnvNumber('VITE_LAZY_LOAD_ROOT_MARGIN', 50),

  /** Intersection Observer 阈值 */
  intersectionThreshold: getEnvNumber('VITE_LAZY_LOAD_THRESHOLD', 0.01)
}

// ==================== 性能监控配置 ====================

export const performanceConfig = {
  /** FPS 良好阈值 */
  fpsGoodThreshold: getEnvNumber('VITE_PERF_FPS_GOOD_THRESHOLD', 55),

  /** FPS 一般阈值 */
  fpsOkThreshold: getEnvNumber('VITE_PERF_FPS_OK_THRESHOLD', 30),

  /** FPS 计算间隔（毫秒） */
  fpsCalcInterval: getEnvNumber('VITE_PERF_FPS_CALC_INTERVAL_MS', 1000),

  /** 性能监控显示位置 */
  monitorPosition: {
    top: getEnvNumber('VITE_PERF_MONITOR_TOP', 80),
    right: getEnvNumber('VITE_PERF_MONITOR_RIGHT', 20)
  }
}

// ==================== WebSocket 配置 ====================

export const websocketConfig = {
  /** 最大重连尝试次数 */
  maxReconnectAttempts: getEnvNumber('VITE_WS_MAX_RECONNECT_ATTEMPTS', 5),

  /** 重连延迟数组（毫秒） */
  reconnectDelays: (() => {
    const delays = getEnvString('VITE_WS_RECONNECT_DELAYS', '1000,2000,4000,8000,10000')
    return delays.split(',').map(d => parseInt(d.trim(), 10))
  })(),

  /** 最大消息缓存数量 */
  maxMessages: getEnvNumber('VITE_WS_MAX_MESSAGES', 200),

  /** 心跳间隔（毫秒） */
  heartbeatInterval: getEnvNumber('VITE_WS_HEARTBEAT_INTERVAL_MS', 30000)
}

// ==================== 弹幕配置 ====================

export const danmakuConfig = {
  /** 弹幕轨道数量 */
  trackCount: getEnvNumber('VITE_DANMAKU_TRACK_COUNT', 8),

  /** 弹幕轨道高度（像素） */
  trackHeight: getEnvNumber('VITE_DANMAKU_TRACK_HEIGHT', 60),

  /** 弹幕基础滚动时间（秒） */
  baseDuration: getEnvNumber('VITE_DANMAKU_BASE_DURATION', 12)
}

// ==================== Toast 通知配置 ====================

export const toastConfig = {
  /** 默认显示时长（毫秒） */
  defaultDuration: getEnvNumber('VITE_TOAST_DEFAULT_DURATION_MS', 3000),

  /** 最大可见数量 */
  maxVisible: {
    small: getEnvNumber('VITE_TOAST_MAX_VISIBLE_SMALL', 3),
    large: getEnvNumber('VITE_TOAST_MAX_VISIBLE_LARGE', 5)
  },

  /** 屏幕断点（像素） */
  screenBreakpoint: {
    width: getEnvNumber('VITE_TOAST_SCREEN_WIDTH_BREAKPOINT', 480),
    height: getEnvNumber('VITE_TOAST_SCREEN_HEIGHT_BREAKPOINT', 640)
  }
}

// ==================== 轮询间隔配置 ====================

export const pollingConfig = {
  /** 未读消息轮询间隔（毫秒） */
  unreadMessages: getEnvNumber('VITE_POLLING_UNREAD_MESSAGES_MS', 10000),

  /** 新闻轮询间隔（毫秒） */
  news: getEnvNumber('VITE_POLLING_NEWS_MS', 120000),

  /** 实时指标刷新间隔（毫秒） */
  realtimeMetrics: getEnvNumber('VITE_POLLING_REALTIME_METRICS_MS', 5000)
}

// ==================== UI 延迟配置 ====================

export const uiDelayConfig = {
  /** 资源上传成功后跳转延迟（毫秒） */
  uploadSuccessRedirect: getEnvNumber('VITE_UI_UPLOAD_SUCCESS_REDIRECT_DELAY_MS', 1500),

  /** 消息滚动延迟（毫秒） */
  messageScroll: getEnvNumber('VITE_UI_MESSAGE_SCROLL_DELAY_MS', 300),

  /** Monaco编辑器预加载超时（毫秒） */
  monacoPreloadTimeout: getEnvNumber('VITE_UI_MONACO_PRELOAD_TIMEOUT_MS', 2000),

  /** Monaco编辑器预加载降级超时（毫秒） */
  monacoPreloadFallback: getEnvNumber('VITE_UI_MONACO_PRELOAD_FALLBACK_MS', 1000),

  /** 登录时地理位置获取超时（毫秒） */
  geoLoginTimeout: getEnvNumber('VITE_UI_GEO_LOGIN_TIMEOUT_MS', 3000)
}

// ==================== 表单长度限制配置 ====================

export const formLimitsConfig = {
  /** 资源标题最大长度 */
  resourceTitle: getEnvNumber('VITE_FORM_RESOURCE_TITLE_MAX', 200),

  /** 资源描述最大长度 */
  resourceDescription: getEnvNumber('VITE_FORM_RESOURCE_DESC_MAX', 1000),

  /** 文章标题最大长度 */
  articleTitle: getEnvNumber('VITE_FORM_ARTICLE_TITLE_MAX', 200),

  /** 文章描述最大长度 */
  articleDescription: getEnvNumber('VITE_FORM_ARTICLE_DESC_MAX', 500),

  /** 评论内容最大长度 */
  comment: getEnvNumber('VITE_FORM_COMMENT_MAX', 500),

  /** 私信内容最大长度 */
  privateMessage: getEnvNumber('VITE_FORM_PRIVATE_MESSAGE_MAX', 1000),

  /** 聊天消息最大长度 */
  chatMessage: getEnvNumber('VITE_FORM_CHAT_MESSAGE_MAX', 500)
}

// ==================== 地图配置扩展 ====================

export const mapConfig = {
  /** 高德地图搜索半径（米） */
  searchRadius: getEnvNumber('VITE_AMAP_SEARCH_RADIUS', 3000)
}

// ==================== 缓存配置扩展 ====================

export const cacheConfig = {
  /** 地区数据缓存时长（毫秒） */
  regionsTTL: getEnvNumber('VITE_REGIONS_CACHE_TTL_MS', 604800000)
}

// ==================== API 默认参数配置 ====================

export const apiDefaultsConfig = {
  /** 历史记录默认 limit 参数 */
  historyDefaultLimit: getEnvNumber('VITE_API_HISTORY_DEFAULT_LIMIT', 50)
}

// ==================== 导出所有配置 ====================

export const config = {
  api: apiConfig,
  app: appConfig,
  features: featureFlags,
  thirdParty: thirdPartyConfig,
  codeExecution: codeExecutionConfig,
  geo: geoConfig,
  auth: authConfig,
  upload: uploadConfig,
  lazyLoad: lazyLoadConfig,
  performance: performanceConfig,
  websocket: websocketConfig,
  danmaku: danmakuConfig,
  toast: toastConfig,
  polling: pollingConfig,
  uiDelay: uiDelayConfig,
  formLimits: formLimitsConfig,
  map: mapConfig,
  cache: cacheConfig,
  apiDefaults: apiDefaultsConfig
}

export default config
