"use client";

import { SkeletonImage } from "@/components/SkeletonImage";
import { FavoriteButton } from "./FavoriteButton";
import { SparkleIcon } from "./icons";

export type ProductCardData = { id: string; name: string; price: number | null; imageUrl: string };

export function formatPrice(price: number | null) {
  return price === null ? "สอบถามราคา" : `฿${price.toLocaleString("th-TH")}`;
}

/**
 * การ์ดสินค้า (หน้าแรก + หน้าสินค้าทั้งหมด)
 * onSelect: ทั้งการ์ดกดได้ (ปุ่มโปร่งใสคลุมการ์ด) — ปุ่มหัวใจอยู่ชั้นบนจึงกดแยกได้ ไม่ซ้อนปุ่มในปุ่ม
 */
export function ProductCard({
  product,
  showAiBadge = true,
  onSelect,
}: {
  product: ProductCardData;
  showAiBadge?: boolean;
  onSelect?: () => void;
}) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-surface transition hover:shadow-[0_8px_24px_rgba(107,66,38,0.12)]">
      <div className="relative aspect-[170/118] overflow-hidden bg-[linear-gradient(to_bottom_right,#C99A6B,#8B5A3C_50%)]">
        <SkeletonImage
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        {showAiBadge && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium leading-[1.5] text-cream">
            <SparkleIcon size={11} />
            AI ดีไซน์
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 px-3 pb-3 pt-2.5">
        <h3 className="truncate text-sm font-medium leading-[1.4] text-ink" title={product.name}>
          {product.name}
        </h3>
        <p className="text-sm font-semibold leading-[1.4] text-primary">{formatPrice(product.price)}</p>
      </div>
      {onSelect && (
        <button
          type="button"
          onClick={onSelect}
          aria-label={`สร้างดีไซน์จาก ${product.name}`}
          className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      )}
      <div className="absolute right-0 top-0 z-10">
        <FavoriteButton name={product.name} />
      </div>
    </article>
  );
}
