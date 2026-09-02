#!/usr/bin/env node
/**
 * Downloads the reference imagery the harvested pages point at and emits
 * lib/tiles.generated.ts.
 *
 * Why this is not lib/lifestyle.generated.ts: the shopping guides and the colour
 * palette are illustrated with swatch chips, dimension diagrams and cut-out
 * product tiles. The lifestyle library is editorial photography and its build
 * step drops exactly this kind of asset on purpose — filing a swatch chip as a
 * `room` photograph would make both libraries useless. These are a different
 * kind of picture, so they get their own module.
 *
 * What it does keep from that pipeline, because it is the part that matters:
 *
 *   - renditions are never upscaled. `renditionWidths()` asks only for widths
 *     the source can fill, files are named for their real width, and the entry
 *     records maxWidth so a layout can ask before it places one.
 *   - files land in public/lifestyle/ alongside the photography, so there is one
 *     place to look and one set of naming rules.
 *   - every fetch retries, and a failure after the last attempt fails the run.
 *
 * Alt text comes from the label the source page printed next to the image, in
 * both languages, captured by scripts/build-content.mjs — a real caption beats
 * one invented here.
 *
 * Usage: node scripts/build-tiles.mjs [cacheDir]
 */
import { mkdir, readFile, writeFile, stat, rm } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'lifestyle')
const TS_OUT = path.join(ROOT, 'lib', 'tiles.generated.ts')
const cacheDir = process.argv[2] ?? path.join(ROOT, '.cache', 'content-src')
const srcDir = path.join(cacheDir, 'tiles-src')

const ATTEMPTS = 4
const CONCURRENCY = 6
const MIN_BYTES = 800

/** ความกว้างที่ปล่อยจริง — ไม่ขอเกินขนาดต้นฉบับ (กติกาเดียวกับ build-lifestyle) */
function renditionWidths(native) {
  const top = Math.min(native, 1800)
  return top >= 1200 ? [top, 900] : [top]
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchBuffer(url) {
  let last
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 45_000)
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      }).finally(() => clearTimeout(timer))
      const buf = Buffer.from(await res.arrayBuffer())
      if (!res.ok) {
        const reason = buf.subarray(0, 120).toString('utf8').trim()
        const err = new Error(`HTTP ${res.status} ${reason}`)
        // Scene7 ตอบ 403 พร้อมข้อความว่าไม่มีไฟล์ — ลองใหม่กี่ครั้งก็ได้ค่าเดิม
        err.fatal = /Unable to find image/i.test(reason)
        throw err
      }
      if (buf.length < MIN_BYTES) throw new Error(`short body ${buf.length}B`)
      return buf
    } catch (err) {
      last = err
      if (err.fatal) break
      if (attempt < ATTEMPTS) await sleep(500 * 2 ** (attempt - 1))
    }
  }
  throw Object.assign(new Error(`${url}: ${last?.message ?? last}`), { fatal: last?.fatal })
}

async function exists(file, min = MIN_BYTES) {
  try {
    return (await stat(file)).size > min
  } catch {
    return false
  }
}

/**
 * ขอไฟล์ให้ใหญ่ที่สุดเท่าที่ต้นทางมีจริง
 *
 * Scene7 ยอม upscale ให้ถ้าขอกว้างเกินมาสเตอร์ ซึ่งเป็นกับดัก — ถามขนาดจริงด้วย
 * ?req=props ก่อน แล้วค่อยขอเท่าที่มี รูปจากโดเมนอื่นดึงมาตรง ๆ
 */
async function fetchLargest(url) {
  if (!/scene7\.com/.test(url)) return fetchBuffer(url)
  try {
    const props = await (await fetch(`${url}?req=props`)).text()
    const width = Number((props.match(/image\.width=(\d+)/) || [])[1] || 0)
    if (width > 0) return fetchBuffer(`${url}?wid=${Math.min(width, 1800)}&fmt=jpg&qlt=88`)
  } catch {
    // ถามขนาดไม่ได้ก็ปล่อยให้ Scene7 เลือกขนาดปริยายของมันเอง ดีกว่าเดาแล้วขยาย
  }
  return fetchBuffer(`${url}?fmt=jpg&qlt=88`)
}

