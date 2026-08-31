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
import { execSync } from 'node:child_process';
import { spawnSync } from 'node:child_process';
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
const WANT_TOTAL = Number(argv.products ?? 12);
const MAX_FINISHES = Number(argv['max-finishes'] ?? 6);

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

async function getBuffer(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers: { 'user-agent': UA, referer: ORIGIN + '/' } });
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    if (i === tries - 1) throw new Error(`HTTP ${r.status} for ${url}`);
    await sleep(800 * (i + 1));
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

  // Spec rows are flat sibling spans, and some rows carry an extra description span
  // (the CAD/PDF resource list), so titles and values cannot be zipped by index —
  // walk them in document order and pair each title with the description that follows.
  const specs = [];
  let pendingLabel = null;
  for (const m of html.matchAll(
    /koh-product-col-(title|description)">([\s\S]*?)<\/span>/g,
  )) {
    const text = stripTags(m[2]).replace(/:$/, '').replace(/,\s*$/, '').trim();
    if (m[1] === 'title') {
      pendingLabel = text || null;
    } else if (pendingLabel && text) {
      specs.push({ label: pendingLabel, value: text });
      pendingLabel = null;
    }
  }

  const featureBlock = html.match(/koh-product-features-title">[^<]*<\/h2>([\s\S]{0,6000}?)<\/ul>/);
  const features = featureBlock
    ? [...featureBlock[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => stripTags(m[1])).filter(Boolean)
    : [];

  return {
    title: stripTags(html.match(/<meta property="og:title" content="([^"]*)"/)?.[1] || ''),
    collection: stripTags(html.match(/<meta name="twitter:title" content="([^"]*)"/)?.[1] || ''),
    desc: stripTags(html.match(/koh-product-long-description">([\s\S]*?)<\/div>/)?.[1] || ''),
    specs,
    features,
    variants,
    pdf: html.match(/href="(https:\/\/techcomm\.kohler\.com[^"]+\.pdf)"/)?.[1] || null,
  };
}

const pdpUrl = (model, sku, lang) =>
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

// ── stage 3: pick the line-up ───────────────────────────────────────────────

/**
 * Rank by finish count, then spread. The Thai catalogue is thin and heavy on
 * near-identical SKUs from the same collection, so cap how many of a collection or
 * a sub-category can land in the final twelve.
 */
const finishCount = (c) => new Set(c.variants.map((v) => v.code).filter(Boolean)).size;

function select(candidates, want = WANT_TOTAL) {
  const usable = candidates.filter((c) => finishCount(c) >= 2 && c.desc && c.title);
  usable.sort((a, b) => finishCount(b) - finishCount(a) || a.model.localeCompare(b.model));

  // The brief asks for an even kitchen/bath split, but the Thai catalogue cannot supply
  // it: every kitchen SKU (and every toilet and lavatory) ships in a single finish, so a
  // kitchen slot can only be filled by dropping the >= 2 finishes rule. Fill the split
  // as far as it goes, then top up from whatever qualifies and say so.
  const supply = Object.fromEntries(
    ['kitchen', 'bath'].map((k) => [k, usable.filter((c) => c.kind === k).length]),
  );
  const perKind = {
    kitchen: Math.min(want / 2, supply.kitchen),
    bath: Math.min(want / 2, supply.bath),
  };
  const shortfall = want - perKind.kitchen - perKind.bath;
  if (shortfall > 0) {
    const spare = perKind.kitchen < want / 2 ? 'bath' : 'kitchen';
    perKind[spare] = Math.min(supply[spare], perKind[spare] + shortfall);
    log(`   !! only ${supply.kitchen} kitchen / ${supply.bath} bath products have >= 2 finishes`);
    log(`   !! falling back to ${perKind.kitchen} kitchen + ${perKind.bath} bath`);
  }

  const chosen = [];
  for (const capCollection of [1, 2, 3, 4]) {
    for (const capGroup of [2, 3, 4, 6, 8]) {
      for (const c of usable) {
        if (chosen.includes(c)) continue;
        const kindN = chosen.filter((x) => x.kind === c.kind).length;
        if (kindN >= perKind[c.kind]) continue;
        const collN = chosen.filter((x) => x.collection === c.collection).length;
        if (collN >= capCollection) continue;
        const groupN = chosen.filter((x) => x.group === c.group).length;
        if (groupN >= capGroup) continue;
        chosen.push(c);
      }
      if (chosen.length >= want) break;
    }
    if (chosen.length >= want) break;
  }
  // Anything left over, still ranked, is the reserve: some products turn out to have no
  // keyable shot at all and the caller pulls a replacement from here.
  return { chosen: chosen.slice(0, want), reserve: usable.filter((c) => !chosen.includes(c)) };
}

// ── stage 4: images ─────────────────────────────────────────────────────────

const keyScript = path.join(ROOT, 'scripts', 'key-white.py');

function runPython(args) {
  const r = spawnSync('python3', [keyScript, ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || 'python failed').trim());
  return r.stdout.trim();
}

const assetUrl = (asset, wid) => `https://kohler.scene7.com/is/image/${asset}?wid=${wid}&fmt=png`;

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
        const png = await getBuffer(assetUrl(v.asset, 1400));
        const raw = path.join(tmp, `${slug}-${code}.png`);
        await fsp.writeFile(raw, png);
        out = runPython([raw, dir, code]);
      }

      const chip = await getBuffer(`https://kohler.scene7.com/is/image/PAWEB/swatch_${code}?wid=88`);
      const rawChip = path.join(tmp, `swatch-${code}.png`);
      await fsp.writeFile(rawChip, chip);
      const accent = runPython(['--swatch', rawChip, dir, `swatch-${code}`]).match(/#[0-9A-F]{6}/)?.[0] || '#8A8A8A';

      const enName = palette[code] || enByCode.get(code)?.color || v.color || code;
      finishes.push({
        code,
        name: { th: (v.color || enName).split(';')[0].trim() || enName, en: enName },
        swatch: `/products/${slug}/swatch-${code}.webp`,
        accent,
        image: `/products/${slug}/${code}.webp`,
        image700: `/products/${slug}/${code}-700.webp`,
      });
      log(`    ${code} ${accent} ${out.replace(/ out=.*/, '')}`);
    } catch (e) {
      log(`    !! ${code}: ${e.message}`);
    }
  }
  if (finishes.length < 2) {
    await fsp.rm(dir, { recursive: true, force: true });
    return null;
  }

  const specs = cand.specs.slice(0, 3).concat(cand.features.slice(0, 3).map((f, i) => ({ label: `คุณสมบัติ ${i + 1}`, value: f })));

  return {
    slug,
    model: `K-${cand.model}`,
    category: cand.kind,
    name: { th: cand.title.split('|').pop().trim() || cand.title, en: en?.title?.split('|').pop().trim() || cand.collection },
    desc: { th: cand.desc, en: en?.desc || '' },
    specs: specs.slice(0, 6),
    finishes,
    spec_sheet: cand.pdf,
  };
}

