// ── MOCK เพื่อเดโม ──
// ข้อมูลของหน้าจำลองห้องครัว (/lab/room/): ตัวเลือกวัสดุ โทนแสง ผังครัว 3 แบบ และมุมกล้อง
// ไฟล์นี้ห้าม import อะไร (scripts/check-room.mjs โหลดตรงด้วย Node)
// หน่วยเป็นเมตร · x = ตามผนังหลัง, y = สูง, z = ออกจากผนังเข้าหากล้อง · ผนังหลังอยู่ที่ z = 0

export type Name = { th: string; en: string };

// ── วัสดุ ──
// pattern = ลายที่วาดด้วยโค้ด (components/room/textures.ts) โดยใช้ color เป็นสีพื้น
// size = ลาย 1 ชุดกินกี่เมตร (ไม่ใส่ = 1) · ของจริงควรเปลี่ยนเป็นไฟล์ลายจากผู้ผลิต
export type Pattern = 'wood' | 'planks' | 'tile' | 'speckle';
export type Look = { color: string; roughness: number; metalness?: number; pattern?: Pattern; size?: number };
// Option = ตัวเลือกสำเร็จที่ผูกสีกับผิวไว้ด้วยกัน (ใช้กับสีซิงก์) · note ขึ้นในการ์ดตอนเจาะดูชิ้นส่วน (ข้อความตัวอย่าง รอเจ้าของร้านแก้)
export type Option = { id: string; name: Name; note: Name; swatch: string; look: Look };

// พื้นผิว 5 ชิ้น เลือกวัสดุ (ผิวและลาย) กับสีแยกกัน · สีเป็นรหัส #rrggbb จะกดจากชุดสำเร็จหรือกำหนดเองก็ได้
// look: 'top' = ใช้วัสดุและสีเดียวกับท็อป (มีเฉพาะผนังกันเปื้อน)
export type SurfaceId = 'upper' | 'lower' | 'top' | 'splash' | 'floor';
export type Material = { id: string; name: Name; note: Name; look: Omit<Look, 'color'> | 'top' };
export type Colour = { hex: string; name: Name };
export type Surface = { material: string; color: string };
export const HEX = /^#[0-9a-f]{6}$/;

// ตู้บนกับตู้ล่างใช้รายการเดียวกัน แต่เลือกแยกกัน · ตู้สูงนับเป็นตู้ล่าง
const CABINET: { materials: Material[]; colours: Colour[] } = {
  materials: [
    {
      id: 'matte', name: { th: 'ผิวด้าน', en: 'Matte' },
      note: { th: 'ผิวด้านไม่สะท้อนแสง ไม่ค่อยเห็นรอยนิ้วมือ เหมาะกับครัวที่ใช้งานทุกวัน', en: 'A matte surface with no glare. Fingerprints barely show, which suits a kitchen in daily use.' },
      look: { roughness: 0.62 },
    },
    {
      id: 'gloss', name: { th: 'ผิวเงา', en: 'Gloss' },
      note: { th: 'ผิวเงาสะท้อนแสง ทำให้ครัวดูสว่างและกว้างขึ้น เช็ดคราบออกง่าย', en: 'A gloss surface that reflects light and makes the kitchen feel brighter and wider. It wipes clean easily.' },
      look: { roughness: 0.2 },
    },
    {
      id: 'wood', name: { th: 'ลายไม้', en: 'Wood Grain' },
      note: { th: 'ลายไม้ให้ความรู้สึกอบอุ่น เข้ากับท็อปหินได้ทุกสี', en: 'Wood grain that warms the room and sits well with any stone countertop.' },
      look: { roughness: 0.55, pattern: 'wood' },
    },
  ],
  colours: [
    { hex: '#eeece8', name: { th: 'ขาว', en: 'White' } },
    { hex: '#45464a', name: { th: 'เทาเข้ม', en: 'Graphite' } },
    { hex: '#b89468', name: { th: 'น้ำตาลโอ๊ค', en: 'Oak Brown' } },
    { hex: '#8f9c88', name: { th: 'เขียวหม่น', en: 'Sage' } },
  ],
};

