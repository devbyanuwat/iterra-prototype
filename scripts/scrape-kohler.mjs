#!/usr/bin/env node
/**
 * Build-time scraper for kohler.co.th — run once, commit the result, never run at build.
 *
 *   node scripts/scrape-kohler.mjs [--fresh] [--pages=2] [--products=12] [--max-finishes=6]
 *
 * Writes public/products/<slug>/*.webp and lib/products.generated.ts. Touches nothing else.
 *
 * Notes on the site, verified against production:
 *  - category listings are client-rendered, so the crawl stage needs a real browser
 *  - product detail pages are server-rendered: one GET returns every finish variant with
 *    its Scene7 asset id in `data-koh-image`, so no browser is needed past the crawl
 *  - the per-finish asset id is NOT derivable from the model number. `kohlerchina/K-<model>-<finish>_01`
 *    resolves for some SKUs and 403s ("Unable to find image") for most, so ids are always
 *    read from the PDP markup instead
 *  - Scene7 renders the shot on a solid white plate; scripts/key-white.py keys it out
 */

import { createRequire } from 'node:module';
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'products');
const GENERATED = path.join(ROOT, 'lib', 'products.generated.ts');
const CACHE_DIR = path.join(os.tmpdir(), 'iterra-kohler-scrape');
const ORIGIN = 'https://www.kohler.co.th';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const argv = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const FRESH = !!argv.fresh;
const PAGES = Number(argv.pages ?? 2);
const MAX_FINISHES = Number(argv['max-finishes'] ?? 6);
// Keying 300+ frames of pure-Python flood fill is the whole runtime, so it fans out.
const CONCURRENCY = Number(argv.concurrency ?? Math.max(2, os.cpus().length - 4));

/** Listing pages to crawl. `kind` maps onto the Product.category union. */
const CATEGORIES = [
  { kind: 'kitchen', group: 'kitchen-sinks', url: '/browse/kitchen/Categories/kitchen-sinks' },
  { kind: 'kitchen', group: 'kitchen-faucets', url: '/browse/kitchen/Categories/kitchen-faucets' },
  { kind: 'bath', group: 'bathroom-faucets', url: '/browse/bathroom/Categories/bathroom-faucets' },
  { kind: 'bath', group: 'bathroom-showering', url: '/browse/bathroom/Categories/bathroom-showering' },
  { kind: 'bath', group: 'toilets', url: '/browse/bathroom/Categories/toilets' },
  { kind: 'bath', group: 'lavatories', url: '/browse/bathroom/Categories/lavatories' },
];

/** Official finish names, scraped from the colour-palette pages (see finishNames()). */
const PALETTE_PAGES = [
  '/colorpalette/bathroom-faucet-finishes.html',
  '/colorpalette/kitchen-sink-colors.html',
  '/colorpalette/bathroom-sink-colors.html',
];

// ── small helpers ───────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);

function decodeEntities(s) {
  return (s || '')
    .replace(/&reg;?/g, '®')
    .replace(/&trade;?/g, '™')
    .replace(/&nbsp;?/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

const stripTags = (s) => decodeEntities(String(s || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

async function getText(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'th,en;q=0.8' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(800 * (i + 1));
    }
  }
}

async function getBuffer(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA, referer: ORIGIN + '/' } });
      if (r.ok) return Buffer.from(await r.arrayBuffer());
      throw new Error(`HTTP ${r.status} for ${url}`);
    } catch (e) {
      // A dropped connection has to retry like a bad status does — an earlier run lost 55
      // products to a DNS blip because a thrown fetch escaped this loop on the first try.
      if (i === tries - 1) throw e;
      await sleep(1000 * 2 ** i);
    }
  }
}

/** Run `fn` over `items` with at most `n` in flight. */
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    }),
  );
  return out;
}

async function cached(name, produce) {
  await fsp.mkdir(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, `${name}.json`);
  if (!FRESH && fs.existsSync(file)) {
    log(`  cache hit ${name}`);
    return JSON.parse(await fsp.readFile(file, 'utf8'));
  }
  const value = await produce();
  await fsp.writeFile(file, JSON.stringify(value, null, 2));
  return value;
}

