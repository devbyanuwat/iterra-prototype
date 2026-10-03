'use client';

// ฉาก 3D ของหน้า /room/: ห้องโถงเดียว มีครัว I, L, U ตั้งเรียงตามผนังหลัง
// เปลี่ยนผัง = กล้องเลื่อนไปหาครัวนั้น · วัสดุและแสงใช้ร่วมกันทั้งห้อง
// วาดใหม่เฉพาะตอนมีอะไรเปลี่ยน (หมุน ซูม กล้องเลื่อน แสงไล่) ไม่วาดวนทุกเฟรม
// three.js อยู่เฉพาะในไฟล์กลุ่ม components/room/ และโหลดแบบ dynamic จาก RoomContent

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { FAUCET_LOOKS, HALL, LAYOUTS, LIGHTS, ORBIT, PARTS, type Layout, type LayoutId, type LightId, type Look, type Picks } from '@/lib/room';
import { buildKitchen, ledPositions, makeMaterials } from './kitchen';
import { applyLook, disposeTextures } from './textures';

export type RoomHandle = { zoom: (step: number) => void; rotate: (step: number) => void; reset: () => void };
type Props = { layout: LayoutId; picks: Picks; light: LightId; label: string; onReady: () => void; onError: () => void };
type Api = { setPicks: (p: Picks) => void; setLight: (l: LightId) => void; goTo: (l: LayoutId, jump?: boolean) => void; orbit: (dAzimuth: number, dZoom: number) => void };

const FLIGHT = 1.2; // วินาทีที่กล้องใช้เลื่อนไปครัวอื่น
const FADE = 0.6; // วินาทีที่แสงใช้ไล่ไปโทนใหม่
const layoutOf = (id: LayoutId) => LAYOUTS.find((l) => l.id === id)!;
const presetOf = (id: LightId) => LIGHTS.find((l) => l.id === id)!;
// look ของตัวเลือกที่เลือกอยู่ · 'top' (ผนังกันเปื้อนแบบวัสดุเดียวกับท็อป) = ใช้ look ของท็อปที่เลือก
const lookOf = (part: keyof typeof PARTS, picks: Picks): Look => {
  const look = PARTS[part].find((o) => o.id === picks[part])!.look;
  return look === 'top' ? lookOf('top', picks) : look;
};