export const SURFACES: Record<SurfaceId, { materials: Material[]; colours: Colour[] }> = {
  upper: CABINET,
  lower: CABINET,
  top: {
    materials: [
      {
        id: 'quartz', name: { th: 'ควอตซ์', en: 'Quartz' },
        note: { th: 'ควอตซ์มีเกล็ดละเอียด คราบไม่ค่อยฝัง เช็ดออกง่าย', en: 'Quartz with a fine fleck. Spills sit on the surface and wipe clean.' },
        look: { roughness: 0.3, pattern: 'speckle' },
      },
      {
        id: 'stone', name: { th: 'หินขัดเงา', en: 'Polished Stone' },
        note: { th: 'หินผิวเงา ให้ครัวดูหรูและนิ่ง ควรเช็ดให้แห้งหลังใช้เพื่อไม่ให้เห็นคราบน้ำ', en: 'Polished stone for a calm, formal kitchen. Wipe it dry after use so water marks do not show.' },
        look: { roughness: 0.22, pattern: 'speckle' },
      },
      {
        id: 'wood', name: { th: 'ไม้จริง', en: 'Solid Wood' },
        note: { th: 'ท็อปไม้จริง สัมผัสอุ่นมือ ต้องทาน้ำมันรักษาเนื้อไม้เป็นระยะ', en: 'A solid wood top that feels warm to the touch. It needs oiling from time to time.' },
        look: { roughness: 0.5, pattern: 'wood' },
      },
    ],
    colours: [
      { hex: '#e6e3dd', name: { th: 'ขาว', en: 'White' } },
      { hex: '#8d8983', name: { th: 'เทา', en: 'Grey' } },
      { hex: '#26262a', name: { th: 'ดำ', en: 'Black' } },
      { hex: '#a97c50', name: { th: 'น้ำตาลไม้', en: 'Wood Brown' } },
    ],
  },
  splash: {
    materials: [
      {
        id: 'tile-gloss', name: { th: 'กระเบื้องเงา', en: 'Gloss Tile' },
        note: { th: 'กระเบื้องผิวเงา สะท้อนแสงใต้ตู้ให้เคาน์เตอร์สว่าง เช็ดคราบน้ำมันออกง่าย', en: 'Gloss tile that bounces the under-cabinet light onto the counter and wipes clean of grease.' },
        look: { roughness: 0.18, pattern: 'tile', size: 0.5 },
      },
      {
        id: 'tile-satin', name: { th: 'กระเบื้องกึ่งด้าน', en: 'Satin Tile' },
        note: { th: 'กระเบื้องผิวกึ่งด้าน ไม่ค่อยเห็นคราบกระเด็น ดูเรียบร้อยอยู่เสมอ', en: 'Satin tile that hides splashes and always looks tidy.' },
        look: { roughness: 0.3, pattern: 'tile', size: 0.5 },
      },
      {
        id: 'match', name: { th: 'วัสดุเดียวกับท็อป', en: 'Same as Countertop' },
        note: { th: 'ใช้วัสดุและสีเดียวกับท็อปขึ้นผนัง ดูต่อเนื่องเป็นชิ้นเดียวกัน', en: 'The countertop material and colour carried up the wall, so counter and wall read as one piece.' },
        look: 'top',
      },
    ],
    colours: [
      { hex: '#efede8', name: { th: 'ขาว', en: 'White' } },
      { hex: '#a7a6a2', name: { th: 'เทา', en: 'Grey' } },
    ],
  },
  floor: {
    materials: [
      {
        id: 'planks', name: { th: 'ไม้แผ่น', en: 'Wood Planks' },
        note: { th: 'พื้นลายไม้แผ่นยาว ให้ห้องดูอบอุ่นและเดินสบายเท้า', en: 'Long wood boards that warm the room and feel easy underfoot.' },
        look: { roughness: 0.62, pattern: 'planks' },
      },
      {
        id: 'concrete', name: { th: 'ปูนขัดมัน', en: 'Polished Concrete' },
        note: { th: 'พื้นปูนขัดมันเรียบ ไม่มีร่องยาแนว ทำความสะอาดง่าย', en: 'Smooth polished concrete with no grout lines to clean.' },
        look: { roughness: 0.45, pattern: 'speckle', size: 2 },
      },
      {
        id: 'tile', name: { th: 'กระเบื้อง', en: 'Tile' },
        note: { th: 'กระเบื้องแผ่นใหญ่ เหมาะกับครัวที่ใช้งานหนัก', en: 'Large tiles for a busy kitchen.' },
        look: { roughness: 0.4, pattern: 'tile', size: 3 },
      },
    ],
    colours: [
      { hex: '#b7a085', name: { th: 'โอ๊คอ่อน', en: 'Light Oak' } },
      { hex: '#6f5340', name: { th: 'วอลนัต', en: 'Walnut' } },
      { hex: '#a3a09b', name: { th: 'เทา', en: 'Grey' } },
      { hex: '#b4b2ad', name: { th: 'เทาอ่อน', en: 'Pale Grey' } },
    ],
  },
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
  black: { th: 'ดำด้าน เด่นบนท็อปสีอ่อน เข้ากับมือจับและอุปกรณ์สีเข้ม', en: 'Matte black that stands out on a pale countertop and pairs with dark fittings.' },
  brass: { th: 'ทองเหลืองแปรง โทนอุ่น เป็นจุดเด่นของครัวโดยไม่ต้องแต่งเพิ่ม', en: 'Warm brushed brass. The one accent a kitchen needs.' },
  steel: { th: 'สเตนเลสแปรง ผิวด้านเข้าชุดกับซิงก์ ไม่ค่อยเห็นรอยนิ้วมือ', en: 'Brushed stainless that matches the sink and hides fingerprints.' },
};

