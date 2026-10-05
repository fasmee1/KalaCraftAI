import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { buildCsp } from "@/lib/csp";

const isAdminPath = (pathname: string) =>
  pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/");

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // ด่านแรกของ /admin/* และ /api/admin/* — ทุก route ยังต้องเช็ค session ฝั่ง server ซ้ำด้วย getAdminSession()
  if (isAdminPath(pathname) && pathname !== "/admin/login") {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (token?.role !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname + search);
      return NextResponse.redirect(loginUrl);
    }
  }

  // API คืน JSON/ไฟล์ ไม่ใช่หน้าเว็บ — ไม่ต้องมี CSP (header อื่นตั้งใน next.config.ts)
  if (pathname.startsWith("/api/")) return NextResponse.next();

  // CSP พร้อม nonce ใหม่ทุก request — Next อ่าน nonce จาก header ของ request แล้วใส่ให้ script ของตัวเอง
  // layout อ่าน x-nonce ไปใส่ script ตั้งธีม
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // ทุก path ยกเว้นไฟล์ static ของ Next
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
