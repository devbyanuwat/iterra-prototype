// ── MOCK เพื่อเดโม ──
// ข้อมูลของหน้าจำลองห้องครัว (/room/): ตัวเลือกวัสดุ โทนแสง ผังครัว 3 แบบ และมุมกล้อง
// ไฟล์นี้ห้าม import อะไร (scripts/check-room.mjs โหลดตรงด้วย Node)
// หน่วยเป็นเมตร · x = ตามผนังหลัง, y = สูง, z = ออกจากผนังเข้าหากล้อง · ผนังหลังอยู่ที่ z = 0

export type Name = { th: string; en: string };

// ── วัสดุ ──
// pattern = ลายที่วาดด้วยโค้ด (components/room/textures.ts) โดยใช้ color เป็นสีพื้น
// size = ลาย 1 ชุดกินกี่เมตร (ไม่ใส่ = 1) · ของจริงควรเปลี่ยนเป็นไฟล์ลายจากผู้ผลิต
export type Pattern = 'wood' | 'planks' | 'tile' | 'speckle';
export type Look = { color: string; roughness: number; metalness?: number; pattern?: Pattern; size?: number };
// look: 'top' = ใช้วัสดุเดียวกับท็อป (มีเฉพาะผนังกันเปื้อน)
export type Option = { id: string; name: Name; swatch: string; look: Look | 'top' };
export type PartId = 'doors' | 'top' | 'splash' | 'floor';

export const PARTS: Record<PartId, Option[]> = {
  doors: [
    { id: 'white', name: { th: 'ขาวด้าน', en: 'Matte White' }, swatch: '#eeece8', look: { color: '#eeece8', roughness: 0.62 } },
    { id: 'graphite', name: { th: 'เทาเข้ม', en: 'Graphite' }, swatch: '#45464a', look: { color: '#45464a', roughness: 0.58 } },
    {
      id: 'oak',
      name: { th: 'ลายไม้โอ๊ค', en: 'Oak' },
      swatch: 'linear-gradient(90deg, #b89468, #a47f52 40%, #c2a078 70%, #b08a5e)',
      look: { color: '#b89468', roughness: 0.55, pattern: 'wood' },
    },
    { id: 'sage', name: { th: 'เขียวหม่น', en: 'Sage' }, swatch: '#8f9c88', look: { color: '#8f9c88', roughness: 0.6 } },
  ],
  top: [
    { id: 'quartz-white', name: { th: 'ควอตซ์ขาว', en: 'White Quartz' }, swatch: '#e6e3dd', look: { color: '#e6e3dd', roughness: 0.3, pattern: 'speckle' } },
    { id: 'quartz-grey', name: { th: 'ควอตซ์เทา', en: 'Grey Quartz' }, swatch: '#8d8983', look: { color: '#8d8983', roughness: 0.3, pattern: 'speckle' } },
    { id: 'stone-black', name: { th: 'หินดำ', en: 'Black Stone' }, swatch: '#26262a', look: { color: '#26262a', roughness: 0.22, pattern: 'speckle' } },
    {
      id: 'wood',
      name: { th: 'ไม้จริง', en: 'Solid Wood' },
      swatch: 'linear-gradient(90deg, #a97c50, #8f6740 45%, #b58a5c)',
      look: { color: '#a97c50', roughness: 0.5, pattern: 'wood' },
    },
  ],
  splash: [
    { id: 'tile-white', name: { th: 'กระเบื้องขาวเงา', en: 'Gloss White Tile' }, swatch: '#efede8', look: { color: '#efede8', roughness: 0.18, pattern: 'tile', size: 0.5 } },
    { id: 'tile-grey', name: { th: 'กระเบื้องเทา', en: 'Grey Tile' }, swatch: '#a7a6a2', look: { color: '#a7a6a2', roughness: 0.3, pattern: 'tile', size: 0.5 } },
    { id: 'match', name: { th: 'วัสดุเดียวกับท็อป', en: 'Same as Countertop' }, swatch: 'linear-gradient(135deg, #e6e3dd 50%, #8d8983 50%)', look: 'top' },
  ],
  floor: [
    { id: 'oak-light', name: { th: 'ไม้โอ๊คอ่อน', en: 'Light Oak' }, swatch: '#b7a085', look: { color: '#b7a085', roughness: 0.62, pattern: 'planks' } },
    { id: 'walnut', name: { th: 'ไม้วอลนัต', en: 'Walnut' }, swatch: '#6f5340', look: { color: '#6f5340', roughness: 0.58, pattern: 'planks' } },
    { id: 'concrete', name: { th: 'ปูนขัดมัน', en: 'Polished Concrete' }, swatch: '#a3a09b', look: { color: '#a3a09b', roughness: 0.45, pattern: 'speckle', size: 2 } },
    { id: 'tile-grey', name: { th: 'กระเบื้องเทา', en: 'Grey Tile' }, swatch: '#b4b2ad', look: { color: '#b4b2ad', roughness: 0.4, pattern: 'tile', size: 3 } },
  ],
};

