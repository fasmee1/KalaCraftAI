"use client";

import { Check, Pencil, Plus, Search, SlidersHorizontal, Trash2, TriangleAlert } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import {
  adminApi,
  Button,
  DeleteDialog,
  Field,
  FormError,
  IconButton,
  inputClass,
  Modal,
  ModalBody,
  ModalFooter,
  Switch,
  ToastRegion,
  useExitAnimation,
  useToast,
  type FieldErrors,
} from "@/components/admin/ui";
import { PatternPreview } from "@/components/public/design/PatternPreview";
import type { OptionDTO } from "@/lib/option";
import { OPTION_TYPES, PATTERN_PREVIEWS, type OptionType, type PatternPreview as PatternKey } from "@/lib/optionTypes";

type Filter = OptionType | "all";

type FormState = {
  type: OptionType;
  label: string;
  promptText: string;
  swatch: string;
  preview: PatternKey;
  sortOrder: string;
  active: boolean;
};

const PROMPT_MAX = 300;
const TYPE_ORDER = Object.fromEntries(OPTION_TYPES.map((t, i) => [t.key, i])) as Record<OptionType, number>;
const TYPE_LABEL = Object.fromEntries(OPTION_TYPES.map((t) => [t.key, t.label])) as Record<OptionType, string>;
const PREVIEW_LABEL: Record<PatternKey, string> = {
  carve: "แกะสลัก",
  cutout: "ฉลุ",
  thai: "ลายไทย",
  geometric: "เรขาคณิต",
  none: "เรียบ",
};

function sortOptions(list: OptionDTO[]) {
  return [...list].sort(
    (a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "th"),
  );
}

