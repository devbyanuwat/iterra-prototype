'use client';

// ── SPIKE (ของทดลอง ยังไม่ใช่ของจริง) ──
// ฉาก 3D ห้องครัวผัง I ปั้นจากรูปทรงในโค้ดทั้งหมด ไม่มีไฟล์โมเดล
// หน่วยเป็นเมตร · x = ตามแนวผนัง, y = สูง, z = ออกจากผนังเข้าหากล้อง · ผนังหลังอยู่ที่ z = 0
// วาดใหม่เฉพาะตอนมีอะไรเปลี่ยน (หมุน ซูม เปลี่ยนสี เปลี่ยนแสง) ไม่วาดวนทุกเฟรม

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type DoorId = 'white' | 'oak';
export type LightId = 'day' | 'warm';
export type RoomHandle = { zoom: (step: number) => void; rotate: (step: number) => void; reset: () => void };

type Props = { door: DoorId; light: LightId; onReady: () => void; onError: () => void };

const TARGET = new THREE.Vector3(0, 1.08, 0.3);
const HOME = { azimuth: 0.42, polar: 1.36, distance: 5.2 };
const DISTANCE = { min: 2.8, max: 6.8 };
const HALF_TURN = Math.PI / 2; // หมุนซ้ายขวาข้างละ 90 องศา = รวม 180

const LIGHTS: Record<LightId, { sun: number; sunColor: string; hemi: number; env: number; led: number; ceil: number; bg: string; exposure: number }> = {
  day: { sun: 3.1, sunColor: '#fff1dc', hemi: 0.38, env: 0.5, led: 0, ceil: 0, bg: '#e9e6e1', exposure: 0.82 },
  warm: { sun: 0.1, sunColor: '#ffd9a8', hemi: 0.1, env: 0.16, led: 6, ceil: 7.5, bg: '#2a2420', exposure: 1 },
};

