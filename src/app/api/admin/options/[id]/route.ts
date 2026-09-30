import { isValidObjectId } from "mongoose";
import { getAdminSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { serializeOption } from "@/lib/option";
import { fieldErrors, optionInputSchema } from "@/lib/validators";
import { Generation } from "@/models/Generation";
import { Option } from "@/models/Option";

const EDITABLE_KEYS = ["type", "label", "promptText", "swatch", "preview", "sortOrder", "active"] as const;

/** แก้บางช่องได้ (เช่นแค่ active) — รวมกับค่าเดิมแล้ว validate ทั้งก้อน เพื่อให้ swatch/preview ตรงกับ type เสมอ */
export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/options/[id]">) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return Response.json({ error: "ไม่พบข้อมูล" }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

  await connectDB();
  const existing = await Option.findById(String(id)).lean();
  if (!existing) return Response.json({ error: "ไม่พบข้อมูล" }, { status: 404 });

  const current = serializeOption(existing);
  const merged: Record<string, unknown> = {};
  for (const key of EDITABLE_KEYS) merged[key] = key in body ? (body as Record<string, unknown>)[key] : current[key];

  const parsed = optionInputSchema.safeParse(merged);
  if (!parsed.success) {
    return Response.json({ error: "ข้อมูลไม่ถูกต้อง", fields: fieldErrors(parsed.error) }, { status: 400 });
  }

  try {
    const doc = await Option.findByIdAndUpdate(String(id), { $set: parsed.data }, { returnDocument: "after", runValidators: true }).lean();
    if (!doc) return Response.json({ error: "ไม่พบข้อมูล" }, { status: 404 });
    const changed = EDITABLE_KEYS.filter((k) => k in body).join(", ");
    console.info(`[admin] ${session.user?.name} updated option ${id}: ${changed}`);
    return Response.json({ option: serializeOption(doc) });
  } catch (err) {
    console.error("[admin] update option failed", err);
    return Response.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  }
}

/** ลบได้เฉพาะตัวเลือกที่ยังไม่เคยถูกใช้สร้างภาพ — ที่เคยใช้แล้วให้ปิดสถานะแทน เพื่อไม่ให้ประวัติ generations เสีย */
export async function DELETE(_request: Request, ctx: RouteContext<"/api/admin/options/[id]">) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return Response.json({ error: "ไม่พบข้อมูล" }, { status: 404 });

  await connectDB();
  const used = await Generation.countDocuments({ options: String(id) });
  if (used > 0) {
    return Response.json(
      { error: `ลบไม่ได้ เพราะตัวเลือกนี้ถูกใช้สร้างภาพไปแล้ว ${used} ครั้ง ให้ปิดสถานะแทนเพื่อเก็บประวัติไว้` },
      { status: 409 },
    );
  }
  const doc = await Option.findByIdAndDelete(String(id)).lean();
  if (!doc) return Response.json({ error: "ไม่พบข้อมูล" }, { status: 404 });
  console.info(`[admin] ${session.user?.name} deleted option ${id} (${doc.type}: ${doc.label})`);
  return Response.json({ ok: true });
}