export function OptionManager({ initial }: { initial: OptionDTO[] }) {
  const [items, setItems] = useState(() => sortOptions(initial));
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<OptionDTO | "new" | null>(null);
  const [deleting, setDeleting] = useState<OptionDTO | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const { toast, show } = useToast();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (o) =>
        (filter === "all" || o.type === filter) &&
        (!q || o.label.toLowerCase().includes(q) || o.promptText.toLowerCase().includes(q)),
    );
  }, [items, filter, query]);

  // หมวดบังคับที่ไม่มีตัวเลือกเปิดใช้งานเลย → ลูกค้าจะสร้างภาพไม่ได้
  const blockingTypes = OPTION_TYPES.filter((t) => t.required && !items.some((o) => o.type === t.key && o.active));
  const activeCount = items.filter((o) => o.active).length;

  function upsert(option: OptionDTO) {
    setItems((prev) => sortOptions([...prev.filter((o) => o.id !== option.id), option]));
  }

  async function toggleActive(option: OptionDTO) {
    setToggling(option.id);
    const res = await adminApi<{ option: OptionDTO }>(`/api/admin/options/${option.id}`, "PATCH", { active: !option.active });
    setToggling(null);
    if (res.ok) {
      upsert(res.data.option);
      show(res.data.option.active ? `เปิดใช้งาน "${option.label}" แล้ว` : `ปิดใช้งาน "${option.label}" แล้ว`);
    } else show(res.error, "error");
  }

  const newDefaults = () => {
    const type = filter === "all" ? "style" : filter;
    const maxOrder = Math.max(0, ...items.filter((o) => o.type === type).map((o) => o.sortOrder));
    return { type, sortOrder: maxOrder + 1 };
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">ตัวเลือก</h1>
          <p className="mt-1 text-sm text-ink-muted">
            ทั้งหมด {items.length} ตัวเลือก · เปิดใช้งาน {activeCount} ตัวเลือก
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-5" aria-hidden />
          เพิ่มตัวเลือก
        </Button>
      </div>

      {blockingTypes.length > 0 && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          ลูกค้ายังสร้างภาพไม่ได้ เพราะหมวดที่บังคับเลือกยังไม่มีตัวเลือกที่เปิดใช้งาน:{" "}
          {blockingTypes.map((t) => t.label).join(", ")}
        </p>
      )}

      <div className="rounded-2xl border border-border bg-white">
        <div className="space-y-3 border-b border-border p-4">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="หมวดตัวเลือก">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="ทั้งหมด" count={items.length} />
            {OPTION_TYPES.map((t) => (
              <FilterChip
                key={t.key}
                active={filter === t.key}
                onClick={() => setFilter(t.key)}
                label={t.label}
                count={items.filter((o) => o.type === t.key).length}
                required={t.required}
              />
            ))}
          </div>
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาชื่อหรือข้อความ prompt"
              aria-label="ค้นหาตัวเลือก"
              className="w-full rounded-xl border border-border bg-cream py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState hasItems={items.length > 0} onAdd={() => setEditing("new")} />
        ) : (
          <ul className="divide-y divide-border">
            <li className="hidden grid-cols-[48px_1fr_1.4fr_110px_96px] gap-4 px-5 py-3 text-xs font-semibold text-ink-muted md:grid">
              <span />
              <span>ชื่อที่ลูกค้าเห็น</span>
              <span>ข้อความที่ส่งให้ AI</span>
              <span>สถานะ</span>
              <span className="text-right">จัดการ</span>
            </li>
            {filtered.map((o) => (
              <li
                key={o.id}
                className="grid grid-cols-[48px_1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-4 md:grid-cols-[48px_1fr_1.4fr_110px_96px]"
              >
                <OptionVisual option={o} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{o.label}</p>
                  <p className="text-xs text-ink-muted">
                    {TYPE_LABEL[o.type]} · ลำดับ {o.sortOrder}
                  </p>
                </div>
                <p className="col-span-3 line-clamp-2 font-mono text-xs text-ink-muted md:col-span-1">{o.promptText}</p>
                <div className="col-span-2 md:col-span-1">
                  <Switch checked={o.active} busy={toggling === o.id} onChange={() => toggleActive(o)} label={`สถานะ ${o.label}`} />
                </div>
                <div className="col-start-3 row-start-1 flex justify-end gap-1 md:col-start-auto md:row-start-auto">
                  <IconButton label={`แก้ไข ${o.label}`} onClick={() => setEditing(o)}>
                    <Pencil className="size-[18px]" />
                  </IconButton>
                  <IconButton label={`ลบ ${o.label}`} onClick={() => setDeleting(o)} danger>
                    <Trash2 className="size-[18px]" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <OptionFormDialog
          option={editing === "new" ? null : editing}
          defaults={newDefaults()}
          onClose={() => setEditing(null)}
          onSaved={(option, isNew) => {
            upsert(option);
            show(isNew ? `เพิ่ม "${option.label}" แล้ว` : `บันทึก "${option.label}" แล้ว`);
          }}
        />
      )}

      {deleting && (
        <DeleteDialog
          title="ลบตัวเลือก"
          name={`${TYPE_LABEL[deleting.type]}: ${deleting.label}`}
          url={`/api/admin/options/${deleting.id}`}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setItems((prev) => prev.filter((o) => o.id !== deleting.id));
            show(`ลบ "${deleting.label}" แล้ว`);
          }}
        />
      )}

      <ToastRegion toast={toast} />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  required,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  required?: boolean;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm transition ${
        active ? "border-primary bg-primary font-semibold text-cream" : "border-border text-ink hover:bg-beige"
      }`}
    >
      {label}
      {required && <span className={active ? "text-accent" : "text-danger"}>*</span>}
      <span className={`text-xs ${active ? "text-cream/70" : "text-ink-muted"}`}>{count}</span>
    </button>
  );
}

function OptionVisual({ option }: { option: Pick<OptionDTO, "type" | "swatch" | "preview"> }) {
  if (option.type === "tone" && option.swatch) {
    return <span aria-hidden className="size-10 rounded-full border border-border" style={{ backgroundColor: option.swatch }} />;
  }
  if (option.type === "pattern") {
    return (
      <span aria-hidden className="block size-10 overflow-hidden rounded-lg">
        <PatternPreview preview={option.preview} />
      </span>
    );
  }
  return (
    <span aria-hidden className="flex size-10 items-center justify-center rounded-lg bg-beige text-primary">
      <SlidersHorizontal className="size-[18px]" />
    </span>
  );
}

function EmptyState({ hasItems, onAdd }: { hasItems: boolean; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-beige text-primary">
        <SlidersHorizontal className="size-6" aria-hidden />
      </div>
      <p className="font-semibold text-ink">{hasItems ? "ไม่พบตัวเลือกที่ค้นหา" : "ยังไม่มีตัวเลือก"}</p>
      <p className="mt-1 text-sm text-ink-muted">
        {hasItems ? "ลองเปลี่ยนหมวดหรือค้นหาด้วยคำอื่น" : "เพิ่มตัวเลือก เช่น สไตล์มินิมอล หรือโทนสีธรรมชาติ"}
      </p>
      {!hasItems && (
        <Button variant="outline" onClick={onAdd} className="mt-5 h-10 text-sm">
          <Plus className="size-4" aria-hidden />
          เพิ่มตัวเลือก
        </Button>
      )}
    </div>
  );
}

function OptionFormDialog({
  option,
  defaults,
  onClose,
  onSaved,
}: {
  option: OptionDTO | null;
  defaults: { type: OptionType; sortOrder: number };
  onClose: () => void;
  onSaved: (option: OptionDTO, isNew: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>(() =>
    option
      ? {
          type: option.type,
          label: option.label,
          promptText: option.promptText,
          swatch: option.swatch ?? "#c9a27a",
          preview: option.preview ?? "none",
          sortOrder: String(option.sortOrder),
          active: option.active,
        }
      : {
          type: defaults.type,
          label: "",
          promptText: "",
          swatch: "#c9a27a",
          preview: "none",
          sortOrder: String(defaults.sortOrder),
          active: true,
        },
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const { closing, close } = useExitAnimation(onClose);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined, form: undefined }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      type: form.type,
      label: form.label,
      promptText: form.promptText,
      swatch: form.type === "tone" ? form.swatch : null,
      preview: form.type === "pattern" ? form.preview : null,
      sortOrder: form.sortOrder === "" ? 0 : Number(form.sortOrder),
      active: form.active,
    };
    const res = option
      ? await adminApi<{ option: OptionDTO }>(`/api/admin/options/${option.id}`, "PATCH", payload)
      : await adminApi<{ option: OptionDTO }>("/api/admin/options", "POST", payload);
    setSaving(false);
    if (res.ok) {
      onSaved(res.data.option, !option);
      close();
    } else setErrors({ ...res.fields, form: res.fields ? undefined : res.error });
  }

  return (
    <Modal title={option ? "แก้ไขตัวเลือก" : "เพิ่มตัวเลือก"} size="lg" closing={closing} onRequestClose={close}>
      <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalBody>
          <FormError message={errors.form} />

          <fieldset>
            <legend className="mb-1.5 block text-sm font-semibold text-ink">
              หมวด<span className="text-danger"> *</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {OPTION_TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  aria-pressed={form.type === t.key}
                  onClick={() => set("type", t.key)}
                  className={`flex h-9 items-center gap-1 rounded-full border px-3.5 text-sm transition ${
                    form.type === t.key ? "border-primary bg-primary font-semibold text-cream" : "border-border text-ink hover:bg-beige"
                  }`}
                >
                  {form.type === t.key && <Check className="size-4" aria-hidden />}
                  {t.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              {OPTION_TYPES.find((t) => t.key === form.type)?.required ? "หมวดบังคับ — ลูกค้าต้องเลือก 1 แบบ" : "หมวดไม่บังคับ"}
              {OPTION_TYPES.find((t) => t.key === form.type)?.multiple && " · ลูกค้าเลือกได้หลายอย่าง"}
            </p>
            {errors.type && <p className="mt-1 text-xs text-danger">{errors.type}</p>}
          </fieldset>

          <Field id="opt-label" label="ชื่อที่ลูกค้าเห็น" required error={errors.label}>
            <input
              id="opt-label"
              autoFocus
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
              placeholder="เช่น มินิมอล"
              maxLength={40}
              className={inputClass(errors.label)}
            />
          </Field>

          <Field
            id="opt-prompt"
            label="ข้อความที่ส่งให้ AI"
            required
            error={errors.promptText}
            hint="ภาษาอังกฤษ บรรยายหน้าตาสั้น ๆ เช่น “glossy black finish” — ลูกค้าไม่เห็นข้อความนี้"
          >
            <textarea
              id="opt-prompt"
              rows={3}
              value={form.promptText}
              onChange={(e) => set("promptText", e.target.value)}
              maxLength={PROMPT_MAX}
              placeholder="minimalist, clean simple lines"
              className={`${inputClass(errors.promptText)} resize-none font-mono text-sm`}
            />
            <p className="mt-1 text-right text-xs text-ink-muted">
              {form.promptText.length}/{PROMPT_MAX}
            </p>
          </Field>

          {form.type === "tone" && (
            <Field id="opt-swatch" label="สีตัวอย่าง" error={errors.swatch} hint="แสดงเป็นวงกลมสีบนปุ่มให้ลูกค้าเห็น">
              <div className="flex items-center gap-3">
                <input
                  id="opt-swatch"
                  type="color"
                  value={form.swatch}
                  onChange={(e) => set("swatch", e.target.value)}
                  className="h-11 w-14 cursor-pointer rounded-xl border border-border bg-white p-1"
                />
                <input
                  aria-label="รหัสสี"
                  value={form.swatch}
                  onChange={(e) => set("swatch", e.target.value.trim().toLowerCase())}
                  maxLength={7}
                  className={`${inputClass(errors.swatch)} max-w-[140px] font-mono`}
                />
              </div>
            </Field>
          )}

          {form.type === "pattern" && (
            <fieldset>
              <legend className="mb-1.5 block text-sm font-semibold text-ink">ภาพตัวอย่างลวดลาย</legend>
              <div className="grid grid-cols-5 gap-2">
                {PATTERN_PREVIEWS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={form.preview === p}
                    onClick={() => set("preview", p)}
                    className={`flex flex-col gap-1 rounded-xl border p-1.5 text-xs transition ${
                      form.preview === p ? "border-[1.5px] border-primary bg-beige font-semibold" : "border-border hover:bg-beige/50"
                    }`}
                  >
                    <span className="block aspect-square w-full">
                      <PatternPreview preview={p} />
                    </span>
                    {PREVIEW_LABEL[p]}
                  </button>
                ))}
              </div>
              {errors.preview && <p className="mt-1 text-xs text-danger">{errors.preview}</p>}
            </fieldset>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field id="opt-order" label="ลำดับการแสดง" error={errors.sortOrder}>
              <input
                id="opt-order"
                type="number"
                inputMode="numeric"
                min={0}
                max={9999}
                value={form.sortOrder}
                onChange={(e) => set("sortOrder", e.target.value)}
                className={inputClass(errors.sortOrder)}
              />
            </Field>
            <div>
              <span className="mb-1.5 block text-sm font-semibold text-ink">สถานะ</span>
              <div className="flex h-[46px] items-center">
                <Switch checked={form.active} onChange={() => set("active", !form.active)} label="เปิดใช้งาน" />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-cream px-4 py-3">
            <p className="mb-2 text-xs font-semibold text-ink-muted">ตัวอย่างที่ลูกค้าเห็น</p>
            <span className="inline-flex h-10 items-center gap-1.5 rounded-full border border-primary bg-primary px-4 text-sm font-medium text-cream">
              {form.type === "tone" ? (
                <span className="size-4 rounded-full border border-cream" style={{ backgroundColor: form.swatch }} />
              ) : (
                <Check className="size-[15px]" aria-hidden />
              )}
              {form.label || "ชื่อตัวเลือก"}
            </span>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" onClick={close}>
            ยกเลิก
          </Button>
          <Button type="submit" loading={saving}>
            {option ? "บันทึก" : "เพิ่มตัวเลือก"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
