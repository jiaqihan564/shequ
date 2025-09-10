// 浏览器定位与反向地理编码（无需后端）
// 1) 优先使用 Geolocation API 获取经纬度
// 2) 使用 BigDataCloud 免费接口做反向地理编码（无需密钥）
// 3) 失败时回退到 IP 定位（BigDataCloud IP 接口）

export interface DetectedRegion {
  province: string
  city: string
  source: 'geolocation' | 'ip' | 'fallback'
}

const GEO_REGION_KEY = 'geo_region_v1'
const TTL = 24 * 60 * 60 * 1000 // 24h 缓存

function normalizeProvince(name: string): string {
  if (!name) return ''
  const s = toSimplified(name)
  return s
    .replace(/省$/u, '')
    .replace(/市$/u, '')
    .replace(/壮族自治区$/u, '')
    .replace(/回族自治区$/u, '')
    .replace(/维吾尔自治区$/u, '')
    .replace(/自治区$/u, '')
    .replace(/特别行政区$/u, '')
}

function normalizeCity(name: string): string {
  if (!name) return ''
  const s = toSimplified(name)
  return s.replace(/市$/u, '').replace(/区$/u, '')
}

function readCachedRegion(): DetectedRegion | null {
  try {
    const raw = localStorage.getItem(GEO_REGION_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > TTL) return null
    return data as DetectedRegion
  } catch {
    return null
  }
}

function writeCachedRegion(region: DetectedRegion) {
  try {
    localStorage.setItem(GEO_REGION_KEY, JSON.stringify({ data: region, ts: Date.now() }))
  } catch {}
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(input, { ...init, signal: controller.signal })
    return res
  } finally {
    clearTimeout(id)
  }
}

async function reverseGeocode(lat: number, lon: number, timeoutMs = 5000): Promise<DetectedRegion> {
  // 使用 zh-CN，尽量返回简体中文
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh-CN`
  const res = await fetchWithTimeout(url, undefined, timeoutMs)
  const data = await res.json()
  let province = normalizeProvince(data.principalSubdivision || '')
  let city = normalizeCity(data.city || data.locality || '')

  // 如果缺失或不准确，使用 Nominatim 作为兜底更精确（基于 OpenStreetMap）
  if (!province || !city) {
    try {
      const nomiUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=zh-CN`
      const r2 = await fetchWithTimeout(nomiUrl, { headers: { 'User-Agent': 'shequ-app/1.0' } }, timeoutMs)
      const j2 = await r2.json()
      const addr = j2.address || {}
      province = province || normalizeProvince(addr.state || addr.region || '')
      city = city || normalizeCity(addr.city || addr.county || addr.town || addr.village || '')
    } catch {}
  }
  return { province, city, source: 'geolocation' }
}

async function geolocate(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('GEO_UNSUPPORTED'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 7000,
      maximumAge: 5 * 60 * 1000
    })
  })
}

async function ipLocate(timeoutMs = 5000): Promise<DetectedRegion> {
  const res = await fetchWithTimeout('https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=zh-CN', undefined, timeoutMs)
  const data = await res.json()
  const province = normalizeProvince(data.principalSubdivision || '')
  const city = normalizeCity(data.city || data.locality || '')
  return { province, city, source: 'ip' }
}

type DetectOptions = { timeoutMs?: number; method?: 'auto' | 'geo' | 'ip'; provider?: 'auto' | 'amap' | 'builtin' }

async function amapReverseGeocode(lat: number, lon: number, timeoutMs = 5000): Promise<DetectedRegion | null> {
  const key = (import.meta as any).env?.VITE_AMAP_KEY
  if (!key) return null
  const url = `https://restapi.amap.com/v3/geocode/regeo?key=${encodeURIComponent(key)}&location=${lon},${lat}&extensions=base&radius=3000&output=json`
  try {
    const res = await fetchWithTimeout(url, undefined, timeoutMs)
    const j = await res.json()
    const comp = j?.regeocode?.addressComponent || {}
    const province = normalizeProvince(comp.province || '')
    const city = normalizeCity(comp.city || comp.district || '')
    if (province || city) return { province, city, source: 'geolocation' }
  } catch {}
  return null
}

