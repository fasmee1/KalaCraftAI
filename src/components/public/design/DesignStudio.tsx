"use client";

import { CircleCheck, LoaderCircle, Sparkles, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import type { DesignCatalog } from "@/lib/catalog";
import { OPTION_TYPES } from "@/lib/optionTypes";
import { requestDesign } from "./designApi";
import { DesignForm, emptySelection, type DesignSelection } from "./DesignForm";
import { saveDesign, takeEditSelection } from "./designStore";
import { Turnstile } from "./Turnstile";
import { useSmoothClose } from "../useSmoothClose";

export const RESULT_PATH = "/design/result";

const REQUIRED_TOTAL = 4; // ประเภท + สินค้า + สไตล์ + โทนสี

function missingFields(s: DesignSelection): string[] {
  const missing: string[] = [];
  if (!s.categoryId) missing.push("ประเภทสินค้า");
  if (!s.productId) missing.push("สินค้าต้นแบบ");
  for (const t of OPTION_TYPES) if (t.required && s.options[t.key].length === 0) missing.push(t.label);
  return missing;
}

/** ชื่อที่แสดงเป็น chip ในหน้าผลลัพธ์ เช่น ชาม · มินิมอล · ไม้ + เชือก · 1:1 */
function selectionLabels(catalog: DesignCatalog, s: DesignSelection): string[] {
  const labelOf = (id: string) => catalog.options.find((o) => o.id === id)?.label;
  const labels = [catalog.categories.find((c) => c.id === s.categoryId)?.name];
  for (const t of OPTION_TYPES) {
    const names = s.options[t.key].map(labelOf).filter(Boolean);
    if (names.length) labels.push(names.join(" + "));
  }
  labels.push(s.aspectRatio);
  return labels.filter((l): l is string => !!l);
}

/** เปิด popup พร้อมเลือกสินค้าไว้ให้ — เปลี่ยน nonce ทุกครั้งที่กด (กดสินค้าเดิมซ้ำก็เปิดได้) */
export type DesignPreselect = { categoryId: string; productId: string; nonce: number };

/** ปุ่ม "สร้างดีไซน์ด้วย AI" + popup เลือกข้อมูล → สร้างเสร็จแล้วไปหน้าผลลัพธ์ */
export function DesignStudio({
  catalog,
  className,
  preselect,
  hideTrigger = false,
}: {
  catalog: DesignCatalog;
  className?: string;
  preselect?: DesignPreselect | null;
  /** ไม่แสดงปุ่มเปิด — ใช้เมื่อเปิด popup จาก preselect อย่างเดียว (เช่น การ์ดสินค้าหน้าแรก) */
  hideTrigger?: boolean;
}) {
  const router = useRouter();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selection, setSelection] = useState<DesignSelection>(emptySelection);
  const [optionalOpen, setOptionalOpen] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const missing = missingFields(selection);
  const ready = missing.length === 0;

  // มาจากปุ่ม "แก้ไขข้อมูล" ในหน้าผลลัพธ์ → เปิด popup พร้อมตัวเลือกเดิม
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("edit")) return;
    window.history.replaceState(null, "", window.location.pathname);
    const previous = takeEditSelection();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- อ่านค่าจาก sessionStorage ได้หลัง mount เท่านั้น
    if (previous) setSelection(previous);
    setOpen(true);
  }, []);

  // กดการ์ดสินค้า → เลือกประเภท+สินค้าให้ คงตัวเลือกอื่นที่เคยเลือกไว้
  useEffect(() => {
    if (!preselect) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- เปิด popup ตามการกดการ์ดจาก component แม่
    setSelection((s) => ({ ...s, categoryId: preselect.categoryId, productId: preselect.productId }));
    setError(null);
    setOpen(true);
  }, [preselect]);

  const { closing, requestClose } = useSmoothClose(() => {
    setOpen(false);
    setError(null);
  });

  const close = useCallback(() => {
    if (loading || closing) return;
    requestClose();
  }, [loading, closing, requestClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const generate = async () => {
    if (!ready || !token || loading) return;
    setLoading(true);
    setError(null);
    const result = await requestDesign(selection, token);
    setTurnstileReset((n) => n + 1); // token ใช้ได้ครั้งเดียว — ขอใหม่ทุกครั้ง
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    const product = catalog.products.find((p) => p.id === selection.productId)!;
    saveDesign({
      ...result.data,
      aspectRatio: selection.aspectRatio,
      createdAt: Date.now(),
      product: { id: product.id, name: product.name, imageUrl: product.imageUrl },
      labels: selectionLabels(catalog, selection),
      selection,
    });
    router.push(RESULT_PATH);
  };

  const requiredDone = REQUIRED_TOTAL - missing.length;

  return (
    <>
      {!hideTrigger && (
        <button type="button" onClick={() => setOpen(true)} className={className}>
          <Sparkles size={20} />
          สร้างดีไซน์ด้วย AI
        </button>
      )}

      {open && (
        <div
          data-closing={closing || undefined}
          className="overlay-anim fixed inset-0 z-50 flex items-end justify-center bg-scrim/45 sm:items-center sm:p-6"
          onMouseDown={(e) => e.target === e.currentTarget && close()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-closing={closing || undefined}
            className="panel-anim flex h-[100dvh] w-full max-w-[440px] flex-col overflow-hidden bg-cream shadow-2xl sm:h-[min(92dvh,900px)] sm:rounded-3xl lg:max-w-[520px]"
          >
            <header className="border-b border-border bg-cream px-5 pb-4 pt-5">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-accent/20 text-accent">
                  <Sparkles size={22} />
                </span>
                <div className="flex-1">
                  <h2 id={titleId} className="text-xl font-bold text-primary">
                    เลือกข้อมูล
                  </h2>
                  <p className="text-[13px] text-ink-muted">บอก AI ว่าอยากได้ดีไซน์แบบไหน</p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  disabled={loading}
                  aria-label="ปิด"
                  className="flex size-10 items-center justify-center rounded-full bg-beige text-ink hover:bg-border/60 disabled:opacity-40"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mt-4 flex items-center gap-3 text-xs">
                <span className="text-ink-muted">ข้อมูลจำเป็น</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-beige">
                  <span
                    className="block h-full rounded-full bg-secondary transition-all"
                    style={{ width: `${(requiredDone / REQUIRED_TOTAL) * 100}%` }}
                  />
                </span>
                <span className="font-semibold text-secondary">
                  {requiredDone}/{REQUIRED_TOTAL}
                </span>
              </div>
            </header>

            <div className="relative min-h-0 flex-1">
              <div className="h-full overflow-y-auto">
                <DesignForm
                  catalog={catalog}
                  value={selection}
                  onChange={setSelection}
                  optionalOpen={optionalOpen}
                  onToggleOptional={() => setOptionalOpen((v) => !v)}
                />
              </div>
              {loading && <GeneratingOverlay />}
            </div>

            <footer className="border-t border-border bg-surface px-5 pb-5 pt-3">
              {error && <ErrorNote message={error} />}
              <p className={`mb-2 flex items-center gap-1.5 text-xs ${ready && token ? "text-secondary" : "text-ink-muted"}`}>
                {ready && !token ? (
                  // Turnstile แบบซ่อน: รอ token สักครู่ก่อนปุ่มกดได้ — บอกให้รู้ว่าไม่ได้ค้าง
                  <>
                    <LoaderCircle size={14} className="animate-spin" /> กำลังตรวจสอบความปลอดภัยก่อนสร้างภาพ…
                  </>
                ) : ready ? (
                  <>
                    <CircleCheck size={14} /> ข้อมูลครบแล้ว · พร้อมสร้างภาพขนาด {selection.aspectRatio}
                  </>
                ) : (
                  <>ยังขาด: {missing.join(", ")}</>
                )}
              </p>
              <Turnstile onToken={setToken} resetKey={turnstileReset} />
              <div className="mt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelection(emptySelection());
                    setError(null);
                  }}
                  disabled={loading}
                  className="h-[52px] rounded-[14px] border border-border px-5 text-sm font-semibold text-ink hover:border-primary/50 disabled:opacity-50"
                >
                  ล้างค่า
                </button>
                <button
                  type="button"
                  onClick={generate}
                  disabled={!ready || !token || loading}
                  className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-[14px] bg-accent text-base font-semibold text-on-accent shadow-[0_6px_16px_rgba(217,164,65,0.35)] transition hover:brightness-[1.04] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {loading ? <LoaderCircle size={20} className="animate-spin" /> : <Sparkles size={20} />}
                  {loading ? "กำลังสร้าง…" : "สร้างภาพ AI"}
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

export function GeneratingOverlay() {
  return (
    <div className="fade-anim absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-cream/90 px-6 text-center backdrop-blur-sm">
      <LoaderCircle size={40} className="animate-spin text-primary" />
      <p className="text-base font-semibold text-primary">AI กำลังสร้างภาพ…</p>
      <p className="text-xs text-ink-muted">ใช้เวลาประมาณ 10–30 วินาที กรุณาอย่าปิดหน้านี้</p>
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p role="alert" className="mb-3 flex gap-2 rounded-xl bg-danger/10 px-3 py-2.5 text-xs leading-[1.6] text-danger">
      <TriangleAlert size={15} className="mt-0.5 shrink-0" />
      {message}
    </p>
  );
}
