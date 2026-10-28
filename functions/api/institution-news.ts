interface Env {}

interface PagesContext {
  request: Request
  env: Env
}

export async function onRequestGet ({ request }: PagesContext) {
  const url = new URL(request.url)
  const institution = (url.searchParams.get('institution') || '').trim().replace(/\s+/g, ' ')
  if (institution.length < 2 || institution.length > 180) {
    return Response.json({ error: 'Provide a valid institution name.' }, { status: 400 })
  }

  const searchTerms = `"${institution}" Nigeria university OR polytechnic news`
  const feeds = [
    { url: `https://news.google.com/rss/search?q=${encodeURIComponent(searchTerms)}&hl=en-NG&gl=NG&ceid=NG:en`, label: 'Google News' },
    { url: `https://www.bing.com/news/search?q=${encodeURIComponent(`"${institution}" Nigeria`)}&format=rss`, label: 'Bing News' },
    { url: `https://r.jina.ai/https://www.bing.com/news/search?q=${encodeURIComponent(`"${institution}" Nigeria`)}&format=rss`, label: 'Bing News' },
  ]
  try {
    let items: Array<{ title: string, url: string, source: string, published_at: string | null }> = []
    let source = ''
    for (const feed of feeds) {
      try {
        const response = await fetch(feed.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 StudentSuccessHub/1.0 (institution news feed)' },
          signal: AbortSignal.timeout(12_000),
        })
        if (!response.ok) {
          continue
        }
        const xml = await response.text()
        if (xml.length > 1_000_000) {
          continue
        }
        items = parseFeed(xml, feed.label)
        if (items.length > 0) {
          source = feed.label
          break
        }
      } catch {
        // Try the next public RSS source when one provider is unavailable.
      }
    }

    return Response.json({ institution, items, source: source ? `${source} RSS` : 'News RSS' }, {
      headers: { 'Cache-Control': 'public, max-age=900, s-maxage=900' },
    })
  } catch {
    return Response.json({ error: 'Could not load institution news right now.' }, { status: 502 })
  }
}

function parseFeed (xml: string, defaultSource: string) {
  if (!xml.includes('<item>')) {
    return [...xml.matchAll(/^### \[([^\]]+)\]\((https?:\/\/[^)]+)\)/gim)]
      .slice(0, 12)
      .map(([, title, url]) => ({
        title: decodeXml(title),
        url,
        source: defaultSource,
        published_at: null,
      }))
  }

  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 12).map(([, item]) => {
    const read = (tag: string) => decodeXml(item.match(new RegExp(String.raw`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`, 'i'))?.[1] || '')
    const title = read('title')
    const link = read('link')
    const source = read('source') || defaultSource
    const publishedAt = read('pubDate')
    if (!title || !link || !/^https:\/\//i.test(link)) {
      return null
    }
    return { title, url: link, source, published_at: Number.isNaN(Date.parse(publishedAt)) ? null : new Date(publishedAt).toISOString() }
  }).filter(Boolean)
}

function decodeXml (value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, '\'')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}
