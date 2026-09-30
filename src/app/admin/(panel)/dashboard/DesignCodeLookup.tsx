"use client";

import { Check, CircleCheck, CircleX, Clock3, Copy, LoaderCircle, Search } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { adminApi } from "@/components/admin/ui";
import type { GenerationLookup } from "@/app/api/admin/generations/[code]/route";
import { fmtUsd } from "./charts";

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });

export function StatusPill({ status }: { status: GenerationLookup["status"] }) {
  const map = {
    success: { icon: CircleCheck, label: "สำเร็จ", cls: "bg-secondary/10 text-secondary" },
    failed: { icon: CircleX, label: "ไม่สำเร็จ", cls: "bg-danger/10 text-danger" },
    pending: { icon: Clock3, label: "กำลังสร้าง", cls: "bg-accent/15 text-ink" },
  }[status];
  const Icon = map.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${map.cls}`}>
      <Icon className="size-3.5" aria-hidden />
      {map.label}
    </span>
  );
}

/** ค้นหารหัสดีไซน์ที่ลูกค้าส่งมาในแชท — เห็นสินค้า ตัวเลือก prompt และเวลา (ไม่มีรูป) */
export function DesignCodeLookup({ pick }: { pick: string | null }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationLookup | null>(null);
  const [copied, setCopied] = useState(false);

  async function lookup(value: string) {
    const q = value.trim().toUpperCase();
    if (!q) return;
    setLoading(true);
    setError(null);
    const res = await adminApi<GenerationLookup>(`/api/admin/generations/${encodeURIComponent(q)}`, "GET");
    setLoading(false);
    if (res.ok) setResult(res.data);
    else {
      setResult(null);
      setError(res.error);
    }
  }

  // คลิกรหัสในตาราง "ล่าสุด" → ค้นหาให้ทันที
  useEffect(() => {
    if (!pick) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync ช่องค้นหากับรหัสที่ถูกเลือกจากตาราง
    setCode(pick);
    void lookup(pick);
  }, [pick]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void lookup(code);
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="KC-XXXXXX"
            aria-label="รหัสดีไซน์"
            maxLength={9}
            spellCheck={false}
            className="w-full rounded-xl border border-border bg-cream py-2.5 pl-10 pr-3 font-mono text-sm tracking-wider outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="flex h-[42px] items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-cream hover:bg-primary-hover disabled:opacity-50"
        >
          {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          ค้นหา
        </button>
      </form>

      {error && <p className="mt-3 rounded-xl bg-danger/10 px-3 py-2.5 text-sm text-danger">{error}</p>}

      {!result && !error && (
        <p className="mt-4 text-sm leading-relaxed text-ink-muted">
          ใส่รหัสที่ลูกค้าส่งมาในแชท เพื่อดูว่าลูกค้าเลือกสินค้าและตัวเลือกอะไร พร้อม prompt ที่ส่งให้ AI
        </p>
      )}

      {result && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-lg font-bold tracking-wider text-primary">{result.designCode}</p>
            <StatusPill status={result.status} />
          </div>

          <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-ink-muted">สินค้า</dt>
            <dd className="text-ink">{result.product?.name ?? "สินค้าที่ถูกลบ"}</dd>
            <dt className="text-ink-muted">สร้างเมื่อ</dt>
            <dd className="text-ink">{dateTime(result.createdAt)}</dd>
            <dt className="text-ink-muted">ส่งให้เพจ</dt>
            <dd className="text-ink">{result.sentToPageAt ? dateTime(result.sentToPageAt) : "ยังไม่ได้กด"}</dd>
            <dt className="text-ink-muted">ขนาดภาพ</dt>
            <dd className="text-ink">{result.aspectRatio}</dd>
            <dt className="text-ink-muted">AI</dt>
            <dd className="break-all text-ink">
              {result.provider} · <span className="font-mono text-xs">{result.model ?? "—"}</span>
              <span className="text-ink-muted">
                {" "}
                · {result.durationMs ? `${(result.durationMs / 1000).toFixed(1)} วิ` : "—"} · {fmtUsd(result.costUsd)}
              </span>
            </dd>
          </dl>

          <div>
            <p className="mb-1.5 text-xs font-semibold text-ink-muted">ตัวเลือกที่เลือก</p>
            <ul className="flex flex-wrap gap-1.5">
              {result.options.map((o) => (
                <li key={`${o.type}-${o.label}`} className="rounded-lg bg-cream px-2 py-1 text-xs">
                  <span className="text-ink-muted">{o.typeLabel}:</span> <span className="font-medium text-ink">{o.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {result.note && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-ink-muted">ลูกค้าบอก AI เพิ่มเติม</p>
              <p className="rounded-lg bg-cream px-3 py-2 text-sm text-ink">{result.note}</p>
            </div>
          )}

          {result.error && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-ink-muted">สาเหตุที่ไม่สำเร็จ</p>
              <p className="rounded-lg bg-danger/10 px-3 py-2 font-mono text-xs text-danger">{result.error}</p>
            </div>
          )}

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-semibold text-ink-muted">Prompt ที่ส่งให้ AI</p>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(result.finalPrompt).catch(() => {});
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
                {copied ? "คัดลอกแล้ว" : "คัดลอก"}
              </button>
            </div>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-sidebar px-3 py-2.5 font-mono text-[11px] leading-relaxed text-beige">
              {result.finalPrompt}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
