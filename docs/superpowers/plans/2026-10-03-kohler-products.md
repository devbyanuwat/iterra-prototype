# Real Kohler Kitchen Products Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Swap the 7 mock products for the 10 real Kohler Thailand kitchen products with cut-out photos, fill every other image slot (story, about, articles) with real kitchen photos, and keep the home wall to kitchens only.

**Architecture:** A shell pipeline (`scripts/build-media.sh products|scenes`) produces committed `.webp` files. `Placeholder` learns to render a real image (`src`, `fit`) in the same ratio box, and `ParallaxImage` passes those through, so every page keeps its layout and motion. Data files (`lib/products.ts`, `lib/posts.ts`) point at the new files.

**Tech Stack:** Next.js 16 static export, React 19, Tailwind 3, GSAP ScrollTrigger (unchanged), bash + curl + macOS Vision (Swift) + cwebp + ImageMagick + pdfimages.

**Spec:** `docs/superpowers/specs/2026-10-03-kohler-products-design.md`

## Global Constraints

- Branch `preview-kohler-products`. No PR, no merge, no deploy; do not touch `main`, `preview-initial`, `preview-parallax-wall`.
- No new npm dependencies. Images are plain `<img>` (the export uses `images: { unoptimized: true }`, same as `components/ImageWall.tsx`).
- Theme tokens only (`paper`, `ink`, `warm-100..500`); no raw hex colours in components.
- No motion changes: `ParallaxImage`/`Reveal` behaviour, speeds and reduced-motion handling stay as they are.
- No em-dash (`—`) or en-dash (`–`) in any new string the site renders.
- Implementers commit only (no push, no squash, no subagents). Commit trailer exactly: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- The dev server already runs on http://localhost:4100 from this checkout (HMR); do not start another one.
- Verification commands for every code task:
  - `npx tsc --noEmit 2>&1 | grep -v '\.next/types' || true` prints nothing
  - `npm run build` succeeds
  - `npm run check:overflow` prints `ผ่าน`
  - media check prints nothing: `grep -rhoE "/media/(products|scenes)/[a-z0-9-]+\.webp" lib components app | sort -u | while read p; do test -f "public$p" || echo "MISSING $p"; done`

---

### Task 1: Media pipeline and generated files (controller runs this: needs visual review of every cut-out)

**Files:**
- Create: `scripts/cutout.swift`
- Modify: `scripts/build-media.sh` (add `products` and `scenes`, extend the `case`)
- Create (generated): `public/media/products/*.webp` (13 files), `public/media/scenes/*.webp` (23 files)

**Interfaces:**
- Produces: `/media/products/<slug>-1.webp` for the 10 slugs in Task 2, `/media/products/elate-13963t-c4-scene-{2,3,4}.webp`, `/media/scenes/{story-1,story-2,story-3,about-hero,about-1,about-2,about-3,about-4}.webp`, and `/media/scenes/<post-slug>.webp`, `<post-slug>-1.webp`, `<post-slug>-2.webp` for the 5 post slugs.

- [ ] **Step 1: Add the Vision cut-out helper** `scripts/cutout.swift`

```swift
// ตัดพื้นหลังภาพสินค้าด้วย Vision ของ macOS (ไม่ต้องลงอะไรเพิ่ม) แล้ว crop ชิดตัวสินค้า
// ใช้: swift scripts/cutout.swift in.png out.png
// ข้อจำกัด: รูเล็ก ๆ ที่ล้อมด้วยตัวสินค้า (รูก๊อกบนซิงก์ รูท่อ) ยังเป็นสีพื้นเดิม — วางบนพื้นสีอ่อนจะไม่เห็น
import Vision
import CoreImage

let src = URL(fileURLWithPath: CommandLine.arguments[1])
let dst = URL(fileURLWithPath: CommandLine.arguments[2])
let handler = VNImageRequestHandler(url: src)
let request = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([request])
guard let result = request.results?.first else { fputs("no foreground: \(src.path)\n", stderr); exit(1) }
let masked = try result.generateMaskedImage(ofInstances: result.allInstances, from: handler, croppedToInstancesExtent: true)
try CIContext().writePNGRepresentation(of: CIImage(cvPixelBuffer: masked), to: dst, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
```

- [ ] **Step 2: Add `products()` and `scenes()` to `scripts/build-media.sh`** (after `gallery()`), and extend the `case`

