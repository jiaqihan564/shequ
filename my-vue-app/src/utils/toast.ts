export type ToastType = 'success' | 'error' | 'warning' | 'info'
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'

export interface ToastItem {
  id: string
  type: ToastType
  message: string
  duration: number
  closable: boolean
}

type Subscriber = (items: ToastItem[]) => void

const subscribers = new Set<Subscriber>()
let queue: ToastItem[] = []
const timers = new Map<string, number>()

function getMaxVisible(): number {
  try {
    const w = window.innerWidth
    const h = window.innerHeight
    if (w <= 480 || h <= 640) return 3
    return 5
  } catch {
    return 5
  }
}

function notify() {
  for (const cb of subscribers) cb(queue)
}

export function subscribe(cb: Subscriber) {
  subscribers.add(cb)
  cb(queue)
  return () => subscribers.delete(cb)
}

export function remove(id: string) {
  const t = timers.get(id)
  if (t) {
    clearTimeout(t)
    timers.delete(id)
  }
  queue = queue.filter(t => t.id !== id)
  notify()
}

export interface ToastOptions {
  message: string
  type?: ToastType
  duration?: number
  closable?: boolean
}

export function push(options: ToastOptions) {
  const item: ToastItem = {
    id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: (options.type || 'info') as ToastType,
    message: options.message,
    duration: options.duration ?? 3000,
    closable: options.closable ?? true
  }
  // 若超过可见上限，移除最早的一条（顶部最旧）
  if (queue.length >= getMaxVisible()) {
    const oldest = queue[0]
    if (oldest) remove(oldest.id)
  }
  queue = [...queue, item]
  notify()
  if (item.duration > 0) {
    const tid = setTimeout(() => remove(item.id), item.duration) as unknown as number
    timers.set(item.id, tid)
  }
  return item.id
}

export const toast = {
  push,
  remove,
  info(message: string, duration = 3000) { return push({ type: 'info', message, duration }) },
  success(message: string, duration = 3000) { return push({ type: 'success', message, duration }) },
  warning(message: string, duration = 3000) { return push({ type: 'warning', message, duration }) },
  error(message: string, duration = 3000) { return push({ type: 'error', message, duration }) }
}

export default toast


