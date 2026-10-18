// audit log: ใคร ทำอะไร กับอะไร เมื่อไร (docs/pm/standards.md หมวด 3 บันทึกและเฝ้าระวัง · spec หัวข้อ 11.1)
// import ไม่มี เพื่อให้ scripts/check-db.mjs รันไฟล์นี้ด้วย Node ได้ตรง ๆ
// login logout และ db:disable-admin เขียนเองใน lib/server/auth.ts (import ข้ามไฟล์ใน lib/server ไม่ได้)
// detail เก็บแค่สิ่งที่ช่วยอ่านย้อนหลัง เช่นชื่อหรือ slug ห้ามใส่ข้อมูลส่วนบุคคลของคนนอก

type Db = { query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }> };

export async function audit(
  db: Db,
  userId: number | null,
  action: string,
  entity: string,
  entityId: string | number | null,
  detail?: Record<string, unknown>,
): Promise<void> {
  await db.query('insert into audit_log (user_id, action, entity, entity_id, detail) values ($1, $2, $3, $4, $5::jsonb)', [
    userId,
    action,
    entity,
    entityId === null ? null : String(entityId),
    detail ? JSON.stringify(detail) : null,
  ]);
}

export type AuditRow = {
  id: number;
  at: Date;
  userName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  detail: Record<string, unknown> | null;
};

// หน้าบันทึกการใช้งาน: ใหม่สุดก่อน · ponytail: ไม่มีตัวกรองหรือแบ่งหน้า ดูย้อนเกินจำนวนนี้ใช้ psql
export async function listAudit(db: Db, limit = 200): Promise<AuditRow[]> {
  const r = await db.query(
    `select a.id::int as id, a.at, u.name as "userName", a.action, a.entity, a.entity_id as "entityId", a.detail
       from audit_log a left join admin_users u on u.id = a.user_id
      order by a.id desc limit $1`,
    [limit],
  );
  return r.rows;
}