```bash
KOHLER_CDN="https://kohler.scene7.com/is/image"

products() {
  local out=public/media/products tmp
  tmp="$(mktemp -d)"
  mkdir -p "$out"
  # asset|ไฟล์|query — ขอเท่าต้นฉบับหรือ 1600 อันที่เล็กกว่า (scene7 ขยายภาพเล็กให้ ห้ามใช้)
  # K-21370T สูง 6000px ขอด้วย wid แล้วโดน 403 จึงขอด้วย hei
  local cuts=(
    "PAWEB/zaa61880_rgb|elate-13963t-c4-1|wid=1600"
    "PAWEB/zab59994_rgb|kumin-99480t-4-1|wid=1600"
    "kohlerchina/K-15609T-B4-CP_01|elate-15609x-4-1|wid=1600"
    "kohlerchina/K-21370T-4CD-CP|taut-21370t-4cd-1|hei=1600"
    "PAWEB/aaf44315_rgb|kumin-30946t-4-1|wid=1600"
    "kohlerchina/21366T-4-CP|taut-21366t-4-1|wid=1000"
    "kohlerchina/3644X|toccata-3644x-2kd-1|wid=1600"
    "kohlerchina/K-3885X-2SD-0_1|indio-3885x-2sd-1|wid=1200"
    "kohlerchina/3645X-2KD-NA|toccata-3645x-2kd-1|wid=600"
    "kohlerchina/K-3676T-2KD-NA_01|marcato-3676x-2kd-1|wid=1600"
  )
  local c a name q
  for c in "${cuts[@]}"; do
    IFS='|' read -r a name q <<<"$c"
    curl -sf -o "$tmp/$name.png" "$KOHLER_CDN/$a?$q&fmt=png"
    swift scripts/cutout.swift "$tmp/$name.png" "$tmp/$name-cut.png"
    magick "$tmp/$name-cut.png" -resize '1200x1200>' "$tmp/$name-cut.png"
    cwebp -quiet -q 85 -alpha_q 90 "$tmp/$name-cut.png" -o "$out/$name.webp"
  done
  # Elate ภาพ 2–4 เป็นภาพใช้งานจริงกว้าง 679px วางกลางพื้นขาว: ตัดขอบขาวทิ้ง ไม่ตัดพื้นหลัง
  local n
  for c in "aag36762_rgb|2" "aag36765_rgb|3" "aag36764_rgb|4"; do
    IFS='|' read -r a n <<<"$c"
    curl -sf -o "$tmp/s$n.png" "$KOHLER_CDN/PAWEB/$a?wid=1600&fmt=png"
    magick "$tmp/s$n.png" -fuzz 3% -trim +repage "$tmp/s$n.png"
    cwebp -quiet -q 82 "$tmp/s$n.png" -o "$out/elate-13963t-c4-scene-$n.webp"
  done
  rm -rf "$tmp"
  ls -la "$out"
}

scenes() {
  local out=public/media/scenes tmp
  tmp="$(mktemp -d)"
  mkdir -p "$out"
  pdfimages -png -p "$PDF_SRC" "$tmp/i"
  # page-index:ชื่อไฟล์ — ภาพครัว ไม่มีคน ไม่ใช่ภาพปะต่อ ไม่ซ้ำกับ gallery
  local picks=(
    022-066:story-1 023-067:story-2 020-061:story-3
    001-000:about-hero 023-068:about-1 028-078:about-2 021-064:about-3 025-073:about-4
    035-099:showroom-kitchen-at-home 034-096:showroom-kitchen-at-home-1 025-072:showroom-kitchen-at-home-2
    007-030:matte-black-kitchen 018-054:matte-black-kitchen-1 041-115:matte-black-kitchen-2
    036-101:induction-vs-gas 032-090:induction-vs-gas-1 019-055:induction-vs-gas-2
    015-048:small-condo-kitchen 032-091:small-condo-kitchen-1 030-084:small-condo-kitchen-2
    020-059:stainless-sink-guide 036-100:stainless-sink-guide-1 027-076:stainless-sink-guide-2
  )
  local p src w
  for p in "${picks[@]}"; do
    src="$tmp/i-${p%%:*}.png"
    w=$(python3 -c "from PIL import Image; print(min(1800, Image.open('$src').width))")
    cwebp -quiet -q 80 -resize "$w" 0 "$src" -o "$out/${p##*:}.webp"
  done
  rm -rf "$tmp"
  du -sh "$out"
}
```

`case` becomes:

```bash
case "${1:-all}" in
  hero) hero ;;
  catalog) catalog ;;
  gallery) gallery ;;
  products) products ;;
  scenes) scenes ;;
  all) hero; catalog; gallery; products; scenes ;;
  *) echo "usage: $0 hero|catalog|gallery|products|scenes|all" >&2; exit 1 ;;
esac
```

Also update the usage comment on line 3 to `# ใช้: scripts/build-media.sh hero|catalog|gallery|products|scenes|all`.

- [ ] **Step 3: Run both and check counts**

Run: `scripts/build-media.sh products && scripts/build-media.sh scenes && ls public/media/products | wc -l && ls public/media/scenes | wc -l`
Expected: `13` and `23`.

- [ ] **Step 4: Visual review** — composite every cut-out on `#1c1917` and `#f5f4f1` into one contact sheet in the scratchpad, look at it; every product must be whole (no missing spout, handle or bowl) and have no white box. Look at the 23 scenes contact sheet: no text, no people, all kitchens.

- [ ] **Step 5: Commit**

```bash
git add scripts/cutout.swift scripts/build-media.sh public/media/products public/media/scenes
git commit -m "feat: add cut-out Kohler product photos and catalog kitchen scenes"
```

---

### Task 2: Real products, image-aware Placeholder, product components

