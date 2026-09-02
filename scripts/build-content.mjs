#!/usr/bin/env node
/**
 * Turns the HTML cached by scripts/harvest-content.mjs into typed modules —
 * one per content family, not one giant file:
 *
 *   lib/guides.generated.ts       13 shopping guides
 *   lib/palette.generated.ts      /colorpalette + its 7 children
 *   lib/collections.generated.ts  /Collections and the product families behind it
 *   lib/ideas.generated.ts        /ideas/bathroomIdeas + /ideas/kitchenIdeas
 *   lib/stores.generated.ts       /storelocator
 *   lib/pages.generated.ts        the nine dry corporate pages
 *
 * Every field carries both languages. Thai and English are matched by position
 * inside the same block on the two language variants of the same page, because
 * the markup is generated from one template — see pair().
 *
 * Two rules this file follows on purpose:
 *
 * 1. A stub stays a stub. Several of these routes are live and empty (/faq
 *    renders the literal word "Empty"), and every collection family page is a
 *    404. Those records carry `status: 'stub' | 'gone'` and no invented copy.
 * 2. Images are referenced by lifestyle id, never by a remote URL. An asset that
 *    is not in lib/lifestyle.generated.ts yet is listed in the run's report so it
 *    can go through scripts/scrape-lifestyle.mjs first; the module keeps `null`
 *    rather than hotlinking kohler.co.th or guessing a size.
 *
 * Usage: node scripts/build-content.mjs [cacheDir]
 */
import { readFile, writeFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const LIB = path.join(ROOT, 'lib')
const cacheDir = process.argv[2] ?? path.join(ROOT, '.cache', 'content-src')

// ── html helpers ───────────────────────────────────────────────────────────
const strip = (html) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&reg;/g, '®')
    .replace(/&trade;/g, '™')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** เนื้อหาจริงของหน้า: ตัด head/nav/footer ออก เหลือเฉพาะ .koh-page */
function pageBody(html) {
  const noScript = html.replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/g, '')
  const main = noScript.match(/<div class="koh-page">([\s\S]*?)<footer/)
  return main ? main[1] : noScript
}

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}=(?:"([^"]*)"|'([^']*)')`))
  return m ? (m[1] ?? m[2]) : ''
}

/**
 * จับคู่ข้อมูลไทย/อังกฤษด้วย "ตำแหน่ง" ในบล็อกเดียวกัน
 *
 * ทั้งสองภาษามาจากเทมเพลตเดียวกัน ลำดับการ์ดจึงตรงกัน ถ้าจำนวนไม่เท่ากันแปลว่า
 * ฝั่งหนึ่งมีของไม่ครบ — คืน null ให้ฝั่งที่ขาดแทนที่จะจับคู่ผิดคู่แล้วได้คำบรรยาย
 * ของสินค้าคนละตัว
 */
function pair(thList, enList, key = 'title') {
  return thList.map((th, i) => {
    const en = enList[i]
    const same = en && (thList.length === enList.length || en[key] !== undefined)
    return { th, en: same ? en : null }
  })
}

/**
 * ค่าเดียวสองภาษา — ถ้าไม่มีฉบับอังกฤษให้ตกกลับเป็นไทย (จอไม่เคยว่าง)
 * ความจริงว่า "ฝั่งอังกฤษไม่มี" ไม่ได้หายไปไหน มันถูกนับไว้ใน enAvailable
 * ของเรคคอร์ดนั้นและในสรุปความครอบคลุมท้ายการรัน
 */
const bilingual = (th, en) => ({ th: th ?? '', en: en || th || '' })

const hasEn = (th, en) => Boolean(en && en !== th)

/**
 * จับคู่ไทย/อังกฤษด้วย "รูปที่ใช้" ไม่ใช่ตำแหน่ง
 *
 * หน้า shopping guide ฉบับไทยกับอังกฤษไม่ใช่คำแปลของกัน — คนละจำนวนบล็อกและ
 * คนละหัวข้อ (toilets: ไทย 4 บล็อก อังกฤษ 5, kitchen-sinks: ไทย 6 อังกฤษ 5)
 * การจับคู่ตามลำดับจึงเอา "เลือกตามวัสดุ" ไปคู่กับ "Select by most popular"
 * รูปเป็นไฟล์เดียวกันทั้งสองภาษา จึงใช้ id ของรูปเป็นกุญแจแทน
 */
function joinByImage(thList, enList) {
  const pool = new Map()
  enList.forEach((e, i) => {
    if (e.image) pool.set(e.image, i)
  })
  const used = new Set()
  return thList.map((th) => {
    const i = th.image && pool.has(th.image) ? pool.get(th.image) : -1
    if (i >= 0 && !used.has(i)) {
      used.add(i)
      return { th, en: enList[i] }
    }
    return { th, en: null }
  })
}

