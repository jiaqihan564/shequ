<template>
  <div class="profile container">
    <header class="profile-header">
      <h2 class="title">个人资料</h2>
      <p class="sub">查看与更新您的账户信息</p>
    </header>

    <section class="card">
      <div class="card-body">
        <div class="avatar-section">
          <img v-if="showAvatar && form.avatar" :src="form.avatar" alt="avatar" class="avatar" @error="onAvatarError" />
          <div v-else class="avatar-fallback">{{ avatarInitial }}</div>
        </div>

        <form class="form" @submit.prevent="onSubmit">
          <h3 class="section-title">基本信息</h3>
          <div class="grid-2">
            <div class="field">
              <label for="username">用户名</label>
              <input id="username" v-model.trim="form.username" type="text" placeholder="请输入用户名" />
            </div>
            <div class="field">
              <label for="email">邮箱</label>
              <input id="email" v-model.trim="form.email" type="email" placeholder="name@example.com" />
            </div>
            <div class="field">
              <label for="nickname">昵称</label>
              <input id="nickname" v-model.trim="form.profile.nickname" type="text" placeholder="请输入昵称" />
            </div>
            <div class="field">
              <label for="address">住址</label>
              <div class="address-inline">
                <input id="address" :value="addressDisplay" type="text" disabled readonly title="住址由系统自动检测，无法手动修改" />
                <button class="btn ghost" type="button" @click="onDetectAddress" :disabled="detecting">
                  {{ detecting ? '定位中…' : (form.profile.province ? '重新检测' : '获取当前位置') }}
                </button>
              </div>
            </div>
          </div>

          <div class="grid-2">
            <div class="field full">
              <label for="bio">个人简介</label>
              <textarea id="bio" v-model.trim="form.profile.bio" rows="4" placeholder="一句话介绍自己"></textarea>
            </div>
          </div>

          <div class="actions">
            <button class="btn" type="submit" :disabled="saving">
              <LoadingSpinner v-if="saving" size="small" inline text="保存中" />
              <span v-else>保存更改</span>
            </button>
            <button class="btn secondary" type="button" @click="onReset" :disabled="saving">重置</button>
          </div>
        </form>
      </div>
    </section>

    <NotificationToast
      :show="toast.show"
      :type="toast.type"
      :message="toast.message"
      @close="toast.show = false"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, watch } from 'vue'
import type { User } from '@/types'
import { getCurrentUser, updateUser } from '@/utils/api'
import { ensureRegionsLoaded, useRegions } from '@/utils/regions'
import { readDetectedRegion, detectCurrentRegion } from '@/utils/geo'
import LoadingSpinner from '@/shared/ui/LoadingSpinner.vue'
import NotificationToast from '@/shared/ui/NotificationToast.vue'

type ToastType = 'success' | 'error' | 'warning' | 'info'

const showAvatar = ref(true)
const saving = ref(false)
const { municipalities } = useRegions()
const isMunicipality = computed(() => municipalities.value.has(form.profile.province || ''))
const addressValue = ref('')
const addressDisplay = computed(() => {
  const prov = form.profile.province || ''
  const city = form.profile.city || ''
  if (!prov && !city) return '未设置'
  return municipalities.value.has(prov) ? prov : [prov, city].filter(Boolean).join(' - ')
})
const initialUser = ref<User | null>(null)
const detecting = ref(false)

