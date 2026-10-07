import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { serializeCustomer, type CustomerStats } from "@/lib/customer";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { Generation } from "@/models/Generation";
import { CustomerManager } from "./CustomerManager";

export const metadata: Metadata = { title: "ลูกค้า · แอดมิน KalaCraftAI" };

// แสดงลูกค้าล่าสุดไม่เกินจำนวนนี้ — ค้นหาทำฝั่ง client ในรายการที่โหลดมา
const LIST_LIMIT = 500;

export default async function CustomersPage() {
  if (!(await getAdminSession())) redirect("/admin/login");
  await connectDB();

  const [docs, total, counts] = await Promise.all([
    Customer.find().sort({ createdAt: -1 }).limit(LIST_LIMIT).select("name email createdAt lastLoginAt suspendedAt").lean(),
    Customer.countDocuments(),
    Generation.aggregate<{ _id: unknown; designs: number; saved: number }>([
      { $match: { customer: { $ne: null }, status: "success" } },
      {
        $group: {
          _id: "$customer",
          designs: { $sum: 1 },
          saved: { $sum: { $cond: [{ $eq: [{ $type: "$savedImage.publicId" }, "string"] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const stats = new Map<string, CustomerStats>(counts.map((c) => [String(c._id), { designs: c.designs, saved: c.saved }]));
  return <CustomerManager initial={docs.map((doc) => serializeCustomer(doc, stats.get(String(doc._id))))} total={total} />;
}
