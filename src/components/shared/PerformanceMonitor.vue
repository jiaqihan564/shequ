<template>
  <div v-if="show" class="performance-monitor">
    <div class="monitor-header">
      <span class="monitor-title">⚡ Performance</span>
      <button class="monitor-close" aria-label="Close" @click="show = false">×</button>
    </div>
    <div class="monitor-body">
      <div class="metric">
        <span class="metric-label">FPS:</span>
        <span class="metric-value" :class="getFpsClass(fps)">{{ fps }}</span>
      </div>
      <div v-if="memorySupported" class="metric">
        <span class="metric-label">Memory:</span>
        <span class="metric-value">{{ memoryUsage }} MB</span>
      </div>
      <div class="metric">
        <span class="metric-label">Frames:</span>
        <span class="metric-value">{{ frameCount }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

import { performanceConfig } from '@/config'

const show = ref(true)
const fps = ref(0)
const memoryUsage = ref(0)
const frameCount = ref(0)
const memorySupported = ref(false)

let frameId: number | null = null
let lastTime = performance.now()
let frames = 0

// Check if memory API is available
onMounted(() => {
  // @ts-ignore - performance.memory is non-standard but widely supported
  memorySupported.value = !!performance.memory
  startMonitoring()
})

onBeforeUnmount(() => {
  stopMonitoring()
})

function startMonitoring() {
  const measure = (currentTime: number) => {
    frames++
    frameCount.value++

    // Calculate FPS every second
    if (currentTime >= lastTime + 1000) {
      fps.value = Math.round((frames * 1000) / (currentTime - lastTime))
      frames = 0
      lastTime = currentTime

      // Update memory usage if supported
      if (memorySupported.value) {
        // @ts-ignore
        const memory = performance.memory
        if (memory) {
          memoryUsage.value = Math.round(memory.usedJSHeapSize / 1048576) // Convert to MB
        }
      }
    }

    frameId = requestAnimationFrame(measure)
  }

  frameId = requestAnimationFrame(measure)
}

function stopMonitoring() {
  if (frameId !== null) {
    cancelAnimationFrame(frameId)
    frameId = null
  }
}

function getFpsClass(fpsValue: number): string {
  if (fpsValue >= performanceConfig.fpsGoodThreshold) return 'fps-good'
  if (fpsValue >= performanceConfig.fpsOkThreshold) return 'fps-ok'
  return 'fps-bad'
}
</script>

<style scoped>
.performance-monitor {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px 16px;
  min-width: 180px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  font-family: 'Courier New', monospace;
  color: #fff;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.monitor-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #67c23a;
}

.monitor-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.monitor-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.monitor-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.metric-label {
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.metric-value {
  font-weight: 700;
  font-size: 14px;
  color: #409eff;
  min-width: 60px;
  text-align: right;
}

.fps-good {
  color: #67c23a;
}

.fps-ok {
  color: #e6a23c;
}

.fps-bad {
  color: #f56c6c;
}

/* Responsive */
@media (max-width: 768px) {
  .performance-monitor {
    top: 70px;
    right: 10px;
    min-width: 160px;
    padding: 10px 12px;
  }

  .monitor-title {
    font-size: 11px;
  }

  .metric {
    font-size: 12px;
  }

  .metric-value {
    font-size: 13px;
  }
}
</style>
