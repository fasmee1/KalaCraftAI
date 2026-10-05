import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./defineModel";

// ลูกค้าที่ล็อกอินด้วย Google — เก็บแค่ชื่อและอีเมล (ไม่เก็บรูปโปรไฟล์หรือ token ของ Google)
const CustomerSchema = new Schema(
  {
    // `sub` ของ Google — ไม่เปลี่ยนแม้ลูกค้าเปลี่ยนอีเมล
    googleSub: { type: String, required: true, unique: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, default: "", trim: true },
    lastLoginAt: { type: Date, default: null },
    // สินค้าที่กดหัวใจไว้ (รายการโปรด)
    favorites: [{ type: Schema.Types.ObjectId, ref: "Product" }],
  },
  { timestamps: true },
);

export type CustomerDoc = InferSchemaType<typeof CustomerSchema>;

export const Customer = defineModel<CustomerDoc>("Customer", CustomerSchema);
