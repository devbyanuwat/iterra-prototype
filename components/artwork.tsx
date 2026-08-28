// ── ภาพจำลองสินค้า (procedural) ──
// วาดด้วย SVG ในตัว ไม่ดึงรูปจากภายนอก เพราะ:
//   1. เว็บเป็น static export — ไม่ต้องแบกไฟล์รูปเข้า repo
//   2. อาร์ตไดเรกชันคุมได้ทั้งเว็บ ไม่ใช่รูปสต็อกคนละอารมณ์ 60 ใบ
//   3. id ของ filter/gradient คำนวณจาก label แบบ deterministic — SSR กับ client ตรงกัน
//
// เมื่อได้ภาพถ่ายจริงแล้ว ลบไฟล์นี้ทิ้ง แล้วเปลี่ยน Placeholder เป็น <Image /> ของ next/image
// (สัดส่วนถูกล็อกไว้ที่ call site แล้ว)

export type ArtKind =
  | 'sink'
  | 'faucet'
  | 'hob'
  | 'hood'
  | 'oven'
  | 'dishwasher'
  | 'kitchen'
  | 'toilet'
  | 'shower'
  | 'basin'
  | 'bathtub'
  | 'bathroom'
  | 'interior'
  | 'tools'
  | 'map'
  | 'abstract';

// เรียงจากคำเฉพาะไปคำกว้าง — 'เตาอบ' ต้องมาก่อน 'เตา', 'อ่างอาบน้ำ' ต้องมาก่อน 'อ่าง'
const KEYWORDS: ReadonlyArray<readonly [string, ArtKind]> = [
  ['เตาอบ', 'oven'],
  ['อ่างอาบน้ำ', 'bathtub'],
  ['ดูดควัน', 'hood'],
  ['ล้างจาน', 'dishwasher'],
  ['ซิงก์', 'sink'],
  ['ฝักบัว', 'shower'],
  ['สุขภัณฑ์', 'toilet'],
  ['ก๊อก', 'faucet'],
  ['สัมผัสจริง', 'faucet'],
  ['ภาพสินค้า', 'faucet'],
  ['Induction', 'hob'],
  ['เตา', 'hob'],
  ['ห้องน้ำ', 'bathroom'],
  ['สปา', 'bathroom'],
  ['อ่าง', 'basin'],
  ['ครัว', 'kitchen'],
  ['โชว์รูม', 'interior'],
  ['ร้านแรก', 'interior'],
  ['คลังสินค้า', 'interior'],
  ['ทีมช่าง', 'tools'],
  ['ทีมติดตั้ง', 'tools'],
  ['แผนที่', 'map'],
  // ท้ายสุดเสมอ: กวาดป้าย 'เกี่ยวกับเรา ...' ที่เหลือ ต้องอยู่หลัง 'ทีมช่าง'/'คลังสินค้า' ไม่งั้นแย่งไปหมด
  ['เกี่ยวกับเรา', 'interior'],
];

export function resolveKind(label: string): ArtKind {
  for (const [word, kind] of KEYWORDS) {
    if (label.includes(word)) return kind;
  }
  return 'abstract';
}

// djb2 — ใช้แปลง label เป็นตัวเลขคงที่ สำหรับสุ่มมุมแสง/เอียงชิ้นงานให้ภาพชุดเดียวกันไม่ซ้ำเป๊ะ
export function hashLabel(label: string): number {
  let h = 5381;
  for (let i = 0; i < label.length; i += 1) h = ((h << 5) + h + label.charCodeAt(i)) >>> 0;
  return h;
}

type Palette = {
  bgTop: string;
  bgBottom: string;
  glow: string;
  line: string;
  fill: string;
  fillDeep: string;
  shadow: string;
};

export const PALETTE: Record<'light' | 'dark', Palette> = {
  light: {
    bgTop: '#f2efe9',
    bgBottom: '#ddd7cc',
    glow: '#fffdf8',
    line: '#6f665c',
    fill: '#fbfaf7',
    fillDeep: '#e6e1d7',
    shadow: '#4a423a',
  },
  dark: {
    bgTop: '#302c28',
    bgBottom: '#17150f',
    glow: '#5c544a',
    line: '#c2bbb1',
    fill: '#3b3630',
    fillDeep: '#2a2621',
    shadow: '#000000',
  },
};

// ── รูปทรงสินค้า ──
// ทุกชิ้นวาดในกรอบ 400×400 ชิ้นงานลอยกลางเฟรม เงาอยู่ราว y=316
// stroke ทั้งหมดกำหนดที่ <g> ชั้นนอก ตัวรูปทรงกำหนดแค่ fill

