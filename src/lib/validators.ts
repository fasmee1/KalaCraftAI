import { z } from "zod";
import { ASPECT_RATIOS, NOTE_MAX_LENGTH, OPTION_TYPE_KEYS, PATTERN_PREVIEWS, type OptionType } from "./optionTypes";

type AspectRatioValue = (typeof ASPECT_RATIOS)[number]["value"];

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9._-]+$/),
  password: z.string().min(1).max(128),
});

const categoryFields = {
  name: z.string().trim().min(1, "กรุณากรอกชื่อประเภท").max(100, "ชื่อยาวเกิน 100 ตัวอักษร"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "กรุณากรอก slug")
    .max(60, "slug ยาวเกิน 60 ตัวอักษร")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug ใช้ได้เฉพาะ a-z, 0-9 และ - เท่านั้น"),
  description: z.string().trim().max(300, "คำอธิบายยาวเกิน 300 ตัวอักษร"),
  sortOrder: z.coerce.number().int("ลำดับต้องเป็นจำนวนเต็ม").min(0, "ลำดับต้องไม่ติดลบ").max(9999),
  active: z.boolean(),
};

export const categoryInputSchema = z.object({
  ...categoryFields,
  description: categoryFields.description.default(""),
  sortOrder: categoryFields.sortOrder.default(0),
  active: categoryFields.active.default(true),
});

// PATCH ไม่ใส่ default เพื่อไม่ให้ช่องที่ไม่ได้ส่งมาถูกเขียนทับ
export const categoryPatchSchema = z.object(categoryFields).partial();

export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i);

/** ข้อมูลสินค้าจาก multipart form — ทุกค่ามาเป็น string */
export const productFormSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อสินค้า").max(120, "ชื่อยาวเกิน 120 ตัวอักษร"),
  category: z.string({ error: "กรุณาเลือกประเภทสินค้า" }).regex(/^[a-f0-9]{24}$/i, "กรุณาเลือกประเภทสินค้า"),
  description: z.string().trim().max(1000, "คำอธิบายยาวเกิน 1000 ตัวอักษร").default(""),
  price: z
    .string()
    .trim()
    .default("")
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 1_000_000), "ราคาต้องเป็นตัวเลข 0 – 1,000,000"),
  sortOrder: z
    .string()
    .trim()
    .default("0")
    .transform((v) => (v === "" ? 0 : Number(v)))
    .refine((v) => Number.isInteger(v) && v >= 0 && v <= 9999, "ลำดับต้องเป็นจำนวนเต็ม 0 – 9999"),
  active: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
});

export const productPatchSchema = z.object({ active: z.boolean() });

export type ProductFormInput = z.infer<typeof productFormSchema>;

/** แปลง FormData เป็น object ของ string (ไม่รวมไฟล์) — กันค่าแปลก ๆ อย่าง object เข้า query */
export function formDataToStrings(form: FormData, keys: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of keys) {
    const v = form.get(key);
    if (typeof v === "string") out[key] = v;
  }
  return out;
}

/** แปลง ZodError เป็น { field: message } สำหรับแสดงใต้ช่องกรอก */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/** body ของ POST /api/generate — ลูกค้าส่งแค่ id ของสิ่งที่เลือก ไม่ส่ง prompt */
export const generateSchema = z.object({
  productId: objectIdSchema,
  optionIds: z.array(objectIdSchema).max(20).default([]),
  aspectRatio: z.enum(ASPECT_RATIOS.map((a) => a.value) as [AspectRatioValue, ...AspectRatioValue[]]),
  note: z.string().max(NOTE_MAX_LENGTH * 2).default(""),
  turnstileToken: z.string().min(1).max(2048),
});

export type GenerateInput = z.infer<typeof generateSchema>;

/** body ของ POST /api/me/favorites — เพิ่ม/เอาสินค้าออกจากรายการโปรดของลูกค้าที่ล็อกอิน */
export const favoriteSchema = z.object({ productId: objectIdSchema, favorite: z.boolean() });

/** ตัวเลือกดีไซน์ (แอดมิน) — swatch ใช้กับโทนสี, preview ใช้กับลวดลาย ชนิดอื่นจะถูกล้างเป็น null */
export const optionInputSchema = z
  .object({
    type: z.enum(OPTION_TYPE_KEYS as [OptionType, ...OptionType[]], { error: "กรุณาเลือกหมวดของตัวเลือก" }),
    label: z.string().trim().min(1, "กรุณากรอกชื่อที่ลูกค้าเห็น").max(40, "ชื่อยาวเกิน 40 ตัวอักษร"),
    promptText: z
      .string()
      .trim()
      .min(2, "กรุณากรอกข้อความที่ส่งให้ AI")
      .max(300, "ข้อความยาวเกิน 300 ตัวอักษร")
      .regex(/^[^<>{}`\\]*$/, "ห้ามใช้อักขระ < > { } ` \\"),
    swatch: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^#[0-9a-f]{6}$/, "สีต้องอยู่ในรูปแบบ #rrggbb")
      .nullable()
      .default(null),
    preview: z.enum(PATTERN_PREVIEWS).nullable().default(null),
    sortOrder: z.coerce.number().int("ลำดับต้องเป็นจำนวนเต็ม").min(0, "ลำดับต้องไม่ติดลบ").max(9999).default(0),
    active: z.boolean().default(true),
  })
  .transform((o) => ({
    ...o,
    swatch: o.type === "tone" ? o.swatch : null,
    preview: o.type === "pattern" ? (o.preview ?? "none") : null,
  }));

export type OptionInput = z.infer<typeof optionInputSchema>;
