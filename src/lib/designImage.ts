// รูปผลลัพธ์ที่ลูกค้ากด "บันทึกลงประวัติ" — เบราว์เซอร์ส่งรูปกลับขึ้นมา จึงต้องพิสูจน์ว่าเป็นรูปที่ AI ของเราสร้างจริง
// ตอนสร้างเสร็จ server จด SHA-256 ของรูปไว้ใน generations.imageHash แล้วรับเฉพาะรูปที่ hash ตรงกัน
import { createHash, timingSafeEqual } from "node:crypto";
import { MAX_SAVED_IMAGE_BYTES } from "./designHistory";

const HASH_PATTERN = /^[a-f0-9]{64}$/;

export function hashImage(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

/** คืนไฟล์รูปเมื่อเป็นรูปเดียวกับที่ AI สร้าง — ไม่ตรง / ไม่มี hash (ดีไซน์รุ่นเก่า) / ขนาดผิด = null */
export function matchSavedImage(imageBase64: string, expectedHash: string | null | undefined): Buffer | null {
  if (!expectedHash || !HASH_PATTERN.test(expectedHash)) return null;
  const data = Buffer.from(imageBase64, "base64");
  if (data.length === 0 || data.length > MAX_SAVED_IMAGE_BYTES) return null;
  const actual = Buffer.from(hashImage(data), "hex");
  return timingSafeEqual(actual, Buffer.from(expectedHash, "hex")) ? data : null;
}