**Files:**
- Modify: `components/Placeholder.tsx` (whole file)
- Modify: `components/ParallaxImage.tsx` (props + render)
- Modify: `lib/products.ts` (whole file)
- Modify: `lib/i18n.ts:26` and `lib/i18n.ts:115` (category labels)
- Modify: `components/ProductCard.tsx:19`
- Modify: `components/home/HomeContent.tsx:87`
- Modify: `components/ProductsContent.tsx:29` and `:50`
- Modify: `components/ProductDetail.tsx:34-38`

**Interfaces:**
- Consumes: Task 1 files `/media/products/<slug>-1.webp`, `/media/products/elate-13963t-c4-scene-{2,3,4}.webp`.
- Produces: `Placeholder` and `ParallaxImage` props `label?: string` (default `''`), `src?: string`, `fit?: 'cover' | 'contain'` (default `'cover'`). Task 3 calls `<ParallaxImage src="/media/scenes/..." ratio=... />` with no label.

- [ ] **Step 1: Replace `components/Placeholder.tsx`**

```tsx
// ── จุดเปลี่ยนเป็นของจริง #4 ──
// ไม่มี src = กล่อง placeholder มีป้ายชื่อ (จุดที่ยังรอภาพจริง)
// มี src = ภาพจริงในกรอบสัดส่วนเดิม · label ใช้เป็น alt ('' = ภาพประกอบ ข้อความข้าง ๆ บอกครบแล้ว)
// fit="contain" สำหรับภาพสินค้าตัดพื้นหลัง: วางกลางกรอบ เว้นขอบ 8% บนพื้น warm-100 (dark = ink)

type Props = {
  label?: string;
  src?: string;
  fit?: 'cover' | 'contain';
  ratio?: '16/9' | '4/5' | '1/1' | '3/2' | '21/9' | '3/4';
  fill?: boolean;
  dark?: boolean;
  className?: string;
};

export default function Placeholder({
  label = '',
  src,
  fit = 'cover',
  ratio = '4/5',
  fill = false,
  dark = false,
  className = '',
}: Props) {
  const box = fill ? 'absolute inset-0 h-full w-full' : 'relative w-full';
  const style = fill ? undefined : { aspectRatio: ratio.replace('/', ' / ') };

  if (src) {
    const contain = fit === 'contain';
    const surface = dark ? 'bg-ink' : contain ? 'bg-warm-100' : 'bg-warm-200';
    return (
      <div className={`${box} overflow-hidden ${surface} ${className}`} style={style}>
        <img
          src={src}
          alt={label}
          loading="lazy"
          decoding="async"
          className={
            contain
              ? 'absolute left-[8%] top-[8%] h-[84%] w-[84%] object-contain'
              : 'absolute inset-0 h-full w-full object-cover'
          }
        />
      </div>
    );
  }

  const tone = dark
    ? 'from-stone-700 via-stone-800 to-stone-900 text-stone-400'
    : 'from-stone-200 via-stone-300 to-stone-400 text-stone-600';
  return (
    <div
      className={`${box} overflow-hidden bg-gradient-to-br ${tone} ${className}`}
      style={style}
      role="img"
      aria-label={`ภาพประกอบ: ${label}`}
    >
      <div className="absolute inset-x-0 top-1/2 h-px bg-current opacity-10" aria-hidden />
      <div className="absolute inset-y-0 left-1/2 w-px bg-current opacity-10" aria-hidden />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="border border-current px-3 py-1.5 text-[10px] font-normal uppercase tracking-widest2 opacity-60">
          {label}
        </span>
      </div>
    </div>
  );
}
```

(`left/top/h/w` in % keep the 8% margin proportional on both axes; plain `padding` % would be measured from the width only and crush a 21:9 frame.)

- [ ] **Step 2: `components/ParallaxImage.tsx`** — props and the inner Placeholder

Replace the `Props` type and the function signature with:

```tsx
type Props = {
  label?: string;
  src?: string;
  fit?: 'cover' | 'contain';
  ratio?: '16/9' | '4/5' | '1/1' | '3/2' | '21/9' | '3/4';
  speed?: number; // yPercent สุทธิ; ค่าลบ = เลื่อนสวนทาง
  dark?: boolean;
  className?: string;
};

export default function ParallaxImage({
  label = '',
  src,
  fit,
  ratio = '3/2',
  speed = -8,
  dark = false,
  className = '',
}: Props) {
```

and the render line `<Placeholder label={label} ratio={ratio} dark={dark} />` with:

```tsx
        <Placeholder label={label} src={src} fit={fit} ratio={ratio} dark={dark} />
```

- [ ] **Step 3: Replace `lib/products.ts`**

