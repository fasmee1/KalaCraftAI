"use client";

import { useState } from "react";
import type { DesignCatalog, ListingProduct } from "@/lib/catalog";
import { DesignStudio, type DesignPreselect } from "./design/DesignStudio";
import { ProductCard } from "./ProductCard";
import { ProductModal } from "./ProductModal";

/** "สินค้าแนะนำ" หน้าแรก — กดการ์ดเปิด popup สินค้า (ดาวน์โหลด/แชร์/สร้างดีไซน์จากสินค้านี้) */
export function FeaturedGrid({ catalog, products }: { catalog: DesignCatalog; products: ListingProduct[] }) {
  const [viewing, setViewing] = useState<ListingProduct | null>(null);
  const [preselect, setPreselect] = useState<DesignPreselect | null>(null);

  return (
    <>
      <ul className="mt-[17px] grid grid-cols-2 gap-[13px] md:grid-cols-3 lg:mt-5 lg:grid-cols-4 lg:gap-6">
        {products.map((p) => (
          <li key={p.id}>
            <ProductCard product={p} onSelect={() => setViewing(p)} />
          </li>
        ))}
      </ul>

      {viewing && (
        <ProductModal
          product={viewing}
          categoryName={catalog.categories.find((c) => c.id === viewing.categoryId)?.name}
          onClose={() => setViewing(null)}
          onDesign={(p) => {
            setViewing(null);
            setPreselect({ categoryId: p.categoryId, productId: p.id, nonce: Date.now() });
          }}
        />
      )}

      <DesignStudio catalog={catalog} preselect={preselect} hideTrigger />
    </>
  );
}