// ── image registry ─────────────────────────────────────────────────────────
/** id ที่ scripts/scrape-lifestyle.mjs จะตั้งให้ URL นี้ (ตรรกะเดียวกันเป๊ะ) */
function lifestyleIdFor(url) {
  try {
    const parsed = new URL(url, 'https://kohler.scene7.com')
    const parts = parsed.pathname.split('/').filter(Boolean)
    const scene7 = /scene7\.com$/.test(parsed.hostname)
    const raw = decodeURIComponent(scene7 ? parts.at(-1) : parts.slice(-2).join('-')).replace(
      /\.(jpg|jpeg|png|webp)$/i,
      ''
    )
    return raw
      .normalize('NFKD')
      .replace(/[–—‘’“”]/g, '-')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
  } catch {
    return ''
  }
}

/**
 * id ที่อ้างถึงได้: ภาพถ่ายใน lifestyle + ไทล์อ้างอิงใน tiles
 *
 * รันครั้งแรก tiles.generated.ts ยังไม่มี — ถือว่าว่างไว้ก่อน แล้ว build-tiles
 * จะสร้างจากรายการที่ยังขาดในรายงานของรอบนั้น จากนั้นรันไฟล์นี้ซ้ำเพื่อผูก id
 */
async function loadKnownImageIds() {
  const ids = new Set()
  for (const file of ['lifestyle.generated.ts', 'tiles.generated.ts']) {
    try {
      const ts = await readFile(path.join(LIB, file), 'utf8')
      for (const m of ts.matchAll(/^\s{4}id: '([^']+)',$/gm)) ids.add(m[1])
    } catch {
      // ยังไม่มีไฟล์นั้น = ยังไม่มี id ชุดนั้นให้ผูก
    }
  }
  return ids
}

/** URL รูปที่เจอในหน้า → id ในคลัง lifestyle ถ้ามีแล้ว, ไม่มีก็ null + บันทึกไว้ */
function makeImageResolver(known, missing) {
  /**
   * @param url  ที่อยู่รูปบนต้นทาง
   * @param label ป้ายที่รูปนี้ถูกใช้คู่กันในหน้า — เอาไปเป็น alt ของ tile ทีหลัง
   *              ป้ายจริงจากหน้าต้นทางดีกว่าคำบรรยายที่เราแต่งเอง
   */
  return (url, label = '', lang = 'th') => {
    if (!url) return null
    const clean = url.split('?')[0]
    if (/logo|branding|icon|blank|placeholder/i.test(clean)) return null
    const id = lifestyleIdFor(clean)
    if (!id) return null
    if (known.has(id)) return id
    const seen = missing.get(id) ?? {
      url: clean.startsWith('http') ? clean : `https://www.kohler.co.th${clean}`,
      label: { th: '', en: '' },
    }
    if (label && !seen.label[lang]) seen.label[lang] = label
    missing.set(id, seen)
    return null
  }
}

// ── per-family parsers ─────────────────────────────────────────────────────

