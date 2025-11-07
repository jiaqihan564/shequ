/**
 * 头像工具函数
 */

/**
 * 获取用户名首字母作为默认头像
 * @param name 用户名或昵称
 * @returns 首字母（大写）
 */
export function getAvatarInitial(name: string | undefined): string {
  if (!name || name.trim() === '') return '?'

  // 获取第一个字符
  const firstChar = name.trim().charAt(0)

  // 如果是中文，直接返回
  if (/[\u4e00-\u9fa5]/.test(firstChar)) {
    return firstChar
  }

  // 如果是英文，返回大写
  return firstChar.toUpperCase()
}

/**
 * 根据用户ID生成头像背景颜色
 * @param id 用户ID
 * @returns 颜色值（十六进制）
 */
export function getAvatarColor(id: number | undefined): string {
  if (!id) return '#909399'

  const colors = [
    '#409eff', // 蓝色
    '#67c23a', // 绿色
    '#e6a23c', // 橙色
    '#f56c6c', // 红色
    '#8e44ad', // 紫色
    '#3498db', // 天蓝
    '#1abc9c', // 青色
    '#e74c3c', // 深红
    '#2ecc71', // 翠绿
    '#f39c12' // 金黄
  ]

  return colors[id % colors.length]
}

/**
 * 检查是否有有效的头像URL
 * @param avatar 头像URL
 * @returns 是否有效
 */
export function hasValidAvatar(avatar: string | undefined | null): boolean {
  if (!avatar) return false
  if (avatar.trim() === '') return false
  if (avatar === '/default-avatar.png') return false
  return true
}
