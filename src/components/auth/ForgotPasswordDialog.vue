<template>
  <div v-if="show" class="forgot-overlay" @click="handleOverlayClick" @keydown.esc="close">
    <div class="forgot-dialog" @click.stop>
      <header class="forgot-header">
        <h3>忘记密码</h3>
        <button class="forgot-close" aria-label="关闭" @click="close">×</button>
      </header>

      <div class="forgot-content">
        <p class="forgot-description">请输入您注册时使用的邮箱地址，我们将为您生成重置密码的链接。</p>

        <form class="forgot-form" @submit.prevent="handleSubmit">
          <div class="form-field">
            <label for="email" class="form-label">邮箱地址</label>
            <div class="input-wrapper">
              <input
                id="email"
                v-model="email"
                :type="showEmail ? 'text' : 'password'"
                class="form-input"
                :class="{ error: error }"
                placeholder="请输入完整邮箱地址"
                autocomplete="email"
                :disabled="isSubmitting"
                @blur="validateEmail"
                @focus="clearError"
              />
              <button
                type="button"
                class="email-toggle-btn"
                :aria-label="showEmail ? '隐藏邮箱' : '显示邮箱'"
                @click="showEmail = !showEmail"
              >
                <EyeIcon v-if="!showEmail" />
                <EyeOffIcon v-else />
              </button>
            </div>
            <span v-if="error" class="error-text">{{ error }}</span>
          </div>

          <div class="dialog-actions">
            <button
              type="button"
              class="btn btn-secondary"
              :disabled="isSubmitting"
              @click="close"
            >
              取消
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="!canSubmit"
            >
              {{ isSubmitting ? '验证中…' : '下一步' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

import EyeIcon from '@/components/icons/EyeIcon.vue'
import EyeOffIcon from '@/components/icons/EyeOffIcon.vue'
import { forgotPassword } from '@/utils/api'
import { validateEmail as validateEmailUtil } from '@/utils/validation'
import { logger } from '@/utils/ui/logger'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
  error: [error: { message: string }]
}>()

const router = useRouter()

const email = ref('')
const error = ref('')
const isSubmitting = ref(false)
const resetToken = ref('')
const showEmail = ref(false)

const canSubmit = computed(() => {
  return !isSubmitting.value && email.value.trim() && !error.value
})

const validateEmail = () => {
  const emailValue = email.value.trim()
  if (!emailValue) {
    error.value = '请输入邮箱地址'
    return false
  }
  const emailError = validateEmailUtil(emailValue)
  if (emailError) {
    error.value = emailError
    return false
  }
  error.value = ''
  return true
}

const clearError = () => {
  error.value = ''
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
  email.value = ''
  error.value = ''
}

const handleSubmit = async () => {
  if (!canSubmit.value) return

  if (!validateEmail()) {
    return
  }

  isSubmitting.value = true

  try {
    const response = await forgotPassword(email.value.trim())
    // API返回包含token的响应
    if (response && response.token) {
      resetToken.value = response.token
      // 直接跳转到重置密码页面，不显示token
      goToResetPassword()
    }
  } catch (err: any) {
    logger.error('忘记密码失败:', err)
    emit('error', err)
  } finally {
    isSubmitting.value = false
  }
}

const goToResetPassword = () => {
  // 导航到重置密码页面，带上token参数（用户无需看到token）
  const token = resetToken.value
  resetForm()
  emit('close')
  router.push(`/reset-password?token=${encodeURIComponent(token)}`)
}
</script>

<style scoped>
.forgot-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: grid;
  place-items: center;
  z-index: 1000;
}

.forgot-dialog {
  width: min(500px, 92vw);
  background: #fff;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

.forgot-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
}

.forgot-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.forgot-close {
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

.forgot-close:hover {
  background: #f3f4f6;
  color: #111827;
}

.forgot-content {
  padding: 20px;
}

.forgot-description {
  margin: 0 0 20px 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
}

.forgot-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-field {
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
  padding: 10px 40px 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  letter-spacing: 0;
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

.email-toggle-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  padding: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 4px;
}

.email-toggle-btn:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.email-toggle-btn:active {
  transform: translateY(-50%) scale(0.95);
}

.email-toggle-btn svg {
  width: 20px;
  height: 20px;
  display: block;
}

.error-text {
  margin-top: 6px;
  font-size: 12px;
  color: #ef4444;
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

