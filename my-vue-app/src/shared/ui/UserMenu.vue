<template>
  <div v-if="show" class="user-menu" role="menu" @keydown.esc="$emit('close')">
    <div class="menu-header">
      <button class="avatar-btn" @click="openPreview">
        <img v-if="user?.avatar && showAvatar" :src="avatarSrc" alt="avatar" class="avatar" @error="onAvatarError" />
        <div v-else class="avatar-fallback" aria-label="avatar-fallback">{{ avatarInitial }}</div>
      </button>
      <div class="info">
        <div class="name" :title="displayName">{{ displayName }}</div>
        <div class="sub" v-if="user?.email" :title="user?.email">{{ user?.email }}</div>
      </div>
    </div>
    <div class="menu-list">
      <RouterLink to="/profile" class="menu-item" @click="$emit('close')">个人资料</RouterLink>
      <button class="menu-item danger" @click="$emit('logout')">退出登录</button>
    </div>
    <teleport to="body">
      <ImagePreview :show="previewOpen" :src="avatarSrc || null" :initial="avatarInitial" @close="previewOpen = false" />
    </teleport>
  </div>
  
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { User } from '@/types'
import ImagePreview from '@/shared/ui/ImagePreview.vue'

const props = defineProps<{ show: boolean; user: User | null }>()
defineEmits<{ (e: 'close'): void; (e: 'logout'): void }>()

const showAvatar = ref(true)
const previewOpen = ref(false)

const displayName = computed(() => props.user?.username || props.user?.email || '')
const avatarSrc = computed(() => {
  const u: any = props.user
  if (!u?.avatar) return ''
  const v = u.avatar_version || u.updatedAt || 0
  const sep = u.avatar.includes('?') ? '&' : '?'
  return `${u.avatar}${v ? `${sep}v=${v}` : ''}`
})
const avatarInitial = computed(() => (displayName.value ? displayName.value.charAt(0).toUpperCase() : '?'))

function onAvatarError() {
  showAvatar.value = false
}

function openPreview() {
  previewOpen.value = true
}
</script>

<style scoped>
.user-menu { position: absolute; right: 0; top: calc(100% + 12px); width: 260px; background: rgba(255,255,255,0.98); border: 1px solid #e5e7eb; border-radius: 14px; box-shadow: 0 12px 28px rgba(0,0,0,0.08); overflow: hidden; z-index: 50; backdrop-filter: saturate(140%) blur(8px); transform-origin: top right; animation: menuIn var(--transition-normal, 300ms ease-in-out); }
.user-menu::before { content: ''; position: absolute; top: -8px; right: 18px; width: 14px; height: 14px; background: inherit; border-left: 1px solid #e5e7eb; border-top: 1px solid #e5e7eb; transform: rotate(45deg); box-shadow: -2px -2px 6px rgba(0,0,0,0.03); }
.menu-header { display: grid; grid-template-columns: auto 1fr; align-items: center; column-gap: 10px; row-gap: 2px; padding: 14px 12px; border-bottom: 1px solid #f3f4f6; }
.avatar-btn { padding: 0; border: none; background: transparent; cursor: pointer; display: grid; place-items: center; }
.avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid #e5e7eb; }
.avatar-fallback { width: 38px; height: 38px; border-radius: 50%; background: #e5e7eb; color: #374151; display: flex; align-items: center; justify-content: center; font-weight: 700; }
.info { display: flex; flex-direction: column; min-width: 0; align-self: center; }
.name { font-weight: 800; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }
.sub { font-size: 12px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
.menu-list { padding: 6px; display: flex; flex-direction: column; }
.menu-item { text-align: left; padding: 9px 12px; border-radius: 10px; border: none; background: transparent; cursor: pointer; color: #1f2937; }
.menu-item:hover { background: #f3f4f6; }
.menu-item.danger { color: #b91c1c; }
.menu-item.danger:hover { background: #fee2e2; }
@keyframes menuIn { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
</style>


