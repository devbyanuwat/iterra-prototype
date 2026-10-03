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
// note = คำอธิบายสั้น ๆ ของตัวเลือก ขึ้นในการ์ดตอนเจาะดูชิ้นส่วน (ข้อความตัวอย่าง รอเจ้าของร้านแก้)
export type Option = { id: string; name: Name; note: Name; swatch: string; look: Look | 'top' };
export type PartId = 'doors' | 'top' | 'splash' | 'floor';

export const PARTS: Record<PartId, Option[]> = {
  doors: [
    {
      id: 'white', name: { th: 'ขาวด้าน', en: 'Matte White' },
      note: { th: 'ผิวด้านไม่สะท้อนแสง ทำให้ครัวดูสว่างและกว้างขึ้น รอยนิ้วมือเห็นน้อย', en: 'A matte surface that keeps the kitchen bright and open. Fingerprints barely show.' },
      swatch: '#eeece8',
      look: { color: '#eeece8', roughness: 0.62 },
    },
    {
      id: 'graphite', name: { th: 'เทาเข้ม', en: 'Graphite' },
      note: { th: 'เทาเข้มโทนอุ่น ตัดกับท็อปสีอ่อนได้ชัด เหมาะกับครัวที่อยากได้ลุคเข้ม', en: 'A warm dark grey that sets off a pale countertop. For a kitchen with a deeper look.' },
      swatch: '#45464a',
      look: { color: '#45464a', roughness: 0.58 },
    },
    {
      id: 'oak',
      name: { th: 'ลายไม้โอ๊ค', en: 'Oak' },
      note: { th: 'ลายไม้โอ๊คสีน้ำผึ้ง ให้ความรู้สึกอบอุ่น เข้ากับท็อปหินได้ทุกสี', en: 'Honey oak grain that warms the room and sits well with any stone countertop.' },
      swatch: 'linear-gradient(90deg, #b89468, #a47f52 40%, #c2a078 70%, #b08a5e)',
      look: { color: '#b89468', roughness: 0.55, pattern: 'wood' },
    },
    {
      id: 'sage', name: { th: 'เขียวหม่น', en: 'Sage' },
      note: { th: 'เขียวอมเทาสีสบายตา ดูสดกว่าสีขาวแต่ไม่ฉูดฉาด', en: 'A soft grey green. Fresher than white without being loud.' },
      swatch: '#8f9c88',
      look: { color: '#8f9c88', roughness: 0.6 },
    },
  ],
  top: [
    {
      id: 'quartz-white', name: { th: 'ควอตซ์ขาว', en: 'White Quartz' },
      note: { th: 'ควอตซ์สีขาวมีเกล็ดละเอียด ผิวแน่นไม่ซึมน้ำ เช็ดคราบออกง่าย', en: 'White quartz with a fine fleck. The dense surface does not soak up spills and wipes clean.' },
      swatch: '#e6e3dd',
      look: { color: '#e6e3dd', roughness: 0.3, pattern: 'speckle' },
    },
    {
      id: 'quartz-grey', name: { th: 'ควอตซ์เทา', en: 'Grey Quartz' },
      note: { th: 'ควอตซ์สีเทากลาง ไม่ค่อยเห็นคราบและรอยใช้งาน เหมาะกับครัวที่ทำอาหารทุกวัน', en: 'Mid grey quartz that hides marks from daily cooking.' },
      swatch: '#8d8983',
      look: { color: '#8d8983', roughness: 0.3, pattern: 'speckle' },
    },
    {
      id: 'stone-black', name: { th: 'หินดำ', en: 'Black Stone' },
      note: { th: 'หินสีดำผิวเงา ให้ครัวดูหรูและนิ่ง ควรเช็ดให้แห้งหลังใช้เพื่อไม่ให้เห็นคราบน้ำ', en: 'Polished black stone for a calm, formal kitchen. Wipe it dry after use so water marks do not show.' },
      swatch: '#26262a',
      look: { color: '#26262a', roughness: 0.22, pattern: 'speckle' },
    },
    {
      id: 'wood',
      name: { th: 'ไม้จริง', en: 'Solid Wood' },
      note: { th: 'ท็อปไม้จริง สัมผัสอุ่นมือ ต้องทาน้ำมันรักษาเนื้อไม้เป็นระยะ', en: 'A solid wood top that feels warm to the touch. It needs oiling from time to time.' },
      swatch: 'linear-gradient(90deg, #a97c50, #8f6740 45%, #b58a5c)',
      look: { color: '#a97c50', roughness: 0.5, pattern: 'wood' },
    },
  ],
  splash: [
    {
      id: 'tile-white', name: { th: 'กระเบื้องขาวเงา', en: 'Gloss White Tile' },
      note: { th: 'กระเบื้องขาวผิวเงา สะท้อนแสงใต้ตู้ให้เคาน์เตอร์สว่าง เช็ดคราบน้ำมันออกง่าย', en: 'Gloss white tile that bounces the under-cabinet light onto the counter and wipes clean of grease.' },
      swatch: '#efede8',
      look: { color: '#efede8', roughness: 0.18, pattern: 'tile', size: 0.5 },
    },
    {
      id: 'tile-grey', name: { th: 'กระเบื้องเทา', en: 'Grey Tile' },
      note: { th: 'กระเบื้องสีเทาผิวกึ่งด้าน ไม่ค่อยเห็นคราบกระเด็น ดูเรียบร้อยอยู่เสมอ', en: 'Satin grey tile that hides splashes and always looks tidy.' },
      swatch: '#a7a6a2',
      look: { color: '#a7a6a2', roughness: 0.3, pattern: 'tile', size: 0.5 },
    },
    {
      id: 'match', name: { th: 'วัสดุเดียวกับท็อป', en: 'Same as Countertop' },
      note: { th: 'ใช้วัสดุเดียวกับท็อปขึ้นผนังต่อเนื่อง ไม่มีรอยต่อระหว่างท็อปกับผนัง ดูเป็นชิ้นเดียวกัน', en: 'The countertop material carried up the wall, so counter and wall read as one piece.' },
      swatch: 'linear-gradient(135deg, #e6e3dd 50%, #8d8983 50%)',
      look: 'top',
    },
  ],
  floor: [
    {
      id: 'oak-light', name: { th: 'ไม้โอ๊คอ่อน', en: 'Light Oak' },
      note: { th: 'พื้นลายไม้โอ๊คสีอ่อน ทำให้ห้องดูสว่างและเดินสบายเท้า', en: 'Light oak boards that brighten the room and feel easy underfoot.' },
      swatch: '#b7a085',
      look: { color: '#b7a085', roughness: 0.62, pattern: 'planks' },
    },
    {
      id: 'walnut', name: { th: 'ไม้วอลนัต', en: 'Walnut' },
      note: { th: 'พื้นลายไม้วอลนัตสีเข้ม ให้ห้องดูอบอุ่น ตัดกับตู้สีอ่อนได้ดี', en: 'Dark walnut boards that warm the room and contrast with pale cabinets.' },
      swatch: '#6f5340',
      look: { color: '#6f5340', roughness: 0.58, pattern: 'planks' },
    },
    {
      id: 'concrete', name: { th: 'ปูนขัดมัน', en: 'Polished Concrete' },
      note: { th: 'พื้นปูนขัดมันสีเทาเรียบ ไม่มีร่องยาแนว ทำความสะอาดง่าย', en: 'Smooth grey polished concrete with no grout lines to clean.' },
      swatch: '#a3a09b',
      look: { color: '#a3a09b', roughness: 0.45, pattern: 'speckle', size: 2 },
    },
    {
      id: 'tile-grey', name: { th: 'กระเบื้องเทา', en: 'Grey Tile' },
      note: { th: 'กระเบื้องแผ่นใหญ่สีเทาอ่อน ทนน้ำและทนรอยขีดข่วน เหมาะกับครัวที่ใช้งานหนัก', en: 'Large pale grey tiles that stand up to water and scratches in a busy kitchen.' },
      swatch: '#b4b2ad',
      look: { color: '#b4b2ad', roughness: 0.4, pattern: 'tile', size: 3 },
    },
  ],
};

