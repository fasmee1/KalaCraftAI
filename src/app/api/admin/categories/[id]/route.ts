import { isValidObjectId } from "mongoose";
import { getAdminSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { categoryPatchSchema, fieldErrors } from "@/lib/validators";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { isDuplicateKeyError, serializeCategory } from "@/lib/category";

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/categories/[id]">) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return Response.json({ error: "ไม่พบข้อมูล" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = categoryPatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "ข้อมูลไม่ถูกต้อง", fields: fieldErrors(parsed.error) }, { status: 400 });
  }

  await connectDB();
  try {
    const doc = await Category.findByIdAndUpdate(String(id), { $set: parsed.data }, { returnDocument: "after", runValidators: true }).lean();
    if (!doc) return Response.json({ error: "ไม่พบข้อมูล" }, { status: 404 });
    console.info(`[admin] ${session.user?.name} updated category ${id}: ${Object.keys(parsed.data).join(", ")}`);
    return Response.json({ category: serializeCategory(doc) });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return Response.json({ error: "ชื่อหรือ slug นี้มีอยู่แล้ว", fields: { slug: "ชื่อหรือ slug ซ้ำกับที่มีอยู่" } }, { status: 409 });
    }
    console.error("[admin] update category failed", err);
    return Response.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/admin/categories/[id]">) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return Response.json({ error: "ไม่พบข้อมูล" }, { status: 404 });

  await connectDB();
  const inUse = await Product.countDocuments({ category: String(id) });
  if (inUse > 0) {
    return Response.json(
      { error: `ลบไม่ได้ เพราะมีสินค้า ${inUse} รายการใช้ประเภทนี้อยู่ ให้ย้ายหรือลบสินค้าก่อน หรือปิดสถานะแทน` },
      { status: 409 },
    );
  }
  const doc = await Category.findByIdAndDelete(String(id)).lean();
  if (!doc) return Response.json({ error: "ไม่พบข้อมูล" }, { status: 404 });
  console.info(`[admin] ${session.user?.name} deleted category ${id} (${doc.slug})`);
  return Response.json({ ok: true });
}
