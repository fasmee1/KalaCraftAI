"use client";

import { Search, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { adminApi, DeleteDialog, IconButton, Switch, ToastRegion, useToast } from "@/components/admin/ui";
import type { CustomerDTO } from "@/lib/customer";

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("th-TH", { dateStyle: "medium" }) : "—";
}

export function CustomerManager({ initial, total }: { initial: CustomerDTO[]; total: number }) {
  const [items, setItems] = useState(initial);
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<CustomerDTO | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const { toast, show } = useToast();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) => c.name.toLowerCase().includes(q) || c.email.includes(q));
  }, [items, query]);

  const suspendedCount = items.filter((c) => c.suspended).length;
  // จำนวนทั้งระบบ หักรายการที่ลบไปในหน้านี้แล้ว
  const totalNow = total - (initial.length - items.length);

  async function toggleSuspended(customer: CustomerDTO) {
    setToggling(customer.id);
    const res = await adminApi<{ suspended: boolean }>(`/api/admin/customers/${customer.id}`, "PATCH", {
      suspended: !customer.suspended,
    });
    setToggling(null);
    if (!res.ok) return show(res.error, "error");
    setItems((prev) => prev.map((c) => (c.id === customer.id ? { ...c, suspended: res.data.suspended } : c)));
    show(res.data.suspended ? `ระงับบัญชี ${customer.email} แล้ว` : `ปลดระงับบัญชี ${customer.email} แล้ว`);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">ลูกค้า</h1>
        <p className="mt-1 text-sm text-ink-muted">
          ลูกค้าที่เข้าสู่ระบบด้วย Google ทั้งหมด {totalNow} บัญชี · ถูกระงับ {suspendedCount} บัญชี
          {totalNow > items.length && ` · แสดง ${items.length} บัญชีล่าสุด`}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface">
        <div className="border-b border-border p-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาชื่อหรืออีเมล"
              aria-label="ค้นหาลูกค้า"
              className="w-full rounded-xl border border-border bg-cream py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState hasItems={items.length > 0} />
        ) : (
          <ul className="divide-y divide-border">
            <li className="hidden grid-cols-[1.6fr_110px_110px_110px_110px_48px] gap-4 px-5 py-3 text-xs font-semibold text-ink-muted md:grid">
              <span>ลูกค้า</span>
              <span>สมัครเมื่อ</span>
              <span>เข้าใช้ล่าสุด</span>
              <span>ดีไซน์ / บันทึก</span>
              <span>ใช้งานได้</span>
              <span className="text-right">ลบ</span>
            </li>
            {filtered.map((customer) => (
              <li
                key={customer.id}
                className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-4 md:grid-cols-[1.6fr_110px_110px_110px_110px_48px]"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate font-semibold text-ink">
                    <span className="truncate">{customer.name || "ไม่ระบุชื่อ"}</span>
                    {customer.suspended && (
                      <span className="shrink-0 rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger">ถูกระงับ</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-ink-muted">{customer.email}</p>
                </div>
                <p className="col-span-2 text-xs text-ink-muted md:hidden">
                  สมัคร {formatDate(customer.createdAt)} · เข้าใช้ล่าสุด {formatDate(customer.lastLoginAt)} · ดีไซน์ {customer.designs} /
                  บันทึก {customer.saved}
                </p>
                <span className="hidden text-sm text-ink-muted md:block">{formatDate(customer.createdAt)}</span>
                <span className="hidden text-sm text-ink-muted md:block">{formatDate(customer.lastLoginAt)}</span>
                <span className="hidden text-sm tabular-nums text-ink-muted md:block">
                  {customer.designs} / {customer.saved}
                </span>
                <div>
                  <Switch
                    checked={!customer.suspended}
                    busy={toggling === customer.id}
                    onChange={() => toggleSuspended(customer)}
                    label={`อนุญาตให้ ${customer.email} ใช้งาน`}
                  />
                </div>
                <div className="col-start-2 row-start-1 flex justify-end md:col-start-auto md:row-start-auto">
                  <IconButton label={`ลบบัญชี ${customer.email}`} onClick={() => setDeleting(customer)} danger>
                    <Trash2 className="size-[18px]" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {deleting && (
        <DeleteDialog
          title="ลบบัญชีลูกค้า"
          name={deleting.email}
          note="ลบแล้วกู้คืนไม่ได้ รูปที่ลูกค้าบันทึกไว้และรายการโปรดจะถูกลบทั้งหมด ลูกค้ายังสมัครใหม่ด้วย Google ได้ — ถ้าต้องการห้ามใช้งาน ให้ปิดสวิตช์ “ใช้งานได้” แทน"
          url={`/api/admin/customers/${deleting.id}`}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setItems((prev) => prev.filter((c) => c.id !== deleting.id));
            show(`ลบบัญชี ${deleting.email} แล้ว`);
          }}
        />
      )}

      <ToastRegion toast={toast} />
    </div>
  );
}

function EmptyState({ hasItems }: { hasItems: boolean }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-beige text-primary">
        <Users className="size-6" aria-hidden />
      </div>
      <p className="font-semibold text-ink">{hasItems ? "ไม่พบลูกค้าที่ค้นหา" : "ยังไม่มีลูกค้า"}</p>
      <p className="mt-1 text-sm text-ink-muted">
        {hasItems ? "ลองค้นหาด้วยคำอื่น" : "ลูกค้าที่เข้าสู่ระบบด้วย Google จะแสดงที่นี่"}
      </p>
    </div>
  );
}