// สีก๊อก: ชื่อและจุดสีมาจาก lib/finishes.ts (FAUCET) · ที่นี่เก็บแค่ค่าวัสดุ 3D ต่อ id
export const FAUCET_LOOKS: Record<string, Look> = {
  chrome: { color: '#f1f2f3', roughness: 0.08, metalness: 1 },
  black: { color: '#1f1e1d', roughness: 0.55, metalness: 0.6 },
  brass: { color: '#c9a45c', roughness: 0.3, metalness: 1 },
  steel: { color: '#b9bbbd', roughness: 0.38, metalness: 1 },
};

export const FAUCET_NOTES: Record<string, Name> = {
  chrome: { th: 'โครเมียมขัดเงา สะท้อนแสงเหมือนกระจก เข้ากับครัวได้ทุกสี', en: 'Mirror-bright chrome that suits every kitchen colour.' },
  black: { th: 'ดำด้าน เด่นบนท็อปสีอ่อน ไม่ค่อยเห็นคราบน้ำ', en: 'Matte black that stands out on a pale countertop and hides water spots.' },
  brass: { th: 'ทองเหลืองแปรง โทนอุ่น เป็นจุดเด่นของครัวโดยไม่ต้องแต่งเพิ่ม', en: 'Warm brushed brass. The one accent a kitchen needs.' },
  steel: { th: 'สเตนเลสแปรง ผิวด้านเข้าชุดกับซิงก์ ไม่ค่อยเห็นรอยนิ้วมือ', en: 'Brushed stainless that matches the sink and hides fingerprints.' },
};

