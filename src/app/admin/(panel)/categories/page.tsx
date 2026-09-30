import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { serializeCategory } from "@/lib/category";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { CategoryManager } from "./CategoryManager";

export const metadata: Metadata = { title: "ประเภทสินค้า · แอดมิน KalaCraftAI" };

export default async function CategoriesPage() {
  if (!(await getAdminSession())) redirect("/admin/login");
  await connectDB();
  const docs = await Category.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
  return <CategoryManager initial={docs.map(serializeCategory)} />;
}
