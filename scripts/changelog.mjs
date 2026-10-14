// บันทึกงานที่ทำ แยกว่ารายงานลูกค้าแล้วหรือยัง แล้วสร้างเอกสาร 2 ฉบับจากฐานข้อมูลเดียว
// ฉบับลูกค้า (client.html + client.pdf): ไม่มีวันเวลา ไม่มีรหัส commit ไม่มีงานภายใน
// ฉบับภายใน (internal.html): ทุกงาน พร้อมวันเวลา PR commit และสถานะรายงาน
//
//   node --no-warnings scripts/changelog.mjs pending            งานที่ทำแล้วแต่ยังไม่ได้รายงานลูกค้า
//   node --no-warnings scripts/changelog.mjs add --version v0.5 --kind new --client "..." [--note "..."] [--pr 11] [--commits abc1234] [--done 2026-10-14T10:00:00+07:00]
//   node --no-warnings scripts/changelog.mjs build              สร้าง HTML 2 ฉบับ และ PDF ฉบับลูกค้า ไม่ประทับว่ารายงานแล้ว
//   node --no-warnings scripts/changelog.mjs report             build แล้วประทับ reported_at ให้งานที่ยังไม่ได้รายงาน และบันทึกการส่ง
//   node --no-warnings scripts/changelog.mjs selftest           ตรวจตัวเองบนฐานข้อมูลในหน่วยความจำ
//
// kind: new (เพิ่มใหม่) · improve (ปรับปรุง) · fix (แก้ไข) · internal (งานภายใน ไม่แสดงลูกค้า)
// PDF ใช้ Chrome แบบไม่เปิดหน้าจอ ตั้ง CHROME=/path/to/chrome ถ้าไม่ได้อยู่ที่เดิมของ macOS

import { DatabaseSync } from 'node:sqlite';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const DIR = new URL('../docs/releases/', import.meta.url);
const DB = new URL('changelog.db', DIR).pathname;
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const KINDS = { new: 'เพิ่มใหม่', improve: 'ปรับปรุง', fix: 'แก้ไข', internal: 'งานภายใน' };

