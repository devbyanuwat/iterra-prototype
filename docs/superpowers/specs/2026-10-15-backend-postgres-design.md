# ITERRA backend: Next.js + PostgreSQL

ร่างวันที่ 15 ตุลาคม 2569 · แก้ 16 ตุลาคม 2569 เพิ่มขอบเขตแผน 2 (หัวข้อ 11) · สถานะ: รอ lead ตรวจ

## 1. เป้าหมายและขอบเขต

ผู้ดูแลระบบของลูกค้าจัดการสินค้า หมวด แบรนด์ วัสดุ ประกาศ บทความ ผลงาน แคตตาล็อก และอ่านข้อความจากฟอร์มติดต่อได้เองผ่านหลังบ้าน หน้าเว็บแสดงข้อมูลจาก DB ทันทีที่บันทึก

- กำหนดการ: งานพัฒนาจบ 30 ต.ค. 2569 สาธิต 31 ต.ค. ส่งมอบ 14 พ.ย. ลูกค้าใช้งานจริง 20 พ.ย.
- งานรายวันต่อบทบาท: `docs/plan/iterra-team-plan.html`
- ปฏิทินที่ส่งลูกค้า: `docs/plan/iterra-client-timeline.html`
- ไม่อยู่ในขอบเขต: ห้องจำลอง 3D (`app/lab/`, `components/room/`), สีผิวสินค้า (`lib/finishes.ts` เป็นข้อมูลเดโม อยู่ในโค้ดต่อ), สิทธิ์หลายระดับ, ตั้งเวลาประกาศ, หน้าดู audit log ในหลังบ้าน (อ่านด้วย psql ไปก่อน), การส่งอีเมลจากฟอร์มติดต่อ (SMTP ทำรอบถัดไป), security headers, Tailwind 4, สำรองข้อมูลและ deploy
- อยู่ในขอบเขต (lead เพิ่ม 2026-10-16): audit log, สถิติคำค้น, session หมดเวลาเมื่อไม่ใช้งาน, สคริปต์ปิดบัญชี, การล้างข้อมูลเก่า รายละเอียดหัวข้อ 11

## 2. สถาปัตยกรรม

- Next.js ตัวเดียวทำทั้งหน้าเว็บและหลังบ้าน รันด้วย `next start` บน Node
- เลิก `output: 'export'` ใน `next.config.mjs` (ไฟล์ protected ต้องได้อนุมัติ)
- ต่อ DB ด้วย dependency ใหม่ 1 ตัว: `pg` (ต้องได้อนุมัติ) เขียน SQL ล้วน ไม่ใช้ ORM
- การแก้ข้อมูลจากหลังบ้านใช้ Server Functions (ดู `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`)
- root layout ตั้ง `dynamic = 'force-dynamic'`: ทุกหน้าอ่าน DB ตอน request จึงเห็นข้อมูลใหม่ทันทีโดยไม่ต้องเรียก `revalidatePath` และ `next build` ไม่ต้องต่อ DB (lead อนุมัติ 2026-10-15) ถ้าคนเข้าเยอะจน DB ช้า ค่อยใส่ cache พร้อม revalidate ตอนบันทึก
- Route Handler ใช้เฉพาะ 2 จุด: ส่งไฟล์ที่อัปโหลด (`/uploads/...`) และรับไฟล์แคตตาล็อก PDF (`/api/catalog-pdf/`) เพราะ Server Function รับได้ไม่เกิน `serverActions.bodySizeLimit` 6 MB และ `proxy.ts` ที่ครอบ `/admin/*` พักข้อมูลได้แค่ 10 MB (`proxyClientMaxBodySize`) เกินนั้นตัดทิ้งเงียบ ๆ route นี้อยู่นอก `/admin` จึงไม่ต้องแก้ `next.config.mjs` และตรวจ session เองทุกครั้ง
- `proxy.ts` (ชื่อใหม่ของ middleware ใน Next 16) ใช้แค่ redirect คนที่ไม่มี cookie ออกจาก `/admin/` การตรวจสิทธิ์จริงทำซ้ำทุก Server Function และทุกหน้า admin ตามที่เอกสาร Next บอกว่า proxy ไม่ใช่ที่สำหรับ authorization
- ที่ตั้ง DB (สมมติฐาน ยังไม่ยืนยัน): ตอนพัฒนาใช้ PostgreSQL 16 ในเครื่อง ตอนใช้งานจริงลง Node กับ PostgreSQL บน VPS ของทีมเครื่องเดียวกัน
- ค่าตั้ง: `DATABASE_URL`, `UPLOAD_DIR`, `SESSION_DAYS`, `SESSION_IDLE_MIN`, `IP_SALT`, `SMTP_URL`, `INQUIRY_TO` อยู่ใน `.env` ห้าม commit

