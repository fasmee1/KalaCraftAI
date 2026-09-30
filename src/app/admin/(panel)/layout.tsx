import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getAdminSession } from "@/lib/auth";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-cream lg:flex-row">
      <AdminSidebar username={session.user?.name ?? "admin"} />
      <main className="flex-1 px-4 py-6 sm:px-8 lg:py-10">{children}</main>
    </div>
  );
}
