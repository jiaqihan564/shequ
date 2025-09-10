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
                <img v-if="showAvatar && user.avatar" :src="user.avatar" alt="avatar" class="avatar" @error="onAvatarError" />
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
})

async function onLogout() {
  await logout()
  router.push('/login')
}

function onAvatarError() {
  showAvatar.value = false
}

const displayName = computed(() => user.value?.username || user.value?.email || '')
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
.layout { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
.sidebar { border-right: 1px solid #e5e7eb; background: #fff; }
.nav { display: flex; flex-direction: column; padding: 16px; gap: 8px; }
.nav-item { text-decoration: none; color: #374151; padding: 8px 10px; border-radius: 6px; }
.nav-item.active, .nav-item:hover { background: #f3f4f6; }
.main { display: grid; grid-template-rows: auto 1fr; }
.header { height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; border-bottom: 1px solid #e5e7eb; background: #fff; }
.app-name { font-size: 16px; font-weight: 700; }
.header-right { display: flex; align-items: center; gap: 10px; }
.user-wrapper { position: relative; }
.user-info { display: flex; align-items: center; gap: 8px; padding: 4px 8px; border: 1px solid #e5e7eb; border-radius: 9999px; background: #fff; cursor: pointer; }
.user-info:hover { background: #f9fafb; }
.avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1px solid #e5e7eb; }
.avatar-fallback { width: 28px; height: 28px; border-radius: 50%; background: #e5e7eb; color: #374151; display: flex; align-items: center; justify-content: center; font-weight: 600; }
.user-name { color: #374151; max-width: 160px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.logout { padding: 6px 10px; border: 1px solid #e5e7eb; background: #fff; border-radius: 8px; cursor: pointer; }
.logout:hover { background: #f3f4f6; }
@media (max-width: 480px) { .user-name { display: none; } }
.logout { padding: 6px 10px; border: 1px solid #e5e7eb; background: #fff; border-radius: 6px; cursor: pointer; }
.content { padding: 16px; background: #fafafa; }
</style>


