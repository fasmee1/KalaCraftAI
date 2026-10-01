"use client";

import { Pencil, Plus, Search, Tags, Trash2 } from "lucide-react";
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
import type { CategoryDTO } from "@/lib/category";

type FormState = { name: string; slug: string; description: string; sortOrder: string; active: boolean };

const EMPTY_FORM: FormState = { name: "", slug: "", description: "", sortOrder: "0", active: true };
const DESCRIPTION_MAX = 300;

function sortCategories(list: CategoryDTO[]) {
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "th"));
}

export function CategoryManager({ initial }: { initial: CategoryDTO[] }) {
  const [items, setItems] = useState(() => sortCategories(initial));
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<CategoryDTO | "new" | null>(null);
  const [deleting, setDeleting] = useState<CategoryDTO | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const { toast, show } = useToast();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) => c.name.toLowerCase().includes(q) || c.slug.includes(q));
  }, [items, query]);

  const activeCount = items.filter((c) => c.active).length;

  function upsert(cat: CategoryDTO) {
    setItems((prev) => sortCategories([...prev.filter((c) => c.id !== cat.id), cat]));
  }

  async function toggleActive(cat: CategoryDTO) {
    setToggling(cat.id);
    const res = await adminApi<{ category: CategoryDTO }>(`/api/admin/categories/${cat.id}`, "PATCH", { active: !cat.active });
    setToggling(null);
    if (res.ok) {
      upsert(res.data.category);
      show(res.data.category.active ? `เปิดใช้งาน "${cat.name}" แล้ว` : `ปิดใช้งาน "${cat.name}" แล้ว`);
    } else show(res.error, "error");
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">ประเภทสินค้า</h1>
          <p className="mt-1 text-sm text-ink-muted">
            ทั้งหมด {items.length} ประเภท · เปิดใช้งาน {activeCount} ประเภท
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-5" aria-hidden />
          เพิ่มประเภท
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-surface">
        <div className="border-b border-border p-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาชื่อหรือ slug"
              aria-label="ค้นหาประเภทสินค้า"
              className="w-full rounded-xl border border-border bg-cream py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState hasItems={items.length > 0} onAdd={() => setEditing("new")} />
        ) : (
          <ul className="divide-y divide-border">
            <li className="hidden grid-cols-[64px_1fr_1.2fr_120px_96px] gap-4 px-5 py-3 text-xs font-semibold text-ink-muted md:grid">
              <span>ลำดับ</span>
              <span>ชื่อประเภท</span>
              <span>คำอธิบาย</span>
              <span>สถานะ</span>
              <span className="text-right">จัดการ</span>
            </li>
            {filtered.map((cat) => (
              <li
                key={cat.id}
                className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-4 md:grid-cols-[64px_1fr_1.2fr_120px_96px]"
              >
                <span className="hidden text-sm tabular-nums text-ink-muted md:block">{cat.sortOrder}</span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{cat.name}</p>
                  <p className="truncate font-mono text-xs text-ink-muted">{cat.slug}</p>
                </div>
                <p className="col-span-2 line-clamp-2 text-sm text-ink-muted md:col-span-1">
                  {cat.description || <span className="text-ink-muted/50">—</span>}
                </p>
                <div className="col-span-1">
                  <Switch checked={cat.active} busy={toggling === cat.id} onChange={() => toggleActive(cat)} label={`สถานะ ${cat.name}`} />
                </div>
                <div className="col-start-2 row-start-1 flex justify-end gap-1 md:col-start-auto md:row-start-auto">
                  <IconButton label={`แก้ไข ${cat.name}`} onClick={() => setEditing(cat)}>
                    <Pencil className="size-[18px]" />
                  </IconButton>
                  <IconButton label={`ลบ ${cat.name}`} onClick={() => setDeleting(cat)} danger>
                    <Trash2 className="size-[18px]" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <CategoryFormDialog
          category={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(cat, isNew) => {
            upsert(cat);
            show(isNew ? `เพิ่ม "${cat.name}" แล้ว` : `บันทึก "${cat.name}" แล้ว`);
          }}
        />
      )}

      {deleting && (
        <DeleteDialog
          title="ลบประเภทสินค้า"
          name={deleting.name}
          url={`/api/admin/categories/${deleting.id}`}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setItems((prev) => prev.filter((c) => c.id !== deleting.id));
            show(`ลบ "${deleting.name}" แล้ว`);
          }}
        />
      )}

      <ToastRegion toast={toast} />
    </div>
  );
}