```ts
// สินค้าจริงจาก kohler.co.th หมวดครัว (อ่านเมื่อ 2026-10-03): ก๊อก 6 รุ่น ซิงก์ 4 รุ่น ครบทุกรุ่นที่เว็บมี
// ทุกรหัสมีสี/วัสดุเดียว (ก๊อก = โครเมียมขัดเงา) เว็บ Kohler ไม่มีตัวเลือกสี จึงไม่มีตัวสลับสีในหน้าเว็บ
// ภาพ: scripts/build-media.sh products · images = ภาพตัดพื้นหลัง (contain) · scenes = ภาพใช้งานจริง (cover)

export type Category = 'faucet' | 'sink';

export type Product = {
  slug: string; // ตรงกับ slug บน kohler.co.th
  category: Category;
  name: { th: string; en: string };
  desc: { th: string; en: string };
  specs: { label: string; value: string }[];
  price: { th: string; en: string };
  featured?: boolean;
  images: string[];
  scenes?: string[];
};

const ASK = { th: 'สอบถามราคา', en: 'Price on request' };
const CHROME = { label: 'สี', value: 'โครเมียมขัดเงา (Polished Chrome)' };
const img = (slug: string) => [`/media/products/${slug}-1.webp`];

export const products: Product[] = [
  {
    slug: 'elate-13963t-c4',
    category: 'faucet',
    name: { th: 'Elate™ ก๊อกผสมอ่างล้างจาน หัวฝักบัวดึงได้', en: 'Elate™ Pull-Out Kitchen Faucet' },
    desc: {
      th: 'ก๊อกผสมทองเหลืองก้านโยกเดี่ยว หัวฝักบัวดึงออกได้ สลับได้ 2 แบบระหว่างสายน้ำนุ่มกับสเปรย์ Sweep® สายถัก ProMotion® ดึงเบาและเงียบ',
      en: 'Single-lever brass faucet with a two-function pull-out sprayhead that switches between an aerated stream and Sweep® spray. The ProMotion® braided hose keeps the pull-out light and quiet.',
    },
    specs: [
      { label: 'รหัสรุ่น', value: 'K-13963T-C4-CP' },
      { label: 'วัสดุ', value: 'ทองเหลือง' },
      CHROME,
      { label: 'การติดตั้ง', value: 'ตั้งบนเคาน์เตอร์ รูเดียว' },
      { label: 'ระยะยื่นปากก๊อก', value: '229 มม.' },
      { label: 'อัตราการไหลสูงสุด', value: '7.5 ลิตร/นาที ที่ 3 บาร์' },
      { label: 'ขนาด', value: 'สูง 306 × กว้าง 121 มม.' },
    ],
    price: ASK,
    featured: true,
    images: img('elate-13963t-c4'),
    scenes: [2, 3, 4].map((n) => `/media/products/elate-13963t-c4-scene-${n}.webp`),
  },
  {
    slug: 'kumin-99480t-4',
    category: 'faucet',
    name: { th: 'Kumin™ ก๊อกผสมอ่างล้างจาน', en: 'Kumin™ Single-Control Kitchen Faucet' },
    desc: {
      th: 'ก๊อกผสมก้านโยกเดี่ยว คอหมุนได้ 360 องศา ระยะยื่น 227 มม. วาล์วเซรามิกของ Kohler ทนทานเกินมาตรฐานอุตสาหกรรม 2 เท่า',
      en: 'Single-lever mixer with a 360° swivel spout and a 227 mm reach. KOHLER ceramic disc valves are built to twice the industry longevity standard.',
    },
    specs: [
      { label: 'รหัสรุ่น', value: 'K-99480T-4-CP' },
      CHROME,
      { label: 'การติดตั้ง', value: 'ตั้งบนเคาน์เตอร์' },
      { label: 'ระยะยื่นปากก๊อก', value: '227 มม.' },
      { label: 'คอก๊อก', value: 'หมุนได้ 360°' },
    ],
    price: ASK,
    images: img('kumin-99480t-4'),
  },
  {
    slug: 'elate-15609x-4',
    category: 'faucet',
    name: { th: 'Elate™ ก๊อกผสมอ่างล้างจาน', en: 'Elate™ Single-Control Kitchen Faucet' },
    desc: {
      th: 'ก๊อกผสมทองเหลือง ติดตั้งรูเดียว วาล์วเซรามิกชิ้นเดียวคุมทั้งปริมาณน้ำและอุณหภูมิ ระยะยื่น 210 มม.',
      en: 'Brass single-hole mixer with a one-piece ceramic disc valve for volume and temperature, and a 210 mm spout reach.',
    },
    specs: [
      { label: 'รหัสรุ่น', value: 'K-15609X-4-CP' },
      { label: 'วัสดุ', value: 'ทองเหลือง' },
      CHROME,
      { label: 'การติดตั้ง', value: 'ตั้งบนเคาน์เตอร์ รูเดียว' },
      { label: 'ระยะยื่นปากก๊อก', value: '210 มม.' },
    ],
    price: ASK,
    images: img('elate-15609x-4'),
  },
  {
    slug: 'taut-21370t-4cd',
    category: 'faucet',
    name: { th: 'Taut™ ก๊อกเดี่ยวอ่างล้างจาน', en: 'Taut™ Cold-Water Swing-Spout Kitchen Faucet' },
    desc: {
      th: 'ก๊อกน้ำเย็นทองเหลือง คอสวิง ระยะยื่น 178 มม. เซรามิกวาล์วหมุน 1/4 รอบ รับประกันตลอดอายุการใช้งาน',
      en: 'Brass cold-water faucet with a swing spout, a 178 mm reach and a quarter-turn ceramic disc valve with a lifetime warranty.',
    },
    specs: [
      { label: 'รหัสรุ่น', value: 'K-21370T-4CD-CP' },
      { label: 'วัสดุ', value: 'ทองเหลือง' },
      CHROME,
      { label: 'น้ำ', value: 'น้ำเย็นอย่างเดียว' },
      { label: 'การติดตั้ง', value: 'ตั้งบนเคาน์เตอร์' },
      { label: 'ระยะยื่นปากก๊อก', value: '178 มม.' },
      { label: 'สายน้ำดี', value: 'G1/2"' },
    ],
    price: ASK,
    images: img('taut-21370t-4cd'),
  },
  {
    slug: 'kumin-30946t-4',
    category: 'faucet',
    name: { th: 'Kumin™ ก๊อกเดี่ยวอ่างล้างจาน', en: 'Kumin™ Cold-Water Kitchen Faucet' },
    desc: {
      th: 'ก๊อกน้ำเย็นทองเหลืองก้านโยกข้าง คอหมุน 360 องศา ระยะยื่น 192 มม. สายน้ำผสมอากาศ',
      en: 'Brass cold-water faucet with a side lever, a 360° rotating spout, a 192 mm reach and an aerated flow.',
    },
    specs: [
      { label: 'รหัสรุ่น', value: 'K-30946T-4-CP' },
      { label: 'วัสดุ', value: 'ทองเหลือง' },
      CHROME,
      { label: 'น้ำ', value: 'น้ำเย็นอย่างเดียว' },
      { label: 'ระยะยื่นปากก๊อก', value: '192 มม.' },
      { label: 'อัตราการไหลสูงสุด', value: '8.3 ลิตร/นาที ที่ 4.14 บาร์' },
      { label: 'ขนาด', value: 'สูง 267 × กว้าง 46 มม.' },
    ],
    price: ASK,
    images: img('kumin-30946t-4'),
  },
  {
    slug: 'taut-21366t-4',
    category: 'faucet',
    name: { th: 'Taut™ ก๊อกผสมอ่างล้างจาน หัวฝักบัวดึงลง', en: 'Taut™ Pull-Down Kitchen Faucet' },
    desc: {
      th: 'ก๊อกผสมทองเหลือง หัวฝักบัวดึงลงปรับได้ 2 แบบ ระยะยื่น 222 มม. เซรามิกวาล์วรับประกันตลอดอายุการใช้งาน',
      en: 'Brass pull-down faucet with a two-function spray, a 222 mm reach and a ceramic disc valve with a lifetime warranty.',
    },
    specs: [
      { label: 'รหัสรุ่น', value: 'K-21366T-4-CP' },
      { label: 'วัสดุ', value: 'ทองเหลือง' },
      CHROME,
      { label: 'การติดตั้ง', value: 'ตั้งบนเคาน์เตอร์' },
      { label: 'ระยะยื่นปากก๊อก', value: '222 มม.' },
      { label: 'หัวฉีด', value: 'ดึงลง ปรับได้ 2 แบบ' },
    ],
    price: ASK,
    featured: true,
    images: img('taut-21366t-4'),
  },
  {
    slug: 'toccata-3644x-2kd',
    category: 'sink',
    name: { th: 'Toccata™ ซิงก์สเตนเลส 1 หลุม', en: 'Toccata™ Single-Bowl Stainless Sink' },
    desc: {
      th: 'ซิงก์สเตนเลสหลุมเดี่ยวขนาด 31 นิ้ว ติดตั้งแบบฝังบนเคาน์เตอร์',
      en: '31-inch single-bowl stainless steel sink for self-rimming installation.',
    },
    specs: [
      { label: 'รหัสรุ่น', value: 'K-3644X-2KD-NA' },
      { label: 'วัสดุ', value: 'สเตนเลสสตีล' },
      { label: 'แบบหลุม', value: '1 หลุม' },
      { label: 'การติดตั้ง', value: 'ฝังบนเคาน์เตอร์' },
      { label: 'ความยาว', value: '31 นิ้ว' },
    ],
    price: ASK,
    images: img('toccata-3644x-2kd'),
  },
  {
    slug: 'indio-3885x-2sd',
    category: 'sink',
    name: { th: 'Indio™ ซิงก์เหล็กหล่อ 2 หลุม', en: 'Indio™ Smart Divide Cast-Iron Double Sink' },
    desc: {
      th: 'ซิงก์เหล็กหล่อสีขาว 33 นิ้ว 2 หลุมใหญ่และกลางแบบ Smart Divide พร้อมที่กดสบู่ ติดตั้งได้ทั้งฝังบนและใต้เคาน์เตอร์',
      en: '33-inch white cast-iron sink with Smart Divide large and medium bowls and a soap dispenser, for self-rimming or undermount installation.',
    },
    specs: [
      { label: 'รหัสรุ่น', value: 'K-3885X-2SD-0' },
      { label: 'วัสดุ', value: 'เหล็กหล่อ' },
      { label: 'สี', value: 'ขาว' },
      { label: 'แบบหลุม', value: '2 หลุม ใหญ่และกลาง (Smart Divide)' },
      { label: 'การติดตั้ง', value: 'ฝังบนหรือใต้เคาน์เตอร์' },
      { label: 'ความยาว', value: '33 นิ้ว' },
      { label: 'อุปกรณ์', value: 'ที่กดสบู่' },
    ],
    price: ASK,
    featured: true,
    images: img('indio-3885x-2sd'),
  },
  {
    slug: 'toccata-3645x-2kd',
    category: 'sink',
    name: { th: 'Toccata™ ซิงก์สเตนเลส 2 หลุม', en: 'Toccata™ Double-Bowl Stainless Sink' },
    desc: {
      th: 'ซิงก์สเตนเลส 31 นิ้ว 2 หลุมใหญ่และกลาง ติดตั้งแบบฝังบนเคาน์เตอร์',
      en: '31-inch stainless steel sink with large and medium bowls for self-rimming installation.',
    },
    specs: [
      { label: 'รหัสรุ่น', value: 'K-3645X-2KD-NA' },
      { label: 'วัสดุ', value: 'สเตนเลสสตีล' },
      { label: 'แบบหลุม', value: '2 หลุม ใหญ่และกลาง' },
      { label: 'การติดตั้ง', value: 'ฝังบนเคาน์เตอร์' },
      { label: 'ความยาว', value: '31 นิ้ว' },
    ],
    price: ASK,
    featured: true,
    images: img('toccata-3645x-2kd'),
  },
  {
    slug: 'marcato-3676x-2kd',
    category: 'sink',
    name: { th: 'Marcato™ ซิงก์สเตนเลส 1 หลุมครึ่ง', en: 'Marcato™ 1.5-Bowl Stainless Sink' },
    desc: {
      th: 'ซิงก์สเตนเลส 30 นิ้ว หลุมใหญ่คู่หลุมกลาง ติดตั้งแบบฝังบนเคาน์เตอร์',
      en: '30-inch stainless steel sink with a large and a medium bowl for self-rimming installation.',
    },
    specs: [
      { label: 'รหัสรุ่น', value: 'K-3676X-2KD-NA' },
      { label: 'วัสดุ', value: 'สเตนเลสสตีล' },
      { label: 'แบบหลุม', value: '1 หลุมครึ่ง' },
      { label: 'การติดตั้ง', value: 'ฝังบนเคาน์เตอร์' },
      { label: 'ความยาว', value: '30 นิ้ว' },
    ],
    price: ASK,
    images: img('marcato-3676x-2kd'),
  },
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
```