function Shape({ kind }: { kind: ArtKind }) {
  switch (kind) {
    case 'sink':
      return (
        <>
          <rect x="86" y="118" width="228" height="164" rx="20" fill="var(--art-fill)" />
          <rect x="102" y="134" width="196" height="132" rx="12" fill="var(--art-deep)" />
          <path d="M200 134V266" />
          <circle cx="151" cy="228" r="9" fill="var(--art-fill)" />
          <circle cx="249" cy="228" r="9" fill="var(--art-fill)" />
          <path d="M151 152h34M249 152h34" opacity="0.45" />
        </>
      );

    case 'faucet':
      return (
        <>
          <ellipse cx="176" cy="298" rx="46" ry="11" fill="var(--art-fill)" />
          <path d="M176 296V150" strokeWidth="14" strokeLinecap="round" />
          <path d="M176 150c0-30 14-46 44-46s44 18 44 44v38" strokeWidth="14" strokeLinecap="round" />
          <rect x="252" y="182" width="24" height="26" rx="5" fill="var(--art-fill)" />
          <path d="M170 196l-46-20" strokeWidth="12" strokeLinecap="round" />
          <circle cx="122" cy="175" r="11" fill="var(--art-fill)" />
        </>
      );

    case 'hob':
      return (
        <>
          <rect x="72" y="140" width="256" height="146" rx="16" fill="var(--art-fill)" />
          <circle cx="140" cy="186" r="30" fill="var(--art-deep)" />
          <circle cx="260" cy="186" r="30" fill="var(--art-deep)" />
          <circle cx="140" cy="242" r="24" fill="var(--art-deep)" />
          <circle cx="260" cy="242" r="24" fill="var(--art-deep)" />
          <circle cx="186" cy="266" r="5" fill="var(--art-line)" stroke="none" />
          <circle cx="200" cy="266" r="5" fill="var(--art-line)" stroke="none" />
          <circle cx="214" cy="266" r="5" fill="var(--art-line)" stroke="none" />
        </>
      );

    case 'hood':
      return (
        <>
          <rect x="176" y="70" width="48" height="98" rx="4" fill="var(--art-deep)" />
          <path d="M96 244l40-76h128l40 76z" fill="var(--art-fill)" />
          <rect x="96" y="244" width="208" height="22" rx="4" fill="var(--art-deep)" />
          <path d="M124 256h60M216 256h60" opacity="0.5" />
        </>
      );

    case 'oven':
      return (
        <>
          <rect x="96" y="104" width="208" height="208" rx="10" fill="var(--art-fill)" />
          <circle cx="126" cy="132" r="9" fill="var(--art-deep)" />
          <circle cx="274" cy="132" r="9" fill="var(--art-deep)" />
          <path d="M118 168h164" strokeWidth="10" strokeLinecap="round" />
          <rect x="118" y="192" width="164" height="98" rx="8" fill="var(--art-deep)" />
          <path d="M118 216h164" opacity="0.35" />
        </>
      );

    case 'dishwasher':
      return (
        <>
          <rect x="116" y="82" width="168" height="238" rx="8" fill="var(--art-fill)" />
          <circle cx="140" cy="104" r="5" fill="var(--art-line)" stroke="none" />
          <circle cx="156" cy="104" r="5" fill="var(--art-line)" stroke="none" />
          <path d="M134 130h132" strokeWidth="10" strokeLinecap="round" />
          <rect x="134" y="154" width="132" height="146" rx="6" fill="var(--art-deep)" />
          <path d="M134 240h132" opacity="0.35" />
        </>
      );

    case 'kitchen':
      return (
        <>
          <rect x="56" y="64" width="288" height="76" rx="5" fill="var(--art-deep)" />
          <path d="M152 64v76M248 64v76" />
          <rect x="46" y="228" width="308" height="16" rx="4" fill="var(--art-fill)" />
          <rect x="62" y="244" width="276" height="84" rx="5" fill="var(--art-deep)" />
          <path d="M154 244v84M246 244v84" />
          <path d="M118 228v-40c0-16 4-22 22-22s22 8 22 20v10" strokeWidth="9" strokeLinecap="round" />
          <rect x="220" y="200" width="94" height="28" rx="6" fill="var(--art-fill)" />
          <circle cx="244" cy="214" r="8" fill="var(--art-deep)" />
          <circle cx="290" cy="214" r="8" fill="var(--art-deep)" />
        </>
      );

    case 'toilet':
      // ภาพด้านข้าง หันหน้าไปทางซ้าย: ถังน้ำอยู่ขวา โถอยู่ซ้าย ฐานสอบเข้าด้านล่าง
      return (
        <>
          <rect x="216" y="96" width="88" height="100" rx="10" fill="var(--art-deep)" />
          <circle cx="260" cy="120" r="9" fill="var(--art-fill)" />
          <path
            d="M304 196v-4H150c-34 0-58 22-58 50 0 26 20 46 52 48v6h160z"
            fill="var(--art-fill)"
          />
          <path d="M106 232h150" opacity="0.4" />
          <path d="M170 296l-10 30h132l-10-30z" fill="var(--art-deep)" />
        </>
      );

    case 'shower':
      // ฝักบัวเรนชาวเวอร์แบบติดเพดาน: จานแบนกว้าง มองเฉียงเล็กน้อยให้เห็นความหนา
      return (
        <>
          <path d="M200 46v52" strokeWidth="13" strokeLinecap="round" />
          <path d="M116 116a84 22 0 01168 0v16a84 22 0 01-168 0z" fill="var(--art-fill)" />
          <ellipse cx="200" cy="116" rx="84" ry="22" fill="var(--art-deep)" />
          <ellipse cx="200" cy="116" rx="62" ry="14" opacity="0.4" />
          <path
            d="M150 168v52M175 168v78M200 168v96M225 168v78M250 168v52"
            strokeLinecap="round"
            opacity="0.45"
          />
        </>
      );

    case 'basin':
      return (
        <>
          <path d="M200 168v-42c0-16 6-24 24-24h30" strokeWidth="11" strokeLinecap="round" />
          <path
            d="M116 174h168l-14 74c-4 22-20 34-40 34h-60c-20 0-36-12-40-34z"
            fill="var(--art-fill)"
          />
          <path d="M116 174h168" strokeWidth="9" strokeLinecap="round" />
          <circle cx="200" cy="252" r="8" fill="var(--art-deep)" />
        </>
      );

    case 'bathtub':
      return (
        <>
          <path
            d="M84 176h232l-18 100c-4 24-24 40-50 40H152c-26 0-46-16-50-40z"
            fill="var(--art-fill)"
          />
          <path d="M84 176h232" strokeWidth="9" strokeLinecap="round" />
          <path d="M108 206h184" opacity="0.35" />
          <path d="M296 176v-44c0-14 6-20 20-20h14" strokeWidth="9" strokeLinecap="round" />
        </>
      );

    case 'bathroom':
      // ซ้าย = อ่างอาบน้ำหน้าผนังกระเบื้อง ขวา = กระจกกลมกับอ่างล้างหน้า
      return (
        <>
          <rect x="34" y="86" width="186" height="130" fill="var(--art-deep)" opacity="0.4" />
          <path d="M34 130h186M34 174h186M96 86v130M158 86v130" opacity="0.35" />
          <path
            d="M40 216h180l-15 68c-4 19-19 30-35 30H90c-17 0-32-11-35-30z"
            fill="var(--art-fill)"
          />
          <path d="M40 216h180" strokeWidth="8" strokeLinecap="round" />
          <circle cx="300" cy="104" r="42" fill="var(--art-fill)" />
          <path d="M300 196v-22c0-10 5-15 14-15h10" strokeWidth="7" strokeLinecap="round" />
          <path d="M254 202h92l-9 40c-3 12-11 19-22 19h-30c-11 0-19-7-22-19z" fill="var(--art-fill)" />
          <path d="M254 202h92" strokeWidth="7" strokeLinecap="round" />
        </>
      );

    case 'interior':
      // ห้องมุมมองหนึ่งจุด: ผนังหลังสว่างสุด พื้นเข้มสุด ผนังข้าง/เพดานไล่ opacity คั่นระหว่างกลาง
      return (
        <>
          <path d="M40 60l94 84h132l94-84z" fill="var(--art-deep)" opacity="0.3" />
          <path d="M40 60v280l94-96V144z" fill="var(--art-deep)" opacity="0.55" />
          <path d="M360 60v280l-94-96V144z" fill="var(--art-deep)" opacity="0.55" />
          <path d="M40 340l94-96h132l94 96z" fill="var(--art-deep)" />
          <rect x="134" y="144" width="132" height="100" fill="var(--art-fill)" />
          <path d="M40 60l94 84M360 60l-94 84M40 340l94-96M360 340l-94-96" />
          <rect x="146" y="212" width="108" height="32" rx="3" fill="var(--art-fill)" />
          <path d="M64 168l56 14M64 214l56 6M336 168l-56 14M336 214l-56 6" opacity="0.5" />
          <path d="M200 144v22" />
          <path d="M186 190h28l-6-24h-16z" fill="var(--art-fill)" />
        </>
      );

    case 'tools':
      // ประแจปากตาย: หัวเป็นวงเจาะร่องด้วย fill-rule evenodd ร่องต้องล้ำขอบบนออกไปถึงจะเปิด
      return (
        <g transform="rotate(-28 200 200)">
          <path
            fillRule="evenodd"
            d="M156 92a20 20 0 0120-20h48a20 20 0 0120 20v44a20 20 0 01-20 20h-48a20 20 0 01-20-20zM182 56h36v56h-36z"
            fill="var(--art-fill)"
          />
          <rect x="186" y="156" width="28" height="152" rx="14" fill="var(--art-fill)" />
          <path d="M192 196h16M192 228h16" opacity="0.4" />
        </g>
      );

    case 'map':
      return (
        <>
          <path d="M20 132h360M20 244h360" opacity="0.35" />
          <path d="M112 40v320M288 40v320" opacity="0.35" />
          <path d="M20 188h360" strokeWidth="12" opacity="0.5" />
          <path d="M200 40v320" strokeWidth="12" opacity="0.5" />
          <path
            d="M200 92c-30 0-54 24-54 54 0 40 54 96 54 96s54-56 54-96c0-30-24-54-54-54z"
            fill="var(--art-fill)"
          />
          <circle cx="200" cy="146" r="20" fill="var(--art-deep)" />
        </>
      );

    default:
      return (
        <>
          <circle cx="200" cy="176" r="98" fill="var(--art-fill)" />
          <path d="M102 176a98 98 0 0098 98" strokeWidth="10" strokeLinecap="round" />
          <circle cx="200" cy="176" r="52" fill="var(--art-deep)" />
          <path d="M60 300h280" opacity="0.3" />
        </>
      );
  }
}

