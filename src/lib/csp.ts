// Content-Security-Policy ของทุกหน้า — proxy.ts สร้าง nonce ใหม่ทุก request แล้วเรียกฟังก์ชันนี้
// แหล่งภายนอกที่เว็บใช้จริง: Turnstile (script + iframe) และรูปต้นแบบจาก Cloudinary เท่านั้น

const TURNSTILE = "https://challenges.cloudflare.com";

export function buildCsp(nonce: string, isDev: boolean): string {
  const directives = [
    "default-src 'self'",
    // strict-dynamic: script ที่มี nonce โหลด script ต่อได้ (Turnstile ผ่าน next/script) — host ท้ายบรรทัดไว้ให้เบราว์เซอร์เก่า
    // dev: React ใช้ eval ช่วย debug
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""} ${TURNSTILE}`,
    // style="…" ของ React (สี swatch ฯลฯ) ใส่ nonce ไม่ได้
    "style-src 'self' 'unsafe-inline'",
    // blob: = รูปใน IndexedDB/พรีวิวอัปโหลด, data: = รูปผลลัพธ์ base64
    // api.cloudinary.com = signed download URL ที่ /api/images/[id] redirect ไป — CSP ตรวจปลายทางของ redirect ด้วย
    "img-src 'self' blob: data: https://res.cloudinary.com https://api.cloudinary.com",
    "font-src 'self'",
    `connect-src 'self'${isDev ? " ws:" : ""}`,
    `frame-src ${TURNSTILE}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (!isDev) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}
