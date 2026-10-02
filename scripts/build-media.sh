#!/usr/bin/env bash
# สร้างไฟล์สื่อสำหรับเว็บจากต้นฉบับใน ~/Downloads (ต้นฉบับไม่เข้า git)
# ใช้: scripts/build-media.sh hero|catalog|gallery|all
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

case "${1:-all}" in
  hero) hero ;;
  catalog) catalog ;;
  gallery) gallery ;;
  all) hero; catalog; gallery ;;
  *) echo "usage: $0 hero|catalog|gallery|all" >&2; exit 1 ;;
esac
