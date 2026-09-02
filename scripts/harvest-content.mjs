#!/usr/bin/env node
/**
 * Downloads every non-product page of kohler.co.th, in both languages, and caches
 * the raw HTML. scripts/build-content.mjs turns the cache into typed modules.
 *
 * Two things this does that the first scraper on this project did not:
 *
 * 1. It retries, and it fails loudly. That earlier run exited 0 having silently
 *    dropped a third of its work; here every URL is either cached or listed as a
 *    failure, and unrecovered failures set a non-zero exit code.
 * 2. It records *why* a page is empty. Some of these routes are live but hold
 *    nothing (a hero shell with no slides, a listing with no items). That is a
 *    fact about the source site, not a scrape bug, so the cache keeps the page
 *    and build-content.mjs marks the record as a stub rather than inventing copy.
 *
 * Pages whose content is injected by script (the store locator's map) cannot be
 * fetched this way. They are listed in BROWSER_ONLY and are captured with a
 * browser into the same cache directory; see scratchpad/task-b1.md.
 *
 * Usage: node scripts/harvest-content.mjs [cacheDir]
 */
import { mkdir, writeFile, readFile, stat, readdir } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const ORIGIN = 'https://www.kohler.co.th'
const ATTEMPTS = 4
const CONCURRENCY = 5
const MIN_BYTES = 4 * 1024

const cacheDir = process.argv[2] ?? path.join(ROOT, '.cache', 'content-src')

/** ธีมของหน้า: ใช้เป็นชื่อโฟลเดอร์และเป็นตัวบอก build-content ว่าจะ parse ด้วยตัวไหน */
export const FAMILIES = {
  guide: [
    'kitchen-sinks',
    'kitchen-faucets',
    'lavatories',
    'bathroom-faucets',
    'toilets',
    'showering',
    'bidet-seat',
    'bathtubs',
    'commercial',
    'bathroom-furniture',
    'mirrored-cabinets',
    'mirrors',
    'bathroom-accessories',
  ].map((slug) => ({ slug, path: `/shoppingguide/${slug}` })),

  palette: [
    { slug: 'index', path: '/colorpalette' },
    { slug: 'bathroom-faucet-finishes', path: '/colorpalette/bathroom-faucet-finishes.html' },
    { slug: 'kitchen-faucet-finishes', path: '/colorpalette/kitchen-faucet-finishes.html' },
    { slug: 'bathroom-colors', path: '/colorpalette/bathroom-colors.html' },
    { slug: 'kitchen-sink-colors', path: '/colorpalette/kitchen-sink-colors.html' },
    { slug: 'bathroom-furniture-colors', path: '/colorpalette/bathroom-furniture-colors.html' },
    { slug: 'commercial-finishes', path: '/colorpalette/commercial-finishes.html' },
    { slug: 'artist-editions-patterns', path: '/colorpalette/artist-editions-patterns.html' },
  ],

  collection: [
    { slug: 'index', path: '/Collections' },
    ...[
      'Aleutian',
      'Archer(R)',
      'Cimarron',
      'Escale',
      'Flexispace',
      'Forefront',
      'KELSTON',
      'Karess',
      'Maxispace',
      'Ove',
      'Patio',
      'Portrait(R)',
      'Serif(R)',
      'Tresham(R)',
    ].map((name) => ({
      // `familyName` ไม่ใช่ `family` — คีย์ `family` เป็นชื่อกลุ่มของหน้า (collection)
      // ถ้าใช้ชื่อเดียวกัน spread จะทับกันแล้วไฟล์แคชไปโผล่ในโฟลเดอร์ชื่อ 'Ove'
      slug: name.toLowerCase().replace(/[()]/g, ''),
      path: `/browse/collections/ProductFamily/${encodeURIComponent(name)}`,
      familyName: name,
      // ทุกลิงก์ตระกูลสินค้าบนหน้า /Collections ตอบ 404 ทั้งที่หน้าแม่ยังลิงก์ไปหา
      // ยืนยันด้วยเบราว์เซอร์จริงแล้วว่าได้หน้า "Oops! We couldn't find" ไม่ใช่แค่
      // curl โดนบล็อก — บันทึกไว้ว่าเป็น "หายจากต้นทาง" ไม่ใช่ความล้มเหลวของสคริปต์
      expectGone: true,
    })),
  ],

  ideas: [
    { slug: 'bathroom', path: '/ideas/bathroomIdeas' },
    { slug: 'kitchen', path: '/ideas/kitchenIdeas' },
  ],

  page: [
    { slug: 'storelocator', path: '/storelocator' },
    // /press-releases แสดง 20 จาก 43 รายการ ที่เหลือมาจาก endpoint แบบ lazy
    // เก็บทั้งสองหน้าไว้ ไม่งั้นได้ข่าวไม่ครบครึ่ง
    { slug: 'press-releases-20', path: '/press-releases/lazy?offset=20' },
    // offset=40 ตอบ {"success":false} — ชุดข่าวจบที่ offset=20 ทั้งที่หน้าแม่
    // ประกาศ totalProjects=43 บันทึกความไม่ตรงกันนี้ไว้ในรายงาน ไม่ต้องไล่ต่อ
    { slug: 'careandclean', path: '/careandclean' },
    { slug: 'warranty', path: '/warranty' },
    { slug: 'literature', path: '/literature' },
    { slug: 'press-releases', path: '/press-releases' },
    { slug: 'global-projects', path: '/global-projects' },
    { slug: 'kohler-150-anniversary', path: '/kohler-150-anniversary' },
    { slug: 'kohler-service-solution', path: '/kohler-service-solution' },
    { slug: 'kec', path: '/kec' },
    { slug: 'faq', path: '/faq' },
  ],
}