- [ ] **Step 4: Category labels in `lib/i18n.ts`**

Line 26: `category: { all: 'ทั้งหมด', kitchen: 'ครัว' } as Record<string, string>,` becomes
`category: { all: 'ทั้งหมด', faucet: 'ก๊อกครัว', sink: 'ซิงก์ล้างจาน' } as Record<string, string>,`

Line 115: `category: { all: 'All', kitchen: 'Kitchen' } as Record<string, string>,` becomes
`category: { all: 'All', faucet: 'Kitchen faucet', sink: 'Kitchen sink' } as Record<string, string>,`

- [ ] **Step 5: Product images in the four components** (alt `''` wherever the product name is in the same link; the detail gallery uses the name)

`components/ProductCard.tsx:19`:
```tsx
            <Placeholder src={product.images[0]} fit="contain" ratio="4/5" />
```

`components/home/HomeContent.tsx:87`:
```tsx
                      <Placeholder src={p.images[0]} fit="contain" ratio="1/1" />
```

`components/ProductsContent.tsx:29`:
```tsx
            <ParallaxImage src={lead.images[0]} fit="contain" ratio="21/9" speed={-6} dark />
```

`components/ProductsContent.tsx:50`:
```tsx
                <ParallaxImage src={p.images[0]} fit="contain" ratio="4/5" speed={i % 2 ? 7 : -7} />
```

