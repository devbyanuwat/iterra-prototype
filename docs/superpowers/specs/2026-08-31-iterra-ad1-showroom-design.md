# ITERRA Showroom — AD-1 "โชว์รูมตอนดึก"

Design spec · 2026-08-31 · branch `prototype-uxui`

## 1. Goal

เว็บโชว์สินค้าครัว/สุขภัณฑ์พรีเมียม สำหรับพรีเซนต์ลูกค้า. บรีฟลูกค้า 3 ข้อ:

1. กดสวอตช์สีแล้วรูปสินค้าเปลี่ยนเฉดผิวเคลือบ
2. scroll แล้วมี motion ตอบสนอง (อ้างอิง Shopify Winter Editions)
3. ไม่มีตะกร้า/ไม่มีการซื้อ — แสดงสินค้า + รายละเอียดเท่านั้น

Asset ดึงจาก kohler.co.th ใช้เป็น mock สำหรับพรีเซนต์

### Non-goals

- ไม่มี cart / checkout / ราคา (ใช้ "สอบถามราคา")
- ไม่มี backend, ไม่มี CMS — static export
- ไม่ขึ้น production ด้วยรูป Kohler (ลิขสิทธิ์ — ดู §8)
- ไม่แตะ branch `main`

## 2. Art direction

ที่มา: วิเคราะห์ 6 ไซต์จาก GSAP showcase (nickho-motorsports, michaelgatt, office.graffico,
harshdayal, edolus, square43). DNA ร่วม: entry gate มี %, ฐาน mono + accent เดียว,
ตัวอักษร display คือเลย์เอาต์ไม่ใช่ของประดับ, micro-caps tracking กว้างเป็นเสียง UI,
**หนึ่งกิมมิกที่ทุ่มสุด ไม่ใช่ห้าเอฟเฟกต์**

กิมมิกเดียวของงานนี้: **สินค้าคือวัตถุในห้องมืด และผิวเคลือบที่เลือกคือสีของแสงในห้องนั้น**
ผูกบรีฟข้อ 1 เข้ากับงานออกแบบโดยตรง แทนที่จะเป็นฟีเจอร์แปะข้าง

### Tokens

| token | ค่า | ใช้ที่ |
|---|---|---|
| `base` | `#08090A` | พื้นหลังหลัก |
| `surface` | `#111315` | แผงสเปก, การ์ด |
| `line` | `#FFFFFF` @ 6–12% | เส้นคั่น |
| `cream` | `#EDE9E3` | ตัวอักษรหลัก |
| `dim` | `#6E7275` | micro-caps, label |
| `accent` | **ตัวแปร** — ค่าเฉลี่ยสีจากรูป swatch ของ finish ที่เลือก | เส้น kicker, ตัวเลข index, ปุ่ม, spotlight |

`accent` เป็น CSS custom property `--accent` ที่ `:root`. กดสวอตช์ = tween ค่าตัวแปรนี้.
**พื้นหลังไม่เปลี่ยน** — เปลี่ยนแค่ accent (ตามที่ตกลงไว้: ไม่พลิกธีมทั้งหน้า)

### Type

| บทบาท | family | หมายเหตุ |
|---|---|---|
| Display (EN + ตัวเลข) | `Archivo` variable `wdth 62..125, wght 100..900` | ยืด/บีบความกว้างได้ → พาดหัวล้นเฟรม, ตัวเลข index ยักษ์ |
| หัวเรื่องไทย + body + UI | `Anuphan` variable `wght 200..700` | Cadson Demak, รองรับไทย+ละติน |
| micro-caps | `Archivo` 500, 10px, `letter-spacing 0.22em`, uppercase | มี `widest2` ใน tailwind config อยู่แล้ว |

โหลดผ่าน `next/font/google` (self-host, ไม่มี FOUT, ไม่ยิง request ออกนอก)

## 3. Data pipeline

### 3.1 สิ่งที่ยืนยันแล้วจาก kohler.co.th

