"use client";

import { useCallback, useState, type ImgHTMLAttributes } from "react";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  src: string;
  alt: string;
};

/**
 * รูปที่มี skeleton ระหว่างโหลด — ซ่อนรูปไว้จนโหลดครบ แล้วแสดงทีเดียว (ไม่ค่อย ๆ ไล่ลงมาทีละส่วน)
 * skeleton เป็น absolute inset-0 → กล่องที่ครอบต้องเป็น `relative` และกำหนดขนาดไว้แล้ว
 */
export function SkeletonImage({ src, alt, className = "", ...rest }: Props) {
  // เก็บ src ที่โหลดเสร็จ — เปลี่ยน src เมื่อไหร่ skeleton กลับมาเองโดยไม่ต้อง reset state
  const [doneSrc, setDoneSrc] = useState<string | null>(null);
  const done = doneSrc === src;

  // รูปที่อยู่ใน cache / โหลดเสร็จก่อน hydrate จะไม่ยิง onLoad อีก → เช็คตอนผูก ref
  // ดู naturalWidth ด้วย เพราะรูป lazy ที่ยังไม่เริ่มโหลด บางเบราว์เซอร์รายงาน complete = true
  const ref = useCallback(
    (el: HTMLImageElement | null) => {
      if (el?.complete && el.naturalWidth > 0) setDoneSrc(src);
    },
    [src],
  );

  return (
    <>
      {!done && <span aria-hidden className="skeleton absolute inset-0" />}
      {/* eslint-disable-next-line @next/next/no-img-element -- signed URL ที่หมดอายุ / base64 / blob ไม่ผ่าน next/image optimizer */}
      <img
        {...rest}
        ref={ref}
        src={src}
        alt={alt}
        onLoad={() => setDoneSrc(src)}
        // โหลดไม่สำเร็จ → เลิก skeleton ให้เห็น alt แทนการกะพริบค้าง
        onError={() => setDoneSrc(src)}
        className={`${className} ${done ? "skeleton-reveal" : "invisible"}`}
      />
    </>
  );
}
