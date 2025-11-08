<template>
  <div v-if="show" class="forgot-overlay" @click="handleOverlayClick" @keydown.esc="close">
    <div class="forgot-dialog" @click.stop>
      <header class="forgot-header">
        <h3>忘记密码</h3>
        <button class="forgot-close" aria-label="关闭" @click="close">×</button>
      </header>

      <div class="forgot-content">
        <div class="info-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </div>

        <h4 class="contact-title">需要重置密码？</h4>
        <p class="forgot-description">
          为了您的账号安全，密码重置需要联系管理员处理。
        </p>

        <div class="contact-box">
          <div class="contact-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="4" width="20" height="16" rx="2"></rect>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
            </svg>
          </div>
          <div class="contact-info">
            <div class="contact-label">管理员邮箱</div>
            <div class="contact-value">admin@example.com</div>
          </div>
        </div>

        <div class="tips-box">
          <p class="tips-title">温馨提示</p>
          <ul class="tips-list">
            <li>联系管理员时，请提供您的用户名或注册邮箱</li>
            <li>为了账号安全，可能需要您提供身份验证信息</li>
            <li>密码重置申请通常会在24小时内处理完成</li>
          </ul>
        </div>

        <div class="dialog-actions">
          <button type="button" class="btn btn-primary" @click="close">
            我知道了
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const handleOverlayClick = () => {
  close()
}

const close = () => {
  emit('close')
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
  width: min(540px, 92vw);
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
  padding: 24px;
  text-align: center;
}

.info-icon {
  margin: 0 auto 20px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.info-icon svg {
  width: 32px;
  height: 32px;
  stroke-width: 2.5;
}

.contact-title {
  margin: 0 0 12px 0;
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}

.forgot-description {
  margin: 0 0 24px 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
  text-align: left;
}

.contact-box {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  margin-bottom: 24px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f9fafb;
  text-align: left;
  transition: all 0.2s;
}

.contact-box:hover {
  border-color: #667eea;
  background: #fff;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
}

.contact-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.contact-icon svg {
  width: 20px;
  height: 20px;
  stroke-width: 2;
}

.contact-info {
  flex: 1;
}

.contact-label {
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 2px;
}

.contact-value {
  font-size: 15px;
  font-weight: 600;
  color: #374151;
  user-select: all;
}

.tips-box {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  padding: 14px 18px;
  margin-bottom: 24px;
  text-align: left;
}

.tips-title {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: #92400e;
}

.tips-list {
  margin: 0;
  padding-left: 18px;
  list-style: disc;
}

.tips-list li {
  font-size: 13px;
  color: #78350f;
  line-height: 1.6;
  margin-bottom: 4px;
}

.tips-list li:last-child {
  margin-bottom: 0;
}

.dialog-actions {
  display: flex;
  justify-content: center;
  padding-top: 0;
}

.btn {
  min-width: 120px;
  padding: 11px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}
</style>
