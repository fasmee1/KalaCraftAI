import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import { RANGE_OPTIONS, type RangeDays } from "@/lib/dashboardRange";
import { Dashboard } from "./Dashboard";

export const metadata: Metadata = { title: "แดชบอร์ด · แอดมิน KalaCraftAI" };

export default async function DashboardPage(props: PageProps<"/admin/dashboard">) {
  if (!(await getAdminSession())) redirect("/admin/login");
  const { range } = await props.searchParams;
  const n = Number(Array.isArray(range) ? range[0] : range);
  const rangeDays: RangeDays = (RANGE_OPTIONS as readonly number[]).includes(n) ? (n as RangeDays) : 30;
  return <Dashboard data={await getDashboardData(rangeDays)} />;
}
