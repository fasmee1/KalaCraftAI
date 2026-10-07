import { getCustomerId } from "@/lib/auth";
import { deleteImage, fetchReferenceImage, uploadDesignImage } from "@/lib/cloudinary";
import { connectDB } from "@/lib/db";
import { DESIGN_CODE_PATTERN } from "@/lib/designCode";
import { matchSavedImage } from "@/lib/designImage";
import { pruneSavedImages } from "@/lib/savedDesigns";
import { saveDesignImageSchema } from "@/lib/validators";
import { Generation } from "@/models/Generation";

// รูปผลลัพธ์ที่ลูกค้ากด "บันทึกลงประวัติ" — เก็บบน Cloudinary แบบ authenticated ดูได้เฉพาะเจ้าของบัญชีผ่าน route นี้
const DISPLAY_MAX_SIDE = 800;
const DOWNLOAD_MAX_SIDE = 2048;

type Ctx = RouteContext<"/api/me/generations/[code]/image">;

const error = (message: string, status: number) => Response.json({ error: message }, { status });

/** ดีไซน์ที่สร้างสำเร็จของบัญชีนี้เท่านั้น — ไม่ใช่เจ้าของ = หาไม่เจอ (ไม่บอกว่ามีรหัสนี้อยู่) */
async function findOwnDesign(ctx: Ctx) {
  const customerId = await getCustomerId();
  if (!customerId) return { response: error("Unauthorized", 401) };
  const { code } = await ctx.params;
  if (!DESIGN_CODE_PATTERN.test(code)) return { response: error("Not found", 404) };

  await connectDB();
  const design = await Generation.findOne({ designCode: String(code), customer: String(customerId), status: "success" })
    .select("designCode imageHash savedImage")
    .lean();
  return design ? { design, customerId } : { response: error("Not found", 404) };
}

/** บันทึกรูปลงประวัติ — รับเฉพาะรูปที่ hash ตรงกับรูปที่ AI สร้างให้ดีไซน์นี้ */
export async function POST(request: Request, ctx: Ctx) {
  const found = await findOwnDesign(ctx);
  if (found.response) return found.response;
  const { design, customerId } = found;
  if (design.savedImage?.publicId) return Response.json({ saved: true });

  const parsed = saveDesignImageSchema.safeParse(await request.json().catch(() => null));
  const image = parsed.success ? matchSavedImage(parsed.data.imageBase64, design.imageHash) : null;
  if (!image) return error("บันทึกรูปนี้ไม่ได้ กรุณาดาวน์โหลดภาพแทน", 400);

  try {
    const stored = await uploadDesignImage(image);
    const savedImage = { publicId: stored.publicId, bytes: stored.bytes, width: stored.width, height: stored.height };
    // กดซ้ำพร้อมกันสองครั้ง → ครั้งที่แพ้ลบรูปที่เพิ่งอัปทิ้ง
    const res = await Generation.updateOne({ _id: design._id, savedImage: null }, { savedImage, savedAt: new Date() });
    if (res.modifiedCount === 0) await deleteImage(stored.publicId);
    else console.info(`[designs] ${design.designCode} saved by ${customerId} (${stored.bytes} bytes)`);
  } catch (err) {
    console.error(`[designs] ${design.designCode} save failed`, err instanceof Error ? err.message : err);
    return error("บันทึกไม่สำเร็จ กรุณาลองใหม่", 502);
  }

  await pruneSavedImages(customerId);
  return Response.json({ saved: true });
}

/** รูปที่บันทึกไว้ — ?download=1 = ไฟล์ใหญ่พร้อมชื่อไฟล์ */
export async function GET(request: Request, ctx: Ctx) {
  const found = await findOwnDesign(ctx);
  if (found.response) return found.response;
  const { design } = found;
  if (!design.savedImage?.publicId) return error("Not found", 404);

  const download = new URL(request.url).searchParams.has("download");
  try {
    const image = await fetchReferenceImage(
      design.savedImage.publicId,
      download ? DOWNLOAD_MAX_SIDE : DISPLAY_MAX_SIDE,
      "jpg",
    );
    return new Response(new Uint8Array(image.data), {
      headers: {
        "Content-Type": image.mimeType,
        // รูปส่วนตัวของลูกค้า — ห้าม CDN เก็บ
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        ...(download && { "Content-Disposition": `attachment; filename="${design.designCode}.jpg"` }),
      },
    });
  } catch (err) {
    console.error(`[designs] ${design.designCode} load failed`, err instanceof Error ? err.message : err);
    return error("โหลดรูปไม่สำเร็จ", 502);
  }
}

/** ลูกค้าลบรูปออกจากประวัติ — รายการดีไซน์ยังอยู่ */
export async function DELETE(_request: Request, ctx: Ctx) {
  const found = await findOwnDesign(ctx);
  if (found.response) return found.response;
  const { design } = found;
  const publicId = design.savedImage?.publicId;
  if (!publicId) return Response.json({ ok: true });

  try {
    await deleteImage(publicId);
    await Generation.updateOne({ _id: design._id }, { savedImage: null, savedAt: null });
    console.info(`[designs] ${design.designCode} image deleted by owner`);
    return Response.json({ ok: true });
  } catch (err) {
    console.error(`[designs] ${design.designCode} delete failed`, err instanceof Error ? err.message : err);
    return error("ลบรูปไม่สำเร็จ กรุณาลองใหม่", 502);
  }
}
