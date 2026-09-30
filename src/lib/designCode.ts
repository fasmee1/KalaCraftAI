import { randomInt } from "node:crypto";

// ตัด 0/O, 1/I/L ออกเพื่อให้ลูกค้าพิมพ์/อ่านรหัสให้เพจได้ไม่สับสน
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LENGTH = 6;

export const DESIGN_CODE_PATTERN = /^KC-[A-HJKMNP-Z2-9]{6}$/;

export function generateDesignCode(): string {
  let code = "";
  for (let i = 0; i < LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return `KC-${code}`;
}