// ทรงของก๊อกและซิงก์ (ปั้นใน components/room/kitchen.ts ตาม id) · เป็นทรงตัวอย่าง ไม่ใช่รุ่นที่จำหน่าย
export type Shape = { id: string; name: Name; note: Name };
export const FAUCET_SHAPES: Shape[] = [
  { id: 'gooseneck', name: { th: 'คอโค้งสูง', en: 'High Arc' }, note: { th: 'คอโค้งสูง วางหม้อใบใหญ่ใต้ก๊อกได้สบาย', en: 'A high arc that leaves room for a tall pot under the spout.' } },
  { id: 'square', name: { th: 'ทรงเหลี่ยม', en: 'Square' }, note: { th: 'เส้นตรงเหลี่ยมคม เข้ากับครัวแนวเรียบ', en: 'Straight lines and sharp corners for a clean, flat-fronted kitchen.' } },
  { id: 'spring', name: { th: 'สปริงดึงสาย', en: 'Spring Pull-down' }, note: { th: 'หัวฉีดดึงลงมาล้างได้ทั่วอ่าง แบบที่ใช้ในครัวร้านอาหาร', en: 'A pull-down spray head that reaches the whole bowl, as in a restaurant kitchen.' } },
];
export const SINKS: Shape[] = [
  { id: 'single', name: { th: 'หลุมเดียว', en: 'Single Bowl' }, note: { th: 'อ่างสเตนเลสหลุมเดียวกว้าง วางกระทะใบใหญ่ล้างได้ทั้งใบ', en: 'One wide stainless bowl that takes a large pan flat.' } },
  { id: 'double', name: { th: 'สองหลุม', en: 'Double Bowl' }, note: { th: 'สองหลุมแยกล้างกับพัก หลุมขวาตื้นกว่าไว้ล้างผัก', en: 'Two bowls to wash and to rest. The shallower right bowl is for rinsing vegetables.' } },
  { id: 'round', name: { th: 'หลุมกลม', en: 'Round Bowl' }, note: { th: 'อ่างกลมขนาดกะทัดรัด เหลือพื้นที่ท็อปสองข้างมากขึ้น', en: 'A compact round bowl that leaves more countertop on both sides.' } },
];

