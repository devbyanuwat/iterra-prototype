#!/usr/bin/env node
/**
 * Turns the crawl report from scripts/scrape-editorial.mjs into lib/posts.ts,
 * downloading Kohler's own article imagery and each video's poster frame.
 *
 * WHOSE WORDS THESE ARE
 * Every title, paragraph and alt string this emits is Kohler's, copied from
 * kohler.co.th. Nothing is paraphrased, summarised or translated by us — the
 * excerpt is literally the article's first sentence, cut at a sentence
 * boundary. That is the same licensing position as the product photography and
 * the lifestyle library already in this repo: fine for a prototype shown to the
 * client whose brand it is, not fine to publish anywhere else. Each post keeps
 * `source.url` so the origin is one click away and never gets lost.
 *
 * WHY THE POSTERS ARE LOCAL
 * The video component never contacts YouTube until someone clicks. If the
 * poster were i.ytimg.com the page would still make a third-party request on
 * first paint, which is the thing we are avoiding, so the poster is downloaded
 * here and served from our own origin as webp.
 *
 * OUTPUT
 *   public/lifestyle/editorial/<id>-<width>.webp
 *   lib/posts.ts
 *
 * The `editorial/` subdirectory is deliberate. scripts/build-lifestyle.mjs
 * prunes any *.webp sitting directly in public/lifestyle that it does not know
 * about, so writing these next to its files would mean they vanish the next
 * time anyone regenerates the lifestyle library. It only reads the top level,
 * so a subdirectory is out of its reach.
 *
 * Usage: node scripts/build-editorial.mjs <report.json> [cacheDir]
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'lifestyle', 'editorial')
const PUBLIC_BASE = '/lifestyle/editorial'
const POSTS_TS = path.join(ROOT, 'lib', 'posts.ts')
const WIDTHS = [1800, 900]
const ATTEMPTS = 4
const MIN_BYTES = 6 * 1024

const reportFile = process.argv[2]
const cacheDir = process.argv[3] ?? path.join(ROOT, '.cache', 'editorial-img')
if (!reportFile) {
  console.error('usage: node scripts/build-editorial.mjs <report.json> [cacheDir]')
  process.exit(2)
}

/**
 * The articles we ship, in the order they appear on /articles.
 *
 * Hand-picked rather than "the top N by length" for two reasons: Kohler's Thai
 * site also carries English-only articles (9-tips-for-small-bathrooms,
 * explore-6-designer-bathrooms and three more), which would flip the reader
 * into English mid-catalogue; and the buying-guide stubs are two paragraphs of
 * navigation prose that read as a dead end. `tag` is the one field here that is
 * ours rather than Kohler's — their article markup has no category, so it comes
 * from which hub page linked the article (see `linkedFrom` in the report).
 */
