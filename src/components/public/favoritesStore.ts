"use client";

import { useEffect, useSyncExternalStore } from "react";

// รายการโปรดของลูกค้าที่ล็อกอิน — โหลดจาก /api/me/favorites ครั้งเดียวต่อการเปิดหน้า แล้วใช้ร่วมกันทุกปุ่มหัวใจ/แถบเมนู
// signed-out = ไม่ได้ล็อกอินเป็นลูกค้า (กดหัวใจแล้วขึ้นชวนเข้าสู่ระบบ)

type Status = "idle" | "loading" | "ready" | "signed-out";
type Snapshot = { status: Status; ids: ReadonlySet<string>; promptOpen: boolean };

const INITIAL: Snapshot = { status: "idle", ids: new Set(), promptOpen: false };
let state = INITIAL;
const listeners = new Set<() => void>();

function update(patch: Partial<Snapshot>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

async function load() {
  if (state.status !== "idle") return;
  update({ status: "loading" });
  try {
    const res = await fetch("/api/me/favorites", { cache: "no-store" });
    if (res.status === 401) return update({ status: "signed-out" });
    const data = res.ok ? await res.json() : null;
    if (!Array.isArray(data?.ids)) throw new Error("bad response");
    update({ status: "ready", ids: new Set<string>(data.ids) });
  } catch {
    update({ status: "idle" }); // โหลดไม่สำเร็จ — ลองใหม่เมื่อมี component ใหม่ mount
  }
}

export function useFavorites(): Snapshot {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => INITIAL,
  );
  useEffect(() => void load(), []);
  return snapshot;
}

/** กดหัวใจ — เปลี่ยนทันทีบนหน้าจอ แล้วค่อยบันทึก ถ้าบันทึกไม่สำเร็จคืนค่าเดิม */
export async function toggleFavorite(productId: string) {
  if (state.status === "signed-out") return update({ promptOpen: true });
  if (state.status !== "ready") return;

  const before = state.ids;
  const favorite = !before.has(productId);
  const next = new Set(before);
  if (favorite) next.add(productId);
  else next.delete(productId);
  update({ ids: next });

  try {
    const res = await fetch("/api/me/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, favorite }),
    });
    if (res.status === 401) return update({ status: "signed-out", ids: new Set(), promptOpen: true });
    const data = res.ok ? await res.json() : null;
    if (!Array.isArray(data?.ids)) throw new Error("bad response");
    update({ ids: new Set<string>(data.ids) });
  } catch {
    update({ ids: before });
  }
}

export const closeFavoritePrompt = () => update({ promptOpen: false });
