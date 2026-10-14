# ITERRA backend: Next.js + PostgreSQL

ร่างวันที่ 15 ตุลาคม 2569 · สถานะ: รอ lead ตรวจ

## 1. เป้าหมายและขอบเขต

ผู้ดูแลระบบของลูกค้าจัดการสินค้า หมวด แบรนด์ วัสดุ ประกาศ บทความ ผลงาน แคตตาล็อก และอ่านข้อความจากฟอร์มติดต่อได้เองผ่านหลังบ้าน หน้าเว็บแสดงข้อมูลจาก DB ทันทีที่บันทึก

- กำหนดการ: งานพัฒนาจบ 30 ต.ค. 2569 สาธิต 31 ต.ค. ส่งมอบ 14 พ.ย. ลูกค้าใช้งานจริง 20 พ.ย.
- งานรายวันต่อบทบาท: `docs/plan/iterra-team-plan.html`
- ปฏิทินที่ส่งลูกค้า: `docs/plan/iterra-client-timeline.html`
- ไม่อยู่ในขอบเขต: ห้องจำลอง 3D (`app/lab/`, `components/room/`), สีผิวสินค้า (`lib/finishes.ts` เป็นข้อมูลเดโม อยู่ในโค้ดต่อ), สิทธิ์หลายระดับ, audit log, ตั้งเวลาประกาศ

## 2. สถาปัตยกรรม

- Next.js ตัวเดียวทำทั้งหน้าเว็บและหลังบ้าน รันด้วย `next start` บน Node
- เลิก `output: 'export'` ใน `next.config.mjs` (ไฟล์ protected ต้องได้อนุมัติ)
- ต่อ DB ด้วย dependency ใหม่ 1 ตัว: `pg` (ต้องได้อนุมัติ) เขียน SQL ล้วน ไม่ใช้ ORM
- การแก้ข้อมูลจากหลังบ้านใช้ Server Functions แล้วเรียก `revalidatePath` ให้หน้าเว็บอัปเดต (ดู `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`)
- Route Handler ใช้เฉพาะ 2 จุด: ส่งไฟล์ที่อัปโหลด (`/uploads/...`) และ endpoint ที่ต้องรับ multipart ถ้า Server Function รับไม่ไหว
- `proxy.ts` (ชื่อใหม่ของ middleware ใน Next 16) ใช้แค่ redirect คนที่ไม่มี cookie ออกจาก `/admin/` การตรวจสิทธิ์จริงทำซ้ำทุก Server Function และทุกหน้า admin ตามที่เอกสาร Next บอกว่า proxy ไม่ใช่ที่สำหรับ authorization
- ที่ตั้ง DB (สมมติฐาน ยังไม่ยืนยัน): ตอนพัฒนาใช้ PostgreSQL 16 ในเครื่อง ตอนใช้งานจริงลง Node กับ PostgreSQL บน VPS ของทีมเครื่องเดียวกัน
- ค่าตั้ง: `DATABASE_URL`, `UPLOAD_DIR`, `SESSION_DAYS`, `SMTP_URL`, `INQUIRY_TO` อยู่ใน `.env` ห้าม commit

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

13 ตาราง และ `schema_migrations` ของตัว migrate

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
  token_hash text primary key,                 -- sha256 ของ token ใน cookie ไม่เก็บ token ตรง
  user_id    bigint not null references admin_users on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
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
| IP | เก็บ sha256 ของ IP | พอสำหรับนับจำนวนครั้ง ไม่เก็บข้อมูลส่วนบุคคลเกินจำเป็น |
| สถิติ | ไม่มีตาราง | ใช้ Umami |

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
- session: token สุ่ม 32 ไบต์ใน cookie `httpOnly`, `secure`, `sameSite=lax`, path `/` อายุ `SESSION_DAYS` (ค่าเริ่มต้น 14 วัน) DB เก็บแค่ sha256 ของ token
- ออกจากระบบ: ลบแถว session
- ปิดบัญชี: ตั้ง `disabled_at` session เดิมใช้ไม่ได้ทันที
- กันเดารหัส: เกิน 10 ครั้งต่อ IP ใน 15 นาที ตอบเหมือนรหัสผิด
- ฟอร์มติดต่อ: ช่องดักบอท (honeypot) และไม่เกิน 5 ข้อความต่อ IP ต่อชั่วโมง
- อัปโหลด: รับเฉพาะ webp, jpeg, png ไม่เกิน 5 MB และ PDF ไม่เกิน 30 MB ตั้งชื่อไฟล์ใหม่แบบสุ่ม ไม่ใช้ชื่อจากผู้ใช้
- ทุก query ใช้ parameter ของ `pg` ห้ามต่อ string
- หน้า admin ทุกหน้ายัง `noindex, nofollow`

