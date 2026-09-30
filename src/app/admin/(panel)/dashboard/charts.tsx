"use client";

import { Table2, TrendingDown, TrendingUp, TriangleAlert, type LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/* ================= Format ================= */

const nf = new Intl.NumberFormat("th-TH");
export const fmtInt = (n: number) => nf.format(Math.round(n));

export function fmtUsd(n: number) {
  if (n === 0) return "$0";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

export function fmtPct(n: number, digits = 0) {
  return `${(n * 100).toFixed(digits)}%`;
}

// จัดรูปแบบวันที่เอง — ICU ของ Node กับเบราว์เซอร์ให้ชื่อวันภาษาไทยไม่ตรงกัน ทำให้ hydration mismatch
const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const TH_DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

/** ส่วนประกอบวันเวลาตามเวลาไทย (UTC+7) จาก ISO timestamp หรือ YYYY-MM-DD */
function bkk(iso: string) {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00+07:00` : iso);
  const t = new Date(d.getTime() + 7 * 3_600_000);
  return { y: t.getUTCFullYear() + 543, m: t.getUTCMonth(), d: t.getUTCDate(), w: t.getUTCDay(), h: t.getUTCHours(), min: t.getUTCMinutes() };
}
const pad2 = (n: number) => String(n).padStart(2, "0");

export function fmtDateShort(iso: string) {
  const p = bkk(iso);
  return `${p.d} ${TH_MONTHS[p.m]}`;
}

export function fmtDateLong(iso: string) {
  const p = bkk(iso);
  return `${TH_DAYS[p.w]} ${p.d} ${TH_MONTHS[p.m]} ${p.y}`;
}

export function fmtTime(iso: string) {
  const p = bkk(iso);
  return `${pad2(p.h)}:${pad2(p.min)}`;
}

export function fmtDayTime(iso: string) {
  const p = bkk(iso);
  return `${p.d} ${TH_MONTHS[p.m]} ${pad2(p.h)}:${pad2(p.min)}`;
}

/** เปลี่ยนแปลงเทียบช่วงก่อน — null เมื่อช่วงก่อนเป็น 0 (หารไม่ได้) */
export function change(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}

/* ================= Card ================= */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-border/70 bg-white ${className}`}>{children}</section>;
}

/**
 * การ์ดกราฟ + ปุ่มสลับเป็นตาราง (ทุกกราฟต้องมีมุมมองตาราง — tooltip ไม่ใช่ทางเดียวที่อ่านค่าได้)
 */
export function ChartCard({
  title,
  subtitle,
  table,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  table?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <Card className={`flex flex-col p-5 ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
        </div>
        {table && (
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            aria-pressed={showTable}
            className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition ${
              showTable ? "bg-ink text-cream" : "text-ink-muted hover:bg-cream hover:text-ink"
            }`}
          >
            <Table2 className="size-3.5" aria-hidden />
            ตาราง
          </button>
        )}
      </header>
      <div className="flex-1">{showTable && table ? table : children}</div>
    </Card>
  );
}

