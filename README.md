# ITERRA — Prototype เว็บโชว์สินค้า (ครัว & สุขภัณฑ์พรีเมียม)

เดโม่สำหรับนำเสนอลูกค้า — ไม่มี backend จริง · Next.js (App Router) + Tailwind + GSAP/ScrollTrigger + Lenis · static export ได้

## รัน
```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static export → โฟลเดอร์ out/
```

## จุดเปลี่ยน mock → ของจริง
| ไฟล์ | เปลี่ยนอะไร |
|---|---|
| `lib/products.ts` | สินค้า 12 ชิ้น (ชื่อ TH/EN, สเปก, หมวด) |
| `lib/posts.ts` | บทความ 6 ชิ้น |
| `lib/site.ts` | โดเมนจริง, ชื่อ, ที่อยู่, เบอร์ติดต่อ (มีผลกับ SEO/sitemap/JSON-LD) |
| `lib/i18n.ts` | คำแปล TH/EN ทั้งเว็บ |
| `components/Placeholder.tsx` | ทุกจุดที่เห็นกรอบเทา = รอภาพจริง → แทนด้วย `next/image` |
| `components/ContactContent.tsx` | ต่อฟอร์มเข้า endpoint จริง + ฝัง Google Maps |

## โครง motion
- `components/SmoothScroll.tsx` — Lenis lerp 0.08 ผูก gsap.ticker
- `components/Hero.tsx` — parallax 3 ชั้น + scale 1→1.08
- `components/PinnedStory.tsx` — pin + scrub 3 สไลด์ (มือถือ = บล็อกธรรมดา)
- `components/HorizontalGallery.tsx` — vertical scroll ขับการ์ดแนวนอน + perspective depth
- `components/TiltCard.tsx` — 3D tilt ±6° + เงาขยับ
- `components/Reveal.tsx` / `CountUp.tsx` / `ParallaxImage.tsx`

ทุกเอฟเฟกต์ใช้ transform/opacity เท่านั้น, ปิด parallax หนักบนมือถือ, เคารพ `prefers-reduced-motion`
