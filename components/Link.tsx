'use client';

// <Link> ที่รู้ว่าตัวเองอยู่ต้นไม้ภาษาไหน (task D3)
//
// ทุกเส้นทางของเว็บนี้ถูก export สองชุด: อังกฤษที่ path เดิม และไทยใต้ /th/
// ลิงก์ในหน้าไทยจึงต้องชี้ไปที่หน้าไทย ไม่ใช่โยนผู้อ่านข้ามกลับไปอังกฤษกลางทาง
//
// ทำไมเป็น wrapper ไม่ใช่การไล่แก้ href ทีละอัน: href ที่เขียนไว้ในคอมโพเนนต์คือ
// "เส้นทางของเว็บ" ('/products/') ซึ่งเป็นความจริงที่ไม่ขึ้นกับภาษา ส่วนคำนำหน้า
// เป็นความจริงของต้นไม้ที่คอมโพเนนต์นั้นกำลังถูกวาดอยู่ การเอาสองอย่างมาปนกันใน
// สตริงเดียวแปลว่าทุกลิงก์ใหม่ที่ใครเขียนต่อจากนี้จะลืมคำนำหน้าได้เงียบ ๆ
// ที่นี่ลืมไม่ได้ เพราะไม่มีที่ให้ลืม — คอมโพเนนต์เขียน href เดิมต่อไปตามปกติ
//
// การกรองว่าอะไร "ควรถูกเติมคำนำหน้า" อยู่ใน langPath (lib/i18n.ts) ที่เดียว
// ลิงก์ออกนอกเว็บ mailto: tel: และ #hash จึงผ่านไปได้โดยไม่ถูกแตะ
//
// ข้อยกเว้นเดียวคือ components/DepthField.tsx ซึ่งยัง import next/link ตรง ๆ:
// href ของระนาบในสนามมาจากข้อมูล ไม่ได้เขียนไว้ใน JSX จึงถูกเติมคำนำหน้าตั้งแต่
// ตอนประกอบชุดระนาบใน app/_routes/ แทน (ดู fieldHrefs ที่นั่น)

import NextLink from 'next/link';
import type { ComponentProps } from 'react';
import { useLang } from './LangProvider';
import { langPath } from '@/lib/i18n';

type Props = ComponentProps<typeof NextLink>;

export default function Link({ href, ...rest }: Props) {
  const { lang } = useLang();
  // href เป็น UrlObject ได้ตามชนิดของ next/link แต่เว็บนี้ใช้สตริงล้วน
  // ปล่อยผ่านแทนที่จะเดาว่าจะประกอบ pathname กลับอย่างไร
  return <NextLink href={typeof href === 'string' ? langPath(lang, href) : href} {...rest} />;
}