const form = reactive<User>({
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

const toast = reactive<{ show: boolean; type: ToastType; message: string }>({
  show: false,
  type: 'success',
  message: ''
})

const displayName = computed(() => form.username || form.email || '')
const avatarInitial = computed(() => (displayName.value ? displayName.value.charAt(0).toUpperCase() : '?'))

function onAvatarError() {
  showAvatar.value = false
}

function showToast(type: ToastType, message: string) {
  toast.type = type
  toast.message = message
  toast.show = true
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
    addressValue.value = municipalities.has(form.profile.province)
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
  } catch {}
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
          addressValue.value = (detected.city && detected.province && !municipalities.value.has(detected.province))
            ? `${detected.province}|${detected.city}`
            : (detected.province || '')
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
  if (form.username !== u.username) payload.username = form.username
  if (form.email !== u.email) payload.email = form.email
  // 头像地址由独立入口维护，这里不更新

  const profilePayload: any = {}
  const p = u.profile || {}
  if ((form.profile?.nickname || '') !== (p.nickname || '')) profilePayload.nickname = form.profile?.nickname || ''
  if ((form.profile?.bio || '') !== (p.bio || '')) profilePayload.bio = form.profile?.bio || ''
  if ((form.profile?.province || '') !== (p.province || '')) profilePayload.province = form.profile?.province || ''
  if (!isMunicipality.value) {
    if ((form.profile?.city || '') !== (p.city || '')) profilePayload.city = form.profile?.city || ''
  } else if (p.city) {
    // 直辖市下清空 city
    profilePayload.city = ''
  }
  // 兼容旧字段：location （直辖市为省名，其他为 省 市）
  const newLocation = isMunicipality.value
    ? (form.profile?.province || '')
    : [form.profile?.province || '', form.profile?.city || ''].filter(Boolean).join(' ')
  if ((newLocation || '') !== (p.location || '')) profilePayload.location = newLocation
  if (Object.keys(profilePayload).length > 0) payload.profile = profilePayload
  return payload
}

// 双向同步 addressValue 与 province/city
watch(addressValue, (val) => {
  if (!val) {
    form.profile.province = ''
    form.profile.city = ''
    return
  }
  if (municipalities.has(val)) {
    form.profile.province = val
    form.profile.city = ''
    return
  }
  const [prov, city = ''] = val.split('|')
  form.profile.province = prov || ''
  form.profile.city = city
})

watch(() => [form.profile.province, form.profile.city] as const, ([prov, city]) => {
  if (!prov) {
    addressValue.value = ''
    return
  }
  addressValue.value = municipalities.has(prov) ? prov : `${prov}|${city || ''}`
})

async function onSubmit() {
  const payload = buildPayload()
  if (Object.keys(payload).length === 0) {
    showToast('info', '没有需要保存的更改')
    return
  }
  saving.value = true
  try {
    const updated = await updateUser(payload)
    initialUser.value = updated
    fillForm(updated)
    showAvatar.value = true
    showToast('success', '已保存更改')
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
</script>

<style scoped>
.profile { display: grid; gap: 16px; }
.container { max-width: 960px; margin: 0 auto; }
.profile-header { display: flex; flex-direction: column; gap: 6px; }
.title { font-size: 18px; font-weight: 700; color: #111827; }
.sub { font-size: 13px; color: #6b7280; }

.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; }
.card-body { padding: 20px; display: grid; gap: 16px; }

.avatar-section { display: flex; align-items: center; gap: 12px; }
.avatar { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 1px solid #e5e7eb; }
.avatar-fallback { width: 64px; height: 64px; border-radius: 50%; background: #e5e7eb; color: #374151; display: grid; place-items: center; font-weight: 700; font-size: 20px; }

.form { display: grid; gap: 20px; }
.section-title { font-size: 14px; font-weight: 700; color: #374151; margin: 4px 0; }
.grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.field { display: grid; gap: 6px; }
.field.full { grid-column: 1 / -1; }
label { font-size: 12px; color: #6b7280; }
input, textarea, select { padding: 8px 10px; border: 1px solid #e5e7eb; border-radius: 8px; outline: none; background: #fff; }
input:focus, textarea:focus, select:focus { border-color: #9ca3af; box-shadow: 0 0 0 3px rgba(156,163,175,0.2); }
.address-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.actions { display: flex; gap: 10px; justify-content: flex-end; }
.btn { padding: 8px 12px; border: 1px solid #e5e7eb; background: #111827; color: #fff; border-radius: 8px; cursor: pointer; }
.btn[disabled] { opacity: 0.6; cursor: not-allowed; }
.btn.secondary { background: #fff; color: #111827; }

@media (max-width: 640px) {
  .grid-2 { grid-template-columns: 1fr; }
}
</style>


