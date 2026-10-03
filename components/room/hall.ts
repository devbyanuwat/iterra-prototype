// แต่งโถงให้เป็นโชว์รูมแบบแกลเลอรี: บัวพื้น ฝ้า รางไฟ เสาอิงผนัง ป้ายชื่อผัง หน้าต่างพร้อมวิว เฟอร์นิเจอร์ ของบนเคาน์เตอร์
// ตำแหน่งทั้งหมดมาจาก SHOWROOM ใน lib/room.ts · ทุกชิ้นเป็นของประกอบฉาก ชี้และกดไม่ได้ (userData.inert)
// ชิ้นนิ่งรวมเป็น mesh เดียวต่อวัสดุ (mergeGeometries) ทั้งโถงจึงใช้ draw call ราววัสดุละ 1 ครั้ง
// รางไฟ: หน้าหัวไฟเรืองแสงเป็นของปลอม · ไฟจริงมีดวงเดียว อยู่ใน RoomScene ย้ายตามครัวที่ดูอยู่ (งบไฟ 6 ดวง)

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HALL, LAYOUTS, SHOWROOM } from '@/lib/room';
import { metreUV, type Mats } from './kitchen';

type Lang = 'th' | 'en';
const COUNTER_TOP = 0.9; // ระดับผิวท็อป (ตรงกับ TOP ใน kitchen.ts)
export type Hall = { group: THREE.Group; setSigns: (lang: Lang) => void; dispose: () => void };

