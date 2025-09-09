<template>
  <div class="page page-home">
    <section class="welcome">
      <h2 class="title">欢迎来到社区</h2>
      <p class="subtitle">这里可以浏览帖子、关注话题、与伙伴交流</p>
    </section>

    <section class="quick-actions">
      <button class="btn" @click="$emit('create-post')">发布帖子</button>
      <button class="btn outline" @click="$emit('explore-topics')">探索话题</button>
    </section>

    <section class="stats" v-if="user?.role">
      <div class="stat">
        <span class="label">角色</span>
        <span class="value">{{ user.role }}</span>
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
.page-home { padding: 24px; }
.welcome { margin-bottom: 16px; }
.title { font-size: 20px; font-weight: 700; }
.subtitle { color: #6b7280; margin-top: 4px; }
.quick-actions { display: flex; gap: 12px; margin: 16px 0; }
.btn { padding: 8px 14px; background: var(--color-primary, #3b82f6); color: #fff; border: none; border-radius: 6px; cursor: pointer; }
.btn.outline { background: transparent; color: var(--color-primary, #3b82f6); border: 1px solid var(--color-primary, #3b82f6); }
.stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
.stat { background: #f9fafb; border: 1px solid #eef2f7; border-radius: 8px; padding: 12px; }
.label { color: #6b7280; font-size: 12px; }
.value { display: block; font-weight: 600; margin-top: 6px; }

</style>