async function amapIpLocate(timeoutMs = 5000): Promise<DetectedRegion | null> {
  const key = (import.meta as any).env?.VITE_AMAP_KEY
  if (!key) return null
  const url = `https://restapi.amap.com/v3/ip?key=${encodeURIComponent(key)}`
  try {
    const res = await fetchWithTimeout(url, undefined, timeoutMs)
    const j = await res.json()
    const province = normalizeProvince(j?.province || '')
    const city = normalizeCity(j?.city || '')
    if (province || city) return { province, city, source: 'ip' }
  } catch {}
  return null
}

export async function detectCurrentRegion(force = false, options?: DetectOptions): Promise<DetectedRegion | null> {
  if (!force) {
    const cached = readCachedRegion()
    if (cached) return cached
  }
  const timeoutMs = options?.timeoutMs ?? 5000
  const method = options?.method || 'auto'
  const provider = options?.provider || 'auto'

  async function detectGeo(): Promise<DetectedRegion | null> {
    try {
      const pos = await geolocate()
      const { latitude, longitude } = pos.coords
      if (provider === 'amap' || provider === 'auto') {
        const a = await amapReverseGeocode(latitude, longitude, timeoutMs)
        if (a) return a
      }
      const region = await reverseGeocode(latitude, longitude, timeoutMs)
      return region
    } catch {
      return null
    }
  }

  async function detectIp(): Promise<DetectedRegion | null> {
    if (provider === 'amap' || provider === 'auto') {
      const a = await amapIpLocate(timeoutMs)
      if (a) return a
    }
    try {
      const region = await ipLocate(timeoutMs)
      return region
    } catch {
      return null
    }
  }

  let region: DetectedRegion | null = null
  if (method === 'geo') {
    region = await detectGeo()
  } else if (method === 'ip') {
    region = await detectIp()
  } else {
    region = (await detectGeo()) || (await detectIp())
  }

  if (!region) {
    region = { province: '', city: '', source: 'fallback' }
  }
  // 兜底：若城市缺失但存在区县，尽量从 Nominatim 的 county/town 推断市级（已在上游处理）
  region.province = toSimplified(region.province)
  region.city = toSimplified(region.city)
  writeCachedRegion(region)
  return region
}

export function readDetectedRegion(): DetectedRegion | null {
  return readCachedRegion()
}

// 简繁转换（最小实现）：常见省市异体字映射
function toSimplified(input: string): string {
  const map: Record<string, string> = {
    '臺': '台', '灣': '湾', '廣': '广', '東': '东', '陝': '陕', '門': '门', '陰': '阴', '陽': '阳',
    '雲': '云', '貴': '贵', '嶽': '岳', '連': '连', '遼': '辽', '黑龍江': '黑龙江', '齊': '齐', '濟': '济',
    '蘇': '苏', '滬': '沪', '瀋': '沈', '晉': '晋', '浙': '浙', '粵': '粤', '寧': '宁', '渝': '渝', '甯': '宁',
    '陝西': '陕西', '中國': '中国', '重慶': '重庆', '廣西': '广西', '內蒙古': '内蒙古', '新疆維吾爾自治區': '新疆维吾尔自治区',
    '西藏自治區': '西藏自治区', '寧夏回族自治區': '宁夏回族自治区', '廣東': '广东', '山東': '山东', '貴州': '贵州', '雲南': '云南',
    '濰': '潍', '濟南': '济南', '煙臺': '烟台', '威海': '威海', '青島': '青岛', '濰坊': '潍坊', '濟寧': '济宁', '臨沂': '临沂'
  }
  let s = input
  for (const [k, v] of Object.entries(map)) {
    s = s.replace(new RegExp(k, 'g'), v)
  }
  return s
}