/** ภาพสตูดิโอหนึ่งใบ: พื้นหลังไล่เฉด + แสงส่องมุมบนซ้าย + เงาใต้ชิ้นงาน + เกรน */
export function Artwork({ label, dark = false }: { label: string; dark?: boolean }) {
  const kind = resolveKind(label);
  const seed = hashLabel(label);
  const p = PALETTE[dark ? 'dark' : 'light'];

  // id ต้องไม่ชนกันระหว่างภาพหลายใบในหน้าเดียว และต้องเหมือนกันทั้ง SSR/client
  const uid = `a${seed.toString(36)}`;
  // ภาพชุด 01–04 ของสินค้าเดียวกันต้องไม่ซ้ำเป๊ะ — เลื่อนทิศแสงกับย่อ/ขยายเล็กน้อย
  // (เคยเอียงชิ้นงานด้วย แต่เตาอบเอียง 2 องศาอ่านว่า "วางเบี้ยว" ไม่ใช่ "จัดวาง")
  const glowX = 78 + (seed % 7) * 14;
  const glowY = 54 + ((seed >> 3) % 5) * 12;
  const scale = 0.96 + ((seed >> 6) % 5) * 0.02;

  return (
    <svg
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      data-art={kind}
      aria-hidden
      style={
        {
          '--art-line': p.line,
          '--art-fill': p.fill,
          '--art-deep': p.fillDeep,
        } as React.CSSProperties
      }
    >
      <defs>
        <linearGradient id={`${uid}bg`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor={p.bgTop} />
          <stop offset="100%" stopColor={p.bgBottom} />
        </linearGradient>
        <radialGradient id={`${uid}glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={p.glow} stopOpacity={dark ? 0.5 : 0.95} />
          <stop offset="100%" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}shadow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={p.shadow} stopOpacity={dark ? 0.7 : 0.28} />
          <stop offset="100%" stopColor={p.shadow} stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>

      <rect width="400" height="400" fill={`url(#${uid}bg)`} />
      <ellipse cx={glowX} cy={glowY} rx="260" ry="220" fill={`url(#${uid}glow)`} />

      {/* เงาใต้ชิ้นงาน วางก่อนตัวสินค้าเพื่อให้ถูกทับ */}
      <ellipse cx="200" cy="322" rx="150" ry="46" fill={`url(#${uid}shadow)`} />

      <g
        transform={`translate(200 200) scale(${scale}) translate(-200 -200)`}
        fill="none"
        stroke="var(--art-line)"
        strokeWidth="3.5"
        strokeLinejoin="round"
      >
        <Shape kind={kind} />
      </g>

      {/* เกรน — กันภาพแบนแบบเวคเตอร์ล้วน */}
      <rect
        width="400"
        height="400"
        filter={`url(#${uid}grain)`}
        opacity={dark ? 0.12 : 0.09}
        style={{ mixBlendMode: 'multiply' }}
      />
    </svg>
  );
}
