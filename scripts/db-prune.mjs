// ล้างข้อมูลเก่าตามระยะเก็บใน spec หัวข้อ 11.5: npm run db:prune (ตั้ง cron วันละครั้งบน server ตอน deploy)
// ไม่ลบข้อความจากฟอร์มติดต่อ: รอฝ่ายกฎหมายกำหนดระยะเก็บ
import { pathToFileURL } from 'node:url';
import pg from 'pg';

// client เป็น pg.Client, PoolClient หรือ Pool ก็ได้ (แต่ละคำสั่งไม่ต้องอยู่ transaction เดียวกัน)
export async function prune(client, idleMin = Math.floor(Number(process.env.SESSION_IDLE_MIN)) || 120) {
  const n = async (sql, values = []) => (await client.query(sql, values)).rowCount;
  return {
    loginAttempts: await n("delete from login_attempts where at < now() - interval '90 days'"),
    sessions: await n('delete from sessions where expires_at < now() or last_seen_at < now() - make_interval(mins => $1)', [idleMin]),
    audit: await n("delete from audit_log where at < now() - interval '365 days'"),
    searches: await n('delete from search_queries where day < current_date - 400'),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const r = await prune(client);
    console.log(`ลบแล้ว: login_attempts ${r.loginAttempts}, sessions ${r.sessions}, audit_log ${r.audit}, search_queries ${r.searches}`);
  } finally {
    await client.end();
  }
}
