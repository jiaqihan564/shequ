<template>
  <div class="reset-password-container">
    <div class="reset-password-card">
      <div class="reset-header">
        <h1 class="reset-title">重置密码</h1>
        <p class="reset-subtitle">请输入您的新密码</p>
      </div>

      <form class="reset-form" novalidate @submit.prevent="handleResetPassword">
        <!-- 新密码 -->
        <div class="form-group">
          <label for="newPassword" class="form-label">新密码</label>
          <div class="input-wrapper">
            <input
              id="newPassword"
              v-model="form.newPassword"
              :type="showNewPassword ? 'text' : 'password'"
              class="form-input"
              :class="{ error: errors.newPassword }"
              placeholder="8-20位，包含大小写字母和数字"
              autocomplete="new-password"
              :disabled="isSubmitting"
              @blur="validateNewPassword"
              @focus="clearFieldError('newPassword')"
              @input="debouncedValidateNewPassword"
            />
            <button
              type="button"
              class="password-toggle"
              :aria-label="showNewPassword ? '隐藏密码' : '显示密码'"
              @click="showNewPassword = !showNewPassword"
            >
              <EyeIcon v-if="!showNewPassword" />
              <EyeOffIcon v-else />
            </button>
          </div>
          <span v-if="errors.newPassword" class="error-message">{{ errors.newPassword }}</span>

          <!-- 密码强度提示 -->
          <div
            v-if="passwordStrength.showSuggestions && form.newPassword && !errors.newPassword"
            class="password-strength"
          >
            <div class="strength-indicator">
              <span class="strength-label">密码强度：</span>
              <div class="strength-bar">
                <div
                  class="strength-fill"
                  :class="`strength-${passwordStrength.strength}`"
                  :style="{
                    width:
                      passwordStrength.strength === 'weak'
                        ? '33%'
                        : passwordStrength.strength === 'medium'
                          ? '66%'
                          : '100%'
                  }"
                ></div>
              </div>
              <span class="strength-text" :class="`strength-${passwordStrength.strength}`">
                {{
                  passwordStrength.strength === 'weak'
                    ? '弱'
                    : passwordStrength.strength === 'medium'
                      ? '中等'
                      : '强'
                }}
              </span>
            </div>
          </div>
        </div>

        <!-- 确认新密码 -->
        <div class="form-group">
          <label for="confirmPassword" class="form-label">确认新密码</label>
          <div class="input-wrapper">
            <input
              id="confirmPassword"
              v-model="form.confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              class="form-input"
              :class="{ error: errors.confirmPassword }"
              placeholder="请再次输入新密码"
              autocomplete="new-password"
              :disabled="isSubmitting"
              @blur="validateConfirmPassword"
              @focus="clearFieldError('confirmPassword')"
              @input="debouncedValidateConfirmPassword"
            />
            <button
              type="button"
              class="password-toggle"
              :aria-label="showConfirmPassword ? '隐藏密码' : '显示密码'"
              @click="showConfirmPassword = !showConfirmPassword"
            >
              <EyeIcon v-if="!showConfirmPassword" />
              <EyeOffIcon v-else />
            </button>
          </div>
          <span v-if="errors.confirmPassword" class="error-message">
            {{ errors.confirmPassword }}
          </span>
        </div>

        <button type="submit" class="reset-button" :disabled="!canSubmit">
          <LoadingSpinner v-if="isSubmitting" />
          {{ isSubmitting ? '重置中…' : '重置密码' }}
        </button>
      </form>

      <div class="reset-footer">
        <p class="back-to-login">
          <a href="#" @click.prevent="goToLogin">返回登录</a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import EyeIcon from '@/components/icons/EyeIcon.vue'
import EyeOffIcon from '@/components/icons/EyeOffIcon.vue'
import LoadingSpinner from '@/shared/ui/LoadingSpinner.vue'
import { resetPassword } from '@/utils/api'
import { toast } from '@/utils/toast'
import {
  checkPasswordStrength,
  debounce,
  validatePassword as validatePasswordUtil
} from '@/utils/validation'

const route = useRoute()
const router = useRouter()

const form = reactive({
  newPassword: '',
  confirmPassword: ''
})

const errors = reactive({
  newPassword: '',
  confirmPassword: ''
})

const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const isSubmitting = ref(false)
const token = ref('')

const passwordStrength = reactive({
  strength: 'weak' as 'weak' | 'medium' | 'strong',
  suggestions: [] as string[],
  showSuggestions: false
})

const hasErrors = computed(() => {
  return Object.values(errors).some(error => error && error.trim() !== '')
})

const canSubmit = computed(() => {
  return (
    !isSubmitting.value &&
    !hasErrors.value &&
    form.newPassword.trim() &&
    form.confirmPassword.trim() &&
    token.value
  )
})

