// 浏览器定位与反向地理编码（无需后端）
// 1) 优先使用 Geolocation API 获取经纬度
// 2) 使用 BigDataCloud 免费接口做反向地理编码（无需密钥）
// 3) 失败时回退到 IP 定位（BigDataCloud IP 接口）

import { geoConfig, mapConfig } from '@/config'

export interface DetectedRegion {
  province: string
  city: string
  source: 'geolocation' | 'ip' | 'fallback'
}

const GEO_REGION_KEY = 'geo_region_v1'
const TTL = geoConfig.cacheTTL

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
  return s.replace(/市$/u, '').replace(/区$/u, '').replace(/县$/u, '')
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
  } catch (e) {
    void e
  }
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = geoConfig.timeout
): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(input, { ...init, signal: controller.signal })
    return res
  } finally {
    clearTimeout(id)
  }
}

async function reverseGeocode(
  lat: number,
  lon: number,
  timeoutMs = geoConfig.timeout
): Promise<DetectedRegion> {
  // 并行请求 BigDataCloud 与 Nominatim，提高准确度与鲁棒性
  const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh-CN`
  const nomiUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=zh-CN`

  const [bdcRes, nomiRes] = await Promise.allSettled([
    fetchWithTimeout(bdcUrl, undefined, timeoutMs)
      .then(r => r.json())
      .catch(() => null),
    fetchWithTimeout(nomiUrl, { headers: { 'User-Agent': 'shequ-app/1.0' } }, timeoutMs)
      .then(r => r.json())
      .catch(() => null)
  ])

  const bdc = (bdcRes.status === 'fulfilled' ? bdcRes.value : null) as any
  const nomi = (nomiRes.status === 'fulfilled' ? nomiRes.value : null) as any

  const bdcProvince = normalizeProvince(bdc?.principalSubdivision || '')
  const bdcCity = normalizeCity(bdc?.city || bdc?.locality || '')

  const addr = nomi?.address || {}
  const nomiProvince = normalizeProvince(addr.state || addr.region || '')
  const nomiCityPrimary = normalizeCity(
    addr.city || addr.town || addr.municipality || addr.county || addr.village || ''
  )
  const nomiCounty = normalizeCity(addr.county || '')

  // 省份优先取 Nominatim（更精细），否则取 BDC
  const province = nomiProvince || bdcProvince
  // 城市优先取 Nominatim 的 city/town/municipality；若无则回退 BDC
  let city = nomiCityPrimary || bdcCity

  // 针对山东威海下辖县级市的纠偏：乳山/荣成/文登 -> 威海
  const inferred = inferPrefectureFromCounty(province, nomiCounty)
  if (inferred) {
    city = inferred
  }

  // 若误判为青岛但经度明显在威海以东，则纠偏为威海
  const correctedByGeo = fixQingdaoWeihaiByCoords(province, city, lon)
  if (correctedByGeo) {
    city = correctedByGeo
  }

  return { province, city, source: 'geolocation' }
}

function inferPrefectureFromCounty(province: string, county: string): string {
  if (!province || !county) return ''
  // 目前仅在实际反馈异常的区域做精确纠偏，可按需扩展
  if (province === '山东') {
    const weihaiCounties = new Set(['乳山', '荣成', '文登'])
    if (weihaiCounties.has(county)) return '威海'
  }
  return ''
}

function fixQingdaoWeihaiByCoords(province: string, city: string, lon: number): string {
  if (province !== '山东') return ''
  // 经验规则：青岛经度一般 < 121；若判为青岛但经度 >= 121，则更可能是威海方向
  if (city === '青岛' && lon >= 121) return '威海'
  return ''
}

function getUrlLatLonOverride(): { lat: number; lon: number } | null {
  try {
    const params = new URLSearchParams(window.location.search)
    const latStr = params.get('lat')
    const lonStr = params.get('lon') || params.get('lng')
    if (!latStr || !lonStr) return null
    const lat = Number(latStr)
    const lon = Number(lonStr)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
    return { lat, lon }
  } catch {
    return null
  }
}

async function geolocate(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('GEO_UNSUPPORTED'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: geoConfig.browserTimeout,
      maximumAge: geoConfig.browserMaxAge
    })
  })
}

