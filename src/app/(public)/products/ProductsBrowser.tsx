"use client";

import { Check, ChevronDown, ChevronLeft, PackageSearch, Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DesignStudio, type DesignPreselect } from "@/components/public/design/DesignStudio";
import { ProductCard } from "@/components/public/ProductCard";
import type { DesignCatalog, ListingProduct } from "@/lib/catalog";
import { SORTS, type SortValue } from "./sorts";


const PRICE_RANGES = [
  { value: "all", label: "ทุกราคา", test: () => true },
  { value: "lt200", label: "ต่ำกว่า ฿200", test: (p: number | null) => p !== null && p < 200 },
  { value: "200-500", label: "฿200 – ฿500", test: (p: number | null) => p !== null && p >= 200 && p <= 500 },
  { value: "gt500", label: "มากกว่า ฿500", test: (p: number | null) => p !== null && p > 500 },
] as const;
type PriceValue = (typeof PRICE_RANGES)[number]["value"];

// ราคา "สอบถาม" (null) ไปอยู่ท้ายเสมอไม่ว่าเรียงแบบไหน
const byPrice = (dir: 1 | -1) => (a: ListingProduct, b: ListingProduct) =>
  a.price === null ? 1 : b.price === null ? -1 : (a.price - b.price) * dir;

const SORTERS: Record<SortValue, (a: ListingProduct, b: ListingProduct) => number> = {
  recommended: (a, b) => a.sortOrder - b.sortOrder || b.createdAt.localeCompare(a.createdAt),
  popular: (a, b) => b.designCount - a.designCount || a.sortOrder - b.sortOrder,
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  "price-asc": byPrice(1),
  "price-desc": byPrice(-1),
};

export function ProductsBrowser({
  catalog,
  products,
  initial,
}: {
  catalog: DesignCatalog;
  products: ListingProduct[];
  initial: { categoryId: string | null; q: string; sort: SortValue };
}) {
  const [categoryId, setCategoryId] = useState<string | null>(initial.categoryId);
  const [query, setQuery] = useState(initial.q);
  const [sort, setSort] = useState<SortValue>(initial.sort);
  const [price, setPrice] = useState<PriceValue>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [preselect, setPreselect] = useState<DesignPreselect | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const inPrice = PRICE_RANGES.find((r) => r.value === price)!.test;
    return products
      .filter((p) => (!categoryId || p.categoryId === categoryId) && (!q || p.name.toLowerCase().includes(q)) && inPrice(p.price))
      .sort(SORTERS[sort]);
  }, [products, categoryId, query, sort, price]);

  // เก็บตัวกรองไว้ใน URL — แชร์ลิงก์/กดย้อนกลับแล้วได้หน้าเดิม
  useEffect(() => {
    const params = new URLSearchParams();
    const slug = catalog.categories.find((c) => c.id === categoryId)?.slug;
    if (slug) params.set("category", slug);
    if (query.trim()) params.set("q", query.trim());
    if (sort !== "recommended") params.set("sort", sort);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [catalog.categories, categoryId, query, sort]);

  const resetAll = () => {
    setCategoryId(null);
    setQuery("");
    setPrice("all");
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 pb-32 pt-3.5 lg:px-10 lg:pt-8">
      {/* หัวหน้า */}
      <header className="relative flex h-10 items-center justify-center lg:justify-start lg:gap-4">
        <Link
          href="/"
          aria-label="กลับหน้าแรก"
          className="absolute left-0 flex size-10 items-center justify-center rounded-full bg-beige text-ink transition hover:bg-border/60 lg:static"
        >
          <ChevronLeft size={22} />
        </Link>
        <h1 className="text-lg font-bold text-primary lg:text-[28px]">สินค้าแนะนำ</h1>
      </header>

      {/* ค้นหา + ตัวกรอง */}
      <div className="mt-6 flex gap-2.5 lg:mt-8 lg:max-w-xl">
        <label className="relative flex-1">
          <span className="sr-only">ค้นหาสินค้า</span>
          <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาสินค้า"
            className="h-[46px] w-full rounded-2xl border border-border bg-white pl-11 pr-4 text-[15px] text-ink outline-none transition placeholder:text-ink-muted/80 focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          aria-label="ตัวกรองราคา"
          className="relative flex size-[46px] shrink-0 items-center justify-center rounded-2xl bg-primary text-cream transition hover:bg-primary-hover"
        >
          <SlidersHorizontal size={20} />
          {price !== "all" && <span className="absolute right-2 top-2 size-2 rounded-full bg-accent ring-2 ring-primary" aria-hidden />}
        </button>
      </div>

      {/* ประเภท: มือถือเลื่อนแนวนอน / เดสก์ท็อปขึ้นบรรทัดใหม่ได้ */}
      <div
        role="tablist"
        aria-label="ประเภทสินค้า"
        className="-mx-6 mt-3.5 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] lg:mx-0 lg:mt-5 lg:flex-wrap lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
      >
        <CategoryChip active={!categoryId} onClick={() => setCategoryId(null)}>
          ทั้งหมด
        </CategoryChip>
        {catalog.categories.map((c) => (
          <CategoryChip key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
            {c.name}
          </CategoryChip>
        ))}
      </div>

      {/* จำนวน + เรียงลำดับ */}
      <div className="mt-4 flex items-center justify-between lg:mt-6">
        <p className="text-[13px] text-ink-muted" aria-live="polite">
          {visible.length} รายการ
        </p>
        <label className="relative flex items-center gap-1 text-[13px] text-ink-muted">
          เรียงตาม:
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortValue)}
            className="cursor-pointer appearance-none bg-transparent pr-5 font-semibold text-ink outline-none [field-sizing:content] focus-visible:underline"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-0 text-ink" aria-hidden />
        </label>
      </div>

      {/* รายการสินค้า */}
      {visible.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-3xl border border-border bg-white px-6 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-beige text-primary">
            <PackageSearch size={26} />
          </span>
          <p className="mt-4 font-semibold text-ink">ไม่พบสินค้าที่ค้นหา</p>
          <p className="mt-1 text-sm text-ink-muted">ลองเปลี่ยนคำค้นหา ประเภท หรือช่วงราคา</p>
          <button
            type="button"
            onClick={resetAll}
            className="mt-5 h-10 rounded-full border border-border px-5 text-sm font-medium text-ink transition hover:border-primary/50"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-[13px] md:grid-cols-3 lg:mt-4 lg:grid-cols-4 lg:gap-6">
          {visible.map((p) => (
            <li key={p.id}>
              <ProductCard
                product={p}
                showAiBadge={p.designCount > 0}
                onSelect={() => setPreselect({ categoryId: p.categoryId, productId: p.id, nonce: Date.now() })}
              />
            </li>
          ))}
        </ul>
      )}

      {/* ปุ่มลอยสร้างดีไซน์ — กดการ์ดสินค้าก็เปิด popup นี้พร้อมเลือกสินค้าให้ */}
      <DesignStudio
        catalog={catalog}
        preselect={preselect}
        className="fixed bottom-6 left-1/2 z-40 flex h-[52px] -translate-x-1/2 items-center whitespace-nowrap justify-center gap-2 rounded-full bg-accent px-6 text-base font-semibold text-ink shadow-[0_8px_24px_rgba(217,164,65,0.45)] transition hover:brightness-[1.04] active:scale-[0.98] lg:bottom-8 lg:h-14 lg:px-8"
      />

      {filterOpen && (
        <PriceFilterSheet
          value={price}
          count={(v) => {
            const test = PRICE_RANGES.find((r) => r.value === v)!.test;
            const q = query.trim().toLowerCase();
            return products.filter((p) => (!categoryId || p.categoryId === categoryId) && (!q || p.name.toLowerCase().includes(q)) && test(p.price)).length;
          }}
          onApply={(v) => {
            setPrice(v);
            setFilterOpen(false);
          }}
          onClose={() => setFilterOpen(false)}
        />
      )}
    </div>
  );
}

function CategoryChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`h-[35px] shrink-0 rounded-full border px-4 text-sm transition ${
        active ? "border-primary bg-primary font-semibold text-cream" : "border-border bg-white text-ink hover:border-primary/50"
      }`}
    >
      {children}
    </button>
  );
}

function PriceFilterSheet({
  value,
  count,
  onApply,
  onClose,
}: {
  value: PriceValue;
  count: (v: PriceValue) => number;
  onApply: (v: PriceValue) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<PriceValue>(value);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="price-filter-title" className="w-full max-w-md rounded-t-3xl bg-cream p-5 pb-6 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="price-filter-title" className="text-lg font-bold text-primary">
            ช่วงราคา
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="flex size-9 items-center justify-center rounded-full bg-beige text-ink hover:bg-border/60"
          >
            <X size={18} />
          </button>
        </div>
        <div role="radiogroup" aria-label="ช่วงราคา" className="space-y-2">
          {PRICE_RANGES.map((r) => {
            const selected = draft === r.value;
            return (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setDraft(r.value)}
                className={`flex h-12 w-full items-center justify-between rounded-2xl border px-4 text-[15px] transition ${
                  selected ? "border-[1.5px] border-primary bg-white font-semibold text-ink" : "border-border bg-white text-ink hover:border-primary/40"
                }`}
              >
                {r.label}
                <span className="flex items-center gap-2 text-xs font-normal text-ink-muted">
                  {count(r.value)} รายการ
                  {selected && <Check size={18} strokeWidth={2.5} className="text-primary" />}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={() => onApply("all")}
            className="h-12 rounded-[14px] border border-border px-5 text-sm font-semibold text-ink hover:border-primary/50"
          >
            ล้าง
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="h-12 flex-1 rounded-[14px] bg-primary text-sm font-semibold text-cream hover:bg-primary-hover"
          >
            ดูผลลัพธ์ ({count(draft)})
          </button>
        </div>
      </div>
    </div>
  );
}
