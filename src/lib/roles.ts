import type { Session } from "next-auth";

// แอดมิน (username/รหัสผ่าน) กับลูกค้า (Google) ใช้ session ชุดเดียวกัน — แยกสิทธิ์ด้วย role เท่านั้น
export type Role = "admin" | "customer";

const OBJECT_ID = /^[a-f0-9]{24}$/;

/** มีชื่ออย่างเดียวไม่พอ — ลูกค้าที่ล็อกอินด้วย Google ก็มีชื่อ */
export function isAdminSession(session: Session | null): session is Session {
  return session?.user?.role === "admin" && Boolean(session.user.name);
}

export function isCustomerSession(session: Session | null): session is Session {
  return session?.user?.role === "customer" && OBJECT_ID.test(session.user.customerId ?? "");
}
