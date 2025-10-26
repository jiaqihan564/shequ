import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
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
    })
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
      'highlight.js'
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