async function main() {
  const report = JSON.parse(await readFile(path.join(cacheDir, 'content-report.json'), 'utf8'))
  const wanted = report.missingImages ?? []
  await mkdir(srcDir, { recursive: true })
  await mkdir(OUT_DIR, { recursive: true })

  const entries = []
  const failures = []
  let cursor = 0
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (cursor < wanted.length) {
        const { id, url, label } = wanted[cursor++]
        const cached = path.join(srcDir, `${id}.bin`)
        try {
          let buf
          if (await exists(cached)) buf = await readFile(cached)
          else {
            buf = await fetchLargest(url)
            await writeFile(cached, buf)
          }
          const meta = await sharp(buf).metadata()
          if (!meta.width || !meta.height) throw new Error('not an image')
          const sources = []
          for (const w of renditionWidths(meta.width)) {
            const name = `tile-${id}-${w}.webp`
            const out = await sharp(buf)
              .resize({ width: w, withoutEnlargement: true })
              .webp({ quality: 82, effort: 5 })
              .toFile(path.join(OUT_DIR, name))
            if (out.width > meta.width) throw new Error(`upscaled ${out.width} > ${meta.width}`)
            sources.push({ width: out.width, height: out.height, src: `/lifestyle/${name}` })
          }
          sources.sort((a, b) => b.width - a.width)
          entries.push({
            id,
            sources,
            width: meta.width,
            height: meta.height,
            maxWidth: meta.width,
            alt: {
              th: label?.th || label?.en || '',
              en: label?.en || label?.th || '',
            },
            source: url,
          })
        } catch (err) {
          failures.push({ id, url, error: String(err.message ?? err), fatal: Boolean(err.fatal) })
        }
      }
    })
  )

  entries.sort((a, b) => a.id.localeCompare(b.id))
  const q = (s) => `'${String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

  const body = entries
    .map(
      (e) => `  {
    id: ${q(e.id)},
    sources: [
${e.sources.map((s) => `      { width: ${s.width}, height: ${s.height}, src: ${q(s.src)} },`).join('\n')}
    ],
    width: ${e.width},
    height: ${e.height},
    aspect: ${Math.round((e.width / e.height) * 1000) / 1000},
    maxWidth: ${e.maxWidth},
    alt: { th: ${q(e.alt.th)}, en: ${q(e.alt.en)} },
    source: ${q(e.source)},
  },`
    )
    .join('\n')

  await writeFile(
    TS_OUT,
    `// Generated by scripts/build-tiles.mjs — do not edit by hand.
// Reference imagery for the harvested pages: swatch chips, category tiles,
// dimension diagrams and catalogue covers.
//
// Separate from lib/lifestyle.generated.ts on purpose — that library is editorial
// photography and drops exactly these assets. Same discipline though: renditions
// are never upscaled, files are named for their real width, and maxWidth says
// what the asset can honestly fill.
//
// alt is the caption the source page printed next to the image, in both languages.

export type TileRendition = { width: number; height: number; src: string }

export type Tile = {
  id: string
  sources: TileRendition[]
  width: number
  height: number
  aspect: number
  /** largest CSS width this tile can fill without being upscaled */
  maxWidth: number
  alt: { th: string; en: string }
  /** where it came from, for re-harvesting */
  source: string
}

export const tiles: Tile[] = [
${body}
]

export const getTile = (id: string): Tile | undefined => tiles.find((t) => t.id === id)

/** smallest rendition that covers the slot; the largest one when none does */
export const tileSrc = (tile: Tile, cssWidth: number, dpr = 1): string => {
  const needed = cssWidth * dpr
  const covering = [...tile.sources].reverse().find((s) => s.width >= needed)
  return (covering ?? tile.sources[0]).src
}
`
  )

  const fatal = failures.filter((f) => f.fatal)
  const retryable = failures.filter((f) => !f.fatal)
  console.log(`wanted ${wanted.length}  emitted ${entries.length}  gone-at-source ${fatal.length}  errored ${retryable.length}`)
  for (const f of failures) console.error(`${f.fatal ? 'GONE' : 'FAIL'} ${f.id}: ${f.error}`)
  await writeFile(path.join(cacheDir, 'tiles-report.json'), JSON.stringify({ entries: entries.length, failures }, null, 2))
  if (retryable.length) process.exit(1)
}

await main()