const PICKS = [
  // carries its banner video, and it is the finish story this whole site is built on
  '/articles/the-finish-is-just-the-beginning.html',
  '/articles/intelligent-toilet.html', // banner video
  '/articles/cleaner-toilets-revolution-360.html', // two in-body videos
  '/articles/choosing-the-perfect-kitchen-faucets.html', // in-body video
  '/articles/functional-beauty-reconsidering-the-kitchen-sink-artilcle.html',
  '/articles/designing-the-perfect-powder-room-article.html',
  '/articles/remix-your-routine.html',
  '/articles/cooking-like-a-pro.html',
  '/articles/easy-affordable-bath-upgrades.html',
  '/articles/leap-smart-toilet.html', // two more videos
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const slugify = (s) =>
  s
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

/** `/articles/foo-bar-artilcle.html` → `foo-bar` (their typo included). */
const routeToSlug = (route) =>
  slugify(
    route
      .replace(/^\/articles\//, '')
      .replace(/\.html$/, '')
      .replace(/-artilcle$|-article$/, ''),
  )

const failures = []
const dead = []

async function fetchBuffer(url, { allowMissing = false } = {}) {
  const key = path.join(cacheDir, slugify(url).slice(0, 180))
  try {
    const cached = await readFile(key)
    if (cached.byteLength >= MIN_BYTES) return cached
  } catch {
    /* not cached */
  }
  let last
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0 Safari/537.36' },
      })
      // Scene7 answers a missing rendition with 403 and a short text body, and
      // i.ytimg.com answers a missing poster size with 404. Both are permanent,
      // so retrying them just wastes four round trips.
      if (res.status === 403 || res.status === 404) {
        if (allowMissing) return null
        throw new Error(`HTTP ${res.status} (permanent)`)
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.byteLength < MIN_BYTES) {
        if (allowMissing) return null
        throw new Error(`${buf.byteLength} bytes — too small to be an image`)
      }
      await mkdir(cacheDir, { recursive: true })
      await writeFile(key, buf)
      return buf
    } catch (err) {
      last = err
      if (/permanent/.test(String(err.message)) && !allowMissing) break
      if (attempt < ATTEMPTS) await sleep(400 * attempt)
    }
  }
  if (allowMissing) return null
  throw new Error(`${url}: ${last?.message ?? 'failed'}`)
}

/**
 * Ask Scene7 for the biggest master it actually holds.
 *
 * The URLs in the markup carry Kohler's own banner crop (`extend=…`) and a
 * preset that caps the result at 960px. We want the uncropped master so the
 * crop is ours to make in CSS, and we want it wide enough for a full-bleed
 * slot — so the preset and the crop are dropped and `wid` is stepped down
 * until the server stops refusing. Narrow masters 403 rather than upscaling,
 * which is the behaviour we want and the reason for the ladder.
 */
async function scene7(srcUrl) {
  const base = srcUrl.split('?')[0]
  for (const wid of [1800, 1400, 1200, 960]) {
    const buf = await fetchBuffer(`${base}?wid=${wid}&fmt=jpg&qlt=90`, { allowMissing: true })
    if (buf) return { buf, asked: wid }
  }
  // last resort: exactly the URL Kohler renders, crop and all
  const buf = await fetchBuffer(srcUrl, { allowMissing: true })
  return buf ? { buf, asked: 'as-rendered' } : null
}

