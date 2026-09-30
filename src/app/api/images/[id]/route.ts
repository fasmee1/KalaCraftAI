import { isValidObjectId } from "mongoose";
import { getAdminSession } from "@/lib/auth";
import { fetchReferenceImage, signedImageUrl } from "@/lib/cloudinary";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";

const URL_TTL_SECONDS = 300;
const DOWNLOAD_MAX_SIDE = 1600;

/** ชื่อไฟล์จากชื่อสินค้า — ตัดอักขระที่ใช้ในชื่อไฟล์ไม่ได้ */
function downloadName(name: string) {
  const safe = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").trim().slice(0, 80) || "product";
  return `KalaCraft-${safe}.jpg`;
}

/**
 * รูปต้นแบบสินค้า — redirect ไป signed URL ที่หมดอายุใน 5 นาที
 * ?download=1 → ส่งไฟล์ JPEG จาก origin เดียวกัน (ให้ลูกค้าบันทึก/แชร์ได้ เพราะ Cloudinary อยู่ต่าง origin)
 *   URL ของ Cloudinary สร้างจาก publicId ใน DB เท่านั้น ไม่รับ URL จากผู้ใช้ (กัน SSRF)
 * ลูกค้าเห็นได้เฉพาะสินค้าที่ active; สินค้าที่ปิดอยู่ดูได้เฉพาะแอดมิน
 */
export async function GET(request: Request, ctx: RouteContext<"/api/images/[id]">) {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return new Response("Not found", { status: 404 });

  await connectDB();
  const product = await Product.findById(String(id)).select("name refImage active").lean();
  if (!product) return new Response("Not found", { status: 404 });
  if (!product.active && !(await getAdminSession())) return new Response("Not found", { status: 404 });

  if (new URL(request.url).searchParams.has("download")) {
    try {
      const image = await fetchReferenceImage(product.refImage.publicId, DOWNLOAD_MAX_SIDE, "jpg");
      return new Response(new Uint8Array(image.data), {
        headers: {
          "Content-Type": image.mimeType,
          "Content-Disposition": `attachment; filename="product.jpg"; filename*=UTF-8''${encodeURIComponent(downloadName(product.name))}`,
          "Cache-Control": `private, max-age=${URL_TTL_SECONDS}`,
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (err) {
      console.error(`[images] download ${id} failed`, err instanceof Error ? err.message : err);
      return new Response("ดาวน์โหลดไม่สำเร็จ", { status: 502 });
    }
  }

  const url = signedImageUrl(product.refImage.publicId, product.refImage.format, URL_TTL_SECONDS);
  return new Response(null, {
    status: 302,
    headers: { Location: url, "Cache-Control": `private, max-age=${URL_TTL_SECONDS - 60}` },
  });
}
