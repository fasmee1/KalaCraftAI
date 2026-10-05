"use client";

import { X } from "lucide-react";
import { getProviders, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { GoogleLogo } from "./AccountButton";
import { closeFavoritePrompt, useFavorites } from "./favoritesStore";
import { HeartIcon } from "./icons";
import { useSmoothClose } from "./useSmoothClose";

/** กล่องชวนเข้าสู่ระบบ — เปิดเมื่อคนที่ยังไม่ล็อกอินกดหัวใจ (รายการโปรดผูกกับบัญชี Google) */
export function FavoriteLoginPrompt() {
  const { promptOpen } = useFavorites();
  return promptOpen ? createPortal(<Prompt />, document.body) : null;
}

function Prompt() {
  const { closing, requestClose } = useSmoothClose(closeFavoritePrompt);
  // null = ยังเช็คไม่เสร็จ — ไม่ได้ตั้ง GOOGLE_CLIENT_ID/SECRET = ไม่มีปุ่มเข้าสู่ระบบ
  const [googleEnabled, setGoogleEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void getProviders().then((providers) => {
      if (alive) setGoogleEnabled(Boolean(providers?.google));
    });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && requestClose();
    window.addEventListener("keydown", onKey);
    return () => {
      alive = false;
      window.removeEventListener("keydown", onKey);
    };
  }, [requestClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="favorite-login-title"
      data-closing={closing || undefined}
      className="overlay-anim fixed inset-0 z-[60] flex items-end justify-center bg-scrim/50 p-4 sm:items-center"
      onClick={() => requestClose()}
    >
      <div
        data-closing={closing || undefined}
        onClick={(e) => e.stopPropagation()}
        className="panel-anim relative w-full max-w-sm rounded-3xl border border-border bg-surface p-6 text-center shadow-[0_12px_32px_rgba(107,66,38,0.18)]"
      >
        <button
          type="button"
          onClick={() => requestClose()}
          aria-label="ปิด"
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full text-ink-muted hover:bg-beige hover:text-ink"
        >
          <X size={18} />
        </button>
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-danger/10 text-danger">
          <HeartIcon size={26} filled />
        </span>
        <h2 id="favorite-login-title" className="mt-3 text-lg font-bold text-primary">
          เก็บสินค้าที่ชอบไว้ในรายการโปรด
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          เข้าสู่ระบบด้วย Google เพื่อบันทึกรายการโปรด และเปิดดูได้จากทุกเครื่อง
        </p>
        {googleEnabled === false ? (
          <p className="mt-4 rounded-xl bg-beige px-3 py-2.5 text-sm text-ink-muted">ขณะนี้ยังไม่เปิดให้เข้าสู่ระบบ</p>
        ) : (
          <button
            type="button"
            disabled={busy || googleEnabled === null}
            onClick={() => {
              setBusy(true);
              void signIn("google", { callbackUrl: window.location.href });
            }}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-border text-sm font-semibold text-ink transition hover:bg-beige disabled:opacity-60"
          >
            <GoogleLogo />
            {busy ? "กำลังไปที่ Google…" : "เข้าสู่ระบบด้วย Google"}
          </button>
        )}
      </div>
    </div>
  );
}
