<template>
  <div class="stats-skeleton">
    <!-- Stats Cards Grid -->
    <div class="stats-section">
      <div class="section-header shimmer"></div>
      <div class="stats-grid">
        <div v-for="i in cardCount" :key="i" class="stat-card">
          <div class="stat-icon shimmer"></div>
          <div class="stat-content">
            <div class="stat-title shimmer"></div>
            <div class="stat-value shimmer"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Additional Section (if showExtra is true) -->
    <div v-if="showExtra" class="stats-section">
      <div class="section-header shimmer"></div>
      <div class="stats-grid">
        <div v-for="i in 4" :key="i" class="stat-card">
          <div class="stat-icon shimmer"></div>
          <div class="stat-content">
            <div class="stat-title shimmer"></div>
            <div class="stat-value shimmer"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  cardCount?: number
  showExtra?: boolean
}

withDefaults(defineProps<Props>(), {
  cardCount: 6,
  showExtra: false
})
</script>

<style scoped>
.stats-skeleton {
  display: flex;
  flex-direction: column;
  gap: 20px;
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
  background: linear-gradient(
    to right,
    #f0f0f0 0%,
    #e0e0e0 20%,
    #f0f0f0 40%,
    #f0f0f0 100%
  );
  background-size: 1000px 100%;
}

/* Stats Section */
.stats-section {
  border: 1px solid #ebeef5;
  border-radius: 12px;
  padding: 20px;
  background: #fff;
}

.section-header {
  height: 28px;
  width: 200px;
  border-radius: 6px;
  margin-bottom: 20px;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-title {
  height: 16px;
  width: 80%;
  border-radius: 4px;
}

.stat-value {
  height: 32px;
  width: 60%;
  border-radius: 4px;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
  
  .stat-card {
    flex-direction: column;
    text-align: center;
  }
  
  .stat-content {
    align-items: center;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>

