import "server-only";
import { GoogleGenAI, Modality } from "@google/genai";

const DEFAULT_MODEL = "gemini-2.5-flash-image";

export type AspectRatio = "1:1" | "3:4" | "16:9";

export type EditImageResult = {
  imageBase64: string;
  mimeType: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

let client: GoogleGenAI | null = null;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

/** แก้รูปต้นแบบตาม prompt (image-to-image) — คืนรูปเป็น base64 ไม่เก็บไว้ที่ไหน */
export async function editProductImage({
  image,
  mimeType,
  prompt,
  aspectRatio,
}: {
  image: Buffer;
  mimeType: string;
  prompt: string;
  aspectRatio?: AspectRatio;
}): Promise<EditImageResult> {
  const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL;
  const response = await getClient().models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [{ inlineData: { mimeType, data: image.toString("base64") } }, { text: prompt }],
      },
    ],
    config: {
      responseModalities: [Modality.IMAGE],
      ...(aspectRatio ? { imageConfig: { aspectRatio } } : {}),
    },
  });

  const candidate = response.candidates?.[0];
  const part = candidate?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part?.inlineData?.data) {
    // ถูกบล็อกโดย safety filter หรือโมเดลตอบเป็นข้อความแทนรูป
    throw new Error(
      `Gemini returned no image (finishReason=${candidate?.finishReason ?? "none"}, blockReason=${response.promptFeedback?.blockReason ?? "none"})`,
    );
  }

  return {
    imageBase64: part.inlineData.data,
    mimeType: part.inlineData.mimeType ?? "image/png",
    model,
    inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
  };
}
