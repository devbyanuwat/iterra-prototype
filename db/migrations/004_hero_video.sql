-- วิดีโอ hero หน้าแรก (แถวเดียว id = 1) · ไม่มีแถว หรือ webm เป็น null = ใช้ไฟล์ตั้งต้นใน public/media/hero
-- job_* คืองานแปลงไฟล์ แยกจากไฟล์ที่หน้าเว็บใช้อยู่ ระหว่างแปลงหน้าเว็บยังใช้ตัวเดิม
create table hero_video (
  id             int primary key default 1 check (id = 1),
  webm           text,
  mp4            text,
  poster         text,
  updated_at     timestamptz,
  job_status     text not null default 'idle' check (job_status in ('idle', 'processing', 'failed')),
  job_error      text,
  job_started_at timestamptz,
  -- ไฟล์มาครบชุดหรือไม่มีเลย
  check ((webm is null) = (mp4 is null) and (mp4 is null) = (poster is null))
);
