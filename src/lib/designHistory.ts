// ประวัติดีไซน์ของลูกค้าที่ล็อกอิน — ใช้ทั้ง server (API) และ client (ไม่มี server-only)
// ประวัติมีเฉพาะดีไซน์ที่ลูกค้ากด "บันทึกลงประวัติ" — รูปดูผ่าน /api/me/generations/[code]/image

/** จำนวนดีไซน์ที่บันทึกไว้ได้ต่อบัญชี — บันทึกเกินแล้วรูปของรายการเก่าสุดถูกลบ (lib/savedDesigns.ts) */
export const HISTORY_LIMIT = 50;

/** ขนาดรูปสูงสุดที่รับบันทึก และความยาว base64 ของรูปขนาดนั้น */
export const MAX_SAVED_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_SAVED_IMAGE_BASE64 = Math.ceil(MAX_SAVED_IMAGE_BYTES / 3) * 4;

export type HistoryItem = {
  designCode: string;
  aspectRatio: string;
  createdAt: string;
  sentToPage: boolean;
  /** null = สินค้าถูกลบไปแล้ว */
  product: { name: string; imageUrl: string } | null;
  labels: string[];
  imageUrl: string;
};

type PopulatedGeneration = {
  designCode: string;
  aspectRatio: string;
  createdAt: Date;
  sentToPageAt?: Date | null;
  product: { _id: unknown; name: string; refImage?: { publicId?: string | null } | null } | null;
  options: ({ label: string } | null)[];
  savedImage: { publicId: string };
};

/** เลือกเฉพาะ field ที่ลูกค้าเห็นได้ — ไม่มี finalPrompt, ipHash, cost, publicId ของรูป */
export function toHistoryItem(doc: PopulatedGeneration): HistoryItem {
  const { product } = doc;
  return {
    designCode: doc.designCode,
    aspectRatio: doc.aspectRatio,
    createdAt: doc.createdAt.toISOString(),
    sentToPage: Boolean(doc.sentToPageAt),
    product: product
      ? {
          name: product.name,
          imageUrl: `/api/images/${String(product._id)}?v=${product.refImage?.publicId?.split("/").pop() ?? ""}`,
        }
      : null,
    labels: doc.options.flatMap((o) => (o ? [o.label] : [])),
    // v = กัน cache รูปเก่าถ้าลบแล้วบันทึกใหม่
    imageUrl: `/api/me/generations/${doc.designCode}/image?v=${doc.savedImage.publicId.split("/").pop()}`,
  };
}
