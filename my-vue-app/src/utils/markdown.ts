/**
 * Markdown渲染工具
 */

import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

// 配置markdown-it实例
const md = new MarkdownIt({
  html: true,        // 允许HTML标签
  linkify: true,     // 自动转换URL为链接
  typographer: true, // 启用排版优化（引号、破折号等）
  breaks: true,      // 将换行符转换为<br>
  highlight: function (str, lang) {
    // 代码高亮
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre class="hljs"><code>' +
               hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
               '</code></pre>'
      } catch (e) {
        console.error('代码高亮失败:', e)
      }
    }
    // 未指定语言，使用纯文本
    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>'
  }
})

/**
 * 渲染Markdown内容为HTML
 * @param content Markdown原始内容
 * @returns 渲染后的HTML字符串
 */
export function renderMarkdown(content: string): string {
  if (!content || content.trim() === '') {
    return '<p>暂无内容</p>'
  }
  
  try {
    return md.render(content)
  } catch (error) {
    console.error('Markdown渲染失败:', error)
    // 降级方案：返回纯文本
    return `<p>${content.replace(/\n/g, '<br>')}</p>`
  }
}

/**
 * 渲染Markdown内联内容（不包含块级元素）
 * @param content Markdown原始内容
 * @returns 渲染后的HTML字符串
 */
export function renderMarkdownInline(content: string): string {
  if (!content || content.trim() === '') {
    return ''
  }
  
  try {
    return md.renderInline(content)
  } catch (error) {
    console.error('Markdown内联渲染失败:', error)
    return content
  }
}

export default md

