"use client";

import { OPTION_TYPES } from "@/lib/optionTypes";
import type { DesignSelection } from "./DesignForm";

export type GenerateResponse = { designCode: string; imageBase64: string; mimeType: string };

/** เรียก POST /api/generate — คืน error เป็นข้อความภาษาไทยพร้อมแสดง */
export async function requestDesign(
  selection: DesignSelection,
  turnstileToken: string,
): Promise<{ ok: true; data: GenerateResponse } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: selection.productId,
        optionIds: OPTION_TYPES.flatMap((t) => selection.options[t.key]),
        aspectRatio: selection.aspectRatio,
        note: selection.note,
        turnstileToken,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.imageBase64) return { ok: false, error: data.error ?? "สร้างภาพไม่สำเร็จ กรุณาลองใหม่" };
    return { ok: true, data };
  } catch {
    return { ok: false, error: "เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่" };
  }
}

/** ลูกค้าที่ล็อกอินกด "บันทึกลงประวัติ" — ส่งรูปที่ AI สร้างกลับไปเก็บ (server รับเฉพาะรูปที่ตรงกับดีไซน์นี้) */
export async function saveDesignToHistory(
  designCode: string,
  imageBase64: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/me/generations/${encodeURIComponent(designCode)}/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64 }),
    });
    if (res.ok) return { ok: true };
    if (res.status === 401) return { ok: false, error: "เซสชันหมดอายุ กรุณาดาวน์โหลดภาพแทน" };
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data.error ?? "บันทึกไม่สำเร็จ กรุณาลองใหม่" };
  } catch {
    return { ok: false, error: "เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่" };
  }
}
