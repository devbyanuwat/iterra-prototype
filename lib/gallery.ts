import type { Scope } from './scope';

export type GalleryItem = {
  src: string;
  w: number; // ขนาดจริงของไฟล์ (px) — ใช้จองพื้นที่ใน <img> ก่อนโหลด กัน layout shift
  h: number;
  group: 'kitchen' | 'wardrobe' | 'flooring';
  caption: { th: string; en: string };
};

const g = (name: string) => `/media/gallery/${name}.webp`;

export const GALLERY: GalleryItem[] = [
  { src: g('k-dining'), w: 2400, h: 1392, group: 'kitchen', caption: { th: 'ครัวเปิดต่อโต๊ะอาหาร', en: 'Open kitchen, dining island' } },
  { src: g('k-timber'), w: 1490, h: 1497, group: 'kitchen', caption: { th: 'ไม้โทนเข้มกับแสงธรรมชาติ', en: 'Dark timber, daylight' } },
  { src: g('k-dusk'), w: 1490, h: 1496, group: 'kitchen', caption: { th: 'ไอส์แลนด์ขาวยามเย็น', en: 'White island at dusk' } },
  { src: g('k-night'), w: 1488, h: 1496, group: 'kitchen', caption: { th: 'ครัววิวเมืองยามค่ำ', en: 'City view after dark' } },
  { src: g('k-blue'), w: 1535, h: 1023, group: 'kitchen', caption: { th: 'ชั้นเปิดโทนฟ้า', en: 'Open shelving in blue' } },
  { src: g('k-stone'), w: 1488, h: 1496, group: 'kitchen', caption: { th: 'หินและไม้', en: 'Stone and wood' } },
  { src: g('w-amber'), w: 1488, h: 1985, group: 'wardrobe', caption: { th: 'ตู้เสื้อผ้าไฟอำพัน', en: 'Amber-lit wardrobe' } },
  { src: g('w-glass'), w: 1319, h: 1646, group: 'wardrobe', caption: { th: 'ตู้บานกระจก', en: 'Glass-front wardrobe' } },
  { src: g('w-suite'), w: 1205, h: 989, group: 'wardrobe', caption: { th: 'ห้องนอนและตู้บิลท์อิน', en: 'Bedroom with built-ins' } },
  { src: g('f-13'), w: 375, h: 281, group: 'flooring', caption: { th: 'WATERSHIELD ห้องแต่งตัว', en: 'WATERSHIELD dressing room' } },
  { src: g('f-14'), w: 375, h: 281, group: 'flooring', caption: { th: 'WATERSHIELD ห้องนอน', en: 'WATERSHIELD bedroom' } },
  { src: g('f-15'), w: 375, h: 281, group: 'flooring', caption: { th: 'WATERSHIELD ห้องนั่งเล่น', en: 'WATERSHIELD living room' } },
];

const GROUPS: Record<Scope, GalleryItem['group'][]> = {
  kitchen: ['kitchen'],
  wardrobe: ['kitchen', 'wardrobe'],
  all: ['kitchen', 'wardrobe', 'flooring'],
};

export const galleryFor = (scope: Scope) => GALLERY.filter((i) => GROUPS[scope].includes(i.group));