// สีอ่างซิงก์ ใช้กับอ่างทุกทรง (ข้อความตัวอย่าง)
export const SINK_COLORS: Option[] = [
  {
    id: 'steel', name: { th: 'สเตนเลส', en: 'Stainless' },
    note: { th: 'สเตนเลสผิวแปรง ทนร้อน ทนกระแทก เข้ากับครัวได้ทุกแบบ', en: 'Brushed stainless that takes heat and knocks and suits any kitchen.' },
    swatch: 'linear-gradient(135deg, #e3e4e5, #a9acaf)',
    look: { color: '#c8cacc', roughness: 0.32, metalness: 1 },
  },
  {
    id: 'black', name: { th: 'ดำด้าน', en: 'Matte Black' },
    note: { th: 'ดำด้าน กลืนไปกับท็อปสีเข้ม หรือตัดกับท็อปสีอ่อนให้เป็นจุดเด่น', en: 'Matte black that blends into a dark countertop or stands out on a pale one.' },
    swatch: '#262524',
    look: { color: '#232221', roughness: 0.62, metalness: 0.15 },
  },
  {
    id: 'white', name: { th: 'ขาวด้าน', en: 'Matte White' },
    note: { th: 'ขาวด้าน ทำให้มุมล้างดูสะอาดตา เข้าชุดกับหน้าบานสีอ่อน', en: 'Matte white for a clean-looking wash area that matches pale doors.' },
    swatch: '#ecebe7',
    look: { color: '#ecebe7', roughness: 0.48 },
  },
  {
    id: 'gunmetal', name: { th: 'เทากันเมทัล', en: 'Gunmetal' },
    note: { th: 'โลหะสีเทาเข้ม ดูขรึมกว่าสเตนเลส ไม่ค่อยเห็นคราบน้ำ', en: 'Dark grey metal, quieter than stainless, and slow to show water marks.' },
    swatch: 'linear-gradient(135deg, #8b8e91, #55585b)',
    look: { color: '#6f7275', roughness: 0.36, metalness: 1 },
  },
];
export type Picks = Record<SurfaceId, Surface> & { faucet: string; faucetShape: string; sink: string; sinkColor: string };
export type Part = SurfaceId | 'faucet' | 'sink'; // ชิ้นส่วนที่ชี้และเจาะดูได้ในฉาก
export const DEFAULT_PICKS: Picks = {
  upper: { material: 'matte', color: '#eeece8' },
  lower: { material: 'matte', color: '#eeece8' },
  top: { material: 'quartz', color: '#8d8983' },
  splash: { material: 'tile-gloss', color: '#efede8' },
  floor: { material: 'planks', color: '#b7a085' },
  faucet: 'chrome', faucetShape: 'gooseneck', sink: 'single', sinkColor: 'steel',
};

