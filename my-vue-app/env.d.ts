/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_DESCRIPTION: string
  readonly VITE_NEWS_PROVIDER?: 'mock' | 'gnews'
  readonly VITE_NEWS_PROXY_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
