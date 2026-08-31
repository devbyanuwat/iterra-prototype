#!/usr/bin/env node
/**
 * Re-derive name/specs for the products the PDP parser got wrong, without re-scraping the
 * whole catalogue or touching a single image.
 *
 *   node scripts/repair-pdp-fields.mjs [--dry]
 *
 * Two parser bugs shipped into lib/products.generated.ts (see the fixes in scrape-kohler.mjs):
 *  - the og:title separator leaked into the name, so 5 products were called "|" and 9 more
 *    ended in a pipe
 *  - the ขนาด row's empty description let the technical-resources <ul> ("Rough In/Spec Sheet",
 *    "รายการที่ตรงกัน") land in the value column of 63 spec rows
 *
 * Only the affected PDPs are fetched. Everything else — finishes, accents, image paths,
 * ordering, featured flags — is carried over verbatim from the generated file and re-emitted
 * through the scraper's own emit(), so an untouched product is byte-identical afterwards.
 * The candidates.json scrape cache is patched too, so a later cached run of the scraper does
 * not resurrect the bad values.
 */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import { parsePdp, displayFields, emit, getText, pdpUrl, GENERATED, CACHE_DIR } from './scrape-kohler.mjs';

const DRY = process.argv.includes('--dry');
const ASK = { th: 'สอบถามราคา', en: 'Price on request' };
const CANDIDATES = path.join(CACHE_DIR, 'candidates.json');
const HEAD = 'export const products: Product[] = ';
const TAIL = '\nexport const featuredProducts';

const isBadName = (n) => !n || n === '|' || /\|\s*$/.test(n.trim());
const isChrome = (v) => /Rough In|รายการที่ตรงกัน/.test(v);

/** Read the generated file back as data. It is a plain JS array literal apart from `ASK`. */
async function readGenerated() {
  const src = await fsp.readFile(GENERATED, 'utf8');
  const start = src.indexOf(HEAD);
  const end = src.indexOf(TAIL, start);
  if (start < 0 || end < 0) throw new Error('cannot locate the products array in ' + GENERATED);
  const literal = src.slice(start + HEAD.length, end).trim().replace(/;$/, '');
  return { src, products: new Function('ASK', `return ${literal}`)(ASK) };
}

async function main() {
  const { src, products } = await readGenerated();

  // emit() must round-trip an unmodified catalogue, or a "repair" would rewrite 182 products.
  if (emit(products) !== src) throw new Error('emit() does not round-trip the generated file');

  const affected = products.filter(
    (p) => isBadName(p.name.th) || isBadName(p.name.en) || p.specs.some((s) => isChrome(s.value)),
  );
  console.log(`${products.length} products, ${affected.length} to re-derive`);
  if (!affected.length) return;

  const cache = fs.existsSync(CANDIDATES) ? JSON.parse(await fsp.readFile(CANDIDATES, 'utf8')) : [];
  const byModel = new Map(cache.map((c) => [c.model, c]));

  for (const p of affected) {
    const model = p.model.replace(/^K-/, '');
    const cand = byModel.get(model);
    if (!cand) throw new Error(`${p.slug}: model ${model} is not in ${CANDIDATES}`);

    const th = parsePdp(await getText(pdpUrl(model, cand.sku, 'th')), model);
    const en = await getText(pdpUrl(model, cand.sku, 'en'))
      .then((html) => parsePdp(html, model))
      .catch(() => null); // the English page is optional, same as in a full run

    const merged = { ...cand, ...th };
    const { name, specs } = displayFields(merged, en);
    console.log(`  ${p.slug}: "${p.name.th}" -> "${name.th}" | specs ${p.specs.length} -> ${specs.length}`);
    p.name = name;
    p.specs = specs;

    // Keep the scrape cache in step with what was just written.
    Object.assign(cand, th);
  }

  if (DRY) return console.log('dry run — nothing written');
  await fsp.writeFile(GENERATED, emit(products));
  if (cache.length) await fsp.writeFile(CANDIDATES, JSON.stringify(cache, null, 2));
  console.log(`wrote ${GENERATED}`);
}

await main();
