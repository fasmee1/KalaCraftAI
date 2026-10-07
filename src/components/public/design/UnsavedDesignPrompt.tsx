"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useSmoothClose } from "../useSmoothClose";

/** done = เก็บรูปแล้ว ออกได้ · stay = ปิด popup แต่อยู่หน้านี้ต่อ (เช่น เปิดวิธีบันทึกเอง) · failed = แจ้งให้ลองใหม่ */
export type KeepResult = "done" | "stay" | "failed";

type Props = {
  /** ลูกค้าที่ล็อกอิน = บันทึกลงประวัติได้ · ไม่ล็อกอิน = ดาวน์โหลดอย่างเดียว */
  canSave: boolean;
  onKeep: () => Promise<KeepResult>;
  /** ออก/ทำต่อโดยไม่เก็บรูป — เรียกหลัง popup ปิดแล้ว */
  onLeave: () => void;
  onClose: () => void;
};

/** เตือนก่อนออกจากหน้าผลลัพธ์ เมื่อรูปยังไม่ถูกบันทึกลงประวัติและยังไม่ได้ดาวน์โหลด */
export function UnsavedDesignPrompt({ canSave, onKeep, onLeave, onClose }: Props) {
  const { closing, requestClose } = useSmoothClose(onClose);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && requestClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestClose]);

  const keep = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const result = await onKeep();
    setBusy(false);
    if (result === "failed") setFailed(true);
    else requestClose(result === "done" ? onLeave : undefined);
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="unsaved-design-title"
      data-closing={closing || undefined}
      className="overlay-anim fixed inset-0 z-[60] flex items-end justify-center bg-scrim/50 p-4 sm:items-center"
      onClick={() => requestClose()}
    >
      <div
        data-closing={closing || undefined}
        onClick={(e) => e.stopPropagation()}
        className="panel-anim w-full max-w-sm rounded-3xl border border-border bg-surface p-6 text-center shadow-[0_12px_32px_rgba(107,66,38,0.18)]"
      >
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent/15 text-accent">
          <TriangleAlert size={26} />
        </span>
        <h2 id="unsaved-design-title" className="mt-3 text-lg font-bold text-primary">
          {canSave ? "ยังไม่ได้บันทึกรูปนี้" : "ยังไม่ได้ดาวน์โหลดรูปนี้"}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          {canSave
            ? "ถ้าออกตอนนี้รูปจะหาย บันทึกลงประวัติไว้ก่อนเพื่อกลับมาดูได้ในหน้า “ดีไซน์ของฉัน”"
            : "ถ้าออกตอนนี้รูปจะหาย ระบบไม่ได้เก็บรูปไว้ให้ กรุณาดาวน์โหลดก่อน"}
        </p>
        {failed && (
          <p role="alert" className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            {canSave ? "บันทึกไม่สำเร็จ กรุณาลองใหม่ หรือดาวน์โหลดภาพแทน" : "ดาวน์โหลดไม่สำเร็จ กรุณาลองใหม่"}
          </p>
        )}
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={keep}
            disabled={busy}
            className="flex h-12 w-full items-center justify-center rounded-[14px] bg-primary text-sm font-semibold text-cream hover:bg-primary-hover disabled:opacity-70"
          >
            {busy ? "กำลังบันทึก…" : canSave ? "บันทึกลงประวัติ" : "ดาวน์โหลดภาพ"}
          </button>
          <button
            type="button"
            onClick={() => requestClose(onLeave)}
            disabled={busy}
            className="flex h-12 w-full items-center justify-center rounded-[14px] border border-border text-sm font-semibold text-ink hover:bg-beige disabled:opacity-60"
          >
            ไปต่อโดยไม่เก็บรูป
          </button>
          <button
            type="button"
            onClick={() => requestClose()}
            disabled={busy}
            className="h-10 text-sm font-medium text-ink-muted hover:text-primary disabled:opacity-60"
          >
            อยู่หน้านี้ต่อ
          </button>
        </div>
      </div>
    </div>
  );
}