### โครงไฟล์

```
db/
  migrations/001_init.sql     ไฟล์ SQL เรียงเลข รันครั้งเดียวต่อไฟล์
  seed.ts                     ดึงข้อมูลเดิมจาก lib/*.ts เข้า DB
scripts/db-migrate.mjs        รันไฟล์ที่ยังไม่เคยรัน จดชื่อไว้ในตาราง schema_migrations
lib/db.ts                     pool ของ pg และ helper query
lib/auth.ts                   hash รหัส สร้างและตรวจ session
app/admin/...                 หน้าหลังบ้าน
app/uploads/[...path]/route.ts
proxy.ts
```

## 3. Schema

15 ตาราง และ `schema_migrations` ของตัว migrate · `audit_log`, `sessions.last_seen_at` และ `search_queries` มาในแผน 2 (migration 002 และ 003)

```sql
create table schema_migrations (
  name   text primary key,
  run_at timestamptz not null default now()
);

-- ผู้ดูแลระบบ
create table admin_users (
  id            bigint generated always as identity primary key,
  email         text not null unique,          -- เก็บเป็นตัวพิมพ์เล็ก
  name          text not null,
  password_hash text not null,                 -- scrypt จาก node:crypto
  disabled_at   timestamptz,
  created_at    timestamptz not null default now()
);
create table sessions (
  token_hash   text primary key,               -- sha256 ของ token ใน cookie ไม่เก็บ token ตรง
  user_id      bigint not null references admin_users on delete cascade,
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()  -- ใช้ครั้งล่าสุด เขียนไม่เกินทุก 5 นาที
);
-- ใครทำอะไรกับอะไร เมื่อไร · ลบบัญชีที่มีประวัติไม่ได้ ใช้ปิดบัญชีแทน
create table audit_log (
  id        bigint generated always as identity primary key,
  at        timestamptz not null default now(),
  user_id   bigint references admin_users,     -- null = สคริปต์บน server
  action    text not null,                     -- login, logout, create, update, delete, publish, unpublish, upload, replace, handle, disable
  entity    text not null,                     -- admin_user, product, category, brand, material, announcement, file, post, project, catalog, inquiry
  entity_id text,
  detail    jsonb
);
create index on audit_log (at);
create table login_attempts (
  ip_hash text not null,
  at      timestamptz not null default now()
);
create index on login_attempts (ip_hash, at);

-- สินค้า
create table categories (
  key         text primary key,                -- kitchen, faucet ... ใช้ใน URL ตัวกรอง
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
  key     text primary key,                    -- brass, stainless, castIron และที่ผู้ดูแลระบบเพิ่ม
  name_th text not null,
  name_en text not null,
  sort    int not null default 0
);
create table products (
  id           bigint generated always as identity primary key,
  slug         text not null unique,
  category_key text not null references categories on delete restrict,
  brand_id     bigint not null references brands on delete restrict,
  material_key text references materials on delete restrict,   -- null = ไม่ระบุวัสดุ
  series       text not null default '',
  name_th      text not null,
  name_en      text not null,
  desc_th      text not null default '',
  desc_en      text not null default '',
  specs        jsonb not null default '[]',    -- [{label, value}]
  price_th     text,                           -- null = สอบถามราคา
  price_en     text,
  featured     boolean not null default false,
  images       text[] not null default '{}',   -- ภาพตัดพื้นหลัง เรียงตามลำดับ
  scenes       text[] not null default '{}',   -- ภาพใช้งานจริง
  published    boolean not null default false,
  sort         int not null default 0,
  updated_at   timestamptz not null default now()
);

-- เนื้อหา
create table posts (
  id           bigint generated always as identity primary key,
  slug         text not null unique,
  title_th     text not null,
  title_en     text not null,
  excerpt_th   text not null default '',
  excerpt_en   text not null default '',
  body_th      text not null default '',       -- ย่อหน้าคั่นด้วยบรรทัดว่าง
  body_en      text not null default '',
  tag_th       text not null default '',
  tag_en       text not null default '',
  cover        text,
  inline       text[] not null default '{}',
  published_at date,                           -- null = ร่าง
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

-- ค่ามีชุดเดียว บังคับให้มีแถวเดียว
create table announcement (
  id           int primary key default 1 check (id = 1),
  enabled      boolean not null default false,
  seen_key     text not null,                  -- "แสดงอีกครั้งกับคนที่ปิดไปแล้ว" = สุ่มค่าใหม่
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

-- ฟอร์มติดต่อ
create table inquiries (
  id         bigint generated always as identity primary key,
  name       text not null,
  email      text not null,
  message    text not null,
  ip_hash    text not null,
  emailed_at timestamptz,                      -- null = ยังไม่ได้ส่งอีเมล
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index on inquiries (ip_hash, created_at);

-- สถิติคำค้น: ยอดรวมรายวันต่อคำ ไม่มี IP session หรือ cookie
create table search_queries (
  day          date not null,                  -- วันตามเวลาไทย
  query        text not null,                  -- ตัวพิมพ์เล็ก ตัดช่องว่าง ไม่เกิน 60 ตัว
  searches     int not null default 0,
  clicks       int not null default 0,
  zero_results int not null default 0,
  primary key (day, query)
);
```

