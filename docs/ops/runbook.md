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
- ไฟล์ deploy (`Dockerfile`, `.github/workflows/image.yml`, `deploy/`) อยู่ที่ branch `chore/container-deploy` ยังไม่ merge
- ตรวจ commit ล่าสุดเอาสด ๆ ตอนจะ deploy: `git log --oneline -1 origin/<branch>`

## 1. ภาพรวม

```
push ไป deploy/test หรือ main
   |
   v
GitHub Actions build image ---- ghcr.io (tag: sha, test, main)
                                   ^
                                   |  เครื่องดึงเอง (ไม่ต้องเปิดพอร์ตเข้า ไม่มีความลับบน GitHub)
ผู้เข้าชม / แอดมิน                    |
   |  HTTPS 443                    |
   v                               |
reverse proxy (1Panel) ---- /uploads/ ส่งไฟล์จาก /srv/iterra/uploads ตรง
   |  http://127.0.0.1:3000
   v
container app (next start) ---- container db (PostgreSQL 16, ไม่เปิดพอร์ต)
   |
/srv/iterra/uploads (โฟลเดอร์บนเครื่อง mount เข้า container)

systemd timer บนเครื่อง: backup 02:30 · db:prune 03:00 · เครื่องทดสอบเท่านั้น: เช็ก image ใหม่ทุก 5 นาที
เครื่องเก็บสำรอง (นอก cloud): ดึงไฟล์ backup ทุกคืน · เฝ้าเว็บล่ม
```

มี 2 เครื่อง ตั้งเหมือนกันทุกอย่าง:

- **เครื่องทดสอบ**: ใช้ทดสอบ 3 รอบช่วง 19 ถึง 30 ต.ค. deploy อัตโนมัติเมื่อ branch `deploy/test` มี commit ใหม่
- **เครื่องจริง**: ตั้ง 2 ถึง 6 พ.ย. แล้วย้ายข้อมูลวันที่ 12 ถึง 13 พ.ย. deploy เมื่อมีคนสั่งเท่านั้น

## 2. เครื่อง

- สเปกเครื่องจริงตามใบเสนอราคา: CPU 4 Core, RAM 8 GB, ดิสก์ 50 GB, Ubuntu 24
- เครื่องทดสอบใช้สเปกเล็กกว่าได้ เพราะ build บน GitHub ไม่ได้ build บนเครื่อง
- ตั้งเขตเวลาเครื่องเป็น `Asia/Bangkok` เพื่อให้ timer ทำงานตามเวลาไทย

### 2.1 ความปลอดภัยของเครื่อง (จาก `docs/pm/standards.md`)

- [ ] SSH เข้าด้วยกุญแจเท่านั้น ปิดการ login ด้วยรหัสผ่าน และปิด login ตรงเป็น root
- [ ] 1Panel ใช้รหัสผ่านที่แข็งแรง ไม่ใช้พอร์ตเริ่มต้น และ entrance path ไม่ใช่ค่าเริ่มต้น
- [ ] firewall เปิดแค่ 22, 80, 443 และพอร์ตของ 1Panel
  - ถ้าทำได้ ให้พอร์ต 1Panel เปิดเฉพาะ IP ของทีม
  - **ห้ามเปิดพอร์ต 3000 กับ 5432 ออกนอกเครื่อง**
  - เหตุผลข้อ 3000: ถ้าเปิด คนนอกยิงตรงเข้า Node แล้วปลอม `X-Real-IP` ได้ ระบบกันเดารหัสกับระบบจำกัดการส่งฟอร์มจะใช้ไม่ได้
  - docker เปิดพอร์ตผ่าน iptables เอง **ข้าม firewall ของเครื่อง** จึงต้องผูก `127.0.0.1` ใน `compose.yml` เสมอ (ไฟล์ตั้งไว้แล้ว ห้ามแก้เป็น `3000:3000`)
- [ ] เปิด security update อัตโนมัติ (`unattended-upgrades`)
- [ ] บัญชีที่รันแอปเป็นผู้ใช้ธรรมดา เช่น `iterra` ไม่ใช่ root

## 3. ซอฟต์แวร์

