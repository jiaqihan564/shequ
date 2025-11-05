<template>
  <div class="auth-container" @click="clearErrors" @keydown.esc="clearErrors">
    <div class="auth-card" @click.stop>
      <div class="form-header">
        <div class="logo-section">
          <div class="logo-icon">🚀</div>
          <h2 class="form-title">创建账户</h2>
        </div>
        <p class="form-subtitle">加入我们的技术社区，开启你的编程之旅</p>
      </div>

      <form class="auth-form" novalidate @submit.prevent="handleSubmit">
        <!-- 用户名输入 -->
        <div class="form-group">
          <label for="username" class="form-label">
            用户名
            <span class="required">*</span>
          </label>
          <div class="input-wrapper">
            <UserIcon class="input-icon" />
            <input
              id="username"
              v-model="formData.username"
              type="text"
              class="form-input"
              :class="{ error: errors.username }"
              placeholder="请输入用户名"
              autocomplete="username"
              @blur="validateField('username')"
              @input="clearError('username')"
            />
          </div>
          <div v-if="errors.username" class="error-message">
            {{ errors.username }}
          </div>
        </div>

        <!-- 邮箱输入 -->
        <div class="form-group">
          <label for="email" class="form-label">
            邮箱地址
            <span class="required">*</span>
          </label>
          <div class="input-wrapper">
            <UserIcon class="input-icon" />
            <input
              id="email"
              v-model="formData.email"
              type="email"
              class="form-input"
              :class="{ error: errors.email }"
              placeholder="请输入邮箱地址"
              autocomplete="email"
              @blur="validateField('email')"
              @input="clearError('email')"
            />
          </div>
          <div v-if="errors.email" class="error-message">
            {{ errors.email }}
          </div>
        </div>

        <!-- 密码输入 -->
        <div class="form-group">
          <label for="password" class="form-label">
            密码
            <span class="required">*</span>
          </label>
          <div class="input-wrapper">
            <EyeOffIcon v-if="showPassword" class="input-icon" />
            <EyeIcon v-else class="input-icon" />
            <input
              id="password"
              v-model="formData.password"
              :type="showPassword ? 'text' : 'password'"
              class="form-input"
              :class="{ error: errors.password }"
              placeholder="请输入密码"
              autocomplete="new-password"
              @blur="validateField('password')"
              @input="clearError('password')"
            />
            <button
              type="button"
              class="password-toggle"
              :aria-label="showPassword ? '隐藏密码' : '显示密码'"
              @click="togglePassword"
            >
              <EyeOffIcon v-if="showPassword" class="toggle-icon" />
              <EyeIcon v-else class="toggle-icon" />
            </button>
          </div>
          <div v-if="errors.password" class="error-message">
            {{ errors.password }}
          </div>
          <!-- 密码强度指示器 -->
          <div v-if="formData.password" class="password-strength">
            <div class="strength-bar">
              <div
                class="strength-fill"
                :class="passwordStrength.strength"
                :style="{ width: getStrengthWidth() }"
              ></div>
            </div>
            <span class="strength-text" :class="passwordStrength.strength">
              {{ getStrengthText() }}
            </span>
          </div>
          <!-- 密码建议 -->
          <div v-if="passwordStrength.suggestions.length > 0" class="password-suggestions">
            <div class="suggestion-title">密码建议：</div>
            <ul class="suggestion-list">
              <li
                v-for="suggestion in passwordStrength.suggestions"
                :key="suggestion"
                class="suggestion-item"
              >
                {{ suggestion }}
              </li>
            </ul>
          </div>
        </div>

        <!-- 确认密码输入 -->
        <div class="form-group">
          <label for="confirmPassword" class="form-label">
            确认密码
            <span class="required">*</span>
          </label>
          <div class="input-wrapper">
            <EyeOffIcon v-if="showConfirmPassword" class="input-icon" />
            <EyeIcon v-else class="input-icon" />
            <input
              id="confirmPassword"
              v-model="formData.confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              class="form-input"
              :class="{ error: errors.confirmPassword }"
              placeholder="请再次输入密码"
              autocomplete="new-password"
              @blur="validateField('confirmPassword')"
              @input="clearError('confirmPassword')"
            />
            <button
              type="button"
              class="password-toggle"
              :aria-label="showConfirmPassword ? '隐藏密码' : '显示密码'"
              @click="toggleConfirmPassword"
            >
              <EyeOffIcon v-if="showConfirmPassword" class="toggle-icon" />
              <EyeIcon v-else class="toggle-icon" />
            </button>
          </div>
          <div v-if="errors.confirmPassword" class="error-message">
            {{ errors.confirmPassword }}
          </div>
        </div>

        <!-- 用户协议同意 -->
        <div class="form-group">
          <label class="checkbox-wrapper">
            <input
              v-model="formData.agreeToTerms"
              type="checkbox"
              class="checkbox-input"
              :class="{ error: errors.agreeToTerms }"
              @change="clearError('agreeToTerms')"
            />
            <span class="checkbox-label">
              我已阅读并同意
              <a href="#" class="link" @click.prevent="showTerms">《用户协议》</a>
              和
              <a href="#" class="link" @click.prevent="showPrivacy">《隐私政策》</a>
            </span>
          </label>
          <div v-if="errors.agreeToTerms" class="error-message">
            {{ errors.agreeToTerms }}
          </div>
        </div>

        <!-- 提交按钮 -->
        <button
          type="submit"
          class="auth-button"
          :disabled="isSubmitting"
          @click="handleButtonClick"
        >
          <LoadingSpinner v-if="isSubmitting" class="button-spinner" />
          {{ isSubmitting ? '注册中…' : '创建账户' }}
        </button>
      </form>

      <!-- 登录链接 -->
      <div class="form-footer">
        <p class="footer-text">
          已有账户？
          <a href="#" class="link" @click.prevent="switchToLogin">立即登录</a>
        </p>
      </div>
    </div>

    <!-- 背景装饰 -->
    <div class="background-decoration">
      <div class="decoration-circle circle-1"></div>
      <div class="decoration-circle circle-2"></div>
      <div class="decoration-circle circle-3"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'

