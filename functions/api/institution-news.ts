interface Env {}

interface PagesContext {
  request: Request
  env: Env
}

export const onRequestGet = async ({ request }: PagesContext) => {
  const url = new URL(request.url)
  const institution = (url.searchParams.get('institution') || '').trim().replace(/\s+/g, ' ')
  if (institution.length < 2 || institution.length > 180) {
    return Response.json({ error: 'Provide a valid institution name.' }, { status: 400 })
  }

  const query = encodeURIComponent(`"${institution}" Nigeria university OR polytechnic news`)
  const feedUrl = `https://news.google.com/rss/search?q=${query}&hl=en-NG&gl=NG&ceid=NG:en`
  try {
    const response = await fetch(feedUrl, {
      headers: { 'User-Agent': 'StudentSuccessHub/1.0 (institution news feed)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return Response.json({ error: 'The news feed is temporarily unavailable.' }, { status: 502 })
    const xml = await response.text()
    if (xml.length > 1_000_000) return Response.json({ error: 'The news feed response was too large.' }, { status: 502 })

    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 12).map(([, item]) => {
      const read = (tag: string) => decodeXml(item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1] || '')
      const title = read('title')
      const link = read('link')
      const source = read('source') || 'Google News'
      const publishedAt = read('pubDate')
      if (!title || !link || !/^https:\/\//i.test(link)) return null
      return { title, url: link, source, published_at: Number.isNaN(Date.parse(publishedAt)) ? null : new Date(publishedAt).toISOString() }
    }).filter((item): item is NonNullable<typeof item> => Boolean(item))

    return Response.json({ institution, items, source: 'Google News RSS' }, {
      headers: { 'Cache-Control': 'public, max-age=900, s-maxage=900' },
    })
  } catch {
    return Response.json({ error: 'Could not load institution news right now.' }, { status: 502 })
  }
}

function decodeXml (value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
}
