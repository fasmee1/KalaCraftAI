"use client";

import { LoaderCircle, TriangleAlert, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export type FieldErrors = Record<string, string | undefined>;
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; fields?: FieldErrors };

/** เรียก API ของแอดมิน — body เป็น FormData ได้ (อัปโหลดไฟล์) หรือ object (ส่งเป็น JSON) */
export async function adminApi<T>(url: string, method: string, body?: FormData | object): Promise<ApiResult<T>> {
  try {
    const init: RequestInit = { method };
    if (body instanceof FormData) init.body = body;
    else if (body) {
      init.body = JSON.stringify(body);
      init.headers = { "Content-Type": "application/json" };
    }
    const res = await fetch(url, init);
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      // session หมดอายุ — โหลดหน้าใหม่ให้ proxy พาไปหน้าเข้าสู่ระบบ
      window.location.reload();
      return { ok: false, error: "หมดเวลาการเข้าสู่ระบบ" };
    }
    if (!res.ok) return { ok: false, error: data.error ?? "เกิดข้อผิดพลาด", fields: data.fields };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่" };
  }
}

/* ---------------- Toast ---------------- */

type Toast = { text: string; tone: "ok" | "error"; key: number };

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  const show = useCallback((text: string, tone: Toast["tone"] = "ok") => setToast({ text, tone, key: Date.now() }), []);
  return { toast, show };
}

export function ToastRegion({ toast }: { toast: Toast | null }) {
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      {toast && (
        <div
          key={toast.key}
          className={`toast-in rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            toast.tone === "ok" ? "bg-secondary text-cream" : "bg-danger text-cream"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

/* ---------------- Modal ---------------- */

// ต้องตรงกับระยะเวลา animation ของ dialog.modal[data-closing] ใน globals.css
const EXIT_MS = 160;

/** เล่นแอนิเมชันปิดให้จบก่อน แล้วค่อยเรียก onClosed (ถอด dialog ออกจากหน้า) */
export function useExitAnimation(onClosed: () => void) {
  const [closing, setClosing] = useState(false);
  const onClosedRef = useRef(onClosed);
  useEffect(() => {
    onClosedRef.current = onClosed;
  });
  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(() => onClosedRef.current(), EXIT_MS);
    return () => clearTimeout(t);
  }, [closing]);
  return { closing, close: useCallback(() => setClosing(true), []) };
}

export function Modal({
  title,
  closing,
  onRequestClose,
  size = "md",
  children,
}: {
  title: string;
  closing: boolean;
  onRequestClose: () => void;
  size?: "md" | "lg";
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      data-closing={closing || undefined}
      onCancel={(e) => {
        e.preventDefault();
        onRequestClose();
      }}
      onClick={(e) => {
        // คลิกพื้นหลังนอกกล่อง = ปิด
        if (e.target === e.currentTarget) onRequestClose();
      }}
      className={`modal m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] ${
        size === "lg" ? "max-w-2xl" : "max-w-md"
      } flex-col rounded-2xl bg-surface p-0 text-ink shadow-[0_16px_48px_rgba(46,33,24,0.25)] backdrop:bg-scrim/45 backdrop:backdrop-blur-sm open:flex`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        <button
          type="button"
          onClick={onRequestClose}
          aria-label="ปิด"
          className="flex size-9 items-center justify-center rounded-full bg-beige text-ink transition hover:bg-border"
        >
          <X className="size-[18px]" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

/** ส่วนเนื้อหาที่เลื่อนได้ + แถบปุ่มด้านล่างที่อยู่กับที่ */
export function ModalBody({ children }: { children: ReactNode }) {
  return <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">{children}</div>;
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">{children}</div>;
}

/* ---------------- Controls ---------------- */

export function Button({
  variant = "primary",
  loading,
  className = "",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "danger"; loading?: boolean }) {
  const styles = {
    primary: "bg-primary text-cream hover:bg-primary-hover font-semibold",
    outline: "border border-border text-ink hover:bg-beige font-medium",
    danger: "bg-danger text-cream hover:opacity-90 font-semibold",
  }[variant];
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || loading}
      className={`flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-[15px] transition disabled:opacity-60 ${styles} ${className}`}
    >
      {loading && <LoaderCircle className="size-[18px] animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Switch({ checked, busy, onChange, label }: { checked: boolean; busy?: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={busy}
      onClick={onChange}
      className="flex items-center gap-2 text-sm disabled:opacity-60"
    >
      <span className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-secondary" : "bg-border"}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-surface shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </span>
      <span className={checked ? "text-secondary" : "text-ink-muted"}>{checked ? "เปิด" : "ปิด"}</span>
    </button>
  );
}

export function IconButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex size-9 items-center justify-center rounded-lg transition ${
        danger ? "text-danger hover:bg-danger/10" : "text-primary hover:bg-beige"
      }`}
    >
      {children}
    </button>
  );
}

export function Field({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger/10 px-3 py-2.5 text-sm text-danger">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

/** class ของ input/textarea/select พร้อมกรอบแดงเมื่อมี error */
export function inputClass(error?: string) {
  return `w-full rounded-xl border bg-surface px-3.5 py-2.5 text-[15px] outline-none transition focus:ring-2 focus:ring-primary/15 ${
    error ? "border-danger" : "border-border focus:border-primary"
  }`;
}

/* ---------------- Delete confirm ---------------- */

export function DeleteDialog({
  title,
  name,
  url,
  onClose,
  onDeleted,
}: {
  title: string;
  name: string;
  url: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const { closing, close } = useExitAnimation(onClose);

  async function confirm() {
    setBusy(true);
    const res = await adminApi<{ ok: true }>(url, "DELETE");
    setBusy(false);
    if (res.ok) {
      onDeleted();
      close();
    } else setError(res.error);
  }

  return (
    <Modal title={title} closing={closing} onRequestClose={close}>
      <ModalBody>
        <p className="text-[15px]">
          ต้องการลบ <strong className="text-primary">&ldquo;{name}&rdquo;</strong> ใช่ไหม?
        </p>
        <p className="text-sm text-ink-muted">ลบแล้วกู้คืนไม่ได้ ถ้าแค่ไม่ต้องการให้ลูกค้าเห็น ให้ปิดสถานะแทน</p>
        <FormError message={error} />
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={close}>
          ยกเลิก
        </Button>
        <Button variant="danger" onClick={confirm} loading={busy}>
          ลบ
        </Button>
      </ModalFooter>
    </Modal>
  );
}
