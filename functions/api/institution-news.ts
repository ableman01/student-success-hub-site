interface PagesContext { request: Request }
interface NewsItem { title: string, url: string, source: string, published_at: string | null, summary?: string }

const textCache = new Map<string, { expiresAt: number, text: string }>()
const siteCache = new Map<string, { expiresAt: number, site: string | null }>()

export async function onRequestGet ({ request }: PagesContext) {
  const params = new URL(request.url).searchParams
  const institution = (params.get('institution') || '').trim().replace(/\s+/g, ' ')
  const type = (params.get('type') || '').trim().toLowerCase()
  if (institution.length < 2 || institution.length > 180 || !['university', 'polytechnic', 'education', 'monotechnic'].includes(type)) {
    return Response.json({ error: 'Provide a valid institution and category.' }, { status: 400 })
  }
  try {
    const officialSite = await getOfficialInstitutionSite(type, institution)
    const items = officialSite ? await getOfficialNews(officialSite) : []
    const newsSite = items.length > 0 ? new URL(items[0].url).origin : officialSite
    return Response.json({ institution, officialSite: newsSite, items, source: newsSite ? new URL(newsSite).hostname : null }, {
      headers: { 'Cache-Control': 'public, max-age=900, s-maxage=900' },
    })
  } catch (error) {
    console.error('Could not load official institution news:', institution, error)
    return Response.json({ error: 'Could not check this institution’s official website right now.' }, { status: 502 })
  }
}

async function getOfficialInstitutionSite (type: string, institution: string) {
  const key = `${type}:${normalizeName(institution)}`
  const cached = siteCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.site
  }

  let site: string | null = null
  if (isLasuName(institution)) {
    site = 'https://www.lasu.edu.ng'
  } else {
    switch (type) {
      case 'university': {
        site = await findUniversitySite(institution)
        break
      }
      case 'polytechnic':
      case 'monotechnic': {
        site = await findNbteSite(institution, type)
        break
      }
      case 'education': { {
        site = await findCollegeSite(institution)
      // No default
      }
      break
      }
    }
  }

  siteCache.set(key, { site, expiresAt: Date.now() + 86_400_000 })
  return site
}

function isLasuName (name: string) {
  return /^lagos state university(?: \(lasu\))?(?:, ojo(?:, lagos)?)?$/i.test(name.trim().replace(/\s+/g, ' '))
}

async function findUniversitySite (institution: string) {
  const registryPages = [
    'https://www.nuc.edu.ng/nigerian-univerisities/federal-univeristies/',
    'https://www.nuc.edu.ng/nigerian-univerisities/state-univerisity/',
    'https://www.nuc.edu.ng/nigerian-univerisities/private-univeristies/',
  ]
  const pages = await Promise.all(registryPages.map(async url => {
    try {
      return await getText(url)
    } catch {
      return ''
    }
  }))
  const rows = pages.flatMap(page => parseUniversityRows(page))
  return bestSiteMatch(institution, rows)
}

