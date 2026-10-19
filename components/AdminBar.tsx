'use client';

// แถบของแอดมินบนหน้าเว็บจริง (spec 2026-10-19 ข้อ 3) · root layout แสดงเฉพาะแอดมินที่ session ยังใช้ได้
// ข้อความภาษาไทยอย่างเดียวตาม design.md ส่วน Back office · มุมล่างซ้าย เพราะมุมขวาเป็นปุ่มติดต่อ
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { setPreviewAction } from '@/app/admin/(panel)/preview-action';
import { publishProductAction } from '@/app/admin/(panel)/products/actions';
import { ghost, pill, solid } from './admin/ui';

type Draft = { id: number; slug: string; draftSlug: string };
type Panel = { kind: 'hero' } | { kind: 'product'; slug: string };
// โหลดฟอร์มเมื่อกดแก้ไขเท่านั้น
const EditPanel = dynamic(() => import('./admin/EditPanel'));
const HeroPanel = dynamic(() => import('./admin/HeroPanel'));

export default function AdminBar({ preview, drafts }: { preview: boolean; drafts: Draft[] }) {
  const router = useRouter();
  const path = usePathname();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  // โหมดแก้ไข (ปุ่มปากกา): ส่วนที่มี data-edit มีกรอบ กดแล้วเปิดแผงแทนการไปหน้าอื่น
  const [mode, setMode] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const panelRef = useRef(panel);
  panelRef.current = panel;
  // URL เป็น slug ที่ขึ้นเว็บ หรือ slug ในร่างตอนดูร่าง
  const slug = /^\/products\/([^/]+)\/?$/.exec(path)?.[1];
  const draft = slug ? drafts.find((d) => d.slug === slug || d.draftSlug === slug) : undefined;

  useEffect(() => {
    if (!mode) return;
    const html = document.documentElement;
    html.setAttribute('data-editing', '');
    // capture: ได้ก่อน Link และ handler ของหน้า กันการพาไปหน้าอื่น
    const click = (e: MouseEvent) => {
      const k = (e.target as Element).closest?.('[data-edit]')?.getAttribute('data-edit');
      if (!k) return;
      e.preventDefault();
      e.stopPropagation();
      setPanel(k === 'hero-video' ? { kind: 'hero' } : { kind: 'product', slug: k.slice('product:'.length) });
    };
    // Esc ตอนแผงเปิดอยู่ให้แผงปิดก่อน รอบถัดไปค่อยออกจากโหมด
    const key = (e: KeyboardEvent) => e.key === 'Escape' && !panelRef.current && setMode(false);
    document.addEventListener('click', click, true);
    document.addEventListener('keydown', key);
    return () => {
      html.removeAttribute('data-editing');
      document.removeEventListener('click', click, true);
      document.removeEventListener('keydown', key);
    };
  }, [mode]);

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

  // แผงอยู่นอกแถบ: .glass มี backdrop-filter ทำให้ fixed ข้างในยึดกับแถบแทนจอ
  return (
    <>
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
        <button
          type="button"
          aria-pressed={mode}
          aria-label="โหมดแก้ไข"
          title="โหมดแก้ไข"
          className={`${pill(mode)} w-11 justify-center !px-0`}
          onClick={() => {
            setMode(!mode);
            setMsg(mode ? '' : 'กดส่วนที่มีกรอบเพื่อแก้');
          }}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16.9 3.6a2.1 2.1 0 0 1 3 3L8 18.5 4 20l1.5-4z" />
            <path d="M15 5.5l3.5 3.5" />
          </svg>
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
      {panel?.kind === 'product' && (
        <EditPanel
          key={panel.slug}
          slug={panel.slug}
          onClose={() => setPanel(null)}
          onSaved={(m) => {
            setPanel(null);
            setMsg(m);
          }}
        />
      )}
      {panel?.kind === 'hero' && <HeroPanel onClose={() => setPanel(null)} />}
    </>
  );
}
