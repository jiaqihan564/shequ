<template>
  <div class="page page-auth">
    <RegisterForm @success="onSuccess" @error="onError" @switch-to-login="goLogin" />
    <!-- 使用全局 ToastContainer 渲染，无需局部组件 -->
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

import RegisterForm from '@/components/auth/RegisterForm.vue'
import { toast } from '@/utils/ui/toast'

const router = useRouter()

function onSuccess() {
  toast.success('注册成功！')
  router.push('/login')
}

function onError(error: any) {
  toast.error(error?.message || '注册失败，请重试')
}

function goLogin() {
  router.push('/login')
}
</script>

<style scoped>
.page-auth {
  min-height: 100vh;
}
</style>
