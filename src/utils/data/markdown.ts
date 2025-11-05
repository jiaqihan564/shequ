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
    // 对代码内容进行HTML编码以安全地存储在data属性中
    const encodedCode = md.utils.escapeHtml(str)
    const lineCount = str.split('\n').length
    const isLongCode = lineCount > 15 // 超过15行视为长代码
    
    // 生成按钮组HTML
    const actionsHtml = '<div class="code-block-actions">' +
      // 折叠/展开按钮（仅长代码显示）
      (isLongCode ? '<button class="code-action-btn code-collapse-btn" title="折叠代码">' +
      '<svg class="code-icon" viewBox="0 0 24 24" width="16" height="16">' +
      '<path fill="currentColor" d="M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z" />' +
      '</svg>' +
      '<span class="action-text">折叠</span>' +
      '</button>' : '') +
      // 全屏按钮
      '<button class="code-action-btn code-fullscreen-btn" title="全屏查看">' +
      '<svg class="code-icon" viewBox="0 0 24 24" width="16" height="16">' +
      '<path fill="currentColor" d="M5,5H10V7H7V10H5V5M14,5H19V10H17V7H14V5M17,14H19V19H14V17H17V14M10,17V19H5V14H7V17H10Z" />' +
      '</svg>' +
      '<span class="action-text">全屏</span>' +
      '</button>' +
      // 下载按钮
      '<button class="code-action-btn code-download-btn" data-code="' + encodedCode + '" data-lang="' + (lang || 'txt') + '" title="下载代码">' +
      '<svg class="code-icon" viewBox="0 0 24 24" width="16" height="16">' +
      '<path fill="currentColor" d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />' +
      '</svg>' +
      '<span class="action-text">下载</span>' +
      '</button>' +
      // 复制按钮
      '<button class="code-action-btn code-copy-btn" data-code="' + encodedCode + '" title="复制代码">' +
      '<svg class="code-icon" viewBox="0 0 24 24" width="16" height="16">' +
      '<path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" />' +
      '</svg>' +
      '<span class="action-text">复制</span>' +
      '</button>' +
      '</div>'
    
    // 代码高亮处理
    let highlightedCode = ''
    let displayLang = lang || 'text'
    
    if (lang && hljs.getLanguage(lang)) {
      try {
        highlightedCode = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
      } catch (e) {
        console.error('代码高亮失败:', e)
        highlightedCode = md.utils.escapeHtml(str)
      }
    } else {
      // 未识别的语言，使用纯文本
      highlightedCode = md.utils.escapeHtml(str)
    }
    
    // 返回完整的代码块HTML
    return '<div class="code-block-wrapper' + (isLongCode ? ' collapsible' : '') + '">' +
           '<div class="code-block-header">' +
           '<div class="code-block-lang">' + md.utils.escapeHtml(displayLang) + '</div>' +
           actionsHtml +
           '</div>' +
           '<pre class="hljs"><code>' + highlightedCode + '</code></pre>' +
           '</div>'
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
 * 初始化代码块按钮
 */
