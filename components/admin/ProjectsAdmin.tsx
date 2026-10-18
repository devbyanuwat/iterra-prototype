'use client';

// หลังบ้าน: ผลงานอ้างอิง · ข้อมูลจาก DB ทาง props · แก้ผ่าน Server Functions แล้ว router.refresh() ดึงรายการใหม่
// เลือกสินค้าที่ใช้จากรายการติ๊ก ค้นชื่อได้ · สินค้าที่ซ่อนอยู่เลือกได้ แต่หน้าเว็บไม่แสดง
// โครงตามหน้าสินค้า: ต่ำกว่า lg เป็นการ์ด ตั้งแต่ lg เป็นแถว ฟอร์มเป็น sheet จากขอบล่างบนมือถือ
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Result } from '@/lib/admin';
import type { AdminProject, ProjectInput } from '@/lib/server/projects';
import { deleteProjectAction, saveProjectAction, setProjectPublishedAction } from '@/app/admin/(panel)/projects/actions';
import ImageField from './ImageField';
import { danger, dangerSolid, ghost, input, label, solid } from './ui';

export type ProductOption = { id: number; th: string; published: boolean };
type Draft = ProjectInput & { id: number | null };
type LineKey = 'th' | 'en' | 'locationTh' | 'locationEn' | 'typeTh' | 'typeEn' | 'year' | 'slug';

const blank = (): Draft => ({
  id: null, slug: '', th: '', en: '', locationTh: '', locationEn: '', typeTh: '', typeEn: '', year: '', images: [], products: [],
  published: false,
});

