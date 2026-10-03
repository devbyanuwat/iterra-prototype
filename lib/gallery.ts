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
