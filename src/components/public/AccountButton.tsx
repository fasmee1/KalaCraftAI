"use client";

import { Images, LayoutDashboard, LogOut, User } from "lucide-react";
import Link from "next/link";
import { getProviders, signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { clearLocalImages } from "./design/designHistoryStore";

const BUTTON =
  "flex size-10 shrink-0 items-center justify-center rounded-full bg-beige text-ink transition hover:bg-border/60";

/**
 * ปุ่มบัญชีลูกค้าบนแถบเมนู — ล็อกอินด้วย Google (ไม่บังคับ) เพื่อโควตาสร้างดีไซน์ต่อวันที่มากขึ้น
 * ต้องอยู่ใต้ SessionProvider (SiteNav ครอบให้)
 */
export function AccountMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  // ไม่ได้ตั้ง GOOGLE_CLIENT_ID/SECRET = ปิดล็อกอินลูกค้า → ไม่แสดงปุ่ม (ไม่งั้น signIn จะเด้งไปหน้าแอดมิน)
  useEffect(() => {
    let alive = true;
    void getProviders().then((providers) => {
      if (alive) setGoogleEnabled(Boolean(providers?.google));
    });
    return () => {
      alive = false;
    };
  }, []);

  // กลับมาจาก Google แล้วล็อกอินไม่สำเร็จ (เช่น กดยกเลิก) → เปิดกล่องพร้อมข้อความ
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("login") !== "failed") return;
    url.searchParams.delete("login");
    window.history.replaceState(null, "", url);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL อ่านได้หลัง mount เท่านั้น
    setFailed(true);
    setOpen(true);
  }, []);

  const user = session?.user;
  if (user?.role === "admin") {
    return (
      <Link href="/admin/dashboard" aria-label="ไปหน้าแอดมิน" title="ไปหน้าแอดมิน" className={BUTTON}>
        <LayoutDashboard className="size-5" aria-hidden />
      </Link>
    );
  }
  const customer = user?.role === "customer" ? user : null;
  if (!customer && !googleEnabled) return null;
  const initial = (customer?.name || customer?.email || "").trim().charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={status === "loading"}
        aria-expanded={open}
        aria-label={customer ? "บัญชีของฉัน" : "เข้าสู่ระบบ"}
        title={customer ? "บัญชีของฉัน" : "เข้าสู่ระบบ"}
        className={customer ? `${BUTTON} bg-primary text-sm font-semibold text-cream hover:bg-primary/90` : BUTTON}
      >
        {customer && initial ? initial : <User className="size-5" aria-hidden />}
      </button>

      {open && (
        <>
          <button type="button" aria-label="ปิด" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-border bg-surface p-4 text-left shadow-[0_8px_24px_rgba(107,66,38,0.16)]">
            {customer ? (
              <>
                <p className="truncate text-sm font-semibold text-ink">{customer.name || "ลูกค้า"}</p>
                <p className="truncate text-xs text-ink-muted">{customer.email}</p>
                <Link
                  href="/designs"
                  className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-beige text-sm font-medium text-ink transition hover:bg-border/60"
                >
                  <Images className="size-4" aria-hidden />
                  ดีไซน์ของฉัน
                </Link>
                <button
                  type="button"
                  // ลบรูปที่เก็บในเครื่องก่อน — กันคนถัดไปที่ใช้เครื่องเดียวกันเห็นรูป
                  onClick={() => void clearLocalImages().then(() => signOut({ callbackUrl: "/" }))}
                  className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium text-ink transition hover:bg-beige"
                >
                  <LogOut className="size-4" aria-hidden />
                  ออกจากระบบ
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-ink">เข้าสู่ระบบ</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">สร้างดีไซน์ได้มากขึ้นต่อวันเมื่อเข้าสู่ระบบ</p>
                {failed && (
                  <p className="mt-2 rounded-lg bg-danger/10 px-2.5 py-1.5 text-xs text-danger">
                    เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่
                  </p>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void signIn("google", { callbackUrl: window.location.href });
                  }}
                  className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium text-ink transition hover:bg-beige disabled:opacity-60"
                >
                  <GoogleLogo />
                  {busy ? "กำลังไปที่ Google…" : "เข้าสู่ระบบด้วย Google"}
                </button>
                <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
                  เราเก็บเฉพาะชื่อและอีเมลจาก Google เพื่อนับโควตาและติดต่อเรื่องดีไซน์ของคุณ
                </p>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// โลโก้ Google ใช้สีของแบรนด์ตามข้อกำหนด — ไม่เปลี่ยนตามธีม
export function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-4" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
