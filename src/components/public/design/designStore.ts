"use client";

import type { AspectRatioValue, DesignSelection } from "./DesignForm";

// ภาพผลลัพธ์อยู่แค่ในแท็บนี้ (memory + sessionStorage) — ไม่อัปขึ้น server/Cloudinary/DB
// sessionStorage ช่วยให้รีเฟรชหน้าผลลัพธ์แล้วภาพไม่หาย แต่ปิดแท็บแล้วหายตามที่ตั้งใจ

export type StoredDesign = {
  designCode: string;
  imageBase64: string;
  mimeType: string;
  aspectRatio: AspectRatioValue;
  createdAt: number;
  product: { id: string; name: string; imageUrl: string };
  /** ชื่อตัวเลือกที่แสดงเป็น chip ในหน้าผลลัพธ์ */
  labels: string[];
  selection: DesignSelection;
};

const DESIGN_KEY = "kc:lastDesign";
const EDIT_KEY = "kc:editSelection";

let memoryDesign: StoredDesign | null = null;

export function saveDesign(design: StoredDesign) {
  memoryDesign = design;
  try {
    sessionStorage.setItem(DESIGN_KEY, JSON.stringify(design));
  } catch {
    // พื้นที่เต็ม/โหมดส่วนตัว — ยังใช้จาก memory ได้ระหว่างอยู่ในแท็บนี้
  }
}

export function loadDesign(): StoredDesign | null {
  if (memoryDesign) return memoryDesign;
  try {
    const raw = sessionStorage.getItem(DESIGN_KEY);
    memoryDesign = raw ? (JSON.parse(raw) as StoredDesign) : null;
  } catch {
    memoryDesign = null;
  }
  return memoryDesign;
}

/** ส่งตัวเลือกเดิมกลับไปเปิด popup ที่หน้าแรก (ปุ่ม "แก้ไขข้อมูล") */
export function saveEditSelection(selection: DesignSelection) {
  try {
    sessionStorage.setItem(EDIT_KEY, JSON.stringify(selection));
  } catch {}
}

export function takeEditSelection(): DesignSelection | null {
  try {
    const raw = sessionStorage.getItem(EDIT_KEY);
    sessionStorage.removeItem(EDIT_KEY);
    return raw ? (JSON.parse(raw) as DesignSelection) : null;
  } catch {
    return null;
  }
}
