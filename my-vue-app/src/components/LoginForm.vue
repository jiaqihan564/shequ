<template>
  <div class="auth-container" @click="clearErrors" @keydown.esc="clearErrors">
    <div class="auth-card" @click.stop>
      <div class="login-header">
        <h1 class="login-title">技术交流社区</h1>
        <p class="login-subtitle">欢迎回来，让我们一起交流技术</p>
      </div>
      
      <form @submit.prevent="handleLogin" class="auth-form" novalidate>
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
          
          <!-- 密码强度提示 -->
          <div v-if="passwordStrength.showSuggestions && form.password && !errors.password" class="password-strength">
            <div class="strength-indicator">
              <span class="strength-label">密码强度：</span>
              <div class="strength-bar">
                <div 
                  class="strength-fill" 
                  :class="`strength-${passwordStrength.strength}`"
                  :style="{ width: passwordStrength.strength === 'weak' ? '33%' : passwordStrength.strength === 'medium' ? '66%' : '100%' }"
                ></div>
              </div>
              <span class="strength-text" :class="`strength-${passwordStrength.strength}`">
                {{ passwordStrength.strength === 'weak' ? '弱' : passwordStrength.strength === 'medium' ? '中等' : '强' }}
              </span>
            </div>
            <div class="strength-suggestions">
              <span class="suggestions-label">建议：</span>
              <ul class="suggestions-list">
                <li v-for="suggestion in passwordStrength.suggestions" :key="suggestion" class="suggestion-item">
                  {{ suggestion }}
                </li>
              </ul>
            </div>
          </div>
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
          class="auth-button"
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
    
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import type { LoginForm, FormErrors } from '@/types'
import { validateUsernameOrEmail, validatePassword as validatePasswordUtil, checkPasswordStrength, debounce } from '@/utils/validation'
import { login } from '@/utils/api'
import UserIcon from '@/components/icons/UserIcon.vue'
import EyeIcon from '@/components/icons/EyeIcon.vue'
import EyeOffIcon from '@/components/icons/EyeOffIcon.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'

// 定义事件
const emit = defineEmits<{
  success: [data: any]
  error: [error: any]
  switchToRegister: []
}>()

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

// 密码强度状态
const passwordStrength = reactive({
  strength: 'weak' as 'weak' | 'medium' | 'strong',
  suggestions: [] as string[],
  showSuggestions: false
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
  
  // 检查密码强度（仅提供建议）
  if (form.password && !error) {
    const strengthInfo = checkPasswordStrength(form.password)
    passwordStrength.strength = strengthInfo.strength
    passwordStrength.suggestions = strengthInfo.suggestions
    passwordStrength.showSuggestions = strengthInfo.suggestions.length > 0
  } else {
    passwordStrength.showSuggestions = false
    passwordStrength.suggestions = []
  }
  
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


// 事件处理方法
const handleForgotPassword = () => {
  // 通过emit发送事件到父组件处理通知
  emit('error', { message: '忘记密码功能正在开发中...' })
}

const handleSignup = () => {
  emit('switchToRegister')
}

const handleLogin = async () => {
  // 验证表单
  validateUsername()
  validatePassword()
  
  if (hasErrors.value) {
    emit('error', { message: '请检查输入信息' })
    return
  }
  
  isLoading.value = true
  
  try {
    // 调用登录API
    const response = await login(form)
    
    // 登录成功
    // 成功通知由父组件App.vue处理
    
    // 如果选择了记住我，保存到localStorage
    if (form.rememberMe) {
      localStorage.setItem('remembered_username', form.username)
    } else {
      localStorage.removeItem('remembered_username')
    }
    
    // 发出成功事件
    emit('success', response)
    
  } catch (error: any) {
    console.error('登录失败:', error)
    // 错误通知由父组件App.vue处理
    emit('error', error)
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

/* 密码强度提示样式 */
.password-strength {
  margin-top: var(--spacing-2);
  padding: var(--spacing-3);
  background: rgba(59, 130, 246, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
}

.strength-indicator {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-2);
}

.strength-label {
  color: var(--color-gray-600);
  font-weight: 500;
}

.strength-bar {
  flex: 1;
  height: 4px;
  background: var(--color-gray-200);
  border-radius: 2px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  transition: all var(--transition-normal);
  border-radius: 2px;
}

.strength-fill.strength-weak {
  background: var(--color-error);
}

.strength-fill.strength-medium {
  background: #f59e0b;
}

.strength-fill.strength-strong {
  background: #10b981;
}

.strength-text {
  font-weight: 600;
  min-width: 30px;
}

.strength-text.strength-weak {
  color: var(--color-error);
}

.strength-text.strength-medium {
  color: #f59e0b;
}

.strength-text.strength-strong {
  color: #10b981;
}

.strength-suggestions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.suggestions-label {
  color: var(--color-gray-600);
  font-weight: 500;
}

.suggestions-list {
  margin: 0;
  padding-left: var(--spacing-4);
  list-style: none;
}

.suggestion-item {
  color: var(--color-gray-500);
  position: relative;
  margin-bottom: var(--spacing-1);
}

.suggestion-item::before {
  content: '•';
  color: var(--color-primary);
  font-weight: bold;
  position: absolute;
  left: -var(--spacing-4);
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: var(--spacing-2) 0;
}

.checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
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
</style>