export function open(path = DB) {
  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY,
      version TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('new', 'improve', 'fix', 'internal')),
      client_text TEXT NOT NULL,
      internal_note TEXT NOT NULL DEFAULT '',
      pr TEXT NOT NULL DEFAULT '',
      commits TEXT NOT NULL DEFAULT '',
      done_at TEXT NOT NULL,
      client_visible INTEGER NOT NULL CHECK (client_visible IN (0, 1)),
      reported_at TEXT
    );
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY,
      sent_at TEXT NOT NULL,
      versions TEXT NOT NULL,
      entry_count INTEGER NOT NULL,
      file TEXT NOT NULL
    );`);
  return db;
}

export function add(db, e) {
  if (!KINDS[e.kind]) throw new Error(`kind must be one of ${Object.keys(KINDS).join(', ')}`);
  if (!e.version || !e.client) throw new Error('--version and --client are required');
  db.prepare(
    'INSERT INTO entries (version, kind, client_text, internal_note, pr, commits, done_at, client_visible) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(e.version, e.kind, e.client, e.note ?? '', String(e.pr ?? ''), e.commits ?? '', e.done ?? new Date().toISOString(), e.kind === 'internal' ? 0 : 1);
}

const all = (db) => db.prepare('SELECT * FROM entries ORDER BY done_at, id').all();
const pending = (db) => db.prepare('SELECT * FROM entries WHERE client_visible = 1 AND reported_at IS NULL ORDER BY done_at, id').all();

// เรียงเวอร์ชันใหม่สุดก่อน: v0.10 มาหลัง v0.9 ไม่ใช่ก่อน v0.2 · unreleased อยู่บนสุด
const versionKey = (v) => (v === 'unreleased' ? [Infinity] : v.replace(/^v/, '').split('.').map(Number));
const byVersionDesc = (a, b) => {
  const [x, y] = [versionKey(a), versionKey(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (y[i] ?? 0) - (x[i] ?? 0);
  return 0;
};
const groupBy = (rows, key) => rows.reduce((m, r) => m.set(r[key], [...(m.get(r[key]) ?? []), r]), new Map());
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const versionName = (v) => (v === 'unreleased' ? 'ยังไม่ปล่อย' : v);

// สีและตัวอักษรตาม design.md
const CSS = `
  :root { --paper: #faf9f7; --ink: #1c1917; --warm-300: #d6d3cc; --warm-500: #78716c; --stone-600: #57534e; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--ink); font-family: Inter, 'Noto Sans Thai', system-ui, sans-serif; font-weight: 300; line-height: 1.7; -webkit-font-smoothing: antialiased; }
  main { max-width: 960px; margin: 0 auto; padding: 72px 24px 96px; }
  .label { margin: 0 0 14px; font-size: 11px; font-weight: 400; letter-spacing: 0.22em; text-transform: uppercase; color: var(--warm-500); }
  h1 { margin: 0; font-size: 40px; font-weight: 200; letter-spacing: 0.025em; line-height: 1.2; }
  h2 { margin: 0 0 4px; font-size: 26px; font-weight: 200; letter-spacing: 0.025em; }
  h3 { margin: 24px 0 8px; font-size: 14px; font-weight: 400; }
  .intro { max-width: 36rem; margin: 14px 0 0; font-size: 14px; color: var(--stone-600); }
  section { margin-top: 56px; padding-top: 24px; border-top: 1px solid var(--ink); break-inside: avoid-page; }
  ul { margin: 0; padding: 0; list-style: none; }
  li { padding: 10px 0; font-size: 14px; border-bottom: 1px solid var(--warm-300); break-inside: avoid; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { padding: 0 12px 8px 0; text-align: left; font-size: 11px; font-weight: 400; color: var(--stone-600); border-bottom: 1px solid var(--ink); }
  td { padding: 10px 12px 10px 0; vertical-align: top; border-bottom: 1px solid var(--warm-300); }
  code { font-family: ui-monospace, Menlo, monospace; font-size: 11px; }
  .tag { display: inline-block; padding: 2px 8px; border: 1px solid var(--ink); font-size: 11px; font-weight: 400; white-space: nowrap; }
  .tag.done { background: var(--ink); color: var(--paper); }
  .tag.todo { border-style: dashed; border-color: var(--warm-500); color: var(--stone-600); }
  .muted { color: var(--stone-600); }
  footer { margin-top: 64px; padding-top: 16px; border-top: 1px solid var(--warm-300); font-size: 12px; color: var(--stone-600); }
  @media print { main { padding: 0; } section { margin-top: 32px; } }
`;
const page = (title, body) => `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400&family=Noto+Sans+Thai:wght@200;300;400&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>
`;

export function clientHtml(db) {
  const rows = all(db).filter((r) => r.client_visible === 1 && r.version !== 'unreleased');
  const versions = [...groupBy(rows, 'version').entries()].sort(([a], [b]) => byVersionDesc(a, b));
  const sections = versions
    .map(([v, items]) => {
      const kinds = [...groupBy(items, 'kind').entries()].sort(([a], [b]) => Object.keys(KINDS).indexOf(a) - Object.keys(KINDS).indexOf(b));
      return `<section>
  <p class="label">Version</p>
  <h2>${esc(v)}</h2>
${kinds.map(([k, list]) => `  <h3>${KINDS[k]}</h3>\n  <ul>\n${list.map((r) => `    <li>${esc(r.client_text)}</li>`).join('\n')}\n  </ul>`).join('\n')}
</section>`;
    })
    .join('\n');
  return page(
    'บันทึกการอัปเดต เว็บไซต์',
    `<p class="label">Release Notes</p>
<h1>บันทึกการอัปเดต<br>เว็บไซต์</h1>
<p class="intro">สรุปสิ่งที่เพิ่มและปรับปรุงในแต่ละเวอร์ชัน เวอร์ชันล่าสุดอยู่ด้านบน</p>
${sections}`,
  );
}

export function internalHtml(db) {
  const rows = all(db);
  const waiting = pending(db);
  const status = (r) =>
    r.client_visible === 0 ? '<span class="tag">ภายใน</span>' : r.reported_at ? `<span class="tag done">รายงานแล้ว ${esc(r.reported_at.slice(0, 10))}</span>` : '<span class="tag todo">ยังไม่ได้รายงาน</span>';
  const row = (r) =>
    `<tr><td><code>${esc(r.done_at.slice(0, 16).replace('T', ' '))}</code></td><td>${KINDS[r.kind]}</td><td>${esc(r.client_text)}${r.internal_note ? `<br><span class="muted">${esc(r.internal_note)}</span>` : ''}</td><td>${r.pr ? `#${esc(r.pr)}` : ''}</td><td><code>${esc(r.commits)}</code></td><td>${status(r)}</td></tr>`;
  const table = (list) => `<table>
<thead><tr><th>เสร็จเมื่อ</th><th>ชนิด</th><th>งาน</th><th>PR</th><th>commit</th><th>สถานะ</th></tr></thead>
<tbody>
${list.map(row).join('\n')}
</tbody>
</table>`;
  const versions = [...groupBy(rows, 'version').entries()].sort(([a], [b]) => byVersionDesc(a, b));
  const reports = db.prepare('SELECT * FROM reports ORDER BY sent_at').all();
  return page(
    'บันทึกการอัปเดต ฉบับภายใน',
    `<p class="label">Changelog · Internal</p>
<h1>บันทึกการอัปเดต<br>ฉบับภายใน</h1>
<p class="intro">สร้างจาก <code>docs/releases/changelog.db</code> ห้ามส่งฉบับนี้ให้ลูกค้า</p>
<section>
  <p class="label">ยังไม่ได้รายงานลูกค้า</p>
  <h2>${waiting.length} งาน</h2>
  ${waiting.length ? table(waiting) : '<p class="muted">รายงานครบแล้ว</p>'}
</section>
${versions.map(([v, list]) => `<section>\n  <p class="label">Version</p>\n  <h2>${esc(versionName(v))}</h2>\n  ${table(list)}\n</section>`).join('\n')}
<section>
  <p class="label">ประวัติการส่งรายงาน</p>
  <h2>${reports.length} ครั้ง</h2>
  ${reports.length ? `<ul>${reports.map((r) => `<li><code>${esc(r.sent_at)}</code> · ${esc(r.versions)} · ${r.entry_count} งาน · <code>${esc(r.file)}</code></li>`).join('')}</ul>` : '<p class="muted">ยังไม่เคยส่ง</p>'}
</section>`,
  );
}

function build(db) {
  writeFileSync(new URL('client.html', DIR), clientHtml(db));
  writeFileSync(new URL('internal.html', DIR), internalHtml(db));
  const pdf = new URL('client.pdf', DIR).pathname;
  execFileSync(CHROME, ['--headless', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${pdf}`, new URL('client.html', DIR).href], { stdio: 'ignore' });
  return pdf;
}

