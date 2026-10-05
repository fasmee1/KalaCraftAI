"use client";

import { getSession } from "next-auth/react";
import { evictionCodes } from "@/lib/designHistory";
import { base64ToFile } from "./imageDownload";

// รูปผลลัพธ์ของลูกค้าที่ล็อกอิน — เก็บใน IndexedDB ของเบราว์เซอร์นี้เท่านั้น (ไม่ขึ้น server/Cloudinary/DB)
// เปลี่ยนเครื่องหรือล้างข้อมูลเบราว์เซอร์แล้วรูปหาย เหลือแค่รายการจาก server
// ทุกฟังก์ชันไม่ throw — โหมดส่วนตัว/พื้นที่เต็ม = ไม่มีรูปในประวัติ แต่ส่วนอื่นทำงานปกติ

const DB_NAME = "kc-design-history";
const STORE = "images";

export type LocalImage = { designCode: string; mimeType: string; blob: Blob; createdAt: number };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "designCode" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** เปิด DB → ทำงานใน transaction เดียว → ปิด DB เมื่อ transaction จบ */
async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request ? request.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** เก็บรูปที่เพิ่งสร้างลงเครื่อง — เฉพาะเมื่อล็อกอินด้วย Google (คนไม่ล็อกอินไม่มีประวัติ) */
export async function rememberDesign(design: { designCode: string; imageBase64: string; mimeType: string; createdAt: number }) {
  try {
    const session = await getSession();
    if (session?.user?.role !== "customer") return;

    const blob: Blob = base64ToFile(design.imageBase64, design.mimeType, design.designCode);
    const record: LocalImage = { designCode: design.designCode, mimeType: design.mimeType, blob, createdAt: design.createdAt };
    await withStore("readwrite", (store) => store.put(record));

    const all = await listLocalImages();
    const stale = evictionCodes(all);
    if (stale.length) await removeLocalImages(stale);
  } catch {
    // เก็บไม่ได้ก็ไม่เป็นไร — หน้าผลลัพธ์ยังเตือนให้ดาวน์โหลดอยู่แล้ว
  }
}

export async function listLocalImages(): Promise<LocalImage[]> {
  try {
    return (await withStore<LocalImage[]>("readonly", (store) => store.getAll())) ?? [];
  } catch {
    return [];
  }
}

export async function removeLocalImages(designCodes: string[]) {
  try {
    await withStore("readwrite", (store) => {
      for (const code of designCodes) store.delete(code);
    });
  } catch {}
}

/** ออกจากระบบ → ลบรูปทั้งหมดในเครื่อง กันคนถัดไปที่ใช้เครื่องเดียวกันเห็นรูป */
export async function clearLocalImages() {
  try {
    await withStore("readwrite", (store) => store.clear());
  } catch {}
}