// ── แสง ──
// sun = แสงจากหน้าต่าง, hemi = แสงฟ้า, env = แรงของเงาสะท้อน, led = ไฟใต้ตู้แขวน
// ไฟติดพร้อมกันได้ไม่เกิน 6 ดวง (hemi 1 + led 3 + sun 1 + ไฟราง 1) · check:room ตรวจ
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
  view: number; // ความสว่างของวิวนอกหน้าต่าง 0 ถึง 1
  track: number; // ไฟรางเหนือครัว 0 ถึง 1 (หัวไฟเรืองแสง และไฟจริง 1 ดวงเหนือครัวที่ดูอยู่)
};
export const LIGHTS: LightPreset[] = [
  { id: 'day', name: { th: 'กลางวัน', en: 'Daylight' }, sun: 3.1, sunColor: '#fff1dc', hemi: 0.38, env: 0.5, led: 0, ledColor: '#ffc98f', bg: '#e9e6e1', exposure: 0.82, view: 1, track: 0.3 },
  { id: 'warm', name: { th: 'วอร์มไวท์ 3000K', en: 'Warm White 3000K' }, sun: 1.7, sunColor: '#ffd2a0', hemi: 0.22, env: 0.3, led: 6, ledColor: '#ffc98f', bg: '#2a2420', exposure: 1, view: 0.35, track: 1 },
  { id: 'cool', name: { th: 'คูลไวท์ 6000K', en: 'Cool White 6000K' }, sun: 1.9, sunColor: '#e6eeff', hemi: 0.26, env: 0.34, led: 6, ledColor: '#e4eeff', bg: '#22262b', exposure: 1, view: 0.4, track: 1 },
  { id: 'night', name: { th: 'กลางคืน', en: 'Night' }, sun: 0, sunColor: '#ffd9a8', hemi: 0.09, env: 0.14, led: 7, ledColor: '#ffc98f', bg: '#141210', exposure: 1.05, view: 0.06, track: 1 },
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
  props: Prop[];
};
// ของวางบนเคาน์เตอร์ (ของประกอบฉาก) · x, z = จุดกลางชิ้น นับจากกลาง bay · check:room ตรวจว่าอยู่บนท็อป ไม่ทับซิงก์หรือเตา
export type Prop = { kind: 'board' | 'bowl' | 'vase' | 'books'; x: number; z: number };
// มุมเจาะดูชิ้นส่วน: at = จุดบนชิ้นส่วน [x จากกลาง bay, y, z] เป็นทั้งจุดปลายเส้นชี้และจุดที่กล้องมอง
export type Focus = { at: [number, number, number]; azimuth: number; polar: number; distance: number };
// ขอบเขตกล้องตอนเจาะดู: หมุนได้ข้างละ azimuth จากมุมเจาะ · zoom เป็นเมตร
export const FOCUS = { azimuth: 0.61, zoomMin: 1.2, zoomMax: 3.2 };

export const BAY_PITCH = 9; // ระยะห่างกลาง bay ถึงกลาง bay
export const HALL = { width: 27, depth: 5, height: 4.6 }; // สูงเผื่อจอแนวตั้งที่มุมกล้องกว้าง ไม่ให้เห็นขอบบนผนัง
// ขอบเขตกล้อง: หมุนซ้ายขวาข้างละ azimuth (รวม 180 องศา) · polar วัดจากแนวดิ่ง · zoom เป็นเมตร · polarMin 1.05 = กล้องซูมออกสุดยังอยู่ต่ำกว่าขอบบนผนัง
export const ORBIT = { azimuth: Math.PI / 2, polarMin: 1.05, polarMax: 1.52, zoomMin: 2.8, zoomMax: 7 };