/** playwright lives outside this repo (it is not a project dependency) — find it. */
function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require('playwright');
  } catch {
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    return createRequire(path.join(globalRoot, 'x.js'))('playwright');
  }
}

// ── stage 1: crawl the category listings ────────────────────────────────────

async function crawlListings() {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 1200 } });
  const page = await ctx.newPage();
  const found = [];

  try {
    for (const cat of CATEGORIES) {
      const seen = new Set();
      const res = await page.goto(ORIGIN + cat.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      if (!res || res.status() >= 400) continue;

      for (let pageNo = 1; pageNo <= PAGES; pageNo++) {
        await page.waitForTimeout(5000);
        for (let s = 0; s < 8; s++) {
          await page.mouse.wheel(0, 4000);
          await page.waitForTimeout(700);
        }
        const links = await page.$$eval('a[href*="productDetails"]', (as) =>
          as.map((a) => ({ href: a.getAttribute('href'), text: a.innerText.trim().replace(/\s+/g, ' ') })),
        );
        let added = 0;
        for (const l of links) {
          const m = l.href?.match(/productDetails\/([^?/]+)\?skuid=([^&"']+)/);
          if (!m) continue;
          const model = decodeURIComponent(m[1]);
          if (seen.has(model)) continue;
          seen.add(model);
          added++;
          found.push({ model, sku: decodeURIComponent(m[2]), kind: cat.kind, group: cat.group, listName: l.text });
        }
        log(`  ${cat.group} p${pageNo}: +${added} (${seen.size} total)`);
        if (!added) break;

        // Pagination is a JS "Next" control — there is no /Page/N URL.
        const next = page.locator('a,button').filter({ hasText: /^\s*(Next|ถัดไป)\s*$/i }).first();
        if (pageNo === PAGES || !(await next.count()) || !(await next.isVisible().catch(() => false))) break;
        await next.click().catch(() => {});
      }
    }
  } finally {
    await browser.close();
  }
  return found;
}

// ── stage 2: read every candidate PDP ───────────────────────────────────────

const VARIANT_RE = /<span class="koh-product-variant[^>]*>/g;

/**
 * og:title is "<collection> | <descriptive name>" and EITHER half can be empty — a bare
 * " | " ships on SKUs the site never named. Splitting and taking the last piece therefore
 * has to drop the empty halves first, or the separator leaks into the name ("Wellworth™ |",
 * or just "|" when both halves are blank). Returns '' when the page genuinely carries no
 * name anywhere; callers fall back to the model number.
 */
function parseName(html) {
  const og = stripTags(html.match(/<meta property="og:title" content="([^"]*)"/)?.[1] || '');
  const part = og
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .pop();
  return part || stripTags(html.match(/koh-product-name">([\s\S]*?)<\/h1>/)?.[1] || '');
}

function parsePdp(html, model) {
  const variants = [];
  for (const m of html.matchAll(VARIANT_RE)) {
    const tag = m[0];
    const sku = tag.match(/data-koh-sku="([^"]+)"/)?.[1];
    const color = decodeEntities(tag.match(/data-koh-color="([^"]*)"/)?.[1] || '');
    const asset = tag.match(/\$product_src=is\{([^}]+)\}/)?.[1];
    if (!sku || !asset) continue;
    // The swatch <img> is a child of this span, not an attribute of it, so the finish
    // code comes off the SKU instead: `data-koh-sku` is always `<model>-<finish>` and the
    // model can itself contain dashes.
    const code = sku.startsWith(`${model}-`) ? sku.slice(model.length + 1) : sku.split('-').pop();
    variants.push({ sku, color, code, asset: decodeURIComponent(asset) });
  }

  // Spec rows are flat sibling spans, so walk them in document order rather than zipping by
  // index. A title owns exactly the ONE description that follows it: the ขนาด row ships an
  // empty description and then a SECOND description holding the technical-resources <ul>
  // ("Rough In/Spec Sheet", "รายการที่ตรงกัน" — PDF links and related-product chrome).
  // Letting an empty description fall through would pair that chrome with the label, so an
  // unclaimed description is skipped and a label with no value drops its row entirely.
  const specs = [];
  let pendingLabel = null;
  for (const m of html.matchAll(
    /koh-product-col-(title|description)">([\s\S]*?)<\/span>/g,
  )) {
    const clean = (s) => stripTags(s).replace(/:$/, '').replace(/,\s*$/, '').trim();
    if (m[1] === 'title') {
      pendingLabel = clean(m[2]) || null;
      continue;
    }
    if (!pendingLabel) continue;
    const label = pendingLabel;
    pendingLabel = null;
    if (/koh-pdf-link|koh-product-resources-technical-info/.test(m[2])) continue;
    const value = clean(m[2]);
    if (value) specs.push({ label, value });
  }

  const featureBlock = html.match(/koh-product-features-title">[^<]*<\/h2>([\s\S]{0,6000}?)<\/ul>/);
  const features = featureBlock
    ? [...featureBlock[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => stripTags(m[1])).filter(Boolean)
    : [];

  return {
    // `title` stays raw — slugify() and the catalogue filter both read it.
    title: stripTags(html.match(/<meta property="og:title" content="([^"]*)"/)?.[1] || ''),
    name: parseName(html),
    collection: stripTags(html.match(/<meta name="twitter:title" content="([^"]*)"/)?.[1] || ''),
    desc: stripTags(html.match(/koh-product-long-description">([\s\S]*?)<\/div>/)?.[1] || ''),
    specs,
    features,
    variants,
    pdf: html.match(/href="(https:\/\/techcomm\.kohler\.com[^"]+\.pdf)"/)?.[1] || null,
  };
}

export { parsePdp, getText, GENERATED, CACHE_DIR };

export const pdpUrl = (model, sku, lang) =>
  `${ORIGIN}${lang === 'en' ? '/en' : ''}/productDetails/${encodeURIComponent(model)}?skuid=${encodeURIComponent(sku)}`;

async function readCandidates(list) {
  let done = 0;
  return (
    await pool(list, 6, async (item) => {
      try {
        const html = await getText(pdpUrl(item.model, item.sku, 'th'));
        const parsed = parsePdp(html, item.model);
        if (++done % 25 === 0) log(`  ...${done}/${list.length}`);
        return { ...item, ...parsed };
      } catch (e) {
        log(`  skip ${item.model}: ${e.message}`);
        return null;
      }
    })
  ).filter(Boolean);
}

// ── stage 3: order the catalogue ────────────────────────────────────────────

const finishCount = (c) => new Set(c.variants.map((v) => v.code).filter(Boolean)).size;

/**
 * Shots that pass every automatic gate but still key badly, confirmed by eye against
 * #08090A. 22244K-S is photographed on a lit floor whose bright patch is walled off from
 * the plate by the toilet's own shadow, so the border fill cannot reach it and it ships as
 * a white puddle. One frame out of 307; the spec calls for dropping these rather than
 * loosening a threshold that would start eating white ceramic elsewhere.
 */
const MANUAL_REJECT = new Set(['22244K-S']);

/**
 * Everything the site sells ships, single-finish products included — they render a finish
 * label instead of a swatch row. Multi-finish products sort first because they are the ones
 * that demonstrate the swatch feature and the home page features them.
 */
function orderCatalogue(candidates) {
  return candidates
    .filter((c) => finishCount(c) >= 1 && c.title && !MANUAL_REJECT.has(c.model))
    .sort(
      (a, b) =>
        finishCount(b) - finishCount(a) ||
        a.kind.localeCompare(b.kind) ||
        a.group.localeCompare(b.group) ||
        a.model.localeCompare(b.model),
    );
}

// ── stage 4: images ─────────────────────────────────────────────────────────

const keyScript = path.join(ROOT, 'scripts', 'key-white.py');

/** Keying is CPU-bound pure Python, so it runs out of process and several at a time. */
function runPython(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('python3', [keyScript, ...args]);
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve(out.trim()) : reject(new Error((err || out || 'python failed').trim())),
    );
  });
}

// A handful of asset ids carry spaces ("kohlerchina/New Patio two-piece"), which Scene7
// answers with a 403 unless they are re-encoded after parsePdp decoded them.
const assetUrl = (asset, wid) =>
  `https://kohler.scene7.com/is/image/${asset.split('/').map(encodeURIComponent).join('/')}?fmt=png` +
  (wid ? `&wid=${wid}` : '');

function slugify(model, title) {
  const base = (title || '')
    .toLowerCase()
    .replace(/[™®]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const name = base.split('-').filter(Boolean).slice(0, 3).join('-');
  return `${name || 'kohler'}-${model.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

async function finishNames() {
  const map = {};
  for (const p of PALETTE_PAGES) {
    let html;
    try {
      html = await getText(ORIGIN + p);
    } catch {
      continue;
    }
    for (const m of html.matchAll(/swatch_([A-Za-z0-9]+)[^>]*?alt="([^"]*)"/g)) {
      const en = decodeEntities(m[2]).replace(/\*+$/, '').trim();
      if (en && !map[m[1]]) map[m[1]] = en;
    }
  }
  return map;
}

/**
 * Finish chips are shared across the whole catalogue — a dozen codes cover 190 products —
 * so each is fetched, keyed and averaged once and then copied into each product folder.
 */
const chipCache = new Map();

async function chipFor(code, tmp) {
  if (!chipCache.has(code)) {
    chipCache.set(
      code,
      (async () => {
        const cacheDir = path.join(tmp, 'chips');
        await fsp.mkdir(cacheDir, { recursive: true });
        const webp = path.join(cacheDir, `swatch-${code}.webp`);
        const raw = path.join(cacheDir, `swatch-${code}.png`);
        await fsp.writeFile(raw, await getBuffer(`https://kohler.scene7.com/is/image/PAWEB/swatch_${code}?wid=88`));
        const hex = (await runPython(['--swatch', raw, cacheDir, `swatch-${code}`])).match(/#[0-9A-F]{6}/)?.[0];
        return { webp, accent: hex || '#8A8A8A' };
      })(),
    );
  }
  return chipCache.get(code);
}

/**
 * The name/spec pair a product ships with, from its TH candidate and optional EN parse.
 * Exported so scripts/repair-pdp-fields.mjs re-derives exactly what a full run would emit.
 * A page with no name at all falls back to the model number — never an empty string.
 */
export function displayFields(cand, en) {
  const th = cand.name || `K-${cand.model}`;
  return {
    name: { th, en: en?.name || cand.collection || th },
    specs: cand.specs
      .slice(0, 3)
      .concat(cand.features.slice(0, 3).map((f, i) => ({ label: `คุณสมบัติ ${i + 1}`, value: f })))
      .slice(0, 6),
  };
}

async function buildProduct(cand, enHtml, palette, tmp) {
  const slug = slugify(cand.model, cand.title);
  const dir = path.join(OUT_DIR, slug);
  await fsp.mkdir(dir, { recursive: true });

  const en = enHtml ? parsePdp(enHtml, cand.model) : null;
  const enByCode = new Map((en?.variants || []).map((v) => [v.code, v]));

  const seen = new Set();
  const finishes = [];
  for (const v of cand.variants) {
    const code = v.code;
    if (!code || seen.has(code)) continue;
    seen.add(code);
    if (finishes.length >= MAX_FINISHES) break;

    try {
      // Keying is the slow part, so a re-run only redoes finishes it has not keyed yet.
      let out = 'cached';
      if (FRESH || !fs.existsSync(path.join(dir, `${code}.webp`))) {
        // Scene7 will not upscale: asking for wid=1400 from a master narrower than that
        // comes back 403, so fall back to the asset's native size.
        const png = await getBuffer(assetUrl(v.asset, 1400)).catch(() => getBuffer(assetUrl(v.asset)));
        const raw = path.join(tmp, `${slug}-${code}.png`);
        await fsp.writeFile(raw, png);
        out = await runPython([raw, dir, code]);
        await fsp.rm(raw, { force: true });
      }

      const chip = await chipFor(code, tmp);
      await fsp.copyFile(chip.webp, path.join(dir, `swatch-${code}.webp`));

      let enName = palette[code] || enByCode.get(code)?.color || v.color || code;
      let thName = (v.color || enName).split(';')[0].trim() || enName;
      if (code === 'NA') {
        // Kohler uses NA for "no colour option" and labels it "Not Applicable". Single-finish
        // products show that name instead of a swatch row, so it has to say something — the
        // material spec is what the finish actually is on these (stainless, mostly).
        const mat = (specsOf) => specsOf?.find((s) => /วัสดุ|^material/i.test(s.label))?.value;
        thName = mat(cand.specs) || thName;
        enName = mat(en?.specs) || enName;
      }
      finishes.push({
        code,
        name: { th: thName, en: enName },
        swatch: `/products/${slug}/swatch-${code}.webp`,
        accent: chip.accent,
        image: `/products/${slug}/${code}.webp`,
        // A master narrower than 700 yields no half-size variant; point at the full frame.
        image700: fs.existsSync(path.join(dir, `${code}-700.webp`))
          ? `/products/${slug}/${code}-700.webp`
          : `/products/${slug}/${code}.webp`,
      });
      log(`    ${cand.model} ${code} ${chip.accent} ${out.replace(/ out=.*/, '')}`);
    } catch (e) {
      log(`    !! ${cand.model} ${code}: ${e.message}`);
    }
  }
  // Single-finish products ship too — they render a finish label instead of a swatch row.
  // Only a product with no keyable shot at all is dropped.
  if (finishes.length < 1) {
    await fsp.rm(dir, { recursive: true, force: true });
    return null;
  }

  const { name, specs } = displayFields(cand, en);

  // Two thirds of the catalogue has no Information paragraph on its PDP. Where that is the
  // case the feature bullets are the only prose the site carries, so they stand in for it.
  const blurb = (long, features) => long || (features || []).slice(0, 3).join(' · ');

  return {
    slug,
    model: `K-${cand.model}`,
    category: cand.kind,
    name,
    desc: { th: blurb(cand.desc, cand.features), en: blurb(en?.desc, en?.features) },
    specs,
    finishes,
    spec_sheet: cand.pdf,
  };
}

// ── stage 5: emit ───────────────────────────────────────────────────────────

const j = (v) => JSON.stringify(v);

export function emit(all) {
  // Multi-finish products lead the array: they are the only ones that demonstrate the
  // swatch row, and the home page reads off the front of this list.
  const byFinishes = (a, b) => b.finishes.length - a.finishes.length;
  const products = [...all].sort(byFinishes);
  const featuredSlugs = new Set(products.slice(0, 6).map((p) => p.slug));

  const body = products
    .map((p) => {
      const finishes = p.finishes
        .map(
          (f) => `      {
        code: ${j(f.code)},
        name: { th: ${j(f.name.th)}, en: ${j(f.name.en)} },
        swatch: ${j(f.swatch)},
        accent: ${j(f.accent)},
        image: ${j(f.image)},
        image700: ${j(f.image700)},
      },`,
        )
        .join('\n');
      const specs = p.specs.map((s) => `      { label: ${j(s.label)}, value: ${j(s.value)} },`).join('\n');
      return `  {
    slug: ${j(p.slug)},
    model: ${j(p.model)},
    category: ${j(p.category)},
    name: { th: ${j(p.name.th)}, en: ${j(p.name.en)} },
    desc: { th: ${j(p.desc.th)}, en: ${j(p.desc.en)} },
    specs: [
${specs}
    ],
    finishes: [
${finishes}
    ],${featuredSlugs.has(p.slug) ? '\n    featured: true,' : ''}
    price: ASK,
    images: [${p.finishes.map((f) => j(f.image)).join(', ')}],
  },`;
    })
    .join('\n');

  return `// GENERATED by scripts/scrape-kohler.mjs — do not edit by hand.
// Source: kohler.co.th product detail pages. Imagery is Kohler's and is used here for
// presentation only; see README before deploying anywhere public.

export type Category = 'kitchen' | 'bath';
export type FinishCode = string;

export type Finish = {
  code: FinishCode;
  name: { th: string; en: string };
  /** /products/<slug>/swatch-<code>.webp */
  swatch: string;
  /** average colour of the swatch chip, used as --accent */
  accent: string;
  /** /products/<slug>/<code>.webp — 1400px, background keyed out */
  image: string;
  /** same frame at 700px */
  image700: string;
};

export type Product = {
  slug: string;
  model: string;
  category: Category;
  name: { th: string; en: string };
  desc: { th: string; en: string };
  specs: { label: string; value: string }[];
  /**
   * Always at least one. Two thirds of the Thai catalogue ships in a single finish — those
   * products must render the finish name as a label, NOT a one-button swatch row, so branch
   * on finishes.length > 1 rather than assuming a row is always meaningful.
   */
  finishes: Finish[];
  featured?: boolean;
  /** kept so components written against the mock data still compile */
  price: { th: string; en: string };
  /** kept for the same reason — mirrors finishes[].image */
  images: string[];
};

const ASK = { th: 'สอบถามราคา', en: 'Price on request' };

export const products: Product[] = [
${body}
];

export const featuredProducts = products.filter((p) => p.featured);

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function relatedProducts(slug: string, n = 3) {
  const cur = getProduct(slug);
  if (!cur) return [];
  return products.filter((p) => p.category === cur.category && p.slug !== slug).slice(0, n);
}
`;
}

// ── main ────────────────────────────────────────────────────────────────────

async function main() {
  log('1. crawling listings');
  const listing = await cached('listing', crawlListings);
  log(`   ${listing.length} products found`);

  log('2. reading product detail pages');
  const candidates = await cached('candidates', () => readCandidates(listing));
  const multi = candidates.filter((c) => finishCount(c) >= 2);
  log(`   ${candidates.length} read, ${multi.length} with >= 2 finishes`);

  log('3. ordering the catalogue');
  const queue = orderCatalogue(candidates).slice(0, Number(argv.limit ?? Infinity));
  const totalFinishes = queue.reduce((n, c) => n + Math.min(finishCount(c), MAX_FINISHES), 0);
  log(`   ${queue.length} products, ${totalFinishes} finish images to key`);

  log('4. downloading + keying images');
  const palette = await finishNames();
  const tmp = path.join(CACHE_DIR, 'raw');
  await fsp.mkdir(tmp, { recursive: true });
  await fsp.mkdir(OUT_DIR, { recursive: true });

  let done = 0;
  const built = await pool(queue, CONCURRENCY, async (cand) => {
    let enHtml = null;
    try {
      enHtml = await getText(pdpUrl(cand.model, cand.sku, 'en'));
    } catch {
      /* English page is optional */
    }
    const p = await buildProduct(cand, enHtml, palette, tmp);
    if (!p) log(`   !! dropped ${cand.model} — no keyable shot`);
    log(`   [${++done}/${queue.length}] ${cand.model}`);
    return p;
  });
  const products = built.filter(Boolean);

  log('5. writing lib/products.generated.ts');
  await fsp.writeFile(GENERATED, emit(products));
  const finishes = products.reduce((n, p) => n + p.finishes.length, 0);
  const multiN = products.filter((p) => p.finishes.length > 1).length;
  log(`   ${products.length} products (${multiN} multi-finish, ${products.length - multiN} single), ${finishes} finish images`);
  log(`   public/products is ${(await dirSize(OUT_DIR) / 1024 / 1024).toFixed(1)} MB`);
}

async function dirSize(dir) {
  let total = 0;
  for (const e of await fsp.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    total += e.isDirectory() ? await dirSize(p) : (await fsp.stat(p)).size;
  }
  return total;
}

// Only crawl when run directly — scripts/repair-pdp-fields.mjs imports the parser from here.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
