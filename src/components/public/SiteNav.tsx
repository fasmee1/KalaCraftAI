"use client";

import { Heart, House, Images, Menu, ShoppingBag, TriangleAlert, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SessionProvider, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { AccountMenu } from "./AccountButton";
import { FavoriteLoginPrompt } from "./FavoriteLoginPrompt";
import { useFavorites } from "./favoritesStore";
import { ThemeToggle } from "@/components/ThemeToggle";

const ICON_BUTTON =
  "flex size-10 shrink-0 items-center justify-center rounded-full bg-beige text-ink transition hover:bg-border/60";

type NavLink = { href: string; label: string; icon: LucideIcon; customerOnly?: boolean };

const FAVORITES_PATH = "/favorites";

const LINKS: NavLink[] = [
  { href: "/", label: "หน้าแรก", icon: House },
  { href: "/products", label: "สินค้า", icon: ShoppingBag },
  { href: FAVORITES_PATH, label: "รายการโปรด", icon: Heart, customerOnly: true },
  { href: "/designs", label: "ดีไซน์ของฉัน", icon: Images, customerOnly: true },
];

/** แถบเมนูบนของหน้าลูกค้า — เดสก์ท็อป: ลิงก์เรียงในแถบ / มือถือ: ปุ่มเมนูเปิดแผงลิงก์ */
export function SiteNav() {
  return (
    <SessionProvider>
      <NavBar />
    </SessionProvider>
  );
}

function NavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  // จำ path ที่เปิดเมนูไว้ — เปลี่ยนหน้าแล้วเมนูปิดเองโดยไม่ต้อง reset state
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const [scrolled, setScrolled] = useState(false);
  const favoriteCount = useFavorites().ids.size;
  // ล็อกอินด้วยบัญชีที่ถูกระงับ → NextAuth ส่งกลับมาพร้อม ?suspended=1 (lib/auth.ts)
  const [suspendedNotice, setSuspendedNotice] = useState(false);

  const isCustomer = session?.user?.role === "customer";
  const links = LINKS.filter((link) => !link.customerOnly || isCustomer);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("suspended")) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- query string อ่านได้หลัง mount เท่านั้น
    setSuspendedNotice(true);
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenAt(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-30">
      {/* พื้นหลังเบลอแยกเป็นชั้นของตัวเอง — ใส่ backdrop-filter ที่ header จะทำให้ชั้น fixed ของเมนูย่อยถูกจำกัดอยู่ในแถบ */}
      <div
        aria-hidden
        className={`absolute inset-0 -z-10 border-b bg-cream/85 backdrop-blur-md transition-[border-color,box-shadow] duration-300 ${
          scrolled || open ? "border-border shadow-[0_4px_20px_rgba(107,66,38,0.08)]" : "border-transparent"
        }`}
      />

      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-3 pl-[15px] pr-4 lg:h-[72px] lg:px-10">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="flex size-[43px] shrink-0 items-center justify-center rounded-full bg-primary text-[15px] font-bold leading-none text-cream shadow-[0_4px_10px_rgba(107,66,38,0.25)]">
            KC
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold leading-[1.3] text-primary">KalaCraft AI</span>
            <span className="block truncate text-[11px] leading-[1.3] text-ink-muted">หัตถกรรมกะลามะพร้าว</span>
          </span>
        </Link>

        {/* เดสก์ท็อป: ลิงก์ในแคปซูลกลางแถบ */}
        <nav aria-label="เมนูหลัก" className="hidden items-center gap-1 rounded-full border border-border/70 bg-beige/60 p-1 lg:flex">
          {links.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition ${
                  active
                    ? "bg-surface text-primary shadow-[0_2px_8px_rgba(107,66,38,0.14)]"
                    : "text-ink-muted hover:bg-surface/60 hover:text-ink"
                }`}
              >
                <Icon className="size-4" aria-hidden />
                {label}
                {href === FAVORITES_PATH && <CountBadge count={favoriteCount} />}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <AccountMenu />
          <ThemeToggle className={ICON_BUTTON} />
          <button
            type="button"
            onClick={() => setOpenAt(open ? null : pathname)}
            aria-expanded={open}
            aria-controls="site-nav-menu"
            aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
            className={`${ICON_BUTTON} lg:hidden`}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>

      {/* มือถือ: แผงลิงก์ใต้แถบ */}
      {open && (
        <div className="lg:hidden">
          <button
            type="button"
            aria-label="ปิดเมนู"
            onClick={() => setOpenAt(null)}
            className="fade-anim fixed inset-x-0 bottom-0 top-16 -z-20 cursor-default bg-scrim/40"
          />
          <nav
            id="site-nav-menu"
            aria-label="เมนูหลัก"
            className="menu-anim absolute inset-x-3 top-full mt-2 rounded-2xl border border-border bg-surface p-2 shadow-[0_12px_32px_rgba(107,66,38,0.18)]"
          >
            <ul className="flex flex-col gap-1">
              {links.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpenAt(null)}
                      aria-current={active ? "page" : undefined}
                      className={`flex h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition ${
                        active ? "bg-primary text-cream" : "text-ink hover:bg-beige"
                      }`}
                    >
                      <span
                        className={`flex size-8 items-center justify-center rounded-lg ${
                          active ? "bg-cream/15" : "bg-beige text-primary"
                        }`}
                      >
                        <Icon className="size-[18px]" aria-hidden />
                      </span>
                      {label}
                      {href === FAVORITES_PATH && <CountBadge count={favoriteCount} className="ml-auto" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      )}

      {suspendedNotice && (
        <div role="alert" className="mx-auto w-full max-w-[1200px] px-4 pb-2 lg:px-10">
          <p className="flex items-start gap-2 rounded-xl border border-danger/30 bg-surface px-3 py-2.5 text-sm text-danger shadow-[0_4px_20px_rgba(107,66,38,0.08)]">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span className="flex-1">บัญชีนี้ถูกระงับการใช้งาน จึงเข้าสู่ระบบไม่ได้ หากมีข้อสงสัยกรุณาติดต่อเพจ</span>
            <button type="button" onClick={() => setSuspendedNotice(false)} aria-label="ปิดข้อความ" className="shrink-0 text-ink-muted hover:text-ink">
              <X className="size-4" aria-hidden />
            </button>
          </p>
        </div>
      )}

      <FavoriteLoginPrompt />
    </header>
  );
}

function CountBadge({ count, className = "" }: { count: number; className?: string }) {
  if (count === 0) return null;
  return (
    <span
      className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold leading-none text-on-accent ${className}`}
    >
      {count}
    </span>
  );
}
