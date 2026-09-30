import "server-only";
import { connectDB } from "@/lib/db";
import type { RangeDays } from "@/lib/dashboardRange";
import type { OptionType } from "@/lib/optionTypes";
import { startOfBangkokDay } from "@/lib/rateLimit";
import { Generation } from "@/models/Generation";
import { Option } from "@/models/Option";
import { Product } from "@/models/Product";

// ตัวเลขทั้งหมดของหน้าแดชบอร์ด — คิดตามเวลาไทย และนับเฉพาะภาพที่สร้างสำเร็จ (ยกเว้นอัตราสำเร็จ)
const TZ = "Asia/Bangkok";
const DAY_MS = 86_400_000;

export type { RangeDays };


export type DailyPoint = { date: string; success: number; sent: number; failed: number; cost: number };
export type RankedItem = { id: string; label: string; count: number; swatch?: string | null };
export type RecentGeneration = {
  designCode: string;
  productName: string;
  status: "pending" | "success" | "failed";
  sent: boolean;
  durationMs: number | null;
  createdAt: string;
};

export type DashboardData = {
  rangeDays: RangeDays;
  generatedAt: string;
  totals: { success: number; failed: number; sent: number; cost: number; avgDurationMs: number | null };
  previous: { success: number; sent: number; cost: number };
  today: { success: number; yesterday: number; spent: number; budget: number };
  month: { success: number; cost: number };
  daily: DailyPoint[];
  topProducts: RankedItem[];
  topOptions: Record<"style" | "tone" | "pattern", RankedItem[]>;
  /** [วันในสัปดาห์ 0=จันทร์][ช่วง 3 ชม. 0–7] */
  heatmap: number[][];
  aspect: { ratio: string; count: number }[];
  recent: RecentGeneration[];
};

/** YYYY-MM-DD ตามเวลาไทย */
function bangkokDate(d: Date): string {
  return new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
}