## 6. Server Functions ต่อหัวข้อ

ทุกตัวตรวจ session ก่อน ยกเว้นฟอร์มติดต่อกับ login

| หัวข้อ | ฟังก์ชัน |
|---|---|
| auth | login, logout |
| categories | list, create, update, delete (ล้มเมื่อมีสินค้า) |
| brands | list, create, update, delete (ล้มเมื่อมีสินค้า) |
| materials | list, create, update, delete (ล้มเมื่อมีสินค้า) |
| products | list (กรองหมวด แบรนด์ คำค้น), get, create, update, delete, setPublished |
| uploads | uploadImage, uploadPdf คืน path ใต้ `/uploads/` |
| announcement | get, update, resetSeen (สุ่ม `seen_key` ใหม่) |
| posts | list, get, create, update, delete, publish, unpublish |
| projects | list, get, create, update, delete, setProducts |
| catalog | get, replacePdf |
| inquiries | submit (สาธารณะ), list, markHandled |

หน้าเว็บอ่านผ่าน query ฝั่ง server เฉพาะแถวที่ `published` หรือ `published_at` ไม่เป็น null

## 7. ไฟล์อัปโหลดและการสำรองข้อมูล

- ไฟล์เก็บใน `UPLOAD_DIR` นอกโฟลเดอร์โปรเจกต์ เพราะ `next start` ไม่ส่งไฟล์ที่เพิ่มเข้า `public/` หลัง build
- `app/uploads/[...path]/route.ts` ส่งไฟล์ ตรวจว่า path ไม่หลุดออกนอก `UPLOAD_DIR` บนเครื่องจริงให้ nginx ส่งโฟลเดอร์นี้ตรงได้
- ไฟล์เดิมใน `public/media/` ยังใช้ได้ path ใน DB ชี้ได้ทั้ง `/media/...` และ `/uploads/...`
- สำรอง: `pg_dump` ทุกวัน และสำรอง `UPLOAD_DIR` พร้อมกัน เก็บย้อนหลัง 14 วัน ทดสอบกู้ 1 ครั้งก่อนส่งมอบ

## 8. การทดสอบ

- สคริปต์ `check:db` ใหม่ รันกับ DB ทดสอบ: migrate จาก DB ว่าง, seed, ลบหมวดที่มีสินค้าต้องล้ม, session หมดอายุต้องใช้ไม่ได้, login เกินจำนวนต้องโดนกัน, path อัปโหลดที่มี `..` ต้องโดนปฏิเสธ
- `check:filter`, `check:search`, `check:overflow` เดิมต้องผ่านหลังหน้าเว็บย้ายไปอ่าน DB
- `npx tsc --noEmit` และ `npm run build` ผ่าน

## 9. สมมติฐานที่ยังไม่ยืนยัน

- ที่ตั้ง DB ตามข้อ 2
- แยกแบรนด์เป็นตาราง (เสนอแล้ว lead ยังไม่ตอบชัด)
- หน้าขั้นตอนออกแบบ ช่วงราคา KOL เนื้อหาเขียนในโค้ด ไม่มีหน้าแก้ในหลังบ้าน
- จำนวนคนในทีม

## 10. ความเสี่ยง

- Vercel preview ของแต่ละ PR จะใช้ไม่ได้เมื่อหน้าเว็บต้องต่อ DB ทีมตรวจงานบนเครื่องทดสอบแทน
- การสร้างภาพแต่ละหน้าจาก PDF ด้วย `scripts/build-media.sh` ยังไม่ได้ตรวจว่ารันบน server ได้ ถ้าไม่ได้ หน้าแคตตาล็อกเปิด PDF ตรงไปก่อน
- เครื่องทดสอบต้องพร้อม 21 ต.ค. ไม่งั้น deploy รอบ 1 และวันที่ผู้ดูแลระบบเริ่มเพิ่มสินค้าเลื่อนตาม
- เนื้อหาจากลูกค้ามาช้า ทางสำรองอยู่ในแผนทีมหัวข้อ 04
