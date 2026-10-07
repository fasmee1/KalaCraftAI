import "server-only";
import { deleteImage } from "@/lib/cloudinary";
import { HISTORY_LIMIT } from "@/lib/designHistory";
import { Generation } from "@/models/Generation";

/**
 * ลบรูปที่บันทึกไว้เกิน HISTORY_LIMIT รายการล่าสุดของบัญชี — หน้า "ดีไซน์ของฉัน" ไม่แสดงรายการนั้นแล้ว
 * ไม่ throw: ลบไม่สำเร็จรอบนี้ รอบหน้าลบใหม่
 */
export async function pruneSavedImages(customerId: string) {
  try {
    const stale = await Generation.find({
      customer: String(customerId),
      status: "success",
      "savedImage.publicId": { $type: "string" },
    })
      .sort({ createdAt: -1 })
      .skip(HISTORY_LIMIT)
      .select("savedImage.publicId")
      .lean();
    for (const doc of stale) {
      const publicId = doc.savedImage?.publicId;
      if (!publicId) continue;
      await deleteImage(publicId);
      await Generation.updateOne({ _id: doc._id }, { savedImage: null, savedAt: null });
    }
  } catch (err) {
    console.error("[designs] prune failed", err instanceof Error ? err.message : err);
  }
}
