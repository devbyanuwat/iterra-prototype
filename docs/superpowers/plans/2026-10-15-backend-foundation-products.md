# Backend foundation and products: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move ITERRA from a static export to one Next.js server backed by PostgreSQL, with an admin login and real admin screens for products, categories, brands, materials and the entry announcement, and make the public product pages read from the database.

**Architecture:** One Next.js 16 app run with `next start`. Data access lives in `lib/server/*.ts`: plain functions that take a `db` argument and import nothing except types and `node:` modules, so `scripts/check-db.mjs` can run them directly with Node against a throwaway `iterra_test` database. Next-only glue (`lib/db.ts` pool, `lib/admin.ts` session check) wraps them. Admin writes go through Server Functions that always call `requireAdmin()` first; the root layout is `force-dynamic`, so every request reads fresh data and no `revalidatePath` is needed.

**Tech Stack:** Next.js 16.3 (App Router, Server Functions, `proxy.ts`), React 19, PostgreSQL 16, `pg` 8.23.1, Tailwind 3.4, Node 22 (`--experimental-strip-types` for tests).

**Spec:** `docs/superpowers/specs/2026-10-15-backend-postgres-design.md`

**Schedule (from `docs/plan/iterra-team-plan.html`):** Task 1 and 2 on Fri 16 Oct, Task 3 on Mon 19, Task 4 and 5 on Tue 20, Task 6 on Tue 20 to Wed 21, Task 7 on Wed 21, Task 8 on Thu 22, Task 9 on Thu 22. Fri 23 is deploy round 1 (not in this plan). Plan 2 (articles, projects, contact form, catalog, extra pages) is written after this plan lands.

## Global Constraints

- Branch `feat/backend-foundation`, cut with `git switch -c feat/backend-foundation --no-track origin/main`. One commit per task, pushed with `git push -u origin feat/backend-foundation`. No PR, no merge, no push to `main`.
- **Approvals needed from the lead before Task 1 starts** (AGENTS.md "Stop and ask first"): editing `next.config.mjs`; adding `pg` and `@types/pg`; new routes `/admin/login/`, `/admin/categories/`, `/admin/announcement/`, `/uploads/...`; moving `app/admin/products/page.tsx` into `app/admin/(panel)/products/page.tsx`; creating the local databases `iterra_dev` and `iterra_test`.
- Local PostgreSQL on this machine listens on **port 5433**, not 5432. The same server holds `iaxo_backend_v2`, which belongs to another project: never connect to it, never drop or alter it.
- `scripts/check-db.mjs` drops and recreates the `public` schema of its target. It must refuse any database whose name does not end in `_test` (Task 1 builds that guard first).
- `lib/server/*.ts` import only `import type ...` and `node:` modules. Node's `--experimental-strip-types` cannot resolve `@/` paths or extension-less relative imports, and `tsc` here does not allow `.ts` extensions in imports. Each of these files therefore declares its own `Db` type and `InputError` class.
- Every exported function in an `actions.ts` / `upload-action.ts` file starts with `'use server'` at file top and runs `requireAdmin()` before any read or write (directly or through `adminAction`). The public site never imports these files.
- `proxy.ts` is only an optimistic redirect for requests without a session cookie. It is not authorization (Next 16 docs, `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`).
- SQL always uses `$n` parameters. No string concatenation of user input into SQL.
- Admin interface text is Thai only (design.md back office section, as in the approved mockup). Public interface text stays in `lib/i18n.ts` in TH and EN.
- No U+0E4E. No en dash or em dash. No arrows or emoji in interface text.
- Do not invent prices, metrics or client content. A null price shows "สอบถามราคา".
- Secrets live in `.env` (gitignored by `.env*`). Commit only `.env.example`.
- Read `node_modules/next/dist/docs/` before using a Next API you are unsure of (AGENTS.md).
- Gates before every commit (from the task that introduces each one):
  - `npx tsc --noEmit 2>&1 | grep -v '\.next/types'` prints nothing
  - `npm run check:db`, `npm run check:filter`, `npm run check:search`
  - `npm run build`
  - `perl -CSD -ne 'print "$ARGV:$.: $_" if /\x{0E4E}|\x{2013}|\x{2014}/' $(git ls-files -m -o --exclude-standard)` prints nothing (run before `git add`)
  - From Task 6 on, `npm run check:overflow` with the dev server running on port 4100 (`preview_start` with config `iterra-dev`)
- `scripts/check-artwork.mjs` reads `out/` from the old static export and was already stale before this plan (it lists products that no longer exist). Leave it alone and do not run it.

## Review Focus

1. A Server Function called directly (crafted POST, no UI, no cookie) must change nothing. Expected: redirect to `/admin/login/`, no row written. Pinned in Task 6 Step 9, Task 7 Step 4 and Task 9 Step 8 by a grep that every exported action goes through `adminAction` or calls `requireAdmin`, plus a curl POST without a cookie.
2. Two admin tabs: tab A deletes a product, tab B saves an edit to it. Expected: tab B shows "ไม่พบสินค้านี้ อาจถูกลบไปแล้ว", nothing is re-created. Pinned in Task 6 Step 1.
3. An upload whose name says `.jpg` but whose bytes are SVG or HTML. Expected: rejected; only JPEG, PNG and WebP magic bytes pass. Pinned in Task 5 Step 1.
4. `/uploads/` URL that tries to climb out of `UPLOAD_DIR` (`..`, encoded `%2e%2e`). Expected: 404, never a file outside the folder. Pinned in Task 5 Step 1 and Step 6.
5. Login email typed with capitals or spaces, and a password reset for an account with open sessions. Expected: email matches case-insensitively; resetting the password logs out every old session. Pinned in Task 3 Step 1.

## File map

| File | Task | Responsibility |
|---|---|---|
| `next.config.mjs` | 1 | drop `output: 'export'`, raise Server Action body limit to 6 MB |
| `package.json` | 1 | `pg`, `@types/pg`, scripts `db:migrate`, `db:seed`, `db:admin`, `check:db` |
| `.env.example` | 1 | documented settings, no secrets |
| `db/migrations/001_init.sql` | 1 | the 13 tables from spec section 3 |
| `scripts/db-migrate.mjs` | 1 | run new migration files in order, record them in `schema_migrations` |
| `scripts/check-db.mjs` | 1 to 9 | integration checks against `iterra_test` |
| `lib/db.ts` | 1 | one `pg` Pool per process |
| `db/seed.mjs` | 2 | copy current `lib/*.ts` content into an empty database |
| `lib/server/auth.ts` | 3 | password hashing, sessions, login throttle, `upsertAdmin` |
| `lib/admin.ts` | 3 | `currentAdmin`, `requireAdmin`, `ipHash`, `adminAction`, `Result` |
| `components/admin/ui.ts` | 3 | shared glass-theme class strings |
| `components/admin/LoginForm.tsx` | 3 | login form |
| `app/admin/login/page.tsx`, `actions.ts` | 3 | login page, `loginAction`, `logoutAction` |
| `app/admin/(panel)/layout.tsx` | 3, 6 | session gate (Task 3), glass shell (Task 6) |
| `app/admin/(panel)/products/page.tsx` | 3, 6 | moved from `app/admin/products/page.tsx` |
| `proxy.ts` | 3 | redirect to login when the cookie is missing |
| `scripts/db-create-admin.mjs` | 3 | create or reset an admin from env |
| `lib/server/taxonomy.ts` | 4 | categories, brands, materials |
| `lib/server/uploads.ts` | 5 | magic-byte check, file naming, safe path join |
| `app/admin/(panel)/upload-action.ts` | 5 | `uploadImageAction` |
| `app/uploads/[...path]/route.ts` | 5 | serve files from `UPLOAD_DIR` |
| `lib/server/products.ts` | 6, 8 | admin CRUD (Task 6), public reads (Task 8) |
| `app/admin/(panel)/products/actions.ts` | 6 | product Server Functions |
| `components/admin/AdminShell.tsx` | 6 | glass background, sidebar, opacity slider, logout |
| `components/admin/ImageField.tsx` | 6 | image list with upload and remove |
| `components/admin/ProductsAdmin.tsx` | 6 | rewritten on real data |
| `components/Announcement.tsx` | 6, 9 | skip `/admin` (Task 6), read DB data (Task 9) |
| `app/admin/(panel)/categories/*`, `components/admin/TaxonomyAdmin.tsx` | 7 | categories, brands, materials screen |
| `components/CatalogProvider.tsx` | 8 | published products, categories, materials for client components |
| `app/layout.tsx` | 8, 9 | `force-dynamic`, load catalog and announcement |
| `lib/products.ts`, `components/Products*.tsx`, `ProductCard`, `ProductDetail`, `HomeContent`, `ProjectsContent`, `SearchPanel`, `app/products/[slug]/page.tsx`, `app/sitemap.ts`, `scripts/check-filter.mjs` | 8 | public pages read the database |
| `lib/server/announcement.ts`, `app/admin/(panel)/announcement/*`, `components/admin/AnnouncementAdmin.tsx` | 9 | announcement admin |

---

### Task 1: Foundation: server mode, `pg`, schema, migrate, test harness

**Files:**
- Modify: `next.config.mjs`, `package.json`, `package-lock.json`
- Create: `.env.example`, `lib/db.ts`, `db/migrations/001_init.sql`, `scripts/db-migrate.mjs`, `scripts/check-db.mjs`

**Interfaces:**
- Produces: `migrate(client: pg.Client | pg.PoolClient, dir?: URL): Promise<string[]>` from `scripts/db-migrate.mjs` (returns file names it ran). `db: Pool` from `lib/db.ts`. `scripts/check-db.mjs` holds one connected client `c` for the whole run; later tasks append sections that use `c`.

- [ ] **Step 1: Create the local databases and `.env`**

```bash
createdb -h localhost -p 5433 iterra_dev
createdb -h localhost -p 5433 iterra_test
psql -h localhost -p 5433 -d iterra_test -Atc 'select current_database()'
```
Expected: last command prints `iterra_test`.

Create `.env.example`:

```
# ค่าตั้งของ ITERRA · คัดลอกเป็น .env แล้วแก้ · ห้าม commit .env
# เครื่องพัฒนานี้ PostgreSQL ฟังที่ port 5433 · ผู้ใช้ DB = ผู้ใช้เครื่อง (pg อ่านจาก $USER)
DATABASE_URL=postgres://localhost:5433/iterra_dev
TEST_DATABASE_URL=postgres://localhost:5433/iterra_test
# ที่เก็บไฟล์อัปโหลด ต้องอยู่นอกโฟลเดอร์โปรเจกต์ และเป็น path เต็ม
UPLOAD_DIR=/tmp/iterra-uploads
SESSION_DAYS=14
# ค่าสุ่มยาว ๆ ใช้ผสมก่อน hash IP
IP_SALT=change-me
# บัญชีผู้ดูแลระบบสำหรับ npm run db:admin (เครื่องพัฒนาเท่านั้น)
ADMIN_EMAIL=
ADMIN_NAME=
ADMIN_PASSWORD=
```

Then `cp .env.example .env` and in `.env` set `IP_SALT` to the output of `openssl rand -hex 24`, and `UPLOAD_DIR` to `$HOME/iterra-uploads` written out as a full path. Leave the `ADMIN_*` lines for Task 3.

- [ ] **Step 2: Write the failing test harness**

Create `scripts/check-db.mjs`:

```js
// เช็ก DB ทั้งชุดกับฐานข้อมูลทดสอบ: npm run check:db
// ล้าง schema public ทุกครั้งที่รัน จึงยอมรันเฉพาะ DB ที่ชื่อลงท้าย _test
import assert from 'node:assert/strict';
import pg from 'pg';
import { migrate } from './db-migrate.mjs';

const url = process.env.TEST_DATABASE_URL ?? 'postgres://localhost:5433/iterra_test';
assert.ok(new URL(url).pathname.endsWith('_test'), `ไม่รันกับ ${url}: ชื่อ DB ต้องลงท้าย _test`);

const pool = new pg.Pool({ connectionString: url });
const c = await pool.connect();
try {
  await c.query('drop schema public cascade; create schema public');

  // ── migrate (Task 1) ──
  assert.deepEqual(await migrate(c), ['001_init.sql']);
  assert.deepEqual(await migrate(c), [], 'รันซ้ำต้องไม่รันไฟล์เดิม');
  const tables = (await c.query("select table_name from information_schema.tables where table_schema = 'public'")).rows
    .map((r) => r.table_name)
    .sort();
  assert.deepEqual(tables, [
    'admin_users', 'announcement', 'brands', 'catalog', 'categories', 'inquiries', 'login_attempts',
    'materials', 'posts', 'products', 'project_products', 'projects', 'schema_migrations', 'sessions',
  ]);
  // ตารางค่าชุดเดียวมีได้แถวเดียว
  await assert.rejects(
    c.query("insert into catalog (id, pdf, page_count, size_mb) values (2, '/x.pdf', 1, 1)"),
    /catalog_id_check/,
  );

  console.log('ผ่าน: ฐานข้อมูล');
} finally {
  c.release();
  await pool.end();
}
```

Add to `package.json` `scripts` (after `check:room`):

```json
    "db:migrate": "node --env-file-if-exists=.env scripts/db-migrate.mjs",
    "db:seed": "node --no-warnings --experimental-strip-types --env-file-if-exists=.env db/seed.mjs",
    "db:admin": "node --no-warnings --experimental-strip-types --env-file-if-exists=.env scripts/db-create-admin.mjs",
    "check:db": "node --no-warnings --experimental-strip-types --env-file-if-exists=.env scripts/check-db.mjs"
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npm run check:db`
Expected: FAIL with `Cannot find package 'pg'` or `Cannot find module` for `scripts/db-migrate.mjs` (both are missing at this point; Node reports whichever it resolves first).

- [ ] **Step 4: Install `pg`**

```bash
npm install pg@8.23.1
npm install -D @types/pg@8.23.1
```
Expected: `package.json` gains `"pg": "^8.23.1"` in `dependencies` and `"@types/pg": "^8.23.1"` in `devDependencies`.

Run: `npm run check:db`
Expected: FAIL with `Cannot find module` for `scripts/db-migrate.mjs`.

- [ ] **Step 5: Write the migration and the runner**

Create `db/migrations/001_init.sql` with the spec section 3 schema minus `schema_migrations` (the runner owns that table):

```sql
-- 001: ตารางทั้งหมดของ backend รอบแรก · ตรงกับ spec หัวข้อ 3
create table admin_users (
  id            bigint generated always as identity primary key,
  email         text not null unique,
  name          text not null,
  password_hash text not null,
  disabled_at   timestamptz,
  created_at    timestamptz not null default now()
);
create table sessions (
  token_hash text primary key,
  user_id    bigint not null references admin_users on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table login_attempts (
  ip_hash text not null,
  at      timestamptz not null default now()
);
create index on login_attempts (ip_hash, at);

create table categories (
  key         text primary key,
  name_th     text not null,
  name_en     text not null,
  multi_brand boolean not null default false,
  sort        int not null default 0
);
create table brands (
  id   bigint generated always as identity primary key,
  name text not null unique
);
create table materials (
  key     text primary key,
  name_th text not null,
  name_en text not null,
  sort    int not null default 0
);
create table products (
  id           bigint generated always as identity primary key,
  slug         text not null unique,
  category_key text not null references categories on delete restrict,
  brand_id     bigint not null references brands on delete restrict,
  material_key text references materials on delete restrict,
  series       text not null default '',
  name_th      text not null,
  name_en      text not null,
  desc_th      text not null default '',
  desc_en      text not null default '',
  specs        jsonb not null default '[]',
  price_th     text,
  price_en     text,
  featured     boolean not null default false,
  images       text[] not null default '{}',
  scenes       text[] not null default '{}',
  published    boolean not null default false,
  sort         int not null default 0,
  updated_at   timestamptz not null default now()
);

create table posts (
  id           bigint generated always as identity primary key,
  slug         text not null unique,
  title_th     text not null,
  title_en     text not null,
  excerpt_th   text not null default '',
  excerpt_en   text not null default '',
  body_th      text not null default '',
  body_en      text not null default '',
  tag_th       text not null default '',
  tag_en       text not null default '',
  cover        text,
  inline       text[] not null default '{}',
  published_at date,
  updated_at   timestamptz not null default now()
);
create table projects (
  id          bigint generated always as identity primary key,
  slug        text not null unique,
  name_th     text not null,
  name_en     text not null,
  location_th text not null default '',
  location_en text not null default '',
  type_th     text not null default '',
  type_en     text not null default '',
  year        int,
  images      text[] not null default '{}',
  published   boolean not null default false,
  sort        int not null default 0
);
create table project_products (
  project_id bigint references projects on delete cascade,
  product_id bigint references products on delete cascade,
  primary key (project_id, product_id)
);

create table announcement (
  id           int primary key default 1 check (id = 1),
  enabled      boolean not null default false,
  seen_key     text not null,
  title_th     text not null,
  title_en     text not null,
  body_th      text not null,
  body_en      text not null,
  image        text,
  cta_label_th text,
  cta_label_en text,
  cta_href     text,
  updated_at   timestamptz not null default now()
);
create table catalog (
  id         int primary key default 1 check (id = 1),
  pdf        text not null,
  page_count int not null,
  size_mb    int not null,
  updated_at timestamptz not null default now()
);

create table inquiries (
  id         bigint generated always as identity primary key,
  name       text not null,
  email      text not null,
  message    text not null,
  ip_hash    text not null,
  emailed_at timestamptz,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index on inquiries (ip_hash, created_at);
```

Create `scripts/db-migrate.mjs`:

