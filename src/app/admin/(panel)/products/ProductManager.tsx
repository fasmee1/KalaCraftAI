"use client";

import { ImagePlus, Package, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
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
import type { ProductDTO } from "@/lib/product";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const DESCRIPTION_MAX = 1000;

type StatusFilter = "all" | "active" | "inactive";
type FormState = {
  name: string;
  category: string;
  description: string;
  price: string;
  sortOrder: string;
  active: boolean;
};

function sortProducts(list: ProductDTO[]) {
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "th"));
}

function formatPrice(price: number | null) {
  return price === null ? "สอบถามราคา" : `฿${price.toLocaleString("th-TH")}`;
}

export function ProductManager({ initial, categories }: { initial: ProductDTO[]; categories: CategoryDTO[] }) {
  const [items, setItems] = useState(() => sortProducts(initial));
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<ProductDTO | "new" | null>(null);
  const [deleting, setDeleting] = useState<ProductDTO | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const { toast, show } = useToast();

  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (p) =>
        (!q || p.name.toLowerCase().includes(q)) &&
        (categoryFilter === "all" || p.categoryId === categoryFilter) &&
        (statusFilter === "all" || p.active === (statusFilter === "active")),
    );
  }, [items, query, categoryFilter, statusFilter]);

  const activeCount = items.filter((p) => p.active).length;
  const noCategories = categories.length === 0;

  function upsert(p: ProductDTO) {
    setItems((prev) => sortProducts([...prev.filter((x) => x.id !== p.id), p]));
  }

  async function toggleActive(p: ProductDTO) {
    setToggling(p.id);
    const res = await adminApi<{ product: ProductDTO }>(`/api/admin/products/${p.id}`, "PATCH", { active: !p.active });
    setToggling(null);
    if (res.ok) {
      upsert(res.data.product);
      show(res.data.product.active ? `เปิดแสดง "${p.name}" แล้ว` : `ซ่อน "${p.name}" แล้ว`);
    } else show(res.error, "error");
  }

  const selectClass =
    "rounded-xl border border-border bg-cream px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">สินค้า</h1>
          <p className="mt-1 text-sm text-ink-muted">
            ทั้งหมด {items.length} รายการ · แสดงอยู่ {activeCount} รายการ
          </p>
        </div>
        <Button onClick={() => setEditing("new")} disabled={noCategories} title={noCategories ? "ต้องมีประเภทสินค้าก่อน" : undefined}>
          <Plus className="size-5" aria-hidden />
          เพิ่มสินค้า
        </Button>
      </div>

      {noCategories && (
        <div className="mb-4 rounded-xl bg-accent/15 px-4 py-3 text-sm text-ink">
          ยังไม่มีประเภทสินค้า —{" "}
          <Link href="/admin/categories" className="font-semibold text-primary underline underline-offset-2">
            เพิ่มประเภทสินค้า
          </Link>{" "}
          ก่อน แล้วจึงเพิ่มสินค้าได้
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3 rounded-2xl border border-border bg-white p-4">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อสินค้า"
            aria-label="ค้นหาสินค้า"
            className="w-full rounded-xl border border-border bg-cream py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="กรองตามประเภท" className={selectClass}>
          <option value="all">ทุกประเภท</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          aria-label="กรองตามสถานะ"
          className={selectClass}
        >
          <option value="all">ทุกสถานะ</option>
          <option value="active">แสดงอยู่</option>
          <option value="inactive">ซ่อนอยู่</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState hasItems={items.length > 0} canAdd={!noCategories} onAdd={() => setEditing("new")} />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <li key={p.id} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-white">
              <div className="relative aspect-[4/3] bg-beige">
                {/* eslint-disable-next-line @next/next/no-img-element -- รูปมาจาก signed URL ที่หมดอายุ ไม่ผ่าน next/image optimizer */}
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  loading="lazy"
                  className={`size-full object-cover transition ${p.active ? "" : "opacity-50 grayscale"}`}
                />
                {!p.active && (
                  <span className="absolute left-3 top-3 rounded-full bg-ink/75 px-2.5 py-0.5 text-xs font-medium text-cream">ซ่อนอยู่</span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 px-4 pb-3 pt-3.5">
                <span className="w-fit rounded-md bg-beige px-2 py-0.5 text-xs text-ink-muted">
                  {categoryName.get(p.categoryId) ?? "ไม่มีประเภท"}
                </span>
                <p className="truncate font-semibold text-ink" title={p.name}>
                  {p.name}
                </p>
                <p className="text-sm font-semibold text-primary">{formatPrice(p.price)}</p>
              </div>
              <div className="flex items-center justify-between border-t border-border px-4 py-2">
                <Switch checked={p.active} busy={toggling === p.id} onChange={() => toggleActive(p)} label={`แสดง ${p.name}`} />
                <div className="flex gap-1">
                  <IconButton label={`แก้ไข ${p.name}`} onClick={() => setEditing(p)}>
                    <Pencil className="size-[18px]" />
                  </IconButton>
                  <IconButton label={`ลบ ${p.name}`} onClick={() => setDeleting(p)} danger>
                    <Trash2 className="size-[18px]" />
                  </IconButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <ProductFormDialog
          product={editing === "new" ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={(p, isNew) => {
            upsert(p);
            show(isNew ? `เพิ่ม "${p.name}" แล้ว` : `บันทึก "${p.name}" แล้ว`);
          }}
        />
      )}

      {deleting && (
        <DeleteDialog
          title="ลบสินค้า"
          name={deleting.name}
          url={`/api/admin/products/${deleting.id}`}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setItems((prev) => prev.filter((p) => p.id !== deleting.id));
            show(`ลบ "${deleting.name}" แล้ว`);
          }}
        />
      )}

      <ToastRegion toast={toast} />
    </div>
  );
}

