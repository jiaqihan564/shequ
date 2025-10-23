<template>
  <div class="profile container">
    <header class="profile-header">
      <h2 class="title">个人资料</h2>
      <p class="sub">查看与更新你的账户信息</p>
      <div class="header-actions">
        <button v-if="!isEditing" class="btn ghost sm" type="button" @click="startEdit">
          编辑资料
        </button>
        <template v-else>
          <button class="btn secondary sm" type="button" :disabled="saving" @click="cancelEdit">
            取消
          </button>
          <button class="btn sm" type="button" :disabled="saving" @click="onSubmit">保存</button>
        </template>
      </div>
    </header>

    <section class="card">
      <div class="card-body">
        <div class="avatar-section">
          <img
            v-if="showAvatar && form.avatar"
            :src="avatarSrc"
            alt="avatar"
            class="avatar clickable"
            @error="onAvatarError"
            @click="openAvatarPreview"
          />
          <div v-else class="avatar-fallback clickable" @click="openAvatarPreview">
            {{ avatarInitial }}
          </div>
          <div class="avatar-actions">
            <input
              ref="fileInputRef"
              type="file"
              accept="image/png"
              class="sr-only"
              :disabled="uploading"
              @change="onPickAvatar"
            />
            <button
              class="btn secondary sm"
              type="button"
              :disabled="uploading"
              @click="triggerPickAvatar"
            >
              {{ uploading ? '上传中…' : '更换头像' }}
            </button>
            <button class="btn ghost sm" type="button" @click="openAvatarPreview">查看大图</button>
            <button
              class="btn ghost sm"
              type="button"
              :disabled="historyLoading"
              @click="openAvatarHistory"
            >
              {{ historyLoading ? '加载历史…' : '查看历史头像' }}
            </button>
          </div>
        </div>

        <form class="form" @submit.prevent="onSubmit">
          <h3 class="section-title">基本信息</h3>
          <div class="grid-2">
            <div class="field">
              <label for="username">用户名</label>
              <input
                id="username"
                v-model.trim="form.username"
                type="text"
                placeholder="请输入用户名"
                disabled
                title="用户名由系统管理，暂不支持在线修改。如需变更请联系管理员"
              />
            </div>
            <div class="field">
              <label for="email">邮箱</label>
              <div class="input-with-icon">
                <input
                  id="email"
                  v-model.trim="form.email"
                  :type="showEmail ? 'text' : 'password'"
                  placeholder="name@example.com"
                  disabled
                  title="邮箱用于登录与通知，暂不支持在此修改。如需变更请联系管理员"
                />
                <button
                  type="button"
                  class="field-toggle-btn"
                  :aria-label="showEmail ? '隐藏邮箱' : '显示邮箱'"
                  @click="showEmail = !showEmail"
                >
                  <EyeIcon v-if="!showEmail" />
                  <EyeOffIcon v-else />
                </button>
              </div>
            </div>
            <div class="field">
              <label for="nickname">昵称</label>
              <input
                id="nickname"
                v-model.trim="form.profile.nickname"
                type="text"
                placeholder="请输入昵称"
                :disabled="!isEditing || saving"
              />
            </div>
            <div class="field">
              <label for="address">地址</label>
              <div class="address-inline">
                <input
                  id="address"
                  :value="addressDisplay"
                  type="text"
                  disabled
                  readonly
                  title="地址由系统自动检测，无法手动修改"
                />
                <button
                  class="btn ghost"
                  type="button"
                  :disabled="detecting"
                  @click="onDetectAddress"
                >
                  {{ detecting ? '定位中…' : form.profile.province ? '重新检测' : '获取当前位置' }}
                </button>
              </div>
            </div>
          </div>

          <div class="grid-2">
            <div class="field full">
              <label for="bio">个人简介</label>
              <textarea
                id="bio"
                v-model.trim="form.profile.bio"
                rows="4"
                placeholder="一句话介绍自己"
                :disabled="!isEditing || saving"
              ></textarea>
            </div>
          </div>

          <div v-if="isEditing" class="actions">
            <button class="btn" type="submit" :disabled="saving">
              <LoadingSpinner v-if="saving" size="small" inline text="保存中…" />
              <span v-else>保存修改</span>
            </button>
            <button class="btn secondary" type="button" :disabled="saving" @click="onReset">
              重置
            </button>
          </div>
        </form>

        <!-- 安全设置区域 -->
        <div class="security-section">
          <h3 class="section-title">安全设置</h3>
          <div class="security-item">
            <div class="security-info">
              <h4>登录密码</h4>
              <p class="security-desc">定期更换密码，保护账户安全</p>
            </div>
            <button class="btn ghost sm" type="button" @click="openChangePasswordDialog">
              修改密码
            </button>
          </div>
        </div>
      </div>
    </section>

    <ImagePreview
      :show="avatarPreviewOpen"
      :src="avatarSrc || null"
      :initial="avatarInitial"
      @close="avatarPreviewOpen = false"
    />

    <div
      v-if="historyOpen"
      class="history-overlay"
      tabindex="-1"
      @click.self="closeAvatarHistory"
      @keydown.esc="closeAvatarHistory"
    >
      <div class="history-dialog">
        <header class="history-header">
          <h3>历史头像</h3>
          <button class="history-close" aria-label="关闭" @click="closeAvatarHistory">×</button>
        </header>
        <div v-if="historyError" class="history-error">{{ historyError }}</div>
        <div v-else-if="historyLoading" class="history-loading">
          <LoadingSpinner size="small" inline text="加载中…" />
        </div>
        <div v-else class="history-grid">
          <div
            v-for="item in historyItems"
            :key="item.key"
            class="history-item"
            :title="formatSize(item.size) + ' • ' + formatTime(item.last_modified)"
            @click="previewHistory(item)"
          >
            <img :src="buildHistoryThumb(item)" alt="历史头像" @error="onHistoryImgError($event)" />
          </div>
          <div v-if="!historyItems.length" class="history-empty">暂无历史头像</div>
        </div>
      </div>
    </div>

    <ImagePreview
      :show="historyPreviewOpen"
      :src="historyPreviewUrl"
      :initial="avatarInitial"
      @close="historyPreviewOpen = false"
    />

    <ChangePasswordDialog
      :show="changePasswordDialogOpen"
      @close="changePasswordDialogOpen = false"
      @success="handleChangePasswordSuccess"
      @error="handleChangePasswordError"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, watch } from 'vue'

