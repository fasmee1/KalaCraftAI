// ค่าเรื่องธีม — ใช้ทั้ง server (layout ใส่ script ใน <head>) และ client (ปุ่มสลับ)
export type Theme = "light" | "dark";
export const THEME_STORAGE_KEY = "kc-theme";

/**
 * รันใน <head> ก่อนวาดหน้า — ตั้ง data-theme ทันที ไม่ให้หน้ากระพริบขาวตอนเปิดโหมดมืด
 * ลำดับ: ที่ผู้ใช้เลือกไว้ (localStorage) → ตามการตั้งค่าเครื่อง
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})();`;
