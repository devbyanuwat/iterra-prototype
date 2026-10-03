// ปั้นครัว 1 ชุดจากผังใน lib/room.ts · รูปทรงสร้างในโค้ดทั้งหมด ไม่มีไฟล์โมเดล
// แต่ละ run ปั้นในพิกัดของตัวเอง: x = ตามแนว run (0 ถึงความยาว), z = 0 คือหลังตู้ 0.6 คือขอบท็อปด้านหน้า
// แล้วค่อยวางและหมุนทั้ง run ตาม run.x, run.z, run.turn
// ก๊อกเป็นทรงคอสูงทั่วไป ไม่ใช่รุ่นจริงของ KOHLER

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Layout, Module, Run } from '@/lib/room';

export type Mats = ReturnType<typeof makeMaterials>;

// วัสดุชุดเดียวใช้ร่วมกันทั้ง 3 ครัว · door, top, splash, floor, faucet เปลี่ยนตามที่ผู้ใช้เลือก (applyLook)
export function makeMaterials() {
  const standard = (color: string, roughness: number, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  return {
    door: standard('#eeece8', 0.62),
    top: standard('#8d8983', 0.3),
    splash: standard('#efede8', 0.18),
    floor: standard('#b7a085', 0.62),
    faucet: standard('#f1f2f3', 0.08, 1),
    wall: standard('#dcd7cf', 0.95),
    kick: standard('#2a2725', 0.8), // ขาตู้ และพื้นมืดหลังร่องหน้าบาน
    steel: standard('#c8cacc', 0.32, 1), // ซิงก์ มือจับ ฮูด
    glass: standard('#0d0d0e', 0.06, 0.4), // เตา หน้าเตาอบ
    ring: new THREE.MeshBasicMaterial({ color: '#5a5a5c' }), // วงหัวเตา
    led: new THREE.MeshBasicMaterial({ color: '#000000' }), // เส้นไฟใต้ตู้แขวน (สีเปลี่ยนตามโทนแสง)
  };
}

// ระดับความสูงและความลึกมาตรฐานของตู้ (เมตร)
const KICK = 0.1; // ขาตู้
const BASE = 0.86; // ขอบบนตู้ล่าง
const TOP = 0.9; // ผิวท็อป
const DEPTH = 0.56; // ลึกตัวตู้ล่าง
const COUNTER = 0.6; // ลึกท็อป
const WALL_Y0 = 1.45;
const WALL_Y1 = 2.15;
const WALL_DEPTH = 0.32;
const GAP = 0.002; // ร่องรอบหน้าบาน

// BoxGeometry ให้ UV 0..1 ต่อหน้า → คูณด้วยขนาดจริงให้เป็นหน่วยเมตร ลายจะไม่ยืด
// ลำดับหน้าของ BoxGeometry: +x, -x, +y, -y, +z, -z (หน้าละ 4 จุด)
function metreUV(geo: THREE.BoxGeometry, w: number, h: number, d: number) {
  const uv = geo.attributes.uv;
  const faces = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let i = 0; i < uv.count; i++) {
    const [u, v] = faces[Math.floor(i / 4)];
    uv.setXY(i, uv.getX(i) * u, uv.getY(i) * v);
  }
}

