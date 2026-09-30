import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const RefImageSchema = new Schema(
  {
    publicId: { type: String, required: true },
    format: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    bytes: { type: Number, required: true },
  },
  { _id: false },
);

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    description: { type: String, default: "" },
    price: { type: Number, default: null, min: 0 },
    // รูปต้นแบบใน Cloudinary — ส่งให้ Gemini แก้ทุกครั้งที่สร้างดีไซน์
    refImage: { type: RefImageSchema, required: true },
    // prompt หลักของสินค้า (ภาษาอังกฤษ) — ต่อหน้า promptText ของตัวเลือกใน lib/prompt.ts
    basePrompt: { type: String, default: "", trim: true },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type ProductDoc = InferSchemaType<typeof ProductSchema>;

export const Product: Model<ProductDoc> = models.Product || model<ProductDoc>("Product", ProductSchema);
