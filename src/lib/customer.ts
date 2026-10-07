// ข้อมูลลูกค้า (ล็อกอินด้วย Google) ที่หน้าแอดมินเห็น — ใช้ทั้ง server และ client (ไม่มี server-only)

export type CustomerDTO = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  lastLoginAt: string | null;
  /** ระงับ = ล็อกอินไม่ได้ และถ้ายังมี session ค้างอยู่ก็สร้างรูป/ใช้ประวัติ/รายการโปรดไม่ได้ */
  suspended: boolean;
  /** จำนวนดีไซน์ที่สร้างสำเร็จ / ที่บันทึกลงประวัติ */
  designs: number;
  saved: number;
};

export type CustomerStats = { designs: number; saved: number };

type CustomerRow = {
  _id: unknown;
  name?: string | null;
  email: string;
  createdAt: Date;
  lastLoginAt?: Date | null;
  suspendedAt?: Date | null;
};

/** เลือกเฉพาะ field ที่แอดมินต้องใช้ — ไม่มี googleSub และรายการโปรด */
export function serializeCustomer(doc: CustomerRow, stats?: CustomerStats): CustomerDTO {
  return {
    id: String(doc._id),
    name: doc.name ?? "",
    email: doc.email,
    createdAt: new Date(doc.createdAt).toISOString(),
    lastLoginAt: doc.lastLoginAt ? new Date(doc.lastLoginAt).toISOString() : null,
    suspended: Boolean(doc.suspendedAt),
    designs: stats?.designs ?? 0,
    saved: stats?.saved ?? 0,
  };
}
