<template>
  <Transition name="toast">
    <div 
      v-if="isVisible" 
      class="notification-toast"
      :class="[`toast-${type}`, `toast-${position}`]"
      role="alert"
      :aria-live="type === 'error' ? 'assertive' : 'polite'"
    >
      <div class="toast-content">
        <div class="toast-icon">
          <CheckIcon v-if="type === 'success'" />
          <ErrorIcon v-else-if="type === 'error'" />
          <WarningIcon v-else-if="type === 'warning'" />
          <InfoIcon v-else />
        </div>
        <span class="toast-message">{{ message }}</span>
        <button 
          v-if="closable"
          class="toast-close"
          @click="handleClose"
          aria-label="关闭通知"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { NotificationProps } from '@/types'
import CheckIcon from '@/components/icons/CheckIcon.vue'
import ErrorIcon from '@/components/icons/ErrorIcon.vue'
import WarningIcon from '@/components/icons/WarningIcon.vue'
import InfoIcon from '@/components/icons/InfoIcon.vue'
import CloseIcon from '@/components/icons/CloseIcon.vue'

interface Props extends NotificationProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
}

interface Emits {
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  duration: 3000,
  closable: true,
  position: 'top-right'
})

const emit = defineEmits<Emits>()

const isVisible = ref(props.show)
let timeoutId: number | null = null

const startAutoClose = () => {
  if (props.duration > 0) {
    timeoutId = setTimeout(() => {
      handleClose()
    }, props.duration)
  }
}

const handleClose = () => {
  isVisible.value = false
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
  emit('close')
}

onMounted(() => {
  if (props.show) {
    startAutoClose()
  }
})

watch(() => props.show, (newValue) => {
  isVisible.value = newValue
  if (newValue) {
    startAutoClose()
  } else {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }
})
</script>

<style scoped>
.notification-toast {
  position: fixed;
  min-width: 300px;
  max-width: 500px;
  padding: var(--spacing-4) var(--spacing-5);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-toast);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* 位置样式 */
.toast-top-right {
  top: var(--spacing-5);
  right: var(--spacing-5);
}

.toast-top-left {
  top: var(--spacing-5);
  left: var(--spacing-5);
}

.toast-bottom-right {
  bottom: var(--spacing-5);
  right: var(--spacing-5);
}

.toast-bottom-left {
  bottom: var(--spacing-5);
  left: var(--spacing-5);
}

.toast-top-center {
  top: var(--spacing-5);
  left: 50%;
  transform: translateX(-50%);
}

.toast-bottom-center {
  bottom: var(--spacing-5);
  left: 50%;
  transform: translateX(-50%);
}

.toast-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.toast-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

.toast-message {
  flex: 1;
  font-size: var(--font-size-sm);
  font-weight: 500;
  line-height: 1.4;
}

.toast-close {
  flex-shrink: 0;
  background: none;
  border: none;
  padding: var(--spacing-1);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background-color var(--transition-normal);
  color: inherit;
  opacity: 0.8;
}

.toast-close:hover {
  background-color: rgba(0, 0, 0, 0.1);
  opacity: 1;
}

/* 不同类型的样式 */
.toast-success {
  background: rgba(34, 197, 94, 0.95);
  color: white;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.toast-error {
  background: rgba(239, 68, 68, 0.95);
  color: white;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.toast-warning {
  background: rgba(245, 158, 11, 0.95);
  color: white;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.toast-info {
  background: rgba(59, 130, 246, 0.95);
  color: white;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

/* 动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all var(--transition-slow);
}

.toast-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .notification-toast {
    min-width: auto;
    max-width: calc(100vw - var(--spacing-4));
  }
  
  .toast-top-right,
  .toast-top-left {
    top: var(--spacing-2);
    left: var(--spacing-2);
    right: var(--spacing-2);
  }
  
  .toast-bottom-right,
  .toast-bottom-left {
    bottom: var(--spacing-2);
    left: var(--spacing-2);
    right: var(--spacing-2);
  }
  
  .toast-top-center,
  .toast-bottom-center {
    left: var(--spacing-2);
    right: var(--spacing-2);
    transform: none;
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    transition: opacity 0.1s ease;
  }
  
  .toast-enter-from,
  .toast-leave-to {
    transform: none;
  }
}
</style>
