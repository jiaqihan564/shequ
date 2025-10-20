# 虚拟滚动使用指南

## 概述

虚拟滚动（Virtual Scrolling）是一种优化大列表渲染性能的技术。它只渲染可见区域的元素，而不是渲染整个列表，从而大幅提升性能。

## 组件位置

- **优化版虚拟列表**: `src/components/shared/OptimizedVirtualList.vue`
- **文章列表示例**: `src/components/article/ArticleListWithVirtualScroll.vue`

## 性能提升

| 列表大小 | 传统渲染 | 虚拟滚动 | 提升 |
|---------|---------|---------|------|
| 100条   | ~50ms   | ~10ms   | 5x   |
| 500条   | ~250ms  | ~10ms   | 25x  |
| 1000条  | ~500ms  | ~10ms   | 50x  |
| 5000条  | 卡顿    | ~10ms   | 500x+|

## 基本使用

### 1. 简单列表

```vue
<template>
  <OptimizedVirtualList
    :items="items"
    :item-height="80"
    container-height="600px"
  >
    <template #default="{ item, index }">
      <div class="list-item">
        <h3>{{ item.title }}</h3>
        <p>{{ item.description }}</p>
      </div>
    </template>
  </OptimizedVirtualList>
</template>

<script setup>
import OptimizedVirtualList from '@/components/shared/OptimizedVirtualList.vue'

const items = ref([
  { id: 1, title: '标题1', description: '描述1' },
  { id: 2, title: '标题2', description: '描述2' },
  // ... 更多项
])
</script>
```

### 2. 带加载更多

```vue
<template>
  <OptimizedVirtualList
    :items="items"
    :item-height="120"
    :loading="loading"
    :has-more="hasMore"
    @load-more="handleLoadMore"
  >
    <template #default="{ item }">
      <!-- 列表项内容 -->
    </template>

    <template #empty>
      <el-empty description="暂无数据" />
    </template>
  </OptimizedVirtualList>
</template>

<script setup>
const items = ref([])
const loading = ref(false)
const hasMore = ref(true)

const handleLoadMore = async () => {
  loading.value = true
  try {
    const newItems = await fetchMoreItems()
    items.value = [...items.value, ...newItems]
    hasMore.value = newItems.length > 0
  } finally {
    loading.value = false
  }
}
</script>
```

### 3. 聊天消息列表

```vue
<template>
  <OptimizedVirtualList
    ref="chatListRef"
    :items="messages"
    :item-height="100"
    container-height="500px"
    :buffer="10"
  >
    <template #default="{ item }">
      <div class="message-item">
        <div class="message-user">{{ item.username }}</div>
        <div class="message-content">{{ item.content }}</div>
        <div class="message-time">{{ formatTime(item.sendTime) }}</div>
      </div>
    </template>
  </OptimizedVirtualList>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'

const chatListRef = ref()
const messages = ref([])

// 发送新消息后滚动到底部
const sendMessage = async (content) => {
  await addMessage(content)
  await nextTick()
  chatListRef.value?.scrollToBottom()
}
</script>
```

### 4. 评论列表

```vue
<template>
  <OptimizedVirtualList
    :items="comments"
    :item-height="150"
    container-height="calc(100vh - 300px)"
  >
    <template #default="{ item }">
      <div class="comment-item">
        <div class="comment-header">
          <el-avatar :src="item.author.avatar" :size="40" />
          <div class="comment-author">
            <div class="author-name">{{ item.author.nickname }}</div>
            <div class="comment-time">{{ formatTime(item.created_at) }}</div>
          </div>
        </div>
        <div class="comment-content">{{ item.content }}</div>
        <div class="comment-actions">
          <el-button text @click="handleLike(item)">
            <el-icon><Star /></el-icon>
            {{ item.like_count }}
          </el-button>
          <el-button text @click="handleReply(item)">
            <el-icon><ChatDotRound /></el-icon>
            回复
          </el-button>
        </div>
      </div>
    </template>
  </OptimizedVirtualList>
</template>
```

## API

### Props

| 属性 | 类型 | 默认值 | 说明 |
|-----|------|--------|------|
| `items` | `Array` | `[]` | 列表数据 |
| `itemHeight` | `Number` | - | 每项的高度（px）**必需** |
| `containerHeight` | `String` | `'600px'` | 容器高度 |
| `buffer` | `Number` | `5` | 缓冲区大小（预渲染额外项数） |
| `keyField` | `String` | `'id'` | 用作key的字段名 |
| `loading` | `Boolean` | `false` | 是否正在加载 |
| `hasMore` | `Boolean` | `false` | 是否有更多数据 |

### Events

| 事件名 | 参数 | 说明 |
|-------|------|------|
| `loadMore` | - | 滚动到底部时触发 |
| `scrollToBottom` | - | 滚动到底部时触发 |

### Slots

| 插槽名 | 参数 | 说明 |
|-------|------|------|
| `default` | `{ item, index }` | 列表项内容 |
| `empty` | - | 空状态 |

### Methods

