# ITERRA: คู่มือตั้งและดูแลเครื่อง (ฉบับทีม infra)

เอกสารภายในทีม ใช้ส่งต่อให้คนตั้งเครื่อง ไม่ใช่เอกสารส่งมอบลูกค้า
เอกสารส่งมอบลูกค้าเขียนตอนตรวจรับ จากสิ่งที่ตั้งจริง

- อัปเดตล่าสุด: 16 ต.ค. 2569
- repo นี้ยังเป็น public ห้ามใส่รหัสผ่าน IP ชื่อบัญชี หรือชื่อผู้ให้บริการลงไฟล์นี้ ของพวกนั้นเก็บในที่เก็บรหัสของทีม
- ข้อที่เขียนว่า **ยังไม่ได้ตรวจ** คือยังไม่ได้ลองบนเครื่องจริง ทำแล้วให้แก้ไฟล์นี้ตามที่เจอ
- ข้อที่เขียนว่า **รอคำตอบ** คือรอคนคุมโครงการตัดสินใจ ห้ามเดาเอง

แหล่งที่มาของข้อกำหนด:

| เรื่อง | ที่มา |
|---|---|
| สเปกเครื่อง, ระบบปฏิบัติการ, แผงควบคุม, DNS | `docs/quotation/hosting-estimate.html` |
| รายการตรวจด้านความปลอดภัย สำรองข้อมูล เฝ้าระวัง อัปเดต | `docs/pm/standards.md` |
| ตาราง ค่าตั้ง ระยะเก็บข้อมูล | spec `docs/superpowers/specs/2026-10-15-backend-postgres-design.md` (branch `docs/backend-spec`) |
| ค่าที่ proxy ต้องตั้ง | comment ใน `lib/admin.ts`, `app/api/catalog-pdf/route.ts`, `app/uploads/[...path]/route.ts` |

---

## 0. สถานะโค้ด

- โค้ดหลังบ้าน (DB, login, อัปโหลด) อยู่ที่ branch `feat/backend-content` **ยังไม่ merge เข้า `main`**
- `main` ตอนนี้ยังเป็นเว็บต้นแบบที่ไม่มี DB
- เครื่องทดสอบ deploy จาก branch ที่คนคุมโครงการระบุในแต่ละรอบ เครื่องจริง deploy จาก `main` เท่านั้น
- ตรวจ commit ล่าสุดเอาสด ๆ ตอนจะ deploy: `git log --oneline -1 origin/<branch>`

## 1. ภาพรวม

```
ผู้เข้าชม / แอดมิน
   |  HTTPS 443
   v
reverse proxy (ตั้งผ่าน 1Panel) ---- /uploads/ ส่งไฟล์จาก UPLOAD_DIR ตรง
   |  http://127.0.0.1:3000
   v
Next.js (next start)  ---- PostgreSQL 16 (ฟังเฉพาะในเครื่อง)
   |
UPLOAD_DIR (ดิสก์ถาวร นอกโฟลเดอร์โค้ด)

cron บนเครื่อง:  db:prune วันละครั้ง · backup วันละครั้ง
เครื่องเก็บสำรอง (นอก cloud): ดึงไฟล์ backup ทุกคืน · เฝ้าเว็บล่ม
```

มี 2 เครื่อง ตั้งเหมือนกันทุกอย่าง:

- **เครื่องทดสอบ**: ใช้ทดสอบ 3 รอบช่วง 19 ถึง 30 ต.ค.
- **เครื่องจริง**: ตั้ง 2 ถึง 6 พ.ย. แล้วย้ายข้อมูลวันที่ 12 ถึง 13 พ.ย.

## 2. เครื่อง

- สเปกเครื่องจริงตามใบเสนอราคา: CPU 4 Core, RAM 8 GB, ดิสก์ 50 GB, Ubuntu 24
- เครื่องทดสอบใช้สเปกเล็กกว่าได้ แต่ `next build` ต้องใช้ RAM ราว 2 GB ขึ้นไป
  - ตัวเลข 2 GB เป็นค่าประมาณ **ยังไม่ได้วัด**
  - ถ้า RAM ไม่พอ ให้เพิ่ม swap 2 GB
- ตั้งเขตเวลาเครื่องเป็น `Asia/Bangkok` เพื่อให้ cron ทำงานตามเวลาไทย