async function findNbteSite (institution: string, type: string) {
  const listUrl = `https://www.digitalnbte.nbte.gov.ng/Public/Institutions?type=${type}`
  const html = await getText(listUrl)
  const rows = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map(([, attributes, body]) => {
    const href = readAttribute(attributes, 'href')
    if (!/\/Public\/Institutions\/\d+/.test(href)) {
      return null
    }
    return { name: cleanText(body.match(/class="irow__name"[^>]*>([\s\S]*?)<\//i)?.[1] || body), url: new URL(href, listUrl).href }
  }).filter((row): row is { name: string, url: string } => Boolean(row?.name))
  const match = bestNameMatch(institution, rows)
  if (!match) {
    return null
  }
  const details = await getText(match.url)
  return extractOfficialUrls(details).find(value => !value.includes('nbte.gov.ng'))?.replace(/\/$/, '') || null
}

async function findCollegeSite (institution: string) {
  const html = await getText('https://www.ncce.gov.ng/AccreditedColleges')
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(([, row]) => {
    const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(([, cell]) => cell)
    if (cells.length < 2) {
      return null
    }
    const name = cleanText(cells[1])
    const siteCell = cells.at(-1) || ''
    const site = extractOfficialUrls(siteCell)[0] || normalizeSite(cleanText(siteCell))
    return { name, url: site && isLikelyInstitutionDomain(site) ? site.replace(/\/$/, '') : '' }
  }).filter((row): row is { name: string, url: string } => Boolean(row?.name && row.url))
  return bestSiteMatch(institution, rows)
}

async function getText (url: string) {
  const cached = textCache.get(url)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.text
  }
  const response = await fetch(url, {
    headers: { 'User-Agent': 'StudentSuccessHub/1.0 (+official institution news reader)' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) {
    throw new Error(`Official website returned HTTP ${response.status}`)
  }
  const text = await response.text()
  if (text.length > 1_500_000) {
    throw new Error('Official website response is too large')
  }
  textCache.set(url, { text, expiresAt: Date.now() + 86_400_000 })
  return text
}

function parseUniversityRows (html: string) {
  return [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(([, row]) => {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(([, cell]) => cell)
    if (cells.length < 4) {
      return null
    }
    const name = cleanText(cells[1])
    const site = extractOfficialUrls(cells[3])[0]
    return name && site ? { name, url: site.replace(/\/$/, '') } : null
  }).filter(Boolean)
}

function bestSiteMatch (institution: string, rows: Array<{ name: string, url: string }>) {
  return bestNameMatch(institution, rows)?.url || null
}

function bestNameMatch (institution: string, rows: Array<{ name: string, url: string }>) {
  const target = normalizeName(institution)
  const exact = rows.find(row => normalizeName(row.name) === target && row.url)
  if (exact) {
    return exact
  }
  const ranked = rows.map(row => ({ row, score: nameScore(target, normalizeName(row.name)) }))
    .filter(candidate => candidate.row.url)
    .toSorted((a, b) => b.score - a.score)
  if (!ranked[0] || ranked[0].score < 0.72 || (ranked[1] && ranked[0].score - ranked[1].score < 0.08)) {
    return null
  }
  return ranked[0].row
}

function normalizeName (value: string) {
  return value.toLocaleLowerCase('en-US').normalize('NFD').replace(/[\u0300-\u036F]/g, '').replace(/&amp;/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}

function nameScore (left: string, right: string) {
  const ignored = new Set(['university', 'polytechnic', 'college', 'education', 'federal', 'state', 'of', 'the', 'and', 'open'])
  const leftWords = new Set(left.split(' ').filter(word => !ignored.has(word)))
  const rightWords = new Set(right.split(' ').filter(word => !ignored.has(word)))
  if (leftWords.size === 0 || rightWords.size === 0) {
    return 0
  }
  const overlap = [...leftWords].filter(word => rightWords.has(word)).length
  return overlap / Math.max(leftWords.size, rightWords.size)
}

function extractOfficialUrls (html: string) {
  return [...html.matchAll(/href=["']([^"']+)["']|\b(https?:\/\/[^\s"'<>]+)/gi)]
    .map(([, href, plain]) => normalizeSite(decodeEntities(href || plain || '')))
    .filter((value): value is string => Boolean(value) && isLikelyInstitutionDomain(value))
}

function isLikelyInstitutionDomain (value: string) {
  try {
    const host = new URL(value.startsWith('http') ? value : `https://${value}`).hostname.toLowerCase()
    return !/myschool|admissions\.cloud|admitnode|varsityscape|nbte\.gov|nuc\.gov|ncce\.gov/.test(host)
  } catch {
    return false
  }
}

function normalizeSite (value: string) {
  try {
    const url = new URL(value.startsWith('//') ? `https:${value}` : (value.startsWith('http') ? value : `https://${value}`))
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : ''
  } catch {
    return ''
  }
}

function cleanText (value: string) {
  return decodeEntities(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')).trim()
}

function decodeEntities (value: string) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, '\'').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;|&#160;/g, ' ')
}

async function getOfficialNews (officialSite: string): Promise<NewsItem[]> {
  let origin = `${new URL(officialSite).protocol}//${new URL(officialSite).host}`
  if (new URL(origin).hostname.endsWith('lasu.edu.ng')) {
    const html = await getText('https://www.lasu.edu.ng/home/news/ajax/index.php')
    return parseLasuNews(html)
  }
  const wordpressNews = await getWordPressNews(origin)
  if (wordpressNews.length > 0) {
    return wordpressNews
  }

  let homepage: string
  try {
    homepage = await getText(origin)
  } catch (error) {
    if (!new URL(origin).hostname.startsWith('www.')) {
      throw error
    }
    origin = `${new URL(origin).protocol}//${new URL(origin).hostname.slice(4)}`
    homepage = await getText(origin)
  }
  const discoveredFeeds = [...homepage.matchAll(/<link\b[^>]*>/gi)].flatMap(([tag]) => {
    const attributes = readAttributes(tag)
    if (!attributes.rel?.includes('alternate') || !/^application\/(?:rss|atom)\+xml/i.test(attributes.type || '') || !attributes.href) {
      return []
    }
    return [new URL(attributes.href, origin).href]
  }).filter(url => isSameOfficialSite(url, origin))
  const candidates = [...new Set([...discoveredFeeds, `${origin}/feed/`, `${origin}/rss/`, `${origin}/news/`, `${origin}/news`, `${origin}/announcements/`, `${origin}/latest-news/`, `${origin}/media/news/`])].slice(0, 9)
  const pages = await Promise.all(candidates.map(async candidate => {
    try {
      return { url: candidate, text: await getText(candidate) }
    } catch {
      return null
    }
  }))
  const items: NewsItem[] = []
  for (const page of pages.filter(Boolean)) {
    const feedItems = parseFeed(page.text, page.url, origin)
    if (feedItems.length > 0) {
      return feedItems
    }
    items.push(...parseOfficialPage(page.text, page.url, origin))
    if (items.length >= 12) {
      break
    }
  }
  return dedupeNews(items).slice(0, 12)
}

function parseLasuNews (html: string): NewsItem[] {
  const cards = html.match(/<div class="single-latest-item">[\s\S]*?(?=<div class="single-latest-item">|$)/gi) || []
  return cards.map(card => {
    const matches = [...card.matchAll(/href=["'](?:\.\.\/news\/)?read\.php\?id=(\d+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    const article = matches.find(match => cleanText(match[2]).length > 12)
    if (!article) {
      return null
    }
    const [, id, rawTitle] = article
    const date = cleanText(card.match(/zmdi-calendar-check[^>]*><\/i>\s*([^<]+)/i)?.[1] || '')
    return {
      title: cleanText(rawTitle),
      url: `https://www.lasu.edu.ng/home/news/read.php?id=${id}`,
      source: 'LASU official website',
      published_at: Number.isNaN(Date.parse(date)) ? null : new Date(date).toISOString(),
    }
  }).filter(Boolean).slice(0, 12)
}

async function getWordPressNews (origin: string): Promise<NewsItem[]> {
  try {
    const response = await fetch(`${origin}/wp-json/wp/v2/posts?per_page=12&_fields=link,date,title,excerpt`, {
      headers: { 'User-Agent': 'StudentSuccessHub/1.0 (+official institution news reader)' }, signal: AbortSignal.timeout(7000),
    })
    if (!response.ok) {
      return []
    }
    const posts = await response.json() as Array<{ link?: string, date?: string, title?: { rendered?: string }, excerpt?: { rendered?: string } }>
    return posts.map(post => ({
      title: cleanText(post.title?.rendered || ''), url: post.link || '', source: new URL(origin).hostname,
      published_at: post.date && !Number.isNaN(Date.parse(post.date)) ? new Date(post.date).toISOString() : null,
      summary: cleanText(post.excerpt?.rendered || ''),
    })).filter(item => item.title && isSameOfficialSite(item.url, origin)).slice(0, 12)
  } catch {
    return []
  }
}

function parseFeed (xml: string, base: string, origin: string): NewsItem[] {
  if (!/<item\b|<entry\b/i.test(xml)) {
    return []
  }
  return [...xml.matchAll(/<(?:item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi)].map(([, entry]) => {
    const title = cleanText(entry.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')
    const linkTags = [...entry.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => readAttributes(tag))
    const linkTag = linkTags.find(attributes => attributes.rel !== 'self')?.href
    const linkText = entry.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]
    const link = decodeEntities(linkTag || linkText || '').trim()
    const dateText = cleanText(entry.match(/<(?:pubDate|published|updated|dc:date)[^>]*>([\s\S]*?)<\//i)?.[1] || '')
    if (!title || !link || !isSameOfficialSite(new URL(link, base).href, origin)) {
      return null
    }
    return { title, url: new URL(link, base).href, source: new URL(origin).hostname, published_at: Number.isNaN(Date.parse(dateText)) ? null : new Date(dateText).toISOString() }
  }).filter(Boolean)
}

function parseOfficialPage (html: string, pageUrl: string, origin: string): NewsItem[] {
  const articleCards = [...html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)].map(([, card]) => card)
  const blocks = articleCards.length > 0 ? articleCards : [html]
  const items: NewsItem[] = []
  for (const block of blocks) {
    const links = [...block.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    for (const [, attributes, rawTitle] of links) {
      const target = new URL(readAttribute(attributes, 'href'), pageUrl)
      const title = cleanText(rawTitle)
      if (!title || title.length < 12 || !isSameOfficialSite(target.href, origin) || !/news|notice|announcement|update|press|event/i.test(target.pathname)) {
        continue
      }
      items.push({ title, url: target.href, source: target.hostname, published_at: null })
    }
  }
  return dedupeNews(items)
}

function isSameOfficialSite (value: string, origin: string) {
  try {
    return new URL(value).hostname.toLowerCase() === new URL(origin).hostname.toLowerCase()
  } catch {
    return false
  }
}

function readAttributes (tag: string) {
  return Object.fromEntries([...tag.matchAll(/([a-z-]+)=["']([^"']*)["']/gi)]
    .map(([, name, value]) => [name.toLowerCase(), decodeEntities(value)])) as Record<string, string>
}

function readAttribute (tag: string, attribute: string) {
  return readAttributes(tag)[attribute] || ''
}

function dedupeNews (items: NewsItem[]) {
  return [...new Map(items.map(item => [item.url, item])).values()]
}
