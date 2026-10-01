import "server-only";
import { CLOUDFLARE_MAX_INPUT_SIDE, editProductImage as editWithCloudflare } from "./cloudflareAi";
import { fetchReferenceImage } from "./cloudinary";
import { editProductImage as editWithGemini, type AspectRatio, type EditImageResult } from "./gemini";

// เลือกค่าย AI ด้วย AI_PROVIDER — ส่วนอื่นของระบบเรียกผ่านไฟล์นี้เท่านั้น
export type AiProvider = "cloudflare" | "gemini";

/**
 * ระดับงานแก้รูป:
 * - "restyle": เลือกแค่ตัวเลือก → โมเดลเล็ก (klein-4b) ถูก เร็ว โควตาฟรีพอ ~70–80 รูป/วัน
 * - "edit": ลูกค้าพิมพ์ "บอก AI เพิ่มเติม" → โมเดลใหญ่ (klein-9b)
 *   ทดสอบแล้ว: 4b ไม่ทำตามคำขอที่ต้องเปลี่ยนบางส่วนของดีไซน์ (ลายดาว → ดอกบัว) แต่ 9b ทำได้
 *   แลกกับโควตาฟรีราว 6–7 รูป/วัน ถ้าใช้ 9b อย่างเดียว
 */
export type EditLevel = "restyle" | "edit";

const GEMINI_MAX_INPUT_SIDE = 1536;
const DEFAULT_CLOUDFLARE_EDIT_MODEL = "@cf/black-forest-labs/flux-2-klein-9b";

// ค่าใช้จ่ายโดยประมาณต่อรูป ใช้คุมงบรายวันและแสดงใน dashboard
// cloudflare: klein-4b ≈ $0.0015 / klein-9b ≈ $0.017 ที่ 1024px (ฟรีภายในโควตา 10,000 Neurons/วัน)
// gemini: gemini-2.5-flash-image $0.039 (ทำตามคำขอได้อยู่แล้ว ไม่แยกระดับ)
const ESTIMATED_COST_USD: Record<AiProvider, Record<EditLevel, number>> = {
  cloudflare: { restyle: 0.0015, edit: 0.017 },
  gemini: { restyle: 0.039, edit: 0.039 },
};

export function getAiProvider(): AiProvider {
  return process.env.AI_PROVIDER === "gemini" ? "gemini" : "cloudflare";
}

export function estimateCostUsd(provider = getAiProvider(), level: EditLevel = "restyle"): number {
  return ESTIMATED_COST_USD[provider][level];
}

/** ดึงรูปต้นแบบของสินค้าจาก Cloudinary แล้วส่งให้ AI แก้ตาม prompt */
export async function editReferenceImage({
  publicId,
  prompt,
  aspectRatio,
  level = "restyle",
}: {
  publicId: string;
  prompt: string;
  aspectRatio?: AspectRatio;
  level?: EditLevel;
}): Promise<EditImageResult & { provider: AiProvider }> {
  const provider = getAiProvider();
  const maxSide = provider === "cloudflare" ? CLOUDFLARE_MAX_INPUT_SIDE : GEMINI_MAX_INPUT_SIDE;
  const ref = await fetchReferenceImage(publicId, maxSide);
  const input = { image: ref.data, mimeType: ref.mimeType, prompt, aspectRatio };
  const result =
    provider === "cloudflare"
      ? await editWithCloudflare({
          ...input,
          model: level === "edit" ? process.env.CLOUDFLARE_EDIT_MODEL || DEFAULT_CLOUDFLARE_EDIT_MODEL : undefined,
        })
      : await editWithGemini(input);
  return { ...result, provider };
}
