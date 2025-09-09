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

const router = useRouter()

const toast = ref({
  show: false,
  message: '',
  type: 'success' as NotificationType
})

function showToast(message: string, type: NotificationType) {
  toast.value = { show: true, message, type }
}

function onSuccess() {
  showToast('登录成功！', 'success')
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