export default function ProjectsAdmin({ projects, products }: { projects: AdminProject[]; products: ProductOption[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [pq, setPq] = useState('');
  const [form, setForm] = useState<Draft | null>(null);
  const [formError, setFormError] = useState('');
  const [del, setDel] = useState<AdminProject | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLDialogElement>(null);
  const delRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = formRef.current;
    // เปิดและ focus หัวข้อเฉพาะตอนเพิ่งเปิด ไม่ดึง focus ออกจากช่องที่พิมพ์อยู่
    if (form && d && !d.open) {
      d.showModal();
      d.querySelector<HTMLElement>('#project-form-title')?.focus();
    } else if (!form) d?.close();
  }, [form]);
  useEffect(() => {
    if (del) delRef.current?.showModal();
    else delRef.current?.close();
  }, [del]);

  const shown = projects.filter((p) => !q || `${p.th} ${p.en} ${p.locationTh} ${p.typeTh}`.toLowerCase().includes(q.toLowerCase()));
  const picks = products.filter((p) => !pq || p.th.toLowerCase().includes(pq.toLowerCase()));
  const set = (patch: Partial<Draft>) => form && setForm({ ...form, ...patch });
  const open = (d: Draft) => {
    setFormError('');
    setPq('');
    setForm(d);
  };

  // คืนข้อความผิด หรือ null ถ้าสำเร็จ
  async function run(fn: () => Promise<Result>, done: string): Promise<string | null> {
    setBusy(true);
    let r: Result;
    try {
      r = await fn();
    } catch {
      return 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง';
    } finally {
      setBusy(false);
    }
    if (!r.ok) return r.error;
    setMsg(done);
    router.refresh();
    return null;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const { id, ...rest } = form;
    const error = await run(() => saveProjectAction(id, rest), `บันทึก ${form.th} แล้ว`);
    if (error) setFormError(error);
    else setForm(null);
  }

  const line = (k: LineKey, text: string, hint?: string) => (
    <label className={label}>
      {text}
      <input
        value={form?.[k] ?? ''}
        inputMode={k === 'year' ? 'numeric' : undefined}
        onChange={(e) => set({ [k]: e.target.value } as Partial<Draft>)}
        className={`${input} mt-2`}
      />
      {hint && <span className="mt-1.5 block text-xs text-stone-600">{hint}</span>}
    </label>
  );
  const search = (
    <input
      type="search"
      value={q}
      onChange={(e) => setQ(e.target.value)}
      placeholder="ค้นหาชื่อ ที่ตั้ง หรือประเภท"
      aria-label="ค้นหาผลงาน"
      className={`${input} lg:max-w-xs`}
    />
  );
  const empty = (
    <>
      <p className="text-sm">ยังไม่มีผลงาน</p>
      <button type="button" className={`${solid} mt-5`} onClick={() => open(blank())}>
        เพิ่มผลงาน
      </button>
    </>
  );
  const thumb = (p: AdminProject) => (
    <span className="block h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-white">
      {p.images[0] && <img src={p.images[0]} alt="" className="h-full w-full object-cover" />}
    </span>
  );
  const meta = (p: AdminProject) => `${p.typeTh || 'ไม่ระบุประเภท'} · ${p.locationTh || 'ไม่ระบุที่ตั้ง'} · ${p.year} · สินค้า ${p.products.length} รายการ`;
  const status = (p: AdminProject, size: string) => (
    <span className={`shrink-0 rounded-full text-xs ${size} ${p.published ? 'bg-ink text-paper' : 'border border-ink text-ink'}`}>
      {p.published ? 'เผยแพร่' : 'ซ่อน'}
    </span>
  );
  const actions = (p: AdminProject, extra: string) => (
    <>
      <button type="button" className={`${ghost} ${extra}`} onClick={() => open({ ...p })}>
        แก้ไข
      </button>
      <button
        type="button"
        className={`${ghost} ${extra}`}
        disabled={busy}
        onClick={async () => {
          const error = await run(() => setProjectPublishedAction(p.id, !p.published), `${p.published ? 'ซ่อน' : 'แสดง'} ${p.th} แล้ว`);
          if (error) setMsg(error);
        }}
      >
        {p.published ? 'ซ่อน' : 'แสดง'}
      </button>
      <button type="button" className={`${ghost} ${danger} ${extra}`} onClick={() => setDel(p)}>
        ลบ
      </button>
    </>
  );

  return (
    <>
      <header className="glass flex flex-wrap items-end justify-between gap-4 rounded-[28px] p-5 md:p-6">
        <div>
          <h1 className="text-2xl font-extralight tracking-wide md:text-3xl">ผลงาน</h1>
          <p className="mt-1 text-sm text-stone-600">
            {projects.length} ผลงาน · เผยแพร่ {projects.filter((p) => p.published).length}
          </p>
        </div>
        <button type="button" className={solid} onClick={() => open(blank())}>
          เพิ่มผลงาน
        </button>
      </header>

      <div role="status" className="min-h-6 px-2 text-sm text-ink">
        {msg}
      </div>

      {/* ต่ำกว่า lg: กล่องค้นหากับการ์ดแยกกัน · ตั้งแต่ lg: แถวในกล่องเดียว (แบบหน้าสินค้า) */}
      <div className="space-y-3 lg:hidden">
        <div className="glass rounded-[28px] p-3">{search}</div>
        {shown.length === 0 ? (
          <div className="glass rounded-[28px] px-6 py-14 text-center">{empty}</div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {shown.map((p) => (
              <li key={p.id} className="glass rounded-[24px] p-3">
                <button type="button" onClick={() => open({ ...p })} className="flex w-full items-start gap-3 rounded-2xl p-1 text-left">
                  {thumb(p)}
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 block text-sm leading-snug">{p.th}</span>
                    <span className="mt-1 block truncate text-xs text-stone-600">{meta(p)}</span>
                    <span className="mt-2 flex items-center gap-2 text-xs">{status(p, 'px-2.5 py-0.5')}</span>
                  </span>
                </button>
                <div className="mt-2 grid grid-cols-3 gap-1.5">{actions(p, 'justify-center bg-white/60')}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <section className="glass hidden rounded-[28px] p-4 lg:block">
        <div className="p-2">{search}</div>
        {shown.length === 0 ? (
          <div className="m-2 rounded-2xl border border-dashed border-warm-500 px-6 py-14 text-center">{empty}</div>
        ) : (
          <ul className="divide-y divide-white/70">
            {shown.map((p) => (
              <li key={p.id} className="flex items-center gap-4 rounded-2xl p-2 transition hover:bg-white/50">
                {thumb(p)}
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => open({ ...p })} className="block max-w-full truncate text-left text-sm hover:underline">
                    {p.th}
                  </button>
                  <p className="truncate text-xs text-stone-600">{meta(p)}</p>
                </div>
                {status(p, 'px-3 py-1')}
                <div className="flex">{actions(p, '')}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <dialog
        ref={formRef}
        onClose={() => setForm(null)}
        aria-labelledby="project-form-title"
        className="glass bottom-0 top-auto !m-0 w-full max-w-none overflow-hidden rounded-b-none rounded-t-[28px] p-0 text-ink backdrop:bg-ink/30 backdrop:backdrop-blur-sm md:top-0 md:!m-auto md:w-[min(94vw,720px)] md:rounded-[28px]"
      >
        {/* มือถือ: sheet จากขอบล่าง หัวมีปุ่มยกเลิก ปุ่มบันทึกติดล่าง · ตั้งแต่ md: กล่องกลางจอ */}
        {form && (
          <form onSubmit={save} noValidate className="flex max-h-[92dvh] flex-col md:max-h-[85dvh]">
            <div className="flex items-center gap-2 border-b border-white/70 px-3 py-2 md:border-0 md:px-6 md:pt-6">
              <button type="button" className={`${ghost} md:hidden`} onClick={() => setForm(null)}>
                ยกเลิก
              </button>
              <h2 id="project-form-title" tabIndex={-1} className="min-w-0 truncate text-base font-light outline-none md:text-xl">
                {form.id === null ? 'เพิ่มผลงาน' : `แก้ไข ${form.th}`}
              </h2>
            </div>
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4 md:px-6">
              <div className="grid gap-4 md:grid-cols-2">
                {line('th', 'ไทย: ชื่อผลงาน (จำเป็น)')}
                {line('en', 'English: ชื่อผลงาน', 'เว้นว่าง = ใช้ภาษาไทย')}
                {line('locationTh', 'ไทย: ที่ตั้ง')}
                {line('locationEn', 'English: ที่ตั้ง', 'เว้นว่าง = ใช้ภาษาไทย')}
                {line('typeTh', 'ไทย: ประเภทโครงการ')}
                {line('typeEn', 'English: ประเภทโครงการ', 'เว้นว่าง = ใช้ภาษาไทย')}
                {line('year', 'ปีที่เสร็จ ค.ศ. (จำเป็น)', 'เช่น 2026')}
                {line('slug', 'slug (ใช้ในลิงก์จากผลค้นหา)', 'เว้นว่างได้ ระบบสร้างจากชื่อภาษาอังกฤษ · ใช้ a-z ตัวเลข และ -')}
              </div>
              <div>
                <p className={label}>รูปผลงาน (จำเป็น รูปแรกแสดงก่อน)</p>
                <ImageField value={form.images} onChange={(images) => set({ images })} />
              </div>
              <fieldset>
                <legend className={label}>สินค้าที่ใช้ในผลงานนี้</legend>
                <input
                  type="search"
                  value={pq}
                  onChange={(e) => setPq(e.target.value)}
                  placeholder="ค้นหาสินค้า"
                  aria-label="ค้นหาสินค้าที่ใช้"
                  className={input}
                />
                <ul className="mt-2 max-h-64 overflow-y-auto rounded-xl bg-white/40 p-1">
                  {picks.map((p) => (
                    <li key={p.id}>
                      <label className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm hover:bg-white/60">
                        <input
                          type="checkbox"
                          checked={form.products.includes(p.id)}
                          onChange={(e) =>
                            set({ products: e.target.checked ? [...form.products, p.id] : form.products.filter((x) => x !== p.id) })
                          }
                          className="h-4 w-4 shrink-0 accent-ink"
                        />
                        <span className="min-w-0 flex-1 truncate">{p.th}</span>
                        {!p.published && <span className="shrink-0 text-xs text-stone-600">ซ่อนอยู่</span>}
                      </label>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-xs text-stone-600">เลือกแล้ว {form.products.length} รายการ · สินค้าที่ซ่อนอยู่ไม่แสดงบนหน้าเว็บ</p>
              </fieldset>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input type="checkbox" checked={form.published} onChange={(e) => set({ published: e.target.checked })} className="h-4 w-4 accent-ink" />
                แสดงบนหน้าเว็บ
              </label>
            </div>
            <div className="space-y-2 border-t border-white/70 px-5 pt-3 md:border-0 md:px-6 md:pb-6" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
              <p role="alert" className={`min-h-5 text-sm ${danger}`}>
                {formError}
              </p>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button type="button" className={`${ghost} hidden md:inline-flex`} onClick={() => setForm(null)}>
                  ยกเลิก
                </button>
                <button type="submit" className={`${solid} w-full justify-center md:w-auto`} disabled={busy}>
                  {busy ? 'กำลังบันทึก' : 'บันทึก'}
                </button>
              </div>
            </div>
          </form>
        )}
      </dialog>

      <dialog
        ref={delRef}
        onClose={() => setDel(null)}
        aria-labelledby="project-del-title"
        className="bottom-0 top-auto !m-0 w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-ink/30 md:top-0 md:!m-auto md:w-[min(92vw,440px)]"
      >
        {/* มือถือ: sheet จากขอบล่าง ปุ่ม 2 ช่องเท่ากัน · ตั้งแต่ md: กล่องกลางจอ */}
        {del && (
          <div className="glass m-2 rounded-[28px] p-6 md:m-0" style={{ marginBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
            <h2 id="project-del-title" className="text-lg font-light">
              ลบ {del.th}
            </h2>
            <p className="mt-3 text-sm text-stone-600">ผลงานนี้จะหายจากหน้าเว็บ และกู้คืนไม่ได้ สินค้าที่ผูกไว้ไม่หาย ถ้าแค่ไม่อยากให้เห็น ใช้ปุ่มซ่อนแทน</p>
            <div className="mt-6 grid grid-cols-2 gap-2 md:flex md:justify-end">
              <button type="button" autoFocus className={`${ghost} justify-center bg-white/60 md:bg-transparent`} onClick={() => setDel(null)}>
                ยกเลิก
              </button>
              <button
                type="button"
                className={`${dangerSolid} justify-center`}
                disabled={busy}
                onClick={async () => {
                  const error = await run(() => deleteProjectAction(del.id), `ลบ ${del.th} แล้ว`);
                  if (error) setMsg(error);
                  setDel(null);
                }}
              >
                ลบ
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
