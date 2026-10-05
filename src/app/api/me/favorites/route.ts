import { getCustomerId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { favoriteSchema } from "@/lib/validators";
import { Customer } from "@/models/Customer";
import { Product } from "@/models/Product";

const MAX_FAVORITES = 200;

const error = (message: string, status: number) => Response.json({ error: message }, { status });

async function favoriteIds(customerId: string): Promise<string[]> {
  const customer = await Customer.findById(String(customerId)).select("favorites").lean();
  return (customer?.favorites ?? []).map(String);
}

/** รายการโปรดของลูกค้าที่ล็อกอินด้วย Google — คืนแค่ id สินค้า (หน้าเว็บจับคู่กับสินค้าที่ active เอง) */
export async function GET() {
  const customerId = await getCustomerId();
  if (!customerId) return error("Unauthorized", 401);

  try {
    await connectDB();
    return Response.json({ ids: await favoriteIds(customerId) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    console.error("[favorites] load failed", err instanceof Error ? err.message : err);
    return error("โหลดรายการโปรดไม่สำเร็จ กรุณาลองใหม่", 500);
  }
}

/** เพิ่ม/เอาสินค้าออกจากรายการโปรด — แก้ได้เฉพาะของบัญชีตัวเอง (id มาจาก session ไม่รับจาก client) */
export async function POST(request: Request) {
  const customerId = await getCustomerId();
  if (!customerId) return error("Unauthorized", 401);

  const parsed = favoriteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error("ข้อมูลไม่ถูกต้อง", 400);
  const productId = String(parsed.data.productId).toLowerCase();

  try {
    await connectDB();
    if (parsed.data.favorite) {
      if (!(await Product.exists({ _id: productId, active: true }))) return error("ไม่พบสินค้านี้", 404);
      const current = await favoriteIds(customerId);
      if (!current.includes(productId) && current.length >= MAX_FAVORITES) {
        return error(`รายการโปรดเก็บได้สูงสุด ${MAX_FAVORITES} รายการ`, 400);
      }
      await Customer.updateOne({ _id: String(customerId) }, { $addToSet: { favorites: productId } });
    } else {
      await Customer.updateOne({ _id: String(customerId) }, { $pull: { favorites: productId } });
    }
    return Response.json({ ids: await favoriteIds(customerId) });
  } catch (err) {
    console.error("[favorites] update failed", err instanceof Error ? err.message : err);
    return error("บันทึกรายการโปรดไม่สำเร็จ กรุณาลองใหม่", 500);
  }
}