// ถุงเก็บ geometry แยกตามวัสดุ · solid = ทอดเงา, flat = ไม่ทอดเงา (ฝ้า รางไฟ วิว)
type Bag = Map<THREE.Material, THREE.BufferGeometry[]>;
function put(bag: Bag, mat: THREE.Material, geo: THREE.BufferGeometry, x = 0, y = 0, z = 0) {
  geo.translate(x, y, z);
  const list = bag.get(mat) ?? [];
  list.push(geo.index ? geo.toNonIndexed() : geo); // รวมได้เฉพาะ geometry ที่ไม่มี index เหมือนกันทุกชิ้น
  bag.set(mat, list);
}
function slab(bag: Bag, mat: THREE.Material, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) {
  const [w, h, d] = [x1 - x0, y1 - y0, z1 - z0];
  const geo = new THREE.BoxGeometry(w, h, d);
  metreUV(geo, w, h, d);
  put(bag, mat, geo, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
}

// วิวนอกหน้าต่าง: ท้องฟ้าไล่สี สนามหญ้า และแนวต้นไม้เบลอ วาดเองทั้งหมด ไม่โหลดรูป
function viewTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const c = canvas.getContext('2d')!;
  const sky = c.createLinearGradient(0, 0, 0, 330);
  sky.addColorStop(0, '#b9d0e4');
  sky.addColorStop(1, '#f1f2ec');
  c.fillStyle = sky;
  c.fillRect(0, 0, 512, 330);
  c.fillStyle = '#b4c09f';
  c.fillRect(0, 330, 512, 182);
  c.filter = 'blur(7px)'; // เบราว์เซอร์ที่ไม่รองรับจะได้ต้นไม้ขอบคม ซึ่งยังดูได้
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const [tone, base, size] of [['#9fb096', 318, 46], ['#7f9479', 338, 62]] as const) {
    c.fillStyle = tone;
    for (let x = -20; x < 540; x += size * 0.7) {
      c.beginPath();
      c.arc(x + random() * 20, base - random() * 26, size * (0.6 + random() * 0.5), 0, Math.PI * 2);
      c.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildHall(m: Mats, lang: Lang): Hall {
  const group = new THREE.Group();
  const solid: Bag = new Map();
  const flat: Bag = new Map();
  const half = HALL.width / 2;
  const { skirting, pilasters, windows, rails, sign, bench, plant, table } = SHOWROOM;

  // บัวพื้น: ผนังหลังและผนังปลายห้องทั้งสองด้าน
  slab(solid, m.kick, -half, half, 0, skirting, 0, 0.015);
  for (const side of [-1, 1]) slab(solid, m.kick, side * half - 0.015, side * half + 0.015, 0, skirting, 0, HALL.depth);

  // ฝ้า: แผ่นหน้าเดียวหันลง
  put(flat, m.wall, new THREE.PlaneGeometry(HALL.width, HALL.depth).rotateX(Math.PI / 2), 0, HALL.height, HALL.depth / 2);

  // เสาอิงผนังพร้อมบัวพื้นหุ้มรอบ
  for (const x of pilasters.xs) {
    const [a, b] = [x - pilasters.w / 2, x + pilasters.w / 2];
    slab(solid, m.wall, a, b, skirting, HALL.height, 0, pilasters.d);
    slab(solid, m.kick, a - 0.012, b + 0.012, 0, skirting, 0, pilasters.d + 0.012);
  }

  // รางไฟแขวนเหนือครัวแต่ละชุด: ราง ก้านแขวน 2 ก้าน และหัวไฟ
  for (const layout of LAYOUTS) {
    for (const z of rails.zs) {
      slab(flat, m.kick, layout.x - 1.7, layout.x + 1.7, rails.y, rails.y + 0.03, z - 0.02, z + 0.02);
      for (const o of [-1.5, 1.5]) slab(flat, m.kick, layout.x + o - 0.006, layout.x + o + 0.006, rails.y + 0.03, HALL.height, z - 0.006, z + 0.006);
      for (const o of rails.heads) {
        put(flat, m.kick, new THREE.CylinderGeometry(0.05, 0.042, 0.15, 16), layout.x + o, rails.y - 0.085, z);
        put(flat, m.lamp, new THREE.CylinderGeometry(0.034, 0.034, 0.004, 16), layout.x + o, rails.y - 0.162, z);
      }
    }
  }

  // หน้าต่าง: แผ่นวิวลอยหน้าผนัง 6 มม. + กรอบ + เส้นแบ่งตั้ง 1 เส้น นอน 1 เส้น
  const view = viewTexture();
  m.view.map = view;
  for (const x of windows.xs) {
    const [a, b, y0, y1] = [x - windows.w / 2, x + windows.w / 2, windows.y0, windows.y1];
    put(flat, m.view, new THREE.PlaneGeometry(windows.w, y1 - y0), x, (y0 + y1) / 2, 0.006);
    const bar = 0.05;
    slab(solid, m.kick, a - bar, a, y0 - bar, y1 + bar, 0, 0.06);
    slab(solid, m.kick, b, b + bar, y0 - bar, y1 + bar, 0, 0.06);
    slab(solid, m.kick, a, b, y1, y1 + bar, 0, 0.06);
    slab(solid, m.kick, a - 0.04, b + 0.04, y0 - bar, y0, 0, 0.1); // ธรณีหน้าต่างยื่นออกมาเล็กน้อย
    slab(solid, m.kick, x - 0.015, x + 0.015, y0, y1, 0, 0.04);
    slab(solid, m.kick, a, b, y0 + (y1 - y0) * 0.72, y0 + (y1 - y0) * 0.72 + 0.03, 0, 0.04);
  }

  // ── เฟอร์นิเจอร์โชว์รูม: วางในช่องว่างระหว่างครัว หน้าหน้าต่าง ──
  // ม้านั่งไม้: แผ่นนั่งบนขาแผ่น 2 ข้าง
  {
    const [a, b, z0, z1] = [bench.x - bench.w / 2, bench.x + bench.w / 2, bench.z - bench.d / 2, bench.z + bench.d / 2];
    slab(solid, m.wood, a, b, 0.4, 0.46, z0, z1);
    for (const x of [a + 0.08, b - 0.13]) slab(solid, m.wood, x, x + 0.05, 0, 0.4, z0 + 0.02, z1 - 0.02);
  }
  // ต้นไม้กระถาง: กระถางเซรามิก ลำต้น และพุ่มใบเป็นก้อนเหลี่ยมหยาบ
  {
    const { x, z } = plant;
    put(solid, m.ceramic, new THREE.CylinderGeometry(0.21, 0.16, 0.42, 24), x, 0.21, z);
    put(solid, m.kick, new THREE.CylinderGeometry(0.19, 0.19, 0.01, 24), x, 0.424, z); // ดินในกระถาง
    put(solid, m.wood, new THREE.CylinderGeometry(0.016, 0.026, 0.95, 8), x, 0.87, z);
    for (const [dx, y, dz, r] of [[0, 1.5, 0, plant.r], [0.2, 1.34, 0.05, 0.2], [-0.17, 1.36, -0.06, 0.22], [0.04, 1.72, 0.08, 0.18], [-0.05, 1.22, 0.14, 0.16]]) {
      put(solid, m.leaf, new THREE.IcosahedronGeometry(r, 1), x + dx, y, z + dz);
    }
  }
  // โต๊ะตัวอย่างวัสดุ: แผ่นตัวอย่าง 4 แผ่นใช้วัสดุชุดเดียวกับครัว เปลี่ยนสีในแผงแล้วแผ่นเปลี่ยนตาม
  {
    const [a, b, z0, z1] = [table.x - table.w / 2, table.x + table.w / 2, table.z - table.d / 2, table.z + table.d / 2];
    slab(solid, m.wood, a, b, 0.72, 0.76, z0, z1);
    for (const x of [a + 0.06, b - 0.1]) for (const z of [z0 + 0.06, z1 - 0.1]) slab(solid, m.kick, x, x + 0.04, 0, 0.72, z, z + 0.04);
    [m.door, m.top, m.splash, m.floor].forEach((mat, i) => {
      const x = table.x + (i - 1.5) * 0.36;
      slab(solid, mat, x - 0.13, x + 0.13, 0.76, 0.778, table.z - 0.17, table.z + 0.17);
    });
  }

  // ── ของบนเคาน์เตอร์ของครัวแต่ละชุด (ตำแหน่งจาก layout.props) ──
  const lathe = (points: number[][]) => new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), 24);
  for (const layout of LAYOUTS) {
    for (const prop of layout.props) {
      const [x, y, z] = [layout.x + prop.x, COUNTER_TOP, prop.z];
      if (prop.kind === 'board') slab(solid, m.wood, x - 0.16, x + 0.16, y, y + 0.02, z - 0.11, z + 0.11);
      if (prop.kind === 'books') {
        slab(solid, m.paper, x - 0.12, x + 0.12, y, y + 0.03, z - 0.085, z + 0.085);
        slab(solid, m.leaf, x - 0.11, x + 0.1, y + 0.03, y + 0.055, z - 0.08, z + 0.075);
        slab(solid, m.kick, x - 0.095, x + 0.1, y + 0.055, y + 0.085, z - 0.075, z + 0.07);
      }
      if (prop.kind === 'bowl') {
        // ไล่จุดจากก้นด้านนอกขึ้นขอบ แล้ววนลงก้นด้านใน ได้ผิวทั้งนอกและใน
        put(solid, m.ceramic, lathe([[0.001, 0], [0.06, 0], [0.12, 0.04], [0.14, 0.085], [0.132, 0.085], [0.112, 0.045], [0.055, 0.012], [0.001, 0.012]]), x, y, z);
        for (const [dx, dy, dz] of [[-0.045, 0.045, 0.01], [0.04, 0.045, -0.03], [0.012, 0.05, 0.05]]) put(solid, m.fruit, new THREE.SphereGeometry(0.036, 14, 10), x + dx, y + dy, z + dz);
      }
      if (prop.kind === 'vase') {
        put(solid, m.kick, lathe([[0.001, 0], [0.05, 0], [0.066, 0.07], [0.05, 0.17], [0.024, 0.22], [0.03, 0.25]]), x, y, z);
        for (const [tilt, turn] of [[0.16, 0], [-0.2, 2.1], [0.24, 4.2]]) {
          const stem = new THREE.CylinderGeometry(0.003, 0.003, 0.26, 6).translate(0, 0.13, 0).rotateZ(tilt).rotateY(turn);
          put(solid, m.wood, stem, x, y + 0.2, z);
          const tip = new THREE.Vector3(0, 0.26, 0) // ก้านสั้นพอให้ปลายอยู่ใต้ตู้แขวน
            .applyAxisAngle(new THREE.Vector3(0, 0, 1), tilt).applyAxisAngle(new THREE.Vector3(0, 1, 0), turn);
          put(solid, m.leaf, new THREE.IcosahedronGeometry(0.03, 0), x + tip.x, y + 0.2 + tip.y, z + tip.z);
        }
      }
    }
  }

  for (const [bag, shadow] of [[solid, true], [flat, false]] as const) {
    bag.forEach((list, mat) => {
      const mesh = new THREE.Mesh(mergeGeometries(list), mat);
      list.forEach((geo) => geo.dispose());
      mesh.castShadow = shadow;
      mesh.receiveShadow = mat !== m.view;
      group.add(mesh);
    });
  }

  // ป้ายชื่อผังเหนือครัว: ชื่อผังและเส้นสั้นใต้ชื่อ · พื้นโปร่งใส ตัวหนังสืออยู่บนผนังโดยตรง
  const signs = LAYOUTS.map((layout) => {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = Math.round((768 * sign.h) / sign.w);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const material = new THREE.MeshStandardMaterial({ map: texture, transparent: true, roughness: 0.9 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sign.w, sign.h), material);
    mesh.position.set(layout.x, sign.y, 0.012);
    group.add(mesh);
    return { layout, canvas, texture, material };
  });
  const setSigns = (to: Lang) => {
    const family = getComputedStyle(document.body).fontFamily; // ฟอนต์ชุดเดียวกับหน้าเว็บ
    for (const { layout, canvas, texture } of signs) {
      const c = canvas.getContext('2d')!;
      const { width: w, height: h } = canvas;
      c.clearRect(0, 0, w, h);
      c.fillStyle = '#1c1917';
      c.textBaseline = 'middle';
      c.textAlign = 'center';
      c.font = `300 ${h * 0.42}px ${family}`;
      c.fillText(layout.name[to], w / 2, h * 0.42);
      c.fillRect(w / 2 - h * 0.3, h * 0.78, h * 0.6, 2); // เส้นสั้นใต้ชื่อ
      texture.needsUpdate = true;
    }
  };
  setSigns(lang);

  group.traverse((o) => (o.userData.inert = true));
  return {
    group,
    setSigns,
    dispose: () => {
      view.dispose();
      signs.forEach((s) => (s.texture.dispose(), s.material.dispose()));
    },
  };
}
