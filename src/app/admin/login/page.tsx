import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { LoginForm } from "./LoginForm";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = { title: "เข้าสู่ระบบแอดมิน · KalaCraftAI" };

/** อนุญาตให้เด้งกลับเฉพาะหน้าในระบบแอดมิน กัน open redirect */
function safeCallback(value: string | string[] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.startsWith("/admin") && !v.startsWith("//") ? v : "/admin/dashboard";
}

export default async function AdminLoginPage(props: PageProps<"/admin/login">) {
  const { callbackUrl } = await props.searchParams;
  const target = safeCallback(callbackUrl);
  if (await getAdminSession()) redirect(target);

  return (
    <main className="relative flex flex-1 items-center justify-center bg-cream px-4 py-12">
      <ThemeToggle className="flex size-10 shrink-0 items-center justify-center rounded-full bg-beige text-ink transition hover:bg-border/60 absolute right-4 top-4" />
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-cream">
            KC
          </div>
          <h1 className="text-2xl font-bold text-primary">เข้าสู่ระบบแอดมิน</h1>
          <p className="mt-1 text-sm text-ink-muted">KalaCraftAI · ระบบจัดการหลังร้าน</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-[0_8px_24px_rgba(107,66,38,0.08)]">
          <LoginForm callbackUrl={target} />
        </div>
      </div>
    </main>
  );
}
