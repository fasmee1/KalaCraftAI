import "server-only";
import { isValidObjectId } from "mongoose";
import { detectImageFormat, MAX_IMAGE_BYTES } from "@/lib/cloudinary";
import { PRODUCT_FORM_KEYS } from "@/lib/product";
import { fieldErrors, formDataToStrings, productFormSchema, type ProductFormInput } from "@/lib/validators";
import { Category } from "@/models/Category";

type Result<T> = { ok: true; value: T } | { ok: false; fields: Record<string, string> };

/** อ่านรูปจาก form แล้วตรวจขนาดและชนิดไฟล์จาก magic bytes (ไม่เชื่อ MIME ที่ส่งมา) */
export async function readImageField(form: FormData, required: boolean): Promise<Result<Buffer | null>> {
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return required ? { ok: false, fields: { image: "กรุณาอัปโหลดรูปต้นแบบ" } } : { ok: true, value: null };
  }
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, fields: { image: "รูปต้องมีขนาดไม่เกิน 5 MB" } };
  const buf = Buffer.from(await file.arrayBuffer());
  if (!detectImageFormat(buf)) return { ok: false, fields: { image: "รองรับเฉพาะไฟล์ PNG, JPG หรือ WEBP" } };
  return { ok: true, value: buf };
}

/** ตรวจช่องข้อมูลสินค้า + เช็คว่าประเภทสินค้ามีอยู่จริง */
export async function readProductFields(form: FormData): Promise<Result<ProductFormInput>> {
  const parsed = productFormSchema.safeParse(formDataToStrings(form, PRODUCT_FORM_KEYS));
  if (!parsed.success) return { ok: false, fields: fieldErrors(parsed.error) };
  const { category } = parsed.data;
  if (!isValidObjectId(category) || !(await Category.exists({ _id: String(category) }))) {
    return { ok: false, fields: { category: "ไม่พบประเภทสินค้านี้" } };
  }
  return { ok: true, value: parsed.data };
}

export function badRequest(fields: Record<string, string>) {
  return Response.json({ error: "ข้อมูลไม่ถูกต้อง", fields }, { status: 400 });
}
