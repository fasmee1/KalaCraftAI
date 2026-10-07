import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./defineModel";

// ประวัติการสร้างดีไซน์ — เก็บ metadata; รูปผลลัพธ์เก็บเฉพาะเมื่อลูกค้าที่ล็อกอินกด "บันทึกลงประวัติ" (อยู่บน Cloudinary)
const SavedImageSchema = new Schema(
  {
    publicId: { type: String, required: true },
    bytes: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
  },
  { _id: false },
);

const GenerationSchema = new Schema(
  {
    designCode: { type: String, required: true, unique: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    options: [{ type: Schema.Types.ObjectId, ref: "Option" }],
    note: { type: String, default: "" },
    aspectRatio: { type: String, required: true },
    finalPrompt: { type: String, required: true },
    provider: { type: String, required: true },
    model: { type: String, default: null },
    // pending = กำลังสร้าง (นับโควตา), failed = ไม่นับโควตาลูกค้า
    status: { type: String, required: true, enum: ["pending", "success", "failed"], default: "pending" },
    costUsd: { type: Number, default: 0 },
    durationMs: { type: Number, default: null },
    error: { type: String, default: null },
    // SHA-256(IP + salt) — ห้ามเก็บ IP ดิบ
    ipHash: { type: String, required: true },
    // ลูกค้าที่ล็อกอินด้วย Google ตอนสร้าง — null = ไม่ได้ล็อกอิน
    customer: { type: Schema.Types.ObjectId, ref: "Customer", default: null },
    sentToPageAt: { type: Date, default: null },
    // SHA-256 ของรูปที่ AI สร้าง — ใช้ยืนยันรูปที่ลูกค้าส่งกลับมาบันทึก (lib/designImage.ts)
    imageHash: { type: String, default: null },
    savedImage: { type: SavedImageSchema, default: null },
    savedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

GenerationSchema.index({ ipHash: 1, createdAt: -1 });
GenerationSchema.index({ customer: 1, createdAt: -1 });
GenerationSchema.index({ createdAt: -1, status: 1 });

export type GenerationDoc = InferSchemaType<typeof GenerationSchema>;

export const Generation = defineModel<GenerationDoc>("Generation", GenerationSchema);
