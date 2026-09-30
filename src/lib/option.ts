import type { Types } from "mongoose";
import type { OptionType, PatternPreview } from "@/lib/optionTypes";
import type { OptionDoc } from "@/models/Option";

// ข้อมูลตัวเลือกสำหรับหน้าแอดมิน — มี promptText (ห้ามส่งให้ลูกค้า ใช้ lib/catalog.ts แทน)
export type OptionDTO = {
  id: string;
  type: OptionType;
  label: string;
  promptText: string;
  swatch: string | null;
  preview: PatternPreview | null;
  sortOrder: number;
  active: boolean;
  updatedAt: string;
};

export function serializeOption(doc: OptionDoc & { _id: Types.ObjectId }): OptionDTO {
  return {
    id: String(doc._id),
    type: doc.type as OptionType,
    label: doc.label,
    promptText: doc.promptText,
    swatch: doc.swatch ?? null,
    preview: (doc.preview as PatternPreview | null) ?? null,
    sortOrder: doc.sortOrder ?? 0,
    active: doc.active ?? true,
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}