### เหตุผลของการออกแบบ

| เรื่อง | ตัดสินใจ | เหตุผล |
|---|---|---|
| ข้อความสองภาษา | คอลัมน์ `_th` และ `_en` แยกกัน | ตั้ง `not null` ได้ตรง ค้นหาง่าย ตรงกับโครง `{ th, en }` เดิม |
| รูป | `text[]` ในแถว | ลำดับรูปมากับ array ไม่ต้องมีตารางรูปแยก |
| ลบหมวด แบรนด์ วัสดุ | `on delete restrict` | ลบได้เฉพาะเมื่อไม่มีสินค้าใช้ DB บังคับเอง หลังบ้านแค่แปลข้อผิดพลาดเป็นข้อความ |
| แบรนด์และวัสดุ | ตารางของตัวเอง | ผู้ดูแลระบบเลือกจากรายการ ตัวกรองไม่แตกเพราะพิมพ์ไม่ตรง วัสดุมีชื่อสองภาษา (lead เลือกทาง ก. 2026-10-15) |
| ประกาศ แคตตาล็อก | ตารางแถวเดียว | เปิดใช้ทีละอัน ถ้าต้องตั้งเวลาหลายประกาศค่อยเปลี่ยน |
| ราคา | ข้อความ null = สอบถามราคา | ห้ามใส่ราคาเอง รอข้อมูลจากลูกค้า |
| ฟอร์มติดต่อ | 3 ช่องตามฟอร์มเดิม (`components/ContactContent.tsx`) | เก็บลง DB ก่อนส่งอีเมล ถ้า SMTP ยังไม่พร้อม ข้อความไม่หาย |
| IP | เก็บ sha256 ของ `IP_SALT` ต่อด้วย IP | พอสำหรับนับจำนวนครั้ง ไม่เก็บข้อมูลส่วนบุคคลเกินจำเป็น · ผสม salt เพราะ IPv4 มีน้อยพอจะไล่ย้อนกลับได้ (lead อนุมัติ 2026-10-15) |
| สถิติการเข้าชม | ไม่มีตาราง | ใช้ Umami |
| สถิติคำค้น | `search_queries` ยอดรวมรายวัน | ไม่มี IP session หรือ cookie จึงเก็บได้กับทุกคนโดยไม่ต้องขอความยินยอม (lead เคาะ 2026-10-16) |
| audit log | ตารางเดียว ทุกการแก้ของหลังบ้านเขียนใน transaction เดียวกับการแก้ | แก้สำเร็จต้องมีบันทึก บันทึกไม่ได้ก็ไม่แก้ |

## 4. Seed

`db/seed.ts` รันครั้งเดียวบน DB ว่าง