export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="max-h-[300px] overflow-auto rounded-xl border border-border/70">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-cream text-xs text-ink-muted">
          <tr>
            {head.map((h, i) => (
              <th key={h} className={`px-3 py-2 font-semibold ${i > 0 ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={`px-3 py-2 ${j > 0 ? "text-right tabular-nums" : "text-ink"}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ================= Delta & stat tile ================= */

export function Delta({ value, suffix = "เทียบช่วงก่อน" }: { value: number | null; suffix?: string }) {
  if (value === null) return <span className="text-xs text-ink-muted">ใหม่ในช่วงนี้</span>;
  const up = value > 0;
  const flat = value === 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      {!flat && <Icon className="size-3.5" style={{ color: up ? "var(--good-ink)" : "var(--color-danger)" }} aria-hidden />}
      <span className="font-semibold" style={{ color: flat ? undefined : up ? "var(--good-ink)" : "var(--color-danger)" }}>
        {flat ? "±0%" : Math.abs(value) >= 10 ? `${up ? "+" : "−"}999%+` : `${up ? "+" : "−"}${fmtPct(Math.abs(value))}`}
      </span>
      <span className="text-ink-muted">{suffix}</span>
    </span>
  );
}

export function StatTile({
  label,
  value,
  foot,
  icon: Icon,
  children,
}: {
  label: string;
  value: ReactNode;
  foot?: ReactNode;
  icon: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-ink-muted">
        <Icon className="size-4" aria-hidden />
        {label}
      </div>
      <div className="mt-2 text-[28px] font-semibold leading-none tracking-tight text-ink">{value}</div>
      {children}
      {foot && <div className="mt-auto pt-3">{foot}</div>}
    </Card>
  );
}

/** เกจงบประมาณ — track เป็นสีอ่อนของ ramp เดียวกัน, ใกล้เต็มเปลี่ยนเป็นสีเตือนพร้อมไอคอน+ข้อความ */
export function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  const state = ratio >= 1 ? "full" : ratio >= 0.8 ? "high" : "ok";
  const fill = state === "ok" ? "var(--series-1)" : state === "high" ? "var(--series-2)" : "var(--color-danger)";
  return (
    <div className="mt-3">
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="h-2 overflow-hidden rounded-full"
        style={{ background: "var(--heat-1)" }}
      >
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(ratio * 100, ratio > 0 ? 2 : 0)}%`, background: fill }} />
      </div>
      {state !== "ok" && (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-danger">
          <TriangleAlert className="size-3.5" aria-hidden />
          {state === "full" ? "ถึงเพดานงบวันนี้แล้ว — ลูกค้าสร้างภาพไม่ได้" : "ใช้งบวันนี้เกิน 80% แล้ว"}
        </p>
      )}
    </div>
  );
}

/* ================= Tooltip ================= */

type TipRow = { color?: string; label: string; value: string };

function Tooltip({ x, y, title, rows, containerWidth }: { x: number; y: number; title: string; rows: TipRow[]; containerWidth: number }) {
  const flip = x > containerWidth - 180;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-[140px] rounded-xl border border-border/70 bg-white px-3 py-2.5 shadow-[0_8px_24px_rgba(46,33,24,0.14)]"
      style={{ left: x, top: y, transform: `translate(${flip ? "calc(-100% - 12px)" : "12px"}, -50%)` }}
    >
      <p className="mb-1.5 text-[11px] text-ink-muted">{title}</p>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2 text-xs">
            {r.color && <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: r.color }} />}
            <span className="text-sm font-semibold tabular-nums text-ink">{r.value}</span>
            <span className="text-ink-muted">{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ================= Trend (line + area) ================= */

export type TrendSeries = { key: string; label: string; color: string; values: number[]; area?: boolean };

function niceScale(max: number, ticks = 4) {
  if (max <= 0) return { max: ticks, step: 1 };
  const raw = max / ticks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  const stepInt = Math.max(1, Math.ceil(step));
  return { max: stepInt * ticks, step: stepInt };
}

/** เส้นโค้งแบบ monotone (ไม่เลยจุดข้อมูล ไม่ติดลบ) — Fritsch–Carlson */
function monotonePath(pts: [number, number][]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const dx = pts.slice(1).map((p, i) => p[0] - pts[i][0]);
  const slope = pts.slice(1).map((p, i) => (p[1] - pts[i][1]) / dx[i]);
  const m = pts.map((_, i) => (i === 0 ? slope[0] : i === n - 1 ? slope[n - 2] : slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * slope[i];
      m[i + 1] = t * b * slope[i];
    }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${pts[i][0] + h},${pts[i][1] + m[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - m[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export function TrendChart({
  dates,
  series,
  height = 240,
  tipTitle = fmtDateLong,
}: {
  dates: string[];
  series: TrendSeries[];
  height?: number;
  tipTitle?: (date: string) => string;
}) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const gradId = useId();
  const pad = { top: 12, right: 12, bottom: 28, left: 34 };
  const plotW = Math.max(width - pad.left - pad.right, 0);
  const plotH = height - pad.top - pad.bottom;
  const n = dates.length;
  const dataMax = Math.max(0, ...series.flatMap((s) => s.values));
  const { max, step } = niceScale(dataMax);
  const x = (i: number) => pad.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => pad.top + plotH - (v / max) * plotH;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 72))));
  const empty = dataMax === 0;

  const pick = (clientX: number, rect: DOMRect) => {
    if (n === 0 || plotW <= 0) return;
    const rel = (clientX - rect.left - pad.left) / plotW;
    setActive(Math.min(n - 1, Math.max(0, Math.round(rel * (n - 1)))));
  };

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "ArrowRight") setActive((a) => Math.min(n - 1, (a ?? -1) + 1));
    else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? n) - 1));
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  };

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          tabIndex={0}
          aria-label={`กราฟแนวโน้ม ${series.map((s) => `${s.label} รวม ${fmtInt(s.values.reduce((a, b) => a + b, 0))}`).join(", ")} — ใช้ปุ่มลูกศรซ้ายขวาเพื่ออ่านค่ารายวัน`}
          className="block outline-none focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-primary/30"
          onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          onKeyDown={onKey}
        >
          <defs>
            {series
              .filter((s) => s.area)
              .map((s) => (
                <linearGradient key={s.key} id={`${gradId}-${s.key}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.16} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
          </defs>

          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={pad.left}
                x2={pad.left + plotW}
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? "var(--viz-axis)" : "var(--viz-grid)"}
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
              <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--viz-muted)" className="tabular-nums">
                {fmtInt(t)}
              </text>
            </g>
          ))}

          {dates.map((d, i) =>
            i % labelEvery === 0 || i === n - 1 ? (
              (i === n - 1 || n - 1 - i >= labelEvery * 0.6) && (
                <text
                  key={d}
                  x={x(i)}
                  y={height - 8}
                  textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
                  fontSize={11}
                  fill="var(--viz-muted)"
                >
                  {fmtDateShort(d)}
                </text>
              )
            ) : null,
          )}

          {series.map((s) => {
            const pts = s.values.map((v, i) => [x(i), y(v)] as [number, number]);
            const line = monotonePath(pts);
            return (
              <g key={s.key}>
                {s.area && n > 1 && (
                  <path d={`${line}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill={`url(#${gradId}-${s.key})`} />
                )}
                <path d={line} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              </g>
            );
          })}

          {active !== null && (
            <g pointerEvents="none">
              <line x1={x(active)} x2={x(active)} y1={pad.top} y2={pad.top + plotH} stroke="var(--viz-axis)" strokeWidth={1} shapeRendering="crispEdges" />
              {series.map((s) => (
                <circle key={s.key} cx={x(active)} cy={y(s.values[active])} r={4.5} fill={s.color} stroke="var(--viz-surface)" strokeWidth={2} />
              ))}
            </g>
          )}
        </svg>
      )}

      {empty && width > 0 && (
        <p className="pointer-events-none absolute inset-x-0 top-[38%] text-center text-sm text-ink-muted">ยังไม่มีการสร้างภาพในช่วงนี้</p>
      )}

      {active !== null && width > 0 && (
        <Tooltip
          x={x(active)}
          y={pad.top + plotH / 2}
          containerWidth={width}
          title={tipTitle(dates[active])}
          rows={series.map((s) => ({ color: s.color, label: s.label, value: fmtInt(s.values[active]) }))}
        />
      )}
    </div>
  );
}

