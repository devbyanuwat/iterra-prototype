-- 005: ร่างและประวัติการแก้ไข (spec docs/superpowers/specs/2026-10-19-draft-publish-history-design.md)
-- คอลัมน์ในตารางเนื้อหาคือฉบับที่ขึ้นหน้าเว็บ · ร่าง = revision ล่าสุดของชิ้นนั้นที่ published_at เป็น null
create table revisions (
  id           bigint generated always as identity primary key,
  entity       text not null,
  entity_id    bigint not null,                 -- ไม่มี FK เพราะชี้ได้หลายตาราง · ลบเนื้อหาแล้วโค้ดลบประวัติด้วย
  data         jsonb not null,                  -- เนื้อหาทั้งชิ้นแบบเดียวกับฟอร์ม
  user_id      bigint references admin_users,   -- null = ฉบับตั้งต้นที่ขึ้นเว็บอยู่ก่อนเริ่มเก็บประวัติ
  at           timestamptz not null default now(),
  published_at timestamptz
);
create index on revisions (entity, entity_id, id);