function mesh(group: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

// กล่องจากขอบเขต · radius > 0 = ขอบมน (UV 0..1 ต่อชิ้น ใช้กับหน้าบาน)
function box(group: THREE.Group, mat: THREE.Material, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, radius = 0) {
  const [w, h, d] = [x1 - x0, y1 - y0, z1 - z0];
  let geo: THREE.BufferGeometry;
  if (radius) geo = new RoundedBoxGeometry(w, h, d, 3, radius);
  else {
    const plain = new THREE.BoxGeometry(w, h, d);
    metreUV(plain, w, h, d);
    geo = plain;
  }
  return mesh(group, geo, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
}

const front = (g: THREE.Group, m: Mats, x0: number, x1: number, y0: number, y1: number, z: number) =>
  box(g, m.door, x0 + GAP, x1 - GAP, y0 + GAP, y1 - GAP, z, z + 0.018, 0.004);

function handle(g: THREE.Group, m: Mats, x: number, y: number, z: number, vertical = false) {
  const bar = mesh(g, new RoundedBoxGeometry(0.16, 0.012, 0.012, 2, 0.005), m.steel, x, y, z + 0.034);
  if (vertical) bar.rotation.z = Math.PI / 2;
  for (const o of [-0.06, 0.06]) {
    mesh(g, new THREE.CylinderGeometry(0.004, 0.004, 0.022, 10), m.steel, vertical ? x : x + o, vertical ? y + o : y, z + 0.022).rotation.x = Math.PI / 2;
  }
}

// ตัวตู้ล่าง + ขาตู้ + พื้นมืดหลังร่องหน้าบาน
function carcass(g: THREE.Group, m: Mats, x0: number, x1: number, backing = true) {
  box(g, m.door, x0, x1, KICK, BASE, 0, DEPTH);
  box(g, m.kick, x0, x1, 0, KICK, 0.02, 0.5);
  if (backing) box(g, m.kick, x0 + 0.01, x1 - 0.01, KICK + 0.01, BASE - 0.01, DEPTH, DEPTH + 0.001);
}

const counter = (g: THREE.Group, m: Mats, x0: number, x1: number) => box(g, m.top, x0, x1, BASE, TOP, 0, COUNTER);

function doors(g: THREE.Group, m: Mats, x0: number, x1: number, count: 1 | 2) {
  const mid = (x0 + x1) / 2;
  if (count === 2) {
    front(g, m, x0, mid, KICK, BASE, DEPTH);
    front(g, m, mid, x1, KICK, BASE, DEPTH);
    handle(g, m, mid - 0.11, 0.79, DEPTH);
    handle(g, m, mid + 0.11, 0.79, DEPTH);
  } else {
    front(g, m, x0, x1, KICK, BASE, DEPTH);
    handle(g, m, mid, 0.79, DEPTH);
  }
}

function drawers(g: THREE.Group, m: Mats, x0: number, x1: number, rows: number[]) {
  let y = BASE;
  for (const h of rows) {
    front(g, m, x0, x1, y - h, y, DEPTH);
    handle(g, m, (x0 + x1) / 2, y - 0.07, DEPTH);
    y -= h;
  }
}

// ซิงก์ฝังใต้ท็อป: ท็อป 4 ชิ้นรอบช่อง + อ่างสเตนเลส + ก๊อก
function sink(g: THREE.Group, m: Mats, x0: number, x1: number) {
  const cx = (x0 + x1) / 2;
  const [a, b, z0, z1, floor] = [cx - 0.25, cx + 0.25, 0.12, 0.52, 0.68];
  box(g, m.top, x0, a, BASE, TOP, 0, COUNTER);
  box(g, m.top, b, x1, BASE, TOP, 0, COUNTER);
  box(g, m.top, a, b, BASE, TOP, 0, z0);
  box(g, m.top, a, b, BASE, TOP, z1, COUNTER);
  box(g, m.steel, a, b, floor, floor + 0.01, z0, z1);
  box(g, m.steel, a - 0.01, a, floor, TOP - 0.005, z0, z1);
  box(g, m.steel, b, b + 0.01, floor, TOP - 0.005, z0, z1);
  box(g, m.steel, a, b, floor, TOP - 0.005, z0 - 0.01, z0);
  box(g, m.steel, a, b, floor, TOP - 0.005, z1, z1 + 0.01);
  mesh(g, new THREE.CylinderGeometry(0.03, 0.03, 0.004, 24), m.kick, cx, floor + 0.012, 0.32, false);

  mesh(g, new THREE.CylinderGeometry(0.024, 0.027, 0.05, 24), m.faucet, cx, TOP + 0.025, 0.07);
  const neck = new THREE.CatmullRomCurve3([
    new THREE.Vector3(cx, 0.94, 0.07),
    new THREE.Vector3(cx, 1.2, 0.07),
    new THREE.Vector3(cx, 1.31, 0.12),
    new THREE.Vector3(cx, 1.31, 0.22),
    new THREE.Vector3(cx, 1.22, 0.265),
  ]);
  mesh(g, new THREE.TubeGeometry(neck, 48, 0.013, 16), m.faucet, 0, 0, 0);
  mesh(g, new THREE.CylinderGeometry(0.016, 0.014, 0.05, 20), m.faucet, cx, 1.2, 0.268).rotation.x = -0.35;
  mesh(g, new THREE.CylinderGeometry(0.006, 0.008, 0.11, 12), m.faucet, cx + 0.065, 0.975, 0.07).rotation.z = -1.05;
}

function hob(g: THREE.Group, m: Mats, x0: number, x1: number) {
  const cx = (x0 + x1) / 2;
  box(g, m.glass, cx - 0.28, cx + 0.28, TOP, TOP + 0.006, 0.06, 0.54, 0.002);
  for (const [dx, z, r] of [[-0.13, 0.19, 0.075], [0.14, 0.19, 0.09], [-0.13, 0.42, 0.09], [0.14, 0.42, 0.075]]) {
    mesh(g, new THREE.RingGeometry(r - 0.003, r, 48), m.ring, cx + dx, TOP + 0.0066, z, false).rotation.x = -Math.PI / 2;
  }
}

// หน้าเตาอบ: กระจกดำ + แถบปุ่ม + มือจับยาว (y0..y1 = ขอบกระจก)
function ovenFront(g: THREE.Group, m: Mats, x0: number, x1: number, y0: number, y1: number) {
  box(g, m.glass, x0 + 0.01, x1 - 0.01, y0, y1, DEPTH, DEPTH + 0.015, 0.004);
  box(g, m.steel, x0 + 0.01, x1 - 0.01, y1 - 0.09, y1, DEPTH + 0.015, DEPTH + 0.018);
  mesh(g, new RoundedBoxGeometry(x1 - x0 - 0.14, 0.014, 0.014, 2, 0.006), m.steel, (x0 + x1) / 2, y1 - 0.14, DEPTH + 0.05);
}

// ตู้สูง: บานล่าง เตาอบฝัง บานบน
function tall(g: THREE.Group, m: Mats, x0: number, x1: number, handleX: number) {
  box(g, m.door, x0, x1, KICK, WALL_Y1, 0, DEPTH);
  box(g, m.kick, x0, x1, 0, KICK, 0.02, 0.5);
  box(g, m.kick, x0 + 0.01, x1 - 0.01, KICK + 0.01, WALL_Y1 - 0.01, DEPTH, DEPTH + 0.001);
  front(g, m, x0, x1, KICK, 0.72, DEPTH);
  front(g, m, x0, x1, 1.34, WALL_Y1, DEPTH);
  handle(g, m, handleX, 0.55, DEPTH, true);
  handle(g, m, handleX, 1.52, DEPTH, true);
  ovenFront(g, m, x0, x1, 0.73, 1.33);
}

// ตู้แขวน: หน้าบานยื่นลงใต้ตู้ 2 ซม. ใช้เป็นที่จับ · เหนือเตา = ฮูดฝัง · ที่อื่น = เส้นไฟใต้ตู้
function wallCabinet(g: THREE.Group, m: Mats, x0: number, x1: number, overHob: boolean) {
  box(g, m.door, x0, x1, WALL_Y0, WALL_Y1, 0, WALL_DEPTH);
  box(g, m.kick, x0 + 0.01, x1 - 0.01, WALL_Y0 + 0.01, WALL_Y1 - 0.01, WALL_DEPTH, WALL_DEPTH + 0.001);
  const mid = (x0 + x1) / 2;
  if (x1 - x0 >= 0.8) {
    front(g, m, x0, mid, WALL_Y0 - 0.02, WALL_Y1, WALL_DEPTH);
    front(g, m, mid, x1, WALL_Y0 - 0.02, WALL_Y1, WALL_DEPTH);
  } else front(g, m, x0, x1, WALL_Y0 - 0.02, WALL_Y1, WALL_DEPTH);
  if (overHob) box(g, m.steel, mid - 0.27, mid + 0.27, WALL_Y0 - 0.015, WALL_Y0, 0.03, 0.3);
  else box(g, m.led, x0 + 0.02, x1 - 0.02, WALL_Y0 - 0.006, WALL_Y0, 0.24, 0.26).castShadow = false;
}

function buildModule(g: THREE.Group, m: Mats, mod: Module, x0: number, run: Run, last: boolean) {
  const x1 = x0 + mod.w;
  if (mod.kind === 'tall') {
    // มือจับอยู่ฝั่งที่ติดกับตู้อื่น (ตู้สูงอยู่ปลาย run เสมอ)
    tall(g, m, x0, x1, last ? x0 + 0.07 : x1 - 0.07);
    return;
  }
  carcass(g, m, x0, x1, mod.kind !== 'corner');
  if (mod.kind === 'sink') sink(g, m, x0, x1);
  else counter(g, m, x0, x1);

  if (mod.kind === 'door') doors(g, m, x0, x1, mod.doors);
  if (mod.kind === 'sink') doors(g, m, x0, x1, 2);
  if (mod.kind === 'drawers') drawers(g, m, x0, x1, mod.rows);
  if (mod.kind === 'hob') {
    drawers(g, m, x0, x1, [0.28, 0.48]);
    hob(g, m, x0, x1);
  }
  if (mod.kind === 'oven') {
    front(g, m, x0, x1, KICK, 0.24, DEPTH);
    ovenFront(g, m, x0, x1, 0.25, 0.85);
  }
  if (run.back) {
    box(g, m.splash, x0, x1, TOP, WALL_Y0, 0, 0.008);
    wallCabinet(g, m, x0, x1, mod.kind === 'hob');
  }
}

function buildRun(run: Run, m: Mats) {
  const g = new THREE.Group();
  let x = 0;
  run.modules.forEach((mod, i) => {
    buildModule(g, m, mod, x, run, i === run.modules.length - 1);
    x += mod.w;
  });
  g.position.set(run.x, 0, run.z);
  g.rotation.y = (run.turn * Math.PI) / 2;
  return g;
}

export function buildKitchen(layout: Layout, m: Mats) {
  const kitchen = new THREE.Group();
  layout.runs.forEach((run) => kitchen.add(buildRun(run, m)));
  kitchen.position.x = layout.x;
  return kitchen;
}

// ตำแหน่งไฟส่องใต้ตู้แขวนของครัวนี้ (x ในพิกัดห้อง) ไม่เกิน 4 ดวง: กลางตู้แขวนทุกช่องที่ไม่ใช่ฮูด
export function ledPositions(layout: Layout) {
  const back = layout.runs[0];
  const xs: number[] = [];
  let x = layout.x + back.x;
  for (const mod of back.modules) {
    if (mod.kind !== 'tall' && mod.kind !== 'hob') xs.push(x + mod.w / 2);
    x += mod.w;
  }
  return xs.slice(0, 4);
}
