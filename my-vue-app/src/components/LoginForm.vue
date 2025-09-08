<template>
  <div class="login-container" @click="clearErrors" @keydown.esc="clearErrors">
    <div class="login-card" @click.stop>
      <div class="login-header">
        <h1 class="login-title">技术交流社区</h1>
        <p class="login-subtitle">欢迎回来，让我们一起交流技术</p>
      </div>
      
      <form @submit.prevent="handleLogin" class="login-form" novalidate>
        <div class="form-group">
          <label for="username" class="form-label">用户名或邮箱</label>
          <div class="input-wrapper">
            <input
              id="username"
              v-model="form.username"
              type="text"
              class="form-input"
              :class="{ 'error': errors.username }"
              placeholder="请输入用户名或邮箱"
              autocomplete="username"
              @blur="validateUsername"
              @focus="clearFieldError('username')"
              @input="debouncedValidateUsername"
            />
            <div class="input-icon">
              <UserIcon />
            </div>
          </div>
          <span v-if="errors.username" class="error-message">{{ errors.username }}</span>
        </div>

        <div class="form-group">
          <label for="password" class="form-label">密码</label>
          <div class="input-wrapper">
            <input
              id="password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              class="form-input"
              :class="{ 'error': errors.password }"
              placeholder="请输入密码"
              autocomplete="current-password"
              @blur="validatePassword"
              @focus="clearFieldError('password')"
              @input="debouncedValidatePassword"
            />
            <button
              type="button"
              class="password-toggle"
              @click="togglePassword"
              :aria-label="showPassword ? '隐藏密码' : '显示密码'"
            >
              <EyeIcon v-if="!showPassword" />
              <EyeOffIcon v-else />
            </button>
          </div>
          <span v-if="errors.password" class="error-message">{{ errors.password }}</span>
        </div>

        <div class="form-options">
          <label class="checkbox-wrapper">
            <input
              v-model="form.rememberMe"
              type="checkbox"
              class="checkbox"
            />
            <span class="checkbox-label">记住我</span>
          </label>
          <a href="#" class="forgot-password" @click.prevent="handleForgotPassword">忘记密码？</a>
        </div>

        <button
          type="submit"
          class="login-button"
          :disabled="!canSubmit"
          :aria-label="isLoading ? '正在登录' : '登录'"
        >
          <LoadingSpinner v-if="isLoading" />
          {{ isLoading ? '登录中...' : '登录' }}
        </button>
      </form>

      <div class="login-footer">
        <p class="signup-text">
          还没有账号？
          <a href="#" class="signup-link" @click.prevent="handleSignup">立即注册</a>
        </p>
      </div>
    </div>
    
    <!-- 通知提示 -->
    <NotificationToast 
      v-if="notification.show" 
      :message="notification.message"
      :type="notification.type"
      :show="notification.show"
      @close="notification.show = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import type { LoginForm, FormErrors, NotificationType } from '@/types'
import { validateUsernameOrEmail, validatePassword as validatePasswordUtil, debounce } from '@/utils/validation'
import { login } from '@/utils/api'
import UserIcon from '@/components/icons/UserIcon.vue'
import EyeIcon from '@/components/icons/EyeIcon.vue'
import EyeOffIcon from '@/components/icons/EyeOffIcon.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import NotificationToast from '@/components/ui/NotificationToast.vue'

// 响应式数据
const form = reactive<LoginForm>({
  username: '',
  password: '',
  rememberMe: false
})

const errors = reactive<FormErrors>({
  username: '',
  password: ''
})

const showPassword = ref(false)
const isLoading = ref(false)
const isFormValid = ref(false)

// 通知状态
const notification = reactive({
  show: false,
  message: '',
  type: 'info' as NotificationType
})

// 计算属性
const hasErrors = computed(() => {
  return Object.values(errors).some(error => error && error.trim() !== '')
})

const canSubmit = computed(() => {
  return !isLoading.value && !hasErrors.value && form.username.trim() && form.password.trim()
})

// 防抖验证函数
const debouncedValidateUsername = debounce(() => {
  if (form.username) {
    validateUsernameField()
  }
}, 300)

const debouncedValidatePassword = debounce(() => {
  if (form.password) {
    validatePasswordField()
  }
}, 300)

// 验证方法
const validateUsernameField = () => {
  const error = validateUsernameOrEmail(form.username)
  errors.username = error || ''
  updateFormValidity()
}

const validatePasswordField = () => {
  const error = validatePasswordUtil(form.password)
  errors.password = error || ''
  updateFormValidity()
}

const validateUsername = () => {
  validateUsernameField()
}

const validatePassword = () => {
  validatePasswordField()
}

const updateFormValidity = () => {
  isFormValid.value = !hasErrors.value && !!form.username.trim() && !!form.password.trim()
}

// 监听表单变化
watch([() => form.username, () => form.password], () => {
  updateFormValidity()
})

// UI交互方法
const togglePassword = () => {
  showPassword.value = !showPassword.value
}

const clearFieldError = (field: keyof FormErrors) => {
  errors[field] = ''
}

const clearErrors = () => {
  errors.username = ''
  errors.password = ''
}

// 通知方法
const showNotification = (message: string, type: NotificationType = 'info') => {
  notification.message = message
  notification.type = type
  notification.show = true
  
  // 自动隐藏通知
  setTimeout(() => {
    notification.show = false
  }, 3000)
}

// 事件处理方法
const handleForgotPassword = () => {
  showNotification('忘记密码功能正在开发中...', 'info')
}

