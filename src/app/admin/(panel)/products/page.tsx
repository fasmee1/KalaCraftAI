import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { serializeCategory } from "@/lib/category";
import { connectDB } from "@/lib/db";
import { serializeProduct } from "@/lib/product";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { ProductManager } from "./ProductManager";

export const metadata: Metadata = { title: "สินค้า · แอดมิน KalaCraftAI" };

export default async function ProductsPage() {
  if (!(await getAdminSession())) redirect("/admin/login");
  await connectDB();
  const [products, categories] = await Promise.all([
    Product.find().sort({ sortOrder: 1, createdAt: -1 }).lean(),
    Category.find().sort({ sortOrder: 1, createdAt: 1 }).lean(),
  ]);
  return <ProductManager initial={products.map(serializeProduct)} categories={categories.map(serializeCategory)} />;
}
