"use client";

import { Activity, CalendarDays, Check, Gauge, RefreshCw, Sparkles } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DashboardData } from "@/lib/dashboard";
import { RANGE_OPTIONS, type RangeDays } from "@/lib/dashboardRange";
import {
  BarList,
  Card,
  change,
  ChartCard,
  DataTable,
  Delta,
  fmtDateLong,
  fmtDayTime,
  fmtInt,
  fmtPct,
  fmtTime,
  fmtUsd,
  Heatmap,
  HEATMAP_DAYS,
  LineLegend,
  Meter,
  SLOT_LABELS,
  SplitBar,
  StatTile,
  TrendChart,
} from "./charts";
import { DesignCodeLookup, StatusPill } from "./DesignCodeLookup";

const SERIES = {
  success: { label: "สร้างสำเร็จ", color: "var(--series-1)" },
  sent: { label: "กดส่งให้เพจ", color: "var(--series-2)" },
};

const ASPECT_NOTE: Record<string, string> = { "1:1": "โพสต์โซเชียล", "3:4": "หน้าร้านค้า", "16:9": "แบนเนอร์" };
const ASPECT_COLOR = ["var(--series-1)", "var(--series-2)", "var(--series-3)"];


/**
 * รวมรายวันเป็นกลุ่มละ 7 วัน นับถอยหลังจากวันล่าสุด และทิ้งสัปดาห์แรกที่ไม่ครบ 7 วัน
 * (ถ้าเก็บไว้ จุดนั้นจะดูเหมือนยอดตก ทั้งที่แค่มีวันน้อยกว่า)
 */
function toWeekly(daily: DashboardData["daily"]): DashboardData["daily"] {
  const out: DashboardData["daily"] = [];
  for (let i = daily.length % 7; i < daily.length; i += 7) {
    const chunk = daily.slice(i, i + 7);
    out.push({
      date: chunk[0].date,
      success: chunk.reduce((a, d) => a + d.success, 0),
      sent: chunk.reduce((a, d) => a + d.sent, 0),
      failed: chunk.reduce((a, d) => a + d.failed, 0),
      cost: chunk.reduce((a, d) => a + d.cost, 0),
    });
  }
  return out;
}

