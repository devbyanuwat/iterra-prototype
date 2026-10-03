// ลายวัสดุวาดด้วยโค้ดลง canvas (ไม้ พื้นไม้ กระเบื้อง หินเม็ด) · ไม่มีไฟล์ภาพ
// ลาย 1 ชุด = 1 ตารางเมตร × look.size · กล่องและพื้นใช้ UV หน่วยเมตร ลายจึงไม่ยืดตามขนาดชิ้น
// ขีดจำกัด: ดูดีระยะโชว์รูม ซูมใกล้จะรู้ว่าไม่ใช่ลายจริง → ของจริงเปลี่ยนเป็นไฟล์ลายจากผู้ผลิต

import * as THREE from 'three';
import type { Look, Pattern } from '@/lib/room';

const PX = 512;
const cache = new Map<string, THREE.CanvasTexture>();

// สุ่มแบบกำหนด seed ให้ลายออกมาเหมือนเดิมทุกครั้ง
function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function grain(g: CanvasRenderingContext2D, rnd: () => number, lines: number) {
  for (let i = 0; i < lines; i++) {
    const x = rnd() * PX;
    g.strokeStyle = rnd() > 0.5 ? `rgba(40,25,10,${0.04 + rnd() * 0.14})` : `rgba(255,240,215,${0.04 + rnd() * 0.12})`;
    g.lineWidth = 0.6 + rnd() * 2.4;
    g.beginPath();
    g.moveTo(x, 0);
    g.bezierCurveTo(x + (rnd() - 0.5) * 14, PX / 3, x + (rnd() - 0.5) * 14, (PX * 2) / 3, x, PX); // จบที่ x เดิม ลายต่อกันได้ตอนปูซ้ำ
    g.stroke();
  }
}

const DRAW: Record<Pattern, (g: CanvasRenderingContext2D, rnd: () => number) => void> = {
  wood: (g, rnd) => grain(g, rnd, 260),
  planks: (g, rnd) => {
    grain(g, rnd, 220);
    const n = 6; // 6 แผ่นต่อเมตร
    g.fillStyle = 'rgba(30,20,10,.4)';
    for (let i = 0; i < n; i++) {
      const x = (i * PX) / n;
      g.fillRect(x, 0, 1.5, PX);
      g.fillRect(x, (i * 197) % PX, PX / n, 1.5); // รอยต่อหัวแผ่น สลับตำแหน่งกัน
    }
  },
  tile: (g, rnd) => {
    const n = 5; // 5 x 5 แผ่นต่อชุด
    for (let i = 0; i < n * n; i++) {
      g.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '0,0,0'},${rnd() * 0.05})`;
      g.fillRect(((i % n) * PX) / n, (Math.floor(i / n) * PX) / n, PX / n, PX / n);
    }
    g.fillStyle = 'rgba(0,0,0,.2)'; // ร่องยาแนว
    for (let i = 0; i < n; i++) {
      g.fillRect((i * PX) / n, 0, 2, PX);
      g.fillRect(0, (i * PX) / n, PX, 2);
    }
  },
  speckle: (g, rnd) => {
    for (let i = 0; i < 1600; i++) {
      g.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '0,0,0'},${0.03 + rnd() * 0.09})`;
      g.fillRect(rnd() * PX, rnd() * PX, 1 + rnd() * 2.5, 1 + rnd() * 2.5);
    }
  },
};

function textureFor(look: Look) {
  if (!look.pattern) return null;
  const size = look.size ?? 1;
  const key = `${look.pattern}|${look.color}|${size}`;
  let texture = cache.get(key);
  if (!texture) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = PX;
    const g = canvas.getContext('2d')!;
    g.fillStyle = look.color;
    g.fillRect(0, 0, PX, PX);
    DRAW[look.pattern](g, seeded(7));
    texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.setScalar(1 / size);
    texture.anisotropy = 8;
    cache.set(key, texture);
  }
  return texture;
}

// ใส่วัสดุตาม look · มีลาย = สีอยู่ในลายแล้ว ตัววัสดุเป็นขาว
export function applyLook(material: THREE.MeshStandardMaterial, look: Look) {
  const map = textureFor(look);
  material.map = map;
  material.color.set(map ? '#ffffff' : look.color);
  material.roughness = look.roughness;
  material.metalness = look.metalness ?? 0;
  material.needsUpdate = true;
}

export function disposeTextures() {
  cache.forEach((texture) => texture.dispose());
  cache.clear();
}
