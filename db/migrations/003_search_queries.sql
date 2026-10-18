-- 003: สถิติคำค้นในเว็บ ยอดรวมรายวันต่อคำ (แผน 2 Task 6 · spec หัวข้อ 11.2)
-- ไม่มีคอลัมน์ IP session หรือ cookie: ระบุตัวคนไม่ได้ จึงเก็บได้กับทุกคนโดยไม่ต้องขอความยินยอม
create table search_queries (
  day          date not null,
  query        text not null,
  searches     int not null default 0,
  clicks       int not null default 0,
  zero_results int not null default 0,
  primary key (day, query)
);