`components/ProductsContent.tsx:48` comment (the Placeholder aria-label reason no longer applies) becomes:
```tsx
              {/* ลิงก์ภาพซ้ำกับ "อ่านต่อ" → ซ่อนจาก tab/screen reader */}
```

`components/ProductDetail.tsx:34-38` (the gallery map) becomes:
```tsx
            {[
              ...product.images.map((src) => ({ src, fit: 'contain' as const })),
              ...(product.scenes ?? []).map((src) => ({ src, fit: 'cover' as const })),
            ].map((img, i) => (
              <Reveal key={img.src} delay={i === 0 ? 0 : 0.1}>
                <ParallaxImage
                  label={product.name[lang]}
                  src={img.src}
                  fit={img.fit}
                  ratio={i === 0 ? '4/5' : '3/2'}
                  speed={i % 2 ? 7 : -7}
                />
              </Reveal>
            ))}
```

- [ ] **Step 6: Verify** — run the four Global Constraints verification commands. Expected: tsc silent, build OK (static params now 10 product pages), `check:overflow` prints `ผ่าน`, media check silent. Then `curl -s localhost:4100/products/elate-13963t-c4/ | grep -c 'media/products/elate-13963t-c4'` prints a number ≥ 1.

- [ ] **Step 7: Commit**

```bash
git add components/Placeholder.tsx components/ParallaxImage.tsx lib/products.ts lib/i18n.ts components/ProductCard.tsx components/home/HomeContent.tsx components/ProductsContent.tsx components/ProductDetail.tsx
git commit -m "feat: list the 10 Kohler Thailand kitchen products with cut-out photos"
```