```js
// รันไฟล์ใน db/migrations ที่ยังไม่เคยรัน เรียงตามชื่อ: npm run db:migrate
// ไฟล์ละ 1 transaction · ไฟล์ไหนพัง ไฟล์นั้นถอยกลับทั้งไฟล์ แล้วหยุด
import { readdir, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import pg from 'pg';

// client ต้องเป็น connection เดียว (pg.Client หรือ pool.connect()) ไม่ใช่ Pool เพราะ begin/commit ต้องอยู่ connection เดียวกัน
export async function migrate(client, dir = new URL('../db/migrations/', import.meta.url)) {
  await client.query('create table if not exists schema_migrations (name text primary key, run_at timestamptz not null default now())');
  const done = new Set((await client.query('select name from schema_migrations')).rows.map((r) => r.name));
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  const ran = [];
  for (const f of files) {
    if (done.has(f)) continue;
    const sql = await readFile(new URL(f, dir), 'utf8');
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query('insert into schema_migrations (name) values ($1)', [f]);
      await client.query('commit');
    } catch (e) {
      await client.query('rollback');
      throw new Error(`${f}: ${e.message}`);
    }
    ran.push(f);
  }
  return ran;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const ran = await migrate(client);
    console.log(ran.length ? `รันแล้ว: ${ran.join(', ')}` : 'ไม่มี migration ใหม่');
  } finally {
    await client.end();
  }
}
```

Create `lib/db.ts`:

```ts
import { Pool } from 'pg';

// pool เดียวต่อ process · dev server โหลดโมดูลใหม่บ่อย จึงเก็บไว้ที่ globalThis กันเปิด connection ซ้ำ
// สร้าง Pool ยังไม่ต่อ DB จนกว่าจะ query ครั้งแรก next build จึงไม่ต้องมี DB
const g = globalThis as unknown as { iterraPool?: Pool };
export const db = g.iterraPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
if (process.env.NODE_ENV !== 'production') g.iterraPool = db;
```

- [ ] **Step 6: Run the test and watch it pass**

Run: `npm run check:db`
Expected: `ผ่าน: ฐานข้อมูล`

Then check the guard: `TEST_DATABASE_URL=postgres://localhost:5433/iterra_dev node --no-warnings scripts/check-db.mjs`
Expected: FAIL with `ไม่รันกับ postgres://localhost:5433/iterra_dev: ชื่อ DB ต้องลงท้าย _test`, and `iterra_dev` untouched.

- [ ] **Step 7: Switch Next to server mode**

In `next.config.mjs` replace

```js
  output: 'export',
  trailingSlash: true,
```
with
```js
  // เลิก static export (2026-10-15): หลังบ้านต้องมี server และ DB
  trailingSlash: true,
  // รูปอัปโหลดผ่าน Server Function ไม่เกิน 5 MB (MAX_IMAGE) บวกส่วนหัว multipart ราว 20 KB
  // proxy.ts พักข้อมูลได้ 10 MB ตามค่าเริ่มต้น (proxyClientMaxBodySize) จึงไม่ต้องตั้งเพิ่ม
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
```

- [ ] **Step 8: Migrate the dev database and run every gate**

```bash
npm run db:migrate
npx tsc --noEmit 2>&1 | grep -v '\.next/types'
npm run check:db && npm run check:filter && npm run check:search
npm run build
```
Expected: `db:migrate` prints `รันแล้ว: 001_init.sql`; tsc prints nothing; the three checks print `ผ่าน`; build succeeds and no longer writes `out/`.

- [ ] **Step 9: Commit and push**

```bash
git add next.config.mjs package.json package-lock.json .env.example lib/db.ts db/migrations/001_init.sql scripts/db-migrate.mjs scripts/check-db.mjs
git commit -m "feat: switch to server mode and add PostgreSQL schema with migrate runner"
git push -u origin feat/backend-foundation
```

---

### Task 2: Seed the database from the current content files

**Files:**
- Create: `db/seed.mjs`
- Modify: `scripts/check-db.mjs`

**Interfaces:**
- Consumes: `migrate` (Task 1), `CATEGORIES`, `products` from `lib/products.ts`, `dict` from `lib/i18n.ts`, `posts`, `projects`, `ANNOUNCEMENT`, `CATALOG`.
- Produces: `seed(client): Promise<void>` from `db/seed.mjs`. After it runs, the test DB holds every seeded row; later tasks in `check-db.mjs` rely on slug `elate-13963t-c4`, category `faucet` (has products), category `wardrobe` (no products), brand `KOHLER`, materials `brass`, `stainless`, `castIron`.

- [ ] **Step 1: Write the failing test**

In `scripts/check-db.mjs` add these imports below `import { migrate } ...`:

```js
import { seed } from '../db/seed.mjs';
import { products } from '../lib/products.ts';
import { posts } from '../lib/posts.ts';
import { projects } from '../lib/projects.ts';
import { ANNOUNCEMENT } from '../lib/announcement.ts';
```

Insert this block just before `console.log('ผ่าน: ฐานข้อมูล');`:

```js
  // ── seed (Task 2) ──
  await seed(c);
  const count = async (from) => (await c.query(`select count(*)::int as n from ${from}`)).rows[0].n;
  assert.equal(await count('categories'), 7);
  assert.equal(await count('materials'), 3);
  assert.equal(await count('brands'), new Set(products.map((p) => p.brand)).size);
  assert.equal(await count('products'), products.length);
  assert.equal(await count('products where published'), products.length);
  assert.equal(await count('posts'), posts.length);
  assert.equal(await count('projects'), projects.length);
  assert.equal(await count('project_products'), projects.reduce((s, p) => s + new Set(p.products).size, 0));
  assert.equal((await c.query('select seen_key from announcement')).rows[0].seen_key, ANNOUNCEMENT.id);
  assert.equal(await count('catalog'), 1);
  // "สอบถามราคา" เก็บเป็น null: DB ต้องไม่มีราคาที่ไม่ได้มาจากข้อมูลเดิม
  assert.equal(await count('products where price_th is not null'), products.filter((p) => p.price.th !== 'สอบถามราคา').length);
  await assert.rejects(seed(c), /DB มีข้อมูลแล้ว/);
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run check:db`
Expected: FAIL with `Cannot find module` for `db/seed.mjs`.

- [ ] **Step 3: Write the seed**

Create `db/seed.mjs`:

```js
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
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm run check:db`
Expected: `ผ่าน: ฐานข้อมูล`

- [ ] **Step 5: Seed the dev database and run every gate**

```bash
npm run db:seed
psql -h localhost -p 5433 -d iterra_dev -Atc 'select count(*) from products'
npx tsc --noEmit 2>&1 | grep -v '\.next/types'
npm run check:db && npm run check:filter && npm run check:search && npm run build
```
Expected: `seed เสร็จ`; the count equals `products.length` in `lib/products.ts`; tsc prints nothing; checks pass; build succeeds.

- [ ] **Step 6: Commit and push**

```bash
git add db/seed.mjs scripts/check-db.mjs
git commit -m "feat: seed the database from the current content files"
git push
```

---
### Task 3: Admin login, session gate and `proxy.ts`

**Files:**
- Create: `lib/server/auth.ts`, `lib/admin.ts`, `components/admin/ui.ts`, `components/admin/LoginForm.tsx`, `app/admin/login/page.tsx`, `app/admin/login/actions.ts`, `app/admin/(panel)/layout.tsx`, `proxy.ts`, `scripts/db-create-admin.mjs`
- Move: `app/admin/products/page.tsx` to `app/admin/(panel)/products/page.tsx` (`git mv`, content unchanged in this task)
- Modify: `scripts/check-db.mjs`

**Interfaces:**
- Produces from `lib/server/auth.ts`: `SESSION_COOKIE = 'iterra_session'`, `type Admin = { id: number; email: string; name: string }`, `hashPassword(pw: string): Promise<string>`, `verifyPassword(pw: string, stored: string): Promise<boolean>`, `sha256(s: string): string`, `login(db, email, password, ipHash, days): Promise<{ token: string; expires: Date } | { error: 'locked' | 'invalid' }>`, `sessionUser(db, token: string | undefined): Promise<Admin | null>`, `logout(db, token: string | undefined): Promise<void>`, `upsertAdmin(db, email, name, password): Promise<void>`.
- Produces from `lib/admin.ts`: `type Result = { ok: true } | { ok: false; error: string }`, `currentAdmin(): Promise<Admin | null>`, `requireAdmin(): Promise<Admin>` (redirects to `/admin/login/`), `ipHash(): Promise<string>`, `adminAction(fn: () => Promise<unknown>): Promise<Result>`.
- Produces from `components/admin/ui.ts`: `input`, `label`, `solid`, `ghost`, `pill(on: boolean)`, `danger`, `dangerBorder`, `dangerSolid`.
- Produces from `app/admin/login/actions.ts`: `loginAction(prev: string | null, form: FormData): Promise<string | null>`, `logoutAction(): Promise<void>`.

- [ ] **Step 1: Write the failing test**

Add to the imports of `scripts/check-db.mjs`:

```js
import { login, logout, sessionUser, sha256, upsertAdmin, verifyPassword } from '../lib/server/auth.ts';
```

Insert before `console.log('ผ่าน: ฐานข้อมูล');`:

```js
  // ── login (Task 3) ──
  const pw = 'correct horse battery';
  await upsertAdmin(c, ' Admin@Example.test ', 'ผู้ทดสอบ', pw);
  assert.ok(await verifyPassword(pw, (await c.query('select password_hash from admin_users')).rows[0].password_hash));
  assert.equal(await verifyPassword('wrong', (await c.query('select password_hash from admin_users')).rows[0].password_hash), false);
  await assert.rejects(upsertAdmin(c, 'b@example.test', 'B', 'short'), /12/);
  // อีเมลไม่สนตัวพิมพ์และช่องว่าง
  const s1 = await login(c, ' ADMIN@example.test', pw, 'ip-a', 14);
  assert.ok('token' in s1);
  assert.equal((await sessionUser(c, s1.token))?.email, 'admin@example.test');
  assert.equal(await sessionUser(c, 'not-a-token'), null);
  assert.equal(await sessionUser(c, undefined), null);
  // ผิด 10 ครั้งจาก IP เดียว: ครั้งต่อไปรหัสถูกก็ไม่ผ่าน · IP อื่นยังเข้าได้
  for (let i = 0; i < 10; i++) assert.deepEqual(await login(c, 'admin@example.test', 'wrong', 'ip-b', 14), { error: 'invalid' });
  assert.deepEqual(await login(c, 'admin@example.test', pw, 'ip-b', 14), { error: 'locked' });
  assert.ok('token' in (await login(c, 'admin@example.test', pw, 'ip-c', 14)));
  // หมดอายุ
  await c.query("update sessions set expires_at = now() - interval '1 second' where token_hash = $1", [sha256(s1.token)]);
  assert.equal(await sessionUser(c, s1.token), null);
  // ปิดบัญชีแล้วใช้ session เดิมไม่ได้ และเข้าใหม่ไม่ได้
  const s2 = await login(c, 'admin@example.test', pw, 'ip-d', 14);
  await c.query('update admin_users set disabled_at = now()');
  assert.equal(await sessionUser(c, s2.token), null);
  assert.deepEqual(await login(c, 'admin@example.test', pw, 'ip-e', 14), { error: 'invalid' });
  await c.query('update admin_users set disabled_at = null');
  // ออกจากระบบ
  assert.ok(await sessionUser(c, s2.token));
  await logout(c, s2.token);
  assert.equal(await sessionUser(c, s2.token), null);
  // รีเซ็ตรหัสแล้ว session เก่าทุกอันใช้ไม่ได้
  const s3 = await login(c, 'admin@example.test', pw, 'ip-f', 14);
  await upsertAdmin(c, 'admin@example.test', 'ผู้ทดสอบ', 'another long password');
  assert.equal(await sessionUser(c, s3.token), null);
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run check:db`
Expected: FAIL with `Cannot find module` for `lib/server/auth.ts`.

- [ ] **Step 3: Write the auth module**

Create `lib/server/auth.ts`:

```ts
// รหัสผ่าน session และการกันเดารหัส
// import ได้แค่ node: กับ type เพื่อให้ scripts/check-db.mjs รันไฟล์นี้ด้วย Node ได้ตรง ๆ
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

type Db = { query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }> };
export type Admin = { id: number; email: string; name: string };

export const SESSION_COOKIE = 'iterra_session';
const MAX_ATTEMPTS = 10;
const WINDOW_MIN = 15;

const scryptAsync = (pw: string, salt: Buffer, len: number) =>
  new Promise<Buffer>((ok, fail) => scrypt(pw, salt, len, (e, key) => (e ? fail(e) : ok(key))));

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

// เก็บเป็น scrypt$<salt hex>$<hash hex>
export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${(await scryptAsync(pw, salt, 64)).toString('hex')}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [kind, salt, hash] = stored.split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const want = Buffer.from(hash, 'hex');
  const got = await scryptAsync(pw, Buffer.from(salt, 'hex'), want.length);
  return timingSafeEqual(got, want);
}

// ไม่มีอีเมลนี้ก็ยังคำนวณ scrypt หนึ่งรอบ เวลาตอบจะได้ไม่บอกว่าอีเมลไหนมีจริง
const NOBODY = `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`;

export async function login(
  db: Db,
  email: string,
  password: string,
  ipHash: string,
  days: number,
): Promise<{ token: string; expires: Date } | { error: 'locked' | 'invalid' }> {
  const tries = await db.query(
    'select count(*)::int as n from login_attempts where ip_hash = $1 and at > now() - make_interval(mins => $2)',
    [ipHash, WINDOW_MIN],
  );
  if (tries.rows[0].n >= MAX_ATTEMPTS) return { error: 'locked' };
  const u = await db.query('select id, password_hash from admin_users where email = $1 and disabled_at is null', [
    email.trim().toLowerCase(),
  ]);
  const ok = await verifyPassword(password, u.rows[0]?.password_hash ?? NOBODY);
  if (!ok || !u.rows[0]) {
    await db.query('insert into login_attempts (ip_hash) values ($1)', [ipHash]);
    return { error: 'invalid' };
  }
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + days * 86_400_000);
  await db.query('insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)', [sha256(token), u.rows[0].id, expires]);
  return { token, expires };
}

export async function sessionUser(db: Db, token: string | undefined): Promise<Admin | null> {
  if (!token) return null;
  const r = await db.query(
    `select u.id::int as id, u.email, u.name
       from sessions s join admin_users u on u.id = s.user_id
      where s.token_hash = $1 and s.expires_at > now() and u.disabled_at is null`,
    [sha256(token)],
  );
  return r.rows[0] ?? null;
}

export async function logout(db: Db, token: string | undefined): Promise<void> {
  if (token) await db.query('delete from sessions where token_hash = $1', [sha256(token)]);
}

// สร้างบัญชีใหม่ หรือรีเซ็ตรหัสบัญชีเดิม · รีเซ็ตแล้วตัด session เก่าทั้งหมดของบัญชีนั้น
export async function upsertAdmin(db: Db, email: string, name: string, password: string): Promise<void> {
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+$/.test(e)) throw new Error('อีเมลไม่ถูกต้อง');
  if (password.length < 12) throw new Error('รหัสผ่านต้องยาวอย่างน้อย 12 ตัว');
  const r = await db.query(
    `insert into admin_users (email, name, password_hash) values ($1, $2, $3)
     on conflict (email) do update set name = excluded.name, password_hash = excluded.password_hash, disabled_at = null
     returning id`,
    [e, name.trim() || e, await hashPassword(password)],
  );
  await db.query('delete from sessions where user_id = $1', [r.rows[0].id]);
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm run check:db`
Expected: `ผ่าน: ฐานข้อมูล`

- [ ] **Step 5: Write the Next glue, the login screen, the gate and the admin script**

Create `lib/admin.ts`:

```ts
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './db';
import { SESSION_COOKIE, sessionUser, sha256 } from './server/auth';

export type Result = { ok: true } | { ok: false; error: string };

// ตรวจ session จริงจาก DB ทุกหน้าและทุก Server Function ของหลังบ้าน (proxy.ts แค่ดูว่ามี cookie)
export const currentAdmin = cache(async () => sessionUser(db, (await cookies()).get(SESSION_COOKIE)?.value));

export async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) redirect('/admin/login/');
  return admin;
}

// IP มาจาก nginx (x-forwarded-for) · ผสม IP_SALT ก่อน hash เพราะ IPv4 มีน้อยพอจะไล่ย้อนกลับได้
export async function ipHash(): Promise<string> {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'local';
  return sha256(`${process.env.IP_SALT ?? ''}:${ip}`);
}

// ทุก Server Function ของหลังบ้านผ่านตัวนี้: ตรวจ session ก่อนเสมอ แล้วแปล error ที่ผู้ใช้แก้เองได้เป็นข้อความ
// error อื่นโยนต่อ ให้ Next แสดงหน้า error แทนการกลืนเงียบ
export async function adminAction(fn: () => Promise<unknown>): Promise<Result> {
  await requireAdmin();
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.name === 'InputError') return { ok: false, error: e.message };
    const code = (e as { code?: string }).code;
    if (code === '23503') return { ok: false, error: 'ลบไม่ได้ เพราะยังมีสินค้าใช้อยู่' };
    if (code === '23505') return { ok: false, error: 'มีรายการนี้อยู่แล้ว' };
    throw e;
  }
}
```

Create `components/admin/ui.ts` (class strings copied from the approved mockup in `components/admin/ProductsAdmin.tsx`):

```ts
// class ของหลังบ้านธีมกระจก ใช้ร่วมกันทุกหน้า · ยกมาจาก mockup ProductsAdmin ที่ผ่านแล้ว (2026-10-14)
export const input =
  'h-11 w-full rounded-xl border border-white/70 bg-white/70 px-3 text-base font-normal text-ink outline-none transition focus:border-ink focus:bg-white';
export const label = 'mb-2 block text-sm font-normal text-ink';
export const pill = (on: boolean) =>
  `inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-normal transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
    on ? 'bg-ink text-paper' : 'glass text-ink hover:bg-white'
  }`;
export const solid =
  'inline-flex min-h-11 items-center rounded-full bg-ink px-6 text-sm font-normal text-paper transition hover:bg-stone-700 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50';
export const ghost =
  'inline-flex min-h-11 items-center rounded-full px-4 text-sm font-normal text-ink transition hover:bg-white/70 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-40';
// แดงอิฐ #9f2d20 ค่าดิบตาม mockup ใช้กับปุ่มลบและข้อความผิดเท่านั้น
export const danger = 'text-[#9f2d20]';
export const dangerBorder = 'border-[#9f2d20]';
export const dangerSolid = 'inline-flex min-h-11 items-center rounded-full bg-[#9f2d20] px-6 text-sm text-paper active:scale-[0.98]';
```

