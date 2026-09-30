import { isValidObjectId } from "mongoose";
import { getAdminSession } from "@/lib/auth";
import { signedImageUrl } from "@/lib/cloudinary";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";

const URL_TTL_SECONDS = 300;

/**
 * รูปต้นแบบสินค้า — redirect ไป signed URL ที่หมดอายุใน 5 นาที
 * ลูกค้าเห็นได้เฉพาะสินค้าที่ active; สินค้าที่ปิดอยู่ดูได้เฉพาะแอดมิน
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/images/[id]">) {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return new Response("Not found", { status: 404 });

  await connectDB();
  const product = await Product.findById(String(id)).select("refImage active").lean();
  if (!product) return new Response("Not found", { status: 404 });
  if (!product.active && !(await getAdminSession())) return new Response("Not found", { status: 404 });

  const url = signedImageUrl(product.refImage.publicId, product.refImage.format, URL_TTL_SECONDS);
  return new Response(null, {
    status: 302,
    headers: { Location: url, "Cache-Control": `private, max-age=${URL_TTL_SECONDS - 60}` },
  });
}