/** shopping guide = หัวข้อหลายบล็อก แต่ละบล็อกมีไทล์ตัวเลือก (รูป + ป้าย + ลิงก์กรอง) */
function parseGuide(html, img, lang = 'th') {
  const body = pageBody(html)
  const sections = []
  for (const block of body.split(/<section class="c-koh-shopping-list/).slice(1)) {
    const title = strip((block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || [])[1] || '')
    const options = []
    for (const fig of block.split(/<figure/).slice(1)) {
      const a = fig.match(/<a[^>]*>/)
      const image = fig.match(/<img[^>]*>/)
      const label = strip((fig.match(/koh-shopping-\dpromo-title-format">([\s\S]*?)<\/div>/) || [])[1] || '')
      const href = a ? attr(a[0], 'href') : ''
      if (!label && !href) continue
      options.push({ label, href, image: img(image ? attr(image[0], 'src') : '', label, lang) })
    }
    if (title || options.length) sections.push({ title, options })
  }
  return sections
}

/** color palette = แผงสีที่เก็บข้อมูลไว้ใน data-* ของ modal */
function parsePalette(html, img, lang = 'th') {
  const body = pageBody(html)
  const groupTitle = strip((body.match(/koh-material-title">([\s\S]*?)<\/h2>/) || [])[1] || '')
  const finishes = []
  for (const panel of body.split(/<div id="[0-9a-f-]{36}"/).slice(1)) {
    const head = panel.slice(0, panel.indexOf('>') + 1)
    const title = strip(attr(head, 'data-title'))
    if (!title) continue
    const searchUrl = attr(head, 'data-colorcodesearchurl')
    finishes.push({
      title,
      description: strip(attr(head, 'data-description')),
      code: (searchUrl.match(/search=([^&]+)/) || [])[1] || '',
      searchUrl,
      image: img(attr(head, 'data-largeimage'), title, lang),
    })
  }
  return { groupTitle, finishes }
}

/** /Collections = การ์ดตระกูลสินค้า (ชื่อ + คำโปรย + ป้ายลิงก์ + ภาพ) */
function parseCollections(html, img) {
  const body = pageBody(html)
  const cards = []
  for (const block of body.split(/<div class="koh-collection-item-title-inner">/).slice(1)) {
    const name = strip((block.match(/<h6[^>]*>([\s\S]*?)<\/h6>/) || [])[1] || '')
    const blurb = strip((block.match(/<p[^>]*>([\s\S]*?)<\/p>/) || [])[1] || '')
    const cta = strip((block.match(/koh-collection-item-title-link"><span>([\s\S]*?)<\/span>/) || [])[1] || '')
    const images = [...block.slice(0, 4000).matchAll(/<img[^>]*>/g)]
      .map((m) => img(attr(m[0], 'src')))
      .filter(Boolean)
    if (name) cards.push({ name, blurb, cta, images })
  }
  return cards
}

/**
 * ไทล์แบบ .koh-promo-tile — ใช้ทั้ง /ideas/* และ /literature
 *
 * โครงเดียวกันเป๊ะ: <a href> ครอบ <img> แล้วตามด้วย span.koh-promo-title กับ
 * span.koh-promo-description ต่างกันแค่ href ของ literature ชี้ไปที่ไฟล์ PDF
 */
function parsePromoTiles(html, img, lang = 'th') {
  const body = pageBody(html)
  const title = strip((body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '')
  const items = []
  for (const tile of body.split(/<div class="koh-promo-tile">/).slice(1)) {
    const chunk = tile.slice(0, 2500)
    const a = chunk.match(/<a[^>]*>/)
    const image = chunk.match(/<img[^>]*>/)
    const heading = strip((chunk.match(/koh-promo-title"[^>]*>([\s\S]*?)<\/span>/) || [])[1] || '')
    const blurb = strip((chunk.match(/koh-promo-description"[^>]*>([\s\S]*?)<\/span>/) || [])[1] || '')
    const href = a ? attr(a[0], 'href') : ''
    if (!heading && !href) continue
    items.push({ href, heading, blurb, image: img(image ? attr(image[0], 'src') : '', heading, lang) })
  }
  return { title, items }
}

/** /colorpalette (หน้าดัชนี) = การ์ดพาไปหน้าลูกทั้งเจ็ด */
function parsePaletteIndex(html, img, lang = 'th') {
  const body = pageBody(html)
  const children = []
  for (const item of body.split(/koh-meterial-category-items-inner"/).slice(1)) {
    const chunk = item.slice(0, 1200)
    const href = attr('<a ' + item.slice(0, 200), 'href') || attr(body.slice(Math.max(0, body.indexOf(item) - 200), body.indexOf(item) + 10), 'href')
    const image = chunk.match(/<img[^>]*>/)
    const heading = strip((chunk.match(/<h6[^>]*>([\s\S]*?)<\/h6>/) || [])[1] || '')
    const blurb = strip((chunk.match(/items-description">([\s\S]*?)<\/p>/) || [])[1] || '')
    if (!heading) continue
    children.push({ heading, blurb, href, image: img(image ? attr(image[0], 'src') : '', heading, lang) })
  }
  const groups = [...body.matchAll(/koh-material-title">([\s\S]*?)<\/h2>/g)].map((m) => strip(m[1]))
  return { children, groups }
}

/** /press-releases = รายการข่าว (หน้าแรก 20 รายการ) + ชุดต่อจาก endpoint lazy (JSON) */
function parsePressList(html) {
  const body = pageBody(html)
  const total = Number((html.match(/id="totalProjects" value="(\d+)"/) || [])[1] || 0)
  const items = []
  for (const li of body.split(/<li>/).slice(1)) {
    const date = strip((li.match(/<time>([\s\S]*?)<\/time>/) || [])[1] || '')
    const a = li.match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/)
    if (!a) continue
    const headline = strip(a[2])
    if (!headline) continue
    items.push({ date, href: a[1], headline })
  }
  return { total, items }
}

/** ชุดข่าวที่มาแบบ JSON จาก /press-releases/lazy?offset=20 */
function parsePressLazy(text) {
  try {
    const data = JSON.parse(text)
    return (data.items ?? []).map((i) => ({
      date: strip(i.date ?? ''),
      href: i.hstLink ?? '',
      headline: strip(i.description ?? ''),
    }))
  } catch {
    return []
  }
}

/** หน้าเนื้อหาทั่วไป: หัวข้อ + ย่อหน้า + รูป + ไฟล์ดาวน์โหลด */
function parsePage(html, img) {
  const body = pageBody(html)
  const h1 = strip((body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '')
  const blocks = []
  for (const m of body.matchAll(/<h([2-4])[^>]*>([\s\S]*?)<\/h\1>/g)) {
    const heading = strip(m[2])
    if (heading) blocks.push({ heading })
  }
  const paragraphs = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
    .map((m) => strip(m[1]))
    .filter((t) => t.length > 24)
  const images = [...body.matchAll(/<img[^>]*>/g)].map((m) => img(attr(m[0], 'src'))).filter(Boolean)
  const downloads = [...body.matchAll(/<a[^>]*href="([^"]*\.pdf[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({
    href: m[1],
    label: strip(m[2]),
  }))
  const text = strip(body)
  return { h1, blocks, paragraphs, images, downloads, textLength: text.length, text }
}

// ── emit ───────────────────────────────────────────────────────────────────
const q = (s) => `'${String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ')}'`
const loc = (v) => `{ th: ${q(v.th)}, en: ${q(v.en)} }`
const idOrNull = (v) => (v ? q(v) : 'null')

const header = (what, sources) => `// Generated by scripts/build-content.mjs — do not edit by hand.
// Source: ${what}
// Harvested from ${sources} in both languages by scripts/harvest-content.mjs.
//
// Every field carries th and en. Images are lifestyle ids, resolved against
// lib/lifestyle.generated.ts — never remote URLs, so nothing can hotlink or
// upscale. \`status\` says what the source page actually holds:
//   'ok'   — real content
//   'stub' — the page exists and is empty at source
//   'gone' — the URL 404s at source
`

async function readCache(lang, family, slug) {
  const file = path.join(cacheDir, lang, family, `${slug}.html`)
  try {
    await stat(file)
    return await readFile(file, 'utf8')
  } catch {
    return null
  }
}

async function main() {
  const known = await loadKnownImageIds()
  const missing = new Map()
  const img = makeImageResolver(known, missing)
  const report = { families: {}, stubs: [], gone: [], missingImages: [] }

  const manifest = JSON.parse(await readFile(path.join(cacheDir, 'manifest.json'), 'utf8'))
  const goneSet = new Set(manifest.gone.map((g) => `${g.family}/${g.slug}`))

  // ── guides ───────────────────────────────────────────────────────────────
  const guideSlugs = [
    ...new Set((await readdir(path.join(cacheDir, 'th', 'guide'))).map((f) => f.replace('.html', ''))),
  ].sort()
  const guides = []
  for (const slug of guideSlugs) {
    const thHtml = await readCache('th', 'guide', slug)
    const enHtml = await readCache('en', 'guide', slug)
    const th = thHtml ? parseGuide(thHtml, img, 'th') : []
    const en = enHtml ? parseGuide(enHtml, img, 'en') : []
    // จับคู่บล็อกด้วยรูปของตัวเลือกแรกที่ตรงกัน แล้วจับคู่ตัวเลือกด้วยรูปอีกชั้น
    const enSections = en.map((sec) => ({ ...sec, image: sec.options.find((o) => o.image)?.image ?? '' }))
    const thSections = th.map((sec) => ({ ...sec, image: sec.options.find((o) => o.image)?.image ?? '' }))
    const sections = joinByImage(thSections, enSections).map(({ th: t, en: e }) => ({
      title: bilingual(t.title, e?.title),
      enAvailable: hasEn(t.title, e?.title),
      options: joinByImage(t.options, e?.options ?? []).map(({ th: o, en: eo }) => ({
        label: bilingual(o.label, eo?.label),
        enAvailable: hasEn(o.label, eo?.label),
        href: o.href,
        image: o.image,
      })),
    }))
    const status = sections.some((s) => s.options.length) ? 'ok' : 'stub'
    if (status === 'stub') report.stubs.push(`guide/${slug}`)
    guides.push({ slug, path: `/shoppingguide/${slug}`, status, sections })
  }
  report.families.guides = guides.length

  await writeFile(
    path.join(LIB, 'guides.generated.ts'),
    `${header('kohler.co.th shopping guides', '/shoppingguide/*')}
export type GuideOption = {
  label: { th: string; en: string }
  /** false = ต้นทางฉบับอังกฤษไม่มีตัวเลือกนี้ ค่า en จึงเป็นภาษาไทยที่ตกกลับมา */
  enAvailable: boolean
  /** ลิงก์กรองสินค้าของต้นทาง เก็บไว้เป็นข้อมูล ไม่ได้ชี้ไปที่เว็บนี้ */
  href: string
  image: string | null
}

export type GuideSection = {
  title: { th: string; en: string }
  /** false = บล็อกนี้ไม่มีในฉบับอังกฤษของหน้าเดียวกัน */
  enAvailable: boolean
  options: GuideOption[]
}

export type Guide = {
  slug: string
  path: string
  status: 'ok' | 'stub' | 'gone'
  sections: GuideSection[]
}

export const guides: Guide[] = [
${guides
  .map(
    (g) => `  {
    slug: ${q(g.slug)},
    path: ${q(g.path)},
    status: ${q(g.status)},
    sections: [
${g.sections
  .map(
    (s) => `      {
        title: ${loc(s.title)},
        enAvailable: ${s.enAvailable},
        options: [
${s.options
  .map(
    (o) =>
      `          { label: ${loc(o.label)}, enAvailable: ${o.enAvailable}, href: ${q(o.href)}, image: ${idOrNull(o.image)} },`
  )
  .join('\n')}
        ],
      },`
  )
  .join('\n')}
    ],
  },`
  )
  .join('\n')}
]

export const getGuide = (slug: string): Guide | undefined => guides.find((g) => g.slug === slug)
`
  )

  // ── palette ──────────────────────────────────────────────────────────────
  const paletteSlugs = [
    ...new Set((await readdir(path.join(cacheDir, 'th', 'palette'))).map((f) => f.replace('.html', ''))),
  ].sort()
  const palettes = []
  for (const slug of paletteSlugs) {
    const thHtml = await readCache('th', 'palette', slug)
    const enHtml = await readCache('en', 'palette', slug)
    const th = thHtml ? parsePalette(thHtml, img, 'th') : { groupTitle: '', finishes: [] }
    const en = enHtml ? parsePalette(enHtml, img, 'en') : { groupTitle: '', finishes: [] }
    // หน้าดัชนีไม่มีแผงสี มันมีแต่การ์ดพาไปหน้าลูก — พาร์สคนละแบบ ไม่ใช่หน้าว่าง
    const thIndex = slug === 'index' && thHtml ? parsePaletteIndex(thHtml, img, 'th') : null
    const enIndex = slug === 'index' && enHtml ? parsePaletteIndex(enHtml, img, 'en') : null
    const finishes = pair(th.finishes, en.finishes).map(({ th: t, en: e }) => ({
      code: t.code,
      title: bilingual(t.title, e?.title),
      description: bilingual(t.description, e?.description),
      searchUrl: t.searchUrl,
      image: t.image,
    }))
    const children = pair(thIndex?.children ?? [], enIndex?.children ?? [], 'heading').map(
      ({ th: t, en: e }) => ({
        href: t.href,
        heading: bilingual(t.heading, e?.heading),
        blurb: bilingual(t.blurb, e?.blurb),
        image: t.image,
      })
    )
    const status = finishes.length || children.length ? 'ok' : 'stub'
    if (status === 'stub') report.stubs.push(`palette/${slug}`)
    palettes.push({
      slug,
      path: slug === 'index' ? '/colorpalette' : `/colorpalette/${slug}.html`,
      status,
      title: bilingual(th.groupTitle, en.groupTitle),
      finishes,
      children,
    })
  }
  report.families.palette = palettes.length

  await writeFile(
    path.join(LIB, 'palette.generated.ts'),
    `${header('kohler.co.th colour and finish reference', '/colorpalette and its seven children')}
// นี่คือที่มาของ "สิบเอ็ดเฉด" ที่ทั้งเว็บนี้ใช้นำทาง — code ตรงกับรหัสเฉดใน
// lib/products.generated.ts (CP, BRD, AF, …) จึงเชื่อมสองชุดข้อมูลเข้าหากันได้
export type PaletteFinish = {
  /** รหัสเฉดของ Kohler เช่น CP, BN, 2MB — ว่างได้ถ้าหน้าไม่ได้ผูกไว้กับตัวกรอง */
  code: string
  title: { th: string; en: string }
  description: { th: string; en: string }
  searchUrl: string
  image: string | null
}

export type PaletteChild = {
  href: string
  heading: { th: string; en: string }
  blurb: { th: string; en: string }
  image: string | null
}

export type PaletteGroup = {
  slug: string
  path: string
  status: 'ok' | 'stub' | 'gone'
  title: { th: string; en: string }
  /** แผงสีของหน้าลูก — หน้าดัชนีไม่มี */
  finishes: PaletteFinish[]
  /** การ์ดพาไปหน้าลูก — มีเฉพาะหน้าดัชนี */
  children: PaletteChild[]
}

export const paletteGroups: PaletteGroup[] = [
${palettes
  .map(
    (p) => `  {
    slug: ${q(p.slug)},
    path: ${q(p.path)},
    status: ${q(p.status)},
    title: ${loc(p.title)},
    finishes: [
${p.finishes
  .map(
    (f) => `      {
        code: ${q(f.code)},
        title: ${loc(f.title)},
        description: ${loc(f.description)},
        searchUrl: ${q(f.searchUrl)},
        image: ${idOrNull(f.image)},
      },`
  )
  .join('\n')}
    ],
    children: [
${p.children
  .map(
    (c) => `      { href: ${q(c.href)}, heading: ${loc(c.heading)}, blurb: ${loc(c.blurb)}, image: ${idOrNull(c.image)} },`
  )
  .join('\n')}
    ],
  },`
  )
  .join('\n')}
]

export const getPaletteGroup = (slug: string): PaletteGroup | undefined =>
  paletteGroups.find((g) => g.slug === slug)
`
  )

  // ── collections ──────────────────────────────────────────────────────────
  const thCollections = parseCollections(await readCache('th', 'collection', 'index'), img)
  const enCollections = parseCollections((await readCache('en', 'collection', 'index')) ?? '', img)
  const cards = pair(thCollections, enCollections, 'name').map(({ th: t, en: e }) => ({
    name: t.name,
    blurb: bilingual(t.blurb, e?.blurb),
    cta: bilingual(t.cta, e?.cta),
    images: t.images,
  }))
  const familySlugs = [...goneSet].filter((k) => k.startsWith('collection/')).map((k) => k.split('/')[1])
  report.families.collections = cards.length
  report.gone.push(...familySlugs.map((s) => `collection/${s}`))

  await writeFile(
    path.join(LIB, 'collections.generated.ts'),
    `${header('kohler.co.th collections index', '/Collections and /browse/collections/ProductFamily/*')}
// การ์ดบนหน้า /Collections มีจริงและมีเนื้อหา แต่ "หน้าตระกูลสินค้า" ที่มันลิงก์ไป
// ตอบ 404 ทุกหน้า — ยืนยันด้วยเบราว์เซอร์จริง ได้หน้า "Oops! We couldn't find"
// ทั้ง 14 ตระกูล × 2 ภาษา จึงบันทึกไว้เป็น gone ไม่ใช่แกล้งว่ามีข้อมูล
export type CollectionCard = {
  name: string
  blurb: { th: string; en: string }
  cta: { th: string; en: string }
  images: string[]
}

export type CollectionFamily = {
  slug: string
  path: string
  status: 'ok' | 'stub' | 'gone'
}

export const collectionCards: CollectionCard[] = [
${cards
  .map(
    (c) => `  {
    name: ${q(c.name)},
    blurb: ${loc(c.blurb)},
    cta: ${loc(c.cta)},
    images: [${c.images.map((i) => q(i)).join(', ')}],
  },`
  )
  .join('\n')}
]

/** ทุกหน้าตระกูลสินค้าหายจากต้นทาง ณ วันที่เก็บข้อมูล */
export const collectionFamilies: CollectionFamily[] = [
${[...new Set(familySlugs)]
  .sort()
  .map((s) => `  { slug: ${q(s)}, path: ${q(`/browse/collections/ProductFamily/${s}`)}, status: 'gone' },`)
  .join('\n')}
]
`
  )

  // ── ideas ────────────────────────────────────────────────────────────────
  const ideas = []
  for (const slug of ['bathroom', 'kitchen']) {
    const th = parsePromoTiles(await readCache('th', 'ideas', slug), img, 'th')
    const en = parsePromoTiles((await readCache('en', 'ideas', slug)) ?? '', img, 'en')
    const items = pair(th.items, en.items, 'heading').map(({ th: t, en: e }) => ({
      href: t.href,
      heading: bilingual(t.heading, e?.heading),
      blurb: bilingual(t.blurb, e?.blurb),
      image: t.image,
    }))
    const status = items.length ? 'ok' : 'stub'
    if (status === 'stub') report.stubs.push(`ideas/${slug}`)
    ideas.push({
      slug,
      path: `/ideas/${slug}Ideas`,
      status,
      title: bilingual(th.title, en.title),
      items,
    })
  }
  report.families.ideas = ideas.length

  await writeFile(
    path.join(LIB, 'ideas.generated.ts'),
    `${header('kohler.co.th idea hubs', '/ideas/bathroomIdeas and /ideas/kitchenIdeas')}
export type IdeaItem = {
  /** ลิงก์บทความบนต้นทาง — บทความเองอยู่ใน lib/posts.ts แล้ว */
  href: string
  heading: { th: string; en: string }
  blurb: { th: string; en: string }
  image: string | null
}

export type IdeaHub = {
  slug: string
  path: string
  status: 'ok' | 'stub' | 'gone'
  title: { th: string; en: string }
  items: IdeaItem[]
}

export const ideaHubs: IdeaHub[] = [
${ideas
  .map(
    (h) => `  {
    slug: ${q(h.slug)},
    path: ${q(h.path)},
    status: ${q(h.status)},
    title: ${loc(h.title)},
    items: [
${h.items
  .map(
    (i) => `      { href: ${q(i.href)}, heading: ${loc(i.heading)}, blurb: ${loc(i.blurb)}, image: ${idOrNull(i.image)} },`
  )
  .join('\n')}
    ],
  },`
  )
  .join('\n')}
]
`
  )

  // ── stores ───────────────────────────────────────────────────────────────
  const storeJson = JSON.parse(await readFile(path.join(cacheDir, 'th', 'page', 'storelocator.json'), 'utf8'))
  report.families.stores = storeJson.stores.length

  await writeFile(
    path.join(LIB, 'stores.generated.ts'),
    `${header('kohler.co.th dealer list', '/storelocator')}
// เก็บด้วยเบราว์เซอร์ ไม่ใช่ fetch — วิดเจ็ตแผนที่ประกอบรายการเองหลังหน้าโหลด
//
// สองข้อจำกัดของต้นทางที่ต้องรู้ก่อนใช้ข้อมูลชุดนี้:
//   1. รายการเรียงตามระยะห่างจากพิกัดกรุงเทพฯ ที่วิดเจ็ตตั้งไว้ และตัดที่ 50 ราย
//      หน้าไม่มีปุ่มขอเพิ่ม — นี่ไม่ใช่รายชื่อตัวแทนจำหน่ายทั้งประเทศ
//   2. ไม่มีฉบับภาษาอังกฤษ: /en/storelocator ตอบ ERR_TOO_MANY_REDIRECTS และ
//      ?setLang=en คืนรายการภาษาไทยชุดเดิม ชื่อและที่อยู่จึงเป็นไทยทั้งหมด
export type Store = {
  rank: number
  name: string
  address: string
  city: string
  phone: string
  /** "lat,lng" ตามที่ต้นทางฝังไว้ */
  latlng: string
  hours: string
  /** true เฉพาะ Kohler Experience Center */
  kec: boolean
}

export const storeSource = {
  path: '/storelocator',
  capturedWith: 'browser',
  cap: 50,
  englishAvailable: false,
  note: ${q(storeJson.note)},
  englishNote: ${q(storeJson.enNote)},
}

export const stores: Store[] = [
${storeJson.stores
  .map(
    (s) => `  {
    rank: ${s.rank},
    name: ${q(s.name)},
    address: ${q(s.address)},
    city: ${q(s.city)},
    phone: ${q(s.phone)},
    latlng: ${q(s.latlng)},
    hours: ${q(s.hours)},
    kec: ${s.kec},
  },`
  )
  .join('\n')}
]
`
  )

  // ── dry pages ────────────────────────────────────────────────────────────
  const pageSlugs = [
    'careandclean',
    'warranty',
    'literature',
    'press-releases',
    'global-projects',
    'kohler-150-anniversary',
    'kohler-service-solution',
    'kec',
    'faq',
  ]
  const pages = []
  for (const slug of pageSlugs) {
    const thHtml = await readCache('th', 'page', slug)
    const enHtml = await readCache('en', 'page', slug)
    const th = thHtml ? parsePage(thHtml, img) : null
    const en = enHtml ? parsePage(enHtml, img) : null

    // สามหน้านี้ไม่ได้เขียนเป็นย่อหน้า แต่เป็นชุดไทล์/รายการ — พาร์สตามรูปทรงจริง
    // ของมัน ไม่งั้นจะถูกตัดสินว่า "ว่าง" ทั้งที่มีของอยู่เต็มหน้า
    const tileSlugs = new Set(['literature', 'kohler-service-solution', 'careandclean', 'kec'])
    const tiles = tileSlugs.has(slug)
      ? pair(
          thHtml ? parsePromoTiles(thHtml, img, 'th').items : [],
          enHtml ? parsePromoTiles(enHtml, img, 'en').items : [],
          'heading'
        ).map(({ th: t, en: e }) => ({
          href: t.href,
          heading: bilingual(t.heading, e?.heading),
          blurb: bilingual(t.blurb, e?.blurb),
          image: t.image,
        }))
      : []
    // /kohler-service-solution ใช้ไทล์แบบ shopping-guide (มีคำอธิบายใต้ป้าย)
    const guideTiles =
      slug === 'kohler-service-solution' && thHtml
        ? parseGuide(thHtml, img, 'th').flatMap((sec, si) =>
            sec.options.map((o, oi) => ({
              href: o.href,
              heading: bilingual(o.label, enHtml ? parseGuide(enHtml, img, 'en')[si]?.options?.[oi]?.label : ''),
              blurb: bilingual('', ''),
              image: o.image,
            }))
          )
        : []

    let press = []
    if (slug === 'press-releases') {
      const thList = thHtml ? parsePressList(thHtml) : { total: 0, items: [] }
      const enList = enHtml ? parsePressList(enHtml) : { total: 0, items: [] }
      const thLazy = parsePressLazy((await readCache('th', 'page', 'press-releases-20')) ?? '')
      const enLazy = parsePressLazy((await readCache('en', 'page', 'press-releases-20')) ?? '')
      press = pair([...thList.items, ...thLazy], [...enList.items, ...enLazy], 'headline').map(
        ({ th: t, en: e }) => ({
          href: t.href,
          date: bilingual(t.date, e?.date),
          headline: bilingual(t.headline, e?.headline),
        })
      )
      report.pressTotalClaimed = thList.total
    }
    // "มีเนื้อหาจริง" = มีย่อหน้าอย่างน้อยหนึ่งย่อหน้า หรือมีหัวข้อย่อยและรูป
    const allTiles = [...tiles, ...guideTiles]
    const real = (p) => !!p && (p.paragraphs.length > 0 || (p.blocks.length > 1 && p.images.length > 0))
    const status = real(th) || real(en) || allTiles.length > 0 || press.length > 0 ? 'ok' : 'stub'
    if (status === 'stub') report.stubs.push(`page/${slug}`)
    pages.push({
      slug,
      path: `/${slug}`,
      status,
      // บางหน้าไม่มี <h1> เลย (warranty) — ใช้หัวข้อแรกแทนดีกว่าปล่อยชื่อว่าง
      title: bilingual(th?.h1 || th?.blocks?.[0]?.heading, en?.h1 || en?.blocks?.[0]?.heading),
      headings: pair(th?.blocks ?? [], en?.blocks ?? [], 'heading').map(({ th: t, en: e }) =>
        bilingual(t.heading, e?.heading)
      ),
      paragraphs: pair(
        (th?.paragraphs ?? []).map((text) => ({ text })),
        (en?.paragraphs ?? []).map((text) => ({ text })),
        'text'
      ).map(({ th: t, en: e }) => bilingual(t.text, e?.text)),
      images: th?.images ?? [],
      downloads: (th?.downloads ?? []).map((d, i) => ({
        href: d.href,
        label: bilingual(d.label, en?.downloads?.[i]?.label),
      })),
      tiles: allTiles,
      press,
      textLength: { th: th?.textLength ?? 0, en: en?.textLength ?? 0 },
    })
  }
  report.families.pages = pages.length

  await writeFile(
    path.join(LIB, 'pages.generated.ts'),
    `${header('kohler.co.th corporate and service pages', '/careandclean, /warranty, /literature, /press-releases, /global-projects, /kohler-150-anniversary, /kohler-service-solution, /kec, /faq')}
// textLength คือจำนวนอักขระของเนื้อหาจริงในหน้านั้น เก็บไว้เพื่อให้เห็นทันทีว่า
// หน้าไหน "มีจริง" และหน้าไหนเป็นเปลือกเปล่า โดยไม่ต้องเปิดดูเอง
export type PageTile = {
  /** ปลายทางบนต้นทาง — ของ /literature เป็นไฟล์ PDF */
  href: string
  heading: { th: string; en: string }
  blurb: { th: string; en: string }
  image: string | null
}

export type PressItem = {
  href: string
  date: { th: string; en: string }
  headline: { th: string; en: string }
}

export type ContentPage = {
  slug: string
  path: string
  status: 'ok' | 'stub' | 'gone'
  title: { th: string; en: string }
  headings: { th: string; en: string }[]
  paragraphs: { th: string; en: string }[]
  images: string[]
  downloads: { href: string; label: { th: string; en: string } }[]
  /** หน้าไหนที่เขียนเป็นชุดไทล์แทนย่อหน้า (literature, service solution, …) */
  tiles: PageTile[]
  /** เฉพาะ /press-releases */
  press: PressItem[]
  textLength: { th: number; en: number }
}

export const contentPages: ContentPage[] = [
${pages
  .map(
    (p) => `  {
    slug: ${q(p.slug)},
    path: ${q(p.path)},
    status: ${q(p.status)},
    title: ${loc(p.title)},
    headings: [
${p.headings.map((h) => `      ${loc(h)},`).join('\n')}
    ],
    paragraphs: [
${p.paragraphs.map((t) => `      ${loc(t)},`).join('\n')}
    ],
    images: [${p.images.map((i) => q(i)).join(', ')}],
    downloads: [
${p.downloads.map((d) => `      { href: ${q(d.href)}, label: ${loc(d.label)} },`).join('\n')}
    ],
    tiles: [
${p.tiles.map((t) => `      { href: ${q(t.href)}, heading: ${loc(t.heading)}, blurb: ${loc(t.blurb)}, image: ${idOrNull(t.image)} },`).join('\n')}
    ],
    press: [
${p.press.map((t) => `      { href: ${q(t.href)}, date: ${loc(t.date)}, headline: ${loc(t.headline)} },`).join('\n')}
    ],
    textLength: { th: ${p.textLength.th}, en: ${p.textLength.en} },
  },`
  )
  .join('\n')}
]

export const getContentPage = (slug: string): ContentPage | undefined =>
  contentPages.find((p) => p.slug === slug)
`
  )

  // ── report ───────────────────────────────────────────────────────────────
  report.missingImages = [...missing.entries()].map(([id, v]) => ({ id, url: v.url, label: v.label }))
  report.englishCoverage = {
    guides: (() => {
      const all = guides.flatMap((g) => g.sections.flatMap((s) => [s, ...s.options]))
      return `${all.filter((x) => x.enAvailable).length}/${all.length}`
    })(),
  }
  await writeFile(path.join(cacheDir, 'content-report.json'), JSON.stringify(report, null, 2))

  console.log(`families ${JSON.stringify(report.families)}`)
  console.log(`stubs ${report.stubs.length ? report.stubs.join(', ') : 'none'}`)
  console.log(`gone ${report.gone.length}`)
  console.log(`images not yet in the lifestyle library: ${report.missingImages.length}`)
}

await main()