/** หน้าที่เนื้อหามาจากสคริปต์ ดึงด้วย fetch ไม่ได้ — เก็บด้วยเบราว์เซอร์แล้ววางไว้ในแคชเดียวกัน */
export const BROWSER_ONLY = new Set(['page/storelocator'])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** URL ของภาษาหนึ่ง — อังกฤษอยู่ใต้ /en ตาม sitemap ของเว็บเอง */
export const urlFor = (pagePath, lang) => `${ORIGIN}${lang === 'en' ? '/en' : ''}${pagePath}`

/**
 * ดึงหน้าหนึ่งพร้อม retry
 *
 * ตาม redirect เอง (/careandclean ตอบ 301) และถือว่า body สั้นผิดปกติคือความล้มเหลว
 * ชนิดที่ต้องลองใหม่ ไม่ใช่ "หน้าว่าง" — หน้าว่างจริงยังส่ง shell ของเว็บมาเต็ม ๆ
 */
async function fetchPage(url, { expectGone = false } = {}) {
  let last
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 45_000)
      const res = await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          'accept-language': 'th,en;q=0.8',
        },
      }).finally(() => clearTimeout(timer))
      const body = await res.text()
      if (res.status === 404 && expectGone) return { gone: true, status: 404, finalUrl: res.url }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (body.length < MIN_BYTES) throw new Error(`short body ${body.length}B`)
      return { body, finalUrl: res.url, status: res.status }
    } catch (err) {
      last = err
      if (attempt < ATTEMPTS) await sleep(600 * 2 ** (attempt - 1))
    }
  }
  throw new Error(`${url}: ${last?.message ?? last}`)
}

async function exists(file) {
  try {
    return (await stat(file)).size > MIN_BYTES
  } catch {
    return false
  }
}

async function main() {
  const jobs = []
  for (const [family, entries] of Object.entries(FAMILIES)) {
    for (const entry of entries) {
      for (const lang of ['th', 'en']) {
        jobs.push({ family, ...entry, lang, url: urlFor(entry.path, lang) })
      }
    }
  }

  for (const family of Object.keys(FAMILIES)) {
    for (const lang of ['th', 'en']) await mkdir(path.join(cacheDir, lang, family), { recursive: true })
  }

  const done = []
  const failures = []
  const skipped = []
  /** ตอบ 404 จริงที่ต้นทาง — เป็นข้อเท็จจริงของเว็บต้นทาง ไม่ใช่ error ของการเก็บ */
  const gone = []
  let cursor = 0
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (cursor < jobs.length) {
        const job = jobs[cursor++]
        const file = path.join(cacheDir, job.lang, job.family, `${job.slug}.html`)
        if (BROWSER_ONLY.has(`${job.family}/${job.slug}`)) {
          // เบราว์เซอร์เป็นคนเก็บ และเก็บมาเป็น JSON ที่แยกฟิลด์แล้ว ไม่ใช่ HTML ดิบ
          // (วิดเจ็ตแผนที่ประกอบรายการสาขาเองหลังโหลด) — ถ้ายังไม่มีไฟล์ให้บอก
          // ไม่ใช่แกล้งว่าสำเร็จ
          const json = file.replace(/\.html$/, '.json')
          skipped.push({ ...job, cached: (await exists(json)) || (await exists(file)) })
          continue
        }
        if (await exists(file)) {
          done.push(job)
          continue
        }
        try {
          const result = await fetchPage(job.url, { expectGone: job.expectGone })
          if (result.gone) {
            gone.push({ ...job, status: result.status })
            continue
          }
          await writeFile(file, result.body)
          done.push({ ...job, finalUrl: result.finalUrl })
        } catch (err) {
          failures.push({ ...job, error: String(err.message ?? err) })
        }
      }
    })
  )

  const manifest = {
    origin: ORIGIN,
    fetched: done.map(({ family, slug, lang, url }) => ({ family, slug, lang, url })),
    gone: gone.map(({ family, slug, lang, url, status }) => ({ family, slug, lang, url, status })),
    failures,
    browserOnly: skipped,
  }
  await writeFile(path.join(cacheDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

  console.log(
    `requested ${jobs.length}  cached ${done.length}  gone-at-source ${gone.length}  browser-only ${skipped.length}  failed ${failures.length}`
  )
  for (const g of gone) console.log(`GONE ${g.lang}/${g.family}/${g.slug} → ${g.status}`)
  for (const s of skipped) console.log(`BROWSER ${s.lang}/${s.family}/${s.slug} cached=${s.cached}`)
  for (const f of failures) console.error(`FAIL ${f.lang}/${f.family}/${f.slug}: ${f.error}`)
  const missingBrowser = skipped.filter((s) => !s.cached)
  if (failures.length) process.exit(1)
  if (missingBrowser.length) {
    console.error(`${missingBrowser.length} browser-only page(s) not captured yet`)
    process.exit(2)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
