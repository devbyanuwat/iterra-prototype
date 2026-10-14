'use client';

// หลังบ้าน: ประกาศที่เด้งตอนเข้าเว็บ · ตัวอย่างด้านขวาเปลี่ยนตามที่พิมพ์ทันที สลับดูไทยและอังกฤษได้
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AnnouncementData, AnnouncementInput } from '@/lib/server/announcement';
import { saveAnnouncementAction } from '@/app/admin/(panel)/announcement/actions';
import ImageField from './ImageField';
import { danger, input, label, pill, solid } from './ui';

const fromData = (a: AnnouncementData | null): AnnouncementInput => ({
  enabled: a?.enabled ?? false,
  titleTh: a?.title.th ?? '',
  titleEn: a?.title.en ?? '',
  bodyTh: a?.body.th ?? '',
  bodyEn: a?.body.en ?? '',
  image: a?.image ?? '',
  ctaTh: a?.cta?.label.th ?? '',
  ctaEn: a?.cta?.label.en ?? '',
  href: a?.cta?.href ?? '',
  resetSeen: false,
});

export default function AnnouncementAdmin({ data }: { data: AnnouncementData | null }) {
  const router = useRouter();
  const [v, setV] = useState(() => fromData(data));
  const [lang, setLang] = useState<'th' | 'en'>('th');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<AnnouncementInput>) => setV({ ...v, ...patch });
  const pick = (th: string, en: string) => (lang === 'th' ? th : en || th);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    let r;
    try {
      r = await saveAnnouncementAction(v);
    } catch {
      setError('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง');
      setMsg('');
      return;
    } finally {
      setBusy(false);
    }
    if (!r.ok) {
      setError(r.error);
      setMsg('');
      return;
    }
    setError('');
    setMsg(v.resetSeen ? 'บันทึกแล้ว ทุกคนจะเห็นประกาศอีกครั้ง' : 'บันทึกแล้ว');
    set({ resetSeen: false });
    router.refresh();
  }

  const field = (k: 'titleTh' | 'titleEn' | 'ctaTh' | 'ctaEn' | 'href', text: string, hint?: string) => (
    <label className={label}>
      {text}
      <input value={v[k]} onChange={(e) => set({ [k]: e.target.value } as Partial<AnnouncementInput>)} className={`${input} mt-2`} />
      {hint && <span className="mt-1.5 block text-xs text-stone-600">{hint}</span>}
    </label>
  );
  const area = (k: 'bodyTh' | 'bodyEn', text: string) => (
    <label className={label}>
      {text}
      <textarea value={v[k]} onChange={(e) => set({ [k]: e.target.value } as Partial<AnnouncementInput>)} className={`${input} mt-2 min-h-24 py-2.5`} />
    </label>
  );

  return (
    <>
      <header className="glass rounded-[28px] p-5 md:p-6">
        <h1 className="text-2xl font-extralight tracking-wide md:text-3xl">ประกาศ</h1>
        <p className="mt-1 text-sm text-stone-600">เด้งครั้งเดียวต่อการเปิดเว็บ คนที่กดปิดแล้วจะไม่เห็นซ้ำ จนกว่าจะติ๊ก แสดงอีกครั้ง</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6">
        <form onSubmit={save} noValidate className="glass space-y-4 rounded-[28px] p-5 md:p-6">
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" checked={v.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="h-4 w-4 accent-ink" />
            เปิดประกาศ
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            {field('titleTh', 'ไทย: หัวข้อ (จำเป็น)')}
            {field('titleEn', 'English: หัวข้อ', 'เว้นว่าง = ใช้ภาษาไทย')}
            {area('bodyTh', 'ไทย: เนื้อหา (จำเป็น)')}
            {area('bodyEn', 'English: เนื้อหา')}
            {field('ctaTh', 'ไทย: ข้อความปุ่ม')}
            {field('ctaEn', 'English: ข้อความปุ่ม')}
          </div>
          {field('href', 'ลิงก์ของปุ่ม', 'เช่น /contact/ หรือ https://... · เว้นว่าง = ไม่มีปุ่ม')}
          <div>
            <p className={label}>รูป (16:9)</p>
            <ImageField value={v.image ? [v.image] : []} onChange={(x) => set({ image: x[0] ?? '' })} multiple={false} />
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" checked={v.resetSeen} onChange={(e) => set({ resetSeen: e.target.checked })} className="h-4 w-4 accent-ink" />
            แสดงอีกครั้งกับคนที่ปิดไปแล้ว
          </label>
          <p role="alert" className={`min-h-5 text-sm ${danger}`}>
            {error}
          </p>
          <p role="status" className="min-h-5 text-sm">
            {msg}
          </p>
          <button type="submit" className={solid} disabled={busy}>
            {busy ? 'กำลังบันทึก' : 'บันทึก'}
          </button>
        </form>

        <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start" aria-label="ตัวอย่างประกาศ">
          <div className="flex gap-2">
            {(['th', 'en'] as const).map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} className={pill(lang === l)} onClick={() => setLang(l)}>
                {l === 'th' ? 'ไทย' : 'English'}
              </button>
            ))}
          </div>
          <div className={`bg-paper text-ink shadow-xl ${v.enabled ? '' : 'opacity-50'}`}>
            {v.image && <img src={v.image} alt="" className="aspect-[16/9] w-full object-cover" />}
            <div className="p-6">
              <p className="text-xl font-light tracking-wide">{pick(v.titleTh, v.titleEn) || 'หัวข้อประกาศ'}</p>
              <p className="mt-3 text-sm font-light leading-relaxed text-stone-600">{pick(v.bodyTh, v.bodyEn) || 'เนื้อหาประกาศ'}</p>
              {v.href && (
                <span className="mt-6 inline-flex min-h-11 items-center border border-ink bg-ink px-6 text-[11px] font-normal uppercase tracking-widest2 text-paper">
                  {pick(v.ctaTh, v.ctaEn)}
                </span>
              )}
            </div>
          </div>
          {!v.enabled && <p className="text-xs text-stone-600">ประกาศปิดอยู่ หน้าเว็บจะไม่เด้ง</p>}
        </aside>
      </div>
    </>
  );
}