function initCopyButtons() {
  // 1. 复制按钮
  const copyButtons = document.querySelectorAll('.code-copy-btn')
  copyButtons.forEach(button => {
    const newButton = button.cloneNode(true) as HTMLButtonElement
    button.parentNode?.replaceChild(newButton, button)
    
    newButton.addEventListener('click', async function(e) {
      e.preventDefault()
      const codeText = this.getAttribute('data-code')
      if (!codeText) return
      
      const textarea = document.createElement('textarea')
      textarea.innerHTML = codeText
      const decodedCode = textarea.value
      
      try {
        await navigator.clipboard.writeText(decodedCode)
        updateButtonState(this, '已复制!', 'copied')
      } catch (err) {
        const tempTextarea = document.createElement('textarea')
        tempTextarea.value = decodedCode
        tempTextarea.style.position = 'fixed'
        tempTextarea.style.left = '-999999px'
        document.body.appendChild(tempTextarea)
        tempTextarea.select()
        try {
          document.execCommand('copy')
          updateButtonState(this, '已复制!', 'copied')
        } catch (e) {
          console.error('复制失败:', e)
        }
        document.body.removeChild(tempTextarea)
      }
    })
  })
  
  // 2. 下载按钮
  const downloadButtons = document.querySelectorAll('.code-download-btn')
  downloadButtons.forEach(button => {
    const newButton = button.cloneNode(true) as HTMLButtonElement
    button.parentNode?.replaceChild(newButton, button)
    
    newButton.addEventListener('click', function(e) {
      e.preventDefault()
      const codeText = this.getAttribute('data-code')
      const lang = this.getAttribute('data-lang') || 'txt'
      if (!codeText) return
      
      const textarea = document.createElement('textarea')
      textarea.innerHTML = codeText
      const decodedCode = textarea.value
      
      // 根据语言确定文件扩展名
      const ext = getFileExtension(lang)
      const filename = `code.${ext}`
      
      // 创建Blob并下载
      const blob = new Blob([decodedCode], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      
      updateButtonState(this, '已下载!', 'downloaded')
    })
  })
  
  // 3. 全屏按钮
  const fullscreenButtons = document.querySelectorAll('.code-fullscreen-btn')
  fullscreenButtons.forEach(button => {
    const newButton = button.cloneNode(true) as HTMLButtonElement
    button.parentNode?.replaceChild(newButton, button)
    
    newButton.addEventListener('click', function(e) {
      e.preventDefault()
      const wrapper = this.closest('.code-block-wrapper')
      if (!wrapper) return
      
      if (wrapper.classList.contains('fullscreen')) {
        exitFullscreen(wrapper)
      } else {
        enterFullscreen(wrapper)
      }
    })
  })
  
  // 4. 折叠按钮
  const collapseButtons = document.querySelectorAll('.code-collapse-btn')
  collapseButtons.forEach(button => {
    const newButton = button.cloneNode(true) as HTMLButtonElement
    button.parentNode?.replaceChild(newButton, button)
    
    newButton.addEventListener('click', function(e) {
      e.preventDefault()
      const wrapper = this.closest('.code-block-wrapper')
      if (!wrapper) return
      
      const isCollapsed = wrapper.classList.toggle('collapsed')
      const actionText = this.querySelector('.action-text')
      if (actionText) {
        actionText.textContent = isCollapsed ? '展开' : '折叠'
      }
      this.title = isCollapsed ? '展开代码' : '折叠代码'
    })
  })
}

/**
 * 更新按钮状态
 */
function updateButtonState(button: HTMLButtonElement, text: string, className: string) {
  const actionText = button.querySelector('.action-text')
  const originalText = actionText?.textContent || ''
  if (actionText) {
    actionText.textContent = text
    button.classList.add(className)
    setTimeout(() => {
      actionText.textContent = originalText
      button.classList.remove(className)
    }, 2000)
  }
}

/**
 * 根据语言获取文件扩展名
 */
function getFileExtension(lang: string): string {
  const extMap: Record<string, string> = {
    javascript: 'js',
    typescript: 'ts',
    python: 'py',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    csharp: 'cs',
    go: 'go',
    rust: 'rs',
    php: 'php',
    ruby: 'rb',
    swift: 'swift',
    kotlin: 'kt',
    scala: 'scala',
    bash: 'sh',
    shell: 'sh',
    sql: 'sql',
    html: 'html',
    css: 'css',
    json: 'json',
    xml: 'xml',
    yaml: 'yml',
    markdown: 'md',
    protobuf: 'proto',
    proto: 'proto'
  }
  return extMap[lang.toLowerCase()] || 'txt'
}

/**
 * 进入全屏模式
 */
function enterFullscreen(wrapper: Element) {
  wrapper.classList.add('fullscreen')
  document.body.style.overflow = 'hidden'
  
  // 添加关闭按钮
  const closeBtn = document.createElement('button')
  closeBtn.className = 'code-fullscreen-close'
  closeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg>'
  closeBtn.onclick = () => exitFullscreen(wrapper)
  wrapper.appendChild(closeBtn)
  
  // ESC键退出全屏
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && wrapper.classList.contains('fullscreen')) {
      exitFullscreen(wrapper)
    }
  }
  document.addEventListener('keydown', handleEsc)
  wrapper.setAttribute('data-esc-handler', 'true')
}

/**
 * 退出全屏模式
 */
function exitFullscreen(wrapper: Element) {
  wrapper.classList.remove('fullscreen')
  document.body.style.overflow = ''
  
  // 移除关闭按钮
  const closeBtn = wrapper.querySelector('.code-fullscreen-close')
  if (closeBtn) {
    closeBtn.remove()
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

