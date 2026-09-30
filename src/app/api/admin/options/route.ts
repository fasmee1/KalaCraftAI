import { getAdminSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { serializeOption } from "@/lib/option";
import { fieldErrors, optionInputSchema } from "@/lib/validators";
import { Option } from "@/models/Option";

export async function GET() {
  if (!(await getAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const docs = await Option.find().sort({ type: 1, sortOrder: 1, createdAt: 1 }).lean();
  return Response.json({ options: docs.map(serializeOption) });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = optionInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "ข้อมูลไม่ถูกต้อง", fields: fieldErrors(parsed.error) }, { status: 400 });
  }

  await connectDB();
  try {
    const doc = await Option.create(parsed.data);
    console.info(`[admin] ${session.user?.name} created option ${doc._id} (${doc.type}: ${doc.label})`);
    return Response.json({ option: serializeOption(doc.toObject()) }, { status: 201 });
  } catch (err) {
    console.error("[admin] create option failed", err);
    return Response.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  }
}