// ลายไม้แบบวาดเอง: เส้นเสี้ยนแนวตั้งบนพื้นสีโอ๊ค (ของจริงควรใช้ไฟล์ลายจากผู้ผลิต)
function woodTexture(base = '#b89468', planks = 0) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, 512, 512);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 260; i++) {
    const x = rnd() * 512;
    g.strokeStyle = rnd() > 0.5 ? `rgba(92,62,34,${0.05 + rnd() * 0.16})` : `rgba(236,208,170,${0.05 + rnd() * 0.14})`;
    g.lineWidth = 0.6 + rnd() * 2.4;
    g.beginPath();
    g.moveTo(x, 0);
    g.bezierCurveTo(x + (rnd() - 0.5) * 14, 170, x + (rnd() - 0.5) * 14, 340, x + (rnd() - 0.5) * 10, 512);
    g.stroke();
  }
  // planks > 0 = พื้นไม้: ขีดรอยต่อแผ่นตามยาว และรอยต่อหัวแผ่นสลับกัน
  for (let i = 0; i < planks; i++) {
    const x = (i * 512) / planks;
    g.fillStyle = 'rgba(60,42,26,.38)';
    g.fillRect(x, 0, 1.5, 512);
    g.fillRect(x, (i * 197) % 512, 512 / planks, 1.5);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function buildKitchen(scene: THREE.Scene) {
  const wood = woodTexture();
  const planks = woodTexture('#b7a085', 8);
  planks.wrapS = planks.wrapT = THREE.RepeatWrapping;
  planks.repeat.set(3, 1.4);
  const m = {
    door: new THREE.MeshStandardMaterial({ color: '#eeece8', roughness: 0.62 }),
    top: new THREE.MeshStandardMaterial({ color: '#8d8983', roughness: 0.3 }),
    splash: new THREE.MeshStandardMaterial({ color: '#cfcac2', roughness: 0.3 }),
    wall: new THREE.MeshStandardMaterial({ color: '#dcd7cf', roughness: 0.95 }),
    floor: new THREE.MeshStandardMaterial({ map: planks, roughness: 0.62 }),
    kick: new THREE.MeshStandardMaterial({ color: '#2a2725', roughness: 0.8 }),
    steel: new THREE.MeshStandardMaterial({ color: '#c8cacc', roughness: 0.32, metalness: 1 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#f1f2f3', roughness: 0.08, metalness: 1 }),
    glass: new THREE.MeshStandardMaterial({ color: '#0d0d0e', roughness: 0.06, metalness: 0.4 }),
    ring: new THREE.MeshBasicMaterial({ color: '#5a5a5c' }),
    led: new THREE.MeshBasicMaterial({ color: '#000000' }),
  };

  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, shadow = true) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  };
  // กล่องจากขอบเขต (x0..x1, y0..y1, z0..z1) · r > 0 = ขอบมน
  const box = (mat: THREE.Material, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, r = 0) => {
    const [w, h, d] = [x1 - x0, y1 - y0, z1 - z0];
    const geo = r ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d);
    return add(geo, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  };
  const GAP = 0.002; // ร่องระหว่างหน้าบาน ข้างละ 2 มม.
  const front = (x0: number, x1: number, y0: number, y1: number, z: number) =>
    box(m.door, x0 + GAP, x1 - GAP, y0 + GAP, y1 - GAP, z, z + 0.018, 0.004);
  const handle = (x: number, y: number, z: number, vertical = false) => {
    const bar = add(new RoundedBoxGeometry(0.16, 0.012, 0.012, 2, 0.005), m.steel, x, y, z + 0.034);
    if (vertical) bar.rotation.z = Math.PI / 2;
    for (const o of [-0.06, 0.06]) {
      add(new THREE.CylinderGeometry(0.004, 0.004, 0.022, 10), m.steel, vertical ? x : x + o, vertical ? y + o : y, z + 0.022).rotation.x = Math.PI / 2;
    }
  };

  // ── ห้อง: ผนังหน้าเดียว มองจากด้านนอกจะทะลุ ทำให้หมุนไปด้านข้างได้โดยผนังไม่บัง ──
  const plane = (w: number, h: number) => new THREE.PlaneGeometry(w, h);
  const floor = add(plane(5.4, 4.4), m.floor, 0, 0, 2.2, false);
  floor.rotation.x = -Math.PI / 2;
  add(plane(5.4, 3.6), m.wall, 0, 1.8, 0, false);
  add(plane(4.4, 3.6), m.wall, -2.7, 1.8, 2.2, false).rotation.y = Math.PI / 2;
  add(plane(4.4, 3.6), m.wall, 2.7, 1.8, 2.2, false).rotation.y = -Math.PI / 2;

  // ── ตู้สูงซ้ายสุด พร้อมเตาอบฝัง ──
  box(m.door, -1.8, -1.2, 0.1, 2.15, 0, 0.56);
  box(m.kick, -1.79, -1.21, 0.11, 2.14, 0.56, 0.561); // พื้นมืดหลังร่องหน้าบาน
  box(m.kick, -1.8, -1.2, 0, 0.1, 0.02, 0.5);
  front(-1.8, -1.2, 0.1, 0.72, 0.56);
  front(-1.8, -1.2, 1.34, 2.15, 0.56);
  handle(-1.27, 0.55, 0.56, true);
  handle(-1.27, 1.52, 0.56, true);
  box(m.glass, -1.79, -1.21, 0.73, 1.33, 0.56, 0.575, 0.004);
  box(m.steel, -1.79, -1.21, 1.24, 1.33, 0.575, 0.578);
  add(new RoundedBoxGeometry(0.46, 0.014, 0.014, 2, 0.006), m.steel, -1.5, 1.19, 0.61);

  // ── ตู้ล่าง ──
  box(m.door, -1.2, 1.8, 0.1, 0.86, 0, 0.56);
  box(m.kick, -1.19, 1.79, 0.11, 0.85, 0.56, 0.561);
  box(m.kick, -1.2, 1.8, 0, 0.1, 0.02, 0.5);
  const doors = (x0: number, x1: number, split: boolean) => {
    const mid = (x0 + x1) / 2;
    if (split) {
      front(x0, mid, 0.1, 0.86, 0.56);
      front(mid, x1, 0.1, 0.86, 0.56);
      handle(mid - 0.11, 0.79, 0.56);
      handle(mid + 0.11, 0.79, 0.56);
    } else {
      front(x0, x1, 0.1, 0.86, 0.56);
      handle(mid, 0.79, 0.56);
    }
  };
  const drawers = (x0: number, x1: number, heights: number[]) => {
    let y = 0.86;
    for (const h of heights) {
      front(x0, x1, y - h, y, 0.56);
      handle((x0 + x1) / 2, y - 0.07, 0.56);
      y -= h;
    }
  };
  doors(-1.2, -0.6, false);
  doors(-0.6, 0.2, true); // ตู้ใต้ซิงก์
  drawers(0.2, 0.6, [0.2, 0.28, 0.28]);
  drawers(0.6, 1.2, [0.28, 0.48]); // ตู้ใต้เตา
  doors(1.2, 1.8, false);

  // ── ท็อป เว้นช่องซิงก์ (x -0.45..0.05, z 0.12..0.52) ──
  box(m.top, -1.2, -0.45, 0.86, 0.9, 0, 0.6);
  box(m.top, 0.05, 1.8, 0.86, 0.9, 0, 0.6);
  box(m.top, -0.45, 0.05, 0.86, 0.9, 0, 0.12);
  box(m.top, -0.45, 0.05, 0.86, 0.9, 0.52, 0.6);
  // ซิงก์ฝังใต้ท็อป
  box(m.steel, -0.45, 0.05, 0.68, 0.69, 0.12, 0.52);
  box(m.steel, -0.46, -0.45, 0.68, 0.895, 0.12, 0.52);
  box(m.steel, 0.05, 0.06, 0.68, 0.895, 0.12, 0.52);
  box(m.steel, -0.45, 0.05, 0.68, 0.895, 0.11, 0.12);
  box(m.steel, -0.45, 0.05, 0.68, 0.895, 0.52, 0.53);
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.004, 24), m.kick, -0.2, 0.692, 0.32, false);

  // ── ก๊อกคอสูง (ทรงใกล้เคียง ไม่ใช่รุ่นจริง) ──
  add(new THREE.CylinderGeometry(0.024, 0.027, 0.05, 24), m.chrome, -0.2, 0.925, 0.07);
  const neck = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.2, 0.94, 0.07),
    new THREE.Vector3(-0.2, 1.2, 0.07),
    new THREE.Vector3(-0.2, 1.31, 0.12),
    new THREE.Vector3(-0.2, 1.31, 0.22),
    new THREE.Vector3(-0.2, 1.22, 0.265),
  ]);
  add(new THREE.TubeGeometry(neck, 48, 0.013, 16), m.chrome, 0, 0, 0);
  add(new THREE.CylinderGeometry(0.016, 0.014, 0.05, 20), m.chrome, -0.2, 1.2, 0.268).rotation.x = -0.35;
  const lever = add(new THREE.CylinderGeometry(0.006, 0.008, 0.11, 12), m.chrome, -0.135, 0.975, 0.07);
  lever.rotation.z = -1.05;

  // ── เตาแก้วเซรามิก ──
  box(m.glass, 0.62, 1.18, 0.9, 0.906, 0.06, 0.54, 0.002);
  for (const [x, z, r] of [[0.77, 0.19, 0.075], [1.04, 0.19, 0.09], [0.77, 0.42, 0.09], [1.04, 0.42, 0.075]]) {
    add(new THREE.RingGeometry(r - 0.003, r, 48), m.ring, x, 0.9066, z, false).rotation.x = -Math.PI / 2;
  }

  // ── ผนังกันเปื้อน ──
  box(m.splash, -1.2, 1.8, 0.9, 1.45, 0, 0.008);

  // ── ตู้แขวน หน้าบานยื่นลงใต้ตู้ 2 ซม. ใช้เป็นที่จับ ──
  box(m.door, -1.2, 1.8, 1.45, 2.15, 0, 0.32);
  box(m.kick, -1.19, 1.79, 1.46, 2.14, 0.32, 0.321);
  for (let i = 0; i < 5; i++) front(-1.2 + i * 0.6, -0.6 + i * 0.6, 1.43, 2.15, 0.32);
  box(m.steel, 0.63, 1.17, 1.435, 1.45, 0.03, 0.3); // ฮูดฝังใต้ตู้เหนือเตา
  // ไฟเส้นใต้ตู้แขวน (เว้นช่วงฮูด)
  box(m.led, -1.18, 0.58, 1.444, 1.45, 0.24, 0.26).castShadow = false;
  box(m.led, 1.22, 1.78, 1.444, 1.45, 0.24, 0.26).castShadow = false;

  return { materials: m, textures: [wood, planks], wood };
}