import EyeIcon from '@/components/icons/EyeIcon.vue'
import EyeOffIcon from '@/components/icons/EyeOffIcon.vue'
import UserIcon from '@/components/icons/UserIcon.vue'
import LoadingSpinner from '@/shared/ui/LoadingSpinner.vue'
import type { RegisterForm } from '@/types'
import { register } from '@/utils/api'
import {
  validateField as validateSingleField,
  checkPasswordStrength,
  validateConfirmPassword,
  VALIDATION_RULES
} from '@/utils/validation'
import { detectCurrentRegion } from '@/utils/geo'
import { authConfig } from '@/config'
import { logger } from '@/utils/ui/logger'

const emit = defineEmits<{
  success: [data: any]
  error: [error: any]
  switchToLogin: []
}>()

const formData = reactive<RegisterForm>({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreeToTerms: false
})

const errors = reactive<Record<string, string>>({})
const isSubmitting = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)

const passwordStrength = computed(() => checkPasswordStrength(formData.password))

watch(
  () => formData.password,
  () => {
    if (formData.confirmPassword) {
      validateField('confirmPassword')
    }
  }
)

const validateField = (field: keyof RegisterForm) => {
  if (field === 'confirmPassword') {
    errors.confirmPassword =
      validateConfirmPassword(formData.password, formData.confirmPassword) || ''
  } else {
    errors[field] = validateSingleField(formData[field], VALIDATION_RULES[field] || []) || ''
  }
}

const clearError = (field: keyof RegisterForm) => {
  errors[field] = ''
}

const clearErrors = () => {
  errors.username = ''
  errors.email = ''
  errors.password = ''
  errors.confirmPassword = ''
  errors.agreeToTerms = ''
}