### 2.1 ความปลอดภัยของเครื่อง (จาก `docs/pm/standards.md`)

- [ ] SSH เข้าด้วยกุญแจเท่านั้น ปิดการ login ด้วยรหัสผ่าน และปิด login ตรงเป็น root
- [ ] 1Panel ใช้รหัสผ่านที่แข็งแรง ไม่ใช้พอร์ตเริ่มต้น และ entrance path ไม่ใช่ค่าเริ่มต้น
- [ ] firewall เปิดแค่ 22, 80, 443 และพอร์ตของ 1Panel
  - ถ้าทำได้ ให้พอร์ต 1Panel เปิดเฉพาะ IP ของทีม
  - **ห้ามเปิดพอร์ต 3000 กับ 5432 ออกนอกเครื่อง**
  - เหตุผลข้อ 3000: ถ้าเปิด คนนอกยิงตรงเข้า Node แล้วปลอม `X-Real-IP` ได้ ระบบกันเดารหัสกับระบบจำกัดการส่งฟอร์มจะใช้ไม่ได้
- [ ] เปิด security update อัตโนมัติ (`unattended-upgrades`)
- [ ] บัญชีที่รันแอปเป็นผู้ใช้ธรรมดา เช่น `iterra` ไม่ใช่ root

## 3. ซอฟต์แวร์

| ตัว | เวอร์ชัน | หมายเหตุ |
|---|---|---|
| Node.js | 22 LTS (ต่ำสุด 20.9 ตามที่ Next 16.3.8 กำหนด) | ใช้ `npm` ไม่ใช่ yarn/pnpm |
| PostgreSQL | 16 | ฟังเฉพาะ localhost |
| reverse proxy | ตัวที่มากับ 1Panel | ดูหัวข้อ 6 |

**วิธีรัน Node (เลือกหนึ่งทาง แล้วจดลงไฟล์นี้)**

1. **systemd บนเครื่องตรง (แนะนำ)**: path ของ `UPLOAD_DIR` ตรงไปตรงมา และ cron เรียก `npm run` ได้เลย ตัวอย่าง unit อยู่หัวข้อ 3.1
2. **Node runtime ของ 1Panel**: ต้อง mount `UPLOAD_DIR` และไฟล์ `.env` เข้า container เอง และ cron ต้องสั่งผ่าน container
   - **ยังไม่ได้ตรวจ** ว่าวิธีนี้ทำได้ครบ

ไม่ว่าจะเลือกทางไหน ต้องได้ครบ 4 อย่าง:

- ฟังที่ `127.0.0.1:3000`
- ล่มแล้วขึ้นใหม่เอง
- อ่านค่าตั้งจาก `.env`
- เครื่อง reboot แล้วขึ้นเอง

### 3.1 ตัวอย่าง systemd unit

```ini
# /etc/systemd/system/iterra.service
[Unit]
Description=ITERRA web
After=network.target postgresql.service

[Service]
User=iterra
WorkingDirectory=/srv/iterra/app
Environment=NODE_ENV=production
EnvironmentFile=/srv/iterra/app/.env
ExecStart=/usr/bin/npm run start -- -H 127.0.0.1 -p 3000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

ข้อควรระวังเรื่อง `EnvironmentFile` ของ systemd:

- อ่านได้เฉพาะบรรทัดแบบ `KEY=value`
- ข้ามบรรทัดที่ขึ้นต้นด้วย `#`
- ห้ามมีช่องว่างรอบ `=`

ไฟล์ `.env.example` ใน repo เขียนตามรูปแบบนี้อยู่แล้ว

## 4. ฐานข้อมูล

```sql
-- รันเป็น postgres superuser · ตั้งรหัสจริงจากที่เก็บรหัสของทีม
create role iterra login password '...';
create database iterra owner iterra;
```

- `DATABASE_URL` ใช้รูปแบบ URL ของ PostgreSQL: ผู้ใช้ `iterra` รหัสจากที่เก็บรหัสของทีม host `127.0.0.1` port `5432` ชื่อ DB `iterra` (คั่นผู้ใช้กับรหัสด้วย `:` และใส่ `@` หน้า host)
- ชื่อ DB บน server **ห้ามลงท้ายด้วย `_test`**
  - เหตุผล: `npm run check:db` ล้าง schema ทั้งหมด และยอมรันกับ DB ที่ชื่อลงท้าย `_test` เท่านั้น
  - **ห้ามรัน `check:db` บน server เด็ดขาด**
