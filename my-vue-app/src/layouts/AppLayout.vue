<template>
  <div class="layout">
    <aside class="sidebar">
      <slot name="sidebar">
        <nav class="nav">
          <RouterLink to="/home" class="nav-item" active-class="active">首页</RouterLink>
          <RouterLink to="/profile" class="nav-item" active-class="active">个人资料</RouterLink>
        </nav>
      </slot>
    </aside>
    <div class="main">
      <header class="header">
        <slot name="header">
          <div class="header-left">
            <h1 class="app-name">技术交流社区</h1>
          </div>
          <div class="header-right">
            <div v-if="user" class="user-wrapper" ref="anchorEl">
              <button class="user-info" :title="displayName" @click="toggleMenu" aria-haspopup="menu" :aria-expanded="menuOpen ? 'true' : 'false'">
                <img v-if="showAvatar && user.avatar" :src="avatarSrc" alt="avatar" class="avatar" @error="onAvatarError" />
                <div v-else class="avatar-fallback">{{ avatarInitial }}</div>
                <span class="user-name">{{ displayName }}</span>
              </button>
              <UserMenu :show="menuOpen" :user="user" @close="menuOpen = false" @logout="onLogout" />
            </div>
          </div>
        </slot>
      </header>
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>

</template>

<script setup lang="ts">
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { logout } from '@/utils/api'
import type { User } from '@/types'
import UserMenu from '@/shared/ui/UserMenu.vue'

const router = useRouter()
const user = ref<User | null>(null)
const showAvatar = ref(true)
const menuOpen = ref(false)
const anchorEl = ref<HTMLElement | null>(null)

onMounted(() => {
  try {
    const raw = localStorage.getItem('user_info') || sessionStorage.getItem('user_info')
    if (raw) user.value = JSON.parse(raw)
  } catch {}
  // 监听用户更新事件（登录、更新资料、更新头像后触发）
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail as User
    if (detail) {
      user.value = detail
      showAvatar.value = true
    }
  }
  window.addEventListener('user:updated', handler as EventListener)
  onBeforeUnmount(() => window.removeEventListener('user:updated', handler as EventListener))
})

async function onLogout() {
  await logout()
  router.push('/login')
}

function onAvatarError() {
  showAvatar.value = false
}

const displayName = computed(() => user.value?.username || user.value?.email || '')
const avatarSrc = computed(() => {
  const u = user.value as any
  if (!u?.avatar) return ''
  const v = u.avatar_version || u.updatedAt || 0
  const sep = u.avatar.includes('?') ? '&' : '?'
  return `${u.avatar}${v ? `${sep}v=${v}` : ''}`
})
const avatarInitial = computed(() => (displayName.value ? displayName.value.charAt(0).toUpperCase() : '?'))

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function handleClickOutside(event: MouseEvent) {
  if (!menuOpen.value) return
  const target = event.target as Node
  if (anchorEl.value && !anchorEl.value.contains(target)) {
    menuOpen.value = false
  }
}

document.addEventListener('click', handleClickOutside)
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))
</script>

<style scoped>
.layout { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; background: linear-gradient(180deg, var(--color-gray-50), #f7f9fc); }
.sidebar { position: sticky; top: 0; align-self: start; height: 100vh; border-right: 1px solid #e5e7eb; background: rgba(255,255,255,0.9); backdrop-filter: saturate(140%) blur(8px); }
.nav { display: flex; flex-direction: column; padding: 16px; gap: 6px; }
.nav-item { position: relative; text-decoration: none; color: #374151; padding: 10px 12px; border-radius: 10px; transition: all var(--transition-normal, 300ms ease-in-out); }
.nav-item::before { content: ''; position: absolute; left: 6px; top: 50%; transform: translateY(-50%); width: 4px; height: 0; border-radius: 2px; background: linear-gradient(180deg, var(--color-primary), var(--color-primary-dark)); transition: height var(--transition-normal, 300ms ease-in-out); }
.nav-item:hover { background: #f3f4f6; }
.nav-item.active { background: #eef2ff; color: #4338ca; }
.nav-item.active::before { height: 60%; }
.main { display: grid; grid-template-rows: auto 1fr; }
.header { position: sticky; top: 0; z-index: 40; height: 64px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; border-bottom: 1px solid rgba(229,231,235,0.7); background: rgba(255,255,255,0.7); backdrop-filter: saturate(140%) blur(10px); }
.app-name { font-size: 18px; font-weight: 800; background: linear-gradient(90deg, var(--color-primary), var(--color-primary-dark)); -webkit-background-clip: text; background-clip: text; color: transparent; letter-spacing: 0.3px; }
.header-right { display: flex; align-items: center; gap: 10px; }
.user-wrapper { position: relative; }
.user-info { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 9999px; background: #fff; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
.user-info:hover { border-color: #d1d5db; background: #f9fafb; }
.avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1px solid #e5e7eb; }
.avatar-fallback { width: 28px; height: 28px; border-radius: 50%; background: #e5e7eb; color: #374151; display: flex; align-items: center; justify-content: center; font-weight: 600; }
.user-name { color: #374151; max-width: 160px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.logout { padding: 6px 10px; border: 1px solid #e5e7eb; background: #fff; border-radius: 8px; cursor: pointer; }
.logout:hover { background: #f3f4f6; }
@media (max-width: 480px) { .user-name { display: none; } }
.logout { padding: 6px 10px; border: 1px solid #e5e7eb; background: #fff; border-radius: 6px; cursor: pointer; }
.content { padding: 24px; }
.content > :deep(.container) { max-width: 1080px; margin: 0 auto; }
</style>


