"use client";

import {
  Check,
  ChevronLeft,
  Copy,
  Download,
  Info,
  Maximize2,
  MessageCircle,
  Pencil,
  RefreshCw,
  Share2,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { requestDesign } from "./designApi";
import { ErrorNote, GeneratingOverlay } from "./DesignStudio";
import { loadDesign, saveDesign, saveEditSelection, type StoredDesign } from "./designStore";
import { base64ToFile, saveImage } from "./imageDownload";
import { Turnstile } from "./Turnstile";

const FB_PAGE = process.env.NEXT_PUBLIC_FB_PAGE;

// เดสก์ท็อป: จำกัดความกว้างตามสัดส่วน ให้ภาพทั้งภาพอยู่ในจอโดยไม่ต้องเลื่อน
const ASPECT_CLASS: Record<string, string> = {
  "1:1": "aspect-square lg:max-w-[620px]",
  "3:4": "aspect-[3/4] lg:max-w-[500px]",
  "16:9": "aspect-video",
};

function timeAgo(ts: number, now: number): string {
  const minutes = Math.floor((now - ts) / 60_000);
  if (minutes < 1) return "เมื่อสักครู่";
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  return new Date(ts).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function fileExt(mimeType: string) {
  return mimeType === "image/jpeg" ? "jpg" : (mimeType.split("/")[1] ?? "png");
}

export function DesignResultView() {
  const router = useRouter();
  // undefined = ยังไม่ได้อ่านจาก sessionStorage (รอ mount), null = ไม่มีภาพ
  const [design, setDesign] = useState<StoredDesign | null | undefined>(undefined);
  const [now, setNow] = useState(() => Date.now());
  // "view" = ดูภาพเต็มจอ, "save" = ภาพเต็มจอพร้อมวิธีบันทึกเอง (เบราว์เซอร์ที่ดาวน์โหลดไม่ได้)
  const [expanded, setExpanded] = useState<false | "view" | "save">(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage อ่านได้หลัง mount เท่านั้น
    setDesign(loadDesign());
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExpanded(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  if (design === undefined) return <div className="min-h-dvh bg-cream" />;
  if (design === null) return <EmptyState />;

  const src = `data:${design.mimeType};base64,${design.imageBase64}`;
  const fileName = `${design.designCode}.${fileExt(design.mimeType)}`;

  const copyCode = async (message = `คัดลอกรหัส ${design.designCode} แล้ว`) => {
    try {
      await navigator.clipboard.writeText(design.designCode);
      setToast(message);
    } catch {
      setToast(`รหัสดีไซน์: ${design.designCode}`);
    }
  };

  const share = async () => {
    const text = `ดีไซน์กะลามะพร้าวจาก KalaCraft AI · รหัส ${design.designCode}`;
    try {
      const file = base64ToFile(design.imageBase64, design.mimeType, fileName);
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return; // ผู้ใช้ปิดหน้าต่างแชร์เอง
    }
    await copyCode("อุปกรณ์นี้แชร์ไม่ได้ — คัดลอกรหัสดีไซน์ให้แล้ว");
  };

  const download = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const result = await saveImage(design.imageBase64, design.mimeType, fileName);
      if (result === "manual") setExpanded("save");
      else if (result === "downloaded") setToast(`ดาวน์โหลด ${fileName} แล้ว`);
    } catch {
      setExpanded("save");
    } finally {
      setSaving(false);
    }
  };

  const sendToPage = async () => {
    await copyCode(`คัดลอกรหัส ${design.designCode} แล้ว — วางในแชทพร้อมแนบรูป`);
    fetch(`/api/generations/${encodeURIComponent(design.designCode)}`, { method: "POST" }).catch(() => {});
    window.open(`https://m.me/${encodeURIComponent(FB_PAGE ?? "")}`, "_blank", "noopener,noreferrer");
  };

  const editSelection = () => {
    saveEditSelection(design.selection);
    router.push("/?edit=1");
  };

  const regenerate = async () => {
    if (!token || regenerating) return;
    setRegenerating(true);
    setError(null);
    const result = await requestDesign(design.selection, token);
    setTurnstileReset((n) => n + 1);
    setRegenerating(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const next = { ...design, ...result.data, createdAt: Date.now() };
    saveDesign(next);
    setDesign(next);
    setNow(Date.now());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[1200px] bg-cream pb-[215px] lg:px-10 lg:pb-16">
      <header className="flex items-center justify-between px-4 pt-3.5 lg:justify-start lg:gap-4 lg:px-0 lg:pt-8">
        <Link
          href="/"
          aria-label="กลับหน้าแรก"
          className="flex size-10 items-center justify-center rounded-full bg-beige text-ink hover:bg-border/60"
        >
          <ChevronLeft size={22} />
        </Link>
        <h1 className="text-lg font-bold text-primary lg:text-2xl">ผลลัพธ์ดีไซน์</h1>
        <span className="size-10 lg:hidden" aria-hidden />
      </header>

      <div className="mt-4 px-6 lg:mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-10 lg:px-0">
        {/* ภาพผลลัพธ์ */}
        <section className="lg:sticky lg:top-8">
          <div className="mb-3 flex items-center justify-between lg:hidden">
            <StatusBadge />
            <span className="text-xs text-ink-muted">{timeAgo(design.createdAt, now)}</span>
          </div>
          <div
            className={`relative mx-auto w-full overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#c99a6b,#8b5a3c)] shadow-[0_12px_32px_rgba(107,66,38,0.18)] ${ASPECT_CLASS[design.aspectRatio] ?? "aspect-square"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- รูป base64 จาก AI ไม่มี URL ให้ optimizer */}
            <img src={src} alt={`ดีไซน์ ${design.designCode}`} className="size-full object-cover" />
            <button
              type="button"
              onClick={() => setExpanded("view")}
              aria-label="ดูภาพเต็มจอ"
              className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-white/90 text-ink shadow hover:bg-white"
            >
              <Maximize2 size={17} />
            </button>
            <span className="absolute bottom-4 left-4 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-ink">
              <Sparkles size={12} /> สร้างด้วย AI
            </span>
            {regenerating && <GeneratingOverlay />}
          </div>
          <p className="mt-2 text-center text-xs text-ink-muted">ภาพจำลอง สินค้าจริงอาจต่างเล็กน้อย</p>
        </section>

        {/* รายละเอียด + การกระทำ */}
        <section className="mt-5 flex flex-col gap-5 lg:mt-0">
          <div className="hidden items-center justify-between lg:flex">
            <StatusBadge />
            <span className="text-sm text-ink-muted">{timeAgo(design.createdAt, now)}</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border bg-white px-4 py-3">
            <span className="text-sm text-ink-muted">รหัสดีไซน์</span>
            <span className="font-mono text-lg font-bold tracking-wider text-primary">{design.designCode}</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <Action icon={<Share2 size={19} />} label="แชร์" onClick={share} />
            <Action icon={<Pencil size={18} />} label="แก้ไขข้อมูล" onClick={editSelection} />
            <Action icon={<Copy size={18} />} label="คัดลอกรหัส" onClick={() => copyCode()} />
            <Action icon={<MessageCircle size={19} />} label="ส่งให้เพจ" onClick={sendToPage} disabled={!FB_PAGE} />
          </div>

          <div className="rounded-2xl border border-border bg-white p-4">
            <div className="flex gap-3">
              <div className="flex shrink-0 flex-col items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element -- signed URL หมดอายุ ไม่ผ่าน optimizer */}
                <img src={design.product.imageUrl} alt="" className="size-[52px] rounded-xl bg-beige object-cover" />
                <span className="text-[11px] text-ink-muted">ต้นแบบ</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[15px] font-semibold text-ink">ข้อมูลที่ใช้สร้าง</h2>
                  <button type="button" onClick={editSelection} className="text-sm font-medium text-primary hover:underline">
                    แก้ไข
                  </button>
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-muted">{design.product.name}</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {/* ชื่อซ้ำกันได้ข้ามหมวด (เช่น สไตล์ "ลายไทย" + ลวดลาย "ลายไทย") — key ต้องรวมตำแหน่งด้วย */}
                  {design.labels.map((label, i) => (
                    <li key={`${i}-${label}`} className="rounded-md bg-beige px-2 py-0.5 text-xs text-ink">
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <p className="flex gap-2 rounded-xl bg-accent/15 px-3 py-2.5 text-xs leading-[1.6] text-ink">
            <TriangleAlert size={15} className="mt-0.5 shrink-0 text-accent" />
            กรุณาดาวน์โหลดภาพก่อนออกจากหน้านี้ ระบบไม่ได้เก็บภาพไว้
          </p>
          <p className="flex gap-2 rounded-xl bg-beige/70 px-3 py-2.5 text-xs leading-[1.6] text-ink-muted">
            <Info size={15} className="mt-0.5 shrink-0" />
            สร้างได้ครั้งละ 1 ภาพ · ยังไม่ถูกใจ? กด “สร้างใหม่” เพื่อสร้างอีกภาพจากข้อมูลเดิม
          </p>

          {/* มือถือ: แถบล่างติดจอ / เดสก์ท็อป: อยู่ในคอลัมน์ขวา */}
          <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white px-6 pb-5 pt-3 lg:static lg:rounded-2xl lg:border lg:p-4">
            {error && <ErrorNote message={error} />}
            <Turnstile onToken={setToken} resetKey={turnstileReset} />
            <div className="mt-2 flex gap-2.5">
              <button
                type="button"
                onClick={regenerate}
                disabled={!token || regenerating}
                className="flex h-[52px] flex-[0.8] items-center justify-center gap-2 rounded-[14px] border border-border bg-white text-base font-semibold text-primary hover:border-primary/50 disabled:opacity-50"
              >
                <RefreshCw size={19} className={regenerating ? "animate-spin" : ""} />
                สร้างใหม่
              </button>
              <button
                type="button"
                onClick={download}
                disabled={saving}
                className="flex h-[52px] flex-[1.2] items-center justify-center gap-2 rounded-[14px] bg-primary text-base font-semibold text-cream hover:bg-primary-hover disabled:opacity-70"
              >
                <Download size={19} />
                ดาวน์โหลดภาพ
              </button>
            </div>
            <button
              type="button"
              onClick={() => setExpanded("save")}
              className="mx-auto mt-2 block text-xs text-ink-muted underline-offset-2 hover:text-primary hover:underline"
            >
              ดาวน์โหลดไม่ได้? บันทึกจากรูปโดยตรง
            </button>
          </footer>
        </section>
      </div>

      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-[225px] z-30 mx-auto flex max-w-sm items-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm text-cream shadow-lg lg:bottom-8"
        >
          <Check size={16} className="shrink-0 text-accent" />
          {toast}
        </div>
      )}

      {expanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={expanded === "save" ? "บันทึกรูปภาพ" : "ภาพเต็มจอ"}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-ink/90 p-4 pt-16"
          onClick={() => setExpanded(false)}
        >
          {expanded === "save" && (
            <p className="max-w-sm rounded-2xl bg-white px-4 py-3 text-center text-sm leading-relaxed text-ink">
              <span className="font-semibold text-primary">กดค้างที่รูป</span> แล้วเลือก “บันทึกรูปภาพ” / “เพิ่มไปยังรูปภาพ”
              <span className="mt-1 block text-xs text-ink-muted">บนคอมพิวเตอร์: คลิกขวาที่รูป → “บันทึกรูปภาพเป็น…”</span>
            </p>
          )}
          {/* กดที่รูปไม่ปิดหน้าต่าง — ให้กดค้างเพื่อบันทึกได้ */}
          {/* eslint-disable-next-line @next/next/no-img-element -- รูป base64 */}
          <img
            src={src}
            alt={`ดีไซน์ ${design.designCode}`}
            onClick={(e) => e.stopPropagation()}
            className="min-h-0 max-w-full flex-1 rounded-2xl object-contain"
          />
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="ปิด"
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/90 text-ink"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

function StatusBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary/12 px-2.5 py-1 text-xs font-medium text-secondary">
      <Check size={13} strokeWidth={2.5} /> สร้างภาพเสร็จแล้ว
    </span>
  );
}

function Action({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? "ยังไม่ได้ตั้งค่าเพจ Facebook" : undefined}
      className="group flex flex-col items-center gap-1.5 text-xs text-ink disabled:opacity-40"
    >
      <span className="flex size-11 items-center justify-center rounded-full border border-border bg-white text-ink transition group-hover:border-primary/50 group-hover:text-primary group-active:scale-95">
        {icon}
      </span>
      {label}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-cream px-6 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-beige text-primary">
        <Sparkles size={28} />
      </span>
      <h1 className="text-xl font-bold text-primary">ไม่พบภาพดีไซน์</h1>
      <p className="max-w-xs text-sm text-ink-muted">
        ภาพจะอยู่เฉพาะในแท็บที่สร้างเท่านั้น หากปิดแท็บไปแล้ว กรุณาสร้างใหม่อีกครั้ง
      </p>
      <Link
        href="/"
        className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-accent px-6 font-semibold text-ink hover:brightness-[1.04]"
      >
        <Sparkles size={18} /> สร้างดีไซน์ใหม่
      </Link>
    </div>
  );
}
