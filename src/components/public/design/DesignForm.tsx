"use client";

import { Check, ChevronUp, Info, RectangleHorizontal, RectangleVertical, Square } from "lucide-react";
import type { ReactNode } from "react";
import type { CatalogOption, DesignCatalog } from "@/lib/catalog";
import { ASPECT_RATIOS, NOTE_MAX_LENGTH, OPTION_TYPES, type OptionType } from "@/lib/optionTypes";
import { PatternPreview } from "./PatternPreview";

export type AspectRatioValue = (typeof ASPECT_RATIOS)[number]["value"];

export type DesignSelection = {
  categoryId: string | null;
  productId: string | null;
  options: Record<OptionType, string[]>;
  aspectRatio: AspectRatioValue;
  note: string;
};

export const emptySelection = (): DesignSelection => ({
  categoryId: null,
  productId: null,
  options: Object.fromEntries(OPTION_TYPES.map((t) => [t.key, []])) as unknown as Record<OptionType, string[]>,
  aspectRatio: "1:1",
  note: "",
});

const ASPECT_ICON = { "1:1": Square, "3:4": RectangleVertical, "16:9": RectangleHorizontal } as const;

export function DesignForm({
  catalog,
  value,
  onChange,
  optionalOpen,
  onToggleOptional,
}: {
  catalog: DesignCatalog;
  value: DesignSelection;
  onChange: (next: DesignSelection) => void;
  optionalOpen: boolean;
  onToggleOptional: () => void;
}) {
  const products = catalog.products.filter((p) => p.categoryId === value.categoryId);
  const optionsOf = (type: OptionType) => catalog.options.filter((o) => o.type === type);

  const toggleOption = (type: OptionType, id: string) => {
    const meta = OPTION_TYPES.find((t) => t.key === type)!;
    const current = value.options[type];
    const next = current.includes(id)
      ? meta.required && !meta.multiple
        ? current // ตัวเลือกบังคับแบบเลือกเดียว — กดซ้ำไม่ยกเลิก
        : current.filter((x) => x !== id)
      : meta.multiple
        ? [...current, id]
        : [id];
    onChange({ ...value, options: { ...value.options, [type]: next } });
  };

  const selectCategory = (categoryId: string) => {
    const keepProduct = catalog.products.some((p) => p.id === value.productId && p.categoryId === categoryId);
    onChange({ ...value, categoryId, productId: keepProduct ? value.productId : null });
  };

  return (
    <div className="flex flex-col gap-6 px-5 pb-6 pt-5">
      <GroupTitle title="ข้อมูลจำเป็น" badge={<Badge tone="danger">จำเป็น</Badge>} />

      <Field n={1} title="ประเภทสินค้า" required>
        {catalog.categories.length === 0 ? (
          <Empty>ยังไม่มีประเภทสินค้า</Empty>
        ) : (
          <Chips>
            {catalog.categories.map((c) => (
              <Chip key={c.id} selected={value.categoryId === c.id} onClick={() => selectCategory(c.id)}>
                {c.name}
              </Chip>
            ))}
          </Chips>
        )}
      </Field>

      <Field n={2} title="สินค้าต้นแบบ" required hint="รูปอ้างอิงให้ AI">
        {!value.categoryId ? (
          <Empty>เลือกประเภทสินค้าก่อน</Empty>
        ) : products.length === 0 ? (
          <Empty>ยังไม่มีสินค้าในประเภทนี้</Empty>
        ) : (
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="สินค้าต้นแบบ">
            {products.map((p) => {
              const selected = value.productId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange({ ...value, productId: p.id })}
                  className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                    selected ? "border-secondary border-[1.5px] bg-secondary/5" : "border-border bg-white hover:border-primary/40"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed URL หมดอายุ ไม่ผ่าน optimizer */}
                  <img src={p.imageUrl} alt="" className="size-14 shrink-0 rounded-xl bg-beige object-cover" loading="lazy" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{p.name}</span>
                    {selected && (
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-secondary">
                        <Check size={12} strokeWidth={2.5} /> ใช้เป็นรูปต้นแบบ
                      </span>
                    )}
                  </span>
                  <Radio selected={selected} />
                </button>
              );
            })}
          </div>
        )}
      </Field>

      <OptionChips n={3} type="style" title="สไตล์" required options={optionsOf("style")} value={value} onToggle={toggleOption} />
      <OptionChips n={4} type="tone" title="โทนสี" required options={optionsOf("tone")} value={value} onToggle={toggleOption} />

      <div className="border-t border-border pt-5">
        <button
          type="button"
          onClick={onToggleOptional}
          aria-expanded={optionalOpen}
          className="flex w-full items-center justify-between"
        >
          <GroupTitle title="ตัวเลือกเสริม" badge={<Badge>ไม่บังคับ</Badge>} />
          <ChevronUp size={20} className={`text-ink-muted transition ${optionalOpen ? "" : "rotate-180"}`} />
        </button>
      </div>

      {optionalOpen && (
        <>
          <Field n={5} title="ลวดลาย/การตกแต่ง">
            <div className="grid grid-cols-3 gap-2.5">
              {optionsOf("pattern").map((o) => {
                const selected = value.options.pattern.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleOption("pattern", o.id)}
                    className={`relative flex flex-col gap-1.5 rounded-2xl border p-1.5 pb-2 transition ${
                      selected ? "border-[1.5px] border-primary bg-beige" : "border-border bg-white hover:border-primary/40"
                    }`}
                  >
                    <span className="block aspect-[4/3] w-full">
                      <PatternPreview preview={o.preview} />
                    </span>
                    <span className="text-center text-[13px] font-medium text-ink">{o.label}</span>
                    {selected && (
                      <span className="absolute right-2.5 top-2.5 flex size-6 items-center justify-center rounded-full border-2 border-white bg-primary text-cream">
                        <Check size={13} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Field>
          <OptionChips n={6} type="texture" title="ผิวสัมผัส" options={optionsOf("texture")} value={value} onToggle={toggleOption} />
          <OptionChips
            n={7}
            type="material"
            title="วัสดุผสม"
            hint="เลือกได้หลายอย่าง"
            options={optionsOf("material")}
            value={value}
            onToggle={toggleOption}
          />
          <OptionChips n={8} type="background" title="ฉากหลัง" options={optionsOf("background")} value={value} onToggle={toggleOption} />
          <OptionChips n={9} type="camera" title="มุมกล้อง" options={optionsOf("camera")} value={value} onToggle={toggleOption} />
        </>
      )}

      <div className="border-t border-border pt-5">
        <GroupTitle title="ตั้งค่าภาพ" />
      </div>

      <Field n={10} title="ขนาดภาพ">
        <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="ขนาดภาพ">
          {ASPECT_RATIOS.map((a) => {
            const Icon = ASPECT_ICON[a.value];
            const selected = value.aspectRatio === a.value;
            return (
              <button
                key={a.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange({ ...value, aspectRatio: a.value })}
                className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3.5 transition ${
                  selected ? "border-[1.5px] border-primary bg-beige" : "border-border bg-white hover:border-primary/40"
                }`}
              >
                <Icon size={26} strokeWidth={1.5} className={selected ? "text-primary" : "text-ink"} />
                <span className="text-base font-bold text-ink">{a.value}</span>
                <span className="text-[11px] text-ink-muted">{a.label}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 flex gap-2 rounded-xl bg-beige/60 px-3 py-2.5 text-xs leading-[1.6] text-ink-muted">
          <Info size={15} className="mt-0.5 shrink-0" />
          สร้างได้ครั้งละ 1 ภาพ หากต้องการแบบอื่นกด “สร้างใหม่” ได้ที่หน้าผลลัพธ์
        </p>
      </Field>

      <div className="border-t border-border pt-5">
        <GroupTitle title="รายละเอียดเพิ่มเติม" badge={<Badge>ไม่บังคับ</Badge>} />
      </div>

      <Field n={11} title="บอก AI เพิ่มเติม">
        <div className="rounded-2xl border border-border bg-white px-4 pb-2 pt-3 focus-within:border-primary">
          <textarea
            value={value.note}
            maxLength={NOTE_MAX_LENGTH}
            onChange={(e) => onChange({ ...value, note: e.target.value })}
            rows={3}
            placeholder="เช่น อยากได้ขอบชามขัดเงา มีหูจับเล็ก ๆ ด้านข้าง"
            className="w-full resize-none bg-transparent text-sm leading-[1.6] text-ink outline-none placeholder:text-ink-muted/70"
          />
          <p className="text-right text-xs text-ink-muted">
            {value.note.length}/{NOTE_MAX_LENGTH}
          </p>
        </div>
      </Field>
    </div>
  );
}

function OptionChips({
  n,
  type,
  title,
  hint,
  required,
  options,
  value,
  onToggle,
}: {
  n: number;
  type: OptionType;
  title: string;
  hint?: string;
  required?: boolean;
  options: CatalogOption[];
  value: DesignSelection;
  onToggle: (type: OptionType, id: string) => void;
}) {
  return (
    <Field n={n} title={title} required={required} hint={hint}>
      {options.length === 0 ? (
        <Empty>ยังไม่มีตัวเลือก</Empty>
      ) : (
        <Chips>
          {options.map((o) => (
            <Chip key={o.id} selected={value.options[type].includes(o.id)} onClick={() => onToggle(type, o.id)} swatch={o.swatch}>
              {o.label}
            </Chip>
          ))}
        </Chips>
      )}
    </Field>
  );
}

function Field({
  n,
  title,
  required,
  hint,
  children,
}: {
  n: number;
  title: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-ink">
        <span className="flex size-5 items-center justify-center rounded-full bg-beige text-[11px] font-semibold text-primary">
          {n}
        </span>
        {title}
        {required && <span className="-ml-1.5 text-danger">*</span>}
        {hint && <span className="text-xs font-normal text-ink-muted">{hint}</span>}
      </h3>
      {children}
    </section>
  );
}

function GroupTitle({ title, badge }: { title: string; badge?: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
      {title}
      {badge}
    </h2>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone?: "danger" }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
        tone === "danger" ? "bg-danger/10 text-danger" : "bg-beige text-ink-muted"
      }`}
    >
      {children}
    </span>
  );
}

function Chips({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function Chip({
  selected,
  onClick,
  swatch,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  swatch?: string | null;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition active:scale-[0.97] ${
        selected ? "border-primary bg-primary text-cream" : "border-border bg-white text-ink hover:border-primary/50"
      }`}
    >
      {swatch ? (
        <span
          aria-hidden
          className={`size-4 rounded-full border ${selected ? "border-cream" : "border-border"}`}
          style={{ backgroundColor: swatch }}
        />
      ) : (
        selected && <Check size={15} strokeWidth={2.5} />
      )}
      {children}
    </button>
  );
}

function Radio({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
        selected ? "border-secondary bg-secondary text-cream" : "border-border"
      }`}
    >
      {selected && <Check size={12} strokeWidth={3} />}
    </span>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-border px-3 py-3 text-center text-sm text-ink-muted">{children}</p>;
}
