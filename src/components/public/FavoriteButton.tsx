"use client";

import { toggleFavorite, useFavorites } from "./favoritesStore";
import { HeartIcon } from "./icons";

/** ปุ่มหัวใจบนการ์ดสินค้า — เก็บเข้ารายการโปรดของบัญชี (ไม่ล็อกอิน = ขึ้นชวนเข้าสู่ระบบ) */
export function FavoriteButton({ productId, name }: { productId: string; name: string }) {
  const liked = useFavorites().ids.has(productId);
  return (
    <button
      type="button"
      onClick={() => void toggleFavorite(productId)}
      aria-pressed={liked}
      aria-label={liked ? `เอา ${name} ออกจากรายการโปรด` : `เพิ่ม ${name} ในรายการโปรด`}
      className={`absolute right-2.5 top-2.5 flex size-7 items-center justify-center rounded-full bg-surface/90 transition active:scale-90 ${
        liked ? "text-danger" : "text-primary"
      }`}
    >
      <HeartIcon size={16} filled={liked} />
    </button>
  );
}
