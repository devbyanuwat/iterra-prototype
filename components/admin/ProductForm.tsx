'use client';

// ฟอร์มสินค้าชุดเดียว ใช้ทั้งในหลังบ้าน (ProductsAdmin) และแผงแก้ไขบนหน้าเว็บ (EditPanel) · ข้อความภาษาไทยอย่างเดียวตาม design.md ส่วน Back office
// บันทึกเป็นร่างเสมอ ปุ่มหลักบันทึกแล้วเผยแพร่ต่อ · ประวัติโหลดเมื่อเปิดหัวข้อ "ประวัติการแก้ไข"
import { useEffect, useRef, useState } from 'react';
import type { AdminProduct, ProductDraft, ProductRevision } from '@/lib/server/products';
import type { BrandRow, CategoryRow, MaterialRow } from '@/lib/server/taxonomy';
import { productHistoryAction, saveProductAction } from '@/app/admin/(panel)/products/actions';
import ImageField from './ImageField';
import { danger, dangerBorder, ghost, input, label, solid } from './ui';

// hasDraft = เปิดฟอร์มจากร่างที่ยังไม่เผยแพร่ ไม่ส่งไป server
export type Draft = Omit<ProductDraft, 'brandId'> & { id: number | null; brandId: string; hasDraft?: boolean };

export const blank = (category: string): Draft => ({
  id: null, slug: '', category, brandId: '', material: '', series: '', th: '', en: '', descTh: '', descEn: '',
  specs: '', images: [], featured: false,
});
// มีร่างเปิดร่าง ไม่มีเปิดฉบับที่ขึ้นเว็บ
export const toDraft = ({ id, brand: _b, updated: _u, published: _p, draft, ...live }: AdminProduct): Draft => {
  const d = draft ?? live;
  return { ...d, id, brandId: String(d.brandId), hasDraft: !!draft };
};

type Props = {
  initial: Draft;
  categories: CategoryRow[];
  brands: BrandRow[];
  materials: MaterialRow[];
  onCancel: () => void;
  onSaved: (msg: string, publish: boolean) => void;
  onChange?: (d: Draft) => void; // แผงบนหน้าเว็บใช้ให้หน้าเปลี่ยนตามที่พิมพ์
};

