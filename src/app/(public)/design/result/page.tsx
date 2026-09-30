import type { Metadata } from "next";
import { DesignResultView } from "@/components/public/design/DesignResultView";

export const metadata: Metadata = {
  title: "ผลลัพธ์ดีไซน์ · KalaCraftAI",
  robots: { index: false },
};

// ภาพมาจาก sessionStorage ของแท็บนี้ — หน้านี้ไม่ดึงข้อมูลจาก server
export default function DesignResultPage() {
  return <DesignResultView />;
}
