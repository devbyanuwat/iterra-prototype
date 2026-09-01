#!/usr/bin/env node
/**
 * Downloads the Kohler Scene7 lifestyle/editorial photography and emits webp
 * derivatives the site can consume.
 *
 * Source list: one Scene7 base URL per line (no query string). Each is fetched
 * at 1800px wide as jpg, cached on disk, then written out as webp at 1800 and
 * 900 into public/lifestyle/<width>/.
 *
 * Every network fetch retries. A previous scraper exited 0 while silently
 * dropping images because a thrown fetch error was treated as "done", so here a
 * failure after all attempts is collected and the process exits non-zero.
 *
 * Usage: node scripts/scrape-lifestyle.mjs <urls.txt> [cacheDir]
 */
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'public', 'lifestyle')
const WIDTHS = [1800, 900]
const CONCURRENCY = 6
const ATTEMPTS = 4
const MIN_BYTES = 8 * 1024

const urlFile = process.argv[2]
const cacheDir = process.argv[3] ?? path.join(ROOT, '.cache', 'lifestyle-src')
if (!urlFile) {
  console.error('usage: node scripts/scrape-lifestyle.mjs <urls.txt> [cacheDir]')
  process.exit(2)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function idFor(url) {
  const parts = new URL(url).pathname.split('/').filter(Boolean)
  // Scene7 asset names are unique on their own. The kohler.co.th DAM (/binaries)
  // has files called 2.jpg and th.jpg, so those keep their folder as well.
  const scene7 = /scene7\.com$/.test(new URL(url).hostname)
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
}

/**
 * Fetch with retry. Throws only after every attempt failed.
 * Scene7 answers 403 with a short text body, so the body is read to tell a
 * missing asset (unrecoverable) from a transient failure (worth retrying).
 */
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
        err.fatal = /Unable to find image/i.test(reason)
        err.tooLarge = /illegal image size/i.test(reason)
        throw err
      }
      if (buf.length < MIN_BYTES) throw new Error(`short body ${buf.length}B`)
      return buf
    } catch (err) {
      last = err
      if (err.fatal || err.tooLarge) break
      if (attempt < ATTEMPTS) await sleep(500 * 2 ** (attempt - 1))
    }
  }
  throw Object.assign(new Error(`${url}: ${last?.message ?? last}`), {
    fatal: last?.fatal,
    tooLarge: last?.tooLarge,
  })
}

/**
 * Scene7 refuses to upscale, so an asset narrower than 1800 answers
 * "illegal image size". Step the requested width down until it serves.
 */
async function fetchLargest(base) {
  const ladder = [1800, 1600, 1400, 1200, 1000, 800]
  let last
  for (const wid of ladder) {
    try {
      return await fetchBuffer(`${base}?wid=${wid}&fmt=jpg&qlt=88`)
    } catch (err) {
      last = err
      if (err.fatal) throw err
      if (!err.tooLarge) throw err
    }
  }
  throw last
}

async function exists(p) {
  try {
    const s = await stat(p)
    return s.size > MIN_BYTES
  } catch {
    return false
  }
}

async function handle(url, id) {
  const src = path.join(cacheDir, `${id}.jpg`)
  let buf
  if (await exists(src)) {
    buf = await readFile(src)
  } else {
    buf = await fetchLargest(url)
    await writeFile(src, buf)
  }

  const meta = await sharp(buf).metadata()
  const out = {}
  for (const w of WIDTHS) {
    const file = path.join(OUT, String(w), `${id}.webp`)
    if (!(await exists(file))) {
      await sharp(buf)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: w === 1800 ? 78 : 74, effort: 5 })
        .toFile(file)
    }
    const s = await stat(file)
    if (s.size === 0) throw new Error(`${id}: zero-byte output at ${w}`)
    out[w] = s.size
  }

  // Stats drive classification later: grey Scene7 placeholders have near-zero
  // channel variance, cut-outs on white have a bright, flat border.
  const stats = await sharp(buf).stats()
  const edge = await edgeWhiteness(buf, meta.width, meta.height)

  return {
    id,
    url,
    source: new URL(url).pathname.split('/').slice(-2)[0],
    width: meta.width,
    height: meta.height,
    srcBytes: buf.length,
    bytes: out,
    stdev: Math.round(Math.max(...stats.channels.map((c) => c.stdev)) * 100) / 100,
    meanChannels: stats.channels.map((c) => Math.round(c.mean)),
    edgeWhite: edge,
  }
}

/** Share of border pixels that are near-white (cut-out product detector). */
async function edgeWhiteness(buf, w, h) {
  const band = Math.max(4, Math.round(Math.min(w, h) * 0.03))
  const strips = [
    { left: 0, top: 0, width: w, height: band },
    { left: 0, top: h - band, width: w, height: band },
    { left: 0, top: 0, width: band, height: h },
    { left: w - band, top: 0, width: band, height: h },
  ]
  let white = 0
  let total = 0
  for (const s of strips) {
    const { data, info } = await sharp(buf)
      .extract(s)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    for (let i = 0; i < data.length; i += info.channels) {
      total++
      if (data[i] > 242 && data[i + 1] > 242 && data[i + 2] > 242) white++
    }
  }
  return Math.round((white / total) * 1000) / 1000
}

async function main() {
  const urls = (await readFile(urlFile, 'utf8'))
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('http'))

  await mkdir(cacheDir, { recursive: true })
  for (const w of WIDTHS) await mkdir(path.join(OUT, String(w)), { recursive: true })

  const seen = new Map()
  const jobs = urls.map((url) => {
    let id = idFor(url)
    if (seen.has(id)) id = `${id}-${seen.get(id) + 1}`
    seen.set(id, (seen.get(id) ?? 0) + 1)
    return { url, id }
  })

  const results = []
  const failures = []
  let cursor = 0
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (cursor < jobs.length) {
        const job = jobs[cursor++]
        try {
          results.push(await handle(job.url, job.id))
          process.stdout.write(`\r${results.length + failures.length}/${jobs.length}`)
        } catch (err) {
          failures.push({
            url: job.url,
            id: job.id,
            error: String(err.message ?? err),
            missing: Boolean(err.fatal),
          })
          process.stdout.write(`\r${results.length + failures.length}/${jobs.length}`)
        }
      }
    })
  )
  process.stdout.write('\n')

  results.sort((a, b) => a.id.localeCompare(b.id))
  const manifestPath = path.join(cacheDir, 'manifest.json')
  await writeFile(manifestPath, JSON.stringify({ results, failures }, null, 2))

  const missing = failures.filter((f) => f.missing)
  const broken = failures.filter((f) => !f.missing)
  console.log(
    `requested ${jobs.length}  ok ${results.length}  missing-at-source ${missing.length}  errored ${broken.length}`
  )
  console.log(`manifest ${manifestPath}`)
  for (const f of failures) console.error(`${f.missing ? 'GONE' : 'FAIL'} ${f.id}: ${f.error}`)
  // Missing upstream assets are a fact about the source list, not a scrape bug.
  if (broken.length) process.exit(1)
}

await main()
