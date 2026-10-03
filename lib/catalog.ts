// แคตตาล็อก KOHLER Kitchens 2026 — ไฟล์สร้างโดย scripts/build-media.sh catalog
const pad = (n: number) => String(n).padStart(2, '0');

export const CATALOG = {
  pages: 49,
  pdf: '/media/catalog/kohler-kitchens-2026.pdf',
  pdfSizeMB: 18, // จาก `du -m` หลังรัน script
  page: (n: number) => `/media/catalog/p${pad(n)}.webp`,
  thumb: (n: number) => `/media/catalog/t${pad(n)}.webp`,
};
