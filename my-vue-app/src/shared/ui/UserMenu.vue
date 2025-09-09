<template>
  <div v-if="show" class="user-menu" role="menu" @keydown.esc="$emit('close')">
    <div class="menu-header">
      <button class="avatar-btn" @click="openPreview" :disabled="!user?.avatar">
        <img v-if="user?.avatar" :src="user.avatar" alt="avatar" class="avatar" @error="onAvatarError" />
        <div v-else class="avatar-fallback">{{ avatarInitial }}</div>
      </button>
      <div class="info">
        <div class="name" :title="displayName">{{ displayName }}</div>
        <div class="sub" v-if="user?.email" :title="user?.email">{{ user?.email }}</div>
      </div>
    </div>
    <div class="menu-list">
      <button class="menu-item danger" @click="$emit('logout')">退出登录</button>
    </div>
    <ImagePreview :show="previewOpen" :src="user?.avatar || null" @close="previewOpen = false" />
  </div>
  
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { User } from '@/types'
import ImagePreview from '@/shared/ui/ImagePreview.vue'

const props = defineProps<{ show: boolean; user: User | null }>()
defineEmits<{ (e: 'close'): void; (e: 'logout'): void }>()

const showAvatar = ref(true)
const previewOpen = ref(false)

const displayName = computed(() => props.user?.username || props.user?.email || '')
const avatarInitial = computed(() => (displayName.value ? displayName.value.charAt(0).toUpperCase() : '?'))

function onAvatarError() {
  showAvatar.value = false
}

function openPreview() {
  if (!props.user?.avatar) return
  previewOpen.value = true
}
</script>

<style scoped>
.user-menu { position: absolute; right: 0; top: calc(100% + 8px); width: 240px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); overflow: hidden; z-index: 50; }
.menu-header { display: flex; align-items: center; gap: 10px; padding: 12px; border-bottom: 1px solid #f3f4f6; }
.avatar-btn { padding: 0; border: none; background: transparent; cursor: pointer; display: grid; place-items: center; }
.avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 1px solid #e5e7eb; }
.avatar-fallback { width: 36px; height: 36px; border-radius: 50%; background: #e5e7eb; color: #374151; display: flex; align-items: center; justify-content: center; font-weight: 700; }
.info { display: flex; flex-direction: column; min-width: 0; }
.name { font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sub { font-size: 12px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.menu-list { padding: 6px; display: flex; flex-direction: column; }
.menu-item { text-align: left; padding: 8px 10px; border-radius: 8px; border: none; background: transparent; cursor: pointer; color: #374151; }
.menu-item:hover { background: #f3f4f6; }
.menu-item.danger { color: #b91c1c; }
.menu-item.danger:hover { background: #fee2e2; }
</style>


