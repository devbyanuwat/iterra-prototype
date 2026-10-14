'use client';

// หลังบ้าน: หมวด แบรนด์ วัสดุ ในหน้าเดียว · ทั้งสามชุดใช้ Section เดียวกัน ต่างกันแค่ช่องในฟอร์ม
// ลบได้เฉพาะรายการที่ไม่มีสินค้าใช้ (DB บังคับด้วย FK ปุ่มลบปิดไว้ให้เห็นก่อน)
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Result } from '@/lib/admin';
import type { BrandRow, CategoryRow, MaterialRow } from '@/lib/server/taxonomy';
import {
  deleteBrandAction,
  deleteCategoryAction,
  deleteMaterialAction,
  saveBrandAction,
  saveCategoryAction,
  saveMaterialAction,
} from '@/app/admin/(panel)/categories/actions';
import { danger, ghost, input, label, solid } from './ui';

type Values = Record<string, string | boolean>;
type Field = { name: string; label: string; checkbox?: boolean; fixed?: boolean; hint?: string };
type Item = { id: string; title: string; sub: string; count: number; values: Values };

function Section({
  title,
  items,
  fields,
  empty,
  onSave,
  onDelete,
}: {
  title: string;
  items: Item[];
  fields: Field[];
  empty: Values;
  onSave: (v: Values, isNew: boolean) => Promise<Result>;
  onDelete: (id: string) => Promise<Result>;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<{ values: Values; isNew: boolean } | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (form) ref.current?.showModal();
    else ref.current?.close();
  }, [form]);

  const open = (values: Values, isNew: boolean) => {
    setError('');
    setForm({ values, isNew });
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    const r = await onSave(form.values, form.isNew);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setForm(null);
    setMsg(`บันทึก${title}แล้ว`);
    router.refresh();
  }

  async function remove(it: Item) {
    if (!window.confirm(`ลบ${title} ${it.title}`)) return;
    setBusy(true);
    const r = await onDelete(it.id);
    setBusy(false);
    setMsg(r.ok ? `ลบ ${it.title} แล้ว` : r.error);
    if (r.ok) router.refresh();
  }

  return (
    <section className="glass rounded-[28px] p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-light">{title}</h2>
        <button type="button" className={solid} onClick={() => open({ ...empty }, true)}>
          เพิ่ม{title}
        </button>
      </div>
      <p role="status" className="min-h-6 pt-2 text-sm">
        {msg}
      </p>
      <ul className="divide-y divide-white/70">
        {items.map((it) => (
          <li key={it.id} className="flex flex-wrap items-center gap-2 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{it.title}</p>
              <p className="truncate text-xs text-stone-600">
                {it.sub} · สินค้า {it.count} ชิ้น
              </p>
            </div>
            <button type="button" className={ghost} onClick={() => open(it.values, false)}>
              แก้ไข
            </button>
            <button
              type="button"
              className={`${ghost} ${danger}`}
              disabled={busy || it.count > 0}
              title={it.count > 0 ? 'ยังมีสินค้าใช้อยู่ ลบไม่ได้' : undefined}
              onClick={() => remove(it)}
            >
              ลบ
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={ref}
        onClose={() => setForm(null)}
        aria-label={title}
        className="glass w-[min(94vw,480px)] rounded-[28px] p-0 text-ink backdrop:bg-ink/30 backdrop:backdrop-blur-sm"
      >
        {form && (
          <form onSubmit={save} noValidate className="space-y-4 p-6">
            <h3 className="text-lg font-light">{form.isNew ? `เพิ่ม${title}` : `แก้ไข${title}`}</h3>
            {fields.map((f) =>
              f.checkbox ? (
                <label key={f.name} className="flex min-h-11 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.values[f.name] === true}
                    onChange={(e) => setForm({ ...form, values: { ...form.values, [f.name]: e.target.checked } })}
                    className="h-4 w-4 accent-ink"
                  />
                  {f.label}
                </label>
              ) : (
                <label key={f.name} className={label}>
                  {f.label}
                  <input
                    value={String(form.values[f.name] ?? '')}
                    readOnly={f.fixed && !form.isNew}
                    onChange={(e) => setForm({ ...form, values: { ...form.values, [f.name]: e.target.value } })}
                    className={`${input} mt-2 read-only:opacity-60`}
                  />
                  {f.hint && <span className="mt-1.5 block text-xs text-stone-600">{f.hint}</span>}
                </label>
              ),
            )}
            <p role="alert" className={`min-h-5 text-sm ${danger}`}>
              {error}
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className={ghost} onClick={() => setForm(null)}>
                ยกเลิก
              </button>
              <button type="submit" className={solid} disabled={busy}>
                บันทึก
              </button>
            </div>
          </form>
        )}
      </dialog>
    </section>
  );
}

const named = (x: { name: { th: string; en: string } }) => `${x.name.en}`;
const KEY_HINT = 'a-z ตัวเลข และ - ขึ้นต้นด้วยตัวอักษร · ตั้งแล้วแก้ไม่ได้ เพราะใช้ในลิงก์ตัวกรอง';

export default function TaxonomyAdmin({
  categories,
  brands,
  materials,
}: {
  categories: CategoryRow[];
  brands: BrandRow[];
  materials: MaterialRow[];
}) {
  return (
    <>
      <header className="glass rounded-[28px] p-5 md:p-6">
        <h1 className="text-2xl font-extralight tracking-wide md:text-3xl">หมวด แบรนด์ วัสดุ</h1>
        <p className="mt-1 text-sm text-stone-600">ลบได้เฉพาะรายการที่ยังไม่มีสินค้าใช้</p>
      </header>
      <Section
        title="หมวด"
        items={categories.map((c) => ({
          id: c.key,
          title: c.name.th,
          sub: `${named(c)} · ${c.multiBrand ? 'หลายแบรนด์' : 'แบรนด์เดียว'}`,
          count: c.count,
          values: { key: c.key, th: c.name.th, en: c.name.en, multiBrand: c.multiBrand },
        }))}
        fields={[
          { name: 'key', label: 'รหัส', fixed: true, hint: KEY_HINT },
          { name: 'th', label: 'ไทย: ชื่อหมวด' },
          { name: 'en', label: 'English: ชื่อหมวด' },
          { name: 'multiBrand', label: 'หมวดนี้มีหลายแบรนด์ (แสดงตัวกรองแบรนด์บนหน้าเว็บ)', checkbox: true },
        ]}
        empty={{ key: '', th: '', en: '', multiBrand: false }}
        onSave={(v, isNew) =>
          saveCategoryAction({ key: String(v.key), th: String(v.th), en: String(v.en), multiBrand: v.multiBrand === true }, isNew)
        }
        onDelete={(id) => deleteCategoryAction(id)}
      />
      <Section
        title="แบรนด์"
        items={brands.map((b) => ({ id: String(b.id), title: b.name, sub: 'แบรนด์', count: b.count, values: { id: String(b.id), name: b.name } }))}
        fields={[{ name: 'name', label: 'ชื่อแบรนด์' }]}
        empty={{ id: '', name: '' }}
        onSave={(v, isNew) => saveBrandAction(isNew ? null : Number(v.id), String(v.name))}
        onDelete={(id) => deleteBrandAction(Number(id))}
      />
      <Section
        title="วัสดุ"
        items={materials.map((m) => ({
          id: m.key,
          title: m.name.th,
          sub: named(m),
          count: m.count,
          values: { key: m.key, th: m.name.th, en: m.name.en },
        }))}
        fields={[
          { name: 'key', label: 'รหัส', fixed: true, hint: KEY_HINT },
          { name: 'th', label: 'ไทย: ชื่อวัสดุ' },
          { name: 'en', label: 'English: ชื่อวัสดุ' },
        ]}
        empty={{ key: '', th: '', en: '' }}
        onSave={(v, isNew) => saveMaterialAction({ key: String(v.key), th: String(v.th), en: String(v.en) }, isNew)}
        onDelete={(id) => deleteMaterialAction(id)}
      />
    </>
  );
}
