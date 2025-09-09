<template>
  <div class="page page-auth">
    <RegisterForm 
      @success="onSuccess"
      @error="onError"
      @switch-to-login="goLogin"
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
import RegisterForm from '@/features/auth/components/RegisterForm.vue'
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
  showToast('注册成功！', 'success')
  router.push('/login')
}

function onError(error: any) {
  showToast(error?.message || '注册失败，请重试', 'error')
}

function goLogin() {
  router.push('/login')
}
</script>

<style scoped>
.page-auth { min-height: 100vh; }
</style>

