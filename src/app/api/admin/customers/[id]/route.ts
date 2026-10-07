import { isValidObjectId } from "mongoose";
import { getAdminSession } from "@/lib/auth";
import { deleteImage } from "@/lib/cloudinary";
import { connectDB } from "@/lib/db";
import { customerPatchSchema } from "@/lib/validators";
import { Customer } from "@/models/Customer";
import { Generation } from "@/models/Generation";

type Ctx = RouteContext<"/api/admin/customers/[id]">;

/** ระงับ / ปลดระงับบัญชีลูกค้า */
export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return Response.json({ error: "ไม่พบข้อมูล" }, { status: 404 });

  const parsed = customerPatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  const { suspended } = parsed.data;

  await connectDB();
  const doc = await Customer.findByIdAndUpdate(
    String(id),
    { $set: { suspendedAt: suspended ? new Date() : null } },
    { returnDocument: "after" },
  )
    .select("_id")
    .lean();
  if (!doc) return Response.json({ error: "ไม่พบข้อมูล" }, { status: 404 });
  console.info(`[admin] ${session.user?.name} ${suspended ? "suspended" : "unsuspended"} customer ${id}`);
  return Response.json({ suspended });
}

/**
 * ลบบัญชีลูกค้า — ลบรูปที่บันทึกไว้บน Cloudinary + ข้อมูลบัญชี (รวมรายการโปรด)
 * ประวัติการสร้าง (generations) เก็บไว้เป็นสถิติ แต่ตัดการผูกกับบัญชีออก
 */
export async function DELETE(_request: Request, ctx: Ctx) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return Response.json({ error: "ไม่พบข้อมูล" }, { status: 404 });

  await connectDB();
  if (!(await Customer.exists({ _id: String(id) }))) return Response.json({ error: "ไม่พบข้อมูล" }, { status: 404 });

  try {
    // ลบรูปก่อน — ถ้าล้มกลางทาง บัญชียังอยู่ให้กดลบซ้ำได้ ไม่เหลือรูปกำพร้าบน Cloudinary
    const saved = await Generation.find({ customer: String(id), "savedImage.publicId": { $type: "string" } })
      .select("savedImage.publicId")
      .lean();
    for (const doc of saved) {
      const publicId = doc.savedImage?.publicId;
      if (!publicId) continue;
      await deleteImage(publicId);
      await Generation.updateOne({ _id: doc._id }, { savedImage: null, savedAt: null });
    }
    await Generation.updateMany({ customer: String(id) }, { customer: null });
    await Customer.deleteOne({ _id: String(id) });
    console.info(`[admin] ${session.user?.name} deleted customer ${id} (${saved.length} saved images removed)`);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[admin] delete customer failed", err instanceof Error ? err.message : err);
    return Response.json({ error: "ลบไม่สำเร็จ กรุณาลองใหม่" }, { status: 502 });
  }
}