const handleSignup = () => {
  showNotification('注册功能正在开发中...', 'info')
}

const handleLogin = async () => {
  // 验证表单
  validateUsername()
  validatePassword()
  
  if (hasErrors.value) {
    showNotification('请检查输入信息', 'error')
    return
  }
  
  isLoading.value = true
  
  try {
    // 调用登录API
    const response = await login(form)
    
    // 登录成功
    showNotification('登录成功！', 'success')
    
    // 如果选择了记住我，保存到localStorage
    if (form.rememberMe) {
      localStorage.setItem('remembered_username', form.username)
    } else {
      localStorage.removeItem('remembered_username')
    }
    
    // 这里可以跳转到主页面或触发路由跳转
    console.log('登录成功:', response)
    
    // 模拟跳转延迟
    setTimeout(() => {
      // router.push('/dashboard') // 实际项目中应该使用路由跳转
      showNotification('正在跳转到主页面...', 'success')
    }, 1000)
    
  } catch (error: any) {
    console.error('登录失败:', error)
    showNotification(error.message || '登录失败，请重试', 'error')
  } finally {
    isLoading.value = false
  }
}

// 生命周期
onMounted(() => {
  // 恢复记住的用户名
  const rememberedUsername = localStorage.getItem('remembered_username')
  if (rememberedUsername) {
    form.username = rememberedUsername
    form.rememberMe = true
  }
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 50%, var(--color-secondary) 100%);
  padding: var(--spacing-5);
  position: relative;
  overflow: hidden;
}

.login-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.2) 0%, transparent 50%);
  animation: backgroundShift 20s ease-in-out infinite;
}

.login-container::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: 
    linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%);
  animation: shimmer 15s linear infinite;
}

@keyframes backgroundShift {
  0%, 100% {
    transform: translateX(0) translateY(0);
  }
  25% {
    transform: translateX(-20px) translateY(-10px);
  }
  50% {
    transform: translateX(20px) translateY(10px);
  }
  75% {
    transform: translateX(-10px) translateY(20px);
  }
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%) translateY(-100%) rotate(45deg);
  }
  100% {
    transform: translateX(100%) translateY(100%) rotate(45deg);
  }
}

.login-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-xl);
  padding: var(--spacing-10);
  width: 100%;
  max-width: 400px;
  position: relative;
  overflow: hidden;
  z-index: 10;
  transition: all var(--transition-slow);
}

.login-card:hover {
  transform: translateY(-5px);
  box-shadow: 
    0 35px 60px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.2);
}

.login-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-dark));
}

.login-header {
  text-align: center;
  margin-bottom: var(--spacing-8);
}

.login-title {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  color: var(--color-gray-900);
  margin: 0 0 var(--spacing-2) 0;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.login-subtitle {
  color: var(--color-gray-500);
  font-size: var(--font-size-sm);
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-5);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-gray-700);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.form-input {
  width: 100%;
  padding: var(--spacing-3) var(--spacing-4) var(--spacing-3) 48px;
  border: 2px solid var(--color-gray-200);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-base);
  transition: all var(--transition-normal);
  background: var(--color-gray-50);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: var(--color-white);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input.error {
  border-color: var(--color-error);
  background: rgba(239, 68, 68, 0.05);
}

.input-icon {
  position: absolute;
  left: var(--spacing-4);
  color: var(--color-gray-400);
  pointer-events: none;
}

.password-toggle {
  position: absolute;
  right: var(--spacing-4);
  background: none;
  border: none;
  color: var(--color-gray-400);
  cursor: pointer;
  padding: var(--spacing-1);
  border-radius: var(--radius-sm);
  transition: color var(--transition-normal);
}

.password-toggle:hover {
  color: var(--color-primary);
}

.error-message {
  color: var(--color-error);
  font-size: var(--font-size-xs);
  margin-top: var(--spacing-1);
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: var(--spacing-2) 0;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  cursor: pointer;
}

.checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
}

.checkbox-label {
  font-size: var(--font-size-sm);
  color: var(--color-gray-600);
}

.forgot-password {
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  text-decoration: none;
  transition: color var(--transition-normal);
}

.forgot-password:hover {
  color: var(--color-primary-dark);
}

.login-button {
  width: 100%;
  padding: var(--spacing-4);
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: var(--color-white);
  border: none;
  border-radius: var(--radius-lg);
  font-size: var(--font-size-base);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-normal);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  margin-top: var(--spacing-2);
}

.login-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.login-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.login-footer {
  text-align: center;
  margin-top: var(--spacing-6);
  padding-top: var(--spacing-6);
  border-top: 1px solid var(--color-gray-200);
}

.signup-text {
  color: var(--color-gray-500);
  font-size: var(--font-size-sm);
  margin: 0;
}

.signup-link {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 600;
  transition: color var(--transition-normal);
}

.signup-link:hover {
  color: var(--color-primary-dark);
}

/* 响应式设计 */
@media (max-width: 480px) {
  .login-container {
    padding: var(--spacing-4);
  }
  
  .login-card {
    padding: var(--spacing-6);
  }
  
  .login-title {
    font-size: var(--font-size-2xl);
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .login-card {
    background: var(--color-white);
    border: 2px solid var(--color-gray-900);
  }
  
  .form-input {
    border: 2px solid var(--color-gray-900);
    background: var(--color-white);
  }
  
  .form-input:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary);
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  .login-container::before,
  .login-container::after {
    animation: none;
  }
  
  .login-card:hover {
    transform: none;
  }
  
  .login-button:hover:not(:disabled) {
    transform: none;
  }
}
</style>