// ── stage 5: emit ───────────────────────────────────────────────────────────

const j = (v) => JSON.stringify(v);

function emit(products) {
  // Feature the widest finish ranges — three per category where a category has them,
  // topped up to six overall so the home page never runs short.
  const byFinishes = (a, b) => b.finishes.length - a.finishes.length;
  const featuredSlugs = new Set(
    ['kitchen', 'bath'].flatMap((k) =>
      products.filter((p) => p.category === k).sort(byFinishes).slice(0, 3).map((p) => p.slug),
    ),
  );
  for (const p of [...products].sort(byFinishes)) {
    if (featuredSlugs.size >= 6) break;
    featuredSlugs.add(p.slug);
  }

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
  /** always >= 2 */
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

  log('3. selecting line-up');
  const { chosen, reserve } = select(candidates);
  for (const c of chosen) log(`   [${c.kind}/${c.group}] ${c.model} ${finishCount(c)} finishes — ${c.collection}`);
  if (chosen.length < WANT_TOTAL) throw new Error(`only ${chosen.length} products qualified`);

  log('4. downloading + keying images');
  const palette = await finishNames();
  const tmp = path.join(CACHE_DIR, 'raw');
  await fsp.mkdir(tmp, { recursive: true });
  await fsp.mkdir(OUT_DIR, { recursive: true });

  const products = [];
  const queue = [...chosen, ...reserve];
  for (const cand of queue) {
    if (products.length >= WANT_TOTAL) break;
    log(`   ${cand.model}`);
    let enHtml = null;
    try {
      enHtml = await getText(pdpUrl(cand.model, cand.sku, 'en'));
    } catch {
      /* English page is optional */
    }
    const p = await buildProduct(cand, enHtml, palette, tmp);
    if (p) products.push(p);
    else log(`   !! dropped ${cand.model} — fewer than 2 keyable finishes, pulling a replacement`);
  }

  log('5. writing lib/products.generated.ts');
  await fsp.writeFile(GENERATED, emit(products));
  log(`   ${products.length} products, ${products.reduce((n, p) => n + p.finishes.length, 0)} finish images`);
}

await main();
