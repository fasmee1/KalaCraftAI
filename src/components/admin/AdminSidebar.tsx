"use client";

import { LayoutDashboard, LogOut, Menu, Package, SlidersHorizontal, Tags, Users, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

type NavItem = { href: string; label: string; icon: LucideIcon; ready: boolean };

const NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard, ready: true },
  { href: "/admin/categories", label: "ประเภทสินค้า", icon: Tags, ready: true },
  { href: "/admin/products", label: "สินค้า", icon: Package, ready: true },
  { href: "/admin/options", label: "ตัวเลือก", icon: SlidersHorizontal, ready: true },
  { href: "/admin/customers", label: "ลูกค้า", icon: Users, ready: true },
];

export function AdminSidebar({ username }: { username: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* แถบบนสำหรับมือถือ */}
      <header className="flex items-center justify-between bg-sidebar px-4 py-3 text-on-dark lg:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
          aria-expanded={open}
          className="flex size-10 items-center justify-center rounded-lg hover:bg-white/10"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>

      <aside
        className={`${open ? "flex" : "hidden"} flex-col bg-sidebar text-on-dark lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0`}
      >
        <div className="hidden px-6 pb-6 pt-7 lg:block">
          <Brand />
        </div>

        <nav className="flex-1 space-y-1 px-3 py-3 lg:py-0" aria-label="เมนูแอดมิน">
          {NAV.map(({ href, label, icon: Icon, ready }) => {
            const active = pathname.startsWith(href);
            if (!ready) {
              return (
                <span
                  key={href}
                  className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] text-on-dark/40"
                >
                  <Icon className="size-5" aria-hidden />
                  {label}
                  <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[11px]">เร็ว ๆ นี้</span>
                </span>
              );
            }
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition ${
                  active ? "bg-accent font-semibold text-on-accent" : "hover:bg-white/10"
                }`}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          <div className="mb-2 flex items-center gap-3 px-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold uppercase text-cream">
              {username.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{username}</p>
              <p className="text-xs text-on-dark/60">ผู้ดูแลระบบ</p>
            </div>
          </div>
          <ThemeToggle
            label
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] hover:bg-white/10"
          />
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] hover:bg-white/10"
          >
            <LogOut className="size-5" aria-hidden />
            ออกจากระบบ
          </button>
        </div>
      </aside>
    </>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-cream">KC</div>
      <div>
        <p className="font-semibold leading-tight">KalaCraft AI</p>
        <p className="text-xs text-on-dark/60">ระบบจัดการหลังร้าน</p>
      </div>
    </div>
  );
}
