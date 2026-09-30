"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ต้องตรงกับระยะ animation ตอนปิดของ .overlay-anim / .panel-anim ใน globals.css
const EXIT_MS = 200;

/**
 * เล่น animation ตอนปิดให้จบก่อน แล้วค่อยเรียก onClosed (ถอด popup ออกจากหน้า)
 * ใส่ data-closing={closing || undefined} ที่ overlay และ panel
 * requestClose(then) — ส่ง callback เพิ่มได้ เช่น ปิด popup สินค้าแล้วค่อยเปิด popup ออกแบบ
 */
export function useSmoothClose(onClosed: () => void) {
  const [closing, setClosing] = useState(false);
  const onClosedRef = useRef(onClosed);
  const thenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onClosedRef.current = onClosed;
  });

  useEffect(() => {
    if (!closing) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(
      () => {
        setClosing(false);
        onClosedRef.current();
        thenRef.current?.();
        thenRef.current = null;
      },
      reduced ? 0 : EXIT_MS,
    );
    return () => clearTimeout(t);
  }, [closing]);

  const requestClose = useCallback((then?: () => void) => {
    thenRef.current = then ?? null;
    setClosing(true);
  }, []);

  return { closing, requestClose };
}
