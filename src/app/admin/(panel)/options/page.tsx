import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { serializeOption } from "@/lib/option";
import { Option } from "@/models/Option";
import { OptionManager } from "./OptionManager";

export const metadata: Metadata = { title: "ตัวเลือก · แอดมิน KalaCraftAI" };

export default async function OptionsPage() {
  if (!(await getAdminSession())) redirect("/admin/login");
  await connectDB();
  const docs = await Option.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
  return <OptionManager initial={docs.map(serializeOption)} />;
}