export function LineLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-3.5 rounded-full" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/* ================= Bar list (อันดับ) ================= */

export function BarList({
  items,
  unit = "ภาพ",
  empty = "ยังไม่มีข้อมูล",
}: {
  items: { id: string; label: string; count: number; swatch?: string | null }[];
  unit?: string;
  empty?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  const total = items.reduce((a, b) => a + b.count, 0);
  if (items.length === 0) return <EmptyChart text={empty} />;
  return (
    <ol className="space-y-3.5">
      {items.map((item, idx) => (
        <li key={item.id} className="group">
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="w-4 shrink-0 text-xs tabular-nums text-ink-muted">{idx + 1}</span>
              {item.swatch && (
                <span aria-hidden className="size-3 shrink-0 rounded-full border border-black/10" style={{ background: item.swatch }} />
              )}
              <span className="truncate text-ink" title={item.label}>
                {item.label}
              </span>
            </span>
            <span className="shrink-0 tabular-nums">
              <span className="font-semibold text-ink">{fmtInt(item.count)}</span>
              <span className="ml-1.5 text-xs text-ink-muted">{fmtPct(total ? item.count / total : 0)}</span>
            </span>
          </div>
          <div className="ml-6 h-2 rounded-r-[4px]" style={{ background: "var(--viz-grid)" }} aria-hidden>
            <div
              className="h-full rounded-r-[4px] transition-[width,filter] duration-500 group-hover:brightness-110"
              style={{ width: `${(item.count / max) * 100}%`, background: "var(--series-1)" }}
            />
          </div>
          <span className="sr-only">
            {item.label}: {item.count} {unit}
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ================= Heatmap ================= */

const DOW = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
const DOW_SHORT = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
export const SLOT_LABELS = ["00–03", "03–06", "06–09", "09–12", "12–15", "15–18", "18–21", "21–24"];

export function Heatmap({ grid }: { grid: number[][] }) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<{ x: number; y: number; d: number; s: number } | null>(null);
  const max = Math.max(0, ...grid.flat());
  const level = (v: number) => (v === 0 || max === 0 ? 0 : Math.max(1, Math.ceil((v / max) * 6)));

  return (
    <div ref={wrapRef} className="relative" onPointerLeave={() => setTip(null)}>
      <div className="grid grid-cols-[28px_repeat(8,minmax(0,1fr))] gap-[3px]">
        <span />
        {SLOT_LABELS.map((s) => (
          <span key={s} className="pb-1 text-center text-[10px] tabular-nums text-ink-muted">
            {s.slice(0, 2)}
          </span>
        ))}
        {grid.map((row, d) => (
          <div key={d} className="contents">
            <span className="flex items-center text-[11px] text-ink-muted">{DOW_SHORT[d]}</span>
            {row.map((v, s) => (
              <span
                key={s}
                className="h-7 rounded-[4px] transition-[filter] hover:brightness-95 lg:h-9"
                style={{ background: `var(--heat-${level(v)})` }}
                onPointerEnter={(e) => {
                  const cell = e.currentTarget.getBoundingClientRect();
                  const box = e.currentTarget.parentElement!.parentElement!.getBoundingClientRect();
                  setTip({ x: cell.left - box.left + cell.width / 2, y: cell.top - box.top + cell.height / 2, d, s });
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">{busiest(grid)}</p>
        <div className="flex items-center gap-1.5 text-[11px] text-ink-muted">
        น้อย
        {[0, 1, 2, 3, 4, 5, 6].map((l) => (
          <span key={l} aria-hidden className="size-3 rounded-[3px]" style={{ background: `var(--heat-${l})` }} />
        ))}
        มาก
        </div>
      </div>
      {tip && (
        <Tooltip
          x={tip.x}
          y={tip.y}
          containerWidth={width}
          title={`วัน${DOW[tip.d]} · ${SLOT_LABELS[tip.s]} น.`}
          rows={[{ label: "ภาพ", value: fmtInt(grid[tip.d][tip.s]) }]}
        />
      )}
    </div>
  );
}

export const HEATMAP_DAYS = DOW;

/** สรุปช่วงที่ใช้งานมากที่สุด — ให้อ่านได้ทันทีโดยไม่ต้องเทียบสีเอง */
function busiest(grid: number[][]): string {
  let best = { v: 0, d: 0, s: 0 };
  grid.forEach((row, d) => row.forEach((v, s) => v > best.v && (best = { v, d, s })));
  return best.v === 0 ? "ยังไม่มีข้อมูลในช่วงนี้" : `ใช้งานมากที่สุด: วัน${DOW[best.d]} ${SLOT_LABELS[best.s]} น. (${fmtInt(best.v)} ภาพ)`;
}

/* ================= Part-to-whole bar ================= */

export function SplitBar({ items }: { items: { label: string; value: number; color: string; note?: string }[] }) {
  const total = items.reduce((a, b) => a + b.value, 0);
  if (total === 0) return <EmptyChart text="ยังไม่มีข้อมูล" />;
  const visible = items.filter((i) => i.value > 0);
  return (
    <div>
      <div className="flex h-3 gap-[2px]" role="img" aria-label={items.map((i) => `${i.label} ${fmtPct(i.value / total)}`).join(", ")}>
        {visible.map((i, idx) => (
          <span
            key={i.label}
            title={`${i.label}: ${fmtInt(i.value)} (${fmtPct(i.value / total)})`}
            className={`h-full transition-[filter] hover:brightness-110 ${idx === 0 ? "rounded-l-[4px]" : ""} ${
              idx === visible.length - 1 ? "rounded-r-[4px]" : ""
            }`}
            style={{ flexGrow: i.value, flexBasis: 0, background: i.color }}
          />
        ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-2.5 text-sm">
            <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: i.color }} />
            <span className="text-ink">{i.label}</span>
            {i.note && <span className="text-xs text-ink-muted">{i.note}</span>}
            <span className="ml-auto tabular-nums">
              <span className="font-semibold text-ink">{fmtInt(i.value)}</span>
              <span className="ml-1.5 inline-block w-10 text-right text-xs text-ink-muted">{fmtPct(i.value / total)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex h-full min-h-[120px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-ink-muted">
      {text}
    </div>
  );
}
