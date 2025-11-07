<template>
  <section class="news-carousel" aria-label="热点新闻">
    <div class="carousel-body" @mouseenter="pause()" @mouseleave="resume()">
      <div v-if="isLoading" class="carousel-loading">
        <LoadingSpinner text="加载热点中..." />
      </div>

      <div v-else-if="items.length === 0" class="carousel-empty">
        <div class="empty">暂无热点</div>
      </div>

      <div v-else class="slides">
        <article
          v-for="(item, index) in items"
          :key="item.id"
          class="slide"
          :class="{ active: index === currentIndex }"
        >
          <a class="cover" :href="item.url" target="_blank" rel="noopener noreferrer">
            <img class="image" :src="item.imageUrl" :alt="item.title" loading="lazy" />
            <div class="overlay">
              <h3 class="title">{{ item.title }}</h3>
              <div class="meta">
                <span class="source">{{ item.source }}</span>
                <span class="dot">·</span>
                <time :datetime="item.publishedAt">{{ formatRelative(item.publishedAt) }}</time>
              </div>
            </div>
          </a>
        </article>

        <button class="nav prev" aria-label="上一条" @click="prev">‹</button>
        <button class="nav next" aria-label="下一条" @click="next">›</button>

        <div class="dots" role="tablist" aria-label="轮播分页">
          <button
            v-for="(item, i) in items"
            :key="item.id + '_dot'"
            class="dot-btn"
            :class="{ active: i === currentIndex }"
            role="tab"
            :aria-selected="i === currentIndex"
            :aria-controls="'slide-' + i"
            @click="go(i)"
          ></button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

import LoadingSpinner from '@/shared/ui/LoadingSpinner.vue'
import type { NewsItem } from '@/types'

interface Props {
  items: NewsItem[]
  isLoading?: boolean
  intervalMs?: number
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  isLoading: false,
  intervalMs: 5000
})

const currentIndex = ref(0)
let timer: number | null = null
let isPaused = false

function start() {
  stop()
  if (!props.items.length) return
  timer = setInterval(() => {
    if (!isPaused && !document.hidden) {
      next()
    }
  }, props.intervalMs) as unknown as number
}

function stop() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function pause() {
  isPaused = true
}

function resume() {
  isPaused = false
}

function next() {
  if (!props.items.length) return
  currentIndex.value = (currentIndex.value + 1) % props.items.length
}

function prev() {
  if (!props.items.length) return
  currentIndex.value = (currentIndex.value - 1 + props.items.length) % props.items.length
}

function go(i: number) {
  if (i < 0 || i >= props.items.length) return
  currentIndex.value = i
}

function onVisibility() {
  if (document.hidden) {
    stop()
  } else {
    start()
  }
}

function formatRelative(iso: string): string {
  try {
    const ts = new Date(iso).getTime()
    const diff = Math.max(0, Date.now() - ts)
    const m = Math.floor(diff / 60000)
    if (m < 1) return '刚刚'
    if (m < 60) return `${m} 分钟前`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h} 小时前`
    const d = Math.floor(h / 24)
    return `${d} 天前`
  } catch {
    return ''
  }
}

watch(
  () => props.items,
  () => {
    currentIndex.value = 0
    start()
  }
)

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibility)
  start()
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility)
  stop()
})
</script>

<style scoped>
.news-carousel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  overflow: hidden;
}

.carousel-body {
  position: relative;
  min-height: 220px;
}

.carousel-loading,
.carousel-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 240px;
}

.slides {
  position: relative;
}

.slide {
  display: none;
}

.slide.active {
  display: block;
}

.cover {
  display: block;
  position: relative;
}

.image {
  width: 100%;
  height: 320px;
  object-fit: cover;
  display: block;
}

.overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.55) 100%);
  color: #fff;
}

.title {
  font-size: 18px;
  font-weight: 800;
  line-height: 1.3;
}

.meta {
  margin-top: 6px;
  color: #e5e7eb;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(17, 24, 39, 0.5);
  color: #fff;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background 200ms ease;
}

.nav:hover {
  background: rgba(17, 24, 39, 0.7);
}

.prev {
  left: 12px;
}
.next {
  right: 12px;
}

.dots {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 10px;
  display: flex;
  justify-content: center;
  gap: 8px;
}

.dot-btn {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  border: none;
  padding: 0;
  cursor: pointer;
}

.dot-btn.active {
  background: #fff;
}

@media (max-width: 768px) {
  .image {
    height: 220px;
  }
  .title {
    font-size: 16px;
  }
}
</style>