| ตัว | ที่มา | หมายเหตุ |
|---|---|---|
| Docker Engine และ Docker Compose v2 | ลงบนเครื่อง (1Panel ใช้ Docker อยู่แล้ว) | ผู้ใช้ `iterra` ต้องอยู่กลุ่ม `docker` |
| แอป (Next.js บน Node 22) | image `ghcr.io/devbyanuwat/iterra-prototype` | build จาก `Dockerfile` บน GitHub Actions ทุก push ไป `deploy/test` และ `main` |
| PostgreSQL 16 | image `postgres:16-bookworm` ใน `compose.yml` | ไม่เปิดพอร์ตออกนอก docker network ข้อมูลอยู่ที่ `/srv/iterra/pgdata` |
| reverse proxy | ตัวที่มากับ 1Panel | ดูหัวข้อ 6 |
| `gnupg`, `flock` | ลงบนเครื่อง | ใช้ใน `backup.sh` กับ `deploy.sh` |

ถ้า image บน ghcr เป็น private (หลัง repo เปลี่ยนเป็น private) ต้อง `docker login ghcr.io` บนเครื่องด้วย token ที่มีสิทธิ์ `read:packages` อย่างเดียว token เก็บบนเครื่อง ห้ามใส่ใน repo

### 3.1 ไฟล์บนเครื่อง

ก๊อปจากโฟลเดอร์ `deploy/` ใน repo ไปไว้ที่ `/srv/iterra` (เจ้าของคือผู้ใช้ `iterra`):

```
/srv/iterra/
  compose.yml          จาก deploy/compose.yml
  deploy.sh            จาก deploy/deploy.sh
  update-test.sh       จาก deploy/update-test.sh (เครื่องทดสอบเท่านั้น)
  backup.sh            จาก deploy/backup.sh
  app.env              จาก deploy/app.env.example   chmod 600
  db.env               จาก deploy/db.env.example    chmod 600
  backup.env           จาก deploy/backup.env.example
  .env                 deploy.sh เขียนเอง (ITERRA_REF = image ที่ใช้อยู่) ห้ามแก้มือ
  uploads/             ไฟล์อัปโหลด chown 1000:1000 (ผู้ใช้ node ใน image)
  pgdata/              ข้อมูล PostgreSQL
  backups/             ไฟล์สำรองที่เข้ารหัสแล้ว
```

ไฟล์ systemd อยู่ใน `deploy/systemd/` ก๊อปไป `/etc/systemd/system/` แล้ว `systemctl daemon-reload`

## 4. ฐานข้อมูล

- PostgreSQL รันเป็น container `db` สร้าง DB `iterra` และผู้ใช้ `iterra` ให้เองตอนขึ้นครั้งแรก จากค่าใน `db.env`
- `DATABASE_URL` ใน `app.env` ใช้ host `db` (ชื่อ service ใน compose) ไม่ใช่ `127.0.0.1` รหัสต้องตรงกับ `POSTGRES_PASSWORD`
- ชื่อ DB บน server **ห้ามลงท้ายด้วย `_test`**
  - เหตุผล: `npm run check:db` ล้าง schema ทั้งหมด และยอมรันกับ DB ที่ชื่อลงท้าย `_test` เท่านั้น
  - **ห้ามรัน `check:db` บน server เด็ดขาด**
- migration อยู่ใน `db/migrations/*.sql` `deploy.sh` รัน `npm run db:migrate` ให้ทุกรอบ
  - รันได้ทางเดียว ย้อนกลับไม่ได้ ถ้าไฟล์ไหนพัง ไฟล์นั้นถอยกลับทั้งไฟล์แล้วหยุด
  - `deploy.sh` backup ก่อน migrate ทุกครั้ง (หัวข้อ 9)

## 5. ค่าตั้ง

`app.env` อ่านโดย container `app` **ห้าม commit**

