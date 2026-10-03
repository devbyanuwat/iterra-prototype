#!/usr/bin/env bash
# สร้างไฟล์สื่อสำหรับเว็บจากต้นฉบับใน ~/Downloads (ต้นฉบับไม่เข้า git)
# ใช้: scripts/build-media.sh hero|catalog|gallery|products|scenes|all
set -euo pipefail
cd "$(dirname "$0")/.."

VIDEO_SRC="$HOME/Downloads/All VDO /Serier B - NaturaLux.m4v"
PDF_SRC="$HOME/Downloads/KOHLER KITCHENS 2026 (Kitchens & Wardrobes Thailand by DP Ceramic).pdf"
STILLS_SRC="$HOME/Downloads/drive-download-20261002T172632Z-1-001"

# ช่วงครัวล้วน (เขียง ลิ้นชักหม้อ ลิ้นชักขนมปัง) — ไม่มีโลโก้/ซับจีน
HERO_START=42
HERO_LEN=15

hero() {
  local out=public/media/hero
  mkdir -p "$out"
  ffmpeg -v error -y -ss "$HERO_START" -t "$HERO_LEN" -i "$VIDEO_SRC" -an \
    -vf "scale=1920:-2,fps=30" -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p \
    -movflags +faststart "$out/hero.mp4"
  ffmpeg -v error -y -ss "$HERO_START" -t "$HERO_LEN" -i "$VIDEO_SRC" -an \
    -vf "scale=1920:-2,fps=30" -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 "$out/hero.webm"
  ffmpeg -v error -y -ss "$HERO_START" -i "$VIDEO_SRC" -frames:v 1 \
    -vf "scale=1920:-2,format=yuvj420p" -q:v 4 "$out/hero.jpg"
  ls -la "$out"
}

catalog() {
  local out=public/media/catalog tmp
  tmp="$(mktemp -d)"
  mkdir -p "$out"
  pdftoppm -r 150 -jpeg -jpegopt quality=82 "$PDF_SRC" "$tmp/p"
  local i=0
  for f in "$tmp"/p-*.jpg; do
    i=$((i+1)); n=$(printf '%02d' "$i")
    cwebp -quiet -q 78 -resize 1600 0 "$f" -o "$out/p$n.webp"
    cwebp -quiet -q 70 -resize 360 0 "$f" -o "$out/t$n.webp"
  done
  # PDF สำหรับดาวน์โหลด: ประกอบจากภาพหน้า 150dpi (ไม่มี Ghostscript — ข้อความเลือกไม่ได้)
  python3 - "$tmp" "$out/kohler-kitchens-2026.pdf" <<'PY'
import sys, glob
from PIL import Image
pages = [Image.open(f).convert('RGB') for f in sorted(glob.glob(sys.argv[1] + '/p-*.jpg'))]
pages[0].save(sys.argv[2], save_all=True, append_images=pages[1:], resolution=150, quality=80)
PY
  rm -rf "$tmp"
  du -sh "$out" "$out/kohler-kitchens-2026.pdf"
}

gallery() {
  local out=public/media/gallery tmp
  tmp="$(mktemp -d)"
  mkdir -p "$out"
  pdfimages -png -p "$PDF_SRC" "$tmp/i"
  # page-index:name — เลือกจาก contact sheet (ภาพเต็ม ไม่มี mask ดำ)
  local picks=(
    049-143:k-dining 021-063:k-timber 024-070:k-dusk 027-077:k-night 031-088:k-blue 041-117:k-stone
    043-122:w-amber 047-133:w-glass 016-049:w-suite
  )
  local src w
  for p in "${picks[@]}"; do
    src="$tmp/i-${p%%:*}.png"
    # ย่อเฉพาะภาพที่กว้างเกิน 2400 — ห้ามขยายภาพ 1490px ขึ้น
    w=$(python3 -c "from PIL import Image; print(min(2400, Image.open('$src').width))")
    cwebp -quiet -q 80 -resize "$w" 0 "$src" -o "$out/${p##*:}.webp"
  done
  for n in 13 14 15; do cwebp -quiet -q 85 "$STILLS_SRC/$n.png" -o "$out/f-$n.webp"; done
  rm -rf "$tmp"
  ls -la "$out"
}

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

case "${1:-all}" in
  hero) hero ;;
  catalog) catalog ;;
  gallery) gallery ;;
  products) products ;;
  scenes) scenes ;;
  all) hero; catalog; gallery; products; scenes ;;
  *) echo "usage: $0 hero|catalog|gallery|products|scenes|all" >&2; exit 1 ;;
esac
