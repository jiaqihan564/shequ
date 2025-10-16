<template>
  <div class="stats-container">
    <header class="stats-header">
      <h2 class="title">每日指标</h2>
      <p class="subtitle">每日活跃用户和系统性能指标</p>
    </header>

    <!-- 今日指标卡片 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="card-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
          👥
        </div>
        <div class="card-content">
          <div class="card-label">今日活跃</div>
          <div class="card-value">{{ today.active_users || 0 }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="card-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)">
          ✓
        </div>
        <div class="card-content">
          <div class="card-label">成功率</div>
          <div class="card-value">{{ (today.success_rate || 0).toFixed(1) }}<span class="unit">%</span></div>
        </div>
      </div>

      <div class="stat-card">
        <div class="card-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%)">
          ⏱️
        </div>
        <div class="card-content">
          <div class="card-label">平均响应</div>
          <div class="card-value">{{ (today.avg_response_time || 0).toFixed(0) }}<span class="unit">ms</span></div>
        </div>
      </div>

      <div class="stat-card">
        <div class="card-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
          🚀
        </div>
        <div class="card-content">
          <div class="card-label">峰值并发</div>
          <div class="card-value">{{ today.peak_concurrent || 0 }}</div>
        </div>
      </div>
    </div>

    <!-- 趋势图表 -->
    <div class="chart-section">
      <h3 class="section-title">最近30天活跃用户趋势</h3>
      <div ref="activeUsersChart" class="chart" style="height: 350px"></div>
    </div>

    <div class="chart-section">
      <h3 class="section-title">最近30天成功率趋势</h3>
      <div ref="successRateChart" class="chart" style="height: 350px"></div>
    </div>

    <LoadingSpinner v-if="loading" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'

import LoadingSpinner from '@/shared/ui/LoadingSpinner.vue'
import { getDailyMetrics } from '@/utils/api'
import { toast } from '@/utils/toast'

const loading = ref(false)
const today = ref<any>({})
const trend = ref<any[]>([])
const activeUsersChart = ref<HTMLElement>()
const successRateChart = ref<HTMLElement>()

const loadData = async () => {
  loading.value = true
  try {
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const data = await getDailyMetrics(startDate, endDate)
    today.value = data.today || {}
    
    // 处理趋势数据：如果没有历史数据，至少显示今天的
    let trendData = data.trend || []
    if (trendData.length === 0 && data.today) {
      trendData = [data.today]
    }
    trend.value = trendData.reverse() // 按时间正序

    // 渲染图表
    renderCharts()
  } catch (error: any) {
    toast.error(error?.message || '加载每日指标失败')
  } finally {
    loading.value = false
  }
}

const renderCharts = () => {
  if (!activeUsersChart.value || !successRateChart.value) return
  
  // 如果没有数据，显示空状态
  if (trend.value.length === 0) {
    const chart1 = echarts.init(activeUsersChart.value)
    const chart2 = echarts.init(successRateChart.value)
    chart1.setOption({ title: { text: '暂无数据', left: 'center', top: 'center' } })
    chart2.setOption({ title: { text: '暂无数据', left: 'center', top: 'center' } })
    return
  }

  const dates = trend.value.map(t => {
    const d = new Date(t.date)
    return `${d.getMonth() + 1}/${d.getDate()}`
  })

  // 活跃用户图表
  const chart1 = echarts.init(activeUsersChart.value)
  chart1.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value' },
    series: [{
      name: '活跃用户',
      type: 'line',
      data: trend.value.map(t => t.active_users),
      smooth: true,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(102, 126, 234, 0.3)' },
          { offset: 1, color: 'rgba(102, 126, 234, 0.05)' }
        ])
      },
      lineStyle: { color: '#667eea', width: 3 }
    }]
  })

  // 成功率图表
  const chart2 = echarts.init(successRateChart.value)
  chart2.setOption({
    tooltip: { trigger: 'axis', formatter: '{b}<br/>{a}: {c}%' },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
    series: [{
      name: '成功率',
      type: 'line',
      data: trend.value.map(t => t.success_rate),
      smooth: true,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(67, 233, 123, 0.3)' },
          { offset: 1, color: 'rgba(67, 233, 123, 0.05)' }
        ])
      },
      lineStyle: { color: '#43e97b', width: 3 }
    }]
  })

  window.addEventListener('resize', () => {
    chart1.resize()
    chart2.resize()
  })
}

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toLocaleString()
}

const getIcon = (key: string) => {
  const icons: any = {
    total_users: '👥',
    total_logins: '🔐',
    total_api_calls: '📡',
    total_uploads: '📁',
    total_password_changes: '🔑',
    total_password_resets: '🔄',
    total_errors: '⚠️'
  }
  return icons[key] || '📊'
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.stats-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.stats-header {
  margin-bottom: 32px;
}

.title {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 8px 0;
}

.subtitle {
  color: #6b7280;
  font-size: 14px;
  margin: 0;
}

.stats-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.card-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.card-icon.user {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.card-icon.api {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.card-icon.security {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.card-icon.content {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.card-content {
  flex: 1;
}

.card-label {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 4px;
}

.card-value {
  font-size: 32px;
  font-weight: 700;
  color: #111827;
}

.unit {
  font-size: 16px;
  font-weight: 400;
  color: #6b7280;
  margin-left: 4px;
}

.chart-section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.chart {
  width: 100%;
}
</style>

