<script setup lang="ts">
import { ref } from 'vue'
import LoginForm from '@/components/LoginForm.vue'
import RegisterForm from '@/components/RegisterForm.vue'
import NotificationToast from '@/components/ui/NotificationToast.vue'
import type { NotificationType } from '@/types'

// 当前显示的表单类型
const currentForm = ref<'login' | 'register'>('login')

// 通知状态
const notification = ref({
  show: false,
  message: '',
  type: 'success' as NotificationType
})

// 显示通知
const showNotification = (message: string, type: NotificationType) => {
  notification.value = {
    show: true,
    message,
    type
  }
  
  // 3秒后自动隐藏
  setTimeout(() => {
    notification.value.show = false
  }, 3000)
}

// 处理登录成功
const handleLoginSuccess = (data: any) => {
  showNotification('登录成功！', 'success')
  console.log('登录成功:', data)
  // TODO: 跳转到主页面
}

// 处理登录错误
const handleLoginError = (error: any) => {
  showNotification(error.message || '登录失败，请重试', 'error')
  console.error('登录失败:', error)
}

// 处理注册成功
const handleRegisterSuccess = (data: any) => {
  showNotification('注册成功！', 'success')
  console.log('注册成功:', data)
  // 注册成功后切换到登录表单
  currentForm.value = 'login'
}

// 处理注册错误
const handleRegisterError = (error: any) => {
  showNotification(error.message || '注册失败，请重试', 'error')
  console.error('注册失败:', error)
}

// 切换到注册表单
const switchToRegister = () => {
  currentForm.value = 'register'
}

// 切换到登录表单
const switchToLogin = () => {
  currentForm.value = 'login'
}
</script>

<template>
  <div id="app">
    <!-- 登录表单 -->
    <LoginForm 
      v-if="currentForm === 'login'"
      @success="handleLoginSuccess"
      @error="handleLoginError"
      @switch-to-register="switchToRegister"
    />
    
    <!-- 注册表单 -->
    <RegisterForm 
      v-if="currentForm === 'register'"
      @success="handleRegisterSuccess"
      @error="handleRegisterError"
      @switch-to-login="switchToLogin"
    />
    
    <!-- 通知组件 -->
    <NotificationToast
      :message="notification.message"
      :type="notification.type"
      :show="notification.show"
    />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
}
</style>
