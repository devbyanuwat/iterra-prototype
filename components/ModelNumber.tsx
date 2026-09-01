// เลขรุ่นยักษ์ที่เป็นเลย์เอาต์ ไม่ใช่ของประดับ (spec finish-first §4.3)
//
// ยืมท่าจาก nickho-motorsports: เลขรุ่นเซ็ต 300–420px ink 7% วางหลังสินค้า
// (ธีมสว่างแล้ว ขาว 6% บนการ์ดขาวคือหายไปเฉย ๆ จึงพลิกเป็น ink บาง ๆ แทน)
// และ **ตัดขอบเฟรม** — bounding box ต้องล้นออกนอก container จริง ไม่ใช่ตัวใหญ่จัดกลาง
// ถ้ามันพอดีเฟรม แปลว่าทำผิด (AC ข้อ 6 วัดด้วย getBoundingClientRect)
//
// ใช้ที่: การ์ดในหน้า /finish/[code] และหน้า detail
// ห้ามใช้: หน้าแรก — กำแพงผิวเคลือบต้องไม่มีอะไรแย่งสายตา (§4.3)
//
// ความเสี่ยง §6 ข้อ 4 — horizontal overflow ที่ 390px:
// container ของเลขต้องเป็น `overflow: clip` **ไม่ใช่** `overflow: hidden` บน body
// clip ไม่สร้าง scroll container จึงตัดจริงโดยไม่ผลัก scrollWidth ของหน้า
// component นี้จึงถือ clip layer ไว้เอง ผู้เรียกจะลืมใส่ไม่ได้
//
// เรื่อง line-height: เลขรุ่นเป็นละตินและตัวเลขล้วน (`K-77959T-4A`) ไม่มีสระลอย
// ไม่มีวรรณยุกต์ จึงได้รับการยกเว้นจากกฎ line-height ไทย 1.08 ที่บังคับกับ
// ตัวอักษรอื่นทั้งเว็บ — ใช้ leading-none ได้ตามดีไซน์

type Props = {
  /** เลขรุ่นดิบจากข้อมูล เช่น 'K-77959T-4A' */
  model: string;
  /**
   * 'card'   = การ์ดในกริดหน้าเฉด — เกาะซ้ายล่าง ล้นออกทางขวาและล่าง
   * 'detail' = เวทีหน้าสินค้า — ใหญ่กว่า เกาะซ้ายบนของเวที
   */
  variant?: 'card' | 'detail';
  className?: string;
};

// clamp กันไว้ทั้งสองด้านให้อยู่ในช่วง 300–420px ตามสเปกที่ทุกความกว้างจอ:
// ที่ 1440px ค่ากลางคำนวณได้เกิน 420 จึงถูกตรึงที่ 420
// ที่ 390px คำนวณได้ต่ำกว่า 300 จึงถูกตรึงที่ 300 — เล็กกว่านี้ไม่ได้ ไม่งั้นเลขจะ
// พอดีเฟรมแล้วหมดความเป็น "ตัดขอบ"
const SIZE = {
  card: 'clamp(300px, 34vw, 420px)',
  detail: 'clamp(300px, 30vw, 420px)',
} as const;

export default function ModelNumber({ model, variant = 'card', className = '' }: Props) {
  return (
    <div
      aria-hidden
      // overflow-clip ไม่ใช่ overflow-hidden — ดูหมายเหตุความเสี่ยงข้อ 4 ด้านบน
      // -z-0 กับ pointer-events-none: เลขอยู่ "หลัง" สินค้าและไม่ขวางการคลิก
      className={`pointer-events-none absolute inset-0 select-none overflow-clip ${className}`}
      data-model-frame={model}
    >
      <span
        data-model-number={model}
        style={{
          fontSize: SIZE[variant],
          // ตรึงไว้ที่ขอบซ้ายแล้วปล่อยให้ nowrap ดันทะลุออกไปทางขวา
          // ค่าติดลบทำให้ตัวอักษรตัวแรกถูกเฉือนด้วย เฟรมจึงกินเลขทั้งสองด้าน
          left: variant === 'card' ? '-0.12em' : '-0.08em',
          [variant === 'card' ? 'bottom' : 'top']: '-0.22em',
        }}
        className={[
          // The one place a sub-400 weight survives the retheme: 300-420px,
          // aria-hidden, and painted at 6% — it is a watermark behind the
          // product, not text anyone reads, so the weight floor in spec §3.2
          // does not apply to it.
          'absolute whitespace-nowrap font-display font-extralight leading-none tabular-nums',
          'tracking-[-0.03em] text-[rgba(35,35,35,0.07)]',
        ].join(' ')}
      >
        {model}
      </span>
    </div>
  );
}
