/**
 * 生产环境友好的日志工具
 * 在开发环境输出详细日志，生产环境仅输出错误
 */

const isDev = import.meta.env.DEV

export const logger = {
  /**
   * 调试日志 - 仅在开发环境输出
   */
  debug(...args: unknown[]) {
    if (isDev) {
      console.log('[DEBUG]', ...args)
    }
  },

  /**
   * 信息日志 - 仅在开发环境输出
   */
  info(...args: unknown[]) {
    if (isDev) {
      console.log('[INFO]', ...args)
    }
  },

  /**
   * 警告日志 - 所有环境输出
   */
  warn(...args: unknown[]) {
    console.warn('[WARN]', ...args)
  },

  /**
   * 错误日志 - 所有环境输出
   */
  error(...args: unknown[]) {
    console.error('[ERROR]', ...args)
  },

  /**
   * 条件日志 - 根据条件在开发环境输出
   */
  conditional(condition: boolean, ...args: unknown[]) {
    if (isDev && condition) {
      console.log('[CONDITIONAL]', ...args)
    }
  }
}

export default logger
