import type { Metadata } from "next";
import { getProductListing } from "@/lib/catalog";
import { ProductsBrowser } from "./ProductsBrowser";
import { SORTS, type SortValue } from "./sorts";

export const metadata: Metadata = {
  title: "สินค้าแนะนำ · KalaCraftAI",
  description: "สินค้าหัตถกรรมกะลามะพร้าวทั้งหมด เลือกสินค้าแล้วให้ AI ออกแบบดีไซน์ใหม่",
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ProductsPage(props: PageProps<"/products">) {
  const params = await props.searchParams;
  const { catalog, products } = await getProductListing();

  // รับตัวกรองจาก URL (เช่น ?category=bowl&sort=popular) — ค่าที่ไม่รู้จักใช้ค่าเริ่มต้น
  const slug = first(params.category);
  const sortParam = first(params.sort);
  const initial = {
    categoryId: catalog.categories.find((c) => c.slug === slug)?.id ?? null,
    q: (first(params.q) ?? "").slice(0, 100),
    sort: (SORTS.some((s) => s.value === sortParam) ? sortParam : "recommended") as SortValue,
    productId: first(params.product) ?? null,
  };

  return <ProductsBrowser catalog={catalog} products={products} initial={initial} />;
}
