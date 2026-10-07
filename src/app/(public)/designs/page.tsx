import type { Metadata } from "next";
import { SiteNav } from "@/components/public/SiteNav";
import { DesignHistoryView } from "@/components/public/design/DesignHistoryView";

export const metadata: Metadata = {
  title: "ดีไซน์ของฉัน · KalaCraftAI",
  robots: { index: false },
};

// รายการมาจาก /api/me/generations (ต้องล็อกอิน) — รูปมีเฉพาะดีไซน์ที่ลูกค้ากดบันทึกลงประวัติ
export default function DesignHistoryPage() {
  return (
    <>
      <SiteNav />
      <DesignHistoryView />
    </>
  );
}
