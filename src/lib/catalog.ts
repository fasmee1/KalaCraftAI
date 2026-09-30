import "server-only";
import { connectDB } from "@/lib/db";
import type { OptionType, PatternPreview } from "@/lib/optionTypes";
import { Category } from "@/models/Category";
import { Generation } from "@/models/Generation";
import { Option } from "@/models/Option";
import { Product } from "@/models/Product";

// ข้อมูลที่ popup "เลือกข้อมูล" ใช้ — เฉพาะที่ active และไม่มี prompt ใด ๆ หลุดไปฝั่ง client
export type CatalogCategory = { id: string; name: string; slug: string };
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
    Category.find({ active: true }).sort({ sortOrder: 1, name: 1 }).select("name slug").lean(),
    Product.find({ active: true }).sort({ sortOrder: 1, createdAt: -1 }).select("name category refImage.publicId").lean(),
    Option.find({ active: true }).sort({ sortOrder: 1, createdAt: 1 }).select("type label swatch preview").lean(),
  ]);

  const categoryIds = new Set(categories.map((c) => String(c._id)));
  return {
    categories: categories.map((c) => ({ id: String(c._id), name: c.name, slug: c.slug })),
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

// หน้า "สินค้าทั้งหมด" — ข้อมูลเพิ่มจาก catalog: ราคา ลำดับ วันที่ และจำนวนดีไซน์ที่ลูกค้าเคยสร้าง
export type ListingProduct = CatalogProduct & {
  price: number | null;
  sortOrder: number;
  createdAt: string;
  designCount: number;
};

export async function getProductListing(): Promise<{ catalog: DesignCatalog; products: ListingProduct[] }> {
  const catalog = await getDesignCatalog();
  const ids = catalog.products.map((p) => p.id);
  const [docs, counts] = await Promise.all([
    Product.find({ _id: { $in: ids } }).select("price sortOrder createdAt").lean(),
    Generation.aggregate<{ _id: unknown; n: number }>([
      { $match: { status: "success" } },
      { $group: { _id: "$product", n: { $sum: 1 } } },
    ]),
  ]);
  const meta = new Map(docs.map((d) => [String(d._id), d]));
  const designCount = new Map(counts.map((c) => [String(c._id), c.n]));
  return {
    catalog,
    products: catalog.products.map((p) => {
      const d = meta.get(p.id);
      return {
        ...p,
        price: d?.price ?? null,
        sortOrder: d?.sortOrder ?? 0,
        createdAt: d ? new Date(d.createdAt).toISOString() : new Date(0).toISOString(),
        designCount: designCount.get(p.id) ?? 0,
      };
    }),
  };
}
