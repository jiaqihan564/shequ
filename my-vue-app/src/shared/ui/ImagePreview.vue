<template>
  <div v-if="show" class="preview-overlay" @click.self="$emit('close')" @keydown.esc="$emit('close')" tabindex="-1">
    <div class="preview-wrapper">
      <img :src="src" alt="preview" class="preview-img" />
      <button class="close" @click="$emit('close')" aria-label="关闭">×</button>
    </div>
  </div>
  
</template>

<script setup lang="ts">
const props = defineProps<{ show: boolean; src: string | null }>()
defineEmits<{ (e: 'close'): void }>()
</script>

<style scoped>
.preview-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: grid; place-items: center; z-index: 100; }
.preview-wrapper { position: relative; max-width: 90vw; max-height: 90vh; }
.preview-img { width: 100%; height: auto; max-height: 90vh; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
.close { position: absolute; top: -12px; right: -12px; width: 32px; height: 32px; border-radius: 50%; border: none; background: #fff; cursor: pointer; font-size: 18px; line-height: 1; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
.close:hover { background: #f3f4f6; }
</style>


