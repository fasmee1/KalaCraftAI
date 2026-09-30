import "server-only";
import type { AspectRatio, EditImageResult } from "./gemini";

// Cloudflare Workers AI — มีโควตาฟรี 10,000 Neurons/วัน (flux-2-klein-4b ≈ 70–80 รูป/วัน)
const DEFAULT_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";

// FLUX.2 [klein] รับรูปต้นแบบได้ไม่เกิน 512×512 — ย่อรูปก่อนส่ง (ดู fetchReferenceImage)
export const CLOUDFLARE_MAX_INPUT_SIDE = 500;

const OUTPUT_SIZE: Record<AspectRatio, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "3:4": { width: 768, height: 1024 },
  "16:9": { width: 1024, height: 576 },
};

type CloudflareResponse = {
  success?: boolean;
  result?: { image?: string };
  errors?: { code?: number; message?: string }[];
};

function mimeFromBase64(b64: string): string {
  if (b64.startsWith("/9j/")) return "image/jpeg";
  if (b64.startsWith("UklGR")) return "image/webp";
  return "image/png";
}

/** แก้รูปต้นแบบตาม prompt (image-to-image) — คืนรูปเป็น base64 ไม่เก็บไว้ที่ไหน */
export async function editProductImage({
  image,
  mimeType,
  prompt,
  aspectRatio = "1:1",
}: {
  image: Buffer;
  mimeType: string;
  prompt: string;
  aspectRatio?: AspectRatio;
}): Promise<EditImageResult> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_AI_TOKEN;
  if (!accountId || !token) throw new Error("CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_AI_TOKEN is not set");
  const model = process.env.CLOUDFLARE_IMAGE_MODEL || DEFAULT_MODEL;
  const { width, height } = OUTPUT_SIZE[aspectRatio];

  const form = new FormData();
  form.append("prompt", prompt);
  form.append("width", String(width));
  form.append("height", String(height));
  form.append("input_image_0", new Blob([new Uint8Array(image)], { type: mimeType }), "reference");

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form, cache: "no-store" },
  );
  const body = (await res.json().catch(() => ({}))) as CloudflareResponse;
  const imageBase64 = body.result?.image;
  if (!res.ok || !imageBase64) {
    // เช่น โควตาฟรีรายวันหมด, token ผิด, prompt ถูก safety filter บล็อก
    const detail = body.errors?.map((e) => `${e.code ?? ""} ${e.message ?? ""}`.trim()).join("; ") || "no image";
    throw new Error(`Cloudflare AI failed (status=${res.status}): ${detail}`);
  }

  return { imageBase64, mimeType: mimeFromBase64(imageBase64), model, inputTokens: 0, outputTokens: 0 };
}
