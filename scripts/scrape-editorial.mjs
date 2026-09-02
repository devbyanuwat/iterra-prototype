#!/usr/bin/env node
/**
 * Crawls the editorial side of kohler.co.th and reports what is there.
 *
 * Two things the prototype was missing and the client asked for: the videos
 * (YouTube embeds, not files) and the blog (real articles, not the six invented
 * posts in lib/posts.ts). This script only *reads* — it writes one JSON report
 * and downloads nothing. `scripts/build-editorial.mjs` consumes the report.
 *
 * Kept separate from the download step on purpose: the crawl is the part that
 * hits a third-party host 30+ times, so it should be re-runnable and cacheable
 * on its own, and a bad selector should cost a re-parse rather than a re-crawl.
 *
 * Usage: node scripts/scrape-editorial.mjs <out.json> [cacheDir]
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'

const ORIGIN = 'https://www.kohler.co.th'
const ATTEMPTS = 4
const CONCURRENCY = 4

// Where to start looking. The article routes are not listed anywhere as a feed,
// so the seeds are the pages that link to them: the home page, both buying-guide
// hubs, both /ideas pages and the press room.
const SEEDS = [
  '/',
  '/articles/bathroom-product-buying-guides.html',
  '/articles/kitchen-product-buying-guides.html',
  '/ideas/bathroomIdeas',
  '/ideas/kitchenIdeas',
  '/press-releases',
  // Carries a video that no article route links to.
  '/kohler-150-anniversary',
]

const outFile = process.argv[2]
const cacheDir = process.argv[3] ?? path.join(import.meta.dirname, '..', '.cache', 'editorial')
if (!outFile) {
  console.error('usage: node scripts/scrape-editorial.mjs <out.json> [cacheDir]')
  process.exit(2)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const slug = (s) =>
  s
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

/** Fetch HTML with retry, cached on disk so a re-parse costs no network. */
async function getHtml(url) {
  const key = path.join(cacheDir, slug(url.replace(ORIGIN, '')) + '.html')
  try {
    return await readFile(key, 'utf8')
  } catch {
    /* not cached yet */
  }
  let last
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          // Without a browser UA the CDN answers some routes with a 403 shell.
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
          'accept-language': 'th-TH,th;q=0.9,en;q=0.8',
        },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      await mkdir(cacheDir, { recursive: true })
      await writeFile(key, html)
      return html
    } catch (err) {
      last = err
      if (attempt < ATTEMPTS) await sleep(400 * attempt)
    }
  }
  throw new Error(`${url}: ${last?.message ?? 'failed'}`)
}

// ── extraction ─────────────────────────────────────────────────────────────
// Regex rather than a DOM parser because there is no parser dependency in this
// project and adding one for a six-field extraction is not worth it. Every
// field is checked in the report, so a bad match shows up as an empty string
// rather than as silently wrong data.

const meta = (html, prop) => {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`,
    'i',
  )
  const alt = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`,
    'i',
  )
  return (html.match(re) ?? html.match(alt) ?? [])[1] ?? ''
}

const decode = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim()

const strip = (s) => decode(s.replace(/<[^>]+>/g, ' '))

function youtubeIds(html) {
  const ids = new Set()
  const patterns = [
    /(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([\w-]{11})/g,
    /["'](?:videoId|video_id|ytid|youtubeId)["']\s*[:=]\s*["']([\w-]{11})["']/g,
    /data-(?:video-id|youtube-id)=["']([\w-]{11})["']/g,
  ]
  for (const re of patterns) {
    let m
    while ((m = re.exec(html))) ids.add(m[1])
  }
  return [...ids]
}

/**
 * The article body, from Kohler's own template classes.
 *
 * The first version of this filtered every <p> on the page by length, and every
 * article came back with the mega-nav ("แสดงการค้นหา bathroom อ่างล้างหน้า …")
 * as paragraph one, because that nav is long. Their article template is
 * actually well marked up, so read it rather than guess:
 *
 *   section.c-koh-article-pages          the whole article, nav excluded
 *     .koh-article-pages-banner            hero — an <img>, or the YouTube iframe
 *     h1.koh-article-pages-title           title
 *     .koh-article-pages-text-title        subheads
 *     .koh-article-pages-text-body         paragraphs
 *     .koh-article-img-video img           section images, with real Thai alt
 */
function articleSection(html) {
  const at = html.indexOf('c-koh-article-pages')
  if (at < 0) return null
  return html.slice(at)
}

const byClass = (html, cls) =>
  [...html.matchAll(new RegExp(`<[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*>([\\s\\S]*?)</`, 'g'))]
    .map((m) => strip(m[1]))
    .filter(Boolean)

function paragraphs(section) {
  const out = []
  for (const text of byClass(section, 'koh-article-pages-text-body')) {
    if (text.length < 40) continue
    if (/cookie|javascript|©|copyright|สงวนลิขสิทธิ์/i.test(text)) continue
    if (!out.includes(text)) out.push(text)
  }
  return out
}

/** Section images with the alt text Kohler wrote for them. */
function sectionImages(section) {
  const out = []
  for (const m of section.matchAll(/<img[^>]+>/g)) {
    const tag = m[0]
    const src = (tag.match(/src=["']([^"']+)["']/) ?? [])[1]
    const alt = decode((tag.match(/alt=["']([^"']*)["']/) ?? [])[1] ?? '')
    if (!src || !/scene7\.com/.test(src)) continue
    if (out.some((i) => i.src === src)) continue
    out.push({ src: decode(src), alt })
  }
  return out
}

/** Every /articles/*.html, /ideas/* and /press-releases link on a page. */
function editorialLinks(html) {
  const out = new Set()
  const re = /href=["']([^"']+)["']/g
  let m
  while ((m = re.exec(html))) {
    let href = decode(m[1])
    if (href.startsWith(ORIGIN)) href = href.slice(ORIGIN.length)
    if (!href.startsWith('/')) continue
    if (/^\/articles\/[^/]+\.html$/.test(href)) out.add(href)
    else if (/^\/ideas\/[A-Za-z]+$/.test(href)) out.add(href)
    else if (href === '/press-releases' || href === '/kohler-150-anniversary') out.add(href)
  }
  return [...out]
}

/**
 * Hero. `.koh-article-pages-banner` is the article's own opening slot and holds
 * either an <img> or the YouTube iframe — so on a video article the hero *is*
 * the video, which is why `bannerVideo` is reported separately rather than
 * lumped in with the incidental embeds further down the page.
 * og:image is the fallback, then the first Scene7 asset in the section.
 */
function hero_(section, html) {
  const banner = (section.match(/koh-article-pages-banner[\s\S]{0,600}?<(img|iframe)[^>]+>/) ?? [])[0] ?? ''
  const bannerImg = (banner.match(/<img[^>]+src=["']([^"']+)["']/) ?? [])[1]
  const bannerVideo = (banner.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/) ?? [])[1] ?? ''
  const og = meta(html, 'og:image')
  const first = (section.match(/https:\/\/[^"' ]*scene7\.com\/is\/image\/[^"' ]+/) ?? [])[0]
  const src = bannerImg || og || first || ''
  return {
    hero: decode(src.startsWith('//') ? `https:${src}` : src),
    bannerVideo,
  }
}

// ── crawl ──────────────────────────────────────────────────────────────────

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let i = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const at = i++
        out[at] = await fn(items[at], at)
      }
    }),
  )
  return out
}