| ตาราง | ที่มา |
|---|---|
| categories | `CATEGORIES` ใน `lib/products.ts` ชื่อจาก `lib/i18n.ts` |
| materials | 3 ค่าจาก `lib/i18n.ts`: ทองเหลือง/Brass, สเตนเลสสตีล/Stainless steel, เหล็กหล่อ/Cast iron |
| brands | ค่า `brand` ที่ไม่ซ้ำใน `lib/products.ts` (ตอนนี้มี KOHLER) |
| products | `products` ใน `lib/products.ts` ราคา "สอบถามราคา" แปลงเป็น null |
| posts | `posts` ใน `lib/posts.ts` (ข้อมูลตัวอย่าง) |
| projects, project_products | `projects` ใน `lib/projects.ts` จับคู่สินค้าด้วย slug |
| announcement | `ANNOUNCEMENT` ใน `lib/announcement.ts` ใช้ `id` เดิมเป็น `seen_key` |
| catalog | `CATALOG` ใน `lib/catalog.ts` |
| admin_users | บัญชีแรกสร้างด้วยสคริปต์ รับอีเมลและรหัสจาก env ไม่เขียนรหัสลงไฟล์ |

ไฟล์ `lib/*.ts` เดิมยังอยู่จนหน้าเว็บทุกหน้าย้ายไปอ่าน DB แล้วจึงลบ (การลบไฟล์ต้องได้อนุมัติ)

## 5. Login และความปลอดภัย

- รหัสผ่าน: `crypto.scrypt` พร้อม salt สุ่มต่อผู้ใช้ เทียบด้วย `timingSafeEqual`
- session: token สุ่ม 32 ไบต์ใน cookie `httpOnly`, `secure`, `sameSite=lax`, path `/` อายุ `SESSION_DAYS` (ค่าเริ่มต้น 14 วัน) DB เก็บแค่ sha256 ของ token · ไม่ได้ใช้เกิน `SESSION_IDLE_MIN` นาที (ค่าเริ่มต้น 120) ต้องเข้าสู่ระบบใหม่
- ออกจากระบบ: ลบแถว session
- ปิดบัญชี: `npm run db:disable-admin` ตั้ง `disabled_at` ลบ session ทั้งหมดของบัญชีนั้น และเขียน audit · เปิดใหม่ด้วย `npm run db:admin`
- กันเดารหัส: ผิดครบ 5 ครั้งต่อ IP ใน 15 นาที ล็อก ตอบเหมือนรหัสผิด
- ฟอร์มติดต่อ: ช่องดักบอท (honeypot) และไม่เกิน 3 ข้อความต่อ IP ใน 10 นาที ช่องติดต่อรับอีเมลหรือเบอร์โทรตามป้ายเดิมบนหน้าเว็บ ห้าม `<` และ `>` · นโยบายความเป็นส่วนตัวต้องผ่านฝ่ายกฎหมายก่อนฟอร์มเก็บข้อมูลจริงบน production
- อัปโหลด: รับเฉพาะ webp, jpeg, png ไม่เกิน 5 MB และ PDF ไม่เกิน 30 MB (ตรวจไบต์แรก `%PDF-`) ตั้งชื่อไฟล์ใหม่แบบสุ่ม ไม่ใช้ชื่อจากผู้ใช้
- ทุก query ใช้ parameter ของ `pg` ห้ามต่อ string
- หน้า admin ทุกหน้ายัง `noindex, nofollow`

## 6. Server Functions ต่อหัวข้อ

ทุกตัวตรวจ session ก่อน ยกเว้นฟอร์มติดต่อ บันทึกคำค้น และ login · ทุกการแก้ของหลังบ้านเขียน audit ใน transaction เดียวกัน

| หัวข้อ | ฟังก์ชัน |
|---|---|
| auth | login, logout |
| categories | list, create, update, delete (ล้มเมื่อมีสินค้า) |
| brands | list, create, update, delete (ล้มเมื่อมีสินค้า) |
| materials | list, create, update, delete (ล้มเมื่อมีสินค้า) |
| products | list (กรองหมวด แบรนด์ คำค้น), get, create, update, delete, setPublished |
| uploads | uploadImage คืน path ใต้ `/uploads/` (PDF ไปทาง Route Handler ของ catalog) |
| announcement | get, update, resetSeen (สุ่ม `seen_key` ใหม่) |
| posts | list, get, create, update, delete, publish, unpublish |
| projects | list, get, create, update, delete, setProducts |
| catalog | get, replacePdf (Route Handler `POST /api/catalog-pdf/`) |
| inquiries | submit (สาธารณะ), list, markHandled |
| search log | logSearch (สาธารณะ ส่งแล้วไม่รอผล) |

หน้าเว็บอ่านผ่าน query ฝั่ง server เฉพาะแถวที่ `published` หรือ `published_at` ไม่เป็น null

## 7. ไฟล์อัปโหลดและการสำรองข้อมูล

