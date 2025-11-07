/**
 * 文件类型和上传限制配置
 * 统一管理允许的文件类型和上传限制
 */

/**
 * 图片文件类型
 */
export const IMAGE_FILE_TYPES = {
  /** MIME类型列表 */
  MIMES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'] as const,

  /** 文件扩展名列表 */
  EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'] as const,

  /** Accept属性值（用于 input[type="file"]） */
  ACCEPT: 'image/jpeg,image/jpg,image/png,image/gif,image/webp',

  /** 显示名称 */
  DISPLAY_NAME: 'JPG、PNG、GIF、WebP'
} as const

/**
 * Markdown文件类型
 */
export const MARKDOWN_FILE_TYPES = {
  /** MIME类型列表 */
  MIMES: ['text/markdown', 'text/x-markdown'] as const,

  /** 文件扩展名列表 */
  EXTENSIONS: ['.md', '.markdown'] as const,

  /** Accept属性值（用于 input[type="file"]） */
  ACCEPT: '.md,.markdown',

  /** 显示名称 */
  DISPLAY_NAME: 'Markdown (*.md)'
} as const

/**
 * 代码文件类型
 */
export const CODE_FILE_TYPES = {
  /** MIME类型列表 */
  MIMES: [
    'text/plain',
    'text/x-python',
    'text/javascript',
    'text/x-java',
    'text/x-c++src'
  ] as const,

  /** 文件扩展名列表 */
  EXTENSIONS: ['.txt', '.py', '.js', '.java', '.cpp', '.c', '.h', '.hpp'] as const,

  /** Accept属性值（用于 input[type="file"]） */
  ACCEPT: '.txt,.py,.js,.java,.cpp,.c,.h,.hpp',

  /** 显示名称 */
  DISPLAY_NAME: '代码文件'
} as const

/**
 * 文件上传数量限制
 */
export const UPLOAD_LIMITS = {
  /** 资源文件：单个文件 */
  RESOURCE_FILE: 1,

  /** 预览图片：最多5张 */
  PREVIEW_IMAGES: 5
} as const

/**
 * 导出所有文件类型配置
 */
export const FILE_TYPES = {
  IMAGE: IMAGE_FILE_TYPES,
  MARKDOWN: MARKDOWN_FILE_TYPES,
  CODE: CODE_FILE_TYPES,
  UPLOAD_LIMITS
} as const

export default FILE_TYPES