---

### Task 3: Real kitchen photos in story, about and articles

**Files:**
- Modify: `components/home/HomeContent.tsx:18-19` (STORY_IMAGES), `:40-44` and `:51` (story ParallaxImage), `:147` (latest posts cover)
- Modify: `lib/posts.ts` (type + 5 `cover` lines + 5 new `inline` lines)
- Modify: `app/articles/page.tsx:34`
- Modify: `app/articles/[slug]/page.tsx:45-49` and `:70`
- Modify: `app/about/page.tsx` (4 `image` values, line 55)

**Interfaces:**
- Consumes: Task 1 `/media/scenes/*.webp`; Task 2 `ParallaxImage` props `src?: string`, `label?: string` (default `''`), `fit` default `'cover'`.
- Produces: `Post.cover: string` (path), `Post.inline: [string, string]` (paths).

- [ ] **Step 1: Story images in `components/home/HomeContent.tsx`**

Lines 18-19 become:
```tsx
// ภาพเรื่องราวจากแคตตาล็อก KOHLER Kitchens 2026 (ลำดับตรงกับ t.home.storySlides) · scripts/build-media.sh scenes
const STORY_IMAGES = [1, 2, 3].map((n) => `/media/scenes/story-${n}.webp`);
```

In `StoryRows`, the first `ParallaxImage` (`label={STORY_IMAGES[i]}`) becomes `src={STORY_IMAGES[i]}`, and line 51 becomes:
```tsx
        <ParallaxImage src={STORY_IMAGES[slides.length - 1]} ratio="21/9" />
```

Line 147 (LatestPosts) becomes:
```tsx
                  <ParallaxImage src={post.cover} ratio="16/9" speed={i % 2 ? 5 : -5} />
```

- [ ] **Step 2: `lib/posts.ts`** — type, covers, inline images

Type lines become:
```ts
  cover: string; // ภาพปก 16:9 จาก scripts/build-media.sh scenes
  inline: [string, string]; // ภาพแทรกหลังย่อหน้าที่ 2 และ 4
```

Each post's `cover: '...'` line becomes the two lines below (match by the post's `slug`):

```ts
    cover: '/media/scenes/showroom-kitchen-at-home.webp',
    inline: ['/media/scenes/showroom-kitchen-at-home-1.webp', '/media/scenes/showroom-kitchen-at-home-2.webp'],
```
```ts
    cover: '/media/scenes/matte-black-kitchen.webp',
    inline: ['/media/scenes/matte-black-kitchen-1.webp', '/media/scenes/matte-black-kitchen-2.webp'],
```
```ts
    cover: '/media/scenes/induction-vs-gas.webp',
    inline: ['/media/scenes/induction-vs-gas-1.webp', '/media/scenes/induction-vs-gas-2.webp'],
```
```ts
    cover: '/media/scenes/small-condo-kitchen.webp',
    inline: ['/media/scenes/small-condo-kitchen-1.webp', '/media/scenes/small-condo-kitchen-2.webp'],
```
```ts
    cover: '/media/scenes/stainless-sink-guide.webp',
    inline: ['/media/scenes/stainless-sink-guide-1.webp', '/media/scenes/stainless-sink-guide-2.webp'],
```

- [ ] **Step 3: Article pages**

`app/articles/page.tsx:34`:
```tsx
                    <ParallaxImage src={post.cover} ratio="16/9" speed={i % 2 ? 5 : -5} />
```

`app/articles/[slug]/page.tsx:45-49` becomes:
```tsx
  // แทรกภาพ parallax หลังย่อหน้าที่ 2 และ 4
  const imageAfter: Record<number, string> = { 1: post.inline[0], 3: post.inline[1] };
```

`app/articles/[slug]/page.tsx:70`:
```tsx
        <ParallaxImage src={post.cover} ratio="16/9" speed={-6} />
```

and the inline one (line 81) `label={imageAfter[i]}` becomes `src={imageAfter[i]}`.

- [ ] **Step 4: About page `app/about/page.tsx`**

The four `image:` values become, in order:
```ts
    image: '/media/scenes/about-1.webp',
```
```ts
    image: '/media/scenes/about-2.webp',
```
```ts
    image: '/media/scenes/about-3.webp',
```
```ts
    image: '/media/scenes/about-4.webp',
```

Line 55:
```tsx
        <ParallaxImage src="/media/scenes/about-hero.webp" ratio="21/9" speed={-6} />
```

Line 68 `label={s.image}` becomes `src={s.image}`.

- [ ] **Step 5: Verify** — the four Global Constraints commands, plus `grep -rn "ภาพแทรก\|ปกบทความ\|เกี่ยวกับเรา ภาพ\|เรื่องราว ภาพ" app components lib` prints nothing (no placeholder labels left; the contact map placeholder stays).

- [ ] **Step 6: Commit**

```bash
git add components/home/HomeContent.tsx lib/posts.ts app/articles/page.tsx "app/articles/[slug]/page.tsx" app/about/page.tsx
git commit -m "feat: use real kitchen photos for the story, about and article images"
```

---

