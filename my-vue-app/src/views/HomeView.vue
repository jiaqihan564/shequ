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

    <section class="user-welcome" v-if="user">
      <el-avatar
        :size="64"
        :src="hasValidAvatar(user.avatar) ? user.avatar : undefined"
        :style="{ backgroundColor: getAvatarColor(user.id), fontSize: '28px', fontWeight: '600' }"
      >
        {{ getAvatarInitial(user.profile?.nickname || user.username) }}
      </el-avatar>
      <div class="welcome-text">
        <h3>你好，{{ user.profile?.nickname || user.username }}！</h3>
        <p>当前身份：{{ user.role || '用户' }}</p>
      </div>
    </section>

    <section class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">当前身份</div>
        <div class="stat-value">{{ user?.role || '用户' }}</div>
      </div>
      <div class="stat-card soft">
        <div class="stat-label">活跃社区</div>
        <div class="stat-value">优质内容等你发现</div>
      </div>
      <div class="stat-card soft">
        <div class="stat-label">快捷操作</div>
        <div class="stat-value">发布、探索、互动</div>
      </div>
    </section>

    <section class="news-section">
      <h3 class="section-title">热点新闻</h3>
      <NewsCarousel :items="news" :isLoading="loadingNews" :intervalMs="5000" />
    </section>
  </div>
</template>

<script lang="ts">
export default {
  name: 'HomeView'
}
</script>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'

import type { User } from '@/types'
import type { NewsItem } from '@/types'
import { fetchNews } from '@/utils/api'
import NewsCarousel from '@/components/news/NewsCarousel.vue'
import toast from '@/utils/toast'
import { getAvatarInitial, getAvatarColor, hasValidAvatar } from '@/utils/avatar'

const user = ref<User | null>(null)
const news = ref<NewsItem[]>([])
const loadingNews = ref<boolean>(false)
let newsTimer: number | null = null

onMounted(() => {
  try {
    const raw = localStorage.getItem('user_info') || sessionStorage.getItem('user_info')
    if (raw) user.value = JSON.parse(raw)
  } catch (e) {
    if (import.meta.env.DEV) console.warn('读取用户信息失败', e)
  }

  // 首屏预取新闻
  void loadNews()
  // 分钟级轮询（页面可见时）
  startPolling()
  document.addEventListener('visibilitychange', onVisibility)
})

onBeforeUnmount(() => {
  stopPolling()
  document.removeEventListener('visibilitychange', onVisibility)
})

async function loadNews() {
  try {
    loadingNews.value = true
    const items = await fetchNews({ pageSize: 5, lang: 'zh', country: 'cn' })
    news.value = items
  } catch (e) {
    toast.error('热点新闻获取失败，已显示上次数据')
  } finally {
    loadingNews.value = false
  }
}

function startPolling() {
  stopPolling()
  if (!document.hidden) {
    newsTimer = setInterval(() => {
      if (!document.hidden) void loadNews()
    }, 2 * 60 * 1000) as unknown as number // 2分钟刷新
  }
}

function stopPolling() {
  if (newsTimer) {
    clearInterval(newsTimer)
    newsTimer = null
  }
}

function onVisibility() {
  if (document.hidden) {
    stopPolling()
  } else {
    startPolling()
    void loadNews()
  }
}
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
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

.news-section {
  background: transparent;
  display: grid;
  gap: 10px;
}

.section-title {
  font-size: 16px;
  font-weight: 800;
  color: #111827;
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