const RoomScene = forwardRef<RoomHandle, Props>(function RoomScene({ door, light, onReady, onError }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ setDoor: (d: DoorId) => void; setLight: (l: LightId) => void; orbit: (dAz: number, dZoom: number) => void; reset: () => void } | null>(null);

  useImperativeHandle(ref, () => ({
    zoom: (step) => api.current?.orbit(0, step),
    rotate: (step) => api.current?.orbit(step, 0),
    reset: () => api.current?.reset(),
  }));

  useEffect(() => {
    const el = host.current!;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      onError();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(LIGHTS[light].bg);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const { materials, textures, wood } = buildKitchen(scene);

    const sun = new THREE.DirectionalLight();
    sun.position.set(3.2, 4.2, 3.6);
    sun.target.position.copy(TARGET);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    Object.assign(sun.shadow.camera, { left: -3.4, right: 3.4, top: 3.4, bottom: -3.4, near: 0.5, far: 12 });
    const hemi = new THREE.HemisphereLight('#ffffff', '#b9ad9c');
    const leds = [-0.9, -0.2, 0.45, 1.5].map((x) => {
      // ไฟส่องลงอย่างเดียว ไม่ให้แสงย้อนขึ้นไปโดนขอบหน้าบานตู้แขวน
      const p = new THREE.SpotLight('#ffc98f', 0, 2.2, 1.15, 0.6, 2);
      p.position.set(x, 1.43, 0.26);
      p.target.position.set(x, 0.9, 0.3);
      return p;
    });
    const ceil = new THREE.PointLight('#ffbf80', 0, 9, 2);
    ceil.position.set(0, 2.55, 1.7);
    ceil.castShadow = true;
    ceil.shadow.mapSize.set(1024, 1024);
    ceil.shadow.bias = -0.002;
    scene.add(sun, sun.target, hemi, ceil, ...leds, ...leds.map((p) => p.target));

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(TARGET);
    controls.enablePan = false;
    controls.enableDamping = !still;
    controls.dampingFactor = 0.08;
    controls.minAzimuthAngle = -HALF_TURN;
    controls.maxAzimuthAngle = HALF_TURN;
    controls.minPolarAngle = 0.95;
    controls.maxPolarAngle = 1.52;
    controls.minDistance = DISTANCE.min;
    controls.maxDistance = DISTANCE.max;

    let dirty = true;
    const place = (azimuth: number, polar: number, distance: number) => {
      camera.position.setFromSphericalCoords(distance, polar, azimuth).add(TARGET);
      controls.update();
      dirty = true;
    };
    place(HOME.azimuth, HOME.polar, HOME.distance);
    controls.addEventListener('change', () => (dirty = true));

    // ── สถานะแสง: ไล่จากค่าตอนกดไปค่าเป้าหมายใน 0.6 วินาที ──
    type Mix = { sun: number; hemi: number; env: number; led: number; ceil: number; exposure: number; sunColor: THREE.Color; bg: THREE.Color };
    const mix = (l: LightId): Mix => ({ ...LIGHTS[l], sunColor: new THREE.Color(LIGHTS[l].sunColor), bg: new THREE.Color(LIGHTS[l].bg) });
    const now = mix(light);
    let from = mix(light);
    let goal = mix(light);
    let fade = 1; // 0..1
    const applyLight = () => {
      sun.intensity = now.sun;
      sun.color.copy(now.sunColor);
      hemi.intensity = now.hemi;
      scene.environmentIntensity = now.env;
      leds.forEach((p) => (p.intensity = now.led));
      ceil.intensity = now.ceil;
      materials.led.color.setScalar(Math.min(1, now.led / 6)).multiply(new THREE.Color('#ffd9ae'));
      (scene.background as THREE.Color).copy(now.bg);
      renderer.toneMappingExposure = now.exposure;
    };
    applyLight();

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      // จอแนวตั้ง: ขยายมุมกล้องแนวตั้งให้ความกว้างที่เห็นเท่าเดิม ครัวจะไม่ตกขอบ
      camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(0.4245 / camera.aspect)), 38, 70);
      camera.updateProjectionMatrix();
      dirty = true;
    };
    const watcher = new ResizeObserver(resize);
    watcher.observe(el);
    resize();

    const stats = { renderMs: 0, frames: 0 };
    (window as unknown as { __room?: unknown }).__room = { stats, info: renderer.info };

    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (fade < 1) {
        fade = still ? 1 : Math.min(1, fade + dt / 0.6);
        const k = 1 - Math.pow(1 - fade, 3);
        for (const key of ['sun', 'hemi', 'env', 'led', 'ceil', 'exposure'] as const) now[key] = from[key] + (goal[key] - from[key]) * k;
        now.sunColor.lerpColors(from.sunColor, goal.sunColor, k);
        now.bg.lerpColors(from.bg, goal.bg, k);
        applyLight();
        dirty = true;
      }
      controls.update();
      if (!dirty) return;
      dirty = false;
      const start = performance.now();
      renderer.render(scene, camera);
      stats.renderMs = performance.now() - start;
      stats.frames++;
    };
    raf = requestAnimationFrame(tick);

    api.current = {
      setDoor: (d) => {
        materials.door.map = d === 'oak' ? wood : null;
        materials.door.color.set(d === 'oak' ? '#ffffff' : '#eeece8');
        materials.door.roughness = d === 'oak' ? 0.55 : 0.62;
        materials.door.needsUpdate = true;
        dirty = true;
      },
      setLight: (l) => {
        from = { ...now, sunColor: now.sunColor.clone(), bg: now.bg.clone() };
        goal = mix(l);
        fade = 0;
      },
      orbit: (dAz, dZoom) => {
        const s = new THREE.Spherical().setFromVector3(camera.position.clone().sub(TARGET));
        place(
          THREE.MathUtils.clamp(s.theta + dAz, -HALF_TURN, HALF_TURN),
          s.phi,
          THREE.MathUtils.clamp(s.radius * (1 - dZoom), DISTANCE.min, DISTANCE.max),
        );
      },
      reset: () => place(HOME.azimuth, HOME.polar, HOME.distance),
    };
    api.current.setDoor(door);
    onReady();

    return () => {
      cancelAnimationFrame(raf);
      watcher.disconnect();
      controls.dispose();
      scene.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      Object.values(materials).forEach((mat) => mat.dispose());
      textures.forEach((t) => t.dispose());
      scene.environment?.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      api.current = null;
    };
    // สร้างฉากครั้งเดียว · door กับ light เปลี่ยนผ่าน effect ด้านล่าง
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => api.current?.setDoor(door), [door]);
  useEffect(() => api.current?.setLight(light), [light]);

  const onKey = (e: React.KeyboardEvent) => {
    const move: Record<string, [number, number]> = {
      ArrowLeft: [-0.15, 0],
      ArrowRight: [0.15, 0],
      '+': [0, 0.12],
      '=': [0, 0.12],
      '-': [0, -0.12],
    };
    const step = move[e.key];
    if (!step) return;
    e.preventDefault();
    api.current?.orbit(step[0], step[1]);
  };

  return (
    <div
      ref={host}
      role="application"
      tabIndex={0}
      aria-label="ห้องครัวจำลอง 3 มิติ กดลูกศรซ้ายขวาเพื่อหมุน กดบวกลบเพื่อซูม"
      onKeyDown={onKey}
      data-lenis-prevent
      className="absolute inset-0 cursor-grab touch-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink active:cursor-grabbing [&>canvas]:block"
    />
  );
});

export default RoomScene;
