# image เดียวสำหรับเครื่องทดสอบและเครื่องจริง · build บน GitHub Actions (.github/workflows/image.yml)
# รันด้วย next start ตามปกติ ไม่ใช้ output: 'standalone' เพราะต้องแก้ next.config.mjs ซึ่งเป็นไฟล์ protected
# สคริปต์ db:* อยู่ใน image ด้วย สั่งผ่าน `docker compose run --rm app npm run db:migrate` ได้
# bookworm (glibc) ไม่ใช่ alpine เพราะ sharp ใช้ binary ของ glibc

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# next build ไม่ต่อ DB (lib/db.ts สร้าง Pool แต่ยังไม่ query) จึงไม่ต้องมี DATABASE_URL ตอน build
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS app
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 UPLOAD_DIR=/data/uploads NPM_CONFIG_UPDATE_NOTIFIER=false
# ffmpeg แปลงวิดีโอ hero ที่อัปโหลดเป็น WebM/MP4 · ไม่ใช้ npm package เพราะต้องการ encoder ของระบบ (libvpx, libx264)
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
# ผู้ใช้ node (uid 1000) ในตัว image · โฟลเดอร์ที่ mount เข้า /data/uploads ต้องให้ uid 1000 เขียนได้
COPY --from=build --chown=node:node /app ./
RUN mkdir -p /data/uploads && chown node:node /data/uploads
USER node
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
