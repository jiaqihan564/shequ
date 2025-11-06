<template>
  <div class="daily-metrics-container">
    <!-- 页面头部 -->
    <el-card class="header-card" shadow="never">
      <div class="page-header">
        <div>
          <h1 class="page-title">每日指标</h1>
          <p class="page-subtitle">每日活跃用户与系统性能指标</p>
        </div>
        <div class="header-actions">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            :shortcuts="dateShortcuts"
            @change="handleDateChange"
            size="default"
          />
          <el-button :icon="Refresh" @click="loadData(true)" :loading="loading">
            刷新
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 今日概览 -->
    <el-card class="overview-card" shadow="hover">
      <template #header>
        <div class="section-header">
          <h3 class="section-title">
            <el-icon color="#409eff"><TrendCharts /></el-icon>
            今日概览
          </h3>
          <el-tag type="success" effect="light">实时更新</el-tag>
        </div>
      </template>
      
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="6">
          <el-statistic :value="today.active_users || 0" title="今日活跃">
            <template #prefix>
              <el-icon color="#409eff"><UserFilled /></el-icon>
            </template>
          </el-statistic>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <el-statistic
            :value="today.success_rate || 0"
            :precision="1"
            suffix="%"
            title="成功率"
          >
            <template #prefix>
              <el-icon color="#67c23a"><SuccessFilled /></el-icon>
            </template>
          </el-statistic>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <el-statistic
            :value="today.avg_response_time || 0"
            :precision="0"
            suffix="ms"
            title="平均响应"
          >
            <template #prefix>
              <el-icon color="#e6a23c"><Timer /></el-icon>
            </template>
          </el-statistic>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <el-statistic :value="today.peak_concurrent || 0" title="峰值并发">
            <template #prefix>
              <el-icon color="#f56c6c"><TrendCharts /></el-icon>
            </template>
          </el-statistic>
        </el-col>
      </el-row>
    </el-card>

    <!-- 趋势图表 -->
    <el-row :gutter="20">
      <el-col :xs="24" :lg="12">
        <el-card class="chart-card" shadow="hover" v-loading="loading">
          <template #header>
            <div class="chart-header">
              <h3 class="chart-title">
                <el-icon><User /></el-icon>
                活跃用户趋势
              </h3>
            </div>
          </template>
          <div ref="activeUsersChart" class="chart" style="height: 350px"></div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card class="chart-card" shadow="hover" v-loading="loading">
          <template #header>
            <div class="chart-header">
              <h3 class="chart-title">
                <el-icon><SuccessFilled /></el-icon>
                成功率趋势
              </h3>
            </div>
          </template>
          <div ref="successRateChart" class="chart" style="height: 350px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :xs="24" :lg="12">
        <el-card class="chart-card" shadow="hover" v-loading="loading">
          <template #header>
            <div class="chart-header">
              <h3 class="chart-title">
                <el-icon><Timer /></el-icon>
                响应时间趋势
              </h3>
            </div>
          </template>
          <div ref="responseTimeChart" class="chart" style="height: 350px"></div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card class="chart-card" shadow="hover" v-loading="loading">
          <template #header>
            <div class="chart-header">
              <h3 class="chart-title">
                <el-icon><Connection /></el-icon>
                API调用趋势
              </h3>
            </div>
          </template>
          <div ref="apiCallsChart" class="chart" style="height: 350px"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import echarts from '@/utils/echarts'
import {
  Refresh, TrendCharts, UserFilled, SuccessFilled, Timer, User, Connection
} from '@element-plus/icons-vue'
import { getDailyMetrics } from '@/utils/api'
import toast from '@/utils/toast'

const loading = ref(false)
const today = ref<any>({})
const trend = ref<any[]>([])
const dateRange = ref<[Date, Date]>()
const activeUsersChart = ref<HTMLElement>()
const successRateChart = ref<HTMLElement>()
const responseTimeChart = ref<HTMLElement>()
const apiCallsChart = ref<HTMLElement>()

let chart1: echarts.ECharts | null = null
let chart2: echarts.ECharts | null = null
let chart3: echarts.ECharts | null = null
let chart4: echarts.ECharts | null = null

// 日期快捷选项
const dateShortcuts = [
  {
    text: '最近7天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 7 * 24 * 3600 * 1000)
      return [start, end]
    }
  },
  {
    text: '最近30天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 30 * 24 * 3600 * 1000)
      return [start, end]
    }
  },
  {
    text: '最近90天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 90 * 24 * 3600 * 1000)
      return [start, end]
    }
  }
]

function handleDateChange() {
  loadData()
}

