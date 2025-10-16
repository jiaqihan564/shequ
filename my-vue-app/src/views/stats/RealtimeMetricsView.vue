<template>
  <div class="realtime-metrics-container">
    <!-- 页面头部 -->
    <el-card class="header-card" shadow="never">
      <div class="page-header">
        <div>
          <h1 class="page-title">
            实时监控
            <el-badge :value="autoRefresh ? '自动' : ''" :hidden="!autoRefresh">
              <el-tag type="success" effect="dark" size="small">LIVE</el-tag>
            </el-badge>
          </h1>
          <p class="page-subtitle">系统实时性能与资源使用情况</p>
        </div>
        <div class="header-actions">
          <el-text type="info" size="small" style="margin-right: 12px">
            自动刷新
          </el-text>
          <el-switch
            v-model="autoRefresh"
            active-text="开"
            inactive-text="关"
            @change="handleAutoRefreshChange"
          />
          <el-button :icon="Refresh" @click="loadData" :loading="loading">
            刷新
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 系统概览 -->
    <el-card class="overview-card" shadow="hover">
      <template #header>
        <div class="section-header">
          <h3 class="section-title">
            <el-icon color="#409eff"><Monitor /></el-icon>
            系统概览
          </h3>
          <el-tag v-if="metrics.timestamp" type="info" effect="plain" size="small">
            <el-icon><Clock /></el-icon>
            {{ formatTime(metrics.timestamp) }}
          </el-tag>
        </div>
      </template>
      
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="6">
          <div class="metric-item">
            <el-statistic :value="metrics.online_users || 0" title="在线用户">
              <template #prefix>
                <el-icon color="#67c23a"><UserFilled /></el-icon>
              </template>
            </el-statistic>
          </div>
        </el-col>

        <el-col :xs="24" :sm="12" :md="6">
          <div class="metric-item">
            <el-statistic
              :value="metrics.current_qps || 0"
              :precision="1"
              suffix="/s"
              title="每秒请求"
            >
              <template #prefix>
                <el-icon color="#409eff"><TrendCharts /></el-icon>
              </template>
            </el-statistic>
          </div>
        </el-col>

        <el-col :xs="24" :sm="12" :md="6">
          <div class="metric-item">
            <el-statistic
              :value="metrics.system_cpu || 0"
              :precision="1"
              suffix="%"
              title="CPU使用率"
            >
              <template #prefix>
                <el-icon :color="getCpuColor(metrics.system_cpu)"><Cpu /></el-icon>
              </template>
            </el-statistic>
            <el-progress
              :percentage="metrics.system_cpu || 0"
              :show-text="false"
              :stroke-width="6"
              :color="getCpuColor(metrics.system_cpu)"
            />
          </div>
        </el-col>

        <el-col :xs="24" :sm="12" :md="6">
          <div class="metric-item">
            <el-statistic
              :value="metrics.system_memory || 0"
              :precision="1"
              suffix="%"
              title="内存使用率"
            >
              <template #prefix>
                <el-icon :color="getMemoryColor(metrics.system_memory)"><Odometer /></el-icon>
              </template>
            </el-statistic>
            <el-progress
              :percentage="metrics.system_memory || 0"
              :show-text="false"
              :stroke-width="6"
              :color="getMemoryColor(metrics.system_memory)"
            />
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 服务状态 -->
    <el-card class="status-card" shadow="hover">
      <template #header>
        <h3 class="section-title">
          <el-icon color="#67c23a"><CircleCheck /></el-icon>
          服务状态
        </h3>
      </template>
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12">
          <div class="status-item">
            <el-tag :type="metrics.service_status === 'running' ? 'success' : 'danger'" size="large" effect="dark">
              {{ metrics.service_status === 'running' ? '运行中' : '异常' }}
            </el-tag>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-text v-if="metrics.last_error_time" type="warning">
            <el-icon><Warning /></el-icon>
            上次错误: {{ formatTime(metrics.last_error_time) }}
          </el-text>
          <el-text v-else type="success">
            <el-icon><CircleCheck /></el-icon>
            系统运行正常
          </el-text>
        </el-col>
      </el-row>
    </el-card>

    <!-- 实时图表 -->
    <el-card class="chart-card" shadow="hover" v-loading="loading">
      <template #header>
        <div class="chart-header">
          <h3 class="chart-title">
            <el-icon><TrendCharts /></el-icon>
            实时性能趋势
          </h3>
          <el-tag type="warning" effect="plain" size="small">最近60秒</el-tag>
        </div>
      </template>
      <div ref="realtimeChart" class="chart" style="height: 400px"></div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import {
  Refresh, Monitor, Clock, UserFilled, Cpu, Odometer,
  TrendCharts, CircleCheck, Warning
} from '@element-plus/icons-vue'
import { getRealtimeMetrics } from '@/utils/api'
import toast from '@/utils/toast'