export type Picks = Record<PartId, string> & { faucet: string };
export type Part = keyof Picks; // หมวดที่ผู้ใช้เปลี่ยนได้ = ชิ้นส่วนที่ชี้และเจาะดูได้ในฉาก
export const DEFAULT_PICKS: Picks = { doors: 'white', top: 'quartz-grey', splash: 'tile-white', floor: 'oak-light', faucet: 'chrome' };

// ── แสง ──
// sun = แสงจากหน้าต่าง, hemi = แสงฟ้า, env = แรงของเงาสะท้อน, led = ไฟใต้ตู้แขวน
// ไฟติดพร้อมกันได้ไม่เกิน 6 ดวง (hemi 1 + led 4 + sun 1) · check:room ตรวจ
// วอร์มไวท์กับคูลไวท์ใช้ sun เป็นแสงหลักย้อมสีตามโทน ห้องจึงมีเงาและไม่แบน
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
  bg: string;
  exposure: number;
};
export const LIGHTS: LightPreset[] = [
  { id: 'day', name: { th: 'กลางวัน', en: 'Daylight' }, sun: 3.1, sunColor: '#fff1dc', hemi: 0.38, env: 0.5, led: 0, ledColor: '#ffc98f', bg: '#e9e6e1', exposure: 0.82 },
  { id: 'warm', name: { th: 'วอร์มไวท์ 3000K', en: 'Warm White 3000K' }, sun: 1.7, sunColor: '#ffd2a0', hemi: 0.22, env: 0.3, led: 6, ledColor: '#ffc98f', bg: '#2a2420', exposure: 1 },
  { id: 'cool', name: { th: 'คูลไวท์ 6000K', en: 'Cool White 6000K' }, sun: 1.9, sunColor: '#e6eeff', hemi: 0.26, env: 0.34, led: 6, ledColor: '#e4eeff', bg: '#22262b', exposure: 1 },
  { id: 'night', name: { th: 'กลางคืน', en: 'Night' }, sun: 0, sunColor: '#ffd9a8', hemi: 0.09, env: 0.14, led: 7, ledColor: '#ffc98f', bg: '#141210', exposure: 1.05 },
];