- `robots.txt` บล็อกเฉพาะ `/results/*` — `/browse/*`, `/productDetails/*`, `/colorpalette/*` ดึงได้
- listing + PDP เป็น JS-rendered → ต้อง Playwright (มีในเครื่อง v1.61.1)
- PDP: `/productDetails/{model}?skuid={model}-{finish}`
- รูปสินค้า: `s7d4.scene7.com/is/image/kohlerchina/{model}-{finish}?wid=1400&fmt=png`
- รูป swatch: `kohler.scene7.com/is/image/PAWEB/swatch_{finish}?wid=88`
- รหัส finish ทางการ 12 เฉด จาก `/colorpalette/bathroom-faucet-finishes.html`:
  `0` White · `96` Biscuit · `CP` Polished Chrome · `BN` Vibrant Brushed Nickel ·
  `SN` Vibrant Polished Nickel · `BV` Vibrant Brushed Bronze · `2BZ` Oil-Rubbed Bronze ·
  `AF` Vibrant French Gold · `BGD` Moderne Brushed Gold · `PGD` Moderne Polished Gold ·
  `RGD` Vibrant Rose Gold · `TT` Vibrant Titanium
  (kitchen sink เพิ่ม `ST` Stainless Steel, `NA`)
- ตัวอย่างที่มี finish เยอะ: `K-77959T-4A` = 6 เฉด (CP, AF, RGD, BN, BRD, BRT)

### 3.2 ปัญหาพื้นขาว (แก้แล้ว)

รูป Kohler พื้นขาวทึบ. `?fmt=png-alpha` คืน alpha channel มาแต่ถมขาว.
`image.mask=1` ใน Scene7 props แต่ `op_maskUse=alpha` ก็ยังทึบ. → วางบนพื้นดำเป็นกล่องขาว

**วิธีแก้ที่ทดสอบแล้ว:** flood-fill ลอกขาวจาก **ขอบภาพ** (ไม่ใช่ threshold ทั้งภาพ) ด้วย PIL

- tolerance `min(r,g,b) >= 252`, 4-connectivity, seed จากทุกพิกเซลขอบที่เป็นขาว
  (246 ยังกินขอบอ่างเซรามิกขาวในชุดจริง — worker ปรับขึ้นแล้ว)
- ผลทดสอบ: ลอกพื้นได้ 89% ทั้งก๊อกโครเมียมและอ่างเซรามิกขาว
- **อ่างเซรามิกขาวรอด** — เก็บพิกเซลขาวด้านใน 1,849 จุด เพราะ fill เดินจากขอบเข้ามา
  ไม่ได้ลบทุกพิกเซลขาวในภาพ
- artifact เหลือ: เงาที่อบมากับรูปกลายเป็นรอยจางใต้ฐาน → หลัง flood-fill ทำ alpha ramp
  กับพิกเซล near-white (`min >= 236`) ที่ยังเหลือและอยู่ต่ำกว่า bounding box ของวัตถุ

### 3.3 Scraper

`scripts/scrape-kohler.mjs` — รันครั้งเดียวตอน build, ไม่กระทบ runtime

```
1. Playwright เปิด listing ทุกหมวด (kitchen sinks/faucets, bathroom faucets/showering/
   toilets/lavatories)
2. ต่อ product เก็บ: model, ชื่อไทย, ชื่ออังกฤษ (/en/), ชุด finish codes, spec rows, PDF spec sheet
3. เก็บ **ทุก SKU ที่เว็บมี** (~191 ตัว ทั้ง 6 หมวด) ไม่คัดออก
   จัดเรียงในเว็บโดยให้ตัวที่ finish เยอะอยู่หน้าแรก (featured)
4. ต่อ finish โหลด PNG 1400px จาก scene7.
   fallback เมื่อ 403 (พบใน BRD/BRT): อ่าน asset id `PAWEB/{id}_rgb` จาก DOM ของ PDP
5. ส่งเข้า scripts/key-white.py → PNG โปร่ง → sharp → webp 1400/700
6. โหลด swatch chip ต่อ finish + คำนวณสีเฉลี่ย → hex สำหรับ --accent
7. เขียน lib/products.generated.ts + public/products/<slug>/<finish>.webp
```

ไฟล์ที่ scraper แตะ: `scripts/*`, `public/products/*`, `lib/products.generated.ts` เท่านั้น

### 3.4 Type

```ts
export type FinishCode = string;              // 'CP' | 'AF' | ...
export type Finish = {
  code: FinishCode;
  name: { th: string; en: string };
  swatch: string;                             // /products/<slug>/swatch-<code>.webp
  accent: string;                             // '#C9A227' — เฉลี่ยจาก swatch
  image: string;                              // /products/<slug>/<code>.webp
};
export type Product = {
  slug: string; model: string;                // 'K-77959T-4A'
  category: 'kitchen' | 'bath';
  name: { th: string; en: string };
  desc: { th: string; en: string };
  specs: { label: string; value: string }[];
  finishes: Finish[];                         // >= 2 เสมอ
  featured?: boolean;
};
```

