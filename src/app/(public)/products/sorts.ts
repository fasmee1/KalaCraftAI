// ตัวเลือกการเรียงสินค้า — ใช้ทั้ง server (อ่านจาก URL) และ client
export const SORTS = [
  { value: "recommended", label: "แนะนำ" },
  { value: "popular", label: "ยอดนิยม" },
  { value: "newest", label: "ใหม่ล่าสุด" },
  { value: "price-asc", label: "ราคาต่ำ → สูง" },
  { value: "price-desc", label: "ราคาสูง → ต่ำ" },
] as const;
export type SortValue = (typeof SORTS)[number]["value"];
