<template>
  <div class="page page-home container">
    <section class="welcome hero">
      <div class="hero-body">
        <div class="hero-text">
          <h2 class="title gradient-text">欢迎来到社区</h2>
          <p class="subtitle">浏览精彩内容 · 关注热门话题 · 与伙伴高效交流</p>
        </div>
        <div class="hero-actions">
          <router-link to="/articles/create" class="btn primary">✏️ 发布文章</router-link>
          <router-link to="/articles" class="btn ghost">📚 浏览文章</router-link>
        </div>
        <div class="hero-actions secondary">
          <router-link to="/chatroom" class="btn secondary">💬 聊天室</router-link>
          <router-link to="/danmaku-chat" class="btn secondary">🎬 弹幕聊天</router-link>
        </div>
      </div>
    </section>

    <section v-if="user" class="user-welcome">
      <el-avatar
        :size="64"
        :src="avatarSrc || undefined"
        :style="{ backgroundColor: getAvatarColor(user.id), fontSize: '28px', fontWeight: '600' }"
      >
        {{ getAvatarInitial(user.profile?.nickname || user.username) }}
      </el-avatar>
      <div class="welcome-text">
        <h3>你好，{{ user.profile?.nickname || user.username }}！</h3>
      </div>
    </section>

    <section class="stats-grid">
      <div class="stat-card soft">
        <div class="stat-label">活跃社区</div>
        <div class="stat-value">优质内容等你发现</div>
      </div>
      <div class="stat-card soft">
        <div class="stat-label">快捷操作</div>
        <div class="stat-value">发布、探索、互动</div>
      </div>
    </section>

    <section class="community-section">
      <CommunityFeed />
    </section>
  </div>
</template>

<script lang="ts">
export default {
  name: 'HomeView'
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'

import CommunityFeed from '@/components/home/CommunityFeed.vue'
import { STORAGE_KEYS } from '@/config/storage-keys'
import type { User } from '@/types'
import { getAvatarInitial, getAvatarColor, hasValidAvatar } from '@/utils/avatar'

const user = ref<User | null>(null)

// 计算带版本号的头像 URL（用于破除浏览器缓存）
const avatarSrc = computed(() => {
  const u = user.value as any
  if (!u?.avatar) return ''
  // 检查头像是否有效
  if (!hasValidAvatar(u.avatar)) return ''
  // 添加版本号参数破缓存
  const v = u.avatar_version || u.updatedAt || Date.now()
  const sep = u.avatar.includes('?') ? '&' : '?'
  return `${u.avatar}${sep}v=${v}`
})

// 读取用户信息
function loadUserInfo() {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEYS.USER_INFO) || sessionStorage.getItem(STORAGE_KEYS.USER_INFO)
    if (raw) {
      user.value = JSON.parse(raw) as User
    }
  } catch (e: unknown) {
    if (import.meta.env.DEV) console.warn('读取用户信息失败', e)
  }
}

// 监听用户信息更新事件
function handleUserUpdated(e: Event) {
  const customEvent = e as CustomEvent
  // 事件的 detail 直接就是 user 对象
  if (customEvent.detail) {
    user.value = customEvent.detail as User
  } else {
    // 如果事件没有携带用户数据，从 localStorage 重新读取
    loadUserInfo()
  }
}

onMounted(() => {
  loadUserInfo()
  // 监听用户信息更新事件（头像更新、资料更新等）
  window.addEventListener('user:updated', handleUserUpdated as EventListener)
})

onUnmounted(() => {
  // 清理事件监听
  window.removeEventListener('user:updated', handleUserUpdated as EventListener)
})
</script>

<style scoped>
.page-home {
  padding: 24px;
  display: grid;
  gap: 16px;
}

.user-welcome {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(17, 24, 39, 0.04);
}

.welcome-text h3 {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 4px 0;
}

.welcome-text p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}
.hero {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.12), rgba(118, 75, 162, 0.12));
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 16px;
  box-shadow: 0 8px 20px rgba(17, 24, 39, 0.04);
}
.hero-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 18px;
}
.hero-text {
  display: grid;
  gap: 6px;
  text-align: center;
  width: 100%;
}
.title {
  font-size: 22px;
  font-weight: 800;
  color: #111827;
  letter-spacing: 0.2px;
}
.gradient-text {
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-dark));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.subtitle {
  color: #6b7280;
  margin-top: 2px;
}
.hero-actions {
  display: flex;
  gap: 10px;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 600;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all var(--transition-normal, 300ms ease-in-out);
}
.btn.primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: #fff;
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.25);
}
.btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 24px rgba(102, 126, 234, 0.3);
}
.btn.ghost {
  background: #fff;
  color: var(--color-primary);
  border: 1px solid #e5e7eb;
}
.btn.ghost:hover {
  background: #f9fafb;
}
.btn.secondary {
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-primary);
  border: 1px solid rgba(99, 102, 241, 0.2);
  font-size: 14px;
  padding: 8px 14px;
}
.btn.secondary:hover {
  background: rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.3);
  transform: translateY(-1px);
}
.hero-actions.secondary {
  margin-top: 4px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.stat-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 4px 12px rgba(17, 24, 39, 0.04);
}
.stat-card.soft {
  background: #f9fafb;
  border-style: dashed;
}
.stat-label {
  font-size: 12px;
  color: #6b7280;
}
.stat-value {
  margin-top: 6px;
  font-weight: 700;
  color: #111827;
}

.community-section {
  background: transparent;
}

@media (max-width: 768px) {
  .hero-body {
    flex-direction: column;
    align-items: flex-start;
  }
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