- ไฟล์เก็บใน `UPLOAD_DIR` นอกโฟลเดอร์โปรเจกต์ เพราะ `next start` ไม่ส่งไฟล์ที่เพิ่มเข้า `public/` หลัง build
- `app/uploads/[...path]/route.ts` ส่งไฟล์ ตรวจว่า path ไม่หลุดออกนอก `UPLOAD_DIR` บนเครื่องจริงให้ nginx ส่งโฟลเดอร์นี้ตรงได้
- ไฟล์เดิมใน `public/media/` ยังใช้ได้ path ใน DB ชี้ได้ทั้ง `/media/...` และ `/uploads/...`
- รูปที่อัปโหลดทุกรูปเก็บเป็น WebP (lead เคาะ 2026-10-15): หมุนตาม EXIF ย่อด้านยาวไม่เกิน 2560 px ไม่ขยายรูปเล็ก คุณภาพ 82 ตัด metadata ทั้งหมดรวมพิกัด GPS ปฏิเสธรูปเกิน 50 ล้านพิกเซล ใช้ `sharp` ตัวเดียวกับที่ Next ใช้ · ไม่แปลงไฟล์เดิมใน `public/media/` · วิดีโอยังไม่รับอัปโหลด ย้ายไป plan 2
- สำรอง: `pg_dump` ทุกวัน และสำรอง `UPLOAD_DIR` พร้อมกัน เก็บย้อนหลัง 14 วัน ทดสอบกู้ 1 ครั้งก่อนส่งมอบ

## 8. การทดสอบ

- สคริปต์ `check:db` ใหม่ รันกับ DB ทดสอบ: migrate จาก DB ว่าง, seed, ลบหมวดที่มีสินค้าต้องล้ม, session หมดอายุต้องใช้ไม่ได้, login เกินจำนวนต้องโดนกัน, path อัปโหลดที่มี `..` ต้องโดนปฏิเสธ
- แผน 2 เพิ่ม: audit ของ login logout และการปิดบัญชี, session ไม่ได้ใช้นาน, บทความและผลงานตรงกับข้อมูลเดิม, ร่างเปิดจากลิงก์ตรงไม่ได้, PDF ปลอม, ฟอร์มติดต่อ (ช่องดักบอท จำนวนต่อ IP ข้อมูลผิด), คำค้นที่เป็นอีเมลหรือเบอร์โทรไม่ถูกเก็บ, ล้างข้อมูลเก่าด้วยแถวย้อนวันที่
- `check:overflow` ไม่ไล่หน้าหลังบ้าน เพราะต้อง login ในสคริปต์ หน้าหลังบ้านตรวจด้วย browser ทีละงาน
- `check:filter`, `check:search`, `check:overflow` เดิมต้องผ่านหลังหน้าเว็บย้ายไปอ่าน DB
- `npx tsc --noEmit` และ `npm run build` ผ่าน

## 9. สมมติฐานที่ยังไม่ยืนยัน

- ที่ตั้ง DB ตามข้อ 2
- แยกแบรนด์เป็นตาราง (เสนอแล้ว lead ยังไม่ตอบชัด)
- หน้าขั้นตอนออกแบบ ช่วงราคา KOL เนื้อหาเขียนในโค้ด ไม่มีหน้าแก้ในหลังบ้าน
- จำนวนคนในทีม

## 10. ความเสี่ยง

- Vercel preview ของแต่ละ PR จะใช้ไม่ได้เมื่อหน้าเว็บต้องต่อ DB ทีมตรวจงานบนเครื่องทดสอบแทน
- การสร้างภาพแต่ละหน้าจาก PDF ด้วย `scripts/build-media.sh` ไม่รันบน server (ต้องใช้ pdftoppm และ cwebp และต้องจำกัดหน่วยความจำตาม `docs/pm/standards.md`) ตัดสินแล้ว (2026-10-16): ภาพรายหน้าใน `public/media/catalog` ใช้เฉพาะกับไฟล์ที่สร้างภาพชุดนั้น เปลี่ยน PDF แล้วหน้าแคตตาล็อกให้เปิด PDF ตรง และหน้าแรกซ่อนภาพปก
- เครื่องทดสอบต้องพร้อม 21 ต.ค. ไม่งั้น deploy รอบ 1 และวันที่ผู้ดูแลระบบเริ่มเพิ่มสินค้าเลื่อนตาม
- เนื้อหาจากลูกค้ามาช้า ทางสำรองอยู่ในแผนทีมหัวข้อ 04