`lib/products.ts` เดิม (mock 12 ชิ้น) ถูกแทนที่ด้วย re-export จาก generated
เก็บ type เดิมไว้ให้ component ที่ยัง import อยู่ compile ผ่าน

## 4. Components

ของเดิมที่เก็บไว้: `SmoothScroll` (Lenis), `Reveal`, `CountUp`, `LangProvider`, `JsonLd`

ของเดิมที่ลบ: `components/Placeholder.tsx`, `components/artwork.tsx` (procedural art จาก commit
`3e57f0b` — ไม่ต้องแล้วเมื่อมีรูปจริง). ลบพร้อมกันด้วย: `scripts/check-artwork.mjs` และ npm script
`check:artwork` ที่ชี้ไปหามัน. **ต้องลบ import ทุกจุดก่อน** ไม่งั้น build พัง — เช็คด้วย
`grep -rn "Placeholder\|artwork" app components` ให้เหลือศูนย์

| component | หน้าที่ | ขอบเขต |
|---|---|---|
| `Preloader` | entry gate: logo + % + "เข้าสู่โชว์รูม" · ปลดล็อกแล้วจำใน sessionStorage | ใหม่ |
| `FinishProvider` | ถือ finish ที่เลือกต่อ product · tween `--accent` · `prefers-reduced-motion` = ตัดทันที | ใหม่ |
| `FinishSwatches` | แถวสวอตช์ · keyboard นำทางได้ (arrow keys, roving tabindex) · `aria-pressed` | ใหม่ |
| `ProductStage` | รูปสินค้า + crossfade ระหว่าง finish + spotlight ที่รับสี accent | ใหม่ |
| `SplitReveal` | หัวเรื่องแยกบรรทัด/คำ เผยตาม scroll (GSAP SplitText — ฟรีตั้งแต่ 3.13) | ใหม่ |
| `Hero` | pin + ส่งต่อสินค้าชิ้นแรกเข้าสู่ section ถัดไป | รื้อ |
| `PinnedStory` | 3 สไลด์ scrub | ปรับ token |
| `HorizontalGallery` | การ์ดแนวนอนขับด้วย scroll แนวตั้ง | ปรับ token |
| `TiltCard` | tilt ±6° | คงไว้ |
| `ProductDetail` | หน้าสินค้า: stage + swatch + สเปก + แบบแปลน | รื้อ |
| `SpecDrawing` | section แบบแปลน — เส้นบอกระยะวาดตัวเองตอน scroll | ใหม่ |

`SpecDrawing` = ส่วนเดียวที่ยืมจาก AD-2 (blueprint). ที่มาข้อมูล: PDF spec sheet บน
`techcomm.kohler.com` มีเส้นบอกระยะจริง. เวอร์ชันนี้วาดเส้นระยะเป็น SVG จากค่าใน `specs`
ไม่ฝัง PDF

## 5. Motion

ทั้งหมดบน GSAP + ScrollTrigger + Lenis (มีอยู่แล้ว). **อัป gsap 3.12.5 → 3.15.x**
เพื่อได้ SplitText/ScrollSmoother ที่ฟรีตั้งแต่ 3.13 (Webflow เปิดฟรีทุก plugin)
ไม่เพิ่ม dependency ตัวอื่น — ไม่มี anime.js, ไม่มี motion/framer

| จังหวะ | เอฟเฟกต์ |
|---|---|
| เข้าเว็บ | preloader % → พาดหัวเผยทีละบรรทัด (SplitText) |
| hero scroll | สินค้า scale + ลอยขึ้น, พาดหัวยืด `wdth` 88→125 ตาม progress, spotlight หรี่ |
| section ต่อ | pin + scrub เปลี่ยนสินค้าทีละชิ้น, ตัวเลข index นับ |
| แกลเลอรี | scroll แนวตั้งขับการ์ดแนวนอน + perspective |
| กด swatch | crossfade รูป 420ms `power2.inOut` + tween `--accent` พร้อมกัน |
| หน้า detail | เส้นบอกระยะ `SpecDrawing` วาดตัวเอง (`strokeDashoffset`) |
| cursor | จุดตามเมาส์ ขยายเมื่ออยู่เหนือ swatch (desktop เท่านั้น) |

กติกาเดิมที่ต้องรักษา: ใช้ `transform`/`opacity` เท่านั้น, ปิด parallax หนักบนมือถือ
ผ่าน `gsap.matchMedia`, เคารพ `prefers-reduced-motion`

