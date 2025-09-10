<template>
  <div class="page page-auth">
    <LoginForm 
      @success="onSuccess"
      @error="onError"
      @switch-to-register="goRegister"
    />
    <!-- 使用全局 ToastContainer 渲染，无需局部组件 -->
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import LoginForm from '@/features/auth/components/LoginForm.vue'
import { ensureRegionsLoaded } from '@/utils/regions'
import { detectCurrentRegion } from '@/utils/geo'
import { toast } from '@/utils/toast'

const router = useRouter()
// 移除 locked，避免残留锁定

async function onSuccess() {
  toast.success('登录成功！')
  // 后台并发，不阻塞跳转；定位采用 IP 兜底优先（更快），并强制简体
  ensureRegionsLoaded().catch(() => {})
  detectCurrentRegion(true, { timeoutMs: 3500, method: 'auto', provider: 'auto' }).catch(() => {})
  const redirect = (router.currentRoute.value.query.redirect as string) || '/home'
  router.push(redirect)
}

function onError(error: any) {
  toast.error(error?.message || '登录失败，请重试')
}

function goRegister() {
  router.push('/register')
}
</script>

<style scoped>
.page-auth { min-height: 100vh; }
</style>

