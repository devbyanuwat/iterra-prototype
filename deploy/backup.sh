#!/bin/sh
# สำรอง DB และไฟล์อัปโหลด เข้ารหัสด้วย public key ของผู้ถือกุญแจ · เก็บ 14 วัน (runbook หัวข้อ 9)
# ตั้ง BACKUP_GPG_KEY ใน backup.env · เครื่องจริงต้องมีเสมอ
# เครื่องทดสอบ (ITERRA_ENV=test) ที่ยังไม่มี key: ข้ามการสำรองพร้อมเตือน เพื่อให้ deploy รอบทดสอบเดินได้
set -eu
cd "$(dirname "$0")"
[ -f backup.env ] && . ./backup.env
OUT=${BACKUP_DIR:-./backups}
KEY=${BACKUP_GPG_KEY:-}
if [ -z "$KEY" ]; then
  if [ "${ITERRA_ENV:-}" = test ]; then echo "backup: ยังไม่ตั้ง BACKUP_GPG_KEY ข้ามการสำรอง (เครื่องทดสอบ)" >&2; exit 0; fi
  echo "backup: ต้องตั้ง BACKUP_GPG_KEY ใน backup.env" >&2; exit 1
fi
# compose.yml ต้องมี ITERRA_REF ถึงจะอ่านไฟล์ได้ · ใช้ตัวที่ deploy ล่าสุด ถ้ายังไม่เคย deploy ใส่ค่าหลอกไว้ (ไฟล์นี้แตะแค่ db)
export ITERRA_REF="${ITERRA_REF:-$(sed -n 's/^ITERRA_REF=//p' .env 2>/dev/null)}"
[ -n "$ITERRA_REF" ] || export ITERRA_REF=not-deployed-yet
STAMP=$(date +%Y-%m-%d_%H%M)
mkdir -p "$OUT"
# ถ้า db ยังไม่เคยขึ้น (deploy ครั้งแรก) ไม่มีอะไรให้สำรอง
if docker compose ps --status running -q db 2>/dev/null | grep -q .; then
  docker compose exec -T db pg_dump -U iterra -Fc iterra \
    | gpg --batch --yes --trust-model always --encrypt --recipient "$KEY" --output "$OUT/db_$STAMP.dump.gpg"
fi
tar -C . -czf - uploads \
  | gpg --batch --yes --trust-model always --encrypt --recipient "$KEY" --output "$OUT/uploads_$STAMP.tar.gz.gpg"
find "$OUT" -name '*.gpg' -mtime +14 -delete
echo "backup: $OUT/*_$STAMP.*.gpg"