- migration อยู่ใน `db/migrations/*.sql` และรันด้วย `npm run db:migrate`
  - รันได้ทางเดียว ย้อนกลับไม่ได้ ถ้าไฟล์ไหนพัง ไฟล์นั้นถอยกลับทั้งไฟล์แล้วหยุด
  - ก่อน migrate ทุกครั้งต้อง backup ก่อน (หัวข้อ 9)

## 5. ค่าตั้ง `.env`

วาง `.env` ไว้ที่ `/srv/iterra/app/.env` ตั้งสิทธิ์ `600` ให้เจ้าของเป็นผู้ใช้ `iterra` **ห้าม commit**

| ค่า | ใช้ทำอะไร | ค่าบน server |
|---|---|---|
| `DATABASE_URL` | ต่อ DB | ตามหัวข้อ 4 |
| `UPLOAD_DIR` | ที่เก็บรูปและ PDF ที่อัปโหลด | path เต็ม นอกโฟลเดอร์โค้ด เช่น `/srv/iterra/uploads` ผู้ใช้ `iterra` ต้องเขียนได้ |
| `IP_SALT` | ผสมก่อน hash IP | สุ่มใหม่สำหรับแต่ละเครื่อง เช่น `openssl rand -hex 32` ถ้าไม่ตั้ง แอปจะ error ตอน production |
| `SESSION_DAYS` | อายุ session ของแอดมิน (วัน) | `14` |
| `SESSION_IDLE_MIN` | ไม่ได้ใช้งานกี่นาทีแล้วต้อง login ใหม่ | `120` |
| `NODE_ENV` | ให้ cookie ส่งเฉพาะทาง HTTPS (`secure`) | `production` (ตั้งใน unit แล้ว) |
| `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` | ใช้ตอนสร้างหรือรีเซ็ตแอดมินเท่านั้น | **ห้ามเก็บไว้ใน `.env` ของ server** ใส่นำหน้าคำสั่งครั้งเดียว (หัวข้อ 11) |
| `TEST_DATABASE_URL` | ใช้กับ `check:db` | **ห้ามตั้งบน server** |
| `SMTP_URL`, `INQUIRY_TO` | ส่งอีเมลแจ้งเมื่อมีคนส่งฟอร์มติดต่อ | ยังไม่ได้ทำในโค้ด ยังไม่ต้องตั้ง |

## 6. Reverse proxy และ HTTPS

ค่าที่โค้ดต้องการจากตัว proxy:

| ค่า | เหตุผล |
|---|---|
| `proxy_set_header X-Real-IP $remote_addr;` | `lib/admin.ts` ใช้ IP นี้นับการเดารหัสและจำกัดการส่งฟอร์มติดต่อต่อ IP |
| `client_max_body_size 31m;` | ไฟล์แคตตาล็อก PDF รับได้ไม่เกิน 30 MB |
| `location /uploads/` ส่งไฟล์จาก `UPLOAD_DIR` ตรง | ลดงานของ Node ถ้าไม่ตั้ง แอปก็ยังส่งไฟล์เองได้ |
| HTTPS พร้อม redirect จาก 80 ไป 443 | cookie ของแอดมินตั้งแบบ `secure` ถ้าไม่มี HTTPS จะ login ไม่ได้ |

ตัวอย่าง (รูปแบบ nginx ใน 1Panel ใส่ใน config ของเว็บ **ยังไม่ได้ตรวจ** ว่าต้องวางตรงไหนของ 1Panel):

