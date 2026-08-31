'use client';

// ถือ finish ที่ถูกเลือกของสินค้าหนึ่งชิ้น และ tween ค่า --accent ไปหาสีของ finish นั้น
//
// สเปก §2: accent คือ CSS custom property ที่ :root · กดสวอตช์ = tween ตัวแปรนี้
// **พื้นหลังไม่เปลี่ยน** เปลี่ยนแค่ accent — ไม่พลิกธีมทั้งหน้า
//
// การ tween สี: interpolate จริงทีละเฟรมด้วย gsap.utils.interpolate() ไม่ใช่สลับสตริง
// ทีเดียว เพราะทั้งหน้าต้องอ่านว่า "แสงในห้องเปลี่ยนสี" ไม่ใช่ตัดภาพ
// ทุกที่ที่อ่าน var(--accent) (spotlight, เส้น kicker, ปุ่ม) จึงไล่สีพร้อมกันเอง
//
// prefers-reduced-motion: เซ็ตค่าทันที ไม่มี tween

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import gsap from 'gsap';
import type { Finish } from '@/lib/products';

const ACCENT_VAR = '--accent';
const TWEEN_MS = 420; // เท่ากับ crossfade ของรูปในสเปก §5

type FinishContextValue = {
  finishes: Finish[];
  /** finish ที่เลือกอยู่ — undefined เฉพาะกรณีสินค้าไม่มี finish เลย */
  selected: Finish | undefined;
  selectedIndex: number;
  select: (code: string) => void;
  /** true เมื่อสินค้ามีให้เลือกมากกว่าหนึ่งเฉด = ควรมีแถวสวอตช์ */
  hasChoice: boolean;
};

const FinishContext = createContext<FinishContextValue | null>(null);

export function useFinish() {
  const ctx = useContext(FinishContext);
  if (!ctx) throw new Error('useFinish must be used inside <FinishProvider>');
  return ctx;
}

/** ใช้เมื่อ component อาจถูก render นอก provider ได้ */
export function useFinishOptional() {
  return useContext(FinishContext);
}

type Props = {
  finishes: Finish[];
  children: ReactNode;
  /** รหัส finish เริ่มต้น — ถ้าไม่ส่งหรือหาไม่เจอจะใช้ตัวแรก */
  initialCode?: string;
  /**
   * 'root'  = เขียน --accent ที่ <html> ตามสเปก §2 (หน้า detail ที่มีสินค้าชิ้นเดียว)
   * 'self'  = เขียนที่ wrapper ของ provider เอง ให้หลาย provider อยู่หน้าเดียวกันได้
   *           โดยไม่แย่งตัวแปรกัน (เช่น การ์ดในกริด)
   */
  applyTo?: 'root' | 'self';
  className?: string;
};

export default function FinishProvider({
  finishes,
  children,
  initialCode,
  applyTo = 'root',
  className,
}: Props) {
  const initialIndex = Math.max(
    0,
    finishes.findIndex((f) => f.code === initialCode),
  );
  const [index, setIndex] = useState(initialIndex);
  const wrap = useRef<HTMLDivElement>(null);

  const selected = finishes[index];

  // สีที่แสดงอยู่จริงบนหน้าจอ ณ ตอนนี้ (ระหว่าง tween จะไม่ตรงกับ selected.accent)
  const painted = useRef<string | null>(null);
  const tween = useRef<gsap.core.Tween | null>(null);

  const targetEl = useCallback(
    () => (applyTo === 'self' ? wrap.current : document.documentElement),
    [applyTo],
  );

  // เซ็ตค่าเริ่มต้น + คืนค่าเดิมตอน unmount
  // ถ้าไม่คืน ออกจากหน้าสินค้าไปแล้วทั้งเว็บจะยังติดสีของสินค้าชิ้นนั้น
  useEffect(() => {
    const el = targetEl();
    if (!el || !selected) return;
    const previous = el.style.getPropertyValue(ACCENT_VAR);
    el.style.setProperty(ACCENT_VAR, selected.accent);
    painted.current = selected.accent;
    return () => {
      tween.current?.kill();
      tween.current = null;
      if (previous) el.style.setProperty(ACCENT_VAR, previous);
      else el.style.removeProperty(ACCENT_VAR);
    };
    // ตั้งค่าครั้งเดียวตอน mount — การเปลี่ยนหลังจากนั้นเป็นหน้าที่ของ effect ด้านล่าง
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // tween ไปหาสีของ finish ที่เลือก
  useEffect(() => {
    const el = targetEl();
    if (!el || !selected) return;

    const from = painted.current ?? selected.accent;
    const to = selected.accent;
    if (from === to) {
      el.style.setProperty(ACCENT_VAR, to);
      painted.current = to;
      return;
    }

    tween.current?.kill();

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      el.style.setProperty(ACCENT_VAR, to);
      painted.current = to;
      return;
    }

    // interpolate() คืนค่าสีกลาง ๆ ทีละเฟรม ไม่ใช่การสลับสตริง
    const mix = gsap.utils.interpolate(from, to);
    const p = { v: 0 };
    tween.current = gsap.to(p, {
      v: 1,
      duration: TWEEN_MS / 1000,
      ease: 'power2.inOut',
      onUpdate: () => {
        const c = mix(p.v);
        painted.current = c;
        el.style.setProperty(ACCENT_VAR, c);
      },
      onComplete: () => {
        painted.current = to;
        el.style.setProperty(ACCENT_VAR, to);
      },
    });

    return () => {
      tween.current?.kill();
      tween.current = null;
    };
  }, [selected, targetEl]);

  const select = useCallback(
    (code: string) => {
      const next = finishes.findIndex((f) => f.code === code);
      if (next >= 0) setIndex(next);
    },
    [finishes],
  );

  // รายการ finish เปลี่ยน (เปลี่ยนสินค้า) — กลับไปที่ตัวแรกเสมอ
  useEffect(() => {
    setIndex((i) => (i < finishes.length ? i : 0));
  }, [finishes]);

  const value = useMemo<FinishContextValue>(
    () => ({
      finishes,
      selected,
      selectedIndex: index,
      select,
      hasChoice: finishes.length > 1,
    }),
    [finishes, selected, index, select],
  );

  return (
    <FinishContext.Provider value={value}>
      <div ref={wrap} className={className}>
        {children}
      </div>
    </FinishContext.Provider>
  );
}
