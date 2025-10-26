<template>
  <div class="stats-container">
    <header class="stats-header">
      <h2 class="title">用户统计</h2>
      <p class="subtitle">用户注册和登录数据分析</p>
    </header>

    <div class="stats-cards">
      <div class="stat-card">
        <div class="card-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
          📊
        </div>
        <div class="card-content">
          <div class="card-label">今日登录</div>
          <div class="card-value">{{ overview.today_login || 0 }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="card-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
          ✨
        </div>
        <div class="card-content">
          <div class="card-label">今日注册</div>
          <div class="card-value">{{ overview.today_register || 0 }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="card-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
          👥
        </div>
        <div class="card-content">
          <div class="card-label">累计登录</div>
          <div class="card-value">{{ totalLogin }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="card-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)">
          🎉
        </div>
        <div class="card-content">
          <div class="card-label">累计注册</div>
          <div class="card-value">{{ totalRegister }}</div>
        </div>
      </div>
    </div>

    <div class="chart-section">
      <h3 class="section-title">最近7天趋势</h3>
      <div ref="chartRef" class="chart" style="height: 400px"></div>
    </div>

    <LoadingSpinner v-if="loading" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import echarts from '@/utils/echarts'

import LoadingSpinner from '@/shared/ui/LoadingSpinner.vue'
import { getUserStatistics, getStatisticsOverview } from '@/utils/api'
import { toast } from '@/utils/toast'

const chartRef = ref<HTMLElement>()
const loading = ref(false)
const overview = ref<any>({})
const totalLogin = ref(0)
const totalRegister = ref(0)

const loadData = async () => {
  loading.value = true
  try {
    // 获取总览
    overview.value = await getStatisticsOverview()

    // 获取最近7天数据
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const data = await getUserStatistics(startDate, endDate)
    
    totalLogin.value = data.total?.total_login || 0
    totalRegister.value = data.total?.total_register || 0

    // 渲染图表
    renderChart(data.stats || [])
  } catch (error: any) {
    toast.error(error?.message || '加载统计数据失败')
  } finally {
    loading.value = false
  }
}

const renderChart = (stats: any[]) => {
  if (!chartRef.value) return

  const chart = echarts.init(chartRef.value)

  // 数据处理：按日期排序
  const sortedStats = [...stats].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const dates = sortedStats.map(s => {
    const d = new Date(s.date)
    return `${d.getMonth() + 1}/${d.getDate()}`
  })
  const loginData = sortedStats.map(s => s.login_count)
  const registerData = sortedStats.map(s => s.register_count)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['登录次数', '注册次数']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '登录次数',
        type: 'bar',
        data: loginData,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#667eea' },
            { offset: 1, color: '#764ba2' }
          ])
        }
      },
      {
        name: '注册次数',
        type: 'bar',
        data: registerData,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#f093fb' },
            { offset: 1, color: '#f5576c' }
          ])
        }
      }
    ]
  }

  chart.setOption(option)

  // 响应式
  window.addEventListener('resize', () => chart.resize())
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
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  margin: 0 0 8px 0;
}

.subtitle {
  color: #6b7280;
  font-size: 14px;
  margin: 0;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
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

.chart-section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 20px 0;
}

.chart {
  width: 100%;
}
</style>

