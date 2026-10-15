// สแกนทั้ง repo หา U+0E4E และขีดยาว (en dash) ตามกฎใน AGENTS.md: npm run check:text
// hook เช็กแค่บรรทัดที่เพิ่มใหม่ ของเก่าเลยหลุดได้ ตัวนี้เช็กทุกไฟล์ที่ commit แล้ว
// ข้าม docs/ และ *.md เพราะเอกสารยกตัวอักษรพวกนี้มาเป็นตัวอย่างในกฎเอง
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const BANNED = /[\u0e4e\u2013]/;
const files = execFileSync('git', ['ls-files', '-z', '--', '*.ts', '*.tsx', '*.js', '*.mjs', '*.css', '*.html', '*.json'], {
  encoding: 'utf8',
})
  .split('\0')
  .filter((f) => f && !f.startsWith('docs/'));

const hits = [];
for (const f of files) {
  readFileSync(f, 'utf8')
    .split('\n')
    .forEach((line, i) => BANNED.test(line) && hits.push(`${f}:${i + 1}: ${line.trim().slice(0, 80)}`));
}

if (hits.length) {
  console.error(`เจอ U+0E4E หรือขีดยาว ${hits.length} จุด (ใช้ - หรือคำแทน):\n${hits.join('\n')}`);
  process.exit(1);
}
console.log(`ผ่าน: ข้อความต้องห้าม (${files.length} ไฟล์)`);
