/**
 * Markdown渲染工具
 */

import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

// 配置markdown-it实例
const md: MarkdownIt = new MarkdownIt({
  html: true,        // 允许HTML标签
  linkify: true,     // 自动转换URL为链接
  typographer: true, // 启用排版优化（引号、破折号等）
  breaks: true,      // 将换行符转换为<br>
  highlight: function (str, lang) {
    // 代码高亮
    if (lang && hljs.getLanguage(lang)) {
      try {
        // 对代码内容进行HTML编码以安全地存储在data属性中
        const encodedCode = md.utils.escapeHtml(str)
        return '<div class="code-block-wrapper">' +
               '<div class="code-block-header">' +
               '<div class="code-block-lang">' + md.utils.escapeHtml(lang) + '</div>' +
               '<div class="code-block-actions">' +
               '<button class="code-copy-btn" data-code="' + encodedCode + '" title="复制代码">' +
               '<svg class="code-icon" viewBox="0 0 24 24" width="16" height="16">' +
               '<path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" />' +
               '</svg>' +
               '<span class="copy-text">复制</span>' +
               '</button>' +
               '</div>' +
               '</div>' +
               '<pre class="hljs"><code>' +
               hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
               '</code></pre>' +
               '</div>'
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
    const html = md.render(content)
    // 渲染后需要手动绑定复制按钮事件
    setTimeout(() => initCopyButtons(), 0)
    return html
  } catch (error) {
    console.error('Markdown渲染失败:', error)
    // 降级方案：返回纯文本
    return `<p>${content.replace(/\n/g, '<br>')}</p>`
  }
}

/**
 * 初始化代码块复制按钮
 */
function initCopyButtons() {
  const copyButtons = document.querySelectorAll('.code-copy-btn')
  copyButtons.forEach(button => {
    // 移除旧的事件监听器（如果存在）
    const newButton = button.cloneNode(true) as HTMLButtonElement
    button.parentNode?.replaceChild(newButton, button)
    
    // 添加新的事件监听器
    newButton.addEventListener('click', async function(e) {
      e.preventDefault()
      const codeText = this.getAttribute('data-code')
      if (!codeText) return
      
      // HTML解码
      const textarea = document.createElement('textarea')
      textarea.innerHTML = codeText
      const decodedCode = textarea.value
      
      try {
        await navigator.clipboard.writeText(decodedCode)
        
        // 更改按钮文本
        const copyText = this.querySelector('.copy-text')
        const originalText = copyText?.textContent || '复制'
        if (copyText) {
          copyText.textContent = '已复制!'
          this.classList.add('copied')
          setTimeout(() => {
            copyText.textContent = originalText
            this.classList.remove('copied')
          }, 2000)
        }
      } catch (err) {
        // 降级方案：使用传统方法
        const tempTextarea = document.createElement('textarea')
        tempTextarea.value = decodedCode
        tempTextarea.style.position = 'fixed'
        tempTextarea.style.left = '-999999px'
        document.body.appendChild(tempTextarea)
        tempTextarea.select()
        try {
          document.execCommand('copy')
          const copyText = this.querySelector('.copy-text')
          if (copyText) {
            copyText.textContent = '已复制!'
            this.classList.add('copied')
            setTimeout(() => {
              copyText.textContent = '复制'
              this.classList.remove('copied')
            }, 2000)
          }
        } catch (e) {
          console.error('复制失败:', e)
        }
        document.body.removeChild(tempTextarea)
      }
    })
  })
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

