import { isValidObjectId } from "mongoose";
import { getAdminSession } from "@/lib/auth";
import { fetchReferenceImage } from "@/lib/cloudinary";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";

// รูปที่แสดงบนหน้าเว็บ (การ์ด/popup) — ย่อให้พอดีจอ ไม่ส่งไฟล์ต้นฉบับเต็มขนาด
const DISPLAY_MAX_SIDE = 800;
const DOWNLOAD_MAX_SIDE = 1600;
// URL มี ?v=<publicId> เปลี่ยนรูปเมื่อไหร่ URL เปลี่ยน → cache ได้นาน (รวม CDN ของ host)
const PUBLIC_CACHE = "public, max-age=86400, s-maxage=86400";
const PRIVATE_CACHE = "private, max-age=300";

/** ชื่อไฟล์จากชื่อสินค้า — ตัดอักขระที่ใช้ในชื่อไฟล์ไม่ได้ */
function downloadName(name: string) {
  const safe = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").trim().slice(0, 80) || "product";
  return `KalaCraft-${safe}.jpg`;
}

/**
 * รูปต้นแบบสินค้า — ส่งไฟล์ JPEG ที่ย่อแล้วจาก origin เดียวกัน (เบราว์เซอร์ไม่เห็น URL ของ Cloudinary)
 * ?download=1 → ไฟล์ใหญ่ขึ้น + ชื่อไฟล์ ให้ลูกค้าบันทึก/แชร์
 *   URL ของ Cloudinary สร้างจาก publicId ใน DB เท่านั้น ไม่รับ URL จากผู้ใช้ (กัน SSRF)
 * ลูกค้าเห็นได้เฉพาะสินค้าที่ active; สินค้าที่ปิดอยู่ดูได้เฉพาะแอดมิน (ไม่ให้ CDN cache)
 */
export async function GET(request: Request, ctx: RouteContext<"/api/images/[id]">) {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return new Response("Not found", { status: 404 });

  await connectDB();
  const product = await Product.findById(String(id)).select("name refImage active").lean();
  if (!product) return new Response("Not found", { status: 404 });
  if (!product.active && !(await getAdminSession())) return new Response("Not found", { status: 404 });

  const download = new URL(request.url).searchParams.has("download");
  try {
    const image = await fetchReferenceImage(
      product.refImage.publicId,
      download ? DOWNLOAD_MAX_SIDE : DISPLAY_MAX_SIDE,
      "jpg",
    );
    return new Response(new Uint8Array(image.data), {
      headers: {
        "Content-Type": image.mimeType,
        "Cache-Control": download || !product.active ? PRIVATE_CACHE : PUBLIC_CACHE,
        "X-Content-Type-Options": "nosniff",
        ...(download && {
          "Content-Disposition": `attachment; filename="product.jpg"; filename*=UTF-8''${encodeURIComponent(downloadName(product.name))}`,
        }),
      },
    });
  } catch (err) {
    console.error(`[images] ${id} failed`, err instanceof Error ? err.message : err);
    return new Response("โหลดรูปไม่สำเร็จ", { status: 502 });
  }
}
