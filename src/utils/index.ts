// Utils 工具函数统一导出（向后兼容）
// 这个文件保持向后兼容，使现有的 import 语句继续工作

// API相关 - 重新导出所有API函数
export * from './api/api'
export * from './api/code-api'

// 认证相关 - 从auth模块导出，避免与api模块的getCurrentUser冲突
export { isAdmin, hasPermission, isAuthenticated } from './auth/auth'
export { getCurrentUser as getCurrentUserFromAuth } from './auth/auth'
export * from './auth/validation'

// 数据处理相关
export * from './data/markdown'
export * from './data/regions'
export * from './data/geo'

// UI相关
export { default as toast } from './ui/toast'
export * from './ui/avatar'

// 上传相关
export * from './upload/chunk-upload'
