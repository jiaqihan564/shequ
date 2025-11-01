import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { networkInterfaces } from 'os'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      script: {
        defineModel: true,
        propsDestructure: true
      }
    }),
    // 自动导入 Vue API
    AutoImport({
      imports: [
        'vue',
        'vue-router',
        '@vueuse/core',
        '@vueuse/head'
      ],
      resolvers: [ElementPlusResolver()],
      dts: true,
      eslintrc: {
        enabled: true
      }
    }),
    // 自动导入组件
    Components({
      dts: true,
      dirs: ['src/components'],
      extensions: ['vue'],
      deep: true,
      resolvers: [ElementPlusResolver()]
    }),
    // 自定义插件：过滤显示的网络地址
    {
      name: 'filter-network-urls',
      configureServer(server) {
        // 保存原始的 printUrls 方法
        const originalPrintUrls = server.printUrls
        
        // 重写 printUrls 方法
        server.printUrls = () => {
          const { info } = server.config.logger
          const protocol = server.config.server.https ? 'https' : 'http'
          const port = server.config.server.port || 3000
          const base = server.config.base === './' ? '/' : server.config.base
          
          // 获取网络接口并过滤
          const interfaces = networkInterfaces()
          const validIps = []
          
          for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
              // 只处理 IPv4 地址
              if (iface.family === 'IPv4' && !iface.internal) {
                const ip = iface.address
                // 过滤掉链路本地地址（169.254.x.x）
                if (!ip.startsWith('169.254.')) {
                  validIps.push(ip)
                }
              }
            }
          }
          
          // 打印 Local 地址
          info(`  ➜ Local:   ${protocol}://localhost:${port}${base}`)
          
          // 打印第一个有效的网络地址
          if (validIps.length > 0) {
            // 优先选择私有网段地址
            const privateIp = validIps.find(ip => 
              ip.startsWith('10.') || 
              ip.startsWith('192.168.') || 
              /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)
            ) || validIps[0]
            
            info(`  ➜ Network: ${protocol}://${privateIp}:${port}${base}`)
          }
        }
      }
    }
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@features': resolve(__dirname, 'src/features'),
      '@views': resolve(__dirname, 'src/views'),
      '@stores': resolve(__dirname, 'src/stores'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@assets': resolve(__dirname, 'src/assets'),
      '@types': resolve(__dirname, 'src/types')
    }
  },
  server: {
    port: 3000,
    open: true,
    cors: true,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        ws: true, // 启用 WebSocket 代理支持
        rewrite: (path) => path
      },
      // 开发环境：将 /news 代理到本地 8787（Cloudflare Workers 开发端口）
      '/news': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        secure: false,
        rewrite: path => path.replace(/^\/news/, '')
      }
    }
  },
  build: {
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2 // 优化：多次压缩以获得更好的结果
      },
      mangle: {
        safari10: true // 兼容Safari 10
      }
    },
    // 优化：提高chunk大小警告阈值
    chunkSizeWarningLimit: 1000,
    // 优化：启用CSS代码拆分
    cssCodeSplit: true,
    // 优化：资源内联阈值（小于4KB的资源内联为base64）
    assetsInlineLimit: 4096,
    // 优化：启用模块预加载
    modulePreload: {
      polyfill: true
    },
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        // 优化：手动配置chunk分割策略
        manualChunks(id) {
          // Vue 核心库
          if (id.includes('node_modules/vue/') || id.includes('node_modules/@vue/')) {
            return 'vue-core'
          }
          
          // Vue Router
          if (id.includes('node_modules/vue-router/')) {
            return 'vue-router'
          }
          
          // Pinia 状态管理
          if (id.includes('node_modules/pinia/')) {
            return 'pinia'
          }
          
          // Element Plus UI库
          if (id.includes('node_modules/element-plus/')) {
            return 'element-plus'
          }
          
          // Element Plus 图标
          if (id.includes('node_modules/@element-plus/icons-vue/')) {
            return 'element-icons'
          }
          
          // VueUse 工具库
          if (id.includes('node_modules/@vueuse/')) {
            return 'vueuse'
          }
          
          // Axios 和网络请求相关
          if (id.includes('node_modules/axios/')) {
            return 'axios'
          }
          
          // ECharts 图表库（大文件，单独拆分）
          if (id.includes('node_modules/echarts/')) {
            return 'echarts'
          }
          
          // Markdown 相关
          if (id.includes('node_modules/markdown-it/')) {
            return 'markdown'
          }
          
          // Highlight.js 代码高亮
          if (id.includes('node_modules/highlight.js/')) {
            return 'highlight'
          }
          
          // Monaco Editor 编辑器（超大文件，单独拆分且优先级最低）
          if (id.includes('node_modules/monaco-editor/')) {
            return 'monaco-editor'
          }
          
          // 其他 node_modules 统一打包
          if (id.includes('node_modules/')) {
            return 'vendor-misc'
          }
          
          // 工具函数单独打包
          if (id.includes('/src/utils/')) {
            return 'utils'
          }
          
          // 视图组件按模块拆分
          if (id.includes('/src/views/article/')) {
            return 'views-article'
          }
          if (id.includes('/src/views/chat/')) {
            return 'views-chat'
          }
          if (id.includes('/src/views/message/')) {
            return 'views-message'
          }
          if (id.includes('/src/views/resource/')) {
            return 'views-resource'
          }
          if (id.includes('/src/views/statistics/') || id.includes('/src/views/stats/')) {
            return 'views-stats'
          }
          if (id.includes('/src/views/history/')) {
            return 'views-history'
          }
          if (id.includes('/src/views/code/')) {
            return 'views-code'
          }
        },
        // 优化：配置最小chunk大小，避免产生过多小文件
        experimentalMinChunkSize: 20000 // 20KB
      }
    }
  },
  css: {
    devSourcemap: true
  },
  optimizeDeps: {
    include: [
      'vue', 
      'vue-router', 
      'pinia', 
      'axios', 
      '@vueuse/core',
      'element-plus',
      'markdown-it',
      'highlight.js',
      // Element Plus 组件样式预构建（避免频繁重载）
      'element-plus/es',
      'element-plus/es/components/base/style/css',
      'element-plus/es/components/badge/style/css',
      'element-plus/es/components/message/style/css',
      'element-plus/es/components/avatar/style/css',
      'element-plus/es/components/empty/style/css',
      'element-plus/es/components/text/style/css',
      'element-plus/es/components/skeleton/style/css',
      'element-plus/es/components/card/style/css',
      'element-plus/es/components/button/style/css',
      'element-plus/es/components/icon/style/css',
      'element-plus/es/components/pagination/style/css',
      'element-plus/es/components/divider/style/css',
      'element-plus/es/components/tag/style/css',
      'element-plus/es/components/input/style/css',
      'element-plus/es/components/form-item/style/css',
      'element-plus/es/components/form/style/css',
      'element-plus/es/components/select/style/css',
      'element-plus/es/components/option/style/css',
      'element-plus/es/components/row/style/css',
      'element-plus/es/components/col/style/css',
      'element-plus/es/components/image/style/css',
      'element-plus/es/components/check-tag/style/css',
      'element-plus/es/components/dialog/style/css',
      'element-plus/es/components/upload/style/css',
      'element-plus/es/components/dropdown/style/css',
      'element-plus/es/components/menu/style/css',
      'element-plus/es/components/tabs/style/css',
      'element-plus/es/components/tooltip/style/css',
      'element-plus/es/components/popover/style/css',
      'element-plus/es/components/loading/style/css',
      'element-plus/es/components/notification/style/css',
      'element-plus/es/components/drawer/style/css',
      'element-plus/es/components/timeline/style/css',
      'element-plus/es/components/table/style/css'
    ],
    // 优化：排除不需要预构建的包
    exclude: ['monaco-editor']
  },
  // 优化：启用Gzip压缩构建（需要后端支持）
  esbuild: {
    // 移除生产环境的console和debugger
    drop: ['console', 'debugger']
  }
})
