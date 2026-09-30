import type { Types } from "mongoose";
import type { ProductDoc } from "@/models/Product";

export type ProductDTO = {
  id: string;
  name: string;
  categoryId: string;
  description: string;
  price: number | null;
  sortOrder: number;
  active: boolean;
  /** รูปต้นแบบผ่าน /api/images/[id] — ใส่ version กัน cache รูปเก่าหลังเปลี่ยนรูป */
  imageUrl: string;
  image: { width: number; height: number };
  updatedAt: string;
};

export const PRODUCT_FORM_KEYS = ["name", "category", "description", "price", "sortOrder", "active"] as const;

export function serializeProduct(doc: ProductDoc & { _id: Types.ObjectId }): ProductDTO {
  const id = String(doc._id);
  const version = doc.refImage.publicId.split("/").pop();
  return {
    id,
    name: doc.name,
    categoryId: String(doc.category),
    description: doc.description ?? "",
    price: doc.price ?? null,
    sortOrder: doc.sortOrder ?? 0,
    active: doc.active ?? true,
    imageUrl: `/api/images/${id}?v=${version}`,
    image: { width: doc.refImage.width, height: doc.refImage.height },
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}