export function Dashboard({ data }: { data: DashboardData }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [picked, setPicked] = useState<string | null>(null);

  const setRange = (r: RangeDays) => startTransition(() => router.push(`${pathname}?range=${r}`, { scroll: false }));
  const refresh = () => startTransition(() => router.refresh());

  const { totals, previous, today, month } = data;
  const attempts = totals.success + totals.failed;
  const successRate = attempts ? totals.success / attempts : null;
  const sentRate = totals.success ? totals.sent / totals.success : 0;
  // 90 วัน: รวมเป็นรายสัปดาห์บนกราฟ (รายวันจะหยักจนอ่านแนวโน้มไม่ออก) — ตารางยังเป็นรายวัน
  const weekly = data.rangeDays === 90;
  const points = weekly ? toWeekly(data.daily) : data.daily;
  const dates = points.map((d) => d.date);
  const peak = data.daily.reduce((best, d) => (d.success > best.success ? d : best), data.daily[0]);

  return (
    <div className="viz-root mx-auto max-w-[1240px]">
      {/* ---------- หัวเรื่อง + ตัวกรองช่วงเวลา (คุมทุกกราฟด้านล่าง) ---------- */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">แดชบอร์ด</h1>
          <p className="mt-1 text-sm text-ink-muted">ภาพรวมการสร้างดีไซน์ · อัปเดต {fmtTime(data.generatedAt)} น.</p>
        </div>
        <div className="flex items-center gap-2">
          <div role="radiogroup" aria-label="ช่วงเวลา" className="flex rounded-xl border border-border bg-surface p-1">
            {RANGE_OPTIONS.map((r) => {
              const selected = data.rangeDays === r;
              return (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => !selected && setRange(r)}
                  className={`flex h-8 items-center gap-1 rounded-lg px-3 text-sm transition ${
                    selected ? "bg-ink font-semibold text-cream" : "text-ink-muted hover:bg-cream hover:text-ink"
                  }`}
                >
                  {selected && <Check className="size-4" strokeWidth={3} aria-hidden />}
                  {r} วัน
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={refresh}
            aria-label="โหลดข้อมูลใหม่"
            title="โหลดข้อมูลใหม่"
            className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface text-ink-muted hover:text-ink"
          >
            <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} aria-hidden />
          </button>
        </div>
      </div>

      {/* โหลดใหม่: คงภาพเดิมไว้แบบจางลง ไม่กระพริบ ไม่เลื่อน layout */}
      <div className={`grid grid-cols-1 gap-4 transition-opacity lg:grid-cols-12 ${pending ? "pointer-events-none opacity-55" : ""}`}>
        {/* ---------- Hero: แนวโน้ม ---------- */}
        <ChartCard
          className="lg:col-span-8"
          title={`การสร้างภาพ · ${data.rangeDays} วันล่าสุด`}
          subtitle={weekly ? "กราฟรวมรายสัปดาห์ (12 สัปดาห์เต็ม) · ตารางเป็นรายวัน" : undefined}
          table={
            <DataTable
              head={["วันที่", "สร้างสำเร็จ", "ส่งให้เพจ", "ไม่สำเร็จ", "ค่า AI"]}
              rows={[...data.daily].reverse().map((d) => [fmtDateLong(d.date), d.success, d.sent, d.failed, fmtUsd(d.cost)])}
            />
          }
        >
          <div className="mb-5 flex flex-wrap items-end gap-x-10 gap-y-3">
            <div>
              <p className="text-[52px] font-semibold leading-none tracking-tight text-ink">{fmtInt(totals.success)}</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
                ภาพที่สร้างสำเร็จ <Delta value={change(totals.success, previous.success)} suffix={`เทียบ ${data.rangeDays} วันก่อนหน้า`} />
              </p>
            </div>
            <dl className="flex gap-8 pb-1 text-sm">
              <div>
                <dt className="text-xs text-ink-muted">กดส่งให้เพจ</dt>
                <dd className="mt-1 font-semibold text-ink">
                  {fmtInt(totals.sent)} <span className="text-xs font-normal text-ink-muted">({fmtPct(sentRate)})</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">วันที่มากที่สุด</dt>
                <dd className="mt-1 font-semibold text-ink">
                  {peak && peak.success > 0 ? (
                    <>
                      {fmtInt(peak.success)} <span className="text-xs font-normal text-ink-muted">· {fmtDateLong(peak.date)}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
          </div>
          <div className="mb-2 flex justify-end">
            <LineLegend items={[SERIES.success, SERIES.sent]} />
          </div>
          <TrendChart
            dates={dates}
            tipTitle={weekly ? (d) => `สัปดาห์เริ่ม ${fmtDateLong(d)}` : undefined}
            series={[
              { key: "success", ...SERIES.success, values: points.map((d) => d.success), area: true },
              { key: "sent", ...SERIES.sent, values: points.map((d) => d.sent) },
            ]}
          />
        </ChartCard>

        {/* ---------- KPI ---------- */}
        <div className="grid grid-cols-2 gap-4 lg:col-span-4 lg:auto-rows-fr">
          <StatTile
            label="วันนี้"
            icon={Sparkles}
            value={fmtInt(today.success)}
            foot={<Delta value={change(today.success, today.yesterday)} suffix="เทียบเมื่อวาน" />}
          />
          <StatTile
            label="เดือนนี้"
            icon={CalendarDays}
            value={fmtInt(month.success)}
            foot={<span className="text-xs text-ink-muted">ค่า AI {fmtUsd(month.cost)}</span>}
          />
          <div className="col-span-2 grid">
            <StatTile
              label="งบ AI วันนี้ (ประมาณ)"
              icon={Gauge}
              value={
                <span className="flex items-baseline gap-2">
                  {fmtUsd(today.spent)}
                  <span className="text-sm font-normal text-ink-muted">/ {fmtUsd(today.budget)}</span>
                </span>
              }
            >
              <Meter value={today.spent} max={today.budget} label="งบ AI วันนี้" />
              <p className="mt-2 text-xs text-ink-muted">
                ช่วงนี้รวม {fmtUsd(totals.cost)} <Delta value={change(totals.cost, previous.cost)} suffix="" />
              </p>
            </StatTile>
          </div>
          <div className="col-span-2 grid">
            <StatTile
              label="คุณภาพการสร้าง"
              icon={Activity}
              value={successRate === null ? "—" : fmtPct(successRate, successRate < 1 ? 1 : 0)}
              foot={
                <p className="text-xs text-ink-muted">
                  สำเร็จ {fmtInt(totals.success)} / {fmtInt(attempts)} ครั้ง · เฉลี่ย{" "}
                  <span className="font-semibold text-ink">
                    {totals.avgDurationMs ? `${(totals.avgDurationMs / 1000).toFixed(1)} วิ` : "—"}
                  </span>{" "}
                  ต่อภาพ
                </p>
              }
            />
          </div>
        </div>

        {/* ---------- อันดับ ---------- */}
        <ChartCard
          className="lg:col-span-4"
          title="สินค้ายอดนิยม"
          subtitle="จำนวนภาพที่สร้างจากสินค้าต้นแบบ"
          table={<DataTable head={["สินค้า", "ภาพ"]} rows={data.topProducts.map((p) => [p.label, p.count])} />}
        >
          <BarList items={data.topProducts} />
        </ChartCard>
        <ChartCard
          className="lg:col-span-4"
          title="สไตล์ยอดนิยม"
          table={<DataTable head={["สไตล์", "ภาพ"]} rows={data.topOptions.style.map((p) => [p.label, p.count])} />}
        >
          <BarList items={data.topOptions.style} />
        </ChartCard>
        <ChartCard
          className="lg:col-span-4"
          title="โทนสียอดนิยม"
          table={<DataTable head={["โทนสี", "ภาพ"]} rows={data.topOptions.tone.map((p) => [p.label, p.count])} />}
        >
          <BarList items={data.topOptions.tone} />
        </ChartCard>

        {/* ---------- ช่วงเวลา + สัดส่วน ---------- */}
        <ChartCard
          className="lg:col-span-7"
          title="ช่วงเวลาที่ลูกค้าใช้งาน"
          subtitle="จำนวนภาพแยกตามวันและช่วง 3 ชั่วโมง (เวลาไทย)"
          table={
            <DataTable
              head={["วัน", ...SLOT_LABELS]}
              rows={data.heatmap.map((row, d) => [HEATMAP_DAYS[d], ...row])}
            />
          }
        >
          <Heatmap grid={data.heatmap} />
        </ChartCard>

        <div className="grid gap-4 lg:col-span-5">
          <ChartCard
            title="ขนาดภาพที่เลือก"
            table={<DataTable head={["ขนาด", "ภาพ"]} rows={data.aspect.map((a) => [`${a.ratio} ${ASPECT_NOTE[a.ratio] ?? ""}`, a.count])} />}
          >
            <SplitBar
              items={data.aspect.map((a, i) => ({ label: a.ratio, note: ASPECT_NOTE[a.ratio], value: a.count, color: ASPECT_COLOR[i] }))}
            />
          </ChartCard>
          <ChartCard
            title="ลวดลายยอดนิยม"
            table={<DataTable head={["ลวดลาย", "ภาพ"]} rows={data.topOptions.pattern.map((p) => [p.label, p.count])} />}
          >
            <BarList items={data.topOptions.pattern.slice(0, 4)} empty="ลูกค้ายังไม่ได้เลือกลวดลาย" />
          </ChartCard>
        </div>

        {/* ---------- ค้นหา + ล่าสุด ---------- */}
        <Card className="p-5 lg:col-span-5">
          <h2 className="mb-4 text-[15px] font-semibold text-ink">ค้นหารหัสดีไซน์</h2>
          <DesignCodeLookup pick={picked} />
        </Card>

        <Card className="overflow-hidden lg:col-span-7">
          <h2 className="px-5 pb-3 pt-5 text-[15px] font-semibold text-ink">การสร้างล่าสุด</h2>
          {data.recent.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-ink-muted">ยังไม่มีการสร้างภาพ</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-y border-border/70 bg-cream/60 text-xs text-ink-muted">
                  <tr>
                    <th className="px-5 py-2 font-semibold">รหัส</th>
                    <th className="px-3 py-2 font-semibold">สินค้า</th>
                    <th className="px-3 py-2 font-semibold">สถานะ</th>
                    <th className="px-3 py-2 text-right font-semibold">ใช้เวลา</th>
                    <th className="px-5 py-2 text-right font-semibold">เวลา</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.recent.map((g) => (
                    <tr key={g.designCode} className="hover:bg-cream/50">
                      <td className="px-5 py-2.5">
                        <button
                          type="button"
                          onClick={() => setPicked(g.designCode)}
                          className="whitespace-nowrap font-mono text-[13px] font-semibold tracking-wide text-primary hover:underline"
                          title="ดูรายละเอียด"
                        >
                          {g.designCode}
                        </button>
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-2.5 text-ink">{g.productName}</td>
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-1.5">
                          <StatusPill status={g.status} />
                          {g.sent && <span className="text-[11px] text-ink-muted">· ส่งเพจแล้ว</span>}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ink-muted">
                        {g.durationMs ? `${(g.durationMs / 1000).toFixed(1)} วิ` : "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-2.5 text-right tabular-nums text-ink-muted">{fmtDayTime(g.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
