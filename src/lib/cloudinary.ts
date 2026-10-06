import "server-only";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

// เก็บเฉพาะรูปต้นแบบสินค้า (refImage) — รูปผลลัพธ์ของลูกค้าไม่อัปโหลดขึ้น Cloudinary
// รูปทุกไฟล์อัปโหลดแบบ authenticated (ไม่ public) — เบราว์เซอร์ดูได้ผ่าน /api/images/[id] ของเราเท่านั้น
const DELIVERY_TYPE = "authenticated";
const SUBFOLDER = "references";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ImageFormat = "png" | "jpg" | "webp";

export type StoredImage = {
  publicId: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
};

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary env is not configured");
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

/** ตรวจชนิดไฟล์จาก magic bytes จริง ไม่เชื่อ MIME ที่ client ส่งมา */
export function detectImageFormat(buf: Buffer): ImageFormat | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "png";
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "jpg";
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

export async function uploadReferenceImage(buf: Buffer): Promise<StoredImage> {
  if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) {
    throw new Error("Image size out of range");
  }
  if (!detectImageFormat(buf)) {
    throw new Error("Unsupported image type");
  }
  ensureConfigured();
  const folder = `${process.env.CLOUDINARY_FOLDER || "kalacraft"}/${SUBFOLDER}`;

  const res = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, type: DELIVERY_TYPE, resource_type: "image", overwrite: false, unique_filename: true },
      (err, result) => (err || !result ? reject(err ?? new Error("Upload failed")) : resolve(result)),
    );
    stream.end(buf);
  });

  return {
    publicId: res.public_id,
    format: res.format,
    bytes: res.bytes,
    width: res.width,
    height: res.height,
  };
}

/**
 * ดึงรูปต้นแบบจาก Cloudinary ของเราเอง (ย่อด้านยาวไม่เกิน maxSide) เพื่อส่งให้ AI แก้
 * URL สร้างจาก publicId ใน DB เท่านั้น ไม่รับ URL จากผู้ใช้ (กัน SSRF)
 */
export async function fetchReferenceImage(
  publicId: string,
  maxSide: number,
  format: "png" | "jpg" = "png",
): Promise<{ data: Buffer; mimeType: string }> {
  ensureConfigured();
  const url = cloudinary.url(publicId, {
    type: DELIVERY_TYPE,
    resource_type: "image",
    sign_url: true,
    secure: true,
    format,
    transformation: [{ width: maxSide, height: maxSide, crop: "limit", ...(format === "jpg" ? { quality: "auto:good" } : {}) }],
  });
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Cloudinary fetch failed (${res.status})`);
  return { data: Buffer.from(await res.arrayBuffer()), mimeType: format === "jpg" ? "image/jpeg" : "image/png" };
}

export async function deleteImage(publicId: string): Promise<void> {
  ensureConfigured();
  await cloudinary.uploader.destroy(publicId, { type: DELIVERY_TYPE, resource_type: "image", invalidate: true });
}
