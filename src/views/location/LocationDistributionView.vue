<template>
  <div class="location-container">
    <header class="location-header">
      <h2 class="title">🌏 全国用户地区分布</h2>
      <p class="subtitle">实时展示各地区用户分布情况</p>
    </header>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="card-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
          🗺️
        </div>
        <div class="card-content">
          <div class="card-label">覆盖省份</div>
          <div class="card-value">{{ data.total_provinces || 0 }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="card-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
          🏙️
        </div>
        <div class="card-content">
          <div class="card-label">覆盖城市</div>
          <div class="card-value">{{ data.total_cities || 0 }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="card-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)">
          👑
        </div>
        <div class="card-content">
          <div class="card-label">用户最多省份</div>
          <div class="card-value">{{ topProvince }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="card-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%)">
          🌟
        </div>
        <div class="card-content">
          <div class="card-label">用户最多城市</div>
          <div class="card-value">{{ topCity }}</div>
        </div>
      </div>
    </div>

    <!-- 3D中国地图 -->
    <div class="chart-section full-width">
      <h3 class="section-title">🗺️ 3D中国地图用户分布</h3>
      <div ref="globe3DChart" class="chart" style="height: 600px"></div>
    </div>

    <div class="charts-grid">
      <!-- 省份排行榜 -->
      <div class="chart-section">
        <h3 class="section-title">Top 10 省份排行</h3>
        <div ref="provinceChart" class="chart" style="height: 450px"></div>
      </div>

      <!-- 城市排行榜 -->
      <div class="chart-section">
        <h3 class="section-title">Top 10 城市排行</h3>
        <div ref="cityChart" class="chart" style="height: 450px"></div>
      </div>
    </div>

    <!-- 中国地图分布 -->
    <div class="chart-section full-width">
      <h3 class="section-title">🗺️ 中国地图分布</h3>
      <div ref="worldMapChart" class="chart" style="height: 500px"></div>
    </div>

    <!-- 省份分布饼图 -->
    <div class="chart-section full-width">
      <h3 class="section-title">省份用户分布</h3>
      <div ref="provincePieChart" class="chart" style="height: 400px"></div>
    </div>

    <LoadingSpinner v-if="loading" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import echarts from '@/utils/echarts'

import LoadingSpinner from '@/shared/ui/LoadingSpinner.vue'
import { getLocationDistribution } from '@/utils/api'
import { toast } from '@/utils/toast'
import { mapConfig } from '@/config'

const loading = ref(false)
const data = ref<any>({
  province_stats: [],
  city_stats: [],
  total_provinces: 0,
  total_cities: 0
})

const provinceChart = ref<HTMLElement>()
const cityChart = ref<HTMLElement>()
const provincePieChart = ref<HTMLElement>()
const globe3DChart = ref<HTMLElement>()
const worldMapChart = ref<HTMLElement>()

const topProvince = computed(() => {
  if (data.value.province_stats && data.value.province_stats.length > 0) {
    const top = data.value.province_stats[0]
    return `${top.province} (${top.user_count}人)`
  }
  return '暂无'
})

const topCity = computed(() => {
  if (data.value.city_stats && data.value.city_stats.length > 0) {
    const top = data.value.city_stats[0]
    return `${top.city} (${top.user_count}人)`
  }
  return '暂无'
})

const loadData = async () => {
  loading.value = true
  try {
    const result = await getLocationDistribution()
    data.value = result || {}
    
    console.log('地区分布数据:', {
      省份数量: data.value.province_stats?.length,
      城市数量: data.value.city_stats?.length,
      省份数据: data.value.province_stats,
      城市数据: data.value.city_stats
    })
    
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
  const cityStats = data.value.city_stats || []
  
  console.log('开始渲染图表，数据量:', {
    省份: provinceStats.length,
    城市: cityStats.length,
    完整数据: data.value
  })

  // 渲染3D地球（独立错误处理）
  if (globe3DChart.value && provinceStats.length > 0) {
    try {
      console.log('渲染3D地球')
      render3DGlobe()
    } catch (error) {
      console.error('3D地球渲染失败:', error)
    }
  }

  // 渲染世界地图（独立错误处理）
  if (worldMapChart.value && provinceStats.length > 0) {
    try {
      console.log('渲染世界地图')
      renderWorldMap()
    } catch (error) {
      console.error('世界地图渲染失败:', error)
    }
  }

  // 渲染省份柱状图（Top 10）
  if (provinceChart.value && provinceStats.length > 0) {
    try {
      console.log('渲染省份柱状图')
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
    series: [{
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
    }]
  })
      console.log('省份柱状图渲染成功')
    } catch (error) {
      console.error('省份柱状图渲染失败:', error)
    }
  } else {
    console.warn('省份柱状图容器未就绪或无数据', {
      容器存在: !!provinceChart.value,
      数据长度: provinceStats.length
    })
  }

  // 渲染城市柱状图（Top 10）
  if (cityChart.value && cityStats.length > 0) {
    try {
      console.log('渲染城市柱状图')
      const topCities = cityStats.slice(0, 10)
  const cityNames = topCities.map((c: any) => `${c.city} (${c.province})`)
  const cityValues = topCities.map((c: any) => c.user_count)

  const chart2 = echarts.init(cityChart.value)
  chart2.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const index = params[0].dataIndex
        const c = topCities[topCities.length - 1 - index]
        return `${c.city} (${c.province})<br/>用户数: ${c.user_count}人<br/>登录次数: ${c.login_count}次`
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
      data: cityNames.reverse(),
      axisLabel: {
        fontSize: 13,
        fontWeight: 600
      }
    },
    series: [{
      name: '用户数',
      type: 'bar',
      data: cityValues.reverse(),
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#4facfe' },
          { offset: 1, color: '#00f2fe' }
        ]),
        borderRadius: [0, 8, 8, 0]
      },
      label: {
        show: true,
        position: 'right',
        formatter: (params: any) => {
          const index = params[0].dataIndex
          const c = topCities[topCities.length - 1 - index]
          return `${c.user_count}人(${c.login_count}次)`
        },
        fontWeight: 600
      }
    }]
  })
      console.log('城市柱状图渲染成功')
    } catch (error) {
      console.error('城市柱状图渲染失败:', error)
    }
  } else {
    console.warn('城市柱状图容器未就绪或无数据', {
      容器存在: !!cityChart.value,
      数据长度: cityStats.length
    })
  }

  // 渲染省份分布饼图
  if (provincePieChart.value && provinceStats.length > 0) {
    try {
      console.log('渲染省份分布饼图')
      const provincePieData = provinceStats.map((p: any) => ({
    name: p.province,
    value: p.user_count
  }))

  const chart3 = echarts.init(provincePieChart.value)
  chart3.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}人 ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: '10%',
      top: 'center',
      formatter: (name: string) => {
        const item = provinceStats.find((p: any) => p.province === name)
        return `${name} - ${item?.user_count || 0}人`
      }
    },
    series: [{
      name: '用户分布',
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['40%', '50%'],
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
    }]
  })
      console.log('省份分布饼图渲染成功')
    } catch (error) {
      console.error('省份分布饼图渲染失败:', error)
    }
  } else {
    console.warn('省份分布饼图容器未就绪或无数据', {
      容器存在: !!provincePieChart.value,
      数据长度: provinceStats.length
    })
  }
}