/** Write webp renditions, never upscaling. Returns the record posts.ts stores. */
async function emit(id, buf, alt) {
  const meta = await sharp(buf).metadata()
  const widths = WIDTHS.filter((w) => w <= meta.width)
  if (!widths.length) widths.push(meta.width)
  const sources = []
  for (const w of widths) {
    const out = await sharp(buf).resize({ width: w, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
    const info = await sharp(out).metadata()
    await writeFile(path.join(OUT_DIR, `${id}-${info.width}.webp`), out)
    sources.push({ width: info.width, height: info.height, src: `${PUBLIC_BASE}/${id}-${info.width}.webp` })
  }
  sources.sort((a, b) => b.width - a.width)
  return { id, src: sources[0].src, srcSmall: sources.at(-1).src, width: sources[0].width, height: sources[0].height, alt }
}

/**
 * Video title and poster.
 *
 * oEmbed is a public, key-less endpoint and it gives the title Kohler published
 * the video under, which becomes the play button's accessible name — better
 * than a generic "play video" on a page that can hold four of them.
 */
async function video(id) {
  // oEmbed doubles as the liveness check. Three of the nine ids embedded on
  // kohler.co.th are dead at source — o7RWvlMacZk and Rk2I0NMiHOw answer 404,
  // olb1UsbPqWQ answers 403 — and every poster size 404s for exactly those
  // three. Shipping a play button for a video that will open an error is worse
  // than shipping no button, so a dead id returns null and the post drops it.
  let title = ''
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`)
    if (!res.ok) {
      dead.push({ id, status: res.status })
      return null
    }
    title = (await res.json()).title ?? ''
  } catch (err) {
    dead.push({ id, status: String(err.message ?? err) })
    return null
  }
  let poster = null
  for (const name of ['maxresdefault', 'sddefault', 'hqdefault']) {
    const buf = await fetchBuffer(`https://i.ytimg.com/vi/${id}/${name}.jpg`, { allowMissing: true })
    if (buf) {
      poster = await emit(`yt-${id}`, buf, { th: title, en: title })
      break
    }
  }
  if (!poster) {
    dead.push({ id, status: 'alive but no poster rendition' })
    return null
  }
  return { id, title, poster }
}

// ── build ──────────────────────────────────────────────────────────────────

const report = JSON.parse(await readFile(path.resolve(reportFile), 'utf8'))
const byRoute = new Map(report.pages.map((p) => [p.route, p]))
await mkdir(OUT_DIR, { recursive: true })

const TAGS = {
  '/ideas/kitchenIdeas': { th: 'ไอเดียครัว', en: 'Kitchen ideas' },
  '/articles/kitchen-product-buying-guides.html': { th: 'คู่มือเลือกซื้อ', en: 'Buying guide' },
  '/ideas/bathroomIdeas': { th: 'ไอเดียห้องน้ำ', en: 'Bathroom ideas' },
  '/articles/bathroom-product-buying-guides.html': { th: 'คู่มือเลือกซื้อ', en: 'Buying guide' },
}
const DEFAULT_TAG = { th: 'เรื่องเล่าจาก KOHLER', en: 'From KOHLER' }

const KITCHEN_HUBS = new Set(['/ideas/kitchenIdeas', '/articles/kitchen-product-buying-guides.html'])

/**
 * `coverId` exists only for components/home, which renders its three article
 * cards with a ROOM photograph from lib/lifestyle.generated.ts rather than with
 * the article's own picture — a deliberate choice made in an earlier task and
 * not ours to change from here. So the field is kept, pointing at a real room
 * in the space the article is about, and the article's own Kohler imagery lives
 * in `cover`/`hero`/`figures` alongside it. Ids verified against the registry.
 */
const ROOM_POOL = {
  kitchen: ['zab64028-1800x800', 'zab86829-1800x800', 'zaa98109', 'zab37177-rgb', 'aab27241'],
  bath: ['aaa68094-rgb', 'aab15367-rgb', 'aaa80571-1800x800', 'bancroft-02', 'aaa68050-43'],
}

/** First sentence of the article, as the excerpt. Kohler writes no summary. */
function excerptOf(paragraphs) {
  const first = paragraphs[0] ?? ''
  // Thai does not end sentences with a full stop, so break on the spaces Thai
  // typography uses as a clause break, then on Latin punctuation.
  const cut = first.length <= 160 ? first : first.slice(0, 160).replace(/[\s]+\S*$/, '')
  return cut === first ? cut : `${cut}…`
}

const posts = []
const videoIndex = new Map()

for (const route of PICKS) {
  const page = byRoute.get(route)
  if (!page) {
    failures.push({ what: route, error: 'not in the crawl report' })
    continue
  }
  const slug = routeToSlug(route)
  // /articles/leap-smart-toilet.html puts a Scene7 *VideoViewer* URL in its
  // banner slot rather than an image, so the banner is not always a picture.
  // Fall through to the first real section image before giving up.
  const heroCandidates = [page.hero, ...page.images.map((i) => i.src)].filter(
    (u) => u && /scene7\.com\/is\/image\//.test(u),
  )
  let heroFound = null
  let heroUrl = null
  for (const url of heroCandidates) {
    heroFound = await scene7(url)
    if (heroFound) {
      heroUrl = url
      break
    }
  }
  if (!heroFound) {
    failures.push({ what: `${route} hero`, error: `no image rendition among ${heroCandidates.length} candidates` })
    continue
  }
  const heroAlt = { th: page.title, en: page.title }
  const hero = await emit(`${slug}-hero`, heroFound.buf, heroAlt)

  // Section images, capped at three: they are the article's own figures, and
  // more than three turns a 6-paragraph article into a slideshow.
  const figures = []
  // Skip whatever the hero ended up being — on the articles where the banner
  // was an iframe the hero falls back to a section image, and without this the
  // card, the hero and figure one would all be the same picture.
  const figureSources = page.images.filter((i) => i.src !== heroUrl).slice(0, 3)
  for (const [i, img] of figureSources.entries()) {
    const found = await scene7(img.src)
    if (!found) continue
    figures.push(await emit(`${slug}-fig${i + 1}`, found.buf, { th: img.alt || page.title, en: img.alt || page.title }))
  }

  const ids = [...new Set([page.bannerVideo, ...page.videos].filter(Boolean))]
  const videos = []
  for (const id of ids) {
    if (!videoIndex.has(id)) videoIndex.set(id, await video(id))
    const v = videoIndex.get(id)
    if (v) videos.push(v)
  }

  const space = KITCHEN_HUBS.has(page.linkedFrom) ? 'kitchen' : 'bath'
  posts.push({
    slug,
    space,
    coverId: ROOM_POOL[space][posts.filter((p) => p.space === space).length % ROOM_POOL[space].length],
    title: page.title,
    excerpt: excerptOf(page.paragraphs),
    tag: TAGS[page.linkedFrom] ?? DEFAULT_TAG,
    source: { url: page.url, route },
    hero,
    cover: figures[0] ?? hero,
    figures,
    body: page.paragraphs,
    videos,
    bannerVideo: videos.some((v) => v.id === page.bannerVideo) ? page.bannerVideo : null,
  })
}

// ── emit lib/posts.ts ──────────────────────────────────────────────────────

const j = (v) => JSON.stringify(v)
const imageLiteral = (im) =>
  `{ src: ${j(im.src)}, srcSmall: ${j(im.srcSmall)}, width: ${im.width}, height: ${im.height}, alt: ${j(im.alt.th)} }`

const capturedAt = report.crawledAt.slice(0, 10)

const file = `// Generated by scripts/build-editorial.mjs from a crawl of kohler.co.th.
// Do not edit by hand — re-run the two scripts instead:
//   node scripts/scrape-editorial.mjs <report.json>
//   node scripts/build-editorial.mjs  <report.json>
//
// THE TEXT HERE IS KOHLER'S. Titles, paragraphs and image alt strings are
// copied verbatim from their article pages; the excerpt is the first sentence
// of the article, cut at a word boundary. We wrote none of it and translated
// none of it. Same licensing position as the product photography and the
// lifestyle library: fine for a prototype shown to the brand it belongs to,
// not fine to publish. \`source.url\` on every post keeps the origin attached.
//
// Two fields are ours rather than Kohler's, and both are marked below: \`tag\`,
// derived from which hub page linked the article, and \`captured\`, the day we
// crawled. Kohler's article template publishes no category and no date — their
// sitemap stamps every URL with the time of the request, so there is no real
// publication date to read. Nothing here invents one.

export type PostImage = {
  /** largest rendition on disk */
  src: string;
  /** smallest rendition on disk — same pixels when only one exists */
  srcSmall: string;
  width: number;
  height: number;
  /** Kohler's own alt text, or the article title where they left it empty */
  alt: string;
};

export type PostVideo = {
  /** YouTube id. Nothing is requested from YouTube until the reader clicks. */
  id: string;
  /** the title Kohler published it under, via oEmbed — the play button's name */
  title: string;
  /** poster frame, downloaded and re-served from our own origin */
  poster: PostImage | null;
};

export type Post = {
  slug: string;
  /**
   * Kohler's headline. Their Thai site publishes one language per article, so
   * \`en\` carries the same string rather than a translation we invented — the
   * fallback shape the rest of lib/i18n.ts already uses.
   */
  title: { th: string; en: string };
  /** first sentence of the article, cut at a word boundary */
  excerpt: { th: string; en: string };
  /**
   * OURS — the day this was crawled, NOT a publication date.
   *
   * Kohler's article template carries no date in the markup, no JSON-LD
   * datePublished and no visible byline, and their sitemap stamps every URL
   * with the time of the request, so there is nothing real to read. Every post
   * therefore shares one date. components/ArticlesContent and ArticleContent
   * show the source instead; anything that still prints this will print the
   * same day on every card, which is the honest outcome of having no date
   * rather than a bug to work around by inventing ten.
   */
  date: string;
  /** OURS — derived from the hub page that linked the article */
  tag: string;
  tagEn: string;
  /** bath or kitchen, from the same hub signal as \`tag\` */
  space: 'bath' | 'kitchen';
  /**
   * OURS — id into lib/lifestyle.generated.ts, kept for components/home, which
   * renders its article cards with a room photograph rather than the article's
   * own picture. The article's real imagery is \`cover\`/\`hero\`/\`figures\`.
   */
  coverId: string;
  source: { url: string; route: string };
  hero: PostImage;
  /** the article's own card image — Kohler's, unlike \`coverId\` */
  cover: PostImage;
  figures: PostImage[];
  body: string[];
  /** no English edition exists; declared so a translator can fill it later */
  bodyEn?: string[];
  /** only the ids that are still playable — see the note in the build script */
  videos: PostVideo[];
  /** set when the video is the article's opening slot rather than an inline one */
  bannerVideo: string | null;
};

/** OURS — the day this catalogue was crawled, not a publication date. */
export const CAPTURED = ${j(capturedAt)};

export const posts: Post[] = [
${posts
  .map(
    (p) => `  {
    slug: ${j(p.slug)},
    title: { th: ${j(p.title)}, en: ${j(p.title)} },
    excerpt: { th: ${j(p.excerpt)}, en: ${j(p.excerpt)} },
    date: CAPTURED,
    tag: ${j(p.tag.th)},
    tagEn: ${j(p.tag.en)},
    space: ${j(p.space)},
    coverId: ${j(p.coverId)},
    source: { url: ${j(p.source.url)}, route: ${j(p.source.route)} },
    hero: ${imageLiteral(p.hero)},
    cover: ${imageLiteral(p.cover)},
    figures: [${p.figures.map((f) => `\n      ${imageLiteral(f)},`).join('')}${p.figures.length ? '\n    ' : ''}],
    body: [${p.body.map((b) => `\n      ${j(b)},`).join('')}
    ],
    videos: [${p.videos
      .map(
        (v) => `\n      { id: ${j(v.id)}, title: ${j(v.title)}, poster: ${v.poster ? imageLiteral(v.poster) : 'null'} },`,
      )
      .join('')}${p.videos.length ? '\n    ' : ''}],
    bannerVideo: ${j(p.bannerVideo)},
  },`,
  )
  .join('\n')}
];

export function getPost(slug: string) {
  return posts.find((p) => p.slug === slug);
}
`

await writeFile(POSTS_TS, file)

const imgCount = posts.reduce((n, p) => n + 1 + p.figures.length, 0)
const live = [...videoIndex.values()].filter(Boolean)
console.log(
  `posts ${posts.length} · images ${imgCount} · videos ${live.length} live / ${dead.length} dead at source · failures ${failures.length}`,
)
for (const d of dead) console.log(`  DEAD ${d.id}: ${d.status}`)
for (const p of posts) {
  console.log(`  ${p.slug}  ¶${p.body.length}  fig${p.figures.length}  ${p.videos.map((v) => v.id).join(',') || '-'}`)
}
if (failures.length) {
  for (const f of failures) console.error(`  FAIL ${f.what}: ${f.error}`)
  process.exit(1)
}