```nginx
client_max_body_size 31m;

location /uploads/ {
    alias /srv/iterra/uploads/;
    add_header X-Content-Type-Options nosniff;
    expires 1y;
    access_log off;
}

location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

ถ้าวาง `alias /uploads/` ต้องเช็กให้ผู้ใช้ที่รัน proxy อ่านโฟลเดอร์ `UPLOAD_DIR` ได้

### 6.1 DNS บน Cloudflare

ใบเสนอราคาระบุว่า DNS ใช้ Cloudflare ส่วนจะเปิดโหมด proxy (เมฆสีส้ม) หรือไม่ **รอคำตอบ**

- **DNS only (เมฆสีเทา)**: ใช้ค่าตามด้านบนได้เลย
- **proxied (เมฆสีส้ม)**: `$remote_addr` จะกลายเป็น IP ของ Cloudflare แปลว่าผู้ใช้ทุกคนจะใช้ IP ร่วมกัน ระบบล็อกตอนรหัสผิดจะล็อกทุกคนพร้อมกัน ต้องตั้งเพิ่ม:

  ```nginx
  # ใส่ช่วง IP ของ Cloudflare ทุกช่วง (ดูรายการล่าสุดที่ https://www.cloudflare.com/ips/)
  set_real_ip_from 173.245.48.0/20;   # ตัวอย่าง 1 ช่วง ต้องใส่ให้ครบ
  real_ip_header CF-Connecting-IP;
  ```

  - ตั้ง SSL/TLS ของ Cloudflare เป็น Full (strict)
  - firewall ควรรับ 443 เฉพาะจาก IP ของ Cloudflare
  - ขนาดไฟล์อัปโหลดต่อ request ที่ Cloudflare รับได้ต้องไม่ต่ำกว่า 31 MB **ยังไม่ได้ตรวจ** ว่าเพดานของแพ็กเกจที่ใช้คือเท่าไร

## 7. Deploy ครั้งแรก

```bash
# ผู้ใช้ iterra
git clone <repo> /srv/iterra/app
cd /srv/iterra/app
git checkout <branch หรือ commit ที่คนคุมโครงการระบุ>
npm ci
cp .env.example .env && chmod 600 .env   # แล้วแก้ค่าตามหัวข้อ 5
npm run db:migrate
npm run db:seed                          # ครั้งเดียว กับ DB ที่ยังว่าง รันซ้ำไม่ได้
npm run build
sudo systemctl enable --now iterra
```

จากนั้นสร้างแอดมินคนแรกตามหัวข้อ 11

**ต้องแก้โค้ดก่อนขึ้นเครื่องจริง** งานนี้ทีม dev ทำ ไม่ใช่ infra:

- `lib/site.ts` ยังเป็นค่าตัวอย่าง: `SITE_URL` (มีผลกับ sitemap, robots, OG) และข้อมูลติดต่อ (`CONTACT`)
- ตัวเก็บสถิติใน `components/CookieConsent.tsx` ยังเป็นตัวที่ใช้ได้เฉพาะ Vercel **รอคำตอบ** ว่าจะใช้อะไรแทน

## 8. Deploy รอบถัดไป

```bash
cd /srv/iterra/app
/srv/iterra/bin/backup.sh                # backup ก่อนทุกครั้ง (หัวข้อ 9)
git fetch && git checkout <commit ที่ระบุ>
npm ci
npm run build
npm run db:migrate
sudo systemctl restart iterra
```

- เว็บหยุดไม่กี่วินาทีตอน restart
- ทุกรอบ deploy ให้จด commit ที่ขึ้นไว้ในรายงานของรอบนั้น (checklist ใช้เป็นหลักฐาน)
- **ถอยกลับ**: checkout commit เดิม แล้ว `npm ci && npm run build && sudo systemctl restart iterra`
  - ถ้ารอบนั้นมี migration ใหม่ โค้ดเก่าอาจใช้กับ schema ใหม่ไม่ได้ ให้กู้ DB จาก backup ที่ทำก่อน deploy (หัวข้อ 9.3)

## 9. สำรองข้อมูล

ข้อกำหนด (standards + spec):

- สำรอง DB และ `UPLOAD_DIR` ทุกวัน
- เก็บย้อนหลัง 14 วัน
- มีสำเนาอยู่นอกเครื่อง
- ทดสอบกู้คืนสำเร็จอย่างน้อย 1 ครั้งก่อนตรวจรับ (14 พ.ย.)

backup ที่ระบบ cloud ทำให้อัตโนมัติ (ถ้ามี) ใช้เป็นชั้นเสริมได้ แต่ใช้แทนข้อนี้ไม่ได้

### 9.1 บนเครื่อง: ทำไฟล์สำรองทุกคืน

ไฟล์สำรองต้องเข้ารหัส เพราะใน DB มีชื่อ อีเมล และข้อความจากฟอร์มติดต่อ

- เข้ารหัสด้วย public key ของคนที่ถือกุญแจ
- server เก็บแค่ public key ถอดรหัสบน server ไม่ได้
- ใครถือกุญแจถอดรหัส **รอคำตอบ**

```bash
#!/bin/sh
# /srv/iterra/bin/backup.sh · รันเป็นผู้ใช้ iterra
set -eu
set -a; . /srv/iterra/app/.env; set +a
OUT=/srv/iterra/backups
STAMP=$(date +%Y-%m-%d_%H%M)
KEY=<fingerprint ของ public key ผู้ถือกุญแจ>
mkdir -p "$OUT"
pg_dump --format=custom --dbname="$DATABASE_URL" \
  | gpg --batch --yes --encrypt --recipient "$KEY" --output "$OUT/db_$STAMP.dump.gpg"
