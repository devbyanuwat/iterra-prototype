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
