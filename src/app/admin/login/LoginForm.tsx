"use client";

import { Eye, EyeOff, LoaderCircle, Lock, TriangleAlert, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";

const ERRORS: Record<string, string> = {
  LOCKED: "เข้าสู่ระบบผิดหลายครั้ง บัญชีถูกล็อกชั่วคราว กรุณาลองใหม่ใน 15 นาที",
  CredentialsSignin: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
};

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { username, password, redirect: false, callbackUrl });
    if (res?.ok && !res.error) {
      router.replace(callbackUrl);
      router.refresh();
      return;
    }
    setLoading(false);
    setPassword("");
    setError(ERRORS[res?.error ?? ""] ?? "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-surface py-3 pl-11 pr-4 text-[15px] text-ink placeholder:text-ink-muted/70 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl bg-danger/10 px-3 py-2.5 text-sm text-danger">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label htmlFor="username" className="mb-1.5 block text-sm font-semibold text-ink">
          ชื่อผู้ใช้
        </label>
        <div className="relative">
          <User className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            id="username"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={inputClass}
            placeholder="admin"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-ink">
          รหัสผ่าน
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClass} pr-12`}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-ink-muted hover:bg-beige"
          >
            {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-semibold text-cream transition hover:bg-primary-hover disabled:opacity-60"
      >
        {loading && <LoaderCircle className="size-[18px] animate-spin" aria-hidden />}
        {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}
