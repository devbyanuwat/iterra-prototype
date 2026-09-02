#!/usr/bin/env node
/**
 * Measures where the product actually is inside each keyed-out product frame and
 * writes lib/product-ink.generated.ts.
 *
 * ── Why this exists ────────────────────────────────────────────────────────
 * Every product file is 700x525 (or 1400x1050) with the background keyed out,
 * and the object floats somewhere in the middle of it. Measured across all 306
 * finish frames: the ink covers a MEDIAN OF 12.8% of the frame, the lowest 1.5%.
 * A card that renders one with `object-contain` is therefore mostly empty, and
 * the tap in it comes out smaller than the card's own padding.
 *
 * The fix is to scale and re-centre the ink so it fills its card. That was
 * already written and shipped — DepthField.tsx measured the alpha bounding box
 * on a 64px canvas at runtime, but only for the 48 gallery planes. Measuring is
 * a build-time job: the answer never changes, and doing it in the browser costs
 * a canvas readback per image and cannot run before first paint.
 *
 * ── What it records ────────────────────────────────────────────────────────
 * Fractions of the frame, not pixels, so the same record serves the 700 and the
 * 1400 rendition (identical crop) and any card size. Plus the frame's own
 * aspect ratio, which the fit maths needs and which is not constant across the
 * catalogue.
 *
 * ── Alpha, not luminance ───────────────────────────────────────────────────
 * The bounding box comes from the alpha channel. That is correct here and was
 * checked: all 306 frames carry alpha and none is effectively opaque, so there
 * is no unkeyed file that would need a colour-difference fallback.
 *
 * Note what this does NOT solve, because it looks like it should: a white basin
 * on transparency has plenty of *ink* and almost no *contrast*. Scaling it up
 * makes it bigger, not more visible — separation on a white card still has to
 * come from the card's own edge. Ink coverage and contrast are different
 * measurements and this script only knows about the first.
 *
 * ── Threshold ──────────────────────────────────────────────────────────────
 * alpha > 24, not > 0. Keying leaves a halo of near-zero alpha around the
 * object; at > 0 the box grows to most of the frame on soft-edged pieces and
 * the whole measurement stops meaning anything.
 *
 * Usage: node scripts/build-product-ink.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const PRODUCTS_TS = path.join(ROOT, 'lib', 'products.generated.ts')
const OUT = path.join(ROOT, 'lib', 'product-ink.generated.ts')

/** Width to sample at. 64px resolves the box to ~1.5% of the frame, which is
 *  finer than any decision made from it, and keeps 306 reads instant. */
const SAMPLE_W = 64
/** Keying halo floor — see the note above. */
const ALPHA_FLOOR = 24

/** `/products/<slug>/<CODE>.webp` → `<slug>/<CODE>`; the rendition suffix is
 *  dropped so one record serves both `-700` and the full-size file. */
const keyOf = (imagePath) =>
  imagePath.replace(/^\/products\//, '').replace(/(-700)?\.webp$/, '')

async function measure(file) {
  const img = sharp(file)
  const meta = await img.metadata()
  const { data, info } = await img
    .resize({ width: SAMPLE_W })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const w = info.width
  const h = info.height
  let x0 = w
  let y0 = h
  let x1 = -1
  let y1 = -1
  let inked = 0

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] <= ALPHA_FLOOR) continue
      inked++
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }

  // A frame with no ink at all would be a broken export; record the full frame
  // so the fit becomes a no-op rather than dividing by zero downstream.
  if (x1 < 0) return { box: [0, 0, 1, 1], ratio: meta.width / meta.height, coverage: 0 }

  const r = (n) => Math.round(n * 1e4) / 1e4
  return {
    box: [r(x0 / w), r(y0 / h), r((x1 - x0 + 1) / w), r((y1 - y0 + 1) / h)],
    ratio: Math.round((meta.width / meta.height) * 1e3) / 1e3,
    coverage: inked / (w * h),
  }
}

const source = await readFile(PRODUCTS_TS, 'utf8')
const images = [...source.matchAll(/^\s*image: "([^"]+)",$/gm)].map((m) => m[1])
if (!images.length) throw new Error('no product images found in lib/products.generated.ts')

const seen = new Map()
const stats = []
for (const image of images) {
  const key = keyOf(image)
  if (seen.has(key)) continue
  const { box, ratio, coverage } = await measure(path.join(ROOT, 'public', image))
  seen.set(key, [...box, ratio])
  stats.push({ key, coverage, boxArea: box[2] * box[3] })
}

stats.sort((a, b) => a.coverage - b.coverage)
const at = (q) => stats[Math.floor(stats.length * q)]
const pct = (n) => (n * 100).toFixed(1)

const lines = [...seen.entries()].map(([k, v]) => `  '${k}': [${v.join(', ')}],`)

await writeFile(
  OUT,
  `// GENERATED by scripts/build-product-ink.mjs — do not edit by hand.
//
// Where the product actually sits inside its keyed-out frame, as fractions of
// that frame: [x, y, width, height, frameAspectRatio].
//
// Measured over ${stats.length} frames: ink covers a median of ${pct(at(0.5).coverage)}% of the
// frame, the emptiest ${pct(stats[0].coverage)}%, the fullest ${pct(stats[stats.length - 1].coverage)}%. The bounding box
// itself is a median ${pct(at(0.5).boxArea)}% of the frame and never exceeds
// ${pct(Math.max(...stats.map((s) => s.boxArea)))}% — no frame is close to full, so scaling the ink up to fill a
// card can never crop it. See lib/ink-fit.ts for the maths that uses this.
//
// Keys drop the /products/ prefix and the rendition suffix, so one record
// serves both <CODE>.webp and <CODE>-700.webp.

export type ProductInk = readonly [
  x: number,
  y: number,
  w: number,
  h: number,
  ratio: number,
];

export const productInk: Readonly<Record<string, ProductInk>> = {
${lines.join('\n')}
};
`,
  'utf8',
)

console.log(
  `wrote ${seen.size} ink boxes to lib/product-ink.generated.ts\n` +
    `coverage: min ${pct(stats[0].coverage)}%  p25 ${pct(at(0.25).coverage)}%  ` +
    `median ${pct(at(0.5).coverage)}%  p75 ${pct(at(0.75).coverage)}%  ` +
    `max ${pct(stats[stats.length - 1].coverage)}%`,
)
