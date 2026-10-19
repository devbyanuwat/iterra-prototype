'use client';

// แถบของแอดมินบนหน้าเว็บจริง (spec 2026-10-19 ข้อ 3) · root layout แสดงเฉพาะแอดมินที่ session ยังใช้ได้
// ข้อความภาษาไทยอย่างเดียวตาม design.md ส่วน Back office · มุมล่างซ้าย เพราะมุมขวาเป็นปุ่มติดต่อ
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { setPreviewAction } from '@/app/admin/(panel)/preview-action';
import { publishProductAction } from '@/app/admin/(panel)/products/actions';
import { ghost, pill, solid } from './admin/ui';

type Draft = { id: number; slug: string; draftSlug: string };

export default function AdminBar({ preview, drafts }: { preview: boolean; drafts: Draft[] }) {
  const router = useRouter();
  const path = usePathname();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  // URL เป็น slug ที่ขึ้นเว็บ หรือ slug ในร่างตอนดูร่าง
  const slug = /^\/products\/([^/]+)\/?$/.exec(path)?.[1];
  const draft = slug ? drafts.find((d) => d.slug === slug || d.draftSlug === slug) : undefined;

  // fn คืนข้อความผิด หรือไม่คืนอะไรถ้าสำเร็จ
  async function run(fn: () => Promise<string | void>, done: string) {
    setBusy(true);
    setMsg('');
    try {
      setMsg((await fn()) || done);
    } catch {
      setMsg('ทำไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="region"
      aria-label="เครื่องมือแอดมิน"
      className="glass fixed bottom-4 left-4 z-[46] flex max-w-[calc(100vw-6rem)] flex-wrap items-center gap-1 rounded-[28px] p-1.5 text-ink md:bottom-6 md:left-6"
    >
      <Link href="/admin/products/" className={ghost}>
        หลังบ้าน
      </Link>
      <button
        type="button"
        aria-pressed={preview}
        disabled={busy}
        className={pill(preview)}
        onClick={() =>
          run(async () => {
            await setPreviewAction(!preview);
            router.refresh();
          }, preview ? 'กลับมาดูหน้าเว็บจริงแล้ว' : 'กำลังดูร่าง')
        }
      >
        ดูร่าง
      </button>
      {draft && (
        <button
          type="button"
          disabled={busy}
          className={solid}
          onClick={() =>
            run(async () => {
              const r = await publishProductAction(draft.id);
              if (!r.ok) return r.error;
              // ร่างเปลี่ยน slug: ฉบับจริงย้ายไป URL ใหม่
              if (slug !== draft.draftSlug) router.replace(`/products/${draft.draftSlug}/`);
              router.refresh();
            }, 'เผยแพร่แล้ว')
          }
        >
          เผยแพร่ร่างนี้
        </button>
      )}
      <p role="status" className={`text-xs ${msg ? 'px-3' : ''}`}>
        {msg}
      </p>
    </div>
  );
}
