"use client";

import { Check, Download, LoaderCircle, Share2, Sparkles, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { SkeletonImage } from "@/components/SkeletonImage";
import type { ListingProduct } from "@/lib/catalog";
import { isInAppBrowser, saveFile } from "./design/imageDownload";
import { formatPrice } from "./ProductCard";
import { useSmoothClose } from "./useSmoothClose";

/** ลิงก์ที่แชร์ได้ — เปิดแล้วหน้าสินค้าจะเด้ง popup สินค้านี้ให้เลย */
export const productShareUrl = (id: string) => `${window.location.origin}/products?product=${encodeURIComponent(id)}`;

/**
 * popup รายละเอียดสินค้า: รูป ราคา คำอธิบาย + ดาวน์โหลดรูป / แชร์ / สร้างดีไซน์จากสินค้านี้
 * โหลดไฟล์รูปรอไว้ตั้งแต่เปิด — iOS ยอมเปิดเมนูแชร์เฉพาะตอนที่ผู้ใช้เพิ่งกด (ห้าม await โหลดรูปหลังกด)
 */
export function ProductModal({
  product,
  categoryName,
  onClose,
  onDesign,
}: {
  product: ListingProduct;
  categoryName?: string;
  onClose: () => void;
  onDesign: (product: ListingProduct) => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState(false);
  const [manual, setManual] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { closing, requestClose } = useSmoothClose(onClose);

  // โหลดไฟล์รูปจาก origin เดียวกัน (/api/images/[id]?download=1) เตรียมไว้ให้ดาวน์โหลด/แชร์
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/images/${product.id}?download=1`, { signal: ctrl.signal })
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
      .then((blob) => setFile(new File([blob], `KalaCraft-${product.name}.jpg`, { type: blob.type || "image/jpeg" })))
      .catch((err) => (err as Error).name !== "AbortError" && setFileError(true));
    return () => ctrl.abort();
  }, [product.id, product.name]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && requestClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [requestClose]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const download = async () => {
    if (!file) return;
    const result = await saveFile(file);
    if (result === "manual") setManual(true);
    else if (result === "downloaded") setToast("ดาวน์โหลดรูปสินค้าแล้ว");
    else if (result === "downloaded-android") setToast("บันทึกแล้ว · ดูได้ในแกลเลอรี / Google Photos อัลบั้ม Download");
  };

  const share = async () => {
    const url = productShareUrl(product.id);
    const text = `${product.name} · ${formatPrice(product.price)} — หัตถกรรมกะลามะพร้าว KalaCraft AI`;
    try {
      if (file && !isInAppBrowser() && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: product.name, text: `${text}\n${url}` });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: product.name, text, url });
        return;
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return; // ผู้ใช้ปิดเมนูแชร์เอง
    }
    // แชร์ไม่ได้ (เช่นคอมพิวเตอร์บางเครื่อง/เบราว์เซอร์ในแอป) → คัดลอกลิงก์ให้แทน
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setToast("คัดลอกลิงก์สินค้าแล้ว — วางส่งให้เพื่อนได้เลย");
    } catch {
      setToast(url);
    }
  };

  const busy = !file && !fileError;

  return (
    <div
      data-closing={closing || undefined}
      className="overlay-anim fixed inset-0 z-50 flex items-end justify-center bg-scrim/45 sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && requestClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-closing={closing || undefined}
        className="panel-anim relative max-h-[92dvh] w-full max-w-[440px] overflow-y-auto rounded-t-3xl bg-cream shadow-2xl sm:rounded-3xl md:grid md:max-w-[880px] md:grid-cols-[1.1fr_1fr] md:overflow-hidden"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={() => requestClose()}
          aria-label="ปิด"
          className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-surface/90 text-ink shadow hover:bg-surface"
        >
          <X size={20} />
        </button>

        {/* รูปสินค้า */}
        <div className="relative bg-beige md:h-full">
          <SkeletonImage src={product.imageUrl} alt={product.name} className="aspect-[4/3] w-full object-cover md:aspect-auto md:h-full" />
          {manual && (
            <p className="fade-anim absolute inset-x-4 bottom-4 rounded-2xl bg-surface/95 px-4 py-3 text-center text-sm leading-relaxed text-ink shadow">
              <span className="font-semibold text-primary">กดค้างที่รูป</span> แล้วเลือก “บันทึกรูปภาพ”
            </p>
          )}
        </div>

        {/* รายละเอียด */}
        <div className="flex flex-col p-5 pb-6 md:max-h-[88dvh] md:overflow-y-auto md:p-7">
          {categoryName && (
            <span className="self-start rounded-full bg-beige px-3 py-1 text-xs font-medium text-primary">{categoryName}</span>
          )}
          <h2 id={titleId} className="mt-3 text-xl font-bold leading-snug text-ink md:text-2xl">
            {product.name}
          </h2>
          <p className="mt-1 text-2xl font-bold text-primary">{formatPrice(product.price)}</p>
          {product.designCount > 0 && (
            <p className="mt-2 inline-flex items-center gap-1 self-start rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-medium text-secondary">
              <Sparkles size={12} /> ลูกค้าสร้างดีไซน์จากสินค้านี้แล้ว {product.designCount.toLocaleString("th-TH")} ครั้ง
            </p>
          )}
          {product.description && <p className="mt-4 text-sm leading-relaxed text-ink-muted">{product.description}</p>}

          <div className="mt-6 grid grid-cols-2 gap-2.5 md:mt-auto md:pt-6">
            <ActionButton onClick={download} disabled={!file} busy={busy} icon={<Download size={18} />}>
              ดาวน์โหลดรูป
            </ActionButton>
            <ActionButton onClick={share} disabled={busy} icon={<Share2 size={18} />}>
              แชร์
            </ActionButton>
          </div>
          {fileError && <p className="mt-2 text-center text-xs text-danger">โหลดรูปสำหรับดาวน์โหลดไม่สำเร็จ — กดค้างที่รูปเพื่อบันทึกแทน</p>}

          <button
            type="button"
            // ปิด popup นี้ให้จบก่อน แล้วค่อยเปิด popup ออกแบบ — ไม่ซ้อนกันสองชั้น
            onClick={() => requestClose(() => onDesign(product))}
            className="mt-2.5 flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-accent text-base font-semibold text-on-accent shadow-[0_6px_16px_rgba(217,164,65,0.35)] transition hover:brightness-[1.04] active:scale-[0.98]"
          >
            <Sparkles size={20} />
            สร้างดีไซน์จากสินค้านี้
          </button>
        </div>

        {/* มือถือ: แจ้งเตือนอยู่ด้านบน ไม่บังปุ่มในแผ่นล่าง */}
        {toast && (
          <div
            role="status"
            className="toast-in fixed inset-x-4 top-4 z-[60] mx-auto flex max-w-sm items-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm text-cream shadow-lg sm:bottom-6 sm:top-auto"
          >
            <Check size={16} className="shrink-0 text-accent" />
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  busy,
  icon,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 items-center justify-center gap-2 rounded-[14px] border border-border bg-surface text-sm font-semibold text-ink transition hover:border-primary/50 disabled:opacity-50"
    >
      {busy ? <LoaderCircle size={18} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