async function ipLocate(timeoutMs = geoConfig.timeout): Promise<DetectedRegion> {
  const res = await fetchWithTimeout(
    'https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=zh-CN',
    undefined,
    timeoutMs
  )
  const data = await res.json()
  const province = normalizeProvince(data.principalSubdivision || '')
  const city = normalizeCity(data.city || data.locality || '')
  return { province, city, source: 'ip' }
}

type DetectOptions = {
  timeoutMs?: number
  method?: 'auto' | 'geo' | 'ip'
  provider?: 'auto' | 'amap' | 'builtin'
}

async function amapReverseGeocode(
  lat: number,
  lon: number,
  timeoutMs = geoConfig.timeout
): Promise<DetectedRegion | null> {
  const key = geoConfig.amapKey
  if (!key) return null
  const url = `https://restapi.amap.com/v3/geocode/regeo?key=${encodeURIComponent(key)}&location=${lon},${lat}&extensions=base&radius=${mapConfig.searchRadius}&output=json`
  try {
    const res = await fetchWithTimeout(url, undefined, timeoutMs)
    const j = await res.json()
    const comp = j?.regeocode?.addressComponent || {}
    const province = normalizeProvince(comp.province || '')
    const city = normalizeCity(comp.city || comp.district || '')
    if (province || city) return { province, city, source: 'geolocation' }
  } catch (e) {
    void e
    /* no-op: amapReverseGeocode 失败时回退其他提供商 */
  }
  return null
}

async function amapIpLocate(timeoutMs = geoConfig.timeout): Promise<DetectedRegion | null> {
  const key = geoConfig.amapKey
  if (!key) return null
  const url = `https://restapi.amap.com/v3/ip?key=${encodeURIComponent(key)}`
  try {
    const res = await fetchWithTimeout(url, undefined, timeoutMs)
    const j = await res.json()
    const province = normalizeProvince(j?.province || '')
    const city = normalizeCity(j?.city || '')
    if (province || city) return { province, city, source: 'ip' }
  } catch (e) {
    void e
    /* no-op: amapIpLocate 失败时回退其他提供商 */
  }
  return null
}

export async function detectCurrentRegion(
  force = false,
  options?: DetectOptions
): Promise<DetectedRegion | null> {
  if (!force) {
    const cached = readCachedRegion()
    if (cached) return cached
  }
  const timeoutMs = options?.timeoutMs ?? geoConfig.timeout
  const method = options?.method || 'auto'
  const provider = options?.provider || 'auto'

  async function detectGeo(): Promise<DetectedRegion | null> {
    try {
      // URL 覆盖优先（便于调试/纠错）
      const override = getUrlLatLonOverride()
      const coords = override
        ? { latitude: override.lat, longitude: override.lon }
        : (await geolocate()).coords
      const { latitude, longitude } = coords
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
    臺: '台',
    灣: '湾',
    廣: '广',
    東: '东',
    陝: '陕',
    門: '门',
    陰: '阴',
    陽: '阳',
    雲: '云',
    貴: '贵',
    嶽: '岳',
    連: '连',
    遼: '辽',
    黑龍江: '黑龙江',
    齊: '齐',
    濟: '济',
    蘇: '苏',
    滬: '沪',
    瀋: '沈',
    晉: '晋',
    浙: '浙',
    粵: '粤',
    寧: '宁',
    渝: '渝',
    甯: '宁',
    陝西: '陕西',
    中國: '中国',
    重慶: '重庆',
    廣西: '广西',
    內蒙古: '内蒙古',
    新疆維吾爾自治區: '新疆维吾尔自治区',
    西藏自治區: '西藏自治区',
    寧夏回族自治區: '宁夏回族自治区',
    廣東: '广东',
    山東: '山东',
    貴州: '贵州',
    雲南: '云南',
    濰: '潍',
    濟南: '济南',
    煙臺: '烟台',
    威海: '威海',
    青島: '青岛',
    濰坊: '潍坊',
    濟寧: '济宁',
    臨沂: '临沂'
  }
  let s = input
  for (const [k, v] of Object.entries(map)) {
    s = s.replace(new RegExp(k, 'g'), v)
  }
  return s
}
