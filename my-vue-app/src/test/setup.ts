import { config } from '@vue/test-utils'
import { vi } from 'vitest'

// 全局测试配置
config.global.mocks = {
  $t: (key: string) => key
}

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn()
  },
  writable: true
})

// Mock console methods in tests
;(globalThis as any).console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn()
}
