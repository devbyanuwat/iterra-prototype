// ใส่ข้อมูลเดิมจาก lib/*.ts ลง DB ที่ยังว่าง: npm run db:seed
// รันซ้ำไม่ได้ กันข้อมูลซ้ำ · ไม่สร้างบัญชีผู้ดูแลระบบ (ใช้ npm run db:admin)
import { pathToFileURL } from 'node:url';
import pg from 'pg';
import { CATEGORIES, products } from '../lib/products.ts';
import { dict } from '../lib/i18n.ts';
import { posts } from '../lib/posts.ts';
import { projects } from '../lib/projects.ts';
import { ANNOUNCEMENT } from '../lib/announcement.ts';
import { CATALOG } from '../lib/catalog.ts';

const ASK_TH = 'สอบถามราคา';

export async function seed(client) {
  const used = await client.query('select count(*)::int as n from categories');
  if (used.rows[0].n > 0) throw new Error('DB มีข้อมูลแล้ว seed ได้เฉพาะ DB ว่าง');
  await client.query('begin');
  try {
    for (const [i, c] of CATEGORIES.entries()) {
      await client.query('insert into categories (key, name_th, name_en, multi_brand, sort) values ($1, $2, $3, $4, $5)', [
        c.key, dict.th.common.category[c.key], dict.en.common.category[c.key], c.multiBrand, i + 1,
      ]);
    }
    for (const [i, key] of Object.keys(dict.th.common.material).entries()) {
      await client.query('insert into materials (key, name_th, name_en, sort) values ($1, $2, $3, $4)', [
        key, dict.th.common.material[key], dict.en.common.material[key], i + 1,
      ]);
    }
    const brandId = new Map();
    for (const name of new Set(products.map((p) => p.brand))) {
      brandId.set(name, (await client.query('insert into brands (name) values ($1) returning id', [name])).rows[0].id);
    }
    const productId = new Map();
    for (const [i, p] of products.entries()) {
      const ask = p.price.th === ASK_TH;
      const r = await client.query(
        `insert into products (slug, category_key, brand_id, material_key, series, name_th, name_en, desc_th, desc_en,
           specs, price_th, price_en, featured, images, scenes, published, sort)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15, true, $16) returning id`,
        [
          p.slug, p.category, brandId.get(p.brand), p.material ?? null, p.series, p.name.th, p.name.en, p.desc.th, p.desc.en,
          JSON.stringify(p.specs), ask ? null : p.price.th, ask ? null : p.price.en, !!p.featured, p.images, p.scenes ?? [], i + 1,
        ],
      );
      productId.set(p.slug, r.rows[0].id);
    }
    for (const p of posts) {
      await client.query(
        `insert into posts (slug, title_th, title_en, excerpt_th, excerpt_en, body_th, tag_th, cover, inline, published_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [p.slug, p.title.th, p.title.en, p.excerpt.th, p.excerpt.en, p.body.join('\n\n'), p.tag, p.cover, p.inline, p.date],
      );
    }
    for (const [i, p] of projects.entries()) {
      const r = await client.query(
        `insert into projects (slug, name_th, name_en, location_th, location_en, type_th, type_en, year, images, published, sort)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10) returning id`,
        [p.slug, p.name.th, p.name.en, p.location.th, p.location.en, p.type.th, p.type.en, p.year, p.images, i + 1],
      );
      for (const slug of p.products) {
        if (!productId.has(slug)) throw new Error(`ผลงาน ${p.slug} อ้างสินค้า ${slug} ที่ไม่มี`);
        await client.query('insert into project_products (project_id, product_id) values ($1, $2) on conflict do nothing', [
          r.rows[0].id, productId.get(slug),
        ]);
      }
    }
    const A = ANNOUNCEMENT;
    await client.query(
      `insert into announcement (id, enabled, seen_key, title_th, title_en, body_th, body_en, image, cta_label_th, cta_label_en, cta_href)
       values (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [A.enabled, A.id, A.title.th, A.title.en, A.body.th, A.body.en, A.image, A.cta.label.th, A.cta.label.en, A.cta.href],
    );
    await client.query('insert into catalog (id, pdf, page_count, size_mb) values (1, $1, $2, $3)', [
      CATALOG.pdf, CATALOG.pages, CATALOG.pdfSizeMB,
    ]);
    await client.query('commit');
  } catch (e) {
    await client.query('rollback');
    throw e;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await seed(client);
    console.log('seed เสร็จ');
  } finally {
    await client.end();
  }
}