const loadData = async (forceRefresh: boolean = false) => {
  loading.value = true
  try {
    let startDate: string
    let endDate: string

    if (dateRange.value && dateRange.value.length === 2) {
      startDate = dateRange.value[0].toISOString().split('T')[0]
      endDate = dateRange.value[1].toISOString().split('T')[0]
    } else {
      // 默认最近30天
      endDate = new Date().toISOString().split('T')[0]
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
    
    const data = await getDailyMetrics(startDate, endDate, forceRefresh)
    today.value = data.today || {}
    
    // 处理趋势数据
    let trendData = data.trend || []
    if (trendData.length === 0 && data.today) {
      trendData = [data.today]
    }
    trend.value = trendData.reverse() // 按时间排序

    // 渲染图表
    renderCharts()
  } catch (error: any) {
    toast.error(error?.message || '加载每日指标失败')
  } finally {
    loading.value = false
  }
}

const renderCharts = () => {
  if (!activeUsersChart.value || !successRateChart.value || !responseTimeChart.value || !apiCallsChart.value) return
  
  // 没有数据，显示空状态
  if (trend.value.length === 0) {
    return
  }

  const dates = trend.value.map(t => {
    const d = new Date(t.date)
    return `${d.getMonth() + 1}/${d.getDate()}`
  })

  const activeUsers = trend.value.map(t => t.active_users || 0)
  const successRates = trend.value.map(t => t.success_rate || 0)
  const responseTimes = trend.value.map(t => t.avg_response_time || 0)
  const apiCalls = trend.value.map(t => t.total_requests || 0)

  // 通用图表配置
  const commonOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates
    }
  }

  // 活跃用户趋势
  if (!chart1) chart1 = echarts.init(activeUsersChart.value)
  chart1.setOption({
    ...commonOption,
    yAxis: { type: 'value', name: '人数' },
    series: [{
      name: '活跃用户',
      type: 'line',
      smooth: true,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
          { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
        ])
      },
      lineStyle: { color: '#409eff', width: 3 },
      itemStyle: { color: '#409eff' },
      data: activeUsers
    }]
  })

  // 成功率趋势
  if (!chart2) chart2 = echarts.init(successRateChart.value)
  chart2.setOption({
    ...commonOption,
    yAxis: { type: 'value', name: '百分比(%)', max: 100 },
    series: [{
      name: '成功率',
      type: 'line',
      smooth: true,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(103, 194, 58, 0.3)' },
          { offset: 1, color: 'rgba(103, 194, 58, 0.05)' }
        ])
      },
      lineStyle: { color: '#67c23a', width: 3 },
      itemStyle: { color: '#67c23a' },
      data: successRates
    }]
  })

  // 响应时间趋势
  if (!chart3) chart3 = echarts.init(responseTimeChart.value)
  chart3.setOption({
    ...commonOption,
    yAxis: { type: 'value', name: '毫秒(ms)' },
    series: [{
      name: '平均响应时间',
      type: 'line',
      smooth: true,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(230, 162, 60, 0.3)' },
          { offset: 1, color: 'rgba(230, 162, 60, 0.05)' }
        ])
      },
      lineStyle: { color: '#e6a23c', width: 3 },
      itemStyle: { color: '#e6a23c' },
      data: responseTimes
    }]
  })

  // API调用趋势
  if (!chart4) chart4 = echarts.init(apiCallsChart.value)
  chart4.setOption({
    ...commonOption,
    yAxis: { type: 'value', name: '调用次数' },
    series: [{
      name: 'API调用',
      type: 'bar',
      barWidth: '60%',
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#409eff' },
          { offset: 1, color: '#a0cfff' }
        ])
      },
      data: apiCalls
    }]
  })
}

onMounted(() => {
  // 默认显示最近30天
  const end = new Date()
  const start = new Date()
  start.setTime(start.getTime() - 30 * 24 * 3600 * 1000)
  dateRange.value = [start, end]
  
  loadData()
  
  // 响应窗口大小变化
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chart1?.dispose()
  chart2?.dispose()
  chart3?.dispose()
  chart4?.dispose()
})

function handleResize() {
  chart1?.resize()
  chart2?.resize()
  chart3?.resize()
  chart4?.resize()
}
</script>

<style scoped>
.daily-metrics-container {
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

.chart-card {
  margin-bottom: 20px;
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
  transform: translateY(-2px);
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

/* 响应式设计 */
@media (max-width: 768px) {
  .daily-metrics-container {
    padding: 10px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    flex-direction: column;
  }

  .header-actions .el-date-picker {
    width: 100%;
  }

  .page-title {
    font-size: 24px;
  }
}
</style>