function report(db) {
  const list = pending(db);
  if (!list.length) return console.log('ไม่มีงานที่ยังไม่ได้รายงาน');
  const now = new Date().toISOString();
  db.prepare('UPDATE entries SET reported_at = ? WHERE client_visible = 1 AND reported_at IS NULL').run(now);
  const versions = [...new Set(list.map((r) => r.version))].join(', ');
  db.prepare('INSERT INTO reports (sent_at, versions, entry_count, file) VALUES (?, ?, ?, ?)').run(now, versions, list.length, 'docs/releases/client.pdf');
  build(db);
  console.log(`ประทับรายงานแล้ว ${list.length} งาน (${versions})`);
}

function selftest() {
  const db = open(':memory:');
  add(db, { version: 'v0.1', kind: 'new', client: 'ช่องค้นหา', commits: 'aaa1111', done: '2026-10-10T13:29:00+07:00' });
  add(db, { version: 'v0.1', kind: 'internal', client: 'กติกา AI', done: '2026-10-12T18:08:00+07:00' });
  add(db, { version: 'v0.10', kind: 'fix', client: 'แก้หน้าเลื่อน', done: '2026-10-13T09:00:00+07:00' });
  assert.throws(() => add(db, { version: 'v0.1', kind: 'oops', client: 'x' }));
  const html = clientHtml(db);
  assert.ok(html.includes('ช่องค้นหา') && !html.includes('กติกา AI'), 'internal work must not reach the client');
  assert.ok(!html.includes('aaa1111') && !html.includes('2026-10-10'), 'no commits or dates for the client');
  assert.ok(html.indexOf('v0.10') < html.indexOf('v0.1<'), 'v0.10 is newer than v0.1');
  assert.equal(pending(db).length, 2);
  db.prepare('UPDATE entries SET reported_at = ? WHERE client_visible = 1 AND reported_at IS NULL').run('2026-10-14T00:00:00Z');
  assert.equal(pending(db).length, 0);
  assert.equal(all(db).find((r) => r.kind === 'internal').reported_at, null, 'internal work is never stamped');
  assert.ok(internalHtml(db).includes('aaa1111'));
  console.log('ผ่าน: changelog selftest');
}

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const cmd = args[0];
if (cmd === 'selftest') selftest();
else if (cmd === 'add') add(open(), { version: flag('version'), kind: flag('kind'), client: flag('client'), note: flag('note'), pr: flag('pr'), commits: flag('commits'), done: flag('done') });
else if (cmd === 'pending') for (const r of pending(open())) console.log(`${r.version}\t${KINDS[r.kind]}\t${r.client_text}`);
else if (cmd === 'build') console.log(`สร้างแล้ว: ${build(open())}`);
else if (cmd === 'report') report(open());
else if (cmd) {
  console.error(`ไม่รู้จักคำสั่ง ${cmd}`);
  process.exit(1);
}
