#!/usr/bin/env node
/**
 * Re-key only the product frames whose baked drop shadow the new pass in key-white.py can
 * remove — see `shadow_background` there for why the old ramp missed them.
 *
 *   node scripts/rekey-shadows.mjs [--dry] [--only=<slug>] [--concurrency=N]
 *
 * Every frame is analysed with `key-white.py --dry` first, which writes nothing. Only the
 * ones that report shadow>0 are keyed again for real, so an image the pass declines to touch
 * keeps its current bytes rather than being re-encoded for nothing. Masters are cached under
 * the scraper's own temp dir; nothing else in public/products is touched.
 */

import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'products');
const KEY_SCRIPT = path.join(ROOT, 'scripts', 'key-white.py');
const CACHE_DIR = path.join(os.tmpdir(), 'iterra-kohler-scrape');
const MASTERS = path.join(CACHE_DIR, 'masters');
const CANDIDATES = path.join(CACHE_DIR, 'candidates.json');
const GENERATED = path.join(ROOT, 'lib', 'products.generated.ts');
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const argv = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const DRY = !!argv.dry;
const CONCURRENCY = Number(argv.concurrency ?? Math.max(2, os.cpus().length - 2));

const assetUrl = (asset, wid) =>
  `https://kohler.scene7.com/is/image/${asset.split('/').map(encodeURIComponent).join('/')}?fmt=png` +
  (wid ? `&wid=${wid}` : '');

/** Every (slug, finish) frame on disk, paired with the Scene7 master it was keyed from. */
function manifest() {
  const src = fs.readFileSync(GENERATED, 'utf8');
  const HEAD = 'export const products: Product[] = ';
  const body = src
    .slice(src.indexOf(HEAD) + HEAD.length, src.indexOf('\nexport const featuredProducts'))
    .trim()
    .replace(/;$/, '');
  const products = new Function('ASK', `return ${body}`)({});
  const byModel = new Map(JSON.parse(fs.readFileSync(CANDIDATES, 'utf8')).map((c) => [c.model, c]));

  const rows = [];
  for (const p of products) {
    const cand = byModel.get(p.model.replace(/^K-/, ''));
    if (!cand) continue;
    const assets = new Map(cand.variants.map((v) => [v.code, v.asset]));
    for (const f of p.finishes) {
      const asset = assets.get(f.code);
      if (asset) rows.push({ slug: p.slug, code: f.code, asset });
    }
  }
  return argv.only ? rows.filter((r) => r.slug === argv.only) : rows;
}

async function master(row) {
  const file = path.join(MASTERS, `${row.slug}-${row.code}.png`);
  if (fs.existsSync(file)) return file;
  for (const url of [assetUrl(row.asset, 1400), assetUrl(row.asset)]) {
    const r = await fetch(url, { headers: { 'user-agent': UA, referer: 'https://www.kohler.co.th/' } });
    if (r.ok) {
      await fsp.writeFile(file, Buffer.from(await r.arrayBuffer()));
      return file;
    }
  }
  throw new Error(`no master for ${row.slug} ${row.code}`);
}

function runPython(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('python3', [KEY_SCRIPT, ...args]);
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

async function main() {
  await fsp.mkdir(MASTERS, { recursive: true });
  const rows = manifest();
  console.log(`${rows.length} frames to analyse (concurrency ${CONCURRENCY})`);

  let done = 0;
  const results = await pool(rows, CONCURRENCY, async (row) => {
    const dir = path.join(OUT_DIR, row.slug);
    let line;
    try {
      const src = await master(row);
      line = await runPython([src, dir, row.code, '--dry']);
    } catch (e) {
      console.log(`  !! ${row.slug} ${row.code}: ${e.message}`);
      return null;
    }
    const shadow = Number(line.match(/shadow=(\d+)/)?.[1] ?? 0);
    if (++done % 40 === 0) console.log(`  ...${done}/${rows.length}`);
    return { ...row, shadow, line };
  });

  const hits = results.filter((r) => r && r.shadow > 0);
  console.log(`${hits.length} frames carry a removable baked shadow`);
  if (DRY) {
    for (const hit of hits) console.log(`  ${hit.slug} ${hit.code} shadow=${hit.shadow}`);
    return;
  }

  await pool(hits, CONCURRENCY, async (hit) => {
    const src = path.join(MASTERS, `${hit.slug}-${hit.code}.png`);
    const line = await runPython([src, path.join(OUT_DIR, hit.slug), hit.code]);
    console.log(`  rekeyed ${hit.slug} ${hit.code} ${line.replace(/ out=.*/, '')}`);
  });
  console.log(`re-keyed ${hits.length} frames`);
}

await main();
