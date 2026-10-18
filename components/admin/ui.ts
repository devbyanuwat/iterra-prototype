// class ของหลังบ้านธีมกระจก ใช้ร่วมกันทุกหน้า · ยกมาจาก mockup ProductsAdmin ที่ผ่านแล้ว (2026-10-14)
export const input =
  'h-11 w-full rounded-xl border border-white/70 bg-white/70 px-3 text-base font-normal text-ink outline-none transition focus:border-ink focus:bg-white';
export const label = 'mb-2 block text-sm font-normal text-ink';
export const pill = (on: boolean) =>
  `inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-normal transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
    on ? 'bg-ink text-paper' : 'glass text-ink hover:bg-white'
  }`;
export const solid =
  'inline-flex min-h-11 items-center rounded-full bg-ink px-6 text-sm font-normal text-paper transition hover:bg-stone-700 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50';
export const ghost =
  'inline-flex min-h-11 items-center rounded-full px-4 text-sm font-normal text-ink transition hover:bg-white/70 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-40';
// แดงอิฐ #9f2d20 ค่าดิบตาม mockup ใช้กับปุ่มลบและข้อความผิดเท่านั้น
export const danger = 'text-[#9f2d20]';
export const dangerBorder = 'border-[#9f2d20]';
export const dangerSolid = 'inline-flex min-h-11 items-center rounded-full bg-[#9f2d20] px-6 text-sm text-paper active:scale-[0.98]';
