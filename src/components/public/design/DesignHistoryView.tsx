"use client";

import { Check, Download, MessageCircle, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { saveFile } from "./imageDownload";
import { useSmoothClose } from "../useSmoothClose";
import { SkeletonImage } from "@/components/SkeletonImage";
import type { HistoryItem } from "@/lib/designHistory";

const FB_PAGE = process.env.NEXT_PUBLIC_FB_PAGE;

type State =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "error" }
  | { status: "ready"; items: HistoryItem[] };

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

/** หน้า "ดีไซน์ของฉัน" — เฉพาะดีไซน์ที่ลูกค้ากด "บันทึกลงประวัติ" ตอนสร้างเสร็จ */
export function DesignHistoryView() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [toast, setToast] = useState<string | null>(null);
  // รูปที่เปิดเต็มจอ — manual = พร้อมวิธีบันทึกเอง (เบราว์เซอร์ที่ดาวน์โหลดไม่ได้)
  const [viewing, setViewing] = useState<{ code: string; manual: boolean } | null>(null);
  const { closing, requestClose } = useSmoothClose(() => setViewing(null));

  useEffect(() => {
    let alive = true;

    (async () => {
      const res = await fetch("/api/me/generations", { cache: "no-store" }).catch(() => null);
      if (!alive) return;
      if (res?.status === 401) return setState({ status: "signed-out" });
      const data = res?.ok ? await res.json().catch(() => null) : null;
      if (!alive) return;
      if (!data?.items) return setState({ status: "error" });
      setState({ status: "ready", items: data.items as HistoryItem[] });
    })();

    // รุ่นก่อนเก็บรูปใน IndexedDB ของเครื่อง — ล้างของเก่าทิ้ง
    try {
      indexedDB.deleteDatabase("kc-design-history");
    } catch {}

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!viewing) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && requestClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewing, requestClose]);

  const download = async (item: HistoryItem) => {
    const fileName = `${item.designCode}.jpg`;
    try {
      const res = await fetch(`${item.imageUrl}&download=1`);
      if (!res.ok) throw new Error("download failed");
      const result = await saveFile(new File([await res.blob()], fileName, { type: "image/jpeg" }));
      if (result === "manual") setViewing({ code: item.designCode, manual: true });
      else if (result === "downloaded") setToast(`ดาวน์โหลด ${fileName} แล้ว`);
      else if (result === "downloaded-android") setToast("บันทึกแล้ว · ดูได้ในแกลเลอรี / Google Photos อัลบั้ม Download");
    } catch {
      // ดาวน์โหลดไม่ได้ (เช่น iOS ไม่ยอมเปิดเมนูแชร์หลังรอโหลดไฟล์) → ให้บันทึกจากรูปโดยตรง
      setViewing({ code: item.designCode, manual: true });
    }
  };

  const sendToPage = async (item: HistoryItem) => {
    try {
      await navigator.clipboard.writeText(item.designCode);
      setToast(`คัดลอกรหัส ${item.designCode} แล้ว — วางในแชทพร้อมแนบรูป`);
    } catch {
      setToast(`รหัสดีไซน์: ${item.designCode}`);
    }
    fetch(`/api/generations/${encodeURIComponent(item.designCode)}`, { method: "POST" }).catch(() => {});
    setState((s) =>
      s.status === "ready"
        ? { ...s, items: s.items.map((i) => (i.designCode === item.designCode ? { ...i, sentToPage: true } : i)) }
        : s,
    );
    window.open(`https://m.me/${encodeURIComponent(FB_PAGE ?? "")}`, "_blank", "noopener,noreferrer");
  };

  const removeImage = async (item: HistoryItem) => {
    const res = await fetch(`/api/me/generations/${encodeURIComponent(item.designCode)}/image`, { method: "DELETE" }).catch(
      () => null,
    );
    if (!res?.ok) return setToast("ลบรูปไม่สำเร็จ กรุณาลองใหม่");
    setState((s) =>
      s.status === "ready"
        ? { ...s, items: s.items.filter((i) => i.designCode !== item.designCode) }
        : s,
    );
    setToast("ลบออกจากประวัติแล้ว");
  };

  const viewed = viewing && state.status === "ready" ? state.items.find((i) => i.designCode === viewing.code) : undefined;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-3 lg:px-10 lg:pt-6">
      <h1 className="text-xl font-bold text-primary lg:text-[28px]">ดีไซน์ของฉัน</h1>

      <main className="mt-4 lg:mt-6">
        {state.status === "loading" && (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="skeleton aspect-[3/5] rounded-2xl" />
            ))}
          </ul>
        )}

        {state.status === "signed-out" && (
          <Notice title="เข้าสู่ระบบเพื่อดูดีไซน์ของคุณ" text="กดปุ่มบัญชีที่มุมขวาบนของหน้าแรก แล้วเข้าสู่ระบบด้วย Google" />
        )}
        {state.status === "error" && <Notice title="โหลดประวัติไม่สำเร็จ" text="กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง" />}
        {state.status === "ready" && state.items.length === 0 && (
          <Notice title="ยังไม่มีดีไซน์ที่บันทึกไว้" text="สร้างดีไซน์เสร็จแล้วกด “บันทึกลงประวัติ” ดีไซน์นั้นจะแสดงที่นี่" />
        )}

        {state.status === "ready" && state.items.length > 0 && (
          <>
            <p className="mb-3 text-xs leading-relaxed text-ink-muted lg:mb-5 lg:text-sm">
              แสดงเฉพาะดีไซน์ที่กด “บันทึกลงประวัติ” ไว้ · ภาพจำลอง สินค้าจริงอาจต่างเล็กน้อย
            </p>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
              {state.items.map((item) => (
                  <li key={item.designCode} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface">
                    <div className="relative aspect-square bg-beige">
                      <button
                        type="button"
                        onClick={() => setViewing({ code: item.designCode, manual: false })}
                        aria-label={`ดูภาพเต็มจอ ${item.designCode}`}
                        className="absolute inset-0"
                      >
                        <SkeletonImage
                          src={item.imageUrl}
                          alt={`ดีไซน์ ${item.designCode}`}
                          loading="lazy"
                          className="size-full object-cover"
                        />
                      </button>
                      {item.sentToPage && (
                        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-medium text-secondary">
                          <Check size={12} strokeWidth={2.5} /> ส่งให้เพจแล้ว
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col gap-2 p-3">
                      <div>
                        <p className="truncate text-sm font-semibold text-ink">{item.product?.name ?? "สินค้าถูกลบแล้ว"}</p>
                        <p className="text-[11px] text-ink-muted">{formatDate(item.createdAt)}</p>
                      </div>
                      <ul className="flex flex-wrap gap-1">
                        {item.labels.map((label, i) => (
                          <li key={`${i}-${label}`} className="rounded-md bg-beige px-1.5 py-0.5 text-[11px] text-ink">
                            {label}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-auto flex gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => sendToPage(item)}
                          disabled={!FB_PAGE}
                          title={FB_PAGE ? undefined : "ยังไม่ได้ตั้งค่าเพจ Facebook"}
                          className="flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-xs font-semibold text-cream hover:bg-primary-hover disabled:opacity-40"
                        >
                          <MessageCircle size={15} aria-hidden />
                          ส่งให้เพจ
                        </button>
                        <IconButton label="ดาวน์โหลดภาพ" onClick={() => download(item)}>
                          <Download size={16} />
                        </IconButton>
                        <IconButton label="ลบออกจากประวัติ" onClick={() => removeImage(item)}>
                          <Trash2 size={16} />
                        </IconButton>
                      </div>
                    </div>
                  </li>
              ))}
            </ul>
          </>
        )}
      </main>

      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-8 z-30 mx-auto flex max-w-sm items-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm text-cream shadow-lg"
        >
          <Check size={16} className="shrink-0 text-accent" />
          {toast}
        </div>
      )}

      {viewing && viewed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={viewing.manual ? "บันทึกรูปภาพ" : "ภาพเต็มจอ"}
          data-closing={closing || undefined}
          className="overlay-anim fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-scrim/90 p-4 pt-16"
          onClick={() => requestClose()}
        >
          {viewing.manual && (
            <p className="max-w-sm rounded-2xl bg-surface px-4 py-3 text-center text-sm leading-relaxed text-ink">
              <span className="font-semibold text-primary">กดค้างที่รูป</span> แล้วเลือก “บันทึกรูปภาพ” / “เพิ่มไปยังรูปภาพ”
              <span className="mt-1 block text-xs text-ink-muted">บนคอมพิวเตอร์: คลิกขวาที่รูป → “บันทึกรูปภาพเป็น…”</span>
            </p>
          )}
          {/* กดที่รูปไม่ปิดหน้าต่าง — ให้กดค้างเพื่อบันทึกได้ */}
          {/* eslint-disable-next-line @next/next/no-img-element -- รูปส่วนตัวผ่าน /api/me ไม่ผ่าน next/image optimizer */}
          <img
            src={viewed.imageUrl}
            alt={`ดีไซน์ ${viewed.designCode}`}
            onClick={(e) => e.stopPropagation()}
            className="zoom-anim min-h-0 max-w-full flex-1 rounded-2xl object-contain"
          />
          <p className="text-center text-xs text-on-dark">ภาพจำลอง สินค้าจริงอาจต่างเล็กน้อย</p>
          <button
            type="button"
            onClick={() => requestClose()}
            aria-label="ปิด"
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-surface/90 text-ink"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border text-ink hover:border-primary/50 hover:text-primary"
    >
      {children}
    </button>
  );
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-beige text-primary">
        <Sparkles size={28} />
      </span>
      <h2 className="text-xl font-bold text-primary">{title}</h2>
      <p className="max-w-xs text-sm text-ink-muted">{text}</p>
      <Link
        href="/"
        className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-accent px-6 font-semibold text-on-accent hover:brightness-[1.04]"
      >
        <Sparkles size={18} /> ไปหน้าแรก
      </Link>
    </div>
  );
}
