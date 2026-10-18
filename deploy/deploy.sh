#!/bin/sh
# deploy image ขึ้นเครื่องนี้: ./deploy.sh <tag>
#   tag = test | main | sha ยาว 40 ตัว
# ลำดับ: backup, ดึง image, migrate, เปิดตัวใหม่, เช็กว่าเว็บตอบ ถ้าไม่ตอบถอยกลับไปตัวเดิม
# ถอยกลับได้เฉพาะโค้ด ถ้ารอบนั้น migrate ไปแล้วต้องกู้ DB เอง (runbook หัวข้อ 9.3)
set -eu
cd "$(dirname "$0")"
TAG=${1:-}
case "$TAG" in
  test | main) ;;
  *) printf '%s' "$TAG" | grep -Eq '^[0-9a-f]{40}$' || { echo "usage: $0 test|main|<sha 40 ตัว>" >&2; exit 2; } ;;
esac
IMAGE=${ITERRA_IMAGE:-ghcr.io/devbyanuwat/iterra-prototype}
log() { echo "$(date '+%F %T') deploy $TAG: $*"; }

# กันรันซ้อน (timer กับคนสั่งพร้อมกัน)
exec 9>.deploy.lock
flock -n 9 || { log "มีอีกรอบกำลังรันอยู่"; exit 0; }

prev=$(sed -n 's/^ITERRA_REF=//p' .env 2>/dev/null || true)

docker pull -q "$IMAGE:$TAG" >/dev/null
ref=$(docker image inspect -f '{{index .RepoDigests 0}}' "$IMAGE:$TAG")
if [ "$ref" = "$prev" ]; then log "เป็นตัวเดียวกับที่ใช้อยู่ ไม่ต้องทำอะไร"; exit 0; fi
log "จาก ${prev:-ยังไม่เคย deploy} ไป $ref"

ITERRA_REF=${prev:-$ref} ./backup.sh
ITERRA_REF=$ref docker compose up -d --wait db
ITERRA_REF=$ref docker compose run --rm -T app npm run db:migrate
ITERRA_REF=$ref docker compose up -d app

healthy() {
  i=0
  while [ $i -lt 30 ]; do
    if ITERRA_REF=$1 docker compose exec -T app node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))" 2>/dev/null; then return 0; fi
    i=$((i + 1)); sleep 2
  done
  return 1
}

if healthy "$ref"; then
  echo "ITERRA_REF=$ref" > .env
  log "เสร็จ"
  exit 0
fi

log "เว็บไม่ตอบภายใน 60 วินาที"
if [ -n "$prev" ]; then
  ITERRA_REF=$prev docker compose up -d app
  if healthy "$prev"; then log "ถอยกลับไป $prev แล้ว ถ้ารอบนี้มี migration ให้ตรวจ DB"
  else log "ถอยกลับไป $prev แล้วแต่เว็บก็ยังไม่ตอบ ต้องมีคนเข้าไปดู"; fi
fi
exit 1