const loading = ref(false)
const autoRefresh = ref(true)
const metrics = ref<any>({})
const realtimeChart = ref<HTMLElement>()
const historyData = ref<any[]>([])

let chart: echarts.ECharts | null = null
let refreshTimer: number | null = null

const loadData = async () => {
  loading.value = true
  try {
    const data = await getRealtimeMetrics()
    metrics.value = data || {}
    
    // 添加到历史数据（最多保留60条）
    historyData.value.push({
      timestamp: new Date(),
      ...data
    })
    if (historyData.value.length > 60) {
      historyData.value.shift()
    }
    
    renderChart()
  } catch (error: any) {
    toast.error(error?.message || '加载实时指标失败')
  } finally {
    loading.value = false
  }
}

function handleAutoRefreshChange() {
  if (autoRefresh.value) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}

function startAutoRefresh() {
  stopAutoRefresh()
  refreshTimer = window.setInterval(() => {
    loadData()
  }, 5000) // 每5秒刷新一次
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

function renderChart() {
  if (!realtimeChart.value || historyData.value.length === 0) return
  
  if (!chart) {
    chart = echarts.init(realtimeChart.value)
  }

  const times = historyData.value.map(d => {
    const time = new Date(d.timestamp)
    return `${time.getHours()}:${String(time.getMinutes()).padStart(2, '0')}:${String(time.getSeconds()).padStart(2, '0')}`
  })

  const cpuData = historyData.value.map(d => d.system_cpu || 0)
  const memoryData = historyData.value.map(d => d.system_memory || 0)
  const qpsData = historyData.value.map(d => d.current_qps || 0)

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: ['CPU使用率', '内存使用率', '请求QPS'],
      bottom: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '5%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: times
    },
    yAxis: [
      {
        type: 'value',
        name: '使用率(%)',
        max: 100,
        axisLabel: {
          formatter: '{value}%'
        }
      },
      {
        type: 'value',
        name: 'QPS (请求/秒)',
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: 'CPU使用率',
        type: 'line',
        smooth: true,
        yAxisIndex: 0,
        lineStyle: { color: '#f56c6c', width: 2 },
        itemStyle: { color: '#f56c6c' },
        data: cpuData
      },
      {
        name: '内存使用率',
        type: 'line',
        smooth: true,
        yAxisIndex: 0,
        lineStyle: { color: '#e6a23c', width: 2 },
        itemStyle: { color: '#e6a23c' },
        data: memoryData
      },
      {
        name: '请求QPS',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        lineStyle: { color: '#409eff', width: 2 },
        itemStyle: { color: '#409eff' },
        data: qpsData
      }
    ]
  })
}

function calculatePercentage(current: number, total: number): number {
  if (!total || total === 0) return 0
  return Math.min(Math.round((current / total) * 100), 100)
}

function getCpuColor(usage: number): string {
  if (usage >= 80) return '#f56c6c'
  if (usage >= 60) return '#e6a23c'
  return '#67c23a'
}

function getMemoryColor(usage: number): string {
  if (usage >= 85) return '#f56c6c'
  if (usage >= 70) return '#e6a23c'
  return '#67c23a'
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN')
}

onMounted(() => {
  loadData()
  if (autoRefresh.value) {
    startAutoRefresh()
  }
  
  // 响应窗口大小变化
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  stopAutoRefresh()
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})

function handleResize() {
  chart?.resize()
}
</script>

<style scoped>
.realtime-metrics-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
  border-radius: 12px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.page-title {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-subtitle {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.overview-card {
  margin-bottom: 20px;
  border-radius: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-card {
  margin-top: 20px;
  margin-bottom: 20px;
  border-radius: 12px;
}

.status-item {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.chart-card {
  margin-top: 20px;
  border-radius: 12px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.chart {
  width: 100%;
}

/* Statistic 组件样式优化 */
:deep(.el-statistic) {
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  text-align: center;
  transition: all 0.3s;
}

:deep(.el-statistic:hover) {
  background: #ecf5ff;
}

:deep(.el-statistic__head) {
  font-size: 14px;
  color: #606266;
  margin-bottom: 12px;
}

:deep(.el-statistic__content) {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
}

:deep(.el-statistic .el-icon) {
  font-size: 24px;
  margin-right: 8px;
}

/* 进度条样式 */
:deep(.el-progress) {
  margin-top: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .realtime-metrics-container {
    padding: 10px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .page-title {
    font-size: 24px;
  }
}
</style>
