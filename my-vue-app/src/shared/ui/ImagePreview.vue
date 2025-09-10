<template>
  <div v-if="show" class="preview-overlay" @click.self="$emit('close')" @keydown.esc="$emit('close')" tabindex="-1">
    <div class="preview-wrapper">
      <img v-if="src && !hasError" :src="src" alt="avatar-preview" class="preview-img" @error="onError" />
      <div v-else class="preview-fallback" :aria-label="fallbackLabel">{{ initialChar }}</div>
      <button class="close" @click="$emit('close')" aria-label="关闭">×</button>
    </div>
  </div>
  
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const props = defineProps<{ show: boolean; src: string | null; initial?: string }>()
defineEmits<{ (e: 'close'): void }>()

const hasError = ref(false)
watch(() => props.src, () => { hasError.value = false })

function onError() { hasError.value = true }

const initialChar = computed(() => (props.initial && props.initial.length > 0 ? props.initial.charAt(0).toUpperCase() : '?'))
const fallbackLabel = computed(() => `头像预览占位：${initialChar.value}`)
</script>

<style scoped>
.preview-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: grid; place-items: center; z-index: 1000; }
.preview-wrapper { position: relative; max-width: 90vw; max-height: 90vh; }
.preview-img { width: 100%; height: auto; max-height: 90vh; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
.preview-fallback { width: min(60vw, 360px); height: min(60vw, 360px); display: grid; place-items: center; background: #e5e7eb; color: #374151; border-radius: 50%; font-size: 96px; font-weight: 800; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
.close { position: absolute; top: -12px; right: -12px; width: 32px; height: 32px; border-radius: 50%; border: none; background: #fff; cursor: pointer; font-size: 18px; line-height: 1; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
.close:hover { background: #f3f4f6; }
</style>