function EmptyState({ hasItems, canAdd, onAdd }: { hasItems: boolean; canAdd: boolean; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-border bg-white px-6 py-16 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-beige text-primary">
        <Package className="size-6" aria-hidden />
      </div>
      <p className="font-semibold text-ink">{hasItems ? "ไม่พบสินค้าที่ตรงกับตัวกรอง" : "ยังไม่มีสินค้า"}</p>
      <p className="mt-1 text-sm text-ink-muted">{hasItems ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "เพิ่มสินค้าแรกพร้อมรูปต้นแบบให้ AI ใช้อ้างอิง"}</p>
      {!hasItems && canAdd && (
        <Button variant="outline" onClick={onAdd} className="mt-5 h-10 text-sm">
          <Plus className="size-4" aria-hidden />
          เพิ่มสินค้า
        </Button>
      )}
    </div>
  );
}

function ProductFormDialog({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: ProductDTO | null;
  categories: CategoryDTO[];
  onClose: () => void;
  onSaved: (p: ProductDTO, isNew: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>(() =>
    product
      ? {
          name: product.name,
          category: product.categoryId,
          description: product.description,
          price: product.price === null ? "" : String(product.price),
          sortOrder: String(product.sortOrder),
          active: product.active,
        }
      : { name: "", category: "", description: "", price: "", sortOrder: "0", active: true },
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const { closing, close } = useExitAnimation(onClose);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined, form: undefined }));
  }

  function pickFile(f: File | undefined) {
    if (!f) return;
    if (!IMAGE_TYPES.includes(f.type)) return setErrors((e) => ({ ...e, image: "รองรับเฉพาะไฟล์ PNG, JPG หรือ WEBP" }));
    if (f.size > MAX_IMAGE_BYTES) return setErrors((e) => ({ ...e, image: "รูปต้องมีขนาดไม่เกิน 5 MB" }));
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = URL.createObjectURL(f);
    setPreview(previewRef.current);
    setFile(f);
    setErrors((e) => ({ ...e, image: undefined, form: undefined }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!product && !file) {
      setErrors((er) => ({ ...er, image: "กรุณาอัปโหลดรูปต้นแบบ" }));
      return;
    }
    setSaving(true);
    const body = new FormData();
    for (const [key, value] of Object.entries(form)) body.append(key, String(value));
    if (file) body.append("image", file);
    const res = product
      ? await adminApi<{ product: ProductDTO }>(`/api/admin/products/${product.id}`, "PUT", body)
      : await adminApi<{ product: ProductDTO }>("/api/admin/products", "POST", body);
    setSaving(false);
    if (res.ok) {
      onSaved(res.data.product, !product);
      close();
    } else setErrors({ ...res.fields, form: res.fields ? "กรุณาตรวจสอบช่องที่มีข้อความสีแดง" : res.error });
  }

  return (
    <Modal title={product ? "แก้ไขสินค้า" : "เพิ่มสินค้า"} size="lg" closing={closing} onRequestClose={close}>
      <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalBody>
          <FormError message={errors.form} />

          <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
            <ImagePicker file={file} preview={preview} currentUrl={product?.imageUrl} error={errors.image} onPick={pickFile} />

            <div className="space-y-4">
              <Field id="p-name" label="ชื่อสินค้า" required error={errors.name}>
                <input
                  id="p-name"
                  autoFocus
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="เช่น ชามกะลามินิมอล"
                  maxLength={120}
                  className={inputClass(errors.name)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field id="p-category" label="ประเภทสินค้า" required error={errors.category}>
                  <select id="p-category" value={form.category} onChange={(e) => set("category", e.target.value)} className={inputClass(errors.category)}>
                    <option value="" disabled>
                      เลือกประเภท
                    </option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.active ? "" : " (ปิดอยู่)"}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="p-price" label="ราคา (บาท)" error={errors.price} hint="เว้นว่าง = สอบถามราคา">
                  <input
                    id="p-price"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={form.price}
                    onChange={(e) => set("price", e.target.value)}
                    placeholder="290"
                    className={inputClass(errors.price)}
                  />
                </Field>
              </div>
            </div>
          </div>

          <Field id="p-desc" label="รายละเอียดสินค้า" error={errors.description}>
            <textarea
              id="p-desc"
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              maxLength={DESCRIPTION_MAX}
              placeholder="ไม่บังคับ — แสดงให้ลูกค้าเห็นในหน้ารายละเอียดสินค้า"
              className={`${inputClass(errors.description)} resize-none`}
            />
            <p className="mt-1 text-right text-xs text-ink-muted">
              {form.description.length}/{DESCRIPTION_MAX}
            </p>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field id="p-order" label="ลำดับการแสดง" error={errors.sortOrder}>
              <input
                id="p-order"
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
              <span className="mb-1.5 block text-sm font-semibold text-ink">แสดงให้ลูกค้าเห็น</span>
              <div className="flex h-[46px] items-center">
                <Switch checked={form.active} onChange={() => set("active", !form.active)} label="แสดงให้ลูกค้าเห็น" />
              </div>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" onClick={close}>
            ยกเลิก
          </Button>
          <Button type="submit" loading={saving}>
            {saving ? (file ? "กำลังอัปโหลด…" : "กำลังบันทึก…") : product ? "บันทึก" : "เพิ่มสินค้า"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function ImagePicker({
  file,
  preview,
  currentUrl,
  error,
  onPick,
}: {
  file: File | null;
  preview: string | null;
  currentUrl?: string;
  error?: string;
  onPick: (f: File | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const shown = preview ?? currentUrl;

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    onPick(e.dataTransfer.files[0]);
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-ink">
        รูปต้นแบบ<span className="text-danger"> *</span>
      </span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        aria-label={shown ? "เปลี่ยนรูปต้นแบบ" : "อัปโหลดรูปต้นแบบ"}
        className={`group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition ${
          error ? "border-danger" : dragOver ? "border-primary bg-beige" : "border-border bg-cream hover:border-primary/60"
        }`}
      >
        {shown ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- blob preview / signed URL */}
            <img src={shown} alt="รูปต้นแบบ" className="size-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-ink/60 py-2 text-xs font-medium text-cream opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
              <RefreshCw className="size-3.5" aria-hidden />
              เปลี่ยนรูป
            </span>
          </>
        ) : (
          <span className="flex flex-col items-center gap-2 px-4 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-beige text-primary">
              <ImagePlus className="size-6" aria-hidden />
            </span>
            <span className="text-sm font-medium text-ink">คลิกหรือลากรูปมาวาง</span>
            <span className="text-xs text-ink-muted">PNG, JPG, WEBP ไม่เกิน 5 MB</span>
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error ? (
        <p className="mt-1 text-xs text-danger">{error}</p>
      ) : (
        file && <p className="mt-1 truncate text-xs text-secondary">เลือก {file.name} แล้ว</p>
      )}
    </div>
  );
}
