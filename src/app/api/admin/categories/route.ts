import { getAdminSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { categoryInputSchema, fieldErrors } from "@/lib/validators";
import { Category } from "@/models/Category";
import { isDuplicateKeyError, serializeCategory } from "@/lib/category";

export async function GET() {
  if (!(await getAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const docs = await Category.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
  return Response.json({ categories: docs.map(serializeCategory) });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = categoryInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "ข้อมูลไม่ถูกต้อง", fields: fieldErrors(parsed.error) }, { status: 400 });
  }

  await connectDB();
  try {
    const doc = await Category.create(parsed.data);
    console.info(`[admin] ${session.user?.name} created category ${doc._id} (${doc.slug})`);
    return Response.json({ category: serializeCategory(doc.toObject()) }, { status: 201 });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return Response.json({ error: "ชื่อหรือ slug นี้มีอยู่แล้ว", fields: { slug: "ชื่อหรือ slug ซ้ำกับที่มีอยู่" } }, { status: 409 });
    }
    console.error("[admin] create category failed", err);
    return Response.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  }
}
