"use client";

import Link from "next/link";
import type { DesignCatalog, ListingProduct } from "@/lib/catalog";
import { FeaturedGrid } from "./FeaturedGrid";
import { useFavorites } from "./favoritesStore";
import { HeartIcon } from "./icons";

/** หน้า "รายการโปรด" — สินค้าที่ลูกค้ากดหัวใจไว้ (เฉพาะที่ยัง active) กดการ์ดเพื่อดู/สร้างดีไซน์ได้เหมือนหน้าแรก */
export function FavoritesView({ catalog, products }: { catalog: DesignCatalog; products: ListingProduct[] }) {
  const { status, ids } = useFavorites();
  const favorites = products.filter((p) => ids.has(p.id));

  return (
    <main className="mx-auto w-full max-w-[1200px] px-6 pb-16 pt-3 lg:px-10 lg:pt-6">
      <h1 className="text-xl font-bold text-primary lg:text-[28px]">รายการโปรด</h1>

      {(status === "idle" || status === "loading") && (
        <ul className="mt-[17px] grid grid-cols-2 gap-[13px] md:grid-cols-3 lg:mt-5 lg:grid-cols-4 lg:gap-6">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="skeleton aspect-[170/180] rounded-2xl" />
          ))}
        </ul>
      )}

      {status === "signed-out" && (
        <Notice title="เข้าสู่ระบบเพื่อดูรายการโปรด" text="กดปุ่มบัญชีที่มุมขวาบน แล้วเข้าสู่ระบบด้วย Google" />
      )}
      {status === "ready" && favorites.length === 0 && (
        <Notice title="ยังไม่มีรายการโปรด" text="กดรูปหัวใจที่สินค้าที่ชอบ เพื่อเก็บไว้ดูที่นี่" />
      )}
      {status === "ready" && favorites.length > 0 && (
        <>
          <p className="mt-1 text-xs text-ink-muted lg:text-sm">{favorites.length} รายการ</p>
          <FeaturedGrid catalog={catalog} products={favorites} />
        </>
      )}
    </main>
  );
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-beige text-primary">
        <HeartIcon size={28} />
      </span>
      <h2 className="text-xl font-bold text-primary">{title}</h2>
      <p className="max-w-xs text-sm text-ink-muted">{text}</p>
      <Link
        href="/products"
        className="flex h-12 items-center justify-center rounded-[14px] bg-accent px-6 font-semibold text-on-accent hover:brightness-[1.04]"
      >
        ดูสินค้าทั้งหมด
      </Link>
    </div>
  );
}