export async function getDashboardData(rangeDays: RangeDays): Promise<DashboardData> {
  await connectDB();
  const todayStart = startOfBangkokDay();
  const since = new Date(todayStart.getTime() - (rangeDays - 1) * DAY_MS);
  const prevSince = new Date(since.getTime() - rangeDays * DAY_MS);
  const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);
  const bkkNow = new Date(Date.now() + 7 * 3_600_000);
  const monthStart = new Date(Date.UTC(bkkNow.getUTCFullYear(), bkkNow.getUTCMonth(), 1) - 7 * 3_600_000);
  const earliest = new Date(Math.min(prevSince.getTime(), monthStart.getTime()));

  const [facet] = await Generation.aggregate<{
    daily: { _id: string; success: number; sent: number; failed: number; cost: number }[];
    current: { success: number; failed: number; sent: number; cost: number; avgDuration: number | null }[];
    previous: { success: number; sent: number; cost: number }[];
    today: { success: number; yesterday: number; spent: number }[];
    month: { success: number; cost: number }[];
    products: { _id: unknown; count: number }[];
    options: { _id: unknown; count: number }[];
    heatmap: { _id: { dow: number; slot: number }; count: number }[];
    aspect: { _id: string; count: number }[];
  }>([
    { $match: { createdAt: { $gte: earliest } } },
    {
      $addFields: {
        ok: { $eq: ["$status", "success"] },
        inRange: { $gte: ["$createdAt", since] },
      },
    },
    {
      $facet: {
        daily: [
          { $match: { inRange: true } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } },
              success: { $sum: { $cond: ["$ok", 1, 0] } },
              failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
              sent: { $sum: { $cond: [{ $and: ["$ok", { $ne: ["$sentToPageAt", null] }] }, 1, 0] } },
              cost: { $sum: { $cond: ["$ok", "$costUsd", 0] } },
            },
          },
        ],
        current: [
          { $match: { inRange: true } },
          {
            $group: {
              _id: null,
              success: { $sum: { $cond: ["$ok", 1, 0] } },
              failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
              sent: { $sum: { $cond: [{ $and: ["$ok", { $ne: ["$sentToPageAt", null] }] }, 1, 0] } },
              cost: { $sum: { $cond: ["$ok", "$costUsd", 0] } },
              avgDuration: { $avg: { $cond: ["$ok", "$durationMs", null] } },
            },
          },
        ],
        previous: [
          { $match: { createdAt: { $gte: prevSince, $lt: since }, ok: true } },
          {
            $group: {
              _id: null,
              success: { $sum: 1 },
              sent: { $sum: { $cond: [{ $ne: ["$sentToPageAt", null] }, 1, 0] } },
              cost: { $sum: "$costUsd" },
            },
          },
        ],
        today: [
          { $match: { createdAt: { $gte: yesterdayStart } } },
          {
            $group: {
              _id: null,
              success: { $sum: { $cond: [{ $and: ["$ok", { $gte: ["$createdAt", todayStart] }] }, 1, 0] } },
              yesterday: { $sum: { $cond: [{ $and: ["$ok", { $lt: ["$createdAt", todayStart] }] }, 1, 0] } },
              // งบวันนี้คิดแบบเดียวกับ rateLimit: pending + success
              spent: {
                $sum: {
                  $cond: [
                    { $and: [{ $gte: ["$createdAt", todayStart] }, { $in: ["$status", ["pending", "success"]] }] },
                    "$costUsd",
                    0,
                  ],
                },
              },
            },
          },
        ],
        month: [
          { $match: { createdAt: { $gte: monthStart }, ok: true } },
          { $group: { _id: null, success: { $sum: 1 }, cost: { $sum: "$costUsd" } } },
        ],
        products: [
          { $match: { inRange: true, ok: true } },
          { $group: { _id: "$product", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 6 },
        ],
        options: [
          { $match: { inRange: true, ok: true } },
          { $unwind: "$options" },
          { $group: { _id: "$options", count: { $sum: 1 } } },
        ],
        heatmap: [
          { $match: { inRange: true, ok: true } },
          {
            $group: {
              _id: {
                dow: { $isoDayOfWeek: { date: "$createdAt", timezone: TZ } },
                slot: { $floor: { $divide: [{ $hour: { date: "$createdAt", timezone: TZ } }, 3] } },
              },
              count: { $sum: 1 },
            },
          },
        ],
        aspect: [
          { $match: { inRange: true, ok: true } },
          { $group: { _id: "$aspectRatio", count: { $sum: 1 } } },
        ],
      },
    },
  ]);

  const [productDocs, optionDocs, recentDocs] = await Promise.all([
    Product.find({ _id: { $in: facet.products.map((p) => p._id) } }).select("name").lean(),
    Option.find({ _id: { $in: facet.options.map((o) => o._id) } }).select("type label swatch").lean(),
    Generation.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .select("designCode product status sentToPageAt durationMs createdAt")
      .populate<{ product: { name: string } | null }>("product", "name")
      .lean(),
  ]);

  // เติมวันที่ไม่มีข้อมูลให้เป็น 0 เพื่อให้เส้นกราฟต่อเนื่อง
  const byDate = new Map(facet.daily.map((d) => [d._id, d]));
  const daily: DailyPoint[] = Array.from({ length: rangeDays }, (_, i) => {
    const date = bangkokDate(new Date(since.getTime() + i * DAY_MS));
    const d = byDate.get(date);
    return { date, success: d?.success ?? 0, sent: d?.sent ?? 0, failed: d?.failed ?? 0, cost: d?.cost ?? 0 };
  });

  const productName = new Map(productDocs.map((p) => [String(p._id), p.name]));
  const optionMeta = new Map(optionDocs.map((o) => [String(o._id), o]));
  const rankOptions = (type: OptionType): RankedItem[] =>
    facet.options
      .flatMap((o) => {
        const meta = optionMeta.get(String(o._id));
        return meta && meta.type === type
          ? [{ id: String(o._id), label: meta.label, count: o.count, swatch: meta.swatch ?? null }]
          : [];
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

  const heatmap = Array.from({ length: 7 }, () => Array<number>(8).fill(0));
  for (const h of facet.heatmap) heatmap[h._id.dow - 1][h._id.slot] = h.count;

  const current = facet.current[0];
  const today = facet.today[0];
  return {
    rangeDays,
    generatedAt: new Date().toISOString(),
    totals: {
      success: current?.success ?? 0,
      failed: current?.failed ?? 0,
      sent: current?.sent ?? 0,
      cost: current?.cost ?? 0,
      avgDurationMs: current?.avgDuration ?? null,
    },
    previous: {
      success: facet.previous[0]?.success ?? 0,
      sent: facet.previous[0]?.sent ?? 0,
      cost: facet.previous[0]?.cost ?? 0,
    },
    today: {
      success: today?.success ?? 0,
      yesterday: today?.yesterday ?? 0,
      spent: today?.spent ?? 0,
      budget: Number(process.env.DAILY_BUDGET_USD) || 10,
    },
    month: { success: facet.month[0]?.success ?? 0, cost: facet.month[0]?.cost ?? 0 },
    daily,
    topProducts: facet.products.map((p) => ({
      id: String(p._id),
      label: productName.get(String(p._id)) ?? "สินค้าที่ถูกลบ",
      count: p.count,
    })),
    topOptions: { style: rankOptions("style"), tone: rankOptions("tone"), pattern: rankOptions("pattern") },
    heatmap,
    aspect: ["1:1", "3:4", "16:9"].map((ratio) => ({
      ratio,
      count: facet.aspect.find((a) => a._id === ratio)?.count ?? 0,
    })),
    recent: recentDocs.map((g) => ({
      designCode: g.designCode,
      productName: g.product?.name ?? "สินค้าที่ถูกลบ",
      status: g.status as RecentGeneration["status"],
      sent: !!g.sentToPageAt,
      durationMs: g.durationMs ?? null,
      createdAt: new Date(g.createdAt).toISOString(),
    })),
  };
}
