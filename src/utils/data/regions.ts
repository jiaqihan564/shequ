import { reactive, computed } from 'vue'

import { cacheConfig } from '@/config'
import { get } from '@/utils/api'

export interface Province {
  name: string
  cities?: string[]
  municipality?: boolean
}

interface RegionsResponse {
  provinces: Province[]
}

const REGIONS_CACHE_KEY = 'regions_cache_v1'
const REGIONS_CACHE_TTL = cacheConfig.regionsTTL

const fallbackRegions: RegionsResponse = {
  provinces: [
    { name: '北京', municipality: true },
    { name: '上海', municipality: true },
    { name: '天津', municipality: true },
    { name: '重庆', municipality: true },
    { name: '广东', cities: ['广州', '深圳', '佛山', '东莞', '惠州', '珠海'] },
    { name: '浙江', cities: ['杭州', '宁波', '温州', '嘉兴', '金华', '台州'] },
    { name: '江苏', cities: ['南京', '苏州', '无锡', '常州', '南通', '扬州', '常州'] },
    { name: '四川', cities: ['成都', '绵阳', '德阳', '南充', '乐山', '自贡'] },
    { name: '湖北', cities: ['武汉', '宜昌', '襄阳', '黄石', '荆州', '孝感'] },
    { name: '陕西', cities: ['西安', '咸阳', '宝鸡', '渭南', '汉中', '榆林'] }
  ]
}

const state = reactive<{ loaded: boolean; provinces: Province[] }>({
  loaded: false,
  provinces: []
})

function readCache(): RegionsResponse | null {
  try {
    const raw = localStorage.getItem(REGIONS_CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > REGIONS_CACHE_TTL) return null
    return data as RegionsResponse
  } catch {
    return null
  }
}

function writeCache(data: RegionsResponse) {
  try {
    localStorage.setItem(REGIONS_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch (e) {
    void e
    /* no-op: 缓存写入失败时忽略 */
  }
}

async function fetchFromApi(): Promise<RegionsResponse> {
  try {
    const data = await get<RegionsResponse>('/regions')
    return data
  } catch {
    return fallbackRegions
  }
}

export async function ensureRegionsLoaded(): Promise<void> {
  if (state.loaded && state.provinces.length > 0) return
  const cached = readCache()
  const data = cached || (await fetchFromApi())
  state.provinces = data.provinces || []
  state.loaded = true
  if (!cached) writeCache(data)
}

export function useRegions() {
  const provinceNames = computed(() => state.provinces.map(p => p.name))
  const municipalities = computed(
    () => new Set(state.provinces.filter(p => p.municipality).map(p => p.name))
  )
  const getCities = (provinceName: string): string[] => {
    const p = state.provinces.find(p => p.name === provinceName)
    return p?.cities || []
  }
  const addressOptions = computed(() => {
    const opts: { label: string; value: string }[] = []
    for (const p of state.provinces) {
      if (p.municipality) {
        opts.push({ label: p.name, value: p.name })
      } else {
        for (const c of p.cities || []) {
          opts.push({ label: `${p.name} - ${c}`, value: `${p.name}|${c}` })
        }
      }
    }
    return opts
  })

  return { state, provinceNames, municipalities, getCities, addressOptions }
}