const RoomScene = forwardRef<RoomHandle, Props>(function RoomScene({ layout, picks, light, label, onReady, onError }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const first = useRef(true);

  useImperativeHandle(ref, () => ({
    zoom: (step) => api.current?.orbit(0, step),
    rotate: (step) => api.current?.orbit(step, 0),
    reset: () => api.current?.goTo(layout, true),
  }));

  useEffect(() => {
    const el = host.current!;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // เช็ก WebGL เองก่อน: ถ้าปล่อยให้ three.js ลองแล้วพลาด มันจะ console.error ซึ่งทำให้ด่าน check:overflow ตก
    if (!document.createElement('canvas').getContext('webgl2')) {
      onError();
      return;
    }
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
    const background = new THREE.Color();
    scene.background = background;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // ── ห้องโถง: ผนังหน้าเดียว มองจากด้านนอกจะทะลุ กล้องจึงอยู่นอกห้องได้ ──
    const m = makeMaterials();
    const plane = (w: number, h: number, mat: THREE.Material) => {
      const geo = new THREE.PlaneGeometry(w, h);
      const uv = geo.attributes.uv; // UV หน่วยเมตร ให้ลายพื้นไม่ยืด
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    };
    const floor = plane(HALL.width, HALL.depth, m.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, HALL.depth / 2);
    plane(HALL.width, HALL.height, m.wall).position.set(0, HALL.height / 2, 0);
    for (const side of [-1, 1]) {
      const end = plane(HALL.depth, HALL.height, m.wall);
      end.position.set((side * HALL.width) / 2, HALL.height / 2, HALL.depth / 2);
      end.rotation.y = (-side * Math.PI) / 2;
    }
    LAYOUTS.forEach((l) => scene.add(buildKitchen(l, m)));

    // ── ไฟ: แดดดวงเดียวคลุมทั้งห้อง · ไฟใต้ตู้ 4 ดวง + ไฟเพดาน 1 ดวง ย้ายตามครัวที่กำลังดู ──
    // ติดพร้อมกันไม่เกิน 6 ดวง: hemi + ไฟใต้ตู้ 4 + แดดหรือไฟเพดานอย่างใดอย่างหนึ่ง (lib/room.ts กำหนด, check:room ตรวจ)
    const small = window.innerWidth < 768;
    const sun = new THREE.DirectionalLight();
    sun.position.set(10.5, 11.5, 10.7); // แดดเฉียงจากหน้าขวา · อยู่ไกลพอให้เงาคลุมทั้งห้อง
    sun.target.position.set(0, 1, 0.5);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(small ? 2048 : 4096);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 11, bottom: -11, near: 1, far: 40 }); // แดดเฉียง 45 องศา ห้องยาว 27 ม. จึงต้องกว้างทั้งสองแกน
    const hemi = new THREE.HemisphereLight('#ffffff', '#b9ad9c');
    const leds = [0, 1, 2, 3].map(() => {
      const spot = new THREE.SpotLight('#ffffff', 0, 2.2, 1.15, 0.6, 2); // ส่องลงอย่างเดียว ไม่ย้อนขึ้นโดนขอบหน้าบาน
      spot.position.set(0, 1.43, 0.26);
      spot.target.position.set(0, 0.9, 0.3);
      scene.add(spot, spot.target);
      return spot;
    });
    const ceil = new THREE.PointLight('#ffffff', 0, 9, 2);
    ceil.position.set(0, 2.55, 1.7);
    ceil.castShadow = true;
    ceil.shadow.mapSize.set(1024, 1024);
    ceil.shadow.bias = -0.002;
    scene.add(sun, sun.target, hemi, ceil);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = !still;
    controls.dampingFactor = 0.08;
    controls.minAzimuthAngle = -ORBIT.azimuth;
    controls.maxAzimuthAngle = ORBIT.azimuth;
    controls.minPolarAngle = ORBIT.polarMin;
    controls.maxPolarAngle = ORBIT.polarMax;
    controls.minDistance = ORBIT.zoomMin;
    controls.maxDistance = ORBIT.zoomMax;

    let dirty = true;
    controls.addEventListener('change', () => (dirty = true));
    // วางกล้องจากมุมรอบจุดมอง (theta = ซ้ายขวา, phi = ก้มเงย, radius = ระยะ)
    const place = (target: THREE.Vector3, s: THREE.Spherical) => {
      controls.target.copy(target);
      camera.position.setFromSpherical(s).add(target);
      camera.lookAt(target);
      dirty = true;
    };

    // ── กล้องเลื่อนไปครัวอื่น ──
    const flight = { t: 1, fromTarget: new THREE.Vector3(), toTarget: new THREE.Vector3(), from: new THREE.Spherical(), to: new THREE.Spherical() };
    let ledOn = 4; // จำนวนไฟใต้ตู้ที่ใช้กับครัวปัจจุบัน
    // ย้ายไฟใต้ตู้และไฟเพดานไปครัวที่จะดู · ตอนกล้องเลื่อน ย้ายที่ครึ่งทาง ครัวเดิมจึงไม่มืดทันทีที่กด
    let lightsFor: Layout | null = null;
    const moveLights = (l: Layout) => {
      const xs = ledPositions(l);
      ledOn = xs.length;
      leds.forEach((spot, i) => {
        spot.position.x = spot.target.position.x = xs[i] ?? l.x;
      });
      ceil.position.x = l.x;
      lightsFor = null;
      applyLight();
    };
    const goTo = (id: LayoutId, jump = false) => {
      const l = layoutOf(id);
      if (jump || still) moveLights(l);
      else lightsFor = l;
      flight.toTarget.set(l.x, l.home.target[0], l.home.target[1]);
      flight.to.set(l.home.distance, l.home.polar, l.home.azimuth);
      if (jump || still) {
        flight.t = 1;
        controls.enabled = true;
        place(flight.toTarget, flight.to);
        controls.update();
        return;
      }
      flight.fromTarget.copy(controls.target);
      flight.from.setFromVector3(camera.position.clone().sub(controls.target));
      flight.t = 0;
      controls.enabled = false;
    };

    // ── แสง: ไล่จากค่าตอนกดไปค่าเป้าหมาย ──
    type Mix = { sun: number; hemi: number; env: number; led: number; ceil: number; exposure: number; sunColor: THREE.Color; ledColor: THREE.Color; ceilColor: THREE.Color; bg: THREE.Color };
    const NUMBERS = ['sun', 'hemi', 'env', 'led', 'ceil', 'exposure'] as const;
    const COLORS = ['sunColor', 'ledColor', 'ceilColor', 'bg'] as const;
    const mix = (id: LightId): Mix => {
      const p = presetOf(id);
      return { ...p, sunColor: new THREE.Color(p.sunColor), ledColor: new THREE.Color(p.ledColor), ceilColor: new THREE.Color(p.ceilColor), bg: new THREE.Color(p.bg) };
    };
    const copy = (a: Mix): Mix => ({ ...a, sunColor: a.sunColor.clone(), ledColor: a.ledColor.clone(), ceilColor: a.ceilColor.clone(), bg: a.bg.clone() });
    const now = mix(light);
    let from = copy(now);
    let goal = copy(now);
    let fade = 1;
    function applyLight() {
      sun.intensity = now.sun;
      sun.color.copy(now.sunColor);
      hemi.intensity = now.hemi;
      scene.environmentIntensity = now.env;
      leds.forEach((spot, i) => {
        spot.intensity = i < ledOn ? now.led : 0;
        spot.color.copy(now.ledColor);
      });
      ceil.intensity = now.ceil;
      ceil.color.copy(now.ceilColor);
      m.led.color.copy(now.ledColor).multiplyScalar(Math.min(1, now.led / 6));
      background.copy(now.bg);
      renderer.toneMappingExposure = now.exposure;
      dirty = true;
    }

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      if (!w || !h) return;
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

    // ตัวเลขไว้วัดผล (ดูใน console: window.__room)
    const stats = { renderMs: 0, frames: 0 };
    (window as unknown as { __room?: unknown }).__room = { stats, info: renderer.info };

    const target = new THREE.Vector3();
    const spherical = new THREE.Spherical();
    let raf = 0;
    let last = performance.now();
    const tick = (time: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (time - last) / 1000);
      last = time;
      if (fade < 1) {
        fade = still ? 1 : Math.min(1, fade + dt / FADE);
        const k = 1 - Math.pow(1 - fade, 3);
        for (const key of NUMBERS) now[key] = from[key] + (goal[key] - from[key]) * k;
        for (const key of COLORS) now[key].lerpColors(from[key], goal[key], k);
        applyLight();
      }
      if (flight.t < 1) {
        flight.t = Math.min(1, flight.t + dt / FLIGHT);
        const k = 1 - Math.pow(1 - flight.t, 3);
        target.lerpVectors(flight.fromTarget, flight.toTarget, k);
        spherical.set(
          THREE.MathUtils.lerp(flight.from.radius, flight.to.radius, k),
          THREE.MathUtils.lerp(flight.from.phi, flight.to.phi, k),
          THREE.MathUtils.lerp(flight.from.theta, flight.to.theta, k),
        );
        place(target, spherical);
        if (lightsFor && flight.t >= 0.5) moveLights(lightsFor);
        if (flight.t === 1) controls.enabled = true;
      } else controls.update();
      if (!dirty) return;
      dirty = false;
      const start = performance.now();
      renderer.render(scene, camera);
      stats.renderMs = performance.now() - start;
      stats.frames++;
    };

    api.current = {
      setPicks: (p) => {
        applyLook(m.door, lookOf('doors', p));
        applyLook(m.top, lookOf('top', p));
        applyLook(m.splash, lookOf('splash', p));
        applyLook(m.floor, lookOf('floor', p));
        applyLook(m.faucet, FAUCET_LOOKS[p.faucet]);
        dirty = true;
      },
      setLight: (id) => {
        from = copy(now);
        goal = mix(id);
        fade = 0;
      },
      goTo,
      orbit: (dAzimuth, dZoom) => {
        if (flight.t < 1) return;
        spherical.setFromVector3(camera.position.clone().sub(controls.target));
        spherical.theta = THREE.MathUtils.clamp(spherical.theta + dAzimuth, -ORBIT.azimuth, ORBIT.azimuth);
        spherical.radius = THREE.MathUtils.clamp(spherical.radius * (1 - dZoom), ORBIT.zoomMin, ORBIT.zoomMax);
        place(controls.target.clone(), spherical);
        controls.update();
      },
    };
    api.current.setPicks(picks);
    goTo(layout, true);
    raf = requestAnimationFrame(tick);
    onReady();

    return () => {
      cancelAnimationFrame(raf);
      watcher.disconnect();
      controls.dispose();
      scene.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      Object.values(m).forEach((mat) => mat.dispose());
      disposeTextures();
      sun.dispose();
      ceil.dispose();
      leds.forEach((spot) => spot.dispose());
      scene.environment?.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      delete (window as unknown as { __room?: unknown }).__room;
      api.current = null;
      first.current = true; // dev StrictMode mount ซ้ำ: ให้ effect ของ layout ข้ามรอบแรกอีกครั้ง
    };
    // สร้างฉากครั้งเดียว · layout, picks, light เปลี่ยนผ่าน effect ด้านล่าง
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // effect ของ picks กับ light ทำงานตอน mount ด้วย แต่ค่าเท่ากับที่ฉากเพิ่งตั้ง จึงไม่มีผล · ของ layout ข้ามรอบแรก (first)
  useEffect(() => api.current?.setPicks(picks), [picks]);
  useEffect(() => api.current?.setLight(light), [light]);
  useEffect(() => {
    if (first.current) first.current = false;
    else api.current?.goTo(layout);
  }, [layout]);

  const onKey = (e: React.KeyboardEvent) => {
    const steps: Record<string, [number, number]> = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], '+': [0, 0.12], '=': [0, 0.12], '-': [0, -0.12] };
    const step = steps[e.key];
    if (!step) return;
    e.preventDefault();
    api.current?.orbit(step[0], step[1]);
  };

  return (
    <div
      ref={host}
      role="application"
      tabIndex={0}
      aria-label={label}
      onKeyDown={onKey}
      data-lenis-prevent
      className="absolute inset-0 cursor-grab touch-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink active:cursor-grabbing [&>canvas]:block"
    />
  );
});

export default RoomScene;
