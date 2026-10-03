// ด่านเช็กหน้าล้นจอ: ไล่ทุกหน้าที่ลิงก์ถึงได้จากหน้าแรก ที่กว้าง 375/768/1024/1200
// ทั้งแบบมี motion และ prefers-reduced-motion: reduce
// fail เมื่อหน้าเลื่อนข้างได้ หรือมี error ใน console
// ต้องเปิด dev server ไว้ก่อน (ค่าเริ่มต้น http://localhost:4100) และมี Google Chrome · ไม่ใช้ npm dependency
// ใช้: npm run check:overflow [-- http://localhost:4100]
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = (process.argv[2] || 'http://localhost:4100').replace(/\/$/, '');
const WIDTHS = [375, 768, 1024, 1200];
const MOTION = ['no-preference', 'reduce'];
const PORT = 9333;
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), 'overflow-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run'], { stdio: 'ignore' });
const quit = (code) => { chrome.kill(); rmSync(profile, { recursive: true, force: true }); process.exit(code); };

let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  target = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json()).catch(() => null);
}
if (!target) { console.error('เปิด Chrome headless ไม่ได้'); quit(2); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });
let seq = 0;
const pending = new Map();
let onLoad = null;
const errors = [];
let where = '';
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Page.loadEventFired') onLoad?.();
  if (m.method === 'Runtime.exceptionThrown') errors.push(`${where}: ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`);
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(`${where}: ${m.params.entry.text} ${m.params.entry.url || ''}`);
};
const send = (method, params = {}) => new Promise((ok) => { pending.set(++seq, ok); ws.send(JSON.stringify({ id: seq, method, params })); });
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.result?.value;

async function open(url, width, motion) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: motion }] });
  const loaded = new Promise((ok) => { onLoad = ok; });
  await send('Page.navigate', { url });
  await Promise.race([loaded, sleep(15000)]);
  await sleep(500); // ให้ gsap.matchMedia / ScrollTrigger.refresh วางตำแหน่งเสร็จ
}

// คืน null เมื่อไม่ล้น · ถ้าล้นคืนจำนวน px กับ element ขวาสุดที่เกินจอ (ไว้เป็นเบาะแส)
const OVERFLOW = `(() => {
  const d = document.documentElement, over = d.scrollWidth - d.clientWidth;
  if (over <= 0) return null;
  let worst = null, right = d.clientWidth + 1;
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect().right;
    if (r > right) { right = r; worst = el; }
  }
  const cls = worst && typeof worst.className === 'string' ? '.' + worst.className.trim().split(/\\s+/).slice(0, 4).join('.') : '';
  return { over, el: worst ? worst.tagName.toLowerCase() + cls : '?' };
})()`;
const LINKS = `[...new Set([...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href').split(/[?#]/)[0]))]`;

await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');

// เช็กตัวเองก่อน: หน้าที่กว้าง 3000px ต้องโดนจับ ไม่งั้นด่านนี้เชื่อไม่ได้
await open('data:text/html,<div style="width:3000px;height:1px"></div>', 375, 'no-preference');
if (!(await evaluate(OVERFLOW))) { console.error('self-test ไม่ผ่าน: ตัวเช็กจับหน้าล้นไม่ได้'); quit(2); }

const pages = ['/'];
for (let i = 0; i < pages.length; i++) {
  await open(BASE + pages[i], 1200, 'no-preference');
  for (const href of (await evaluate(LINKS)) || []) {
    if (!/\.\w+$/.test(href) && !pages.includes(href)) pages.push(href);
  }
}
errors.length = 0; // error ระหว่างไล่ลิงก์จะโผล่ซ้ำในรอบเช็กอยู่แล้ว

const fails = [];
for (const path of pages) {
  for (const motion of MOTION) {
    for (const width of WIDTHS) {
      where = `${path} @${width} ${motion}`;
      await open(BASE + path, width, motion);
      const hit = await evaluate(OVERFLOW);
      if (hit) fails.push(`${where}: ล้น ${hit.over}px (${hit.el})`);
    }
  }
}

console.log(`เช็ก ${pages.length} หน้า × ${WIDTHS.length} ความกว้าง × ${MOTION.length} โหมด motion`);
for (const line of [...fails, ...new Set(errors)]) console.log('FAIL ' + line);
if (fails.length || errors.length) quit(1);
console.log('ผ่าน: ไม่มีหน้าล้นจอ ไม่มี error ใน console');
quit(0);
