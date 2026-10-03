# ITERRA — Prototype เว็บโชว์สินค้า (ครัว & สุขภัณฑ์พรีเมียม)

เดโม่สำหรับนำเสนอลูกค้า — ไม่มี backend จริง · Next.js (App Router) + Tailwind + GSAP/ScrollTrigger + Lenis · static export ได้

## รัน
```bash
npm install
npm run dev -- -p 4100   # http://localhost:4100 (ด่าน check:overflow ใช้พอร์ตนี้)
npm run build      # static export → โฟลเดอร์ out/
npm run check:overflow   # ทุกหน้า × 375/768/1024/1200 × motion/reduced-motion ต้องไม่ล้นจอ ไม่มี console error ภาพทุกไฟล์โหลดได้ (เปิด dev server ก่อน · Node 22+)
npm run check:filter     # ตรรกะตัวกรองหน้าสินค้ารวม (ไม่ต้องเปิด server · Node 22.6+)
```

## ภาพ
`scripts/build-media.sh hero|catalog|gallery|products|scenes|all` สร้างไฟล์ใน `public/media/` จากต้นฉบับนอก git · ต้องมี `magick`, `cwebp`, `pdfimages`, `python3` + Pillow และ macOS 14 ขึ้นไป (`scripts/cutout.swift` ตัดพื้นหลังด้วย Vision)

## จุดเปลี่ยน mock → ของจริง
| ไฟล์ | เปลี่ยนอะไร |
|---|---|
| `lib/products.ts` | สินค้า (ชื่อ TH/EN, สเปก, หมวด, path ภาพ) |
| `lib/finishes.ts` | สีผิวตัวอย่างเพื่อเดโม (`demo: true`) → เปลี่ยนเป็นสีที่มีจำหน่ายจริง หรือลบออก |
| `lib/posts.ts` | บทความ (ภาพปก + ภาพในเนื้อหา 2 ภาพ) |
| `lib/site.ts` | โดเมนจริง, ชื่อ, ที่อยู่, เบอร์ติดต่อ (มีผลกับ SEO/sitemap/JSON-LD) |
| `lib/i18n.ts` | คำแปล TH/EN ทั้งเว็บ |
| `components/Placeholder.tsx` | ส่ง `src` = แสดงภาพจริง (`fit="contain"` ภาพสินค้าตัดพื้นหลัง, `cover` ภาพบรรยากาศ) · ไม่ส่ง = กรอบเทารอภาพ |
| `components/ContactContent.tsx` | ต่อฟอร์มเข้า endpoint จริง + ฝัง Google Maps |

## โครง motion
- `components/SmoothScroll.tsx` — Lenis lerp 0.08 ผูก gsap.ticker
- `components/Hero.tsx` — parallax 3 ชั้น + scale 1→1.08
- `components/ImageWall.tsx` — ผนังภาพ 3 คอลัมน์ เลื่อนเร็วไม่เท่ากันตาม scroll (มือถือ = คอลัมน์เดียวภาพนิ่ง)
- `components/TiltCard.tsx` — 3D tilt ±6° + เงาขยับ
- `components/Reveal.tsx` / `CountUp.tsx` / `ParallaxImage.tsx`

ทุกเอฟเฟกต์ใช้ transform/opacity เท่านั้น, ปิด parallax หนักบนมือถือ, เคารพ `prefers-reduced-motion`
