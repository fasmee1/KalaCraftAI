import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { OPTION_TYPE_KEYS, PATTERN_PREVIEWS } from "@/lib/optionTypes";

// ตัวเลือกดีไซน์ (สไตล์/โทนสี/ลวดลาย ฯลฯ) — promptText เป็นภาษาอังกฤษที่ส่งให้ AI, ลูกค้าเห็นแค่ label
const OptionSchema = new Schema(
  {
    type: { type: String, required: true, enum: OPTION_TYPE_KEYS, index: true },
    label: { type: String, required: true, trim: true },
    promptText: { type: String, required: true, trim: true },
    // สีตัวอย่างสำหรับโทนสี (#rrggbb)
    swatch: { type: String, default: null },
    // ภาพตัวอย่างของลวดลาย (วาดด้วย CSS ฝั่ง client)
    preview: { type: String, enum: [...PATTERN_PREVIEWS, null], default: null },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type OptionDoc = InferSchemaType<typeof OptionSchema>;

export const Option: Model<OptionDoc> = models.Option || model<OptionDoc>("Option", OptionSchema);
