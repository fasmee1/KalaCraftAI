import "server-only";
import { createHash } from "node:crypto";
import { dailyQuota, quotaFilter } from "@/lib/quota";
import { Generation } from "@/models/Generation";

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

/** เที่ยงคืนของวันนี้ตามเวลาไทย — โควตารายวันรีเซ็ตตอนนี้ */
export function startOfBangkokDay(now = new Date()): Date {
  const shifted = now.getTime() + BANGKOK_OFFSET_MS;
  return new Date(shifted - (shifted % 86_400_000) - BANGKOK_OFFSET_MS);
}

/** IP ของผู้เรียกจาก header ของ proxy (ตัวแรกใน x-forwarded-for) */
export function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || null;
}

export function hashIp(ip: string | null): string {
  const salt = process.env.IP_HASH_SALT || process.env.NEXTAUTH_SECRET;
  if (!salt) throw new Error("IP_HASH_SALT is not set");
  return createHash("sha256").update(`${salt}:${ip ?? "unknown"}`).digest("hex");
}

export type LimitResult = { ok: true } | { ok: false; reason: "ip" | "account" | "budget" };

/**
 * นับเฉพาะที่สำเร็จหรือกำลังสร้าง — ครั้งที่ AI error ไม่นับโควตาลูกค้า
 * ล็อกอินด้วย Google = นับต่อบัญชี (โควตามากกว่า), ไม่ล็อกอิน = นับต่อ IP
 * งบรายวันรวมค่าใช้จ่ายของทั้งระบบตั้งแต่เที่ยงคืน (เวลาไทย)
 */
export async function checkGenerateLimits(
  who: { ipHash: string; customerId: string | null },
  nextCostUsd: number,
): Promise<LimitResult> {
  const since = startOfBangkokDay();
  const perDay = dailyQuota(Boolean(who.customerId));
  const budget = Number(process.env.DAILY_BUDGET_USD) || 10;

  const [used, spent] = await Promise.all([
    Generation.countDocuments({ ...quotaFilter(who), createdAt: { $gte: since }, status: { $in: ["pending", "success"] } }),
    Generation.aggregate<{ total: number }>([
      { $match: { createdAt: { $gte: since }, status: { $in: ["pending", "success"] } } },
      { $group: { _id: null, total: { $sum: "$costUsd" } } },
    ]),
  ]);

  if (used >= perDay) return { ok: false, reason: who.customerId ? "account" : "ip" };
  if ((spent[0]?.total ?? 0) + nextCostUsd > budget) return { ok: false, reason: "budget" };
  return { ok: true };
}