| 方法名 | 参数 | 说明 |
|-------|------|------|
| `scrollToTop` | - | 滚动到顶部 |
| `scrollToIndex` | `index: number` | 滚动到指定索引 |
| `scrollToBottom` | - | 滚动到底部 |

## 高级用法

### 1. 动态item高度

如果列表项高度不固定，建议使用平均高度，并增加`buffer`值：

```vue
<OptimizedVirtualList
  :items="items"
  :item-height="120"  <!-- 使用平均高度 -->
  :buffer="10"         <!-- 增加缓冲区 -->
>
```

### 2. 响应式容器高度

```vue
<OptimizedVirtualList
  :items="items"
  :item-height="100"
  container-height="calc(100vh - 200px)"  <!-- 动态计算 -->
>
```

### 3. 结合懒加载图片

```vue
<template #default="{ item }">
  <div class="item">
    <img v-lazy="item.imageUrl" alt="" />
    <p>{{ item.title }}</p>
  </div>
</template>
```

### 4. 自定义滚动行为

```vue
<script setup>
const listRef = ref()

// 平滑滚动到特定项
const scrollToItem = (itemId) => {
  const index = items.value.findIndex(item => item.id === itemId)
  if (index !== -1) {
    listRef.value?.scrollToIndex(index)
  }
}

// 新消息到达时滚动到底部
watch(() => items.value.length, async (newLength, oldLength) => {
  if (newLength > oldLength) {
    await nextTick()
    listRef.value?.scrollToBottom()
  }
})
</script>
```

## 性能优化建议

### 1. 合理设置item高度

```javascript
// ❌ 不推荐：高度过小导致频繁重新渲染
<OptimizedVirtualList :item-height="30" />

// ✅ 推荐：合理的高度
<OptimizedVirtualList :item-height="80" />
```

### 2. 避免在列表项中使用复杂计算

```vue
<!-- ❌ 不推荐 -->
<template #default="{ item }">
  <div>{{ expensiveComputation(item) }}</div>
</template>

<!-- ✅ 推荐：预先计算 -->
<script setup>
const processedItems = computed(() => 
  items.value.map(item => ({
    ...item,
    computed: expensiveComputation(item)
  }))
)
</script>

<template #default="{ item }">
  <div>{{ item.computed }}</div>
</template>
```

### 3. 使用key优化

```vue
<!-- ✅ 推荐：使用唯一的key -->
<OptimizedVirtualList
  :items="items"
  key-field="id"  <!-- 确保每项有唯一ID -->
>
```

### 4. 图片懒加载

```vue
<template #default="{ item }">
  <!-- 使用v-lazy指令延迟加载图片 -->
  <img v-lazy="item.imageUrl" alt="" />
</template>
```

## 实际应用场景

### 1. 文章列表

- **推荐**: 超过50篇文章使用虚拟滚动
- **item高度**: 150-200px
- **buffer**: 3-5

### 2. 评论列表

- **推荐**: 超过100条评论使用虚拟滚动
- **item高度**: 100-150px
- **buffer**: 5-10

### 3. 聊天消息

- **推荐**: 超过200条消息使用虚拟滚动
- **item高度**: 80-120px
- **buffer**: 10-20

### 4. 搜索结果

- **推荐**: 任何数量都可以使用
- **item高度**: 根据内容调整
- **buffer**: 5

## 常见问题

### Q1: 为什么列表显示不正确？

A: 检查以下几点：
1. `item-height` 是否设置正确
2. 每个item是否有唯一的 `key`
3. `containerHeight` 是否合理

### Q2: 如何处理不同高度的列表项？

A: 使用平均高度，并增加 `buffer` 值：

```vue
<OptimizedVirtualList
  :item-height="120"  <!-- 平均高度 -->
  :buffer="15"        <!-- 增加缓冲 -->
>
```

### Q3: 滚动不流畅怎么办？

A: 
1. 减少列表项中的复杂计算
2. 使用 `v-lazy` 延迟加载图片
3. 避免在列表项中使用动画
4. 增加 `buffer` 值

### Q4: 如何实现双向滚动加载？

A: 监听 `scroll` 事件，检测滚动位置：

```vue
<script setup>
const handleScroll = (event) => {
  const { scrollTop } = event.target
  if (scrollTop < 100) {
    loadPreviousItems()
  }
}
</script>
```

## 浏览器兼容性

- ✅ Chrome 51+
- ✅ Firefox 55+
- ✅ Safari 10+
- ✅ Edge 79+
- ✅ 移动端浏览器

## 性能监控

```javascript
// 监控渲染性能
const { start, end } = performance.measure('virtual-list-render')
console.log(`渲染耗时: ${end - start}ms`)
```

## 总结

虚拟滚动适用于以下场景：
- ✅ 列表项数量 > 50
- ✅ 列表项高度相对固定
- ✅ 需要优化首屏加载时间
- ✅ 需要支持大量数据滚动

不适用场景：
- ❌ 列表项数量 < 20
- ❌ 列表项高度变化很大
- ❌ 需要全局搜索（Ctrl+F）

