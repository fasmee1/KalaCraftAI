"use client";

// บันทึกรูปผลลัพธ์ลงเครื่องให้ได้ในทุกเบราว์เซอร์ — รูปอยู่ในหน้าเว็บเป็น base64 ไม่มี URL บน server
// ลำดับ: มือถือ → เมนูแชร์ของเครื่อง (มี "บันทึกรูปภาพ" ลงแกลเลอรี)
//        เดสก์ท็อป → ดาวน์โหลดไฟล์ผ่าน Blob URL
//        เบราว์เซอร์ในแอป (Facebook/Messenger/LINE/IG) ที่บล็อกการดาวน์โหลด → ให้กดค้างที่รูปเอง

export type SaveResult = "shared" | "downloaded" | "cancelled" | "manual";

export function base64ToFile(base64: string, mimeType: string, fileName: string): File {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], fileName, { type: mimeType });
}

/** เบราว์เซอร์ที่ฝังในแอป — ส่วนใหญ่ไม่สนใจ attribute download และไม่มีเมนูแชร์ไฟล์ */
export function isInAppBrowser(ua = navigator.userAgent): boolean {
  return /FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|MicroMessenger|TikTok/i.test(ua);
}

const isTouchDevice = () => window.matchMedia("(pointer: coarse)").matches;

export async function saveImage(base64: string, mimeType: string, fileName: string): Promise<SaveResult> {
  if (isInAppBrowser()) return "manual";

  const file = base64ToFile(base64, mimeType, fileName);

  // มือถือ: เมนูแชร์บันทึกลงแกลเลอรีได้ตรง ๆ (ดาวน์โหลดปกติจะไปอยู่ในแอป Files ซึ่งลูกค้าหาไม่เจอ)
  if (isTouchDevice() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return "shared";
    } catch (err) {
      if ((err as Error).name === "AbortError") return "cancelled";
      // แชร์ไม่สำเร็จ → ลองดาวน์โหลดแบบไฟล์ต่อ
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // ให้เวลาเบราว์เซอร์เริ่มดาวน์โหลดก่อนคืนหน่วยความจำ
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
  return "downloaded";
}
