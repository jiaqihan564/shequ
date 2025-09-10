<template>
  <div class="page page-auth">
    <LoginForm 
      @success="onSuccess"
      @error="onError"
      @switch-to-register="goRegister"
    />
    <NotificationToast 
      :message="toast.message" 
      :type="toast.type" 
      :show="toast.show" 
      @close="toast.show = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { NotificationType } from '@/types'
import LoginForm from '@/features/auth/components/LoginForm.vue'
import NotificationToast from '@/shared/ui/NotificationToast.vue'
import { ensureRegionsLoaded } from '@/utils/regions'
import { detectCurrentRegion } from '@/utils/geo'

const router = useRouter()
// 移除 locked，避免残留锁定

const toast = ref({
  show: false,
  message: '',
  type: 'success' as NotificationType
})

function showToast(message: string, type: NotificationType) {
  toast.value = { show: true, message, type }
}

async function onSuccess() {
  showToast('登录成功！', 'success')
  // 后台并发，不阻塞跳转；定位采用 IP 兜底优先（更快），并强制简体
  ensureRegionsLoaded().catch(() => {})
  detectCurrentRegion(true, { timeoutMs: 3500, method: 'auto', provider: 'auto' }).catch(() => {})
  const redirect = (router.currentRoute.value.query.redirect as string) || '/home'
  router.push(redirect)
}

function onError(error: any) {
  showToast(error?.message || '登录失败，请重试', 'error')
}

function goRegister() {
  router.push('/register')
}
</script>

<style scoped>
.page-auth { min-height: 100vh; }
</style>

