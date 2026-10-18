-- 002: audit log และเวลาใช้งานล่าสุดของ session (แผน 2 Task 1 · spec หัวข้อ 11.1 และ 11.3)
create table audit_log (
  id        bigint generated always as identity primary key,
  at        timestamptz not null default now(),
  user_id   bigint references admin_users,   -- null = สคริปต์บน server · ลบบัญชีที่มีประวัติไม่ได้ ใช้ปิดบัญชีแทน
  action    text not null,
  entity    text not null,
  entity_id text,
  detail    jsonb
);
create index on audit_log (at);

alter table sessions add column last_seen_at timestamptz not null default now();
