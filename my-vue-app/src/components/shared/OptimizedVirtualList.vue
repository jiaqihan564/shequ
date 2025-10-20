<template>
  <div 
    ref="containerRef" 
    class="virtual-list-container"
    :style="{ height: containerHeight }"
    @scroll="handleScroll"
  >
    <!-- 占位符：撑开总高度 -->
    <div 
      class="virtual-list-spacer" 
      :style="{ height: `${totalHeight}px` }"
    />
    
    <!-- 可见区域的元素 -->
    <div 
      class="virtual-list-content"
      :style="{ transform: `translateY(${offsetY}px)` }"
    >
      <div
        v-for="item in visibleItems"
        :key="getItemKey(item)"
        class="virtual-list-item"
        :style="{ height: `${itemHeight}px` }"
      >
        <slot :item="item" :index="item.__index" />
      </div>
    </div>

    <!-- 加载更多指示器 -->
    <div v-if="loading" class="virtual-list-loading">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      <span>加载中...</span>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && items.length === 0" class="virtual-list-empty">
      <slot name="empty">
        <el-empty description="暂无数据" />
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Loading } from '@element-plus/icons-vue'

interface Props {
  items: any[]
  itemHeight: number
  containerHeight?: string
  buffer?: number // 缓冲区大小（预渲染的额外项）
  keyField?: string // 用作key的字段名
  loading?: boolean
  hasMore?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  containerHeight: '600px',
  buffer: 5,
  keyField: 'id',
  loading: false,
  hasMore: false
})

const emit = defineEmits<{
  loadMore: []
  scrollToBottom: []
}>()

const containerRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)

// 计算总高度
const totalHeight = computed(() => props.items.length * props.itemHeight)

// 计算可见区域的起始和结束索引
const visibleRange = computed(() => {
  if (!containerRef.value) {
    return { start: 0, end: 10 }
  }

  const containerHeight = containerRef.value.clientHeight
  const start = Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.buffer)
  const visibleCount = Math.ceil(containerHeight / props.itemHeight)
  const end = Math.min(
    props.items.length,
    start + visibleCount + props.buffer * 2
  )

  return { start, end }
})

// 可见的元素
const visibleItems = computed(() => {
  const { start, end } = visibleRange.value
  return props.items.slice(start, end).map((item, index) => ({
    ...item,
    __index: start + index
  }))
})

// 偏移量
const offsetY = computed(() => {
  return visibleRange.value.start * props.itemHeight
})

// 获取元素的key
const getItemKey = (item: any) => {
  return item[props.keyField] || item.__index
}

// 滚动处理（使用节流优化）
let scrollTimer: number | null = null
const handleScroll = (event: Event) => {
  if (scrollTimer) {
    return
  }

  scrollTimer = window.setTimeout(() => {
    const target = event.target as HTMLElement
    scrollTop.value = target.scrollTop

    // 检测是否滚动到底部
    const scrollHeight = target.scrollHeight
    const clientHeight = target.clientHeight
    const isBottom = scrollTop.value + clientHeight >= scrollHeight - 50

    if (isBottom) {
      emit('scrollToBottom')
      if (props.hasMore && !props.loading) {
        emit('loadMore')
      }
    }

    scrollTimer = null
  }, 16) // 约60fps
}

// 滚动到顶部
const scrollToTop = () => {
  if (containerRef.value) {
    containerRef.value.scrollTop = 0
  }
}

// 滚动到指定索引
const scrollToIndex = (index: number) => {
  if (containerRef.value) {
    const targetScrollTop = index * props.itemHeight
    containerRef.value.scrollTop = targetScrollTop
  }
}

// 滚动到底部
const scrollToBottom = () => {
  if (containerRef.value) {
    containerRef.value.scrollTop = containerRef.value.scrollHeight
  }
}

// 监听items变化，重新计算
watch(() => props.items.length, () => {
  // 如果items变化，确保不超出范围
  if (containerRef.value) {
    const maxScrollTop = Math.max(0, totalHeight.value - containerRef.value.clientHeight)
    if (scrollTop.value > maxScrollTop) {
      scrollTop.value = maxScrollTop
      containerRef.value.scrollTop = maxScrollTop
    }
  }
})

// 暴露方法给父组件
defineExpose({
  scrollToTop,
  scrollToIndex,
  scrollToBottom
})

// 性能优化：使用 Intersection Observer 检测可见性
onMounted(() => {
  // 可以添加额外的性能优化
})

onBeforeUnmount(() => {
  if (scrollTimer) {
    clearTimeout(scrollTimer)
  }
})
</script>

<style scoped>
.virtual-list-container {
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  /* 硬件加速 */
  will-change: scroll-position;
  /* 平滑滚动 */
  scroll-behavior: smooth;
}

.virtual-list-spacer {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  pointer-events: none;
}

.virtual-list-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  /* 硬件加速 */
  will-change: transform;
}

.virtual-list-item {
  /* 防止收缩 */
  flex-shrink: 0;
}

.virtual-list-loading {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  text-align: center;
  color: #909399;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(to top, rgba(255, 255, 255, 0.95), transparent);
}

.virtual-list-empty {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
}

/* 滚动条样式 */
.virtual-list-container::-webkit-scrollbar {
  width: 6px;
}

.virtual-list-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.virtual-list-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
  transition: background 0.2s;
}

.virtual-list-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 性能优化：减少重绘 */
.virtual-list-container * {
  box-sizing: border-box;
}
</style>

