import { getCustomerId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { HISTORY_LIMIT, toHistoryItem } from "@/lib/designHistory";
import { Generation } from "@/models/Generation";
import "@/models/Option";
import "@/models/Product";

/** ประวัติดีไซน์ของลูกค้าที่ล็อกอินด้วย Google — เฉพาะของบัญชีตัวเอง และเฉพาะที่สร้างสำเร็จ (ไม่มีรูป) */
export async function GET() {
  const customerId = await getCustomerId();
  if (!customerId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const docs = await Generation.find({ customer: String(customerId), status: "success" })
      .sort({ createdAt: -1 })
      .limit(HISTORY_LIMIT)
      .select("designCode aspectRatio createdAt sentToPageAt product options")
      .populate<{ product: { _id: unknown; name: string; refImage?: { publicId?: string } } | null }>(
        "product",
        "name refImage.publicId",
      )
      .populate<{ options: ({ label: string } | null)[] }>("options", "label")
      .lean();

    return Response.json(
      { items: docs.map((doc) => toHistoryItem(doc)) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    console.error("[history] load failed", err instanceof Error ? err.message : err);
    return Response.json({ error: "โหลดประวัติไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }
}