// ── โถงโชว์รูม (ของประกอบฉาก ชี้และกดไม่ได้) ──
// x = ตำแหน่งกลางชิ้นบนแกน x ของห้อง · z = ระยะจากผนังหลัง · ปั้นใน components/room/hall.ts · check:room ตรวจว่าไม่ทับครัว
export const SHOWROOM = {
  skirting: 0.1, // ความสูงบัวพื้น
  pilasters: { xs: [-6.7, -2.0, 2.0, 6.9], w: 0.4, d: 0.4 }, // เสาอิงผนัง คั่นระหว่างครัว
  windows: { xs: [-4.35, 4.45], w: 2.4, y0: 0.5, y1: 2.9 },
  rails: { y: 3.0, zs: [1.4], heads: [-0.9, 0, 0.9] }, // รางไฟแขวนเหนือครัวแต่ละชุด · heads = ระยะหัวไฟจากกลาง bay
  sign: { y: 2.62, w: 1.2, h: 0.42 }, // ป้ายชื่อผังเหนือครัว
  bench: { x: -4.35, z: 0.9, w: 1.6, d: 0.4 },
  plant: { x: -6.0, z: 0.55, r: 0.3, spread: 0.4 }, // r = พุ่มใบก้อนใหญ่ · spread = ระยะที่พุ่มใบยื่นจากลำต้น
  table: { x: 4.45, z: 0.9, w: 1.6, d: 0.7 },
};

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
      upper: { at: [1.5, 1.8, 0.34], azimuth: 0.35, polar: 1.45, distance: 2.4 },
      lower: { at: [1.5, 0.48, 0.58], azimuth: 0.35, polar: 1.3, distance: 2.7 },
      top: { at: [0.4, 0.9, 0.3], azimuth: 0.3, polar: 1.1, distance: 1.8 },
      splash: { at: [0.4, 1.17, 0.01], azimuth: 0.25, polar: 1.4, distance: 2 },
      floor: { at: [0, 0, 1.6], azimuth: 0.3, polar: 1.05, distance: 3 },
      faucet: { at: [-0.2, 1.1, 0.07], azimuth: 0.4, polar: 1.3, distance: 1.4 },
      sink: { at: [-0.2, 0.9, 0.32], azimuth: 0.2, polar: 1.05, distance: 1.5 },
    },
    props: [{ kind: 'board', x: -0.9, z: 0.36 }, { kind: 'vase', x: -1.05, z: 0.14 }, { kind: 'bowl', x: 1.36, z: 0.36 }, { kind: 'books', x: 1.62, z: 0.18 }],
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
      upper: { at: [0.6, 1.8, 0.34], azimuth: 0.35, polar: 1.45, distance: 2.4 },
      lower: { at: [0.6, 0.48, 0.58], azimuth: 0.35, polar: 1.3, distance: 2.7 },
      top: { at: [-0.6, 0.9, 0.3], azimuth: 0.45, polar: 1.1, distance: 1.8 },
      splash: { at: [-0.6, 1.17, 0.01], azimuth: 0.4, polar: 1.4, distance: 2 },
      floor: { at: [0.4, 0, 1.8], azimuth: 0.3, polar: 1.05, distance: 3 },
      faucet: { at: [-1.43, 1.1, 2], azimuth: 0.9, polar: 1.3, distance: 1.4 },
      sink: { at: [-1.18, 0.9, 2], azimuth: 0.9, polar: 1.05, distance: 1.5 },
    },
    props: [{ kind: 'bowl', x: -1.2, z: 0.3 }, { kind: 'vase', x: 0.6, z: 0.15 }, { kind: 'board', x: -1.2, z: 2.7 }, { kind: 'books', x: -1.2, z: 0.9 }],
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
      upper: { at: [-0.7, 1.8, 0.34], azimuth: 0.45, polar: 1.45, distance: 2.4 },
      lower: { at: [-0.7, 0.48, 0.58], azimuth: 0.45, polar: 1.25, distance: 2.7 }, // มุมเอียงขวา: หมุนสุดทางซ้ายแล้วขาซ้ายยังไม่บังบาน
      top: { at: [0.7, 0.9, 0.3], azimuth: -0.2, polar: 1.1, distance: 1.8 },
      splash: { at: [0.7, 1.17, 0.01], azimuth: -0.15, polar: 1.4, distance: 2 },
      floor: { at: [0, 0, 2], azimuth: 0, polar: 1.05, distance: 3 },
      faucet: { at: [-1.53, 1.1, 1.8], azimuth: 0.9, polar: 1.3, distance: 1.4 },
      sink: { at: [-1.28, 0.9, 1.8], azimuth: 0.9, polar: 1.05, distance: 1.5 },
    },
    props: [{ kind: 'vase', x: -1.3, z: 0.25 }, { kind: 'bowl', x: 1.3, z: 0.3 }, { kind: 'board', x: 1.3, z: 2.1 }, { kind: 'books', x: -1.3, z: 2.5 }],
  },
];

export const runLength = (run: Run) => Math.round(run.modules.reduce((sum, m) => sum + m.w, 0) * 1000) / 1000;
