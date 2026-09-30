import "server-only";
import { connectDB } from "@/lib/db";
import type { OptionType, PatternPreview } from "@/lib/optionTypes";
import { Category } from "@/models/Category";
import { Option } from "@/models/Option";
import { Product } from "@/models/Product";

// ข้อมูลที่ popup "เลือกข้อมูล" ใช้ — เฉพาะที่ active และไม่มี prompt ใด ๆ หลุดไปฝั่ง client
export type CatalogCategory = { id: string; name: string };
export type CatalogProduct = { id: string; name: string; categoryId: string; imageUrl: string };
export type CatalogOption = {
  id: string;
  type: OptionType;
  label: string;
  swatch: string | null;
  preview: PatternPreview | null;
};
export type DesignCatalog = { categories: CatalogCategory[]; products: CatalogProduct[]; options: CatalogOption[] };

export async function getDesignCatalog(): Promise<DesignCatalog> {
  await connectDB();
  const [categories, products, options] = await Promise.all([
    Category.find({ active: true }).sort({ sortOrder: 1, name: 1 }).select("name").lean(),
    Product.find({ active: true }).sort({ sortOrder: 1, createdAt: -1 }).select("name category refImage.publicId").lean(),
    Option.find({ active: true }).sort({ sortOrder: 1, createdAt: 1 }).select("type label swatch preview").lean(),
  ]);

  const categoryIds = new Set(categories.map((c) => String(c._id)));
  return {
    categories: categories.map((c) => ({ id: String(c._id), name: c.name })),
    products: products
      .filter((p) => categoryIds.has(String(p.category)))
      .map((p) => ({
        id: String(p._id),
        name: p.name,
        categoryId: String(p.category),
        imageUrl: `/api/images/${p._id}?v=${p.refImage.publicId.split("/").pop()}`,
      })),
    options: options.map((o) => ({
      id: String(o._id),
      type: o.type as OptionType,
      label: o.label,
      swatch: o.swatch ?? null,
      preview: (o.preview as PatternPreview | null) ?? null,
    })),
  };
}
