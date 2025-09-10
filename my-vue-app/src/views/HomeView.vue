<template>
  <div class="page page-home container">
    <section class="welcome hero">
      <div class="hero-body">
        <div class="hero-text">
          <h2 class="title gradient-text">欢迎来到社区</h2>
          <p class="subtitle">浏览精彩内容 · 关注热门话题 · 与伙伴高效交流</p>
        </div>
        <div class="hero-actions">
          <button class="btn primary" @click="$emit('create-post')">发布帖子</button>
          <button class="btn ghost" @click="$emit('explore-topics')">探索话题</button>
        </div>
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
  </div>
  
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { User } from '@/types'

const user = ref<User | null>(null)

onMounted(() => {
  try {
    const raw = localStorage.getItem('user_info') || sessionStorage.getItem('user_info')
    if (raw) user.value = JSON.parse(raw)
  } catch {}
})
</script>

<style scoped>
.page-home { padding: 24px; display: grid; gap: 16px; }
.hero { background: linear-gradient(135deg, rgba(102, 126, 234, 0.12), rgba(118, 75, 162, 0.12)); border: 1px solid rgba(102,126,234,0.2); border-radius: 16px; box-shadow: 0 8px 20px rgba(17,24,39,0.04); }
.hero-body { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px; }
.hero-text { display: grid; gap: 6px; }
.title { font-size: 22px; font-weight: 800; color: #111827; letter-spacing: 0.2px; }
.gradient-text { background: linear-gradient(90deg, var(--color-primary), var(--color-primary-dark)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.subtitle { color: #6b7280; margin-top: 2px; }
.hero-actions { display: flex; gap: 10px; }
.btn { padding: 10px 16px; border-radius: 10px; font-weight: 600; transition: all var(--transition-normal, 300ms ease-in-out); }
.btn.primary { background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark)); color: #fff; box-shadow: 0 10px 20px rgba(102,126,234,0.25); }
.btn.primary:hover { transform: translateY(-1px); box-shadow: 0 14px 24px rgba(102,126,234,0.3); }
.btn.ghost { background: #fff; color: var(--color-primary); border: 1px solid #e5e7eb; }
.btn.ghost:hover { background: #f9fafb; }

.stats-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.stat-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; box-shadow: 0 4px 12px rgba(17,24,39,0.04); }
.stat-card.soft { background: #f9fafb; border-style: dashed; }
.stat-label { font-size: 12px; color: #6b7280; }
.stat-value { margin-top: 6px; font-weight: 700; color: #111827; }

@media (max-width: 768px) {
  .hero-body { flex-direction: column; align-items: flex-start; }
  .stats-grid { grid-template-columns: 1fr; }
}

</style>