// สีก๊อก: ชื่อและจุดสีมาจาก lib/finishes.ts (FAUCET) · ที่นี่เก็บแค่ค่าวัสดุ 3D ต่อ id
export const FAUCET_LOOKS: Record<string, Look> = {
  chrome: { color: '#f1f2f3', roughness: 0.08, metalness: 1 },
  black: { color: '#1f1e1d', roughness: 0.55, metalness: 0.6 },
  brass: { color: '#c9a45c', roughness: 0.3, metalness: 1 },
  steel: { color: '#b9bbbd', roughness: 0.38, metalness: 1 },
};

export type Picks = Record<PartId, string> & { faucet: string };
export const DEFAULT_PICKS: Picks = { doors: 'white', top: 'quartz-grey', splash: 'tile-white', floor: 'oak-light', faucet: 'chrome' };

// ── แสง ──
// sun = แสงจากหน้าต่าง, hemi = แสงฟ้า, env = แรงของเงาสะท้อน, led = ไฟใต้ตู้แขวน, ceil = ไฟเพดาน
export type LightId = 'day' | 'warm' | 'cool' | 'night';
export type LightPreset = {
  id: LightId;
  name: Name;
  sun: number;
  sunColor: string;
  hemi: number;
  env: number;
  led: number;
  ledColor: string;
  ceil: number;
  ceilColor: string;
  bg: string;
  exposure: number;
};
export const LIGHTS: LightPreset[] = [
  { id: 'day', name: { th: 'กลางวัน', en: 'Daylight' }, sun: 3.1, sunColor: '#fff1dc', hemi: 0.38, env: 0.5, led: 0, ledColor: '#ffc98f', ceil: 0, ceilColor: '#ffbf80', bg: '#e9e6e1', exposure: 0.82 },
  { id: 'warm', name: { th: 'วอร์มไวท์ 3000K', en: 'Warm White 3000K' }, sun: 0.1, sunColor: '#ffd9a8', hemi: 0.1, env: 0.16, led: 6, ledColor: '#ffc98f', ceil: 7.5, ceilColor: '#ffbf80', bg: '#2a2420', exposure: 1 },
  { id: 'cool', name: { th: 'คูลไวท์ 6000K', en: 'Cool White 6000K' }, sun: 0.1, sunColor: '#dfe9ff', hemi: 0.12, env: 0.2, led: 6, ledColor: '#e4eeff', ceil: 8, ceilColor: '#dfe9ff', bg: '#22262b', exposure: 1 },
  { id: 'night', name: { th: 'กลางคืน', en: 'Night' }, sun: 0, sunColor: '#ffd9a8', hemi: 0.04, env: 0.06, led: 7, ledColor: '#ffc98f', ceil: 0, ceilColor: '#ffbf80', bg: '#141210', exposure: 1.05 },
];

// ── ผังครัว ──
// ครัว 1 ชุด = หลาย run · run = ตู้เรียงต่อกันเป็นเส้นตรง กว้างรวม = ผลรวม w ของ modules
// ทุก run ลึก 0.6 ม. · x, z = จุดเริ่มของ run นับจากกลาง bay
// turn 0  = run หลัง ชิดผนัง หน้าบานหันออก (+z) · modules เรียงจากซ้ายไปขวา
// turn 1  = ขาซ้าย หน้าบานหันขวา (+x) · modules เรียงจากปลายฝั่งกล้อง เข้าหาผนัง
// turn -1 = ขาขวา หน้าบานหันซ้าย (-x) · modules เรียงจากผนัง ออกมาฝั่งกล้อง
// back: true = มีตู้แขวน ผนังกันเปื้อน ฮูด (เฉพาะ run หลัง) · ขามีแค่ตู้ล่างกับท็อป
export type Module =
  | { kind: 'door'; w: number; doors: 1 | 2 }
  | { kind: 'drawers'; w: number; rows: number[] } // ความสูงหน้าลิ้นชักจากบนลงล่าง รวมต้องได้ 0.76
  | { kind: 'sink'; w: number }
  | { kind: 'hob'; w: number }
  | { kind: 'oven'; w: number } // เตาอบใต้เคาน์เตอร์
  | { kind: 'corner'; w: number } // มุมที่ขามาชน ไม่มีหน้าบาน
  | { kind: 'tall'; w: number }; // ตู้สูงพร้อมเตาอบฝัง
