export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const pathname = url.pathname.replace(/^\/?/, '/')

    // Only handle /top-headlines
    if (!pathname.startsWith('/top-headlines')) {
      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      })
    }

    const apiKey = env.GNEWS_API_KEY || url.searchParams.get('key')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing GNEWS_API_KEY' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      })
    }

    const lang = url.searchParams.get('lang') || 'zh'
    const country = url.searchParams.get('country') || 'cn'
    const max = url.searchParams.get('max') || '5'
    const category = url.searchParams.get('category') || 'general'

    const gnews = new URL('https://gnews.io/api/v4/top-headlines')
    gnews.searchParams.set('lang', lang)
    gnews.searchParams.set('country', country)
    gnews.searchParams.set('max', max)
    gnews.searchParams.set('topic', category)
    gnews.searchParams.set('apikey', apiKey)

    try {
      const res = await fetch(gnews.toString(), { headers: { Accept: 'application/json' } })
      if (!res.ok) {
        return new Response(JSON.stringify({ error: 'Upstream error', status: res.status }), {
          status: 502,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        })
      }
      const data = await res.json()
      const articles = Array.isArray(data?.articles) ? data.articles : []

      const mapped = articles.map(a => {
        const id = `g_${btoa(a.url || a.title || Math.random().toString()).replace(/=+$/g, '')}`
        return {
          id,
          title: a.title || '',
          source: a.source?.name || 'GNews',
          url: a.url || '',
          imageUrl: a.image || '',
          publishedAt: a.publishedAt || new Date().toISOString(),
          summary: a.description || ''
        }
      })

      return new Response(JSON.stringify({ items: mapped }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=60'
        }
      })
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Proxy failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      })
    }
  }
}
