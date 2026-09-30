import { isValidObjectId } from "mongoose";
import { getAdminSession } from "@/lib/auth";
import { deleteImage, uploadReferenceImage } from "@/lib/cloudinary";
import { connectDB } from "@/lib/db";
import { serializeProduct } from "@/lib/product";
import { badRequest, readImageField, readProductFields } from "@/lib/product-server";
import { fieldErrors, productPatchSchema } from "@/lib/validators";
import { Product } from "@/models/Product";

type Ctx = RouteContext<"/api/admin/products/[id]">;

const unauthorized = () => Response.json({ error: "Unauthorized" }, { status: 401 });
const notFound = () => Response.json({ error: "ไม่พบสินค้า" }, { status: 404 });

/** แก้ไขทั้งรายการ (multipart) — รูปใหม่ไม่บังคับ */
export async function PUT(request: Request, ctx: Ctx) {
  const session = await getAdminSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return notFound();

  const form = await request.formData().catch(() => null);
  if (!form) return badRequest({ form: "ส่งข้อมูลไม่ถูกต้อง" });

  await connectDB();
  const current = await Product.findById(String(id)).lean();
  if (!current) return notFound();

  const fields = await readProductFields(form);
  const image = await readImageField(form, false);
  if (!fields.ok || !image.ok) return badRequest({ ...(fields.ok ? {} : fields.fields), ...(image.ok ? {} : image.fields) });

  let uploaded: Awaited<ReturnType<typeof uploadReferenceImage>> | null = null;
  try {
    if (image.value) uploaded = await uploadReferenceImage(image.value);
    const doc = await Product.findByIdAndUpdate(
      current._id,
      { $set: { ...fields.value, ...(uploaded ? { refImage: uploaded } : {}) } },
      { returnDocument: "after", runValidators: true },
    ).lean();
    if (!doc) throw new Error("product disappeared during update");
    // ลบรูปเก่าหลังบันทึกรูปใหม่สำเร็จแล้วเท่านั้น
    if (uploaded) await deleteImage(current.refImage.publicId).catch((e) => console.error("[admin] delete old image failed", e));
    console.info(`[admin] ${session.user?.name} updated product ${id}${uploaded ? " (new image)" : ""}`);
    return Response.json({ product: serializeProduct(doc) });
  } catch (err) {
    if (uploaded) await deleteImage(uploaded.publicId).catch(() => {});
    console.error("[admin] update product failed", err);
    return Response.json({ error: "บันทึกไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }
}

/** เปิด/ปิดการแสดงผล (JSON) */
export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getAdminSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return notFound();

  const parsed = productPatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(fieldErrors(parsed.error));

  await connectDB();
  const doc = await Product.findByIdAndUpdate(String(id), { $set: parsed.data }, { returnDocument: "after" }).lean();
  if (!doc) return notFound();
  console.info(`[admin] ${session.user?.name} set product ${id} active=${parsed.data.active}`);
  return Response.json({ product: serializeProduct(doc) });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const session = await getAdminSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return notFound();

  await connectDB();
  const doc = await Product.findByIdAndDelete(String(id)).lean();
  if (!doc) return notFound();
  await deleteImage(doc.refImage.publicId).catch((e) => console.error("[admin] delete image failed", e));
  console.info(`[admin] ${session.user?.name} deleted product ${id}`);
  return Response.json({ ok: true });
}
