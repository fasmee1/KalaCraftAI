import "server-only";
import { CLOUDFLARE_MAX_INPUT_SIDE, editProductImage as editWithCloudflare } from "./cloudflareAi";
import { fetchReferenceImage } from "./cloudinary";
import { editProductImage as editWithGemini, type AspectRatio, type EditImageResult } from "./gemini";

// เลือกค่าย AI ด้วย AI_PROVIDER — ส่วนอื่นของระบบเรียกผ่านไฟล์นี้เท่านั้น
export type AiProvider = "cloudflare" | "gemini";

const GEMINI_MAX_INPUT_SIDE = 1536;

// ค่าใช้จ่ายโดยประมาณต่อรูป ใช้คุมงบรายวันและแสดงใน dashboard
// cloudflare: flux-2-klein-4b ที่ 1024px (ฟรีภายในโควตา 10,000 Neurons/วัน), gemini: gemini-2.5-flash-image
const ESTIMATED_COST_USD: Record<AiProvider, number> = { cloudflare: 0.0015, gemini: 0.039 };

export function getAiProvider(): AiProvider {
  return process.env.AI_PROVIDER === "gemini" ? "gemini" : "cloudflare";
}

export function estimateCostUsd(provider = getAiProvider()): number {
  return ESTIMATED_COST_USD[provider];
}

/** ดึงรูปต้นแบบของสินค้าจาก Cloudinary แล้วส่งให้ AI แก้ตาม prompt */
export async function editReferenceImage({
  publicId,
  prompt,
  aspectRatio,
}: {
  publicId: string;
  prompt: string;
  aspectRatio?: AspectRatio;
}): Promise<EditImageResult & { provider: AiProvider }> {
  const provider = getAiProvider();
  const maxSide = provider === "cloudflare" ? CLOUDFLARE_MAX_INPUT_SIDE : GEMINI_MAX_INPUT_SIDE;
  const ref = await fetchReferenceImage(publicId, maxSide);
  const edit = provider === "cloudflare" ? editWithCloudflare : editWithGemini;
  const result = await edit({ image: ref.data, mimeType: ref.mimeType, prompt, aspectRatio });
  return { ...result, provider };
}