const seen = new Set()
const routes = []
const failures = []
const seedVideos = []
const foundOn = new Map()

for (const seed of SEEDS) {
  try {
    const html = await getHtml(ORIGIN + seed)
    for (const href of editorialLinks(html)) {
      if (seen.has(href)) continue
      seen.add(href)
      routes.push(href)
      // Which hub linked it is the only room signal Kohler's article markup
      // carries — the pages themselves have no category, tag or date field.
      foundOn.set(href, seed)
    }
    // The home page is a seed but never a route, so its embed would be missed —
    // and that is the one the client noticed first.
    for (const id of youtubeIds(html)) seedVideos.push({ id, foundOn: seed })
    // the seeds are editorial pages in their own right
    if (seed !== '/' && !seen.has(seed)) {
      seen.add(seed)
      routes.push(seed)
    }
  } catch (err) {
    failures.push({ route: seed, error: String(err.message ?? err) })
  }
}

const pages = await mapLimit(routes, CONCURRENCY, async (route) => {
  try {
    const html = await getHtml(ORIGIN + route)
    const section = articleSection(html)
    if (!section) return { route, url: ORIGIN + route, template: 'not-an-article', paragraphs: [], paragraphCount: 0, chars: 0, videos: youtubeIds(html), images: [] }
    const h1 = byClass(section, 'koh-article-pages-title')[0] ?? ''
    const ogTitle = decode(meta(html, 'og:title')).replace(/\s*\|\s*KOHLER.*$/i, '').trim()
    const body = paragraphs(section)
    const { hero, bannerVideo } = hero_(section, html)
    return {
      route,
      url: ORIGIN + route,
      template: 'article',
      linkedFrom: foundOn.get(route) ?? null,
      title: h1 || ogTitle,
      ogTitle,
      subheads: byClass(section, 'koh-article-pages-text-title'),
      hero,
      bannerVideo,
      videos: youtubeIds(html),
      images: sectionImages(section),
      paragraphs: body,
      paragraphCount: body.length,
      chars: body.join('').length,
    }
  } catch (err) {
    failures.push({ route, error: String(err.message ?? err) })
    return null
  }
})

const ok = pages.filter(Boolean)
const report = {
  crawledAt: new Date().toISOString(),
  origin: ORIGIN,
  seeds: SEEDS,
  routeCount: ok.length,
  videoIds: [...new Set([...seedVideos.map((v) => v.id), ...ok.flatMap((p) => p.videos)])],
  seedVideos,
  pages: ok.sort((a, b) => b.chars - a.chars),
  failures,
}

await mkdir(path.dirname(path.resolve(outFile)), { recursive: true })
await writeFile(outFile, JSON.stringify(report, null, 2))

console.log(`routes ${ok.length} · videos ${report.videoIds.length} · failures ${failures.length}`)
for (const p of ok) {
  console.log(
    `  ${p.route}  ¶${p.paragraphCount} ${p.chars}ch  ${p.videos.length ? 'yt:' + p.videos.join(',') : ''}${p.hero ? '' : '  NO-HERO'}`,
  )
}
if (failures.length) {
  for (const f of failures) console.error(`  FAIL ${f.route}: ${f.error}`)
  process.exit(1)
}
