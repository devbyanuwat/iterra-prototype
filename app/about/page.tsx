import type { Metadata } from 'next';
import Reveal from '@/components/Reveal';
import ParallaxImage from '@/components/ParallaxImage';

export const metadata: Metadata = {
  title: 'เกี่ยวกับเรา — เรื่องราวของ ITERRA',
  description:
    'กว่า 25 ปีของ ITERRA ดีลเลอร์ชุดครัวและอุปกรณ์ครัวพรีเมียม จากร้านเล็กบนถนนสุขุมวิทสู่โชว์รูมที่ให้คุณสัมผัสของจริงทุกชิ้น',
  alternates: { canonical: '/about/' },
};

const SECTIONS = [
  {
    kicker: '2001 — จุดเริ่มต้น',
    title: 'จากร้านห้องแถวหนึ่งคูหา',
    body: 'ITERRA เริ่มต้นจากร้านอุปกรณ์ครัวเล็ก ๆ บนถนนสุขุมวิท ด้วยความเชื่อว่า "ของดีต้องให้ลูกค้าจับก่อนซื้อ" เราจึงแกะทุกกล่อง ต่อน้ำเข้าทุกก๊อก และเปิดให้ลองตั้งแต่วันแรก — ธรรมเนียมที่ยังทำอยู่จนถึงวันนี้',
    image: 'เกี่ยวกับเรา ภาพ 01 (ร้านแรก)',
  },
  {
    kicker: 'CURATION — วิธีคัดสรร',
    title: 'เกณฑ์เดียว: บ้านเราใช้เองได้ไหม',
    body: 'ทุกชิ้นที่อยู่ในโชว์รูมผ่านการใช้จริงโดยทีมงานอย่างน้อยสามเดือน ชิ้นไหนไม่ผ่านมือเรา ไม่มีสิทธิ์ผ่านตาลูกค้า ปัจจุบันเราเป็นดีลเลอร์อย่างเป็นทางการของแบรนด์ชั้นนำ 12 แบรนด์จากยุโรปและเอเชีย',
    image: 'เกี่ยวกับเรา ภาพ 02 (คลังสินค้า)',
  },
  {
    kicker: 'SHOWROOM — พื้นที่ของเรา',
    title: 'โชว์รูมที่ออกแบบเหมือนบ้านจริง',
    body: 'เราจัดโชว์รูมเป็นห้องครัวขนาดเท่าของจริง ไม่ใช่ชั้นวางสินค้า เพื่อให้คุณเห็นว่าซิงก์ตัวนี้อยู่กับท็อปหินสีนี้แล้วเป็นอย่างไร แสงตอนเย็นตกกระทบก๊อกทองเหลืองแล้วให้อารมณ์แบบไหน',
    image: 'เกี่ยวกับเรา ภาพ 03 (โชว์รูม)',
  },
  {
    kicker: 'SERVICE — หลังการขาย',
    title: 'ทีมช่างของเราเอง ไม่ใช่ผู้รับเหมาช่วง',
    body: 'งานวัดหน้างาน ติดตั้ง และบริการหลังการขายทั้งหมดดูแลโดยทีมช่างประจำของ ITERRA ที่ผ่านการอบรมจากแบรนด์โดยตรง พร้อมรับประกันงานติดตั้งและตัวสินค้าสูงสุด 10 ปี',
    image: 'เกี่ยวกับเรา ภาพ 04 (ทีมช่าง)',
  },
];

export default function AboutPage() {
  return (
    <>
      {/* header */}
      <section className="px-6 pb-16 pt-36 md:px-[8vw] md:pb-24 md:pt-44">
        <Reveal>
          <p className="mb-4 text-[11px] uppercase tracking-widest2 text-warm-500">OUR STORY</p>
          <h1 className="max-w-3xl text-4xl font-extralight leading-[1.2] tracking-wide md:text-6xl">
            25 ปีของการคัดสรร
            <br />
            สิ่งที่ดีที่สุดให้บ้านคุณ
          </h1>
        </Reveal>
      </section>

      <Reveal className="px-6 md:px-[8vw]">
        <ParallaxImage label="เกี่ยวกับเรา ภาพเปิด 21:9" ratio="21/9" speed={-6} />
      </Reveal>

      {/* ภาพสลับข้อความ + parallax เบา ๆ */}
      <div className="space-y-24 px-6 py-24 md:space-y-36 md:px-[8vw] md:py-36">
        {SECTIONS.map((s, i) => (
          <section
            key={s.kicker}
            className={`grid items-center gap-10 md:grid-cols-2 md:gap-[6vw] ${
              i % 2 ? 'md:[&>*:first-child]:order-2' : ''
            }`}
          >
            <Reveal>
              <ParallaxImage label={s.image} ratio="4/5" speed={i % 2 ? 8 : -8} />
            </Reveal>
            <Reveal delay={0.15}>
              <p className="mb-4 text-[11px] uppercase tracking-widest2 text-warm-500">{s.kicker}</p>
              <h2 className="mb-5 text-3xl font-extralight leading-snug tracking-wide md:text-4xl">{s.title}</h2>
              <p className="max-w-md text-sm font-light leading-loose text-stone-600">{s.body}</p>
            </Reveal>
          </section>
        ))}
      </div>
    </>
  );
}