## 11. ส่วนที่เพิ่มในแผน 2 (16 ตุลาคม 2569)

แผนงาน: `docs/superpowers/plans/2026-10-16-backend-content-security.md`

### 11.1 Audit log

- บันทึก: login สำเร็จ, ออกจากระบบ, ปิดบัญชี และทุกการเพิ่ม แก้ ลบ เผยแพร่ ซ่อน อัปโหลด ของหลังบ้าน (สินค้า หมวด แบรนด์ วัสดุ ประกาศ ไฟล์ บทความ ผลงาน แคตตาล็อก ข้อความติดต่อ)
- login ไม่สำเร็จยังอยู่ใน `login_attempts` ตามเดิม
- `adminAction` รันการแก้กับการเขียน audit ใน transaction เดียว และส่ง id ของผู้ดูแลให้ action
- `detail` เก็บแค่สิ่งที่ช่วยอ่านย้อนหลัง เช่นชื่อหรือ slug ไม่เก็บข้อมูลส่วนบุคคลของคนนอก
- ยังไม่มีหน้าดูในหลังบ้าน อ่านด้วย psql

### 11.2 สถิติคำค้น

- เก็บกับทุกคน ไม่ต้องขอความยินยอม เพราะเป็นยอดรวมรายวัน ไม่มี IP session หรือ cookie (lead เคาะ 2026-10-16)
- นับตอนกดผลค้นหา (ค้น 1 กด 1) หรือตอนปิดแผงค้นหาที่มีคำค้นโดยไม่กด (ค้น 1 และไม่พบผล 1 เมื่อผลเป็น 0) นับครั้งเดียวต่อการเปิดแผง
- ฝั่ง server: ตัวพิมพ์เล็ก ตัดช่องว่างหัวท้าย ช่องว่างซ้อนเหลือช่องเดียว ไม่เกิน 60 ตัว ไม่เก็บคำสั้นกว่า 2 ตัว คำที่ดูเหมือนอีเมล คำที่มีตัวเลขติดกันตั้งแต่ 8 หลัก และคำที่มี `<` หรือ `>`
- คำใหม่ไม่เกิน 5,000 คำต่อวัน กันบอทยิงคำสุ่ม คำที่มีแล้วนับต่อได้
- ส่งแล้วไม่รอผล DB ล่มการค้นหายังใช้ได้
- หน้านโยบายความเป็นส่วนตัวมีประโยคบอกว่าเก็บยอดนับคำค้นแบบไม่ระบุตัวบุคคล

### 11.3 Session หมดเวลาเมื่อไม่ใช้งาน

- ไม่ได้ใช้เกิน `SESSION_IDLE_MIN` นาที (ค่าเริ่มต้น 120) ใช้ไม่ได้ ต้องเข้าสู่ระบบใหม่
- `last_seen_at` เขียนไม่เกินทุก 5 นาที ไม่ให้ทุกการกดเขียน DB
- อายุสูงสุด `SESSION_DAYS` ยังอยู่

### 11.4 สคริปต์ปิดบัญชี

- `npm run db:disable-admin` อ่าน `ADMIN_EMAIL` จาก env แบบเดียวกับ `db:admin`
- ตั้ง `disabled_at` ลบ session ทั้งหมด และเขียน audit (`user_id` เป็น null เพราะสคริปต์เป็นผู้ทำ) ในคำสั่ง SQL เดียว
- `.env` บนเครื่องพัฒนามี `ADMIN_EMAIL` ของบัญชีพัฒนา ต้องส่ง `ADMIN_EMAIL=...` นำหน้าคำสั่งทุกครั้ง
- เปิดบัญชีใหม่ด้วย `npm run db:admin` อีเมลเดิม รหัสใหม่

### 11.5 ระยะเก็บข้อมูลและการล้าง

`npm run db:prune` รันวันละครั้งด้วย cron บน server (ตั้งตอน deploy)

| ข้อมูล | เก็บ |
|---|---|
| `login_attempts` | 90 วัน |
| `sessions` | ลบเมื่อหมดอายุ หรือไม่ได้ใช้เกิน `SESSION_IDLE_MIN` |
| `audit_log` | 365 วัน |
| `search_queries` | 400 วัน (เทียบปีต่อปีได้) |
| `inquiries` | ไม่ลบ รอฝ่ายกฎหมายกำหนดระยะ |