Create `app/admin/login/actions.ts`:

```ts
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { ipHash } from '@/lib/admin';
import { SESSION_COOKIE, login, logout } from '@/lib/server/auth';

// ล็อกเพราะผิดเกินจำนวน ตอบข้อความเดียวกับรหัสผิด ไม่บอกผู้เดาว่าโดนล็อก
export async function loginAction(_prev: string | null, form: FormData): Promise<string | null> {
  const email = String(form.get('email') ?? '');
  const password = String(form.get('password') ?? '');
  if (!email.trim() || !password) return 'กรุณากรอกอีเมลและรหัสผ่าน';
  const r = await login(db, email, password, await ipHash(), Number(process.env.SESSION_DAYS) || 14);
  if ('error' in r) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  (await cookies()).set(SESSION_COOKIE, r.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: r.expires,
  });
  redirect('/admin/products/');
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  await logout(db, jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  redirect('/admin/login/');
}
```

Create `components/admin/LoginForm.tsx`:

```tsx
'use client';

// หน้าเข้าสู่ระบบหลังบ้าน · ทับโครงเว็บด้วย fixed overlay แบบเดียวกับหน้าหลังบ้านอื่น
import { useActionState } from 'react';
import { loginAction } from '@/app/admin/login/actions';
import { danger, input, label, solid } from './ui';

export default function LoginForm() {
  const [error, action, pending] = useActionState(loginAction, null);
  return (
    <div
      data-lenis-prevent
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-warm-200 p-4 font-normal text-ink"
      style={{ '--glass': 0.85 } as React.CSSProperties}
    >
      <form action={action} className="glass w-full max-w-sm space-y-5 rounded-[28px] p-6">
        <div>
          <p className="text-lg font-light tracking-[0.3em]">ITERRA</p>
          <h1 className="mt-1 text-xl font-light">เข้าสู่ระบบหลังบ้าน</h1>
        </div>
        <label className={label}>
          อีเมล
          <input name="email" type="email" autoComplete="username" required className={`${input} mt-2`} />
        </label>
        <label className={label}>
          รหัสผ่าน
          <input name="password" type="password" autoComplete="current-password" required className={`${input} mt-2`} />
        </label>
        <p role="alert" className={`min-h-5 text-sm ${danger}`}>
          {error}
        </p>
        <button type="submit" disabled={pending} className={`${solid} w-full justify-center`}>
          {pending ? 'กำลังเข้าสู่ระบบ' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  );
}
```

Create `app/admin/login/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/admin/LoginForm';
import { currentAdmin } from '@/lib/admin';

export const metadata: Metadata = {
  title: 'เข้าสู่ระบบหลังบ้าน',
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  if (await currentAdmin()) redirect('/admin/products/');
  return <LoginForm />;
}
```

Create `app/admin/(panel)/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin';

// ทุกหน้าใน (panel) ต้องเข้าสู่ระบบ · หน้าในกลุ่มนี้เรียก requireAdmin() ซ้ำเองด้วย เพราะ layout กับ page render พร้อมกัน
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}
```

Move the products page and gate it:

```bash
mkdir -p 'app/admin/(panel)/products'
git mv app/admin/products/page.tsx 'app/admin/(panel)/products/page.tsx'
```

In `app/admin/(panel)/products/page.tsx` replace

```tsx
export default function AdminProductsPage() {
  return <ProductsAdmin />;
}
```
with
```tsx
export default async function AdminProductsPage() {
  await requireAdmin();
  return <ProductsAdmin />;
}
```
and add `import { requireAdmin } from '@/lib/admin';` below the `ProductsAdmin` import.

Create `proxy.ts` at the repo root:

```ts
import { NextResponse, type NextRequest } from 'next/server';

// ด่านแรกแบบหยาบ: ไม่มี cookie ส่งไปหน้าเข้าสู่ระบบเลย ไม่ต้อง render หน้า admin
// ไม่ใช่การตรวจสิทธิ์ (เอกสาร Next 16 บอกว่า proxy ไม่ใช่ที่ทำ authorization) ตัวตรวจจริงคือ requireAdmin() ใน lib/admin.ts
// ชื่อ cookie ต้องตรงกับ SESSION_COOKIE ใน lib/server/auth.ts (ไม่ import เพื่อไม่ลาก node:crypto เข้ามาในไฟล์นี้)
export function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/admin/login') || req.cookies.has('iterra_session')) return NextResponse.next();
  return NextResponse.redirect(new URL('/admin/login/', req.url));
}

export const config = { matcher: '/admin/:path*' };
```

Create `scripts/db-create-admin.mjs`:

```js
// สร้างบัญชีผู้ดูแลระบบ หรือรีเซ็ตรหัส: npm run db:admin
// อ่าน ADMIN_EMAIL ADMIN_NAME ADMIN_PASSWORD จาก env (.env บนเครื่องพัฒนา) ไม่รับรหัสทาง argument กันติดใน shell history
import pg from 'pg';
import { upsertAdmin } from '../lib/server/auth.ts';

const { ADMIN_EMAIL, ADMIN_NAME = '', ADMIN_PASSWORD } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('ต้องตั้ง ADMIN_EMAIL และ ADMIN_PASSWORD');
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  await upsertAdmin(pool, ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD);
  console.log(`บันทึกผู้ดูแลระบบ ${ADMIN_EMAIL.trim().toLowerCase()} แล้ว`);
} finally {
  await pool.end();
}
```

- [ ] **Step 6: Create the dev admin and verify the flow in the browser**

In `.env` fill `ADMIN_EMAIL=dev@iterra.test`, `ADMIN_NAME=ทีมพัฒนา` and `ADMIN_PASSWORD=` the output of `openssl rand -base64 18`. Do not print the password in chat.

```bash
npm run db:admin
```
Expected: `บันทึกผู้ดูแลระบบ dev@iterra.test แล้ว`

Start the dev server (`preview_start` with config `iterra-dev`), then:

```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:4100/admin/products/
```
Expected: `307 http://localhost:4100/admin/login/` (stopped by `proxy.ts`).

A forged cookie passes `proxy.ts` and must be stopped by `requireAdmin`. Next may answer that one with a streamed meta-refresh instead of a 307, so check it in the browser: on `/` run `document.cookie = 'iterra_session=forged; path=/'` with `javascript_tool`, navigate to `/admin/products/`, and confirm the URL ends at `/admin/login/` with no product list rendered. Then clear it with `document.cookie = 'iterra_session=; path=/; max-age=0'`.

In the browser: open `/admin/login/`, submit a wrong password and see `อีเมลหรือรหัสผ่านไม่ถูกต้อง`; submit the `.env` credentials and land on `/admin/products/` (still the mockup screen). Read `document.cookie` with `javascript_tool`: it must not contain `iterra_session` (httpOnly).

- [ ] **Step 7: Gates, commit and push**

```bash
npx tsc --noEmit 2>&1 | grep -v '\.next/types'
npm run check:db && npm run check:filter && npm run check:search && npm run build
git add lib/server/auth.ts lib/admin.ts components/admin/ui.ts components/admin/LoginForm.tsx app/admin proxy.ts scripts/db-create-admin.mjs scripts/check-db.mjs
git commit -m "feat: add admin login with database sessions and gate the admin pages"
git push
```

---

### Task 4: Categories, brands and materials data layer

**Files:**
- Create: `lib/server/taxonomy.ts`
- Modify: `scripts/check-db.mjs`

**Interfaces:**
- Produces: `type CategoryRow = { key: string; name: { th: string; en: string }; multiBrand: boolean; count: number }`, `type BrandRow = { id: number; name: string; count: number }`, `type MaterialRow = { key: string; name: { th: string; en: string }; count: number }`, `type CategoryInput = { key: string; th: string; en: string; multiBrand: boolean }`, `type MaterialInput = { key: string; th: string; en: string }`, `listCategories(db)`, `saveCategory(db, input, isNew: boolean)`, `deleteCategory(db, key: string)`, `listBrands(db)`, `saveBrand(db, id: number | null, name: string)`, `deleteBrand(db, id: number)`, `listMaterials(db)`, `saveMaterial(db, input, isNew: boolean)`, `deleteMaterial(db, key: string)`. Errors: `InputError` (name `'InputError'`) for bad input, pg code `23503` when deleting something products still use, `23505` for a duplicate key or name.

- [ ] **Step 1: Write the failing test**

Add to the imports of `scripts/check-db.mjs`:

```js
import * as tax from '../lib/server/taxonomy.ts';
```

Insert before `console.log('ผ่าน: ฐานข้อมูล');`:

```js
  // ── หมวด แบรนด์ วัสดุ (Task 4) ──
  const cats = await tax.listCategories(c);
  assert.equal(cats.length, 7);
  assert.ok(cats.find((x) => x.key === 'faucet').count > 0);
  assert.equal(cats.find((x) => x.key === 'wardrobe').count, 0);
  assert.equal(cats[0].key, 'kitchen', 'เรียงตาม sort ของ seed');
  // ลบหมวดที่มีสินค้าไม่ได้ · หมวดว่างลบได้
  await assert.rejects(tax.deleteCategory(c, 'faucet'), (e) => e.code === '23503');
  await tax.deleteCategory(c, 'wardrobe');
  assert.equal((await tax.listCategories(c)).length, 6);
  // เพิ่มใหม่ไปอยู่ท้าย · รหัสซ้ำ · รหัสผิดรูป · ชื่อว่าง
  await tax.saveCategory(c, { key: 'wardrobe', th: 'ตู้เสื้อผ้า', en: 'Wardrobes', multiBrand: false }, true);
  assert.equal((await tax.listCategories(c)).at(-1).key, 'wardrobe');
  await assert.rejects(tax.saveCategory(c, { key: 'wardrobe', th: 'x', en: 'x', multiBrand: false }, true), (e) => e.code === '23505');
  await assert.rejects(tax.saveCategory(c, { key: 'Bad Key', th: 'x', en: 'x', multiBrand: false }, true), { name: 'InputError' });
  await assert.rejects(tax.saveCategory(c, { key: 'tiles', th: '  ', en: 'Tiles', multiBrand: false }, true), { name: 'InputError' });
  // แก้ชื่อและ multiBrand · แก้รายการที่ไม่มีอยู่
  await tax.saveCategory(c, { key: 'wardrobe', th: 'ตู้', en: 'Closets', multiBrand: true }, false);
  assert.deepEqual((await tax.listCategories(c)).find((x) => x.key === 'wardrobe').name, { th: 'ตู้', en: 'Closets' });
  await assert.rejects(tax.saveCategory(c, { key: 'ghost', th: 'x', en: 'x', multiBrand: false }, false), { name: 'InputError' });

  const brandRows = await tax.listBrands(c);
  const kohler = brandRows.find((b) => b.name === 'KOHLER');
  assert.equal(kohler.count, products.length);
  await assert.rejects(tax.deleteBrand(c, kohler.id), (e) => e.code === '23503');
  await tax.saveBrand(c, null, 'Franke');
  await assert.rejects(tax.saveBrand(c, null, 'Franke'), (e) => e.code === '23505');
  const franke = (await tax.listBrands(c)).find((b) => b.name === 'Franke');
  await tax.saveBrand(c, franke.id, 'FRANKE');
  await tax.deleteBrand(c, franke.id);
  assert.equal((await tax.listBrands(c)).length, brandRows.length);

  const mats = await tax.listMaterials(c);
  assert.deepEqual(mats.map((m) => m.key), ['brass', 'stainless', 'castIron']);
  await tax.saveMaterial(c, { key: 'quartz', th: 'ควอตซ์', en: 'Quartz' }, true);
  await tax.deleteMaterial(c, 'quartz');
  await assert.rejects(tax.deleteMaterial(c, 'stainless'), (e) => e.code === '23503');
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run check:db`
Expected: FAIL with `Cannot find module` for `lib/server/taxonomy.ts`.

- [ ] **Step 3: Write the module**

Create `lib/server/taxonomy.ts`:

```ts
// หมวด แบรนด์ วัสดุ · import แค่ type เพื่อให้ scripts/check-db.mjs รันไฟล์นี้ด้วย Node ได้ตรง ๆ
// ลบรายการที่สินค้ายังใช้อยู่ไม่ได้: FK on delete restrict โยน code 23503 ให้ adminAction แปลเป็นข้อความ

type Db = { query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }> };
type Name = { th: string; en: string };
export type CategoryRow = { key: string; name: Name; multiBrand: boolean; count: number };
export type BrandRow = { id: number; name: string; count: number };
export type MaterialRow = { key: string; name: Name; count: number };
export type CategoryInput = { key: string; th: string; en: string; multiBrand: boolean };
export type MaterialInput = { key: string; th: string; en: string };

// ข้อผิดที่ผู้ดูแลระบบแก้เองได้ adminAction ส่งข้อความนี้กลับไปตรง ๆ
export class InputError extends Error {
  name = 'InputError';
}

function text(v: unknown, msg: string, max = 120): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) throw new InputError(msg);
  if (s.length > max) throw new InputError(`ยาวเกิน ${max} ตัวอักษร`);
  return s;
}
function key(v: unknown): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!/^[a-z][a-zA-Z0-9-]{0,39}$/.test(s)) throw new InputError('รหัสใช้ a-z ตัวเลข และ - ขึ้นต้นด้วยตัวอักษร ไม่เกิน 40 ตัว');
  return s;
}
const nextSort = (table: string) => `(select coalesce(max(sort), 0) + 1 from ${table})`;

export async function listCategories(db: Db): Promise<CategoryRow[]> {
  const r = await db.query(
    `select c.key, c.name_th, c.name_en, c.multi_brand, count(p.id)::int as n
       from categories c left join products p on p.category_key = c.key
      group by c.key order by c.sort, c.key`,
  );
  return r.rows.map((x) => ({ key: x.key, name: { th: x.name_th, en: x.name_en }, multiBrand: x.multi_brand, count: x.n }));
}

export async function saveCategory(db: Db, input: CategoryInput, isNew: boolean): Promise<void> {
  const v = [key(input.key), text(input.th, 'กรุณากรอกชื่อภาษาไทย'), text(input.en, 'กรุณากรอกชื่อภาษาอังกฤษ'), input.multiBrand === true];
  if (isNew) {
    await db.query(`insert into categories (key, name_th, name_en, multi_brand, sort) values ($1, $2, $3, $4, ${nextSort('categories')})`, v);
    return;
  }
  const r = await db.query('update categories set name_th = $2, name_en = $3, multi_brand = $4 where key = $1', v);
  if (r.rowCount === 0) throw new InputError('ไม่พบหมวดนี้ อาจถูกลบไปแล้ว');
}

export async function deleteCategory(db: Db, k: string): Promise<void> {
  await db.query('delete from categories where key = $1', [k]);
}

export async function listBrands(db: Db): Promise<BrandRow[]> {
  const r = await db.query(
    `select b.id::int as id, b.name, count(p.id)::int as n
       from brands b left join products p on p.brand_id = b.id
      group by b.id order by b.name`,
  );
  return r.rows.map((x) => ({ id: x.id, name: x.name, count: x.n }));
}

export async function saveBrand(db: Db, id: number | null, name: string): Promise<void> {
  const n = text(name, 'กรุณากรอกชื่อแบรนด์', 80);
  if (id === null) {
    await db.query('insert into brands (name) values ($1)', [n]);
    return;
  }
  if (!Number.isInteger(id)) throw new InputError('ไม่พบแบรนด์นี้');
  const r = await db.query('update brands set name = $2 where id = $1', [id, n]);
  if (r.rowCount === 0) throw new InputError('ไม่พบแบรนด์นี้ อาจถูกลบไปแล้ว');
}

export async function deleteBrand(db: Db, id: number): Promise<void> {
  if (!Number.isInteger(id)) throw new InputError('ไม่พบแบรนด์นี้');
  await db.query('delete from brands where id = $1', [id]);
}

export async function listMaterials(db: Db): Promise<MaterialRow[]> {
  const r = await db.query(
    `select m.key, m.name_th, m.name_en, count(p.id)::int as n
       from materials m left join products p on p.material_key = m.key
      group by m.key order by m.sort, m.key`,
  );
  return r.rows.map((x) => ({ key: x.key, name: { th: x.name_th, en: x.name_en }, count: x.n }));
}

export async function saveMaterial(db: Db, input: MaterialInput, isNew: boolean): Promise<void> {
  const v = [key(input.key), text(input.th, 'กรุณากรอกชื่อภาษาไทย'), text(input.en, 'กรุณากรอกชื่อภาษาอังกฤษ')];
  if (isNew) {
    await db.query(`insert into materials (key, name_th, name_en, sort) values ($1, $2, $3, ${nextSort('materials')})`, v);
    return;
  }
  const r = await db.query('update materials set name_th = $2, name_en = $3 where key = $1', v);
  if (r.rowCount === 0) throw new InputError('ไม่พบวัสดุนี้ อาจถูกลบไปแล้ว');
}

export async function deleteMaterial(db: Db, k: string): Promise<void> {
  await db.query('delete from materials where key = $1', [k]);
}
```