function EmptyState({ hasItems, onAdd }: { hasItems: boolean; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-beige text-primary">
        <Tags className="size-6" aria-hidden />
      </div>
      <p className="font-semibold text-ink">{hasItems ? "ไม่พบประเภทที่ค้นหา" : "ยังไม่มีประเภทสินค้า"}</p>
      <p className="mt-1 text-sm text-ink-muted">{hasItems ? "ลองค้นหาด้วยคำอื่น" : "เพิ่มประเภทแรก เช่น ชาม แก้ว โคมไฟ"}</p>
      {!hasItems && (
        <Button variant="outline" onClick={onAdd} className="mt-5 h-10 text-sm">
          <Plus className="size-4" aria-hidden />
          เพิ่มประเภท
        </Button>
      )}
    </div>
  );
}

function CategoryFormDialog({
  category,
  onClose,
  onSaved,
}: {
  category: CategoryDTO | null;
  onClose: () => void;
  onSaved: (cat: CategoryDTO, isNew: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>(
    category
      ? { name: category.name, slug: category.slug, description: category.description, sortOrder: String(category.sortOrder), active: category.active }
      : EMPTY_FORM,
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
    const payload = { ...form, sortOrder: form.sortOrder === "" ? 0 : Number(form.sortOrder) };
    const res = category
      ? await adminApi<{ category: CategoryDTO }>(`/api/admin/categories/${category.id}`, "PATCH", payload)
      : await adminApi<{ category: CategoryDTO }>("/api/admin/categories", "POST", payload);
    setSaving(false);
    if (res.ok) {
      onSaved(res.data.category, !category);
      close();
    } else setErrors({ ...res.fields, form: res.fields ? undefined : res.error });
  }

  return (
    <Modal title={category ? "แก้ไขประเภทสินค้า" : "เพิ่มประเภทสินค้า"} closing={closing} onRequestClose={close}>
      <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalBody>
          <FormError message={errors.form} />

          <Field id="cat-name" label="ชื่อประเภท" required error={errors.name}>
            <input
              id="cat-name"
              autoFocus
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="เช่น ชาม"
              maxLength={100}
              className={inputClass(errors.name)}
            />
          </Field>

          <Field id="cat-slug" label="Slug" required error={errors.slug} hint="ใช้ในลิงก์ เฉพาะ a-z, 0-9 และ - เช่น bowl">
            <input
              id="cat-slug"
              value={form.slug}
              onChange={(e) => set("slug", e.target.value.toLowerCase())}
              placeholder="bowl"
              maxLength={60}
              className={`${inputClass(errors.slug)} font-mono`}
            />
          </Field>

          <Field id="cat-desc" label="คำอธิบาย" error={errors.description}>
            <textarea
              id="cat-desc"
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              maxLength={DESCRIPTION_MAX}
              placeholder="ไม่บังคับ"
              className={`${inputClass(errors.description)} resize-none`}
            />
            <p className="mt-1 text-right text-xs text-ink-muted">
              {form.description.length}/{DESCRIPTION_MAX}
            </p>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field id="cat-order" label="ลำดับการแสดง" error={errors.sortOrder}>
              <input
                id="cat-order"
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
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" onClick={close}>
            ยกเลิก
          </Button>
          <Button type="submit" loading={saving}>
            {category ? "บันทึก" : "เพิ่มประเภท"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