const getStrengthWidth = () => {
  const strengthMap = { weak: '33%', medium: '66%', strong: '100%' }
  return strengthMap[passwordStrength.value.strength]
}

const getStrengthText = () => {
  const textMap: Record<string, string> = { weak: '弱', medium: '中等', strong: '强' }
  return textMap[passwordStrength.value.strength]
}

const togglePassword = () => {
  showPassword.value = !showPassword.value
}

const toggleConfirmPassword = () => {
  showConfirmPassword.value = !showConfirmPassword.value
}

const showTerms = () => {
  // TODO: 实现用户协议对话框
}

const showPrivacy = () => {
  // TODO: 实现隐私政策对话框
}

const switchToLogin = () => {
  emit('switchToLogin')
}

const handleButtonClick = (event: Event) => {
  if ((event.target as HTMLButtonElement).disabled) {
    return
  }
  handleSubmit(event)
}

const handleSubmit = async (event: Event) => {
  event.preventDefault()
  if (isSubmitting.value) return
  if (!formData.username.trim()) {
    errors.username = '请输入用户名'
    return
  }
  if (!formData.email.trim()) {
    errors.email = '请输入邮箱地址'
    return
  }
  if (!formData.password.trim()) {
    errors.password = '请输入密码'
    return
  }
  if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = '两次输入的密码不一致'
    return
  }
  if (!formData.agreeToTerms) {
    errors.agreeToTerms = '请同意用户协议和隐私政策'
    return
  }

  isSubmitting.value = true
  try {
    // 获取地理位置，失败时使用默认值
    let province = authConfig.defaultProvince
    let city = authConfig.defaultCity
    
    try {
      const region = await detectCurrentRegion(false, { timeoutMs: authConfig.registerGeoTimeout })
      if (region && region.province) {
        province = region.province
        city = region.city || city  // 如果城市为空，使用默认值
      }
    } catch (geoError) {
      void geoError // 获取地理位置失败，使用默认地区
    }
    
    // 调用注册API，传递地区信息
    const result = await register({
      ...formData,
      province,
      city
    })
    emit('success', result)
  } catch (error) {
    logger.error('注册失败:', error)
    emit('error', error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.register-form {
  max-width: 450px;
  width: 100%;
}
.form-header {
  text-align: center;
  margin-bottom: 2.5rem;
}
.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1rem;
}
.logo-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  animation: float 3s ease-in-out infinite;
}
@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}
.form-title {
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  margin: 0;
  letter-spacing: -0.025em;
}
.form-subtitle {
  color: #6b7280;
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
}
.password-strength {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
.strength-bar {
  flex: 1;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}
.strength-fill {
  height: 100%;
  transition: all 0.3s;
}
.strength-fill.weak {
  background: #ef4444;
}
.strength-fill.medium {
  background: #f59e0b;
}
.strength-fill.strong {
  background: #10b981;
}
.strength-text {
  font-size: 0.75rem;
  font-weight: 500;
}
.strength-text.weak {
  color: #ef4444;
}
.strength-text.medium {
  color: #f59e0b;
}
.strength-text.strong {
  color: #10b981;
}
.password-suggestions {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 0.375rem;
  border: 1px solid #e5e7eb;
}
.suggestion-title {
  font-size: 0.75rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.25rem;
}
.suggestion-list {
  margin: 0;
  padding-left: 1rem;
  list-style-type: disc;
}
.suggestion-item {
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 0.125rem;
}
.checkbox-input {
  width: 1rem;
  height: 1rem;
  margin: 0;
  accent-color: #3b82f6;
}
.checkbox-input.error {
  outline: 2px solid #ef4444;
  outline-offset: 2px;
}
.button-spinner {
  width: 1rem;
  height: 1rem;
}
.form-footer {
  text-align: center;
  margin-top: 1.5rem;
}
.footer-text {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0;
}
</style>