// 渲染3D中国地图
const render3DGlobe = async () => {
  if (!globe3DChart.value) return
  
  const provinceStats = data.value.province_stats || []
  
  console.log('3D地图 - 原始省份数据:', provinceStats)
  
  if (provinceStats.length === 0) {
    console.warn('3D地图 - 没有省份数据')
    return
  }
  
  // 省份名称映射（数据库名称 -> 地图名称）
  const provinceNameMap: any = {
    '北京': '北京',
    '上海': '上海',
    '天津': '天津',
    '重庆': '重庆',
    '广东': '广东',
    '山东': '山东',
    '江苏': '江苏',
    '浙江': '浙江',
    '四川': '四川',
    '湖北': '湖北',
    '湖南': '湖南',
    '河南': '河南',
    '河北': '河北',
    '陕西': '陕西',
    '福建': '福建',
    '安徽': '安徽',
    '江西': '江西',
    '云南': '云南',
    '贵州': '贵州',
    '广西': '广西',
    '新疆': '新疆',
    '内蒙古': '内蒙古',
    '西藏': '西藏',
    '宁夏': '宁夏',
    '海南': '海南',
    '辽宁': '辽宁',
    '吉林': '吉林',
    '黑龙江': '黑龙江',
    '山西': '山西',
    '甘肃': '甘肃',
    '青海': '青海'
  }
  
  // 准备3D柱状图数据 [省份名, 用户数, 用户数(作为高度)]
  // 注意：第三个值会被用作柱子的高度
  const maxUserCount = Math.max(...provinceStats.map((p: any) => p.user_count))
  const barData = provinceStats.map((p: any) => {
    const mapName = provinceNameMap[p.province] || p.province
    // 数据格式: [省份名, 高度值(用户数 * 缩放系数)]
    // 为了让柱子高度差异更明显，乘以缩放系数
    const heightScale = mapConfig.heightScale3D
    return {
      name: mapName,
      value: [mapName, p.user_count * heightScale],
      userCount: p.user_count, // 保存原始用户数用于显示
      loginCount: p.login_count
    }
  })
  
  console.log('3D地图 - 转换后的柱状图数据:', barData)
  console.log('3D地图 - 用户数范围:', {
    最小: Math.min(...provinceStats.map((p: any) => p.user_count)),
    最大: maxUserCount,
    缩放后最大高度: maxUserCount * 20
  })

  const chart = echarts.init(globe3DChart.value)
  
  // 使用fetch加载中国地图JSON（使用国内镜像）
  try {
    const chinaMapUrl = 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json'
    const response = await fetch(chinaMapUrl)
    const chinaJson = await response.json()
    
    // 注册中国地图
    echarts.registerMap('china', chinaJson)
    
    chart.setOption({
      backgroundColor: 'rgba(5, 10, 20, 1)',
      tooltip: {
        show: true,
        trigger: 'item',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderColor: '#667eea',
        borderWidth: 2,
        textStyle: {
          color: '#fff',
          fontSize: 13
        },
        formatter: (params: any) => {
          console.log('🎯 Tooltip触发:', {
            类型: params.seriesType || params.componentType,
            名称: params.name,
            数据: params.data,
            值: params.value
          })
          
          // 处理柱状图悬停
          if (params.seriesType === 'bar3D') {
            const provinceName = params.name
            // 从data中获取保存的原始用户数
            const userCount = params.data?.userCount || params.value[1] / 20 // 除以缩放系数
            const loginCount = params.data?.loginCount || 0
            
            return `<div style="padding: 12px; min-width: 180px;">
              <div style="font-weight: bold; margin-bottom: 8px; font-size: 16px; border-bottom: 2px solid #667eea; padding-bottom: 6px;">
                📍 ${provinceName}
              </div>
              <div style="color: #a5b4fc; margin-top: 8px; line-height: 2;">
                <div style="display: flex; justify-content: space-between;">
                  <span>👥 用户数量:</span>
                  <span style="color: #fff; font-weight: bold; margin-left: 10px;">${Math.round(userCount)}人</span>
                </div>
                ${loginCount ? `<div style="display: flex; justify-content: space-between; margin-top: 4px;">
                  <span>🔐 登录次数:</span>
                  <span style="color: #fff; font-weight: bold; margin-left: 10px;">${loginCount}次</span>
                </div>` : ''}
              </div>
            </div>`
          }
          
          // 处理地图省份悬停
          if (params.componentType === 'geo3D') {
            const provinceName = params.name
            const stat = provinceStats.find((p: any) => 
              p.province === provinceName || 
              provinceNameMap[p.province] === provinceName
            )
            
            if (stat) {
              return `<div style="padding: 12px; min-width: 180px;">
                <div style="font-weight: bold; margin-bottom: 8px; font-size: 16px; border-bottom: 2px solid #667eea; padding-bottom: 6px;">
                  📍 ${provinceName}
                </div>
                <div style="color: #a5b4fc; margin-top: 8px; line-height: 2;">
                  <div style="display: flex; justify-content: space-between;">
                    <span>👥 用户数量:</span>
                    <span style="color: #fff; font-weight: bold; margin-left: 10px;">${stat.user_count}人</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                    <span>🔐 登录次数:</span>
                    <span style="color: #fff; font-weight: bold; margin-left: 10px;">${stat.login_count}次</span>
                  </div>
                </div>
              </div>`
            }
          }
          
          return `<div style="padding: 8px;">${params.name || '暂无数据'}</div>`
        }
      },
      geo3D: {
        map: 'china',
        roam: true,
        label: {
          show: false,
          textStyle: {
            color: '#fff',
            fontSize: 10
          }
        },
        itemStyle: {
          color: '#1e3a5f',
          opacity: 0.9,
          borderWidth: 0.8,
          borderColor: '#4a90e2'
        },
        emphasis: {
          itemStyle: {
            color: '#667eea',
            opacity: 1,
            borderWidth: 1.5,
            borderColor: '#f093fb'
          },
          label: {
            show: true,
            textStyle: {
              color: '#fff',
              fontSize: 12,
              fontWeight: 'bold',
              backgroundColor: 'rgba(102, 126, 234, 0.8)',
              padding: [4, 8],
              borderRadius: 4
            }
          }
        },
        shading: 'realistic',
        realisticMaterial: {
          roughness: 0.8,
          metalness: 0.2
        },
        postEffect: {
          enable: true,
          bloom: {
            enable: true,
            intensity: 0.3
          }
        },
        light: {
          main: {
            intensity: 1.2,
            shadow: true,
            shadowQuality: 'high',
            alpha: 40,
            beta: 30
          },
          ambient: {
            intensity: 0.6
          }
        },
        viewControl: {
          autoRotate: true,
          autoRotateSpeed: 10,
          distance: 80,
          minDistance: 50,
          maxDistance: 150,
          alpha: 40,
          beta: 0,
          center: [0, 0, 0],
          projection: 'perspective'
        },
        regionHeight: 3
      },
      series: [{
        type: 'bar3D',
        coordinateSystem: 'geo3D',
        data: barData,
        shading: 'lambert',
        minHeight: 0.5,
        barSize: 3,
        bevelSize: 0.4,
        // 设置柱子高度根据数据值变化
        stack: null,
        itemStyle: {
          color: (params: any) => {
            // 根据原始用户数量设置颜色渐变
            const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c']
            const maxValue = Math.max(...provinceStats.map((p: any) => p.user_count))
            const userCount = params.data?.userCount || Math.round(params.value[1] / 20)
            const ratio = userCount / maxValue
            if (ratio > 0.75) return colors[3]
            if (ratio > 0.5) return colors[2]
            if (ratio > 0.25) return colors[1]
            return colors[0]
          },
          opacity: 0.95
        },
        label: {
          show: true,
          formatter: (params: any) => {
            // 显示省份名和原始用户数（不是缩放后的值）
            const userCount = params.data?.userCount || Math.round(params.value[1] / 20)
            return `${params.name}\n${userCount}人`
          },
          textStyle: {
            color: '#fff',
            fontSize: 11,
            borderColor: '#667eea',
            borderWidth: 1,
            backgroundColor: 'rgba(102, 126, 234, 0.85)',
            padding: [3, 6],
            borderRadius: 3
          }
        },
        emphasis: {
          label: {
            show: true,
            textStyle: {
              fontSize: 14,
              fontWeight: 'bold',
              backgroundColor: 'rgba(240, 147, 251, 0.9)'
            }
          },
          itemStyle: {
            color: '#f093fb',
            opacity: 1
          }
        }
      }]
    })
    
    console.log('✅ 3D地图配置完成')
    console.log('📊 柱状图数量:', barData.length)
    console.log('📈 用户数范围:', {
      最小: Math.min(...provinceStats.map((p: any) => p.user_count)),
      最大: maxUserCount
    })
    console.log('📏 柱子高度缩放系数: 20倍')
    console.log('🎨 颜色映射: 用户数越多颜色越红（蓝→紫→粉→红）')
    console.log('💡 提示: 柱子高度根据用户数自动变化，用户数越多柱子越高')
    console.log('💡 提示: 鼠标悬停在柱子或省份上可以查看详细信息（用户数量和登录次数）')
  } catch (error) {
    console.error('加载中国地图失败:', error)
    console.log('使用简化的3D柱状图方案')
    
    // 备用方案：使用简化的3D散点图
    chart.setOption({
      backgroundColor: 'rgba(5, 10, 20, 1)',
      title: {
        text: '用户省份分布（3D柱状图）',
        left: 'center',
        top: 20,
        textStyle: {
          color: '#fff',
          fontSize: 16
        },
        subtextStyle: {
          color: '#a5b4fc',
          fontSize: 12
        }
      },
      tooltip: {
        formatter: (params: any) => {
          const stat = provinceStats.find((p: any) => p.province === params.name)
          return `<div style="padding: 8px; background: rgba(0,0,0,0.9); color: #fff; border-radius: 6px; border: 2px solid #667eea;">
            <div style="font-weight: bold; margin-bottom: 4px;">${params.name}</div>
            <div style="color: #a5b4fc;">用户数: ${stat?.user_count || 0}人</div>
            <div style="color: #a5b4fc;">登录次数: ${stat?.login_count || 0}次</div>
          </div>`
        }
      },
      xAxis3D: {
        type: 'category',
        data: provinceStats.map((p: any) => p.province),
        axisLabel: {
          color: '#fff',
          fontSize: 10
        }
      },
      yAxis3D: {
        type: 'value',
        name: '用户数',
        nameTextStyle: {
          color: '#fff'
        },
        axisLabel: {
          color: '#fff'
        }
      },
      zAxis3D: {
        type: 'value',
        axisLabel: {
          color: '#fff'
        }
      },
      grid3D: {
        boxWidth: 200,
        boxDepth: 80,
        viewControl: {
          autoRotate: true,
          autoRotateSpeed: 5,
          distance: 200
        },
        light: {
          main: {
            intensity: 1.2,
            shadow: true
          },
          ambient: {
            intensity: 0.5
          }
        }
      },
      series: [{
        type: 'bar3D',
        data: provinceStats.map((p: any) => [
          p.province,
          p.user_count,
          0
        ]),
        shading: 'lambert',
        label: {
          show: true,
          textStyle: {
            color: '#fff',
            fontSize: 10,
            borderColor: '#667eea',
            borderWidth: 1,
            backgroundColor: 'rgba(102, 126, 234, 0.8)',
            padding: [2, 4],
            borderRadius: 2
          },
          formatter: (params: any) => {
            return `${params.value[0]}\n${params.value[1]}人`
          }
        },
        itemStyle: {
          color: (params: any) => {
            const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c']
            const maxValue = Math.max(...provinceStats.map((p: any) => p.user_count))
            const ratio = params.value[1] / maxValue
            if (ratio > 0.75) return colors[3]
            if (ratio > 0.5) return colors[2]
            if (ratio > 0.25) return colors[1]
            return colors[0]
          },
          opacity: 0.9
        },
        emphasis: {
          itemStyle: {
            color: '#f093fb'
          }
        }
      }]
    })
  }
}