(`nextSort` interpolates a fixed table name written in this file, never user input.)

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm run check:db`
Expected: `ผ่าน: ฐานข้อมูล`

- [ ] **Step 5: Gates, commit and push**

```bash
npx tsc --noEmit 2>&1 | grep -v '\.next/types'
npm run check:db && npm run check:filter && npm run check:search && npm run build
git add lib/server/taxonomy.ts scripts/check-db.mjs
git commit -m "feat: add categories, brands and materials data layer"
git push
```

---

### Task 5: Image uploads and the `/uploads/` route

**Files:**
- Create: `lib/server/uploads.ts`, `app/admin/(panel)/upload-action.ts`, `app/uploads/[...path]/route.ts`
- Modify: `scripts/check-db.mjs`

**Interfaces:**
- Produces from `lib/server/uploads.ts`: `MAX_IMAGE = 5 * 1024 * 1024`, `type UploadResult = { ok: true; url: string } | { ok: false; error: string }`, `imageExt(bytes: Uint8Array): 'jpg' | 'png' | 'webp' | null`, `newName(ext: string, now?: Date): string` (`YYYY/MM/<24 hex>.<ext>`), `resolveInside(root: string, parts: string[]): string | null`, `TYPES: Record<string, string>`.
- Produces from `app/admin/(panel)/upload-action.ts`: `uploadImageAction(form: FormData): Promise<UploadResult>` (field name `file`, URL like `/uploads/2026/10/<hex>.webp`).

- [ ] **Step 1: Write the failing test**

Add to the imports of `scripts/check-db.mjs`:

```js
import { imageExt, newName, resolveInside } from '../lib/server/uploads.ts';
```

Insert before `console.log('ผ่าน: ฐานข้อมูล');`:

```js
  // ── อัปโหลด (Task 5) ──
  const bytes = (...xs) => new Uint8Array([...xs, ...new Array(16).fill(0)]);
  const ascii = (s) => new Uint8Array([...Buffer.from(s), ...new Array(16).fill(0)]);
  assert.equal(imageExt(bytes(0xff, 0xd8, 0xff, 0xe0)), 'jpg');
  assert.equal(imageExt(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), 'png');
  assert.equal(imageExt(ascii('RIFF\0\0\0\0WEBPVP8 ')), 'webp');
  // ชื่อไฟล์ .jpg แต่ข้างในเป็น SVG หรือ HTML ต้องไม่ผ่าน
  assert.equal(imageExt(ascii('<svg xmlns="http://www.w3.org/2000/svg">')), null);
  assert.equal(imageExt(ascii('<!doctype html><script>')), null);
  assert.equal(imageExt(new Uint8Array(0)), null);
  assert.match(newName('webp', new Date(2026, 9, 15)), /^2026\/10\/[0-9a-f]{24}\.webp$/);
  assert.equal(resolveInside('/srv/up', ['2026', '10', 'a.webp']), '/srv/up/2026/10/a.webp');
  assert.equal(resolveInside('/srv/up', ['..', 'etc', 'passwd']), null);
  assert.equal(resolveInside('/srv/up', ['2026', '..', '..', 'x']), null);
  assert.equal(resolveInside('/srv/up', ['..', 'up-evil', 'x']), null);
  assert.equal(resolveInside('/srv/up', []), null);
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run check:db`
Expected: FAIL with `Cannot find module` for `lib/server/uploads.ts`.

- [ ] **Step 3: Write the module**

Create `lib/server/uploads.ts`:

```ts
// ตรวจไฟล์อัปโหลดและหา path ปลอดภัย · import แค่ node: เพื่อให้ scripts/check-db.mjs รันได้ตรง ๆ
import { randomBytes } from 'node:crypto';
import path from 'node:path';

export const MAX_IMAGE = 5 * 1024 * 1024;
export type UploadResult = { ok: true; url: string } | { ok: false; error: string };
export const TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };

// ดูชนิดจากไบต์แรกของไฟล์ ไม่เชื่อนามสกุลหรือ type ที่เบราว์เซอร์ส่งมา
export function imageExt(b: Uint8Array): 'jpg' | 'png' | 'webp' | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b[0] === 0x89 && ascii(1, 4) === 'PNG') return 'png';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp';
  return null;
}

// ตั้งชื่อใหม่แบบสุ่ม ไม่ใช้ชื่อไฟล์จากผู้ใช้ · แยกโฟลเดอร์ตามปีและเดือน
export function newName(ext: string, now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}/${month}/${randomBytes(12).toString('hex')}.${ext}`;
}

// path จาก URL ต้องอยู่ใต้ root เท่านั้น ไม่งั้นได้ null
export function resolveInside(root: string, parts: string[]): string | null {
  if (parts.length === 0) return null;
  const base = path.resolve(root);
  const full = path.resolve(base, ...parts);
  return full.startsWith(base + path.sep) ? full : null;
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm run check:db`
Expected: `ผ่าน: ฐานข้อมูล`

- [ ] **Step 5: Write the action and the route**

Create `app/admin/(panel)/upload-action.ts`:

```ts
'use server';

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { requireAdmin } from '@/lib/admin';
import { MAX_IMAGE, imageExt, newName, type UploadResult } from '@/lib/server/uploads';

// อัปโหลดรูปทีละไฟล์ไปเก็บใน UPLOAD_DIR · คืน URL ใต้ /uploads/ ให้ฟอร์มเก็บลง DB ตอนกดบันทึก
export async function uploadImageAction(form: FormData): Promise<UploadResult> {
  await requireAdmin();
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'ไม่พบไฟล์' };
  if (file.size > MAX_IMAGE) return { ok: false, error: 'ไฟล์ใหญ่เกิน 5 MB' };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = imageExt(bytes);
  if (!ext) return { ok: false, error: 'รับเฉพาะไฟล์ JPG, PNG หรือ WebP' };
  const root = process.env.UPLOAD_DIR;
  if (!root) throw new Error('ยังไม่ได้ตั้ง UPLOAD_DIR ใน .env');
  const name = newName(ext);
  const full = path.join(root, name);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, bytes);
  return { ok: true, url: `/uploads/${name}` };
}
```

Create `app/uploads/[...path]/route.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { TYPES, resolveInside } from '@/lib/server/uploads';

// ส่งไฟล์ที่อัปโหลดจาก UPLOAD_DIR · next start ไม่ส่งไฟล์ที่เพิ่มเข้า public/ หลัง build จึงต้องมี route นี้
// บนเครื่องจริงให้ nginx ส่งโฟลเดอร์นี้ตรงได้ route นี้เป็นทางสำรองและใช้ตอนพัฒนา
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  const root = process.env.UPLOAD_DIR;
  const file = root ? resolveInside(root, parts) : null;
  const type = TYPES[parts.at(-1)?.split('.').pop() ?? ''];
  if (!file || !type) return new Response('Not found', { status: 404 });
  try {
    return new Response(new Uint8Array(await readFile(file)), {
      headers: {
        'content-type': type,
        'cache-control': 'public, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
```

- [ ] **Step 6: Verify the route against the dev server**

```bash
UP=$(grep '^UPLOAD_DIR=' .env | cut -d= -f2)
mkdir -p "$UP/2026/10" && cp public/media/scenes/about-hero.webp "$UP/2026/10/check.webp"
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' http://localhost:4100/uploads/2026/10/check.webp
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:4100/uploads/..%2F..%2F..%2Fetc%2Fpasswd'
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:4100/uploads/%2e%2e/%2e%2e/etc/hosts'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4100/uploads/2026/10/missing.webp
rm "$UP/2026/10/check.webp"
```
Expected: `200 image/webp`, then `404`, `404`, `404`. (`rm` removes only the test copy this step created.)

- [ ] **Step 7: Gates, commit and push**

```bash
npx tsc --noEmit 2>&1 | grep -v '\.next/types'
npm run check:db && npm run check:filter && npm run check:search && npm run build
git add lib/server/uploads.ts 'app/admin/(panel)/upload-action.ts' 'app/uploads/[...path]/route.ts' scripts/check-db.mjs
git commit -m "feat: add image upload action and serve uploads from outside the build"
git push
```

---
### Task 6: Products admin on real data, with the shared admin shell

**Files:**
- Create: `lib/server/products.ts`, `app/admin/(panel)/products/actions.ts`, `components/admin/AdminShell.tsx`, `components/admin/ImageField.tsx`
- Rewrite: `components/admin/ProductsAdmin.tsx`
- Modify: `app/admin/(panel)/layout.tsx`, `app/admin/(panel)/products/page.tsx`, `components/Announcement.tsx`, `scripts/check-db.mjs`

**Interfaces:**
- Consumes: `adminAction`, `requireAdmin`, `Result` (Task 3); `listCategories`, `listBrands`, `listMaterials`, `CategoryRow`, `BrandRow`, `MaterialRow` (Task 4); `uploadImageAction`, `UploadResult` (Task 5); `logoutAction` (Task 3); class strings from `components/admin/ui.ts` (Task 3).
- Produces from `lib/server/products.ts`: `type AdminProduct = { id: number; slug: string; category: string; brandId: number; brand: string; material: string; series: string; th: string; en: string; descTh: string; descEn: string; specs: string; images: string[]; published: boolean; featured: boolean; updated: string }`, `type ProductInput = Omit<AdminProduct, 'id' | 'brand' | 'updated'>`, `parseSpecs(text: string): { label: string; value: string }[]`, `slugFrom(en: string): string`, `listAdmin(db): Promise<AdminProduct[]>`, `saveProduct(db, id: number | null, input: ProductInput): Promise<number>`, `deleteProduct(db, id: number)`, `setPublished(db, id: number, published: boolean)`.
- Produces from `actions.ts`: `saveProductAction(id, input)`, `deleteProductAction(id)`, `setPublishedAction(id, published)`, all `Promise<Result>`.
- Produces: `<AdminShell name>` wraps every page in `app/admin/(panel)/`; pages render only their own content. `<ImageField value onChange multiple?>`.

- [ ] **Step 1: Write the failing test**

Add to the imports of `scripts/check-db.mjs`:

```js
import * as prod from '../lib/server/products.ts';
```

Insert before `console.log('ผ่าน: ฐานข้อมูล');`:

```js
  // ── สินค้าหลังบ้าน (Task 6) ──
  assert.deepEqual(prod.parseSpecs('สี: โครเมียม (Chrome)\n\n  ขนาด : 20 x 30 ซม. '), [
    { label: 'สี', value: 'โครเมียม (Chrome)' },
    { label: 'ขนาด', value: '20 x 30 ซม.' },
  ]);
  assert.throws(() => prod.parseSpecs('ไม่มีโคลอน'), { name: 'InputError' });
  assert.equal(prod.slugFrom('  Elate Touchless Pull-down!  '), 'elate-touchless-pull-down');
  assert.equal(prod.slugFrom('ก๊อกน้ำ'), '');

  const all = await prod.listAdmin(c);
  assert.equal(all.length, products.length);
  const elate = all.find((p) => p.slug === 'elate-13963t-c4');
  assert.equal(elate.brand, 'KOHLER');
  assert.ok(elate.specs.includes(': '), 'สเปกแปลงเป็นข้อความบรรทัดละข้อ');

  const draft = {
    slug: '', category: 'sink', brandId: elate.brandId, material: 'stainless', series: 'Test',
    th: 'ซิงก์ทดสอบ', en: 'Test Sink 90', descTh: '', descEn: '', specs: 'ขนาด: 90 ซม.',
    images: ['/uploads/2026/10/a.webp'], published: false, featured: false,
  };
  const id = await prod.saveProduct(c, null, draft);
  let row = (await prod.listAdmin(c)).find((p) => p.id === id);
  assert.equal(row.slug, 'test-sink-90', 'slug ว่าง = สร้างจากชื่ออังกฤษ');
  assert.equal(row.published, false);
  // แก้แล้ว scenes และราคาเดิมต้องไม่หาย
  await c.query("update products set scenes = '{/media/scenes/x.webp}', price_th = 'ทดสอบ' where id = $1", [id]);
  await prod.saveProduct(c, id, { ...draft, slug: 'test-sink-90', th: 'ซิงก์ทดสอบ 2' });
  const raw = (await c.query('select name_th, scenes, price_th from products where id = $1', [id])).rows[0];
  assert.deepEqual(raw, { name_th: 'ซิงก์ทดสอบ 2', scenes: ['/media/scenes/x.webp'], price_th: 'ทดสอบ' });
  await prod.setPublished(c, id, true);
  assert.equal((await prod.listAdmin(c)).find((p) => p.id === id).published, true);
  // ข้อมูลผิด
  await assert.rejects(prod.saveProduct(c, null, { ...draft, th: ' ' }), { name: 'InputError' });
  await assert.rejects(prod.saveProduct(c, null, { ...draft, category: 'nope' }), /ไม่พบหมวด/);
  await assert.rejects(prod.saveProduct(c, null, { ...draft, brandId: 999999 }), /ไม่พบแบรนด์/);
  await assert.rejects(prod.saveProduct(c, null, { ...draft, material: 'gold' }), /ไม่พบวัสดุ/);
  await assert.rejects(prod.saveProduct(c, null, { ...draft, slug: 'Bad Slug' }), { name: 'InputError' });
  await assert.rejects(prod.saveProduct(c, null, { ...draft, images: ['javascript:alert(1)'] }), { name: 'InputError' });
  await assert.rejects(prod.saveProduct(c, null, { ...draft, images: ['/uploads/../../etc/passwd'] }), { name: 'InputError' });
  await assert.rejects(prod.saveProduct(c, null, { ...draft, slug: 'test-sink-90' }), (e) => e.code === '23505');
  // แท็บอื่นลบไปแล้ว: แก้ไม่ได้ และไม่สร้างใหม่
  await prod.deleteProduct(c, id);
  await assert.rejects(prod.saveProduct(c, id, draft), /ไม่พบสินค้านี้/);
  await assert.rejects(prod.setPublished(c, id, true), /ไม่พบสินค้านี้/);
  assert.equal((await prod.listAdmin(c)).length, products.length);
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run check:db`
Expected: FAIL with `Cannot find module` for `lib/server/products.ts`.

- [ ] **Step 3: Write the data module**

Create `lib/server/products.ts`:

```ts
// สินค้า: เขียนจากหลังบ้าน (Task 6) และอ่านให้หน้าเว็บ (Task 8)
// import แค่ type เพื่อให้ scripts/check-db.mjs รันไฟล์นี้ด้วย Node ได้ตรง ๆ

type Db = { query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }> };

export class InputError extends Error {
  name = 'InputError';
}

export type AdminProduct = {
  id: number;
  slug: string;
  category: string;
  brandId: number;
  brand: string;
  material: string; // '' = ไม่ระบุ
  series: string;
  th: string;
  en: string;
  descTh: string;
  descEn: string;
  specs: string; // บรรทัดละข้อ "ชื่อ: ค่า"
  images: string[];
  published: boolean;
  featured: boolean;
  updated: string; // YYYY-MM-DD
};
export type ProductInput = Omit<AdminProduct, 'id' | 'brand' | 'updated'>;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// รูปต้องเป็นไฟล์ในเว็บเอง: ของเดิมใน public/media หรือที่อัปโหลดใน /uploads
const okImage = (s: unknown) => typeof s === 'string' && /^\/(media|uploads)\/[\w./-]+$/.test(s) && !s.includes('..');
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const SELECT = `select p.*, p.id::int as pid, p.brand_id::int as bid, b.name as brand_name
                  from products p join brands b on b.id = p.brand_id`;

export function parseSpecs(text: string): { label: string; value: string }[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l, i) => {
      const at = l.indexOf(':');
      if (at <= 0) throw new InputError(`สเปกบรรทัดที่ ${i + 1} ต้องเป็นแบบ ชื่อ: ค่า`);
      return { label: l.slice(0, at).trim(), value: l.slice(at + 1).trim() };
    });
}

export function slugFrom(en: string): string {
  return en.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80).replace(/^-+|-+$/g, '');
}

export async function listAdmin(db: Db): Promise<AdminProduct[]> {
  const r = await db.query(`${SELECT} order by p.updated_at desc, p.id desc`);
  return r.rows.map((x) => ({
    id: x.pid,
    slug: x.slug,
    category: x.category_key,
    brandId: x.bid,
    brand: x.brand_name,
    material: x.material_key ?? '',
    series: x.series,
    th: x.name_th,
    en: x.name_en,
    descTh: x.desc_th,
    descEn: x.desc_en,
    specs: x.specs.map((s: { label: string; value: string }) => `${s.label}: ${s.value}`).join('\n'),
    images: x.images,
    published: x.published,
    featured: x.featured,
    updated: (x.updated_at as Date).toISOString().slice(0, 10),
  }));
}

// คืน id · ไม่แตะราคาและภาพบรรยากาศ (scenes) เพราะยังไม่มีช่องในฟอร์ม
export async function saveProduct(db: Db, id: number | null, input: ProductInput): Promise<number> {
  if (id !== null && !Number.isInteger(id)) throw new InputError('ไม่พบสินค้านี้ อาจถูกลบไปแล้ว');
  const th = str(input.th);
  if (!th) throw new InputError('กรุณากรอกชื่อสินค้าภาษาไทย');
  const en = str(input.en);
  const slug = str(input.slug) || slugFrom(en) || `product-${Date.now().toString(36)}`;
  if (!SLUG.test(slug)) throw new InputError('slug ใช้ a-z ตัวเลข และ - เท่านั้น');
  if (!Number.isInteger(input.brandId)) throw new InputError('กรุณาเลือกแบรนด์');
  const images = Array.isArray(input.images) ? input.images : [];
  if (!images.every(okImage)) throw new InputError('ที่อยู่รูปไม่ถูกต้อง');
  const specs = parseSpecs(str(input.specs));
  const material = str(input.material) || null;
  const ref = await db.query(
    `select exists(select 1 from categories where key = $1) as c,
            exists(select 1 from brands where id = $2) as b,
            ($3::text is null or exists(select 1 from materials where key = $3::text)) as m`,
    [str(input.category), input.brandId, material],
  );
  if (!ref.rows[0].c) throw new InputError('ไม่พบหมวดนี้');
  if (!ref.rows[0].b) throw new InputError('ไม่พบแบรนด์นี้');
  if (!ref.rows[0].m) throw new InputError('ไม่พบวัสดุนี้');
  const v = [
    slug, str(input.category), input.brandId, material, str(input.series), th, en || th,
    str(input.descTh), str(input.descEn), JSON.stringify(specs), images, input.featured === true, input.published === true,
  ];
  if (id === null) {
    const r = await db.query(
      `insert into products (slug, category_key, brand_id, material_key, series, name_th, name_en, desc_th, desc_en,
         specs, images, featured, published, sort)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, (select coalesce(max(sort), 0) + 1 from products))
       returning id::int as id`,
      v,
    );
    return r.rows[0].id;
  }
  const r = await db.query(
    `update products set slug = $1, category_key = $2, brand_id = $3, material_key = $4, series = $5, name_th = $6,
       name_en = $7, desc_th = $8, desc_en = $9, specs = $10::jsonb, images = $11, featured = $12, published = $13,
       updated_at = now()
     where id = $14`,
    [...v, id],
  );
  if (r.rowCount === 0) throw new InputError('ไม่พบสินค้านี้ อาจถูกลบไปแล้ว');
  return id;
}

export async function deleteProduct(db: Db, id: number): Promise<void> {
  if (!Number.isInteger(id)) throw new InputError('ไม่พบสินค้านี้');
  await db.query('delete from products where id = $1', [id]);
}

export async function setPublished(db: Db, id: number, published: boolean): Promise<void> {
  if (!Number.isInteger(id)) throw new InputError('ไม่พบสินค้านี้ อาจถูกลบไปแล้ว');
  const r = await db.query('update products set published = $2, updated_at = now() where id = $1', [id, published === true]);
  if (r.rowCount === 0) throw new InputError('ไม่พบสินค้านี้ อาจถูกลบไปแล้ว');
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm run check:db`
Expected: `ผ่าน: ฐานข้อมูล`