| ค่า | ใช้ทำอะไร | ค่าบน server |
|---|---|---|
| `DATABASE_URL` | ต่อ DB | ตามหัวข้อ 4 |
| `IP_SALT` | ผสมก่อน hash IP | สุ่มใหม่สำหรับแต่ละเครื่อง เช่น `openssl rand -hex 32` ถ้าไม่ตั้ง แอปจะ error ตอน production |
| `SESSION_DAYS` | อายุ session ของแอดมิน (วัน) | `14` |
| `SESSION_IDLE_MIN` | ไม่ได้ใช้งานกี่นาทีแล้วต้อง login ใหม่ | `120` |
| `UPLOAD_DIR`, `NODE_ENV` | ที่เก็บไฟล์ใน container และโหมด production | `compose.yml` ตั้งให้แล้ว ไม่ต้องใส่ |
| `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` | ใช้ตอนสร้างหรือรีเซ็ตแอดมินเท่านั้น | **ห้ามเก็บไว้ใน `app.env`** ส่งเข้าคำสั่งครั้งเดียว (หัวข้อ 11) |
| `TEST_DATABASE_URL` | ใช้กับ `check:db` | **ห้ามตั้งบน server** |
| `SMTP_URL`, `INQUIRY_TO` | ส่งอีเมลแจ้งเมื่อมีคนส่งฟอร์มติดต่อ | ยังไม่ได้ทำในโค้ด ยังไม่ต้องตั้ง |

`backup.env`: `BACKUP_GPG_KEY` (fingerprint ของ public key ผู้ถือกุญแจ) และ `ITERRA_ENV` (`test` หรือ `prod`)

## 6. Reverse proxy และ HTTPS

ค่าที่โค้ดต้องการจากตัว proxy:

| ค่า | เหตุผล |
|---|---|
| `proxy_set_header X-Real-IP $remote_addr;` | `lib/admin.ts` ใช้ IP นี้นับการเดารหัสและจำกัดการส่งฟอร์มติดต่อต่อ IP |
| `client_max_body_size 31m;` | ไฟล์แคตตาล็อก PDF รับได้ไม่เกิน 30 MB |
| `location /uploads/` ส่งไฟล์จาก `UPLOAD_DIR` ตรง | ลดงานของ Node ถ้าไม่ตั้ง แอปก็ยังส่งไฟล์เองได้ |
| HTTPS พร้อม redirect จาก 80 ไป 443 | cookie ของแอดมินตั้งแบบ `secure` ถ้าไม่มี HTTPS จะ login ไม่ได้ |

ตัวอย่างเต็มอยู่ที่ `deploy/nginx.conf` (รูปแบบ nginx ใน 1Panel ใส่ใน config ของเว็บ **ยังไม่ได้ตรวจ** ว่าต้องวางตรงไหนของ 1Panel):

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