const validateNewPassword = () => {
  const error = validatePasswordUtil(form.newPassword)
  errors.newPassword = error || ''

  if (form.newPassword && !error) {
    const strengthInfo = checkPasswordStrength(form.newPassword)
    passwordStrength.strength = strengthInfo.strength
    passwordStrength.suggestions = strengthInfo.suggestions
    passwordStrength.showSuggestions = strengthInfo.suggestions.length > 0
  } else {
    passwordStrength.showSuggestions = false
    passwordStrength.suggestions = []
  }

  // 如果确认密码已输入，也要验证是否匹配
  if (form.confirmPassword) {
    validateConfirmPassword()
  }
}

const validateConfirmPassword = () => {
  if (!form.confirmPassword.trim()) {
    errors.confirmPassword = '请确认新密码'
  } else if (form.confirmPassword !== form.newPassword) {
    errors.confirmPassword = '两次输入的密码不一致'
  } else {
    errors.confirmPassword = ''
  }
}

const debouncedValidateNewPassword = debounce(() => {
  if (form.newPassword) {
    validateNewPassword()
  }
}, 300)

const debouncedValidateConfirmPassword = debounce(() => {
  if (form.confirmPassword) {
    validateConfirmPassword()
  }
}, 300)

const clearFieldError = (field: keyof typeof errors) => {
  errors[field] = ''
}

const handleResetPassword = async () => {
  if (!canSubmit.value) return

  // 验证所有字段
  validateNewPassword()
  validateConfirmPassword()

  if (hasErrors.value) {
    toast.error('请检查输入信息')
    return
  }

  if (!token.value) {
    toast.error('重置token无效或已过期')
    return
  }

  isSubmitting.value = true

  try {
    await resetPassword({
      token: token.value,
      newPassword: form.newPassword
    })
    toast.success('密码重置成功，请使用新密码登录')
    // 延迟跳转到登录页
    setTimeout(() => {
      router.push('/login')
    }, 1500)
  } catch (error: any) {
    console.error('重置密码失败:', error)
    toast.error(error?.message || '重置密码失败')
  } finally {
    isSubmitting.value = false
  }
}

const goToLogin = () => {
  router.push('/login')
}

onMounted(() => {
  // 从URL获取token参数
  const tokenParam = route.query.token
  if (tokenParam && typeof tokenParam === 'string') {
    token.value = tokenParam
  } else {
    toast.error('缺少重置token，请重新获取')
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  }
})
</script>

<style scoped>
.reset-password-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.reset-password-card {
  width: 100%;
  max-width: 480px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 40px;
}

.reset-header {
  text-align: center;
  margin-bottom: 32px;
}

.reset-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

.reset-subtitle {
  color: #6b7280;
  font-size: 14px;
  margin: 0;
}

.reset-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.input-wrapper {
  position: relative;
}

.form-input {
  width: 100%;
  padding: 12px 40px 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 15px;
  transition: all 0.2s;
  background: white;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input.error {
  border-color: #ef4444;
}

.form-input:disabled {
  background: #f9fafb;
  cursor: not-allowed;
}

.password-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.password-toggle:hover {
  color: #667eea;
}

.password-toggle svg {
  width: 20px;
  height: 20px;
}

.error-message {
  margin-top: 6px;
  font-size: 13px;
  color: #ef4444;
}

.password-strength {
  margin-top: 12px;
  padding: 12px;
  background: rgba(59, 130, 246, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 10px;
  font-size: 13px;
}

.strength-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
}

.strength-label {
  color: #6b7280;
  font-weight: 500;
  white-space: nowrap;
}

.strength-bar {
  flex: 1;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  transition: all 0.3s;
  border-radius: 3px;
}

.strength-fill.strength-weak {
  background: #ef4444;
}

.strength-fill.strength-medium {
  background: #f59e0b;
}

.strength-fill.strength-strong {
  background: #10b981;
}

.strength-text {
  font-weight: 600;
  min-width: 40px;
  text-align: center;
}

.strength-text.strength-weak {
  color: #ef4444;
}

.strength-text.strength-medium {
  color: #f59e0b;
}

.strength-text.strength-strong {
  color: #10b981;
}

.reset-button {
  margin-top: 8px;
  padding: 14px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.reset-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 15px 30px rgba(102, 126, 234, 0.4);
}

.reset-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.reset-footer {
  margin-top: 24px;
  text-align: center;
}

.back-to-login {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.back-to-login a {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s;
}

.back-to-login a:hover {
  color: #764ba2;
}

@media (max-width: 640px) {
  .reset-password-card {
    padding: 30px 20px;
  }

  .reset-title {
    font-size: 24px;
  }
}
</style>