- [ ] **Step 5: Write the actions, the shell and the image field**

Create `app/admin/(panel)/products/actions.ts`:

```ts
'use server';

import { db } from '@/lib/db';
import { adminAction } from '@/lib/admin';
import { deleteProduct, saveProduct, setPublished, type ProductInput } from '@/lib/server/products';

export async function saveProductAction(id: number | null, input: ProductInput) {
  return adminAction(() => saveProduct(db, id, input));
}
export async function deleteProductAction(id: number) {
  return adminAction(() => deleteProduct(db, id));
}
export async function setPublishedAction(id: number, published: boolean) {
  return adminAction(() => setPublished(db, id, published));
}
```

Create `components/admin/AdminShell.tsx` (background, sidebar and opacity slider moved out of the mockup so every admin page shares them):

```tsx
'use client';

// โครงหลังบ้านธีมกระจก iOS 26: พื้นหลังเบลอ เมนูซ้าย ปรับความทึบกระจก ออกจากระบบ
// ทับโครงเว็บด้วย fixed overlay แทนการแยก layout ของเว็บ (ยกมาจาก mockup ProductsAdmin 2026-10-14)
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/admin/login/actions';
import { ghost } from './ui';

const GLASS_KEY = 'admin:glass';
// ต่ำสุด 0.7 คิดจากกรณีแย่สุด: พื้นหลังดำสนิท (ภาพ 70% ทับ warm-200) แล้วกระจกขาว 0.7 ทับ ได้พื้นราว rgb(200,199,198)
// stone-600 บนพื้นนี้ = 4.5:1 พอดี จึงอ่านผ่านทุกภาพพื้นหลัง · ต่ำกว่านี้ต้องวัดจาก pixel ของภาพจริง
const GLASS_MIN = 0.7;
const GLASS_MAX = 0.95;
const MENU = [
  { href: '/admin/products/', label: 'สินค้า' },
  { href: '/admin/categories/', label: 'หมวด แบรนด์ วัสดุ' },
  { href: '/admin/announcement/', label: 'ประกาศ' },
];
// ทำในแผนที่ 2
const LATER = ['บทความ', 'ผลงาน', 'แคตตาล็อก'];

function readGlass() {
  try {
    const v = Number(localStorage.getItem(GLASS_KEY));
    return v >= GLASS_MIN && v <= GLASS_MAX ? v : 0.8;
  } catch {
    return 0.8;
  }
}

export default function AdminShell({ name, children }: { name: string; children: React.ReactNode }) {
  const path = usePathname();
  const [glass, setGlass] = useState(0.8);
  useEffect(() => setGlass(readGlass()), []);
  useEffect(() => {
    try {
      localStorage.setItem(GLASS_KEY, String(glass));
    } catch {}
  }, [glass]);

  return (
    <div
      data-lenis-prevent
      className="fixed inset-0 z-[70] overflow-y-auto bg-warm-200 font-normal text-ink"
      style={{ '--glass': glass } as React.CSSProperties}
    >
      {/* พื้นหลังให้กระจกมีอะไรให้เบลอ: ภาพครัวจางกับแสงอุ่น 2 ดวง */}
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <img src="/media/scenes/about-hero.webp" alt="" className="h-full w-full object-cover opacity-70" />
        <div className="absolute -left-24 top-1/4 h-96 w-96 rounded-full bg-amber-200/60 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-[28rem] w-[28rem] rounded-full bg-stone-300/70 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-full max-w-7xl gap-4 p-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6 lg:p-6">
        <aside className="glass flex flex-col gap-6 rounded-[28px] p-5 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <div>
            <p className="text-lg font-light tracking-[0.3em]">ITERRA</p>
            <p className="mt-1 truncate text-xs text-stone-600">หลังบ้าน · {name}</p>
          </div>
          <nav aria-label="เมนูหลังบ้าน">
            <ul className="flex gap-1 overflow-x-auto lg:flex-col">
              {MENU.map((m) => {
                const on = path.startsWith(m.href);
                return (
                  <li key={m.href}>
                    <Link
                      href={m.href}
                      aria-current={on ? 'page' : undefined}
                      className={`flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-sm ${
                        on ? 'bg-ink text-paper' : 'text-ink hover:bg-white/70'
                      }`}
                    >
                      {m.label}
                    </Link>
                  </li>
                );
              })}
              {LATER.map((x) => (
                <li key={x}>
                  <span className="flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-sm text-stone-600">{x}</span>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-auto space-y-4">
            <label className="block text-sm">
              ความทึบของกระจก <span className="text-stone-600">{Math.round(glass * 100)}%</span>
              <input
                type="range"
                min={GLASS_MIN}
                max={GLASS_MAX}
                step={0.05}
                value={glass}
                onChange={(e) => setGlass(Number(e.target.value))}
                className="mt-2 block w-full accent-ink"
              />
            </label>
            <div className="flex flex-wrap gap-1">
              <Link href="/" target="_blank" className={ghost}>
                เปิดหน้าเว็บ
              </Link>
              <form action={logoutAction}>
                <button type="submit" className={ghost}>
                  ออกจากระบบ
                </button>
              </form>
            </div>
          </div>
        </aside>

        <div className="space-y-4 lg:space-y-6">{children}</div>
      </div>
    </div>
  );
}
```

Create `components/admin/ImageField.tsx`:

```tsx
'use client';

// รายการรูป: รูปแรกคือรูปหลัก · อัปโหลดทีละไฟล์ ไฟล์ขึ้น server ทันที แต่ลง DB ตอนกดบันทึกฟอร์ม
import { useState } from 'react';
import { uploadImageAction } from '@/app/admin/(panel)/upload-action';
import { danger, ghost } from './ui';

export default function ImageField({
  value,
  onChange,
  multiple = true,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  multiple?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setError('ไฟล์ใหญ่เกิน 5 MB');
    setBusy(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    const r = await uploadImageAction(fd);
    setBusy(false);
    if (r.ok) onChange(multiple ? [...value, r.url] : [r.url]);
    else setError(r.error);
  }

  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-3">
          {value.map((src, i) => (
            <li key={src} className="text-center">
              <img src={src} alt={i === 0 ? 'รูปหลัก' : `รูปที่ ${i + 1}`} className="h-24 w-24 rounded-xl bg-white object-contain" />
              <button type="button" className={`${ghost} ${danger} text-xs`} onClick={() => onChange(value.filter((x) => x !== src))}>
                ลบรูป
              </button>
            </li>
          ))}
        </ul>
      )}
      {(multiple || value.length === 0) && (
        <label className="block cursor-pointer rounded-2xl border border-dashed border-warm-500 bg-white/40 px-6 py-6 text-center text-sm transition focus-within:border-ink hover:border-ink">
          {busy ? 'กำลังอัปโหลด' : 'กดเพื่อเลือกรูป'}
          <span className="mt-1 block text-xs text-stone-600">JPG, PNG หรือ WebP ไม่เกิน 5 MB</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={pick} />
        </label>
      )}
      <p role="alert" className={`min-h-5 pt-1 text-sm ${danger}`}>
        {error}
      </p>
    </div>
  );
}
```

Replace the body of `app/admin/(panel)/layout.tsx` so every panel page gets the shell:

```tsx
import type { Metadata } from 'next';
import AdminShell from '@/components/admin/AdminShell';
import { requireAdmin } from '@/lib/admin';

// ทุกหน้าใน (panel) ต้องเข้าสู่ระบบ · หน้าในกลุ่มนี้เรียก requireAdmin() ซ้ำเองด้วย เพราะ layout กับ page render พร้อมกัน
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return <AdminShell name={admin.name}>{children}</AdminShell>;
}
```

Replace `app/admin/(panel)/products/page.tsx` with:

```tsx
import type { Metadata } from 'next';
import ProductsAdmin from '@/components/admin/ProductsAdmin';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { listAdmin } from '@/lib/server/products';
import { listBrands, listCategories, listMaterials } from '@/lib/server/taxonomy';

export const metadata: Metadata = { title: 'จัดการสินค้า' };

export default async function AdminProductsPage() {
  await requireAdmin();
  const [products, categories, brands, materials] = await Promise.all([
    listAdmin(db),
    listCategories(db),
    listBrands(db),
    listMaterials(db),
  ]);
  return <ProductsAdmin products={products} categories={categories} brands={brands} materials={materials} />;
}
```

- [ ] **Step 6: Rewrite `components/admin/ProductsAdmin.tsx`**

Replace the whole file with:

```tsx
'use client';

// หลังบ้าน: จัดการสินค้า · ข้อมูลมาจาก DB ทาง props · แก้ผ่าน Server Functions แล้ว router.refresh() ดึงรายการใหม่
// ข้อความเป็นภาษาไทยอย่างเดียวตาม design.md ส่วน Back office · โครงและพื้นหลังอยู่ใน AdminShell
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Result } from '@/lib/admin';
import type { AdminProduct, ProductInput } from '@/lib/server/products';
import type { BrandRow, CategoryRow, MaterialRow } from '@/lib/server/taxonomy';
import { deleteProductAction, saveProductAction, setPublishedAction } from '@/app/admin/(panel)/products/actions';
import ImageField from './ImageField';
import { danger, dangerBorder, dangerSolid, ghost, input, label, pill, solid } from './ui';

type Draft = Omit<ProductInput, 'brandId'> & { id: number | null; brandId: string };
type Props = { products: AdminProduct[]; categories: CategoryRow[]; brands: BrandRow[]; materials: MaterialRow[] };

const blank = (category: string): Draft => ({
  id: null, slug: '', category, brandId: '', material: '', series: '', th: '', en: '', descTh: '', descEn: '',
  specs: '', images: [], published: true, featured: false,
});
const toDraft = ({ brand: _b, updated: _u, ...p }: AdminProduct): Draft => ({ ...p, brandId: String(p.brandId) });

export default function ProductsAdmin({ products, categories, brands, materials }: Props) {
  const router = useRouter();
  const [cat, setCat] = useState('all');
  const [brand, setBrand] = useState('');
  const [q, setQ] = useState('');
  const [form, setForm] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [del, setDel] = useState<AdminProduct | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLDialogElement>(null);
  const delRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (form) formRef.current?.showModal();
    else formRef.current?.close();
  }, [form]);
  useEffect(() => {
    if (del) delRef.current?.showModal();
    else delRef.current?.close();
  }, [del]);

  const catName = (k: string) => categories.find((c) => c.key === k)?.name.th ?? k;
  const firstCat = categories[0]?.key ?? '';
  const shown = products
    .filter((p) => (cat === 'all' || p.category === cat) && (!brand || String(p.brandId) === brand))
    .filter((p) => !q || `${p.th} ${p.en} ${p.series} ${p.brand}`.toLowerCase().includes(q.toLowerCase()));
  const set = (patch: Partial<Draft>) => form && setForm({ ...form, ...patch });
  const multiBrand = form && categories.find((c) => c.key === form.category)?.multiBrand;
  const open = (d: Draft) => {
    setErrors({});
    setFormError('');
    setForm(d);
  };

  // คืนข้อความผิด หรือ null ถ้าสำเร็จ
  async function run(fn: () => Promise<Result>, done: string): Promise<string | null> {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (!r.ok) return r.error;
    setMsg(done);
    router.refresh();
    return null;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const err: Record<string, string> = {};
    // เรียงตามลำดับช่องในฟอร์ม focus จะได้ไปช่องแรกที่ผิด
    if (!form.brandId) err.brandId = 'กรุณาเลือกแบรนด์';
    if (!form.th.trim()) err.th = 'กรุณากรอกชื่อสินค้าภาษาไทย';
    setErrors(err);
    if (Object.keys(err).length) {
      formRef.current?.querySelector<HTMLElement>(`[name="${Object.keys(err)[0]}"]`)?.focus();
      return;
    }
    const { id, ...rest } = form;
    const error = await run(() => saveProductAction(id, { ...rest, brandId: Number(rest.brandId) }), `บันทึก ${form.th} แล้ว`);
    if (error) setFormError(error);
    else setForm(null);
  }

  return (
    <>
      <header className="glass flex flex-wrap items-end justify-between gap-4 rounded-[28px] p-5 md:p-6">
        <div>
          <h1 className="text-2xl font-extralight tracking-wide md:text-3xl">สินค้า</h1>
          <p className="mt-1 text-sm text-stone-600">{products.length} รายการ</p>
        </div>
        <button type="button" className={solid} onClick={() => open(blank(cat === 'all' ? firstCat : cat))}>
          เพิ่มสินค้า
        </button>
      </header>

      <div role="status" className="min-h-6 px-2 text-sm text-ink">
        {msg}
      </div>

      <ul className="flex flex-wrap gap-2" aria-label="หมวดสินค้า">
        {['all', ...categories.map((c) => c.key)].map((c) => (
          <li key={c}>
            <button type="button" aria-pressed={cat === c} className={pill(cat === c)} onClick={() => setCat(c)}>
              {c === 'all' ? 'ทั้งหมด' : catName(c)}
              <span className={cat === c ? 'text-warm-300' : 'text-stone-600'}>
                {c === 'all' ? products.length : products.filter((p) => p.category === c).length}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <section className="glass rounded-[28px] p-3 md:p-4">
        <div className="flex flex-wrap gap-3 p-2">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาชื่อ ซีรีส์ หรือแบรนด์"
            aria-label="ค้นหาสินค้า"
            className={`${input} max-w-xs flex-1`}
          />
          <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="กรองตามแบรนด์" className={`${input.replace('w-full ', '')} w-48`}>
            <option value="">ทุกแบรนด์</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {shown.length === 0 ? (
          <div className="m-2 rounded-2xl border border-dashed border-warm-500 px-6 py-14 text-center">
            <p className="text-sm">ยังไม่มีสินค้าในหมวดนี้</p>
            <button type="button" className={`${solid} mt-5`} onClick={() => open(blank(cat === 'all' ? firstCat : cat))}>
              เพิ่มสินค้า
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-white/70">
            {shown.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-4 rounded-2xl p-2 transition hover:bg-white/50 md:flex-nowrap">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white">
                  {p.images[0] && <img src={p.images[0]} alt="" className="h-full w-full object-contain" />}
                </div>
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => open(toDraft(p))} className="block max-w-full truncate text-left text-sm hover:underline">
                    {p.th}
                  </button>
                  <p className="truncate text-xs text-stone-600">
                    {catName(p.category)} · {p.brand} {p.series}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs ${p.published ? 'bg-ink text-paper' : 'border border-ink text-ink'}`}>
                  {p.published ? 'เผยแพร่' : 'ซ่อน'}
                </span>
                <span className="hidden w-24 text-xs text-stone-600 md:block">{p.updated}</span>
                <div className="flex">
                  <button type="button" className={ghost} onClick={() => open(toDraft(p))}>
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    className={ghost}
                    disabled={busy}
                    onClick={async () => {
                      const error = await run(
                        () => setPublishedAction(p.id, !p.published),
                        `${p.published ? 'ซ่อน' : 'แสดง'} ${p.th} แล้ว`,
                      );
                      if (error) setMsg(error);
                    }}
                  >
                    {p.published ? 'ซ่อน' : 'แสดง'}
                  </button>
                  <button type="button" className={`${ghost} ${danger}`} onClick={() => setDel(p)}>
                    ลบ
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <dialog
        ref={formRef}
        onClose={() => setForm(null)}
        aria-labelledby="form-title"
        className="glass w-[min(94vw,680px)] rounded-[28px] p-0 text-ink backdrop:bg-ink/30 backdrop:backdrop-blur-sm"
      >
        {form && (
          <form onSubmit={save} noValidate className="space-y-6 p-6">
            <h2 id="form-title" className="text-xl font-light">
              {form.id === null ? 'เพิ่มสินค้า' : `แก้ไข ${form.th}`}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className={label}>
                หมวด (จำเป็น)
                <select value={form.category} onChange={(e) => set({ category: e.target.value })} className={`${input} mt-2`}>
                  {categories.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.name.th}
                    </option>
                  ))}
                </select>
              </label>
              <label className={label}>
                แบรนด์ (จำเป็น)
                <select
                  name="brandId"
                  value={form.brandId}
                  onChange={(e) => set({ brandId: e.target.value })}
                  aria-invalid={!!errors.brandId}
                  aria-describedby="brand-hint"
                  className={`${input} mt-2 ${errors.brandId ? dangerBorder : ''}`}
                >
                  <option value="">เลือกแบรนด์</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <span id="brand-hint" className={`mt-1.5 block text-xs ${errors.brandId ? danger : 'text-stone-600'}`}>
                  {errors.brandId || (multiBrand ? 'หมวดนี้ต้องมีอย่างน้อย 3 แบรนด์บนหน้าเว็บ' : 'เพิ่มแบรนด์ใหม่ได้ที่เมนู หมวด แบรนด์ วัสดุ')}
                </span>
              </label>
              <label className={label}>
                ซีรีส์
                <input value={form.series} onChange={(e) => set({ series: e.target.value })} className={`${input} mt-2`} />
              </label>
              <label className={label}>
                วัสดุ
                <select value={form.material} onChange={(e) => set({ material: e.target.value })} className={`${input} mt-2`}>
                  <option value="">ไม่ระบุ</option>
                  {materials.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.name.th}
                    </option>
                  ))}
                </select>
              </label>
              <label className={label}>
                ไทย: ชื่อสินค้า (จำเป็น)
                <input
                  name="th"
                  value={form.th}
                  onChange={(e) => set({ th: e.target.value })}
                  aria-invalid={!!errors.th}
                  aria-describedby="th-error"
                  className={`${input} mt-2 ${errors.th ? dangerBorder : ''}`}
                />
                {errors.th && (
                  <span id="th-error" className={`mt-1.5 block text-sm ${danger}`}>
                    {errors.th}
                  </span>
                )}
              </label>
              <label className={label}>
                English: ชื่อสินค้า
                <input value={form.en} onChange={(e) => set({ en: e.target.value })} className={`${input} mt-2`} />
              </label>
              <label className={`${label} md:col-span-2`}>
                slug (ส่วนท้ายลิงก์)
                <input value={form.slug} onChange={(e) => set({ slug: e.target.value })} className={`${input} mt-2`} />
                <span className="mt-1.5 block text-xs text-stone-600">เว้นว่างได้ ระบบสร้างจากชื่อภาษาอังกฤษ · ใช้ a-z ตัวเลข และ -</span>
              </label>
              <label className={label}>
                ไทย: รายละเอียด
                <textarea value={form.descTh} onChange={(e) => set({ descTh: e.target.value })} className={`${input} mt-2 min-h-24 py-2.5`} />
              </label>
              <label className={label}>
                English: รายละเอียด
                <textarea value={form.descEn} onChange={(e) => set({ descEn: e.target.value })} className={`${input} mt-2 min-h-24 py-2.5`} />
              </label>
            </div>
            <label className={label}>
              สเปก
              <span className="mt-1 block text-xs text-stone-600">บรรทัดละ 1 ข้อ เช่น วัสดุ: ทองเหลือง</span>
              <textarea value={form.specs} onChange={(e) => set({ specs: e.target.value })} className={`${input} mt-2 min-h-32 py-2.5`} />
            </label>
            <div>
              <p className={label}>รูปสินค้า (รูปแรกคือรูปหลัก)</p>
              <ImageField value={form.images} onChange={(images) => set({ images })} />
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input type="checkbox" checked={form.published} onChange={(e) => set({ published: e.target.checked })} className="h-4 w-4 accent-ink" />
                แสดงบนหน้าเว็บ
              </label>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input type="checkbox" checked={form.featured} onChange={(e) => set({ featured: e.target.checked })} className="h-4 w-4 accent-ink" />
                สินค้าเด่นหน้าแรก
              </label>
            </div>
            <p role="alert" className={`min-h-5 text-sm ${danger}`}>
              {formError}
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button type="button" className={ghost} onClick={() => setForm(null)}>
                ยกเลิก
              </button>
              <button type="submit" className={solid} disabled={busy}>
                {busy ? 'กำลังบันทึก' : 'บันทึก'}
              </button>
            </div>
          </form>
        )}
      </dialog>

      <dialog
        ref={delRef}
        onClose={() => setDel(null)}
        aria-labelledby="del-title"
        className="glass w-[min(92vw,440px)] rounded-[28px] p-6 text-ink backdrop:bg-ink/30"
      >
        {del && (
          <>
            <h2 id="del-title" className="text-lg font-light">
              ลบ {del.th}
            </h2>
            <p className="mt-3 text-sm text-stone-600">สินค้านี้จะหายจากหน้าเว็บ และกู้คืนไม่ได้ ถ้าแค่ไม่อยากให้เห็น ใช้ปุ่มซ่อนแทน</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" autoFocus className={ghost} onClick={() => setDel(null)}>
                ยกเลิก
              </button>
              <button
                type="button"
                className={dangerSolid}
                disabled={busy}
                onClick={async () => {
                  const error = await run(() => deleteProductAction(del.id), `ลบ ${del.th} แล้ว`);
                  if (error) setMsg(error);
                  setDel(null);
                }}
              >
                ลบ
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
```

- [ ] **Step 7: Keep the announcement off admin pages**

The mockup used to call `markSeen` so the entry announcement would not pop over the admin screen; that call is gone with the rewrite. In `components/Announcement.tsx`:

- add `import { usePathname } from 'next/navigation';` below `import Link from 'next/link';`
- below `const ref = useRef<HTMLDialogElement>(null);` add `const pathname = usePathname();`
- replace `    if (!shouldShow(A, store())) return;` with

```tsx
    // หลังบ้านไม่เด้งประกาศ
    if (pathname.startsWith('/admin') || !shouldShow(A, store())) return;
```

- [ ] **Step 8: Verify in the browser**

With the dev server running and logged in as the `.env` admin:
1. `/admin/products/` lists every seeded product, newest edit first. Screenshot.
2. Add a product in category ท็อปหิน with brand KOHLER, Thai name only, upload `public/media/scenes/about-hero.webp` as its image, tick "แสดงบนหน้าเว็บ", save. It appears at the top with slug `product-...` (no English name) and the image loads from `/uploads/...`.
3. Edit it, change the Thai name, save; the list shows the new name.
4. Submit with no brand: focus lands on the brand select and the hint turns red.
5. Hide it, then show it again: the badge flips both times.
6. Open the same product in a second tab, delete it in the first tab, save in the second: the form shows `ไม่พบสินค้านี้ อาจถูกลบไปแล้ว`.
7. On `/` run `sessionStorage.clear()` and reload: the announcement still appears there. Do the same on `/admin/products/`: it never appears.
8. `read_console_messages` with `onlyErrors: true` prints nothing.

- [ ] **Step 9: Prove every action is gated**

```bash
grep -L 'adminAction\|requireAdmin' 'app/admin/(panel)'/**/actions.ts 'app/admin/(panel)/upload-action.ts'
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'Next-Action: 0000000000000000000000000000000000000000' http://localhost:4100/admin/products/
```
Expected: `grep -L` prints nothing (every file uses the gate). The forged POST without a cookie prints `307` (stopped by `proxy.ts`) and `psql -h localhost -p 5433 -d iterra_dev -Atc 'select count(*) from products'` is unchanged.

- [ ] **Step 10: Gates, commit and push**

```bash
npx tsc --noEmit 2>&1 | grep -v '\.next/types'
npm run check:db && npm run check:filter && npm run check:search && npm run build
npm run check:overflow
git add lib/server/products.ts 'app/admin/(panel)' components/admin components/Announcement.tsx scripts/check-db.mjs
git commit -m "feat: run the products admin on the database with uploads and a shared admin shell"
git push
```

---

### Task 7: Categories, brands and materials admin screen

**Files:**
- Create: `app/admin/(panel)/categories/page.tsx`, `app/admin/(panel)/categories/actions.ts`, `components/admin/TaxonomyAdmin.tsx`

**Interfaces:**
- Consumes: everything from `lib/server/taxonomy.ts` (Task 4), `adminAction`, `requireAdmin`, `Result` (Task 3), `AdminShell` via the panel layout (Task 6), class strings from `ui.ts`.
- Produces: `saveCategoryAction(input: CategoryInput, isNew: boolean)`, `deleteCategoryAction(key: string)`, `saveBrandAction(id: number | null, name: string)`, `deleteBrandAction(id: number)`, `saveMaterialAction(input: MaterialInput, isNew: boolean)`, `deleteMaterialAction(key: string)`, all `Promise<Result>`.

- [ ] **Step 1: Write the actions and the page**

Create `app/admin/(panel)/categories/actions.ts`:

```ts
'use server';

import { db } from '@/lib/db';
import { adminAction } from '@/lib/admin';
import * as tax from '@/lib/server/taxonomy';

export async function saveCategoryAction(input: tax.CategoryInput, isNew: boolean) {
  return adminAction(() => tax.saveCategory(db, input, isNew));
}
export async function deleteCategoryAction(key: string) {
  return adminAction(() => tax.deleteCategory(db, key));
}
export async function saveBrandAction(id: number | null, name: string) {
  return adminAction(() => tax.saveBrand(db, id, name));
}
export async function deleteBrandAction(id: number) {
  return adminAction(() => tax.deleteBrand(db, id));
}
export async function saveMaterialAction(input: tax.MaterialInput, isNew: boolean) {
  return adminAction(() => tax.saveMaterial(db, input, isNew));
}
export async function deleteMaterialAction(key: string) {
  return adminAction(() => tax.deleteMaterial(db, key));
}
```

Create `app/admin/(panel)/categories/page.tsx`:

```tsx
import type { Metadata } from 'next';
import TaxonomyAdmin from '@/components/admin/TaxonomyAdmin';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { listBrands, listCategories, listMaterials } from '@/lib/server/taxonomy';

export const metadata: Metadata = { title: 'หมวด แบรนด์ วัสดุ' };

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const [categories, brands, materials] = await Promise.all([listCategories(db), listBrands(db), listMaterials(db)]);
  return <TaxonomyAdmin categories={categories} brands={brands} materials={materials} />;
}
```

- [ ] **Step 2: Write the screen**

Create `components/admin/TaxonomyAdmin.tsx`:

```tsx
'use client';

// หลังบ้าน: หมวด แบรนด์ วัสดุ ในหน้าเดียว · ทั้งสามชุดใช้ Section เดียวกัน ต่างกันแค่ช่องในฟอร์ม
// ลบได้เฉพาะรายการที่ไม่มีสินค้าใช้ (DB บังคับด้วย FK ปุ่มลบปิดไว้ให้เห็นก่อน)
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Result } from '@/lib/admin';
import type { BrandRow, CategoryRow, MaterialRow } from '@/lib/server/taxonomy';
import {
  deleteBrandAction,
  deleteCategoryAction,
  deleteMaterialAction,
  saveBrandAction,
  saveCategoryAction,
  saveMaterialAction,
} from '@/app/admin/(panel)/categories/actions';
import { danger, ghost, input, label, solid } from './ui';

type Values = Record<string, string | boolean>;
type Field = { name: string; label: string; checkbox?: boolean; fixed?: boolean; hint?: string };
type Item = { id: string; title: string; sub: string; count: number; values: Values };