export type Run = { x: number; z: number; turn: -1 | 0 | 1; back: boolean; modules: Module[] };

export type LayoutId = 'i' | 'l' | 'u';
// home = มุมกล้องเริ่มต้นของ bay · target = [y, z] ของจุดที่กล้องมอง (x = กลาง bay)
export type Layout = {
  id: LayoutId;
  name: Name;
  x: number; // กลาง bay บนแกน x ของห้อง
  runs: Run[];
  home: { azimuth: number; polar: number; distance: number; target: [number, number] };
};

export const BAY_PITCH = 9; // ระยะห่างกลาง bay ถึงกลาง bay
export const HALL = { width: 27, depth: 5, height: 3.6 };
// ขอบเขตกล้อง: หมุนซ้ายขวาข้างละ azimuth (รวม 180 องศา) · polar วัดจากแนวดิ่ง · zoom เป็นเมตร
export const ORBIT = { azimuth: Math.PI / 2, polarMin: 0.95, polarMax: 1.52, zoomMin: 2.8, zoomMax: 7 };

const door = (w: number, doors: 1 | 2 = 1): Module => ({ kind: 'door', w, doors });

export const LAYOUTS: Layout[] = [
  {
    id: 'i',
    name: { th: 'ครัวตัว I', en: 'I-shaped' },
    x: -BAY_PITCH,
    runs: [
      {
        x: -1.8, z: 0, turn: 0, back: true,
        modules: [{ kind: 'tall', w: 0.6 }, door(0.6), { kind: 'sink', w: 0.8 }, { kind: 'drawers', w: 0.4, rows: [0.2, 0.28, 0.28] }, { kind: 'hob', w: 0.6 }, door(0.6)],
      },
    ],
    home: { azimuth: 0.42, polar: 1.36, distance: 5.2, target: [1.08, 0.3] },
  },
  {
    id: 'l',
    name: { th: 'ครัวตัว L', en: 'L-shaped' },
    x: 0,
    runs: [
      {
        x: -1.5, z: 0, turn: 0, back: true,
        modules: [{ kind: 'corner', w: 0.6 }, { kind: 'drawers', w: 0.6, rows: [0.2, 0.28, 0.28] }, { kind: 'hob', w: 0.6 }, door(0.6), { kind: 'tall', w: 0.6 }],
      },
      {
        x: -1.5, z: 3, turn: 1, back: false,
        modules: [door(0.6), { kind: 'sink', w: 0.8 }, { kind: 'drawers', w: 0.4, rows: [0.2, 0.28, 0.28] }, door(0.6)],
      },
    ],
    home: { azimuth: 0.55, polar: 1.25, distance: 6.2, target: [1, 1.1] },
  },
  {
    id: 'u',
    name: { th: 'ครัวตัว U', en: 'U-shaped' },
    x: BAY_PITCH,
    runs: [
      {
        x: -1.6, z: 0, turn: 0, back: true,
        modules: [{ kind: 'corner', w: 0.6 }, door(0.6), { kind: 'hob', w: 0.8 }, door(0.6), { kind: 'corner', w: 0.6 }],
      },
      {
        x: -1.6, z: 2.8, turn: 1, back: false,
        modules: [door(0.6), { kind: 'sink', w: 0.8 }, { kind: 'drawers', w: 0.4, rows: [0.2, 0.28, 0.28] }, door(0.4)],
      },
      {
        x: 1.6, z: 0.6, turn: -1, back: false,
        modules: [{ kind: 'drawers', w: 0.6, rows: [0.2, 0.28, 0.28] }, { kind: 'oven', w: 0.6 }, door(0.6), door(0.4)],
      },
    ],
    home: { azimuth: 0, polar: 1.18, distance: 6.6, target: [1, 1.2] },
  },
];

export const runLength = (run: Run) => Math.round(run.modules.reduce((sum, m) => sum + m.w, 0) * 1000) / 1000;
