<template>
  <div class="skeleton-loader">
    <!-- Card Type Skeleton -->
    <div v-if="type === 'card'" class="skeleton-cards">
      <div v-for="i in count" :key="i" class="skeleton-card">
        <div class="skeleton-card-image shimmer"></div>
        <div class="skeleton-card-body">
          <div class="skeleton-title shimmer"></div>
          <div class="skeleton-text shimmer"></div>
          <div class="skeleton-text shimmer" style="width: 80%"></div>
          <div class="skeleton-footer">
            <div class="skeleton-avatar shimmer"></div>
            <div class="skeleton-meta shimmer"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- List Type Skeleton -->
    <div v-else-if="type === 'list'" class="skeleton-list">
      <div v-for="i in count" :key="i" class="skeleton-list-item">
        <div class="skeleton-avatar shimmer"></div>
        <div class="skeleton-list-content">
          <div class="skeleton-title shimmer"></div>
          <div class="skeleton-text shimmer"></div>
        </div>
      </div>
    </div>

    <!-- Table Type Skeleton -->
    <div v-else-if="type === 'table'" class="skeleton-table">
      <div class="skeleton-table-header">
        <div v-for="i in 4" :key="i" class="skeleton-table-cell shimmer"></div>
      </div>
      <div v-for="i in count" :key="i" class="skeleton-table-row">
        <div v-for="j in 4" :key="j" class="skeleton-table-cell shimmer"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  type?: 'card' | 'list' | 'table'
  count?: number
}

withDefaults(defineProps<Props>(), {
  type: 'card',
  count: 3
})
</script>

<style scoped>
.skeleton-loader {
  width: 100%;
}

/* Shimmer Animation */
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.shimmer {
  animation: shimmer 2s infinite linear;
  background: linear-gradient(to right, #f0f0f0 0%, #e0e0e0 20%, #f0f0f0 40%, #f0f0f0 100%);
  background-size: 1000px 100%;
}

/* Card Skeleton */
.skeleton-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
}

.skeleton-card {
  border: 1px solid #ebeef5;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}

.skeleton-card-image {
  width: 100%;
  height: 200px;
}

.skeleton-card-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-title {
  height: 24px;
  border-radius: 4px;
  width: 70%;
}

.skeleton-text {
  height: 16px;
  border-radius: 4px;
  width: 100%;
}

.skeleton-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.skeleton-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.skeleton-meta {
  height: 16px;
  border-radius: 4px;
  flex: 1;
}

/* List Skeleton */
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-list-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  background: #fff;
}

.skeleton-list-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Table Skeleton */
.skeleton-table {
  border: 1px solid #ebeef5;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}

.skeleton-table-header {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 16px;
  background: #fafafa;
  border-bottom: 1px solid #ebeef5;
}

.skeleton-table-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid #ebeef5;
}

.skeleton-table-row:last-child {
  border-bottom: none;
}

.skeleton-table-cell {
  height: 20px;
  border-radius: 4px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .skeleton-cards {
    grid-template-columns: 1fr;
  }
}
</style>