- ถ้าวาง `alias /uploads/` ต้องเช็กให้ผู้ใช้ที่รัน proxy อ่าน `/srv/iterra/uploads` ได้
- ถ้า proxy ของ 1Panel รันเป็น container เอง ต้อง mount `/srv/iterra/uploads` เข้า container ของ proxy ด้วย **ยังไม่ได้ตรวจ**
- วิดีโอ (webm) ต้องส่งผ่าน alias นี้ เพราะ nginx รองรับ Range request ซึ่ง iPhone ต้องใช้ ส่วน route `/uploads/` ใน Next อ่านไฟล์ทั้งก้อน ไม่รองรับ Range

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
# ผู้ใช้ iterra ใน /srv/iterra หลังวางไฟล์ตามหัวข้อ 3.1 และแก้ app.env db.env backup.env แล้ว
mkdir -p uploads pgdata backups && sudo chown 1000:1000 uploads
./deploy.sh test                     # เครื่องจริงใช้ ./deploy.sh <sha 40 ตัว>
docker compose run --rm -T app npm run db:seed   # ครั้งเดียว กับ DB ที่ยังว่าง รันซ้ำไม่ได้
```

จากนั้นสร้างแอดมินคนแรกตามหัวข้อ 11 แล้วเปิด timer:

```bash
sudo systemctl enable --now iterra-backup.timer iterra-prune.timer
sudo systemctl enable --now iterra-update.timer   # เครื่องทดสอบเท่านั้น
```

**ต้องแก้โค้ดก่อนขึ้นเครื่องจริง** งานนี้ทีม dev ทำ ไม่ใช่ infra:

- `lib/site.ts` ยังเป็นค่าตัวอย่าง: `SITE_URL` (มีผลกับ sitemap, robots, OG) และข้อมูลติดต่อ (`CONTACT`)
- ตัวเก็บสถิติใน `components/CookieConsent.tsx` ยังเป็นตัวที่ใช้ได้เฉพาะ Vercel **รอคำตอบ** ว่าจะใช้อะไรแทน

## 8. Deploy รอบถัดไป

`deploy.sh` ทำตามลำดับนี้ทุกรอบ: กันไม่ให้รันซ้อน, ดึง image, ถ้าเป็นตัวเดิมก็จบ, backup, migrate, เปิดตัวใหม่, เช็กว่า `/` ตอบภายใน 60 วินาที ถ้าไม่ตอบจะถอยกลับไปตัวเดิมเอง

- **เครื่องทดสอบ (อัตโนมัติ)**: ทีม dev push หรือ merge เข้า `deploy/test` แล้ว GitHub build image tag `test` ภายในไม่กี่นาที `iterra-update.timer` เจอ image ใหม่แล้ว deploy เอง ดูผลที่ `journalctl -u iterra-update`
- **เครื่องจริง (คนสั่ง)**: เลือก sha จาก commit ที่ merge เข้า `main` แล้วและ image build ผ่าน (ดูที่แท็บ Actions)

  ```bash
  cd /srv/iterra && ./deploy.sh <sha 40 ตัว>
  ```

- ทุกรอบ deploy ให้จด sha ที่ขึ้นไว้ในรายงานของรอบนั้น (checklist ใช้เป็นหลักฐาน)
- **ถอยกลับเอง**: `./deploy.sh <sha ตัวก่อน>`
  - ถอยได้เฉพาะโค้ด ถ้ารอบนั้นมี migration ใหม่ โค้ดเก่าอาจใช้กับ schema ใหม่ไม่ได้ ให้กู้ DB จาก backup ที่ `deploy.sh` ทำไว้ก่อน migrate (หัวข้อ 9.3)

## 9. สำรองข้อมูล

ข้อกำหนด (standards + spec):

- สำรอง DB และ `UPLOAD_DIR` ทุกวัน
- เก็บย้อนหลัง 14 วัน
- มีสำเนาอยู่นอกเครื่อง
- ทดสอบกู้คืนสำเร็จอย่างน้อย 1 ครั้งก่อนตรวจรับ (14 พ.ย.)

backup ที่ระบบ cloud ทำให้อัตโนมัติ (ถ้ามี) ใช้เป็นชั้นเสริมได้ แต่ใช้แทนข้อนี้ไม่ได้

### 9.1 บนเครื่อง: ทำไฟล์สำรองทุกคืน

ไฟล์สำรองต้องเข้ารหัส เพราะใน DB มีชื่อ อีเมล และข้อความจากฟอร์มติดต่อ

- `backup.sh` dump DB จาก container `db` และ tar โฟลเดอร์ `uploads` แล้วเข้ารหัสด้วย public key ของคนที่ถือกุญแจ เก็บที่ `backups/` 14 วัน
- server เก็บแค่ public key ถอดรหัสบน server ไม่ได้ นำเข้าด้วย `gpg --import` แล้วใส่ fingerprint ใน `backup.env`
- ใครถือกุญแจถอดรหัส **รอคำตอบ**
- เครื่องจริงไม่มี key แล้ว `backup.sh` จะล้ม และ `deploy.sh` จะหยุดก่อน migrate
- เครื่องทดสอบ (`ITERRA_ENV=test`) ที่ยังไม่มี key จะข้ามการสำรองพร้อมเตือน เพื่อให้รอบทดสอบเดินได้ก่อนได้คำตอบ
- ทำ `uploads` ทั้งก้อนทุกคืนไปก่อน เพราะตอนเริ่มข้อมูลยังน้อย ถ้าโตจนช้าเกินไปค่อยเปลี่ยนเป็นแบบส่วนต่าง

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
cd /srv/iterra
gpg --decrypt db_<stamp>.dump.gpg > db.dump
docker compose stop app
docker compose exec -T db dropdb -U iterra iterra        # เฉพาะตอนซ้อมหรือเมื่อตั้งใจกู้ทับ
docker compose exec -T db createdb -U iterra iterra
docker compose exec -T db pg_restore -U iterra -d iterra --no-owner < db.dump
gpg --decrypt uploads_<stamp>.tar.gz.gpg | tar -C /srv/iterra -xzf -
docker compose start app
rm db.dump
```

