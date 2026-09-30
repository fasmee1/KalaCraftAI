import { getAdminSession } from "@/lib/auth";
import { deleteImage, uploadReferenceImage } from "@/lib/cloudinary";
import { connectDB } from "@/lib/db";
import { serializeProduct } from "@/lib/product";
import { badRequest, readImageField, readProductFields } from "@/lib/product-server";
import { Product } from "@/models/Product";

export async function GET() {
  if (!(await getAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const docs = await Product.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
  return Response.json({ products: docs.map(serializeProduct) });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  if (!form) return badRequest({ form: "ส่งข้อมูลไม่ถูกต้อง" });

  await connectDB();
  const fields = await readProductFields(form);
  const image = await readImageField(form, true);
  if (!fields.ok || !image.ok) return badRequest({ ...(fields.ok ? {} : fields.fields), ...(image.ok ? {} : image.fields) });

  let uploaded: Awaited<ReturnType<typeof uploadReferenceImage>> | null = null;
  try {
    uploaded = await uploadReferenceImage(image.value!);
    const doc = await Product.create({ ...fields.value, refImage: uploaded });
    console.info(`[admin] ${session.user?.name} created product ${doc._id}`);
    return Response.json({ product: serializeProduct(doc.toObject()) }, { status: 201 });
  } catch (err) {
    if (uploaded) await deleteImage(uploaded.publicId).catch(() => {});
    console.error("[admin] create product failed", err);
    return Response.json({ error: "บันทึกไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }
}
