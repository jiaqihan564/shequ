<template>
  <div v-if="show" class="password-overlay" @click="handleOverlayClick" @keydown.esc="close">
    <div class="password-dialog" @click.stop>
      <header class="password-header">
        <h3>修改密码</h3>
        <button class="password-close" aria-label="关闭" @click="close">×</button>
      </header>

      <form class="password-form" @submit.prevent="handleSubmit">
        <!-- 当前密码 -->
        <div class="form-field">
          <label for="currentPassword" class="form-label">当前密码</label>
          <div class="password-input-wrapper">
            <input
              id="currentPassword"
              v-model="form.currentPassword"
              :type="showCurrentPassword ? 'text' : 'password'"
              class="form-input"
              :class="{ error: errors.currentPassword }"
              placeholder="请输入当前密码"
              autocomplete="current-password"
              @blur="validateCurrentPassword"
              @focus="clearFieldError('currentPassword')"
            />
            <button
              type="button"
              class="password-toggle-btn"
              :aria-label="showCurrentPassword ? '隐藏密码' : '显示密码'"
              @click="showCurrentPassword = !showCurrentPassword"
            >
              <EyeIcon v-if="!showCurrentPassword" />
              <EyeOffIcon v-else />
            </button>
          </div>
          <span v-if="errors.currentPassword" class="error-text">{{ errors.currentPassword }}</span>
        </div>

        <!-- 新密码 -->
        <div class="form-field">
          <label for="newPassword" class="form-label">新密码</label>
          <div class="password-input-wrapper">
            <input
              id="newPassword"
              v-model="form.newPassword"
              :type="showNewPassword ? 'text' : 'password'"
              class="form-input"
              :class="{ error: errors.newPassword }"
              placeholder="8-20位，包含大小写字母和数字"
              autocomplete="new-password"
              @blur="validateNewPassword"
              @focus="clearFieldError('newPassword')"
              @input="debouncedValidateNewPassword"
            />
            <button
              type="button"
              class="password-toggle-btn"
              :aria-label="showNewPassword ? '隐藏密码' : '显示密码'"
              @click="showNewPassword = !showNewPassword"
            >
              <EyeIcon v-if="!showNewPassword" />
              <EyeOffIcon v-else />
            </button>
          </div>
          <span v-if="errors.newPassword" class="error-text">{{ errors.newPassword }}</span>

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
        <div class="form-field">
          <label for="confirmPassword" class="form-label">确认新密码</label>
          <div class="password-input-wrapper">
            <input
              id="confirmPassword"
              v-model="form.confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              class="form-input"
              :class="{ error: errors.confirmPassword }"
              placeholder="请再次输入新密码"
              autocomplete="new-password"
              @blur="validateConfirmPassword"
              @focus="clearFieldError('confirmPassword')"
              @input="debouncedValidateConfirmPassword"
            />
            <button
              type="button"
              class="password-toggle-btn"
              :aria-label="showConfirmPassword ? '隐藏密码' : '显示密码'"
              @click="showConfirmPassword = !showConfirmPassword"
            >
              <EyeIcon v-if="!showConfirmPassword" />
              <EyeOffIcon v-else />
            </button>
          </div>
          <span v-if="errors.confirmPassword" class="error-text">{{ errors.confirmPassword }}</span>
        </div>

        <!-- 操作按钮 -->
        <div class="dialog-actions">
          <button type="button" class="btn btn-secondary" :disabled="isSubmitting" @click="close">
            取消
          </button>
          <button type="submit" class="btn btn-primary" :disabled="!canSubmit">
            {{ isSubmitting ? '修改中…' : '确认修改' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'

import EyeIcon from '@/components/icons/EyeIcon.vue'
import EyeOffIcon from '@/components/icons/EyeOffIcon.vue'
import { changePassword } from '@/utils/api'
import { logger } from '@/utils/ui/logger'
import {
  checkPasswordStrength,
  debounce,
  validatePassword as validatePasswordUtil
} from '@/utils/validation'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
  success: []
  error: [error: { message: string }]
}>()

const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const errors = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const isSubmitting = ref(false)

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
    form.currentPassword.trim() &&
    form.newPassword.trim() &&
    form.confirmPassword.trim()
  )
})

const validateCurrentPassword = () => {
  if (!form.currentPassword.trim()) {
    errors.currentPassword = '请输入当前密码'
  } else {
    errors.currentPassword = ''
  }
}

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

const handleOverlayClick = () => {
  if (!isSubmitting.value) {
    close()
  }
}

const close = () => {
  if (!isSubmitting.value) {
    resetForm()
    emit('close')
  }
}

const resetForm = () => {
  form.currentPassword = ''
  form.newPassword = ''
  form.confirmPassword = ''
  errors.currentPassword = ''
  errors.newPassword = ''
  errors.confirmPassword = ''
  showCurrentPassword.value = false
  showNewPassword.value = false
  showConfirmPassword.value = false
  passwordStrength.showSuggestions = false
  passwordStrength.suggestions = []
}

const handleSubmit = async () => {
  if (!canSubmit.value) return

  // 验证所有字段
  validateCurrentPassword()
  validateNewPassword()
  validateConfirmPassword()

  if (hasErrors.value) {
    emit('error', { message: '请检查输入信息' })
    return
  }

  isSubmitting.value = true

  try {
    await changePassword({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword
    })
    emit('success')
    close()
  } catch (error: any) {
    logger.error('修改密码失败:', error)
    emit('error', error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.password-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: grid;
  place-items: center;
  z-index: 1000;
}

.password-dialog {
  width: min(480px, 92vw);
  background: #fff;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

.password-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
}

.password-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.password-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  font-size: 24px;
  line-height: 1;
  color: #6b7280;
  transition: all 0.2s;
}

.password-close:hover {
  background: #f3f4f6;
  color: #111827;
}

.password-form {
  padding: 20px;
}

.form-field {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.password-input-wrapper {
  position: relative;
}

.form-input {
  width: 100%;
  padding: 10px 40px 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input.error {
  border-color: #ef4444;
}

.password-toggle-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  padding: 4px;
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  transition: color 0.2s;
}

.password-toggle-btn:hover {
  color: #667eea;
}

.password-toggle-btn svg {
  width: 20px;
  height: 20px;
}

.error-text {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #ef4444;
}

.password-strength {
  margin-top: 10px;
  padding: 12px;
  background: rgba(59, 130, 246, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
  font-size: 12px;
}

.strength-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.strength-label {
  color: #6b7280;
  font-weight: 500;
  white-space: nowrap;
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
  border-radius: 2px;
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
  min-width: 30px;
  text-align: right;
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

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #f3f4f6;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
  cursor: pointer;
  border: none;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #fff;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
  background: #f9fafb;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}
</style>
