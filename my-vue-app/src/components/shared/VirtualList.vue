<template>
  <div 
    ref="containerRef" 
    class="virtual-list-container" 
    :style="containerStyle"
    @scroll="handleScroll"
  >
    <div class="virtual-list-phantom" :style="{ height: `${totalHeight}px` }"></div>
    <div class="virtual-list-content" :style="contentStyle">
      <div
        v-for="item in visibleItems"
        :key="getItemKey(item)"
        :data-index="item.index"
        class="virtual-list-item"
      >
        <slot :item="item.data" :index="item.index"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { rafThrottle } from '@/utils/performance'

interface Props {
  items: any[]
  itemHeight: number
  height?: string | number
  overscan?: number
  buffer?: number
  keyField?: string
}

const props = withDefaults(defineProps<Props>(), {
  height: '600px',
  overscan: 3,
  buffer: 5,
  keyField: 'id'
})

const emit = defineEmits<{
  scroll: [scrollTop: number]
  visibleRangeChange: [start: number, end: number]
}>()

// 引用
const containerRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const containerHeight = ref(0)

// 计算总高度
const totalHeight = computed(() => {
  return props.items.length * props.itemHeight
})

// 计算可见范围
const visibleRange = computed(() => {
  const start = Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.overscan)
  const visibleCount = Math.ceil(containerHeight.value / props.itemHeight)
  const end = Math.min(props.items.length, start + visibleCount + props.overscan * 2)
  
  return { start, end }
})

// 可见项目
const visibleItems = computed(() => {
  const { start, end } = visibleRange.value
  return props.items.slice(start, end).map((data, index) => ({
    data,
    index: start + index
  }))
})

// 容器样式
const containerStyle = computed(() => {
  const height = typeof props.height === 'number' ? `${props.height}px` : props.height
  return {
    height,
    overflow: 'auto',
    position: 'relative' as const
  }
})

// 内容样式
const contentStyle = computed(() => {
  const offset = visibleRange.value.start * props.itemHeight
  return {
    transform: `translateY(${offset}px)`,
    position: 'absolute' as const,
    top: '0',
    left: '0',
    right: '0'
  }
})

// 获取项目key
const getItemKey = (item: { data: any; index: number }) => {
  if (props.keyField && item.data[props.keyField]) {
    return item.data[props.keyField]
  }
  return item.index
}

// 滚动处理（使用 RAF 节流）
const handleScroll = rafThrottle(() => {
  if (!containerRef.value) return
  
  scrollTop.value = containerRef.value.scrollTop
  emit('scroll', scrollTop.value)
  emit('visibleRangeChange', visibleRange.value.start, visibleRange.value.end)
})

// 滚动到指定索引
const scrollToIndex = (index: number, behavior: ScrollBehavior = 'smooth') => {
  if (!containerRef.value) return
  
  const offset = index * props.itemHeight
  containerRef.value.scrollTo({
    top: offset,
    behavior
  })
}

// 滚动到顶部
const scrollToTop = (behavior: ScrollBehavior = 'smooth') => {
  scrollToIndex(0, behavior)
}

// 滚动到底部
const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
  scrollToIndex(props.items.length - 1, behavior)
}

// 更新容器高度
const updateContainerHeight = () => {
  if (containerRef.value) {
    containerHeight.value = containerRef.value.clientHeight
  }
}

// 监听数据变化
watch(
  () => props.items.length,
  () => {
    // 数据变化后，重新计算
    nextTick(() => {
      updateContainerHeight()
    })
  }
)

// 生命周期
onMounted(() => {
  updateContainerHeight()
  
  // 监听窗口大小变化
  window.addEventListener('resize', updateContainerHeight)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateContainerHeight)
})

// 暴露方法
defineExpose({
  scrollToIndex,
  scrollToTop,
  scrollToBottom,
  scrollTop: computed(() => scrollTop.value),
  visibleRange: computed(() => visibleRange.value)
})
</script>

<style scoped>
.virtual-list-container {
  position: relative;
}

.virtual-list-phantom {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: -1;
}

.virtual-list-content {
  will-change: transform;
}

.virtual-list-item {
  will-change: transform;
}
</style>