export default function ProductForm({ initial, categories, brands, materials, onCancel, onSaved, onChange }: Props) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [hist, setHist] = useState<ProductRevision[] | null>(null);
  const [histNote, setHistNote] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => onChange?.(form), [form, onChange]);

  const set = (patch: Partial<Draft>) => setForm({ ...form, ...patch });
  const multiBrand = categories.find((c) => c.key === form.category)?.multiBrand;
  async function loadHistory(id: number) {
    try {
      setHist(await productHistoryAction(id));
    } catch {
      setHistNote('โหลดประวัติไม่สำเร็จ ลองใหม่อีกครั้ง');
    }
  }

  // Enter ในฟอร์ม = บันทึกและเผยแพร่ · ปุ่มบันทึกร่างเรียกเองด้วย publish = false
  async function save(e: React.FormEvent | null, publish = true) {
    e?.preventDefault();
    const err: Record<string, string> = {};
    // เรียงตามลำดับช่องในฟอร์ม focus จะได้ไปช่องแรกที่ผิด
    if (!form.brandId) err.brandId = 'กรุณาเลือกแบรนด์';
    if (!form.th.trim()) err.th = 'กรุณากรอกชื่อสินค้าภาษาไทย';
    setErrors(err);
    if (Object.keys(err).length) {
      formRef.current?.querySelector<HTMLElement>(`[name="${Object.keys(err)[0]}"]`)?.focus();
      return;
    }
    const { id, hasDraft: _h, ...rest } = form;
    setBusy(true);
    setFormError('');
    try {
      const r = await saveProductAction(id, { ...rest, brandId: Number(rest.brandId) }, publish);
      if (!r.ok) return setFormError(r.error);
    } catch {
      return setFormError('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
    onSaved(publish ? `เผยแพร่ ${form.th} แล้ว` : `บันทึกร่าง ${form.th} แล้ว ยังไม่ขึ้นหน้าเว็บ`, publish);
  }

  return (
    <form ref={formRef} onSubmit={save} noValidate className="flex max-h-[92dvh] flex-col md:max-h-[85dvh]">
      <div className="flex items-center gap-2 border-b border-white/70 px-3 py-2 md:border-0 md:px-6 md:pt-6">
        <button type="button" className={`${ghost} md:hidden`} onClick={onCancel}>
          ยกเลิก
        </button>
        <h2 id="form-title" tabIndex={-1} className="min-w-0 truncate text-base font-light outline-none md:text-xl">
          {form.id === null ? 'เพิ่มสินค้า' : `แก้ไข ${form.th}`}
        </h2>
      </div>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4 md:px-6">
      {form.hasDraft && <p className="rounded-2xl bg-white/60 px-4 py-3 text-sm">กำลังแก้ฉบับร่าง ยังไม่ขึ้นหน้าเว็บ</p>}
      <div className="grid gap-4 md:grid-cols-2">
        <label className={label}>
          หมวด (จำเป็น)
          <select value={form.category} onChange={(e) => set({ category: e.target.value })} className={`${input} mt-2`}>
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name.th}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          แบรนด์ (จำเป็น)
          <select
            name="brandId"
            value={form.brandId}
            onChange={(e) => set({ brandId: e.target.value })}
            aria-invalid={!!errors.brandId}
            aria-describedby="brand-hint"
            className={`${input} mt-2 ${errors.brandId ? dangerBorder : ''}`}
          >
            <option value="">เลือกแบรนด์</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <span id="brand-hint" className={`mt-1.5 block text-xs ${errors.brandId ? danger : 'text-stone-600'}`}>
            {errors.brandId || (multiBrand ? 'หมวดนี้ต้องมีอย่างน้อย 3 แบรนด์บนหน้าเว็บ' : 'เพิ่มแบรนด์ใหม่ได้ที่เมนู หมวด แบรนด์ วัสดุ')}
          </span>
        </label>
        <label className={label}>
          ซีรีส์
          <input value={form.series} onChange={(e) => set({ series: e.target.value })} className={`${input} mt-2`} />
        </label>
        <label className={label}>
          วัสดุ
          <select value={form.material} onChange={(e) => set({ material: e.target.value })} className={`${input} mt-2`}>
            <option value="">ไม่ระบุ</option>
            {materials.map((m) => (
              <option key={m.key} value={m.key}>
                {m.name.th}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          ไทย: ชื่อสินค้า (จำเป็น)
          <input
            name="th"
            value={form.th}
            onChange={(e) => set({ th: e.target.value })}
            aria-invalid={!!errors.th}
            aria-describedby="th-error"
            className={`${input} mt-2 ${errors.th ? dangerBorder : ''}`}
          />
          {errors.th && (
            <span id="th-error" className={`mt-1.5 block text-sm ${danger}`}>
              {errors.th}
            </span>
          )}
        </label>
        <label className={label}>
          English: ชื่อสินค้า
          <input value={form.en} onChange={(e) => set({ en: e.target.value })} className={`${input} mt-2`} />
        </label>
        <label className={`${label} md:col-span-2`}>
          slug (ส่วนท้ายลิงก์)
          <input value={form.slug} onChange={(e) => set({ slug: e.target.value })} className={`${input} mt-2`} />
          <span className="mt-1.5 block text-xs text-stone-600">เว้นว่างได้ ระบบสร้างจากชื่อภาษาอังกฤษ · ใช้ a-z ตัวเลข และ -</span>
        </label>
        <label className={label}>
          ไทย: รายละเอียด
          <textarea value={form.descTh} onChange={(e) => set({ descTh: e.target.value })} className={`${input} mt-2 min-h-24 py-2.5`} />
        </label>
        <label className={label}>
          English: รายละเอียด
          <textarea value={form.descEn} onChange={(e) => set({ descEn: e.target.value })} className={`${input} mt-2 min-h-24 py-2.5`} />
        </label>
      </div>
      <label className={label}>
        สเปก
        <span className="mt-1 block text-xs text-stone-600">บรรทัดละ 1 ข้อ เช่น วัสดุ: ทองเหลือง</span>
        <textarea value={form.specs} onChange={(e) => set({ specs: e.target.value })} className={`${input} mt-2 min-h-32 py-2.5`} />
      </label>
      <div>
        <p className={label}>รูปสินค้า (รูปแรกคือรูปหลัก)</p>
        <ImageField value={form.images} onChange={(images) => set({ images })} />
      </div>
      <div className="flex flex-wrap gap-6">
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" checked={form.featured} onChange={(e) => set({ featured: e.target.checked })} className="h-4 w-4 accent-ink" />
          สินค้าเด่นหน้าแรก
        </label>
      </div>
      {form.id !== null && (
        <details onToggle={(e) => e.currentTarget.open && !hist && loadHistory(form.id!)}>
          <summary className={`${label} cursor-pointer`}>ประวัติการแก้ไข</summary>
          <p role="status" className="min-h-5 text-sm">
            {histNote}
          </p>
          {hist === null ? (
            !histNote && <p className="text-sm text-stone-600">กำลังโหลด</p>
          ) : hist.length === 0 ? (
            <p className="text-sm text-stone-600">ยังไม่มีประวัติ เริ่มเก็บเมื่อบันทึกครั้งถัดไป</p>
          ) : (
            <ul className="divide-y divide-white/70">
              {hist.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{r.data.th}</span>
                    <span className="block text-xs text-stone-600">
                      {r.at} · {r.user ?? 'ฉบับตั้งต้น'} · {r.published ? 'เผยแพร่แล้ว' : 'ร่าง'}
                    </span>
                  </span>
                  <button
                    type="button"
                    className={`${ghost} text-xs`}
                    onClick={() => {
                      setForm({ ...r.data, id: form.id, brandId: String(r.data.brandId), hasDraft: form.hasDraft });
                      setHistNote(`โหลดฉบับ ${r.at} เข้าฟอร์มแล้ว กดบันทึกร่างหรือเผยแพร่เพื่อใช้ฉบับนี้`);
                    }}
                  >
                    ใช้ฉบับนี้
                  </button>
                </li>
              ))}
            </ul>
          )}
        </details>
      )}
      </div>
      <div className="space-y-2 border-t border-white/70 px-5 pt-3 md:border-0 md:px-6 md:pb-6" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <p role="alert" className={`min-h-5 text-sm ${danger}`}>
          {formError}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" className={`${ghost} hidden md:inline-flex`} onClick={onCancel}>
            ยกเลิก
          </button>
          <button type="button" className={`${ghost} w-full justify-center bg-white/60 md:w-auto md:bg-transparent`} disabled={busy} onClick={() => save(null, false)}>
            บันทึกร่าง
          </button>
          <button type="submit" className={`${solid} w-full justify-center md:w-auto`} disabled={busy}>
            {busy ? 'กำลังบันทึก' : 'บันทึกและเผยแพร่'}
          </button>
        </div>
      </div>
    </form>
  );
}
