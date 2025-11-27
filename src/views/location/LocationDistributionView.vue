<template>
  <div class="location-container">
    <header class="location-header">
      <h2 class="title">🌏 全国用户地区分布</h2>
      <p class="subtitle">实时展示各地区用户分布情况</p>
    </header>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div
          class="card-icon"
          style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        >
          🗺️
        </div>
        <div class="card-content">
          <div class="card-label">覆盖省份</div>
          <div class="card-value">{{ data.total_provinces || 0 }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div
          class="card-icon"
          style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
        >
          🏙️
        </div>
        <div class="card-content">
          <div class="card-label">覆盖城市</div>
          <div class="card-value">{{ data.total_cities || 0 }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div
          class="card-icon"
          style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
        >
          👑
        </div>
        <div class="card-content">
          <div class="card-label">用户最多省份</div>
          <div class="card-value">{{ topProvince }}</div>
        </div>
      </div>
    </div>

    <!-- 省份排行榜 -->
    <div class="chart-section full-width">
      <h3 class="section-title">Top 10 省份排行</h3>
      <div ref="provinceChart" class="chart" style="height: 450px"></div>
    </div>

    <!-- 中国地图分布 -->
    <div class="chart-section full-width">
      <h3 class="section-title">🗺️ 中国地图分布</h3>
      <div ref="worldMapChart" class="chart" style="height: 500px"></div>
    </div>

    <!-- 省份分布饼图 -->
    <div class="chart-section full-width">
      <h3 class="section-title">省份用户分布</h3>
      <div class="province-pie">
        <div ref="provincePieChart" class="province-pie__chart"></div>
        <div class="province-pie__legend">
          <div
            v-for="item in provincePieLegend"
            :key="item.name"
            class="legend-item"
          >
            <span class="legend-dot" :style="{ backgroundColor: item.color }" />
            <div class="legend-info">
              <span class="legend-name">{{ item.name }}</span>
              <span class="legend-value">
                {{ item.value.toLocaleString() }}人 · {{ item.percent }}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <LoadingSpinner v-if="loading" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'

import LoadingSpinner from '@/shared/ui/LoadingSpinner.vue'
import { getLocationDistribution } from '@/utils/api'
import echarts from '@/utils/echarts'
import { toast } from '@/utils/ui/toast'

const loading = ref(false)
const data = ref<any>({
  province_stats: [],
  total_provinces: 0,
  total_cities: 0
})

const provinceChart = ref<HTMLElement>()
const provincePieChart = ref<HTMLElement>()
const worldMapChart = ref<HTMLElement>()
const provincePieLegend = ref<
  Array<{ name: string; value: number; percent: string; color: string }>
>([])

const pieColors = [
  '#6366F1',
  '#A855F7',
  '#EC4899',
  '#F97316',
  '#10B981',
  '#14B8A6',
  '#0EA5E9',
  '#F59E0B',
  '#8B5CF6',
  '#EF4444',
  '#3B82F6',
  '#84CC16',
  '#D946EF',
  '#22D3EE',
  '#FB7185'
]

const topProvince = computed(() => {
  if (data.value.province_stats && data.value.province_stats.length > 0) {
    const top = data.value.province_stats[0]
    return `${top.province} (${top.user_count}人)`
  }
  return '暂无'
})

const loadData = async () => {
  loading.value = true
  try {
    const result = await getLocationDistribution()
    data.value = result || {}

    renderCharts()
  } catch (error: any) {
    toast.error(error?.message || '加载地区分布失败')
  } finally {
    loading.value = false
  }
}

const renderCharts = async () => {
  // 等待DOM更新完成
  await nextTick()

  const provinceStats = data.value.province_stats || []

  // 渲染世界地图（独立错误处理）
  if (worldMapChart.value && provinceStats.length > 0) {
    try {
      renderWorldMap()
    } catch (error) {
      console.error('世界地图渲染失败:', error)
    }
  }

  // 渲染省份柱状图（Top 10）
  if (provinceChart.value && provinceStats.length > 0) {
    try {
      const topProvinces = provinceStats.slice(0, 10)
      const provinceNames = topProvinces.map((p: any) => p.province)
      const provinceValues = topProvinces.map((p: any) => p.user_count)

      const chart1 = echarts.init(provinceChart.value)
      chart1.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: (params: any) => {
            const index = params[0].dataIndex
            const p = topProvinces[topProvinces.length - 1 - index]
            return `${p.province}<br/>用户数: ${p.user_count}人<br/>登录次数: ${p.login_count}次`
          }
        },
        grid: {
          left: '10%',
          right: '10%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'value',
          name: '用户数'
        },
        yAxis: {
          type: 'category',
          data: provinceNames.reverse(),
          axisLabel: {
            fontSize: 13,
            fontWeight: 600
          }
        },
        series: [
          {
            name: '用户数',
            type: 'bar',
            data: provinceValues.reverse(),
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: '#667eea' },
                { offset: 1, color: '#764ba2' }
              ]),
              borderRadius: [0, 8, 8, 0]
            },
            label: {
              show: true,
              position: 'right',
              formatter: (params: any) => {
                const index = params.dataIndex
                const p = topProvinces[topProvinces.length - 1 - index]
                return `${p.user_count}人(${p.login_count}次)`
              },
              fontWeight: 600
            }
          }
        ]
      })
    } catch (error) {
      console.error('省份柱状图渲染失败:', error)
    }
  } else {
    console.warn('省份柱状图容器未就绪或无数据', {
      容器存在: !!provinceChart.value,
      数据长度: provinceStats.length
    })
  }

  // 渲染省份分布饼图
  if (provincePieChart.value && provinceStats.length > 0) {
    try {
      const provincePieData = provinceStats.map((p: any) => ({
        name: p.province,
        value: p.user_count
      }))
      const total = provincePieData.reduce(
        (sum: number, item: { value: number }) => sum + (Number(item.value) || 0),
        0
      )
      provincePieLegend.value = provincePieData.map((item: { name: string; value: number }, idx: number) => ({
        name: item.name,
        value: item.value,
        percent: total ? ((item.value / total) * 100).toFixed(2) : '0.00',
        color: pieColors[idx % pieColors.length]
      }))

      const chart3 = echarts.init(provincePieChart.value)
      chart3.setOption({
        color: pieColors,
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c}人 ({d}%)'
        },
        legend: {
          show: false
        },
        series: [
          {
            name: '用户分布',
            type: 'pie',
            radius: ['45%', '70%'],
            center: ['38%', '50%'],
            data: provincePieData,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            label: {
              formatter: '{b}\n{d}%',
              fontWeight: 600
            },
            itemStyle: {
              borderRadius: 8,
              borderColor: '#fff',
              borderWidth: 2
            }
          }
        ]
      })
    } catch (error) {
      console.error('省份分布图渲染失败:', error)
      provincePieLegend.value = []
    }
  } else {
    console.warn('省份分布图未渲染，可能原因：', {
      容器存在: !!provincePieChart.value,
      数据条数: provinceStats.length
    })
    provincePieLegend.value = []
  }
}