// 渲染中国地图（2D版本）
const renderWorldMap = async () => {
  if (!worldMapChart.value) return
  
  const provinceStats = data.value.province_stats || []
  
  console.log('2D地图 - 原始省份数据:', provinceStats)
  
  // 省份名称映射（数据库名称 -> 地图名称）
  const provinceNameMap: any = {
    '北京': '北京',
    '上海': '上海',
    '天津': '天津',
    '重庆': '重庆',
    '广东': '广东省',
    '山东': '山东省',
    '江苏': '江苏省',
    '浙江': '浙江省',
    '四川': '四川省',
    '湖北': '湖北省',
    '湖南': '湖南省',
    '河南': '河南省',
    '河北': '河北省',
    '陕西': '陕西省',
    '福建': '福建省',
    '安徽': '安徽省',
    '江西': '江西省',
    '云南': '云南省',
    '贵州': '贵州省',
    '广西': '广西壮族自治区',
    '新疆': '新疆维吾尔自治区',
    '内蒙古': '内蒙古自治区',
    '西藏': '西藏自治区',
    '宁夏': '宁夏回族自治区',
    '海南': '海南省',
    '辽宁': '辽宁省',
    '吉林': '吉林省',
    '黑龙江': '黑龙江省',
    '山西': '山西省',
    '甘肃': '甘肃省',
    '青海': '青海省',
    '台湾': '台湾省',
    '香港': '香港特别行政区',
    '澳门': '澳门特别行政区'
  }
  
  // 转换为地图数据格式，使用完整的省份名称
  const mapData = provinceStats.map((p: any) => ({
    name: provinceNameMap[p.province] || p.province,
    value: p.user_count
  }))
  
  console.log('2D地图 - 转换后的地图数据:', mapData)

  const chart = echarts.init(worldMapChart.value)
  
  try {
    // 使用阿里云DataV提供的中国地图JSON
    const chinaMapUrl = 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json'
    const response = await fetch(chinaMapUrl)
    const chinaJson = await response.json()
    
    // 注册中国地图（使用不同的名称避免与3D地图冲突）
    echarts.registerMap('china2d', chinaJson)
    console.log('2D地图注册成功')
    
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
      series: [{
        name: '用户分布',
        type: 'map',
        map: 'china2d',
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
      }]
    })
    console.log('2D地图配置完成')
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

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

.chart-section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
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
</style>

