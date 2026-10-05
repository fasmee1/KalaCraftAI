// ประวัติดีไซน์ของลูกค้าที่ล็อกอิน — ใช้ทั้ง server (API) และ client (ไม่มี server-only)
// server เก็บแค่ metadata; รูปผลลัพธ์อยู่ใน IndexedDB ของเบราว์เซอร์ลูกค้าเท่านั้น

/** จำนวนรายการล่าสุดที่แสดง และจำนวนรูปสูงสุดที่เก็บในเครื่องลูกค้า */
export const HISTORY_LIMIT = 50;

export type HistoryItem = {
  designCode: string;
  aspectRatio: string;
  createdAt: string;
  sentToPage: boolean;
  /** null = สินค้าถูกลบไปแล้ว */
  product: { name: string; imageUrl: string } | null;
  labels: string[];
};

type PopulatedGeneration = {
  designCode: string;
  aspectRatio: string;
  createdAt: Date;
  sentToPageAt?: Date | null;
  product: { _id: unknown; name: string; refImage?: { publicId?: string | null } | null } | null;
  options: ({ label: string } | null)[];
};

/** เลือกเฉพาะ field ที่ลูกค้าเห็นได้ — ไม่มี finalPrompt, ipHash, cost */
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
  };
}

/** รหัสของรูปที่ต้องลบออกจากเครื่องเมื่อเกินจำนวนสูงสุด — ลบจากเก่าสุด */
export function evictionCodes(entries: { designCode: string; createdAt: number }[], max = HISTORY_LIMIT): string[] {
  if (entries.length <= max) return [];
  return [...entries]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(max)
    .map((e) => e.designCode);
}
