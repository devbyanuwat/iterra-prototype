// สถิติคำค้นในเว็บ: ยอดรวมรายวันต่อคำ ไม่มี IP session หรือ cookie (spec หัวข้อ 11.2)
// import ไม่มี เพื่อให้ scripts/check-db.mjs รันไฟล์นี้ด้วย Node ได้ตรง ๆ

type Db = { query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }> };

// ponytail: เพดานคำใหม่ต่อวัน กันบอทยิงคำสุ่มจนตารางโต · คำจริงต่อวันเกินนี้เมื่อไรค่อยขยับ
export const MAX_DAILY_QUERIES = 5000;

// คืนคำที่จะเก็บ หรือ null = ไม่เก็บ
export function normalizeQuery(q: unknown): string | null {
  if (typeof q !== 'string') return null;
  const s = q.toLowerCase().trim().replace(/\s+/g, ' ');
  if (s.length < 2) return null;
  // ตรวจบนรูป NFKC ที่ตัดทุกอย่างยกเว้นตัวอักษรกับตัวเลขออก: จุด ทับ วงเล็บ อักขระเต็มความกว้าง และช่องว่างความกว้างศูนย์ จึงซ่อนเบอร์โทรหรืออีเมลไม่ได้
  // มี @ < > หรือตัวเลขติดกันตั้งแต่ 8 หลัก (เบอร์โทร เลขบัตร เลขบัญชี) ไม่เก็บ · คำที่เก็บคือคำเดิม s ไม่ใช่ k เพราะ NFKC เปลี่ยนสระอำของไทย
  const k = s.normalize('NFKC');
  if (/[@<>]/.test(k) || /[0-9๐-๙]{8,}/.test(k.replace(/[^\p{L}\p{N}]/gu, ''))) return null;
  return s.slice(0, 60).trim();
}

// คืน true เมื่อนับแล้ว · clicked = กดผลค้นหา · results = จำนวนผลที่เห็นตอนนั้น
export async function logSearch(db: Db, q: unknown, clicked: boolean, results: number, cap = MAX_DAILY_QUERIES): Promise<boolean> {
  const query = normalizeQuery(q);
  if (!query) return false;
  const r = await db.query(
    `insert into search_queries (day, query, searches, clicks, zero_results)
     select t.day, $1::text, 1, $2::int, $3::int
       from (select (now() at time zone 'Asia/Bangkok')::date as day) t
      where exists (select 1 from search_queries where day = t.day and query = $1::text)
         or (select count(*) from search_queries where day = t.day) < $4::int
     on conflict (day, query) do update set
       searches = search_queries.searches + 1,
       clicks = search_queries.clicks + excluded.clicks,
       zero_results = search_queries.zero_results + excluded.zero_results`,
    [query, clicked ? 1 : 0, !clicked && results === 0 ? 1 : 0, cap],
  );
  return r.rowCount === 1;
}
