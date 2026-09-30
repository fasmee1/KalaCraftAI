// สร้างแอดมินคนแรก + ประเภทสินค้าตัวอย่าง
// ใช้: SEED_ADMIN_USERNAME=admin SEED_ADMIN_PASSWORD=... npm run seed
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { loginSchema } from "@/lib/validators";
import { Admin } from "@/models/Admin";
import { Category } from "@/models/Category";
import { Option } from "@/models/Option";

const SAMPLE_CATEGORIES = [
  { name: "ชาม", slug: "bowl" },
  { name: "แก้ว", slug: "cup" },
  { name: "โคมไฟ", slug: "lamp" },
  { name: "กระเป๋า", slug: "bag" },
  { name: "ช้อน", slug: "spoon" },
  { name: "ของตกแต่ง", slug: "decor" },
];

// promptText เป็นภาษาอังกฤษ (ส่งให้ AI) — ลูกค้าเห็นแค่ label
const SAMPLE_OPTIONS = [
  { type: "style", label: "มินิมอล", promptText: "minimalist, clean simple lines" },
  { type: "style", label: "วินเทจ", promptText: "vintage rustic handcrafted look" },
  { type: "style", label: "ลายไทย", promptText: "traditional Thai art style" },
  { type: "style", label: "โมเดิร์น", promptText: "modern contemporary design" },
  { type: "style", label: "โบฮีเมียน", promptText: "bohemian boho style" },
  { type: "style", label: "ญี่ปุ่น", promptText: "Japanese wabi-sabi style" },
  { type: "tone", label: "สีธรรมชาติ", promptText: "natural coconut shell brown color", swatch: "#c9a27a" },
  { type: "tone", label: "น้ำตาลเข้ม", promptText: "dark walnut brown finish", swatch: "#4a2e1c" },
  { type: "tone", label: "ดำเงา", promptText: "glossy black finish", swatch: "#1a1a1a" },
  { type: "tone", label: "ขาว", promptText: "white painted finish", swatch: "#ffffff" },
  { type: "tone", label: "พาสเทล", promptText: "soft pastel colors", swatch: "#cfe0ea" },
  { type: "pattern", label: "แกะสลัก", promptText: "hand-carved relief floral motif on the surface", preview: "carve" },
  { type: "pattern", label: "ฉลุ", promptText: "pierced cut-out perforation pattern", preview: "cutout" },
  { type: "pattern", label: "ลายไทย", promptText: "Thai kranok ornamental pattern in gold lines", preview: "thai" },
  { type: "pattern", label: "ลายเรขาคณิต", promptText: "geometric lattice pattern", preview: "geometric" },
  { type: "pattern", label: "ไม่มีลาย", promptText: "smooth plain surface without pattern", preview: "none" },
  { type: "texture", label: "ด้าน", promptText: "matte finish" },
  { type: "texture", label: "เงา", promptText: "glossy polished finish" },
  { type: "texture", label: "เคลือบแล็กเกอร์", promptText: "clear lacquer coating" },
  { type: "texture", label: "ผิวดิบ", promptText: "raw natural unpolished texture" },
  { type: "material", label: "ไม้", promptText: "wooden accents" },
  { type: "material", label: "ไม้ไผ่", promptText: "bamboo details" },
  { type: "material", label: "เชือก", promptText: "natural rope trim" },
  { type: "material", label: "เรซิน", promptText: "clear resin inlay" },
  { type: "material", label: "โลหะ", promptText: "brass metal details" },
  { type: "material", label: "ผ้า", promptText: "woven fabric details" },
  { type: "background", label: "พื้นขาว (สำหรับขายของ)", promptText: "plain white studio background for e-commerce" },
  { type: "background", label: "ห้องนั่งเล่น", promptText: "cozy living room interior" },
  { type: "background", label: "ร้านกาแฟ", promptText: "on a cafe table" },
  { type: "background", label: "ธรรมชาติ", promptText: "natural outdoor setting with green plants" },
  { type: "camera", label: "ด้านหน้า", promptText: "front view" },
  { type: "camera", label: "มุมบน", promptText: "top-down view" },
  { type: "camera", label: "มุมเฉียง 45°", promptText: "45-degree angle view" },
  { type: "camera", label: "ระยะใกล้", promptText: "close-up detail shot" },
];

async function seedAdmin() {
  const parsed = loginSchema.safeParse({
    username: process.env.SEED_ADMIN_USERNAME,
    password: process.env.SEED_ADMIN_PASSWORD,
  });
  if (!parsed.success) {
    console.log("admin     : skipped (set SEED_ADMIN_USERNAME and SEED_ADMIN_PASSWORD to create one)");
    return;
  }
  const { username, password } = parsed.data;
  if (await Admin.exists({ username })) {
    console.log(`admin     : "${username}" already exists — not changed`);
    return;
  }
  await Admin.create({ username, passwordHash: await bcrypt.hash(password, 12) });
  console.log(`admin     : created "${username}"`);
}

async function seedCategories() {
  if ((await Category.countDocuments()) > 0) {
    console.log("categories: already have data — skipped");
    return;
  }
  await Category.insertMany(SAMPLE_CATEGORIES.map((c, i) => ({ ...c, sortOrder: i + 1 })));
  console.log(`categories: created ${SAMPLE_CATEGORIES.length} samples`);
}

async function seedOptions() {
  if ((await Option.countDocuments()) > 0) {
    console.log("options   : already have data — skipped");
    return;
  }
  await Option.insertMany(SAMPLE_OPTIONS.map((o, i) => ({ ...o, sortOrder: i + 1 })));
  console.log(`options   : created ${SAMPLE_OPTIONS.length} samples`);
}

async function main() {
  await connectDB();
  await Promise.all([Admin.init(), Category.init()]); // สร้าง unique index
  await seedAdmin();
  await seedCategories();
  await seedOptions();
}

main()
  .catch((err) => {
    console.error("seed failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