// ── ผังครัว ──
// ครัว 1 ชุด = หลาย run · run = ตู้เรียงต่อกันเป็นเส้นตรง กว้างรวม = ผลรวม w ของ modules
// ทุก run ลึก 0.6 ม. · x, z = จุดเริ่มของ run นับจากกลาง bay
// turn 0  = run หลัง ชิดผนัง หน้าบานหันออก (+z) · modules เรียงจากซ้ายไปขวา
// turn 1  = ขาซ้าย หน้าบานหันขวา (+x) · modules เรียงจากปลายฝั่งกล้อง เข้าหาผนัง · ตัวตู้กินพื้นที่ x ถึง x + 0.6
// turn -1 = ขาขวา หน้าบานหันซ้าย (-x) · modules เรียงจากผนัง ออกมาฝั่งกล้อง · ตัวตู้กินพื้นที่ x - 0.6 ถึง x
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
  focus: Record<Part, Focus>;
};
// มุมเจาะดูชิ้นส่วน: at = จุดบนชิ้นส่วน [x จากกลาง bay, y, z] เป็นทั้งจุดปลายเส้นชี้และจุดที่กล้องมอง
export type Focus = { at: [number, number, number]; azimuth: number; polar: number; distance: number };
// ขอบเขตกล้องตอนเจาะดู: หมุนได้ข้างละ azimuth จากมุมเจาะ · zoom เป็นเมตร
export const FOCUS = { azimuth: 0.61, zoomMin: 1.2, zoomMax: 3.2 };

export const BAY_PITCH = 9; // ระยะห่างกลาง bay ถึงกลาง bay
export const HALL = { width: 27, depth: 5, height: 4.6 }; // สูงเผื่อจอแนวตั้งที่มุมกล้องกว้าง ไม่ให้เห็นขอบบนผนัง
// ขอบเขตกล้อง: หมุนซ้ายขวาข้างละ azimuth (รวม 180 องศา) · polar วัดจากแนวดิ่ง · zoom เป็นเมตร · polarMin 1.05 = กล้องซูมออกสุดยังอยู่ต่ำกว่าขอบบนผนัง
export const ORBIT = { azimuth: Math.PI / 2, polarMin: 1.05, polarMax: 1.52, zoomMin: 2.8, zoomMax: 7 };

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
    focus: {
      doors: { at: [1.5, 0.48, 0.58], azimuth: 0.35, polar: 1.3, distance: 2.2 },
      top: { at: [0.4, 0.9, 0.3], azimuth: 0.3, polar: 1.1, distance: 1.8 },
      splash: { at: [0.4, 1.17, 0.01], azimuth: 0.25, polar: 1.4, distance: 2 },
      floor: { at: [0, 0, 1.6], azimuth: 0.3, polar: 1.05, distance: 3 },
      faucet: { at: [-0.2, 1.1, 0.07], azimuth: 0.4, polar: 1.3, distance: 1.4 },
    },
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
    focus: {
      doors: { at: [0.6, 0.48, 0.58], azimuth: 0.35, polar: 1.3, distance: 2.2 },
      top: { at: [-0.6, 0.9, 0.3], azimuth: 0.45, polar: 1.1, distance: 1.8 },
      splash: { at: [-0.6, 1.17, 0.01], azimuth: 0.4, polar: 1.4, distance: 2 },
      floor: { at: [0.4, 0, 1.8], azimuth: 0.3, polar: 1.05, distance: 3 },
      faucet: { at: [-1.43, 1.1, 2], azimuth: 0.9, polar: 1.3, distance: 1.4 },
    },
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
    focus: {
      doors: { at: [-0.7, 0.48, 0.58], azimuth: 0.15, polar: 1.25, distance: 2.4 },
      top: { at: [0.7, 0.9, 0.3], azimuth: -0.2, polar: 1.1, distance: 1.8 },
      splash: { at: [0.7, 1.17, 0.01], azimuth: -0.15, polar: 1.4, distance: 2 },
      floor: { at: [0, 0, 2], azimuth: 0, polar: 1.05, distance: 3 },
      faucet: { at: [-1.53, 1.1, 1.8], azimuth: 0.9, polar: 1.3, distance: 1.4 },
    },
  },
];

export const runLength = (run: Run) => Math.round(run.modules.reduce((sum, m) => sum + m.w, 0) * 1000) / 1000;