import ChangePasswordDialog from '@/components/profile/ChangePasswordDialog.vue'
import EyeIcon from '@/components/icons/EyeIcon.vue'
import EyeOffIcon from '@/components/icons/EyeOffIcon.vue'
import ImagePreview from '@/shared/ui/ImagePreview.vue'
import LoadingSpinner from '@/shared/ui/LoadingSpinner.vue'
import type { User, UserProfile, AvatarHistoryItem } from '@/types'
import {
  getCurrentUser,
  updateUser,
  uploadImage,
  getAvatarHistory
} from '@/utils/api'
import { readDetectedRegion, detectCurrentRegion } from '@/utils/geo'
import { ensureRegionsLoaded, useRegions } from '@/utils/regions'
import { toast as toastQueue } from '@/utils/toast'

type ToastType = 'success' | 'error' | 'warning' | 'info'

const showAvatar = ref(true)
const saving = ref(false)
const avatarPreviewOpen = ref(false)
const isEditing = ref(false)
const uploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const changePasswordDialogOpen = ref(false)
const showEmail = ref(false)
const { municipalities } = useRegions()
const addressValue = ref('')
const addressDisplay = computed(() => {
  const prov = form.profile.province || ''
  const city = form.profile.city || ''
  if (!prov && !city) return '未设置'
  return municipalities.value.has(prov) ? prov : [prov, city].filter(Boolean).join(' - ')
})
const initialUser = ref<User | null>(null)
const detecting = ref(false)

// 历史头像相关状态
const historyOpen = ref(false)
const historyLoading = ref(false)
const historyError = ref('')
const historyItems = ref<AvatarHistoryItem[]>([])
const historyPreviewOpen = ref(false)
const historyPreviewUrl = ref<string | null>(null)

// 使 profile 成为必填，避免模板与脚本中出现可空类型
type UserWithProfile = Omit<User, 'profile'> & { profile: UserProfile }