tar -C "$(dirname "$UPLOAD_DIR")" -czf - "$(basename "$UPLOAD_DIR")" \
  | gpg --batch --yes --encrypt --recipient "$KEY" --output "$OUT/uploads_$STAMP.tar.gz.gpg"
find "$OUT" -name '*.gpg' -mtime +14 -delete
```

- ต้องลง `postgresql-client` เวอร์ชัน 16 เพื่อให้มี `pg_dump` ตรงกับ server และต้องมี `gnupg`
- ทำ `UPLOAD_DIR` ทั้งก้อนทุกคืนไปก่อน เพราะตอนเริ่มข้อมูลยังน้อย ถ้าโตจนช้าเกินไปค่อยเปลี่ยนเป็นแบบส่วนต่าง

### 9.2 นอกเครื่อง: ให้เครื่องเก็บสำรองมาดึงเอง

เครื่องเก็บสำรองเป็นฝ่ายต่อเข้ามาดึงไฟล์ เครื่องบน cloud ไม่มีสิทธิ์เข้าไปที่เครื่องเก็บสำรอง ได้ 2 อย่าง:

- ถ้าเครื่องบน cloud โดนเจาะ คนเจาะจะลบสำเนานอกเครื่องไม่ได้
- เครื่องเก็บสำรองอยู่หลัง NAT ได้ ไม่ต้องเปิดพอร์ตรับจากข้างนอก

วิธีตั้ง:

1. บนเครื่อง cloud สร้างผู้ใช้ `backupread` ที่อ่าน `/srv/iterra/backups` ได้อย่างเดียว
2. ใส่ key ของเครื่องเก็บสำรองแบบจำกัดคำสั่ง ให้อ่านได้อย่างเดียว:

   ```
   # ~backupread/.ssh/authorized_keys
   command="rrsync -ro /srv/iterra/backups",restrict ssh-ed25519 AAAA... backup-puller
   ```

   ต้องมี `rrsync` บนเครื่อง Ubuntu 24 ได้มากับแพ็กเกจ `rsync` **ยังไม่ได้ตรวจ** path ที่ติดตั้ง

3. บนเครื่องเก็บสำรอง ตั้ง cron ให้ดึงหลังเวลาที่ backup เสร็จ:

   ```bash
   rsync -a --delete-after backupread@<เครื่อง cloud>: /backup/iterra/
   ```

   แล้วเก็บย้อนหลังเองอย่างน้อย 14 วัน เช่น snapshot โฟลเดอร์รายวัน

ข้อมูลเครื่องเก็บสำรอง (OS อะไร อยู่หลัง NAT หรือไม่) **รอคำตอบ**

### 9.3 กู้คืน (ทำซ้อมบนเครื่องทดสอบก่อน 14 พ.ย.)

```bash
set -a; . /srv/iterra/app/.env; set +a
gpg --decrypt db_<stamp>.dump.gpg > db.dump
sudo systemctl stop iterra
dropdb iterra && createdb -O iterra iterra          # เฉพาะตอนซ้อมหรือเมื่อตั้งใจกู้ทับ
pg_restore --no-owner --role=iterra --dbname="$DATABASE_URL" db.dump
gpg --decrypt uploads_<stamp>.tar.gz.gpg | tar -C /srv/iterra -xzf -
sudo systemctl start iterra
```

กู้แล้วต้องตรวจ 3 อย่าง:

- login หลังบ้านได้
- รูปสินค้าขึ้น
- PDF แคตตาล็อกดาวน์โหลดได้

ผลการซ้อมให้จดวันที่ เวลาที่ใช้ และสิ่งที่เจอ เป็นหลักฐานใน checklist

**คำเตือน: `dropdb` ลบข้อมูลทั้ง DB บนเครื่องจริงห้ามรันถ้าไม่มี backup ที่ตรวจแล้วว่ากู้ได้**

## 10. cron บนเครื่อง

```
# crontab ของผู้ใช้ iterra (เวลาไทย)
30 2 * * *  /srv/iterra/bin/backup.sh >> /srv/iterra/logs/backup.log 2>&1
0 3 * * *   cd /srv/iterra/app && npm run db:prune >> /srv/iterra/logs/prune.log 2>&1
```

- `db:prune` ลบข้อมูลเก่าตามระยะเก็บใน spec หัวข้อ 11.5:
  - บันทึก login เก่ากว่า 90 วัน
  - session ที่หมดอายุ
  - audit log เก่ากว่า 365 วัน
  - สถิติคำค้นเก่ากว่า 400 วัน
- `db:prune` ไม่ลบข้อความจากฟอร์มติดต่อ เพราะยังรอฝ่ายกฎหมายกำหนดระยะเก็บ
- ทำ logrotate ให้ `/srv/iterra/logs/*.log` ด้วย

## 11. งานบัญชีแอดมิน

```bash
cd /srv/iterra/app
# สร้างหรือรีเซ็ตรหัส · เว้นวรรคหน้าคำสั่งเพื่อไม่ให้ติด shell history (ต้องตั้ง HISTCONTROL=ignorespace)
 ADMIN_EMAIL=name@example.com ADMIN_NAME='ชื่อ' ADMIN_PASSWORD='...' npm run db:admin
# ปิดบัญชีคนที่ลาออก (ลบ session ทั้งหมดและเขียน audit)
ADMIN_EMAIL=name@example.com npm run db:disable-admin
```

## 12. เฝ้าระวัง

- [ ] ตัวเฝ้าเว็บล่ม **ต้องอยู่นอกเครื่องที่ถูกเฝ้า** แนะนำให้รันบนเครื่องเก็บสำรอง
  - เช็ก `/` กับ `/admin/login/` ทุก 1 ถึง 5 นาที
  - ช่องทางแจ้งเตือน **รอคำตอบ**
- [ ] แจ้งเตือนเมื่อดิสก์ใช้เกิน 80%
- [ ] แจ้งเตือนเมื่อไฟล์ backup ล่าสุดเก่ากว่า 26 ชั่วโมง ตรวจที่เครื่องเก็บสำรอง
- [ ] ใบรับรอง HTTPS ต่ออายุอัตโนมัติ และแจ้งเตือนเมื่อเหลือไม่ถึง 14 วัน

## 13. ดูแลรายเดือน (จาก standards)

- [ ] อัปเดตระบบปฏิบัติการและ 1Panel อย่างน้อยเดือนละครั้ง
- [ ] รัน `npm audit --omit=dev` ก่อนทุกรอบ deploy ช่องโหว่ระดับ high ขึ้นไปให้แจ้งทีม dev
- [ ] ตรวจว่าไฟล์ backup ครบ 14 วันบนเครื่องเก็บสำรอง
- [ ] สรุปลงรายงานประจำเดือน: uptime ผลสำรอง แพ็กเกจที่อัปเดต และช่องโหว่ที่เจอ

## 14. เรื่องที่รอคำตอบ

| เรื่อง | กระทบหัวข้อ |
|---|---|
| วิธีรัน Node: systemd หรือ Node runtime ของ 1Panel | 3 |
| Cloudflare เปิดโหมด proxy หรือไม่ | 6.1 |
| ใครถือกุญแจถอดรหัส backup | 9.1, 9.3 |
| ข้อมูลเครื่องเก็บสำรอง: OS อะไร อยู่หลัง NAT หรือไม่ | 9.2, 12 |
| ช่องทางแจ้งเตือน | 12 |
| บัญชีที่ใช้เปิดเครื่องเป็นของใคร | ไม่กระทบขั้นตอน แต่กระทบรายการบัญชีที่ส่งมอบ |
| ตัวเก็บสถิติที่ใช้แทนตัวเดิม | 7 |
