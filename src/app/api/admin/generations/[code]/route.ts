import { getAdminSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { DESIGN_CODE_PATTERN } from "@/lib/designCode";
import { OPTION_TYPES } from "@/lib/optionTypes";
import { Generation } from "@/models/Generation";
import { Option } from "@/models/Option";

export type GenerationLookup = {
  designCode: string;
  status: "pending" | "success" | "failed";
  createdAt: string;
  sentToPageAt: string | null;
  product: { id: string; name: string } | null;
  options: { type: string; typeLabel: string; label: string }[];
  note: string;
  aspectRatio: string;
  finalPrompt: string;
  provider: string;
  model: string | null;
  durationMs: number | null;
  costUsd: number;
  error: string | null;
};

/** ค้นหาด้วย designCode ที่ลูกค้าส่งมาในแชท — แอดมินเห็นสินค้า ตัวเลือก prompt และเวลา (ไม่มีรูป) */
export async function GET(_request: Request, ctx: RouteContext<"/api/admin/generations/[code]">) {
  if (!(await getAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const code = (await ctx.params).code.trim().toUpperCase();
  if (!DESIGN_CODE_PATTERN.test(code)) {
    return Response.json({ error: "รูปแบบรหัสไม่ถูกต้อง (เช่น KC-7H3K9P)" }, { status: 400 });
  }

  await connectDB();
  const g = await Generation.findOne({ designCode: String(code) })
    .populate<{ product: { _id: unknown; name: string } | null }>("product", "name")
    .lean();
  if (!g) return Response.json({ error: `ไม่พบรหัส ${code}` }, { status: 404 });

  const options = await Option.find({ _id: { $in: g.options } }).select("type label").lean();
  const typeOrder = new Map(OPTION_TYPES.map((t, i) => [t.key as string, i]));
  const typeLabel = new Map(OPTION_TYPES.map((t) => [t.key as string, t.label]));

  const body: GenerationLookup = {
    designCode: g.designCode,
    status: g.status as GenerationLookup["status"],
    createdAt: new Date(g.createdAt).toISOString(),
    sentToPageAt: g.sentToPageAt ? new Date(g.sentToPageAt).toISOString() : null,
    product: g.product ? { id: String(g.product._id), name: g.product.name } : null,
    options: options
      .sort((a, b) => (typeOrder.get(a.type) ?? 99) - (typeOrder.get(b.type) ?? 99))
      .map((o) => ({ type: o.type, typeLabel: typeLabel.get(o.type) ?? o.type, label: o.label })),
    note: g.note ?? "",
    aspectRatio: g.aspectRatio,
    finalPrompt: g.finalPrompt,
    provider: g.provider,
    model: g.model ?? null,
    durationMs: g.durationMs ?? null,
    costUsd: g.costUsd ?? 0,
    error: g.error ?? null,
  };
  return Response.json(body);
}