// 渲染中国地图
const renderWorldMap = async () => {
  if (!worldMapChart.value) return

  const provinceStats = data.value.province_stats || []

  // 省份名称映射（数据库名称 -> 地图名称）
  const provinceNameMap: any = {
    北京: '北京',
    上海: '上海',
    天津: '天津',
    重庆: '重庆',
    广东: '广东省',
    山东: '山东省',
    江苏: '江苏省',
    浙江: '浙江省',
    四川: '四川省',
    湖北: '湖北省',
    湖南: '湖南省',
    河南: '河南省',
    河北: '河北省',
    陕西: '陕西省',
    福建: '福建省',
    安徽: '安徽省',
    江西: '江西省',
    云南: '云南省',
    贵州: '贵州省',
    广西: '广西壮族自治区',
    新疆: '新疆维吾尔自治区',
    内蒙古: '内蒙古自治区',
    西藏: '西藏自治区',
    宁夏: '宁夏回族自治区',
    海南: '海南省',
    辽宁: '辽宁省',
    吉林: '吉林省',
    黑龙江: '黑龙江省',
    山西: '山西省',
    甘肃: '甘肃省',
    青海: '青海省',
    台湾: '台湾省',
    香港: '香港特别行政区',
    澳门: '澳门特别行政区'
  }

  // 转换为地图数据格式，使用完整的省份名称
  const mapData = provinceStats.map((p: any) => ({
    name: provinceNameMap[p.province] || p.province,
    value: p.user_count
  }))

  const chart = echarts.init(worldMapChart.value)

  try {
    // 使用阿里云DataV提供的中国地图JSON
    const chinaMapUrl = 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json'
    const response = await fetch(chinaMapUrl)
    const chinaJson = await response.json()

    // 注册中国地图
    echarts.registerMap('china', chinaJson)

    chart.setOption({
      backgroundColor: '#f3f4f6',
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.value) {
            return `<div style="padding: 8px; background: rgba(0,0,0,0.9); color: #fff; border-radius: 6px; border: 2px solid #667eea;">
              <div style="font-weight: bold; margin-bottom: 4px;">${params.name}</div>
              <div style="color: #a5b4fc;">用户数: ${params.value}人</div>
            </div>`
          }
          return params.name
        }
      },
      visualMap: {
        min: 0,
        max: Math.max(...provinceStats.map((p: any) => p.user_count), 10),
        text: ['高', '低'],
        realtime: true,
        calculable: true,
        inRange: {
          color: ['#e0e7ff', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca']
        },
        left: 'left',
        top: 'bottom',
        textStyle: {
          color: '#333'
        }
      },
      series: [
        {
          name: '用户分布',
          type: 'map',
          map: 'china',
          roam: true,
          data: mapData,
          label: {
            show: true,
            color: '#333',
            fontSize: 10
          },
          itemStyle: {
            areaColor: '#e0e7ff',
            borderColor: '#a5b4fc',
            borderWidth: 1
          },
          emphasis: {
            label: {
              show: true,
              color: '#fff',
              fontSize: 12,
              fontWeight: 'bold'
            },
            itemStyle: {
              areaColor: '#818cf8',
              borderColor: '#667eea',
              borderWidth: 2,
              shadowBlur: 10,
              shadowColor: 'rgba(102, 126, 234, 0.5)'
            }
          }
        }
      ]
    })
  } catch (error) {
    console.error('加载中国地图失败:', error)
    chart.setOption({
      title: {
        text: '地图加载失败',
        subtext: '请检查网络连接',
        left: 'center',
        top: 'center'
      }
    })
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.location-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.location-header {
  margin-bottom: 32px;
  text-align: center;
}

.title {
  font-size: 32px;
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
  font-size: 15px;
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
  padding: 24px;
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
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.card-content {
  flex: 1;
}

.card-label {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 6px;
}

.card-value {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
}

.chart-section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.chart-section.full-width {
  grid-column: 1 / -1;
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

.province-pie {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  min-height: 420px;
}

.province-pie__chart {
  flex: 0 0 55%;
  height: 420px;
}

.province-pie__legend {
  flex: 1;
  max-height: 420px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 8px;
}

.province-pie__legend .legend-item {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid #f3f4f6;
  background: #f9fafb;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.legend-name {
  font-weight: 600;
  color: #111827;
}

.legend-value {
  font-size: 13px;
  color: #6b7280;
}
</style>
