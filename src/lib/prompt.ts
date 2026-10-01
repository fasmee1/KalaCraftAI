import { NOTE_MAX_LENGTH, OPTION_TYPES, type OptionType } from "./optionTypes";

// ประกอบ prompt จากข้อมูลของแอดมิน (basePrompt + promptText) + คำขอของลูกค้า (note)
// note ถูกแปลเป็นอังกฤษ (lib/noteTranslate.ts) และ sanitize แล้ว — เหลือแค่ตัวอักษร/ตัวเลข/เครื่องหมายพื้นฐาน ≤ 200 ตัว
// จึงทำได้แค่ "บรรยายหน้าตารูป" เท่านั้น: prompt นี้ใช้สร้างรูปอย่างเดียว ไม่มีเครื่องมือหรือข้อมูลอื่นให้ถูกสั่ง

export type PromptOption = { type: OptionType; promptText: string };

const SECTION_LABEL: Record<OptionType, string> = {
  style: "Style",
  tone: "Color tone",
  pattern: "Pattern / decoration",
  texture: "Surface finish",
  material: "Combined with",
  background: "Background",
  camera: "Camera angle",
};

/**
 * เหลือเฉพาะตัวอักษรไทย/อังกฤษ ตัวเลข ช่องว่าง และเครื่องหมายพื้นฐาน
 * ตัดอักขระที่ใช้แทรกคำสั่งได้ เช่น " ` { } < > \ และขึ้นบรรทัดใหม่
 */
export function sanitizeNote(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/[^\p{Script=Thai}A-Za-z0-9 .,!?()\-/%+:]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NOTE_MAX_LENGTH);
}

/**
 * โครงสร้างที่ทดสอบกับ FLUX.2 แล้วว่าทำตามคำขอได้ (โคมไฟลายดาว → "เปลี่ยนเป็นลายดอกบัว"):
 *   1) คำขอของลูกค้าเป็นประโยคคำสั่งบรรทัดแรก — โมเดลให้น้ำหนักข้อความช่วงต้นมากที่สุด
 *   2) ตัวเลือก + basePrompt
 *   3) บรรทัด "คงรูปทรงเดิม" สั้น ๆ บรรทัดเดียว — ถ้ามีหลายบรรทัดจะกลบคำขอ
 * ไม่ใส่ชื่อสินค้า: ชื่ออย่าง "โคมไฟกะลาฉลุลายดาว" มีคำว่า "ลายดาว" ขัดกับคำขอ (text encoder อ่านไทยออก)
 */
export function buildPrompt({
  basePrompt,
  options,
  note,
}: {
  basePrompt: string;
  options: PromptOption[];
  note: string;
}): string {
  const cleanNote = sanitizeNote(note).replace(/[.\s]+$/, "");
  const lines = [cleanNote ? `${cleanNote}.` : "Restyle the coconut shell handicraft product in the reference photo."];

  for (const { key } of OPTION_TYPES) {
    const texts = options.filter((o) => o.type === key).map((o) => o.promptText.trim()).filter(Boolean);
    if (texts.length) lines.push(`${SECTION_LABEL[key]}: ${texts.join(", ")}.`);
  }
  if (basePrompt.trim()) lines.push(basePrompt.trim());

  lines.push(
    "Keep the same object, overall shape, material and camera framing as the reference photo; it must remain a coconut shell handicraft.",
    "Photorealistic product photograph.",
  );
  return lines.join("\n");
}
