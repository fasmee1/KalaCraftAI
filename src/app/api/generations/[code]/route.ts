import { connectDB } from "@/lib/db";
import { DESIGN_CODE_PATTERN } from "@/lib/designCode";
import { Generation } from "@/models/Generation";

/** ลูกค้ากด "ส่งให้เพจ" — บันทึกเวลาไว้นับสถิติใน dashboard (ไม่คืนข้อมูลอื่น) */
export async function POST(_request: Request, ctx: RouteContext<"/api/generations/[code]">) {
  const { code } = await ctx.params;
  if (!DESIGN_CODE_PATTERN.test(code)) return Response.json({ error: "Not found" }, { status: 404 });

  await connectDB();
  const res = await Generation.updateOne(
    { designCode: String(code), status: "success", sentToPageAt: null },
    { sentToPageAt: new Date() },
  );
  const found = res.matchedCount > 0 || (await Generation.exists({ designCode: String(code), status: "success" }));
  return found ? Response.json({ ok: true }) : Response.json({ error: "Not found" }, { status: 404 });
}