กู้แล้วต้องตรวจ 3 อย่าง:

- login หลังบ้านได้
- รูปสินค้าขึ้น
- PDF แคตตาล็อกดาวน์โหลดได้

ผลการซ้อมให้จดวันที่ เวลาที่ใช้ และสิ่งที่เจอ เป็นหลักฐานใน checklist

**คำเตือน: `dropdb` ลบข้อมูลทั้ง DB บนเครื่องจริงห้ามรันถ้าไม่มี backup ที่ตรวจแล้วว่ากู้ได้**

## 10. timer บนเครื่อง

| timer | เวลา | ทำอะไร |
|---|---|---|
| `iterra-backup.timer` | 02:30 ทุกวัน | `backup.sh` |
| `iterra-prune.timer` | 03:00 ทุกวัน | `docker compose run --rm -T app npm run db:prune` |
| `iterra-update.timer` | ทุก 5 นาที | `update-test.sh` **เครื่องทดสอบเท่านั้น ห้าม enable บนเครื่องจริง** |

ดู log ด้วย `journalctl -u <ชื่อ service>`

- `db:prune` ลบข้อมูลเก่าตามระยะเก็บใน spec หัวข้อ 11.5:
  - บันทึก login เก่ากว่า 90 วัน
  - session ที่หมดอายุ
  - audit log เก่ากว่า 365 วัน
  - สถิติคำค้นเก่ากว่า 400 วัน
- `db:prune` ไม่ลบข้อความจากฟอร์มติดต่อ เพราะยังรอฝ่ายกฎหมายกำหนดระยะเก็บ

## 11. งานบัญชีแอดมิน

```bash
cd /srv/iterra
# สร้างหรือรีเซ็ตรหัส · เว้นวรรคหน้าคำสั่งเพื่อไม่ให้ติด shell history (ต้องตั้ง HISTCONTROL=ignorespace)
 docker compose run --rm -T -e ADMIN_EMAIL=name@example.com -e ADMIN_NAME='ชื่อ' -e ADMIN_PASSWORD='...' app npm run db:admin
# ปิดบัญชีคนที่ลาออก (ลบ session ทั้งหมดและเขียน audit)
docker compose run --rm -T -e ADMIN_EMAIL=name@example.com app npm run db:disable-admin
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
- [ ] ดึง image `postgres:16-bookworm` ใหม่ทุกเดือน (`docker compose pull db && docker compose up -d db`) หลัง backup
- [ ] ตรวจว่าไฟล์ backup ครบ 14 วันบนเครื่องเก็บสำรอง
- [ ] สรุปลงรายงานประจำเดือน: uptime ผลสำรอง แพ็กเกจที่อัปเดต และช่องโหว่ที่เจอ

## 14. เรื่องที่รอคำตอบ

| เรื่อง | กระทบหัวข้อ |
|---|---|
| ใครมีสิทธิ์สั่ง deploy ขึ้นเครื่องจริง | 8 |
| ใช้ proxy ของ 1Panel แบบ container หรือบนเครื่อง (กระทบการ mount uploads) | 6 |
| Cloudflare เปิดโหมด proxy หรือไม่ | 6.1 |
| ใครถือกุญแจถอดรหัส backup | 9.1, 9.3 |
| ข้อมูลเครื่องเก็บสำรอง: OS อะไร อยู่หลัง NAT หรือไม่ | 9.2, 12 |
| ช่องทางแจ้งเตือน | 12 |
| บัญชีที่ใช้เปิดเครื่องเป็นของใคร | ไม่กระทบขั้นตอน แต่กระทบรายการบัญชีที่ส่งมอบ |
| ตัวเก็บสถิติที่ใช้แทนตัวเดิม | 7 |
