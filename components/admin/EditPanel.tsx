'use client';

// แผงแก้ไขสินค้าบนหน้าเว็บจริง (spec 2026-10-19 ข้อ 4) · ฟอร์มชุดเดียวกับหลังบ้าน พิมพ์แล้วหน้าเว็บด้านหลังเปลี่ยนตาม
// เปิดแบบไม่ modal ให้เลื่อนดูหน้าด้านหลังได้ระหว่างแก้ · Esc ปิด · ข้อความภาษาไทยอย่างเดียวตาม design.md ส่วน Back office
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { applyDraft } from '@/lib/product-draft.mjs';
import { setPreviewAction } from '@/app/admin/(panel)/preview-action';
import { productEditAction } from '@/app/admin/(panel)/products/actions';
import { useCatalog, useCatalogOverride } from '../CatalogProvider';
import ProductForm, { toDraft, type Draft } from './ProductForm';

type Data = Awaited<ReturnType<typeof productEditAction>>;

export default function EditPanel({ slug, onClose, onSaved }: { slug: string; onClose: () => void; onSaved: (msg: string) => void }) {
  const router = useRouter();
  const { products } = useCatalog();
  const override = useCatalogOverride();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const ref = useRef<HTMLDialogElement>(null);
  // ฉบับก่อนแก้เป็นฐานตอนทับ (ราคาและภาพบรรยากาศที่ฟอร์มไม่มีช่อง) · เก็บตอนเปิดครั้งเดียว ไม่งั้นได้ตัวที่ถูกทับแล้ว
  const base = useRef(products.find((p) => p.slug === slug));
  const last = useRef<Draft | null>(null);
  const saved = useRef(false);

  useEffect(() => {
    ref.current?.show();
    productEditAction(slug).then(setData, () => setError('โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง'));
    // ปิดโดยไม่บันทึก: หน้ากลับเป็นเหมือนก่อนแก้ · บันทึกแล้วปล่อยให้ข้อมูลใหม่จาก router.refresh() มาแทนเอง
    return () => {
      if (!saved.current) override(slug, null);
    };
  }, [slug, override]);

  const onChange = useCallback(
    (d: Draft) => {
      last.current = d;
      if (!base.current || !data) return;
      const brand = data.brands.find((b) => String(b.id) === d.brandId)?.name ?? base.current.brand;
      override(slug, applyDraft(base.current, { ...d, brandId: Number(d.brandId) }, brand));
    },
    [data, override, slug],
  );

  async function done(msg: string, publish: boolean) {
    saved.current = true;
    // บันทึกร่าง: เปิดโหมดดูร่างให้ หน้าเว็บจะยังเป็นฉบับที่เพิ่งแก้ ไม่เด้งกลับไปฉบับจริง
    if (!publish) await setPreviewAction(true).catch(() => {});
    const next = last.current?.slug || slug;
    if (next !== slug) router.replace(`/products/${next}/`);
    router.refresh();
    onSaved(msg);
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onKeyDown={(e) => e.key === 'Escape' && ref.current?.close()}
      aria-labelledby="form-title"
      className="glass fixed inset-x-0 bottom-0 top-auto z-[47] !m-0 w-full max-w-none overflow-hidden rounded-b-none rounded-t-[28px] p-0 text-ink shadow-xl md:inset-y-0 md:left-auto md:right-0 md:h-dvh md:max-h-none md:w-[min(94vw,560px)] md:rounded-none md:rounded-l-[28px]"
    >
      {data?.product ? (
        <ProductForm
          initial={toDraft(data.product)}
          categories={data.categories}
          brands={data.brands}
          materials={data.materials}
          onCancel={() => ref.current?.close()}
          onSaved={done}
          onChange={onChange}
        />
      ) : (
        <div className="flex items-center justify-between gap-3 p-5">
          <p role="status" className="text-sm">
            {error || (data ? 'ไม่พบสินค้านี้ในหลังบ้าน' : 'กำลังโหลด')}
          </p>
          <button type="button" className="text-sm underline" onClick={() => ref.current?.close()}>
            ปิด
          </button>
        </div>
      )}
    </dialog>
  );
}
