<template>
  <div class="stats-container">
    <header class="stats-header">
      <h2 class="title">API统计</h2>
      <p class="subtitle">接口调用数据分析</p>
    </header>

    <div class="stats-cards">
      <div class="stat-card">
        <div
          class="card-icon"
          style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        >
          🚀
        </div>
        <div class="card-content">
          <div class="card-label">今日调用</div>
          <div class="card-value">{{ overview.today_api_calls || 0 }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div
          class="card-icon"
          style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
        >
          ✓
        </div>
        <div class="card-content">
          <div class="card-label">成功率</div>
          <div class="card-value">{{ (overview.today_success_rate || 0).toFixed(1) }}%</div>
        </div>
      </div>

      <div class="stat-card">
        <div
          class="card-icon"
          style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
        >
          ⏱️
        </div>
        <div class="card-content">
          <div class="card-label">平均响应</div>
          <div class="card-value">
            {{ avgLatency.toFixed(0) }}
            <span class="unit">ms</span>
          </div>
        </div>
      </div>
    </div>

    <div class="chart-section">
      <div class="section-header">
        <h3 class="section-title">热门接口排行</h3>
        <div class="controls">
          <el-select
            v-model="sortBy"
            placeholder="排序字段"
            size="small"
            @change="handleSortChange"
          >
            <el-option label="调用次数" value="total_count" />
            <el-option label="成功率" value="success_rate" />
            <el-option label="平均响应时间" value="avg_latency_ms" />
          </el-select>
          <el-select
            v-model="order"
            placeholder="排序方向"
            size="small"
            @change="handleSortChange"
          >
            <el-option label="降序" value="desc" />
            <el-option label="升序" value="asc" />
          </el-select>
          <el-select
            v-model="limit"
            placeholder="展示数量"
            size="small"
            allow-create
            filterable
            @change="handleLimitChange"
          >
            <el-option label="展示全部数据" value="all" />
            <el-option label="5条" :value="5" />
            <el-option label="10条" :value="10" />
            <el-option label="20条" :value="20" />
            <el-option label="50条" :value="50" />
            <el-option label="100条" :value="100" />
          </el-select>
        </div>
      </div>
      <div class="ranking-table">
        <table>
          <thead>
            <tr>
              <th>排名</th>
              <th>接口路径</th>
              <th>方法</th>
              <th>调用次数</th>
              <th>成功率</th>
              <th>平均响应</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in rankings" :key="index">
              <td class="rank">{{ index + 1 }}</td>
              <td class="endpoint">{{ item.endpoint }}</td>
              <td class="method" :class="`method-${item.method.toLowerCase()}`">
                {{ item.method }}
              </td>
              <td class="count">{{ item.total_count }}</td>
              <td class="success-rate">
                <span
                  :class="{
                    'rate-good': item.success_rate >= 95,
                    'rate-ok': item.success_rate >= 80 && item.success_rate < 95,
                    'rate-bad': item.success_rate < 80
                  }"
                >
                  {{ item.success_rate?.toFixed(1) }}%
                </span>
              </td>
              <td class="latency">{{ item.avg_latency_ms?.toFixed(0) }} ms</td>
            </tr>
            <tr v-if="!rankings.length">
              <td colspan="6" class="empty">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <LoadingSpinner v-if="loading" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

import LoadingSpinner from '@/shared/ui/LoadingSpinner.vue'
import { getEndpointRanking, getStatisticsOverview, getApiStatistics } from '@/utils/api'
import { toast } from '@/utils/ui/toast'

const loading = ref(false)
const overview = ref<any>({})
const rankings = ref<any[]>([])
const apiStats = ref<any>({ total: {} })

// 排序和数量控制
const sortBy = ref('total_count')
const order = ref('desc')
const limit = ref<number | 'all'>(10) // 默认展示10个

const avgLatency = computed(() => {
  return apiStats.value.total?.avg_latency || 0
})

const loadData = async () => {
  loading.value = true
  try {
    // 获取总览
    overview.value = await getStatisticsOverview()

    // 获取最近7天的接口排行
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // 处理limit参数，确保类型正确
    let limitValue: number | 'all' | undefined
    if (limit.value === 'all') {
      limitValue = 'all'
    } else {
      limitValue = Number(limit.value) || undefined
    }

    const rankingData = await getEndpointRanking(startDate, endDate, sortBy.value, order.value, limitValue)
    rankings.value = rankingData || []

    // 获取API统计总计
    const apiData = await getApiStatistics(startDate, endDate)
    apiStats.value = apiData
  } catch (error: any) {
    toast.error(error?.message || '加载统计数据失败')
  } finally {
    loading.value = false
  }
}

const handleSortChange = () => {
  loadData()
}

const handleLimitChange = (value: number | 'all') => {
  // 检查是否为"all"选项
  if (value === 'all') {
    limit.value = 'all'
    loadData()
    return
  }
  
  // 确保输入的是有效数字且在1-100范围内
  const numValue = Number(value)
  if (!isNaN(numValue) && numValue >= 1 && numValue <= 100) {
    limit.value = numValue
    loadData()
  } else {
    // 如果输入无效，重置为之前的值
    limit.value = limit.value
    toast.error('请输入1-100之间的数字')
  }
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

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.ranking-table {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: #f9fafb;
}

th {
  padding: 12px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  border-bottom: 2px solid #e5e7eb;
}

td {
  padding: 12px;
  font-size: 14px;
  border-bottom: 1px solid #f3f4f6;
}

tbody tr:hover {
  background: #f9fafb;
}

.rank {
  font-weight: 700;
  color: #667eea;
}

.endpoint {
  font-family: 'Courier New', monospace;
  color: #111827;
}

.method {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.method-get {
  background: #dbeafe;
  color: #1e40af;
}

.method-post {
  background: #dcfce7;
  color: #166534;
}

.method-put {
  background: #fef3c7;
  color: #92400e;
}

.method-delete {
  background: #fee2e2;
  color: #991b1b;
}

.count {
  font-weight: 600;
  color: #111827;
}

.rate-good {
  color: #10b981;
  font-weight: 600;
}

.rate-ok {
  color: #f59e0b;
  font-weight: 600;
}

.rate-bad {
  color: #ef4444;
  font-weight: 600;
}

.latency {
  color: #6b7280;
}

.empty {
  text-align: center;
  color: #9ca3af;
  padding: 40px;
}
</style>