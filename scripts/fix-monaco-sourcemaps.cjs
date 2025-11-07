#!/usr/bin/env node

/**
 * 修复 monaco-editor 缺失的 source map 文件
 *
 * monaco-editor 的某些第三方依赖（marked 和 dompurify）的 JS 文件
 * 引用了不存在的 source map 文件，导致 Vite 开发服务器警告。
 *
 * 此脚本会创建这些缺失的 source map 文件的占位符。
 */

const fs = require('fs')
const path = require('path')

const sourcemaps = [
  {
    path: 'node_modules/monaco-editor/esm/vs/base/common/marked/marked.esm.js.map',
    sourceFile: 'marked.js'
  },
  {
    path: 'node_modules/monaco-editor/esm/vs/base/browser/dompurify/purify.es.mjs.map',
    sourceFile: 'dompurify.js'
  }
]

function createSourceMap(filePath, sourceFile) {
  const dir = path.dirname(filePath)

  // 确保目录存在
  if (!fs.existsSync(dir)) {
    console.log(`⚠️  目录不存在，跳过: ${dir}`)
    return false
  }

  // 检查文件是否已存在
  if (fs.existsSync(filePath)) {
    console.log(`✓ Source map 已存在: ${filePath}`)
    return true
  }

  // 创建基本的 source map
  const sourceMap = {
    version: 3,
    sources: [sourceFile],
    names: [],
    mappings: '',
    file: sourceFile
  }

  try {
    fs.writeFileSync(filePath, JSON.stringify(sourceMap, null, 2))
    console.log(`✓ 已创建 source map: ${filePath}`)
    return true
  } catch (error) {
    console.error(`✗ 创建失败: ${filePath}`, error.message)
    return false
  }
}

console.log('🔧 正在修复 monaco-editor source map 文件...\n')

let successCount = 0
sourcemaps.forEach(({ path: filePath, sourceFile }) => {
  if (createSourceMap(filePath, sourceFile)) {
    successCount++
  }
})

console.log(`\n✅ 完成！成功创建 ${successCount}/${sourcemaps.length} 个 source map 文件`)

if (successCount === sourcemaps.length) {
  console.log('🎉 所有 source map 文件已就绪，Vite 警告应该会消失')
} else {
  console.log('⚠️  某些文件创建失败，请检查错误信息')
  process.exit(1)
}