function Section({
  title,
  items,
  fields,
  empty,
  onSave,
  onDelete,
}: {
  title: string;
  items: Item[];
  fields: Field[];
  empty: Values;
  onSave: (v: Values, isNew: boolean) => Promise<Result>;
  onDelete: (id: string) => Promise<Result>;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<{ values: Values; isNew: boolean } | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (form) ref.current?.showModal();
    else ref.current?.close();
  }, [form]);

  const open = (values: Values, isNew: boolean) => {
    setError('');
    setForm({ values, isNew });
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    const r = await onSave(form.values, form.isNew);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setForm(null);
    setMsg(`บันทึก${title}แล้ว`);
    router.refresh();
  }

  async function remove(it: Item) {
    if (!window.confirm(`ลบ${title} ${it.title}`)) return;
    setBusy(true);
    const r = await onDelete(it.id);
    setBusy(false);
    setMsg(r.ok ? `ลบ ${it.title} แล้ว` : r.error);
    if (r.ok) router.refresh();
  }

  return (
    <section className="glass rounded-[28px] p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-light">{title}</h2>
        <button type="button" className={solid} onClick={() => open({ ...empty }, true)}>
          เพิ่ม{title}
        </button>
      </div>
      <p role="status" className="min-h-6 pt-2 text-sm">
        {msg}
      </p>
      <ul className="divide-y divide-white/70">
        {items.map((it) => (
          <li key={it.id} className="flex flex-wrap items-center gap-2 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{it.title}</p>
              <p className="truncate text-xs text-stone-600">
                {it.sub} · สินค้า {it.count} ชิ้น
              </p>
            </div>
            <button type="button" className={ghost} onClick={() => open(it.values, false)}>
              แก้ไข
            </button>
            <button
              type="button"
              className={`${ghost} ${danger}`}
              disabled={busy || it.count > 0}
              title={it.count > 0 ? 'ยังมีสินค้าใช้อยู่ ลบไม่ได้' : undefined}
              onClick={() => remove(it)}
            >
              ลบ
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={ref}
        onClose={() => setForm(null)}
        aria-label={title}
        className="glass w-[min(94vw,480px)] rounded-[28px] p-0 text-ink backdrop:bg-ink/30 backdrop:backdrop-blur-sm"
      >
        {form && (
          <form onSubmit={save} noValidate className="space-y-4 p-6">
            <h3 className="text-lg font-light">{form.isNew ? `เพิ่ม${title}` : `แก้ไข${title}`}</h3>
            {fields.map((f) =>
              f.checkbox ? (
                <label key={f.name} className="flex min-h-11 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.values[f.name] === true}
                    onChange={(e) => setForm({ ...form, values: { ...form.values, [f.name]: e.target.checked } })}
                    className="h-4 w-4 accent-ink"
                  />
                  {f.label}
                </label>
              ) : (
                <label key={f.name} className={label}>
                  {f.label}
                  <input
                    value={String(form.values[f.name] ?? '')}
                    readOnly={f.fixed && !form.isNew}
                    onChange={(e) => setForm({ ...form, values: { ...form.values, [f.name]: e.target.value } })}
                    className={`${input} mt-2 read-only:opacity-60`}
                  />
                  {f.hint && <span className="mt-1.5 block text-xs text-stone-600">{f.hint}</span>}
                </label>
              ),
            )}
            <p role="alert" className={`min-h-5 text-sm ${danger}`}>
              {error}
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className={ghost} onClick={() => setForm(null)}>
                ยกเลิก
              </button>
              <button type="submit" className={solid} disabled={busy}>
                บันทึก
              </button>
            </div>
          </form>
        )}
      </dialog>
    </section>
  );
}

const named = (x: { name: { th: string; en: string } }) => `${x.name.en}`;
const KEY_HINT = 'a-z ตัวเลข และ - ขึ้นต้นด้วยตัวอักษร · ตั้งแล้วแก้ไม่ได้ เพราะใช้ในลิงก์ตัวกรอง';

export default function TaxonomyAdmin({
  categories,
  brands,
  materials,
}: {
  categories: CategoryRow[];
  brands: BrandRow[];
  materials: MaterialRow[];
}) {
  return (
    <>
      <header className="glass rounded-[28px] p-5 md:p-6">
        <h1 className="text-2xl font-extralight tracking-wide md:text-3xl">หมวด แบรนด์ วัสดุ</h1>
        <p className="mt-1 text-sm text-stone-600">ลบได้เฉพาะรายการที่ยังไม่มีสินค้าใช้</p>
      </header>
      <Section
        title="หมวด"
        items={categories.map((c) => ({
          id: c.key,
          title: c.name.th,
          sub: `${named(c)} · ${c.multiBrand ? 'หลายแบรนด์' : 'แบรนด์เดียว'}`,
          count: c.count,
          values: { key: c.key, th: c.name.th, en: c.name.en, multiBrand: c.multiBrand },
        }))}
        fields={[
          { name: 'key', label: 'รหัส', fixed: true, hint: KEY_HINT },
          { name: 'th', label: 'ไทย: ชื่อหมวด' },
          { name: 'en', label: 'English: ชื่อหมวด' },
          { name: 'multiBrand', label: 'หมวดนี้มีหลายแบรนด์ (แสดงตัวกรองแบรนด์บนหน้าเว็บ)', checkbox: true },
        ]}
        empty={{ key: '', th: '', en: '', multiBrand: false }}
        onSave={(v, isNew) =>
          saveCategoryAction({ key: String(v.key), th: String(v.th), en: String(v.en), multiBrand: v.multiBrand === true }, isNew)
        }
        onDelete={(id) => deleteCategoryAction(id)}
      />
      <Section
        title="แบรนด์"
        items={brands.map((b) => ({ id: String(b.id), title: b.name, sub: 'แบรนด์', count: b.count, values: { id: String(b.id), name: b.name } }))}
        fields={[{ name: 'name', label: 'ชื่อแบรนด์' }]}
        empty={{ id: '', name: '' }}
        onSave={(v, isNew) => saveBrandAction(isNew ? null : Number(v.id), String(v.name))}
        onDelete={(id) => deleteBrandAction(Number(id))}
      />
      <Section
        title="วัสดุ"
        items={materials.map((m) => ({
          id: m.key,
          title: m.name.th,
          sub: named(m),
          count: m.count,
          values: { key: m.key, th: m.name.th, en: m.name.en },
        }))}
        fields={[
          { name: 'key', label: 'รหัส', fixed: true, hint: KEY_HINT },
          { name: 'th', label: 'ไทย: ชื่อวัสดุ' },
          { name: 'en', label: 'English: ชื่อวัสดุ' },
        ]}
        empty={{ key: '', th: '', en: '' }}
        onSave={(v, isNew) => saveMaterialAction({ key: String(v.key), th: String(v.th), en: String(v.en) }, isNew)}
        onDelete={(id) => deleteMaterialAction(id)}
      />
    </>
  );
}
```

- [ ] **Step 3: Verify in the browser**

Logged in, open `/admin/categories/` from the sidebar link "หมวด แบรนด์ วัสดุ":
1. Three sections; ชุดครัว shows "สินค้า 0 ชิ้น" and an enabled delete button; ก๊อกล้างจาน shows a disabled delete button. Screenshot.
2. Add brand `Franke`; it appears and is selectable in the brand select on `/admin/products/`.
3. Add category key `Bad Key`: the dialog shows the key error. Add `tiles` / กระเบื้อง / Tiles: it appears last and as a pill on `/admin/products/`.
4. Edit category `tiles`: the key field is read-only.
5. Delete `tiles` and `Franke` (confirm dialog), both disappear.
6. Add material `quartz` / ควอตซ์ / Quartz, then delete it.

- [ ] **Step 4: Gates, commit and push**

```bash
grep -L 'adminAction\|requireAdmin' 'app/admin/(panel)/categories/actions.ts'
npx tsc --noEmit 2>&1 | grep -v '\.next/types'
npm run check:db && npm run check:filter && npm run check:search && npm run build
npm run check:overflow
git add 'app/admin/(panel)/categories' components/admin/TaxonomyAdmin.tsx
git commit -m "feat: add categories, brands and materials admin screen"
git push
```
Expected for `grep -L`: prints nothing.

---
### Task 8: Public product pages read from the database

**Files:**
- Create: `components/CatalogProvider.tsx`
- Modify: `lib/server/products.ts` (append), `lib/products.ts`, `app/layout.tsx`, `components/ProductsContent.tsx`, `components/ProductCard.tsx`, `components/ProductDetail.tsx`, `components/home/HomeContent.tsx`, `components/ProjectsContent.tsx`, `components/SearchPanel.tsx`, `app/products/[slug]/page.tsx`, `app/sitemap.ts`, `scripts/check-filter.mjs`, `scripts/check-db.mjs`

**Interfaces:**
- Consumes: `listCategories`, `listMaterials` (Task 4); `db` (Task 1).
- Produces from `lib/server/products.ts`: `listPublished(db): Promise<Product[]>`, `getPublished(db, slug: string): Promise<Product | null>`. A database price of null maps to `{ th: 'สอบถามราคา', en: 'Price on request' }`.
- Produces from `components/CatalogProvider.tsx`: `<CatalogProvider value={{ products, categories, materials }}>` and `useCatalog(): { products: Product[]; categories: Cat[]; materials: Mat[]; catName(key, lang): string; matName(key, lang): string }`.
- Changes in `lib/products.ts`: `Category` becomes `string`; `Product.material` becomes `string | undefined`; the `Material` type, `featuredProducts` and `getProduct` are removed; `relatedProducts(list: Product[], slug: string, n = 3)`; `SUB_FACETS(multiBrand: boolean)`. The `products` and `CATEGORIES` arrays stay as seed data for `db/seed.mjs` and the `check:*` scripts.

- [ ] **Step 1: Write the failing tests**

Add `listPublished, getPublished` to the existing `import * as prod` usage (no import change needed) and insert before `console.log('ผ่าน: ฐานข้อมูล');` in `scripts/check-db.mjs`:

```js
  // ── หน้าเว็บอ่าน DB (Task 8) ──
  const pub = await prod.listPublished(c);
  assert.deepEqual(pub.map((p) => p.slug).sort(), products.map((p) => p.slug).sort());
  for (const seedP of products) {
    const p = pub.find((x) => x.slug === seedP.slug);
    assert.deepEqual(
      [p.category, p.brand, p.series, p.material, p.name, p.desc, p.specs, p.price, p.images, p.scenes, !!p.featured],
      [seedP.category, seedP.brand, seedP.series, seedP.material, seedP.name, seedP.desc, seedP.specs, seedP.price, seedP.images, seedP.scenes, !!seedP.featured],
      `สินค้า ${seedP.slug} จาก DB ต้องตรงกับข้อมูลเดิม`,
    );
  }
  // ซ่อนแล้วหายจากหน้าเว็บ ทั้งรายการและหน้ารายละเอียด
  await c.query("update products set published = false where slug = 'elate-13963t-c4'");
  assert.ok(!(await prod.listPublished(c)).some((p) => p.slug === 'elate-13963t-c4'));
  assert.equal(await prod.getPublished(c, 'elate-13963t-c4'), null);
  await c.query("update products set published = true where slug = 'elate-13963t-c4'");
  assert.equal((await prod.getPublished(c, 'elate-13963t-c4')).name.en, products.find((p) => p.slug === 'elate-13963t-c4').name.en);
  assert.equal(await prod.getPublished(c, 'no-such-product'), null);
```

In `scripts/check-filter.mjs` replace

```js
assert.ok(SUB_FACETS('faucet').includes('brand'));
assert.ok(!SUB_FACETS('wardrobe').includes('brand'));
```
with
```js
assert.ok(SUB_FACETS(true).includes('brand'));
assert.ok(!SUB_FACETS(false).includes('brand'));
assert.ok(CATEGORIES.find((c) => c.key === 'faucet').multiBrand && !CATEGORIES.find((c) => c.key === 'wardrobe').multiBrand);
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npm run check:db`
Expected: FAIL with `prod.listPublished is not a function`.

Run: `npm run check:filter`
Expected: FAIL with an `AssertionError` on `SUB_FACETS(true).includes('brand')` (today `SUB_FACETS` takes a category key, so `true` finds no category and returns no brand facet).

- [ ] **Step 3: Change `lib/products.ts`**

1. Replace the comment line `// ── ตอนนี้มีข้อมูลจริงแค่ก๊อกกับอ่างของ KOHLER หมวดอื่นรอข้อมูลจากลูกค้า ──` with

```ts
// ── ตั้งแต่ 2026-10-15 หน้าเว็บอ่านสินค้าจาก DB (lib/server/products.ts) · CATEGORIES กับ products ในไฟล์นี้เหลือเป็นข้อมูลตั้งต้นของ db/seed.mjs และ check:* ──
```

2. Replace

```ts
export type Category = (typeof CATEGORIES)[number]['key'];
export type Material = 'brass' | 'stainless' | 'castIron';
```
with
```ts
// หมวดและวัสดุผู้ดูแลระบบเพิ่มเองได้ในหลังบ้าน จึงเป็น string ไม่ใช่ชุดค่าตายตัว
export type Category = string;
```

3. In `type Product`, replace `  material?: Material; // ไม่มี = Kohler ไม่ระบุวัสดุ (Kumin 99480T)` with `  material?: string; // key ในตาราง materials · ไม่มี = ไม่ระบุวัสดุ (Kumin 99480T)`.

4. Replace

```ts
export const featuredProducts = products.filter((p) => p.featured);

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function relatedProducts(slug: string, n = 3) {
  const cur = getProduct(slug);
  if (!cur) return [];
  return products.filter((p) => p.category === cur.category && p.slug !== slug).slice(0, n);
}
```
with
```ts
export function relatedProducts(list: Product[], slug: string, n = 3) {
  const cur = list.find((p) => p.slug === slug);
  if (!cur) return [];
  return list.filter((p) => p.category === cur.category && p.slug !== slug).slice(0, n);
}
```

5. Replace

```ts
export const SUB_FACETS = (c: Category): FacetKey[] =>
  CATEGORIES.find((x) => x.key === c)?.multiBrand ? ['series', 'material', 'brand'] : ['series', 'material'];
```
with
```ts
export const SUB_FACETS = (multiBrand: boolean): FacetKey[] => (multiBrand ? ['series', 'material', 'brand'] : ['series', 'material']);
```

Run: `npm run check:filter`
Expected: `ผ่าน: ตัวกรองสินค้า`

- [ ] **Step 4: Add the public reads to `lib/server/products.ts`**

Add at the top, below the header comment:

```ts
import type { Product } from '../products';
```

Append at the end of the file:

```ts
// ── อ่านให้หน้าเว็บ (Task 8) · เฉพาะที่เผยแพร่ ──
const ASK = { th: 'สอบถามราคา', en: 'Price on request' };

function toProduct(r: any): Product {
  return {
    slug: r.slug,
    category: r.category_key,
    brand: r.brand_name,
    series: r.series,
    ...(r.material_key ? { material: r.material_key } : {}),
    name: { th: r.name_th, en: r.name_en },
    desc: { th: r.desc_th, en: r.desc_en },
    specs: r.specs,
    price: r.price_th ? { th: r.price_th, en: r.price_en ?? r.price_th } : ASK,
    featured: r.featured,
    images: r.images,
    ...(r.scenes.length ? { scenes: r.scenes } : {}),
  };
}

export async function listPublished(db: Db): Promise<Product[]> {
  const r = await db.query(`${SELECT} where p.published order by p.sort, p.id`);
  return r.rows.map(toProduct);
}

export async function getPublished(db: Db, slug: string): Promise<Product | null> {
  const r = await db.query(`${SELECT} where p.published and p.slug = $1`, [slug]);
  return r.rows[0] ? toProduct(r.rows[0]) : null;
}
```

Run: `npm run check:db`
Expected: `ผ่าน: ฐานข้อมูล`

- [ ] **Step 5: Add the provider and load it in the root layout**

Create `components/CatalogProvider.tsx`:

```tsx
'use client';

// สินค้าที่เผยแพร่ หมวด และวัสดุจาก DB · root layout โหลดครั้งเดียวต่อ request แล้วส่งให้ component ฝั่ง client
// ponytail: ส่งสินค้าทั้งชุดไปทุกหน้า (เท่ากับที่ bundle เดิมฝัง lib/products.ts ไว้) ถ้าสินค้าเกินหลักร้อยให้ย้ายการค้นหาไปฝั่ง server
import { createContext, useContext } from 'react';
import type { Product } from '@/lib/products';
import type { Lang } from '@/lib/i18n';

type Name = { th: string; en: string };
export type Cat = { key: string; name: Name; multiBrand: boolean };
export type Mat = { key: string; name: Name };
type Catalog = { products: Product[]; categories: Cat[]; materials: Mat[] };

const Ctx = createContext<Catalog>({ products: [], categories: [], materials: [] });

export function CatalogProvider({ value, children }: { value: Catalog; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalog() {
  const c = useContext(Ctx);
  return {
    ...c,
    catName: (key: string, lang: Lang) => c.categories.find((x) => x.key === key)?.name[lang] ?? key,
    matName: (key: string, lang: Lang) => c.materials.find((x) => x.key === key)?.name[lang] ?? key,
  };
}
```

In `app/layout.tsx`:
- add imports below `import JsonLd from '@/components/JsonLd';`:

```tsx
import { CatalogProvider } from '@/components/CatalogProvider';
import { db } from '@/lib/db';
import { listPublished } from '@/lib/server/products';
import { listCategories, listMaterials } from '@/lib/server/taxonomy';
```
- add above `export const metadata`:

```tsx
// ทุกหน้าอ่าน DB ตอน request: หลังบ้านบันทึกแล้วหน้าเว็บเห็นทันที ไม่ต้อง revalidate และ next build ไม่ต้องต่อ DB
// ponytail: ไม่มี cache ถ้าคนเข้าเยอะจน DB ช้า ค่อยใส่ unstable_cache พร้อม revalidateTag ตอนบันทึก
export const dynamic = 'force-dynamic';
```
- change `export default function RootLayout(` to `export default async function RootLayout(` and add as its first line:

```tsx
  const [products, categories, materials] = await Promise.all([listPublished(db), listCategories(db), listMaterials(db)]);
```
- wrap the `LangProvider` children: replace `<LangProvider>` with `<LangProvider>\n          <CatalogProvider value={{ products, categories, materials }}>` and `</LangProvider>` with `</CatalogProvider>\n        </LangProvider>`.

- [ ] **Step 6: Point the components at the provider**

`components/ProductsContent.tsx`:
- replace the `import { CATEGORIES, SUB_FACETS, ... } from '@/lib/products';` block with

```tsx
import { useCatalog } from './CatalogProvider';
import { SUB_FACETS, facetOptions, filterProducts, type FacetKey, type Picked, type Product } from '@/lib/products';
```
- replace

```tsx
type Cat = Category | 'all';
const NONE: Picked = { category: [], series: [], material: [], brand: [] };
const ORDER = CATEGORIES.map((c) => c.key as string);
const count = (c: Category) => products.filter((p) => p.category === c).length;

function Facets({ cat, picked, toggle }: { cat: Category; picked: Picked; toggle: (k: FacetKey, v: string) => void }) {
  const { t } = useLang();
```
with
```tsx
type Cat = string; // key ของหมวด หรือ 'all'
const NONE: Picked = { category: [], series: [], material: [], brand: [] };

function Facets({
  products,
  cat,
  multiBrand,
  picked,
  toggle,
}: {
  products: Product[];
  cat: string;
  multiBrand: boolean;
  picked: Picked;
  toggle: (k: FacetKey, v: string) => void;
}) {
  const { lang, t } = useLang();
  const { matName } = useCatalog();
```
- in `Facets` replace `const label = (k: FacetKey, v: string) => (k === 'material' ? t.common.material[v] : v);` with `const label = (k: FacetKey, v: string) => (k === 'material' ? matName(v, lang) : v);` and `const groups = SUB_FACETS(cat)` with `const groups = SUB_FACETS(multiBrand)`.
- in `ProductsContent`, below `const { lang, t } = useLang();` add

```tsx
  const { products, categories, catName } = useCatalog();
  const ORDER = categories.map((c) => c.key);
  const count = (c: string) => products.filter((p) => p.category === c).length;
  const multiBrand = categories.find((c) => c.key === cat)?.multiBrand ?? false;
```
- replace both `<Facets cat={cat} picked={picked} toggle={toggle} />` with `<Facets products={products} cat={cat} multiBrand={multiBrand} picked={picked} toggle={toggle} />`.
- replace `{t.common.category[c]}` with `{c === 'all' ? t.common.category.all : catName(c, lang)}`.

`components/ProductCard.tsx`: add `import { useCatalog } from './CatalogProvider';` below the `useLang` import; below `const { lang, t } = useLang();` add `const { catName } = useCatalog();`; replace `{t.common.category[product.category]}` with `{catName(product.category, lang)}`.

`components/ProductDetail.tsx`: replace `import { getProduct, relatedProducts } from '@/lib/products';` with `import { relatedProducts } from '@/lib/products';` plus `import { useCatalog } from './CatalogProvider';`; replace

```tsx
  const product = getProduct(slug);
  if (!product) return null;
  const related = relatedProducts(slug);
```
with
```tsx
  const { products, catName } = useCatalog();
  const product = products.find((p) => p.slug === slug);
  if (!product) return null;
  const related = relatedProducts(products, slug);
```
and replace `{t.common.category[product.category]}` with `{catName(product.category, lang)}`.

`components/home/HomeContent.tsx`: replace `import { featuredProducts } from '@/lib/products';` with `import { useCatalog } from '@/components/CatalogProvider';`; in `FeaturedProducts` replace `const [lead, ...rest] = featuredProducts;` with

```tsx
  const [lead, ...rest] = useCatalog().products.filter((p) => p.featured);
  if (!lead) return null;
```

`components/ProjectsContent.tsx`: replace `import { getProduct } from '@/lib/products';` with `import { useCatalog } from './CatalogProvider';`; below `const { lang, t } = useLang();` add `const { products } = useCatalog();`; replace `const product = getProduct(slug);` with `const product = products.find((x) => x.slug === slug);`.

`components/SearchPanel.tsx`: replace `import { products } from '@/lib/products';` with `import { useCatalog } from './CatalogProvider';`; delete the line `const index = buildIndex({ products, posts, projects, pages: PAGES });`; inside the component replace `const results = useMemo(() => search(index, query), [query]);` with

```tsx
  const { products } = useCatalog();
  const index = useMemo(() => buildIndex({ products, posts, projects, pages: PAGES }), [products]);
  const results = useMemo(() => search(index, query), [index, query]);
```

- [ ] **Step 7: Product page and sitemap**

In `app/products/[slug]/page.tsx`:
- replace `import { getProduct, products } from '@/lib/products';` with

```tsx
import { cache } from 'react';
import { db } from '@/lib/db';
import { getPublished } from '@/lib/server/products';
```
- replace

```tsx
export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}
```
with
```tsx
// metadata กับหน้าใช้ query เดียวกันใน request เดียว
const getProduct = cache((slug: string) => getPublished(db, slug));
```
- replace both `const product = getProduct(slug);` with `const product = await getProduct(slug);`
- replace `brand: { '@type': 'Brand', name: 'KOHLER' },` with `brand: { '@type': 'Brand', name: product.brand },`

Replace `app/sitemap.ts` lines 1 to 8 (imports, `force-static`, function header) so the file starts:

```ts
import type { MetadataRoute } from 'next';
import { posts } from '@/lib/posts';
import { SITE_URL } from '@/lib/site';
import { db } from '@/lib/db';
import { listPublished } from '@/lib/server/products';

// สินค้ามาจาก DB จึงสร้างตอน request (เดิม force-static ตอน build)
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await listPublished(db);
```
(the rest of the function body stays as it is).

- [ ] **Step 8: Verify against the dev database**

```bash
npx tsc --noEmit 2>&1 | grep -v '\.next/types'
npm run check:db && npm run check:filter && npm run check:search
```
Expected: tsc prints nothing; all three pass.

In the browser (dev server on 4100):
1. `/products/` shows the same count per category tab as before this task; pick ก๊อกล้างจาน: series and material filters appear, brand filter appears (multi-brand). Screenshot.
2. Open `/products/elate-13963t-c4/`: name, specs and the category label render.
3. In `/admin/products/` hide `elate-13963t-c4`. Reload `/products/`: it is gone; `/products/elate-13963t-c4/` returns the 404 page; the search panel no longer finds "Elate 13963T". Show it again.
4. In `/admin/categories/` rename category ก๊อกล้างจาน to ก๊อกครัว; `/products/` tab and the product card label change. Rename it back.
5. `/` still shows the featured products block; `/projects/` still lists product links.
6. `curl -s http://localhost:4100/sitemap.xml | grep -o '/products/[^<]*' | wc -l` equals the number of published products plus 1 (the `/products/` page itself).
7. `read_console_messages` with `onlyErrors: true` prints nothing.

- [ ] **Step 9: Gates, commit and push**

```bash
npm run build
npm run check:overflow
git add lib/products.ts lib/server/products.ts components app/layout.tsx 'app/products/[slug]/page.tsx' app/sitemap.ts scripts/check-filter.mjs scripts/check-db.mjs
git commit -m "feat: read public product pages from the database"
git push
```

---

### Task 9: Entry announcement from the database, with its admin screen

**Files:**
- Create: `lib/server/announcement.ts`, `app/admin/(panel)/announcement/page.tsx`, `app/admin/(panel)/announcement/actions.ts`, `components/admin/AnnouncementAdmin.tsx`
- Modify: `components/Announcement.tsx`, `app/layout.tsx`, `scripts/check-db.mjs`

**Interfaces:**
- Consumes: `adminAction`, `requireAdmin` (Task 3); `ImageField` (Task 6); root layout data loading (Task 8); `shouldShow`, `markSeen` from `lib/announcement.ts` (unchanged).
- Produces from `lib/server/announcement.ts`: `type AnnouncementData = { enabled: boolean; id: string; image: string | null; title: { th: string; en: string }; body: { th: string; en: string }; cta: { label: { th: string; en: string }; href: string } | null }`, `type AnnouncementInput = { enabled: boolean; titleTh: string; titleEn: string; bodyTh: string; bodyEn: string; image: string; ctaTh: string; ctaEn: string; href: string; resetSeen: boolean }`, `getAnnouncement(db): Promise<AnnouncementData | null>`, `saveAnnouncement(db, input): Promise<void>`.
- Produces: `saveAnnouncementAction(input: AnnouncementInput): Promise<Result>`; `<Announcement data={AnnouncementData | null} />`.

- [ ] **Step 1: Write the failing test**

Add to the imports of `scripts/check-db.mjs`:

```js
import { getAnnouncement, saveAnnouncement } from '../lib/server/announcement.ts';
```

Insert before `console.log('ผ่าน: ฐานข้อมูล');`:

```js
  // ── ประกาศ (Task 9) ──
  const a0 = await getAnnouncement(c);
  assert.equal(a0.id, ANNOUNCEMENT.id);
  assert.deepEqual(a0.cta, { label: ANNOUNCEMENT.cta.label, href: ANNOUNCEMENT.cta.href });
  const input = {
    enabled: true, titleTh: 'ลดราคา', titleEn: '', bodyTh: 'รายละเอียด', bodyEn: '', image: '',
    ctaTh: '', ctaEn: '', href: '', resetSeen: false,
  };
  await saveAnnouncement(c, input);
  const a1 = await getAnnouncement(c);
  assert.equal(a1.id, ANNOUNCEMENT.id, 'ไม่ติ๊กแสดงอีกครั้ง = คนที่ปิดไปแล้วไม่เห็นซ้ำ');
  assert.deepEqual(a1.title, { th: 'ลดราคา', en: 'ลดราคา' }, 'ไม่กรอกอังกฤษ = ใช้ไทย');
  assert.equal(a1.cta, null);
  assert.equal(a1.image, null);
  await saveAnnouncement(c, { ...input, resetSeen: true });
  assert.notEqual((await getAnnouncement(c)).id, ANNOUNCEMENT.id, 'ติ๊กแสดงอีกครั้ง = seen_key ใหม่');
  await assert.rejects(saveAnnouncement(c, { ...input, titleTh: ' ' }), { name: 'InputError' });
  await assert.rejects(saveAnnouncement(c, { ...input, href: 'javascript:alert(1)', ctaTh: 'กด' }), { name: 'InputError' });
  await assert.rejects(saveAnnouncement(c, { ...input, href: '/contact/' }), /ข้อความปุ่ม/);
  await assert.rejects(saveAnnouncement(c, { ...input, image: 'https://evil.example/x.png' }), { name: 'InputError' });
  await saveAnnouncement(c, { ...input, href: 'https://line.me/ti/p/x', ctaTh: 'แชต', image: '/uploads/2026/10/a.webp' });
  assert.deepEqual((await getAnnouncement(c)).cta, { label: { th: 'แชต', en: 'แชต' }, href: 'https://line.me/ti/p/x' });
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run check:db`
Expected: FAIL with `Cannot find module` for `lib/server/announcement.ts`.

- [ ] **Step 3: Write the module**

Create `lib/server/announcement.ts`:

```ts
// ประกาศที่เด้งตอนเข้าเว็บ (แถวเดียว id = 1) · import แค่ node: เพื่อให้ scripts/check-db.mjs รันได้ตรง ๆ
// seen_key คือ id ที่เบราว์เซอร์จำว่าปิดไปแล้ว (lib/announcement.ts) เปลี่ยนค่า = ทุกคนเห็นอีกครั้ง
import { randomBytes } from 'node:crypto';

type Db = { query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }> };
type Name = { th: string; en: string };

export class InputError extends Error {
  name = 'InputError';
}

export type AnnouncementData = {
  enabled: boolean;
  id: string;
  image: string | null;
  title: Name;
  body: Name;
  cta: { label: Name; href: string } | null;
};
export type AnnouncementInput = {
  enabled: boolean;
  titleTh: string;
  titleEn: string;
  bodyTh: string;
  bodyEn: string;
  image: string;
  ctaTh: string;
  ctaEn: string;
  href: string;
  resetSeen: boolean;
};

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export async function getAnnouncement(db: Db): Promise<AnnouncementData | null> {
  const a = (await db.query('select * from announcement where id = 1')).rows[0];
  if (!a) return null;
  return {
    enabled: a.enabled,
    id: a.seen_key,
    image: a.image,
    title: { th: a.title_th, en: a.title_en },
    body: { th: a.body_th, en: a.body_en },
    cta: a.cta_href ? { label: { th: a.cta_label_th ?? '', en: a.cta_label_en ?? '' }, href: a.cta_href } : null,
  };
}

export async function saveAnnouncement(db: Db, input: AnnouncementInput): Promise<void> {
  const titleTh = str(input.titleTh);
  const bodyTh = str(input.bodyTh);
  if (!titleTh || !bodyTh) throw new InputError('กรุณากรอกหัวข้อและเนื้อหาภาษาไทย');
  const href = str(input.href);
  const ctaTh = str(input.ctaTh);
  // ลิงก์ในเว็บเอง หรือ https เท่านั้น กัน javascript: และ data:
  if (href && !/^(\/(?!\/)\S*|https:\/\/\S+)$/.test(href)) throw new InputError('ลิงก์ต้องขึ้นต้นด้วย / หรือ https://');
  if (href && !ctaTh) throw new InputError('กรุณากรอกข้อความปุ่มภาษาไทย');
  const image = str(input.image);
  if (image && (!/^\/(media|uploads)\/[\w./-]+$/.test(image) || image.includes('..'))) throw new InputError('ที่อยู่รูปไม่ถูกต้อง');
  await db.query(
    `insert into announcement (id, enabled, seen_key, title_th, title_en, body_th, body_en, image, cta_label_th, cta_label_en, cta_href, updated_at)
     values (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
     on conflict (id) do update set
       enabled = excluded.enabled,
       seen_key = case when $11::boolean then excluded.seen_key else announcement.seen_key end,
       title_th = excluded.title_th, title_en = excluded.title_en,
       body_th = excluded.body_th, body_en = excluded.body_en,
       image = excluded.image,
       cta_label_th = excluded.cta_label_th, cta_label_en = excluded.cta_label_en, cta_href = excluded.cta_href,
       updated_at = now()`,
    [
      input.enabled === true,
      randomBytes(6).toString('hex'),
      titleTh,
      str(input.titleEn) || titleTh,
      bodyTh,
      str(input.bodyEn) || bodyTh,
      image || null,
      href ? ctaTh : null,
      href ? str(input.ctaEn) || ctaTh : null,
      href || null,
      input.resetSeen === true,
    ],
  );
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm run check:db`
Expected: `ผ่าน: ฐานข้อมูล`

- [ ] **Step 5: Read the announcement from the database on the public site**

In `app/layout.tsx`:
- add `import { getAnnouncement } from '@/lib/server/announcement';` with the other server imports
- change the data line to

```tsx
  const [products, categories, materials, announcement] = await Promise.all([
    listPublished(db),
    listCategories(db),
    listMaterials(db),
    getAnnouncement(db),
  ]);
```
- replace `<Announcement />` with `<Announcement data={announcement} />`

Replace `components/Announcement.tsx` with:

```tsx
'use client';

// ประกาศตอนเข้าเว็บ: เปิดราว 1 วินาทีหลังหน้าแรกของรอบนั้นโหลด ครั้งเดียวต่อการเปิดแท็บ (sessionStorage)
// อยู่ใน layout จึง mount ครั้งเดียวต่อการโหลดเว็บ ไม่เด้งซ้ำตอนเปลี่ยนหน้า · เนื้อหามาจาก DB แก้ที่ /admin/announcement/

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from './LangProvider';
import { markSeen, shouldShow } from '@/lib/announcement';
import type { AnnouncementData } from '@/lib/server/announcement';

// การอ่าน window.sessionStorage เองก็โยน error ได้เมื่อเบราว์เซอร์บล็อกข้อมูลไซต์
const store = () => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export default function Announcement({ data: A }: { data: AnnouncementData | null }) {
  const { lang, t } = useLang();
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    // หลังบ้านไม่เด้งประกาศ
    if (!A || pathname.startsWith('/admin') || !shouldShow(A, store())) return;
    const timer = setTimeout(() => {
      // มี dialog อื่นเปิดอยู่ (กำลังค้นหา): ไม่เด้งทับ รอบนี้ข้ามไป
      if (document.querySelector('dialog[open]')) return;
      ref.current?.showModal();
    }, 1000);
    return () => clearTimeout(timer);
    // ตั้งใจรันครั้งเดียวตอน mount ตามพฤติกรรมเดิม
  }, []);

  if (!A?.enabled) return null;
  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      data-lenis-prevent
      aria-labelledby="announcement-title"
      onClose={() => markSeen(A.id, store())}
      onClick={(e) => e.target === e.currentTarget && close()}
      className="w-[min(92vw,440px)] bg-paper p-0 text-ink backdrop:bg-ink/60"
    >
      <div className="relative">
        {A.image && <img src={A.image} alt="" className="aspect-[16/9] w-full object-cover" />}
        <button type="button" onClick={close} aria-label={t.announce.close} className={`${A.image ? 'absolute right-0 top-0' : 'ml-auto'} flex h-11 w-11 items-center justify-center bg-paper text-2xl font-extralight text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink`}>
          ×
        </button>
      </div>
      <div className="p-6">
        <h2 id="announcement-title" className="text-xl font-light tracking-wide">{A.title[lang]}</h2>
        <p className="mt-3 text-sm font-light leading-relaxed text-stone-600">{A.body[lang]}</p>
        {A.cta && (
          <Link href={A.cta.href} onClick={close} className="mt-6 inline-flex min-h-11 items-center border border-ink bg-ink px-6 text-[11px] font-normal uppercase tracking-widest2 text-paper hover:bg-paper hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink">
            {A.cta.label[lang]}
          </Link>
        )}
      </div>
    </dialog>
  );
}
```

(Before replacing, diff the old file's dialog markup against this one: the classes must be identical except the close button's position when there is no image and the two new `&&` guards.)

- [ ] **Step 6: Write the admin screen**

Create `app/admin/(panel)/announcement/actions.ts`:

```ts
'use server';

import { db } from '@/lib/db';
import { adminAction } from '@/lib/admin';
import { saveAnnouncement, type AnnouncementInput } from '@/lib/server/announcement';

export async function saveAnnouncementAction(input: AnnouncementInput) {
  return adminAction(() => saveAnnouncement(db, input));
}
```

Create `app/admin/(panel)/announcement/page.tsx`:

```tsx
import type { Metadata } from 'next';
import AnnouncementAdmin from '@/components/admin/AnnouncementAdmin';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { getAnnouncement } from '@/lib/server/announcement';

export const metadata: Metadata = { title: 'ประกาศ' };

export default async function AdminAnnouncementPage() {
  await requireAdmin();
  return <AnnouncementAdmin data={await getAnnouncement(db)} />;
}
```

Create `components/admin/AnnouncementAdmin.tsx`:

```tsx
'use client';

// หลังบ้าน: ประกาศที่เด้งตอนเข้าเว็บ · ตัวอย่างด้านขวาเปลี่ยนตามที่พิมพ์ทันที สลับดูไทยและอังกฤษได้
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AnnouncementData, AnnouncementInput } from '@/lib/server/announcement';
import { saveAnnouncementAction } from '@/app/admin/(panel)/announcement/actions';
import ImageField from './ImageField';
import { danger, input, label, pill, solid } from './ui';

const fromData = (a: AnnouncementData | null): AnnouncementInput => ({
  enabled: a?.enabled ?? false,
  titleTh: a?.title.th ?? '',
  titleEn: a?.title.en ?? '',
  bodyTh: a?.body.th ?? '',
  bodyEn: a?.body.en ?? '',
  image: a?.image ?? '',
  ctaTh: a?.cta?.label.th ?? '',
  ctaEn: a?.cta?.label.en ?? '',
  href: a?.cta?.href ?? '',
  resetSeen: false,
});

export default function AnnouncementAdmin({ data }: { data: AnnouncementData | null }) {
  const router = useRouter();
  const [v, setV] = useState(() => fromData(data));
  const [lang, setLang] = useState<'th' | 'en'>('th');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<AnnouncementInput>) => setV({ ...v, ...patch });
  const pick = (th: string, en: string) => (lang === 'th' ? th : en || th);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await saveAnnouncementAction(v);
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      setMsg('');
      return;
    }
    setError('');
    setMsg(v.resetSeen ? 'บันทึกแล้ว ทุกคนจะเห็นประกาศอีกครั้ง' : 'บันทึกแล้ว');
    set({ resetSeen: false });
    router.refresh();
  }

  const field = (k: 'titleTh' | 'titleEn' | 'ctaTh' | 'ctaEn' | 'href', text: string, hint?: string) => (
    <label className={label}>
      {text}
      <input value={v[k]} onChange={(e) => set({ [k]: e.target.value } as Partial<AnnouncementInput>)} className={`${input} mt-2`} />
      {hint && <span className="mt-1.5 block text-xs text-stone-600">{hint}</span>}
    </label>
  );
  const area = (k: 'bodyTh' | 'bodyEn', text: string) => (
    <label className={label}>
      {text}
      <textarea value={v[k]} onChange={(e) => set({ [k]: e.target.value } as Partial<AnnouncementInput>)} className={`${input} mt-2 min-h-24 py-2.5`} />
    </label>
  );

  return (
    <>
      <header className="glass rounded-[28px] p-5 md:p-6">
        <h1 className="text-2xl font-extralight tracking-wide md:text-3xl">ประกาศ</h1>
        <p className="mt-1 text-sm text-stone-600">เด้งครั้งเดียวต่อการเปิดเว็บ คนที่กดปิดแล้วจะไม่เห็นซ้ำ จนกว่าจะติ๊ก แสดงอีกครั้ง</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6">
        <form onSubmit={save} noValidate className="glass space-y-4 rounded-[28px] p-5 md:p-6">
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" checked={v.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="h-4 w-4 accent-ink" />
            เปิดประกาศ
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            {field('titleTh', 'ไทย: หัวข้อ (จำเป็น)')}
            {field('titleEn', 'English: หัวข้อ', 'เว้นว่าง = ใช้ภาษาไทย')}
            {area('bodyTh', 'ไทย: เนื้อหา (จำเป็น)')}
            {area('bodyEn', 'English: เนื้อหา')}
            {field('ctaTh', 'ไทย: ข้อความปุ่ม')}
            {field('ctaEn', 'English: ข้อความปุ่ม')}
          </div>
          {field('href', 'ลิงก์ของปุ่ม', 'เช่น /contact/ หรือ https://... · เว้นว่าง = ไม่มีปุ่ม')}
          <div>
            <p className={label}>รูป (16:9)</p>
            <ImageField value={v.image ? [v.image] : []} onChange={(x) => set({ image: x[0] ?? '' })} multiple={false} />
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" checked={v.resetSeen} onChange={(e) => set({ resetSeen: e.target.checked })} className="h-4 w-4 accent-ink" />
            แสดงอีกครั้งกับคนที่ปิดไปแล้ว
          </label>
          <p role="alert" className={`min-h-5 text-sm ${danger}`}>
            {error}
          </p>
          <p role="status" className="min-h-5 text-sm">
            {msg}
          </p>
          <button type="submit" className={solid} disabled={busy}>
            {busy ? 'กำลังบันทึก' : 'บันทึก'}
          </button>
        </form>

        <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start" aria-label="ตัวอย่างประกาศ">
          <div className="flex gap-2">
            {(['th', 'en'] as const).map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} className={pill(lang === l)} onClick={() => setLang(l)}>
                {l === 'th' ? 'ไทย' : 'English'}
              </button>
            ))}
          </div>
          <div className={`bg-paper text-ink shadow-xl ${v.enabled ? '' : 'opacity-50'}`}>
            {v.image && <img src={v.image} alt="" className="aspect-[16/9] w-full object-cover" />}
            <div className="p-6">
              <p className="text-xl font-light tracking-wide">{pick(v.titleTh, v.titleEn) || 'หัวข้อประกาศ'}</p>
              <p className="mt-3 text-sm font-light leading-relaxed text-stone-600">{pick(v.bodyTh, v.bodyEn) || 'เนื้อหาประกาศ'}</p>
              {v.href && (
                <span className="mt-6 inline-flex min-h-11 items-center border border-ink bg-ink px-6 text-[11px] font-normal uppercase tracking-widest2 text-paper">
                  {pick(v.ctaTh, v.ctaEn)}
                </span>
              )}
            </div>
          </div>
          {!v.enabled && <p className="text-xs text-stone-600">ประกาศปิดอยู่ หน้าเว็บจะไม่เด้ง</p>}
        </aside>
      </div>
    </>
  );
}
```

- [ ] **Step 7: Verify in the browser**

1. `/admin/announcement/` loads the seeded text; typing in "ไทย: หัวข้อ" changes the preview at once; the English pill shows the English fields (or Thai when English is empty). Screenshot.
2. Untick "เปิดประกาศ", save. On `/` after `sessionStorage.clear()` and reload, no announcement appears.
3. Tick it again, change the title, tick "แสดงอีกครั้งกับคนที่ปิดไปแล้ว", save. On `/`, close the announcement, reload: it does not come back (closed in this tab). `sessionStorage.clear()`, reload: the new title appears.
4. Put `javascript:alert(1)` in the button link with a button label: saving shows `ลิงก์ต้องขึ้นต้นด้วย / หรือ https://`.
5. Restore the original seeded text (title, body, `/contact/` link, image `/media/scenes/about-hero.webp`) and save, so the dev database matches the seed again.
6. `read_console_messages` with `onlyErrors: true` prints nothing on both pages.

- [ ] **Step 8: Gates, commit and push**

```bash
grep -L 'adminAction\|requireAdmin' 'app/admin/(panel)/announcement/actions.ts'
npx tsc --noEmit 2>&1 | grep -v '\.next/types'
npm run check:db && npm run check:filter && npm run check:search && npm run build
npm run check:overflow
git add lib/server/announcement.ts 'app/admin/(panel)/announcement' components/admin/AnnouncementAdmin.tsx components/Announcement.tsx app/layout.tsx scripts/check-db.mjs
git commit -m "feat: manage the entry announcement from the admin and read it from the database"
git push
```
Expected for `grep -L`: prints nothing.

---

## After the last task

- `lib/announcement.ts` still holds `ANNOUNCEMENT` (seed data and `check:search`). `lib/products.ts` still holds the seed arrays. Removing them is a file deletion and needs the lead's approval; it belongs with Plan 2 once posts and projects also read the database.
- Report to the lead: commits, what each browser step showed, what was not verified, and the approvals still open (deploy to the test server on 23 Oct is DevOps, not this plan).
