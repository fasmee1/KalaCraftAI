import type { Metadata } from "next";
import { FavoritesView } from "@/components/public/FavoritesView";
import { SiteNav } from "@/components/public/SiteNav";
import { getProductListing } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "รายการโปรด · KalaCraftAI",
  robots: { index: false },
};

// สินค้ามาจาก catalog (เฉพาะที่ active) — id ที่กดหัวใจไว้มาจาก /api/me/favorites (ต้องล็อกอิน)
export default async function FavoritesPage() {
  const { catalog, products } = await getProductListing();
  return (
    <>
      <SiteNav />
      <FavoritesView catalog={catalog} products={products} />
    </>
  );
}
