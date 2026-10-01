"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new CustomEvent("kc-themechange", { detail: theme }));
}

/** อ่านธีมปัจจุบัน + ติดตามการเปลี่ยน (ปุ่มสลับ หรือเครื่องเปลี่ยนโหมดเองเมื่อผู้ใช้ยังไม่เคยเลือก) */
export function useTheme(): Theme | null {
  const [theme, setTheme] = useState<Theme | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data-theme อ่านได้หลัง mount เท่านั้น
    setTheme(currentTheme());
    const onChange = () => setTheme(currentTheme());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystem = () => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(THEME_STORAGE_KEY);
      } catch {}
      if (saved !== "light" && saved !== "dark") applyTheme(media.matches ? "dark" : "light");
    };
    window.addEventListener("kc-themechange", onChange);
    media.addEventListener("change", onSystem);
    return () => {
      window.removeEventListener("kc-themechange", onChange);
      media.removeEventListener("change", onSystem);
    };
  }, []);
  return theme;
}

export function ThemeToggle({ className = "", label = false }: { className?: string; label?: boolean }) {
  const theme = useTheme();
  const next: Theme = theme === "dark" ? "light" : "dark";

  const toggle = () => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {}
    applyTheme(next);
  };

  // ก่อน mount ยังไม่รู้ธีม — แสดงไอคอนกลาง ๆ ไว้ก่อน (กัน hydration mismatch)
  const Icon = theme === "dark" ? Sun : Moon;
  const text = next === "dark" ? "โหมดมืด" : "โหมดสว่าง";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`เปลี่ยนเป็น${text}`}
      title={`เปลี่ยนเป็น${text}`}
      className={className}
    >
      <Icon className="size-5 transition-transform duration-300 group-active:rotate-45" aria-hidden />
      {label && <span>{text}</span>}
    </button>
  );
}