## 6. Pages

| route | เปลี่ยนอะไร |
|---|---|
| `/` | hero AD-1 + pinned showcase + แกลเลอรี + สรุปคอลเลกชัน |
| `/products` | grid มืด, การ์ดมีสวอตช์ย่อ, ฟิลเตอร์ ครัว/ห้องน้ำ |
| `/products/[slug]` | stage + swatch + สเปก + `SpecDrawing` |
| `/about`, `/articles`, `/articles/[slug]`, `/contact` | ปรับ token ให้เข้าธีม ไม่รื้อโครง |

`app/sitemap.ts`, `app/robots.ts`, `JsonLd` ต้องยังทำงาน — slug เปลี่ยนตาม generated data

## 7. Acceptance criteria

1. `npm run build` ผ่าน, static export ออก `out/` ได้
2. สินค้าที่มี finish >= 2 ต้องกดสวอตช์แล้วรูปเปลี่ยนจริง (ไม่ใช่ tint ด้วย CSS).
   สินค้าที่มี finish เดียว **ไม่แสดงแถวสวอตช์** — แสดงชื่อเฉดเป็น label แทน
   (ปุ่มเดียวที่กดไม่ได้ = ดูเหมือนพัง)
3. รูปสินค้าทุกใบพื้นโปร่ง — ไม่มีกล่องขาวบนพื้น `#08090A` ตรวจด้วยสายตาทุกใบ
4. อ่างเซรามิกขาว/สินค้าสีขาว ยังเห็นขอบชัดบนพื้นดำ
5. เปิด `prefers-reduced-motion` แล้วไม่มี animation ค้าง เนื้อหาอ่านได้ครบ
6. มือถือ 390px: ไม่มี horizontal overflow, parallax หนักถูกปิด
7. คีย์บอร์ดเลื่อนสวอตช์ได้ด้วยลูกศร, focus ring มองเห็นบนพื้นดำ
8. ไม่มีคำว่าตะกร้า/ซื้อ/add to cart ที่ไหนใน UI
9. Lighthouse perf >= 85 บน `/products/[slug]` (desktop)

## 8. Constraints & risks

| # | เรื่อง | สถานะ |
|---|---|---|
| 1 | รูปเป็นลิขสิทธิ์ Kohler | ใช้พรีเซนต์เท่านั้น · ห้าม deploy public · ใส่หมายเหตุใน README |
| 2 | **ไล่ครบ 191 SKU แล้ว: มี finish > 1 เฉพาะ ก๊อกห้องน้ำ (37) และ ฝักบัว/วาล์ว (31). ครัว 0/16 · โถสุขภัณฑ์ 0/30 · อ่างล้างหน้า 0/44** | สวอตช์โผล่เฉพาะตัวที่มีหลายเฉด · ตัวเฉดเดียวแสดงชื่อเฉดเป็น label (AC ข้อ 2) |
| 3 | **URL รูปสร้างจาก SKU ตรง ๆ ไม่ได้ (403 ทุกตัว ไม่ใช่แค่ BRD/BRT)** | อ่าน asset id ต่อ finish จาก DOM ของ PDP เสมอ |
| 4 | Kohler เปลี่ยน DOM เมื่อไหร่ scraper พัง | รันครั้งเดียว, commit ผลลัพธ์ลง repo, ไม่รันตอน build |
| 5 | flood-fill พลาดกับสินค้าที่ขอบจางมาก | AC ข้อ 3–4 ให้ตรวจด้วยสายตาทุกใบ, ตัวที่พังคัดออก |
| 6 | Contributor ต้องเป็น nattakit, ห้ามแตะ `main` | local git config ตั้งเป็น `NATX0XD` แล้ว · ทำงานบน `prototype-uxui` |

## 9. Order of work

```
A. tokens + fonts (tailwind, globals, layout)      ← ไม่ชนใคร
B. scraper + keying + generated data               ← ไม่ชนใคร (scripts/, public/, lib/)
C. FinishProvider + FinishSwatches + ProductStage  ← ต้องรอ B (ต้องมี type + รูป)
D. Preloader + SplitReveal + Hero + PinnedStory    ← ต้องรอ A
E. pages + SpecDrawing                             ← ต้องรอ C, D
F. QA: AC ทั้ง 9 ข้อ                                ← ท้ายสุด
```

A ‖ B ขนานได้ (ไฟล์ไม่ทับ). C ‖ D ขนานได้หลัง A,B เสร็จ
