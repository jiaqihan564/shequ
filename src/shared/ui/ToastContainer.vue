<template>
  <div class="toast-container" :class="`pos-${position}`">
    <TransitionGroup name="toast-list" tag="div">
      <div
        v-for="(item, i) in items"
        :key="item.id"
        class="notification-toast"
        :class="[`toast-${item.type}`]"
        :style="{ '--delay': `${(items.length - 1 - i) * 40}ms` }"
        role="alert"
        :aria-live="item.type === 'error' ? 'assertive' : 'polite'"
      >
        <div class="toast-content">
          <div class="toast-icon">
            <CheckIcon v-if="item.type === 'success'" />
            <ErrorIcon v-else-if="item.type === 'error'" />
            <WarningIcon v-else-if="item.type === 'warning'" />
            <InfoIcon v-else />
          </div>
          <span class="toast-message">{{ item.message }}</span>
          <button class="toast-close" aria-label="关闭通知" @click="remove(item.id)">
            <CloseIcon />
          </button>
        </div>
        <div
          v-if="item.duration > 0"
          class="toast-progress"
          :style="{ animationDuration: `${item.duration}ms` }"
        />
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

import CheckIcon from '@/components/icons/CheckIcon.vue'
import CloseIcon from '@/components/icons/CloseIcon.vue'
import ErrorIcon from '@/components/icons/ErrorIcon.vue'
import InfoIcon from '@/components/icons/InfoIcon.vue'
import WarningIcon from '@/components/icons/WarningIcon.vue'
import { subscribe, remove, type ToastItem } from '@/utils/ui/toast'

withDefaults(
  defineProps<{
    position?:
      | 'top-right'
      | 'top-left'
      | 'bottom-right'
      | 'bottom-left'
      | 'top-center'
      | 'bottom-center'
  }>(),
  {
    position: 'top-right'
  }
)

const items = ref<ToastItem[]>([])

let unsubscribe: (() => void) | null = null
onMounted(() => {
  unsubscribe = subscribe(list => {
    items.value = list
  })
})
onBeforeUnmount(() => {
  unsubscribe?.()
})
</script>

<style scoped>
.toast-container {
  position: fixed;
  pointer-events: none;
  z-index: var(--z-toast, 1200);
  max-height: calc(100vh - var(--app-header-height, 64px) - 40px);
  overflow: hidden;
}
.toast-container > div {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}
.pos-top-right {
  top: calc(var(--app-header-height, 64px) + var(--spacing-3) + env(safe-area-inset-top, 0px));
  right: var(--spacing-5);
}
.pos-top-left {
  top: calc(var(--app-header-height, 64px) + var(--spacing-3) + env(safe-area-inset-top, 0px));
  left: var(--spacing-5);
}
.pos-bottom-right {
  bottom: var(--spacing-5);
  right: var(--spacing-5);
}
.pos-bottom-left {
  bottom: var(--spacing-5);
  left: var(--spacing-5);
}
.pos-top-center {
  top: calc(var(--app-header-height, 64px) + var(--spacing-3) + env(safe-area-inset-top, 0px));
  left: 50%;
  transform: translateX(-50%);
}
.pos-bottom-center {
  bottom: var(--spacing-5);
  left: 50%;
  transform: translateX(-50%);
}

.notification-toast {
  pointer-events: auto;
  min-width: 300px;
  max-width: 520px;
  padding: var(--spacing-4) var(--spacing-5);
  border-radius: 14px;
  box-shadow: 0 12px 30px rgba(17, 24, 39, 0.15);
  backdrop-filter: blur(10px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.18);
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
  color: inherit;
  opacity: 0.8;
}
.toast-close:hover {
  opacity: 1;
  background-color: rgba(0, 0, 0, 0.08);
}

.toast-success {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.96), rgba(34, 197, 94, 0.96));
  color: #fff;
  border: 1px solid rgba(16, 185, 129, 0.35);
}
.toast-error {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.96), rgba(220, 38, 38, 0.96));
  color: #fff;
  border: 1px solid rgba(239, 68, 68, 0.35);
}
.toast-warning {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.96), rgba(251, 191, 36, 0.96));
  color: #fff;
  border: 1px solid rgba(245, 158, 11, 0.35);
}
.toast-info {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.96), rgba(96, 165, 250, 0.96));
  color: #fff;
  border: 1px solid rgba(59, 130, 246, 0.35);
}

.toast-list-enter-active,
.toast-list-leave-active {
  transition: all var(--transition-normal);
}
.toast-list-enter-active {
  transition-delay: var(--delay, 0ms);
}
.toast-list-leave-active {
  transition-delay: 0ms !important;
}
.toast-list-enter-from {
  transform: translateY(8px);
  opacity: 0;
}
.toast-list-leave-to {
  transform: translateY(-8px);
  opacity: 0;
}

.toast-progress {
  height: 3px;
  margin-top: 8px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.25);
  overflow: hidden;
}
.toast-progress::after {
  content: '';
  display: block;
  height: 100%;
  width: 100%;
  background: rgba(255, 255, 255, 0.85);
  transform-origin: left;
  animation-name: toastCountdown;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
@keyframes toastCountdown {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

@media (max-width: 480px) {
  .notification-toast {
    min-width: auto;
    max-width: calc(100vw - var(--spacing-4));
  }
}
</style>