const form = reactive<UserWithProfile>({
  id: 0,
  username: '',
  email: '',
  auth_status: 0,
  account_status: 0,
  avatar: '',
  role: 'user',
  status: 'active',
  profile: {
    nickname: '',
    bio: '',
    province: '',
    city: ''
  }
})

// 使用全局 toast 队列，不再本地维护 show/type/message

const displayName = computed(() => form.username || form.email || '')
const avatarInitial = computed(() =>
  displayName.value ? displayName.value.charAt(0).toUpperCase() : '?'
)
const avatarSrc = computed(() => {
  const url = form.avatar || ''
  if (!url) return ''
  // 从本地存储中读取版本，或用时间戳兜底
  let v = 0
  try {
    const raw = localStorage.getItem('user_info') || sessionStorage.getItem('user_info')
    if (raw) {
      const u = JSON.parse(raw)
      v = u.avatar_version || u.updatedAt || 0
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn('读取头像版本失败', e)
  }
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${v ? `${sep}v=${v}` : ''}`
})

function onAvatarError() {
  showAvatar.value = false
}

function openAvatarPreview() {
  avatarPreviewOpen.value = true
}

async function openAvatarHistory() {
  historyOpen.value = true
  historyLoading.value = true
  historyError.value = ''
  try {
    const items = await getAvatarHistory()
    historyItems.value = items
  } catch (e: any) {
    historyError.value = e?.message || '加载历史头像失败'
  } finally {
    historyLoading.value = false
  }
}

function closeAvatarHistory() {
  historyOpen.value = false
}

function buildHistoryThumb(item: AvatarHistoryItem): string {
  const url = item.url || ''
  const v = item.last_modified || 0
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${v ? `${sep}v=${v}` : ''}`
}

function previewHistory(item: AvatarHistoryItem) {
  historyPreviewUrl.value = buildHistoryThumb(item)
  historyPreviewOpen.value = true
}

function onHistoryImgError(event: Event) {
  const el = event.target as HTMLImageElement
  el.style.visibility = 'hidden'
}

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function formatTime(ts: number): string {
  try {
    const d = new Date(ts * 1000)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return ''
  }
}

async function onPickAvatar(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files && input.files[0]
  if (!file) return
  // 仅允许 PNG
  const isPngType = file.type === 'image/png'
  const isPngExt = /\.png$/i.test(file.name)
  if (!isPngType || !isPngExt) {
    showToast('error', '仅支持 PNG 格式的头像文件')
    ;(event.target as HTMLInputElement).value = ''
    return
  }
  try {
    uploading.value = true
    // 上传头像文件（后端会自动更新数据库）
    const url = await uploadImage(file)
    // 立即更新预览
    form.avatar = url
    // 从服务器重新获取最新的用户信息（包括头像URL）
    const updated = await getCurrentUser()
    initialUser.value = updated
    // 同步表单数据
    if (updated && updated.avatar) {
      form.avatar = updated.avatar
    }
    showToast('success', '头像已更新')
  } catch (e: any) {
    showToast('error', e?.message || '头像上传失败')
  } finally {
    uploading.value = false
    ;(event.target as HTMLInputElement).value = ''
  }
}
function triggerPickAvatar() {
  fileInputRef.value?.click()
}

function showToast(type: ToastType, message: string) {
  if (type === 'success') toastQueue.success(message)
  else if (type === 'error') toastQueue.error(message)
  else if (type === 'warning') toastQueue.warning(message)
  else toastQueue.info(message)
}

function fillForm(user: User) {
  form.id = user.id
  form.username = user.username || ''
  form.email = user.email || ''
  form.auth_status = user.auth_status || 0
  form.account_status = user.account_status || 0
  form.avatar = user.avatar || user.avatar_url || ''
  form.role = user.role || 'user'
  form.status = user.status || 'active'
  form.profile = {
    nickname: user.profile?.nickname || user.username || '',
    bio: user.profile?.bio || '',
    province: user.profile?.province || '',
    city: user.profile?.city || ''
  }
  // 同步 addressValue
  if (form.profile.province) {
    addressValue.value = municipalities.value.has(form.profile.province)
      ? form.profile.province
      : `${form.profile.province}|${form.profile.city || ''}`
  } else {
    addressValue.value = ''
  }
}

onMounted(async () => {
  await ensureRegionsLoaded()
  let user: User | null = null
  try {
    const raw = localStorage.getItem('user_info') || sessionStorage.getItem('user_info')
    if (raw) user = JSON.parse(raw)
  } catch (e) {
    if (import.meta.env.DEV) console.warn('读取用户信息失败', e)
  }
  try {
    if (!user) {
      user = await getCurrentUser()
    }
    if (user) {
      initialUser.value = user
      fillForm(user)
      // 若用户未设置省/市，尝试用登录时缓存的定位结果预填
      if (!form.profile.province) {
        const detected = readDetectedRegion()
        if (detected && (detected.province || detected.city)) {
          form.profile.province = detected.province || ''
          form.profile.city = detected.city || ''
          // 同步 addressValue
          addressValue.value =
            detected.city && detected.province && !municipalities.value.has(detected.province)
              ? `${detected.province}|${detected.city}`
              : detected.province || ''
        }
      }
    }
  } catch (error: any) {
    showToast('error', error?.message || '加载用户信息失败')
  }
})

function buildPayload(): Partial<User> {
  const payload: Partial<User> = {}
  if (!initialUser.value) return payload
  const u = initialUser.value
  // 用户名与邮箱不允许在此页面修改
  // 头像地址由独立入口维护，这里不更新
  // 仅允许修改昵称与个人简介
  const profilePayload: any = {}
  const p = u.profile || {}
  
  // 只在字段有实际内容且与原值不同时才更新
  const newNickname = (form.profile?.nickname || '').trim()
  const oldNickname = (p.nickname || '').trim()
  if (newNickname && newNickname !== oldNickname) {
    profilePayload.nickname = newNickname
  }
  
  const newBio = (form.profile?.bio || '').trim()
  const oldBio = (p.bio || '').trim()
  if (newBio && newBio !== oldBio) {
    profilePayload.bio = newBio
  }
  
  if (Object.keys(profilePayload).length > 0) payload.profile = profilePayload
  return payload
}

// 双向同步 addressValue 与 province/city
watch(addressValue, val => {
  if (!val) {
    form.profile.province = ''
    form.profile.city = ''
    return
  }
  if (municipalities.value.has(val)) {
    form.profile.province = val
    form.profile.city = ''
    return
  }
  const [prov, city = ''] = val.split('|')
  form.profile.province = prov || ''
  form.profile.city = city
})

watch(
  () => [form.profile.province, form.profile.city] as const,
  ([prov, city]) => {
    if (!prov) {
      addressValue.value = ''
      return
    }
    addressValue.value = municipalities.value.has(prov) ? prov : `${prov}|${city || ''}`
  }
)

async function onSubmit() {
  const payload = buildPayload()
  if (Object.keys(payload).length === 0) {
    showToast('info', '没有需要保存的更改')
    return
  }
  saving.value = true
  try {
    // 保留当前地址（与后端无关）
    const prevProvince = form.profile.province
    const prevCity = form.profile.city
    const updated = await updateUser(payload)
    initialUser.value = updated
    fillForm(updated)
    // 恢复地址，避免被返回数据覆盖
    form.profile.province = prevProvince
    form.profile.city = prevCity
    showAvatar.value = true
    showToast('success', '已保存更改')
    isEditing.value = false
  } catch (error: any) {
    showToast('error', error?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

function onReset() {
  if (initialUser.value) {
    fillForm(initialUser.value)
    showAvatar.value = true
  }
}

async function onDetectAddress() {
  detecting.value = true
  try {
    const detected = await detectCurrentRegion(true)
    if (detected && (detected.province || detected.city)) {
      form.profile.province = detected.province || ''
      form.profile.city = detected.city || ''
      showToast('success', '已更新当前位置')
    } else {
      showToast('warning', '未能获取到当前位置')
    }
  } catch (e: any) {
    showToast('error', e?.message || '定位失败，请检查浏览器定位权限')
  } finally {
    detecting.value = false
  }
}

function startEdit() {
  isEditing.value = true
}

function cancelEdit() {
  onReset()
  isEditing.value = false
}

// 修改密码相关
function openChangePasswordDialog() {
  changePasswordDialogOpen.value = true
}

function handleChangePasswordSuccess() {
  showToast('success', '密码修改成功，请重新登录')
  // 密码修改成功后，清除认证信息并跳转到登录页
  setTimeout(() => {
    localStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_token')
    localStorage.removeItem('user_info')
    sessionStorage.removeItem('user_info')
    window.location.href = '/login'
  }, 1500)
}

function handleChangePasswordError(error: { message: string }) {
  showToast('error', error?.message || '修改密码失败')
}
</script>

<style scoped>
.profile {
  display: grid;
  gap: 16px;
}
.container {
  max-width: 960px;
  margin: 0 auto;
}
.profile-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.header-actions {
  margin-top: 6px;
  display: flex;
  gap: 8px;
}
.title {
  font-size: 20px;
  font-weight: 800;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-dark));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  letter-spacing: 0.2px;
}
.sub {
  font-size: 13px;
  color: #6b7280;
}

.card {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 10px 24px rgba(17, 24, 39, 0.06);
  backdrop-filter: saturate(140%) blur(6px);
}
.card-body {
  padding: 22px;
  display: grid;
  gap: 16px;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 12px;
}
.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #e5e7eb;
}
.avatar-fallback {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #e5e7eb;
  color: #374151;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 20px;
}
.avatar.clickable,
.avatar-fallback.clickable {
  cursor: zoom-in;
}
.avatar-actions {
  display: flex;
  gap: 8px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.form {
  display: grid;
  gap: 20px;
}
.section-title {
  font-size: 14px;
  font-weight: 700;
  color: #374151;
  margin: 4px 0;
}
.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.field {
  display: grid;
  gap: 6px;
}
.field.full {
  grid-column: 1 / -1;
}
.input-with-icon {
  position: relative;
  width: 100%;
}
.input-with-icon input {
  width: 100%;
  padding-right: 40px !important;
}
.field-toggle-btn {
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
.field-toggle-btn:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}
.field-toggle-btn svg {
  width: 18px;
  height: 18px;
  display: block;
}
label {
  font-size: 12px;
  color: #6b7280;
}
input,
textarea,
select {
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  outline: none;
  background: #fff;
  transition: all var(--transition-normal, 300ms ease-in-out);
}
input:focus,
textarea:focus,
select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}
.address-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.address-inline {
  display: flex;
  align-items: center;
  gap: 8px;
}
.address-inline > input {
  flex: 1;
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
.btn {
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 600;
  transition: all var(--transition-normal, 300ms ease-in-out);
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: #fff;
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.18);
  border: none;
}
.btn.sm {
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 13px;
}
.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 26px rgba(102, 126, 234, 0.24);
}
.btn[disabled] {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
}
.btn.secondary {
  background: #fff;
  color: #111827;
  border: 1px solid #e5e7eb;
  box-shadow: none;
}
.btn.secondary:hover {
  background: #f9fafb;
}
.btn.ghost {
  background: #fff;
  color: var(--color-primary);
  border: 1px solid #e5e7eb;
  box-shadow: none;
}
.btn.ghost:hover {
  background: #f9fafb;
}

@media (max-width: 640px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
  .address-inline {
    flex-direction: column;
    align-items: stretch;
  }
}

/* 安全设置区域样式 */
.security-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f3f4f6;
}

.security-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #f9fafb;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
}

.security-info h4 {
  margin: 0 0 4px 0;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.security-desc {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

/* 历史头像弹窗样式 */
.history-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: grid;
  place-items: center;
  z-index: 1000;
}
.history-dialog {
  width: min(960px, 92vw);
  max-height: 86vh;
  background: #fff;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  display: grid;
  grid-template-rows: auto 1fr;
}
.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid #f3f4f6;
}
.history-header h3 {
  margin: 0;
  font-size: 16px;
}
.history-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
}
.history-close:hover {
  background: #f3f4f6;
}
.history-loading,
.history-error {
  padding: 16px;
}
.history-grid {
  padding: 14px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 12px;
  overflow: auto;
}
.history-item {
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  cursor: zoom-in;
  background: #fafafa;
}
.history-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.history-empty {
  grid-column: 1 / -1;
  text-align: center;
  color: #6b7280;
  padding: 20px 0;
}
</style>
