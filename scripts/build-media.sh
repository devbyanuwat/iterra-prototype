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

case "${1:-all}" in
  hero) hero ;;
  all) hero ;;
  *) echo "usage: $0 hero|catalog|gallery|all" >&2; exit 1 ;;
esac
