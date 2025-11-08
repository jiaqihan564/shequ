<template>
  <div
    class="loading-spinner"
    :class="[`spinner-${size}`, { 'spinner-inline': inline }]"
    :aria-label="ariaLabel"
    role="status"
  >
    <div class="spinner" :class="`spinner-${size}`"></div>
    <span v-if="text" class="spinner-text">{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  size?: 'small' | 'medium' | 'large'
  color?: string
  text?: string
  inline?: boolean
  ariaLabel?: string
}

withDefaults(defineProps<Props>(), {
  size: 'medium',
  color: 'currentColor',
  text: '',
  inline: false,
  ariaLabel: '加载中'
})
</script>

<style scoped>
.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
}

.loading-spinner.spinner-inline {
  display: inline-flex;
}

.spinner {
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner-small {
  width: 12px;
  height: 12px;
  border-width: 1.5px;
}

.spinner-medium {
  width: 16px;
  height: 16px;
  border-width: 2px;
}

.spinner-large {
  width: 24px;
  height: 24px;
  border-width: 3px;
}

.spinner-text {
  font-size: var(--font-size-sm);
  color: currentColor;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}
</style>