### Task 4: Kitchen-only home wall and a clearer heading

**Files:**
- Modify: `lib/gallery.ts` (whole file)
- Delete: `lib/scope.ts`, `public/media/gallery/{w-amber,w-glass,w-suite,f-13,f-14,f-15}.webp`
- Modify: `components/ImageWall.tsx:5`, `:11-12`, `:21-29`, `:34`, `:56-59`
- Modify: `lib/i18n.ts:33` and `:122` (`galleryTitle`)
- Modify: `scripts/build-media.sh:9`, `:58`, `:67` (gallery pipeline drops wardrobe and flooring)

**Interfaces:**
- Consumes: nothing from Tasks 1-3 (independent).
- Produces: `GALLERY: GalleryItem[]` with 6 kitchen items, `GalleryItem = { src; w; h; caption }` (no `group`). `useScope`, `galleryFor` and `Scope` no longer exist. The catalog page and PDF are not touched.

- [ ] **Step 1: Replace `lib/gallery.ts`**

```ts
// ผนังภาพหน้าแรก: ภาพครัวจากแคตตาล็อก KOHLER Kitchens 2026 · ไฟล์สร้างโดย scripts/build-media.sh gallery
export type GalleryItem = {
  src: string;
  w: number; // ขนาดจริงของไฟล์ (px) — ใช้จองพื้นที่ใน <img> ก่อนโหลด กัน layout shift
  h: number;
  caption: { th: string; en: string };
};

const g = (name: string) => `/media/gallery/${name}.webp`;

export const GALLERY: GalleryItem[] = [
  { src: g('k-dining'), w: 2400, h: 1392, caption: { th: 'ครัวเปิดต่อโต๊ะอาหาร', en: 'Open kitchen, dining island' } },
  { src: g('k-timber'), w: 1490, h: 1497, caption: { th: 'ไม้โทนเข้มกับแสงธรรมชาติ', en: 'Dark timber, daylight' } },
  { src: g('k-dusk'), w: 1490, h: 1496, caption: { th: 'ไอส์แลนด์ขาวยามเย็น', en: 'White island at dusk' } },
  { src: g('k-night'), w: 1488, h: 1496, caption: { th: 'ครัววิวเมืองยามค่ำ', en: 'City view after dark' } },
  { src: g('k-blue'), w: 1535, h: 1023, caption: { th: 'ชั้นเปิดโทนฟ้า', en: 'Open shelving in blue' } },
  { src: g('k-stone'), w: 1488, h: 1496, caption: { th: 'หินและไม้', en: 'Stone and wood' } },
];
```

- [ ] **Step 2: Delete the scope switch and the non-kitchen files**

```bash
git rm -q lib/scope.ts public/media/gallery/w-amber.webp public/media/gallery/w-glass.webp public/media/gallery/w-suite.webp public/media/gallery/f-13.webp public/media/gallery/f-14.webp public/media/gallery/f-15.webp
```

- [ ] **Step 3: `components/ImageWall.tsx`**

Delete line 5 (`// ?scope= กำหนดจำนวนภาพ (6 / 9 / 12) ผ่าน useScope`).

Lines 11-12 become one line:
```tsx
import { GALLERY, type GalleryItem } from '@/lib/gallery';
```

`Tile` (lines 21-29) becomes:
```tsx
function Tile({ item, lang }: { item: GalleryItem; lang: 'th' | 'en' }) {
  return (
    <figure>
      <img src={item.src} width={item.w} height={item.h} alt="" loading="lazy" className="h-auto w-full" />
      <figcaption className="mt-3 text-[12px] font-light text-paper/70">{item.caption[lang]}</figcaption>
    </figure>
  );
}
```

Line 34 `const items = galleryFor(useScope());` becomes `const items = GALLERY;`

Lines 56-59 (the `?scope=` refresh comment, `ScrollTrigger.refresh();`, the return and the deps) become:
```tsx
    return () => mm.revert();
  }, []);
```
(Image heights are reserved by `width`/`height`, and the item count no longer changes after mount, so the extra refresh has no job left.)

- [ ] **Step 4: Heading in `lib/i18n.ts`**

Line 33: `galleryTitle: 'ครัวที่ออกแบบมาให้ใช้ทุกวัน',`
Line 122: `galleryTitle: 'Kitchens made for everyday cooking',`

- [ ] **Step 5: `scripts/build-media.sh` gallery pipeline**

Delete line 9 (`STILLS_SRC=...`, only the flooring stills used it), line 58 (`043-122:w-amber 047-133:w-glass 016-049:w-suite`) and line 67 (the `for n in 13 14 15` flooring loop).

- [ ] **Step 6: Verify** — the four Global Constraints commands, plus `grep -rn "useScope\|galleryFor\|wardrobe\|flooring\|w-amber\|f-13\|STILLS_SRC" lib components app scripts` prints nothing, and `ls public/media/gallery | wc -l` prints `6`.

- [ ] **Step 7: Commit**

```bash
git add -A lib/gallery.ts lib/scope.ts components/ImageWall.tsx lib/i18n.ts scripts/build-media.sh public/media/gallery
git commit -m "feat: keep the home wall to kitchens and rename its heading"
```
