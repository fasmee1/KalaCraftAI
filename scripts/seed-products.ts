// เพิ่มสินค้าตัวอย่าง 25 รายการ พร้อมรูปต้นแบบที่สร้างด้วย Cloudflare Workers AI แล้วอัปขึ้น Cloudinary
// รูปเป็น "ภาพตัวอย่าง" จาก AI — ควรเปลี่ยนเป็นรูปถ่ายสินค้าจริงของร้านผ่านหน้าแอดมินภายหลัง
// รันซ้ำได้: ข้ามสินค้าที่มีชื่อซ้ำอยู่แล้ว
// ใช้: npm run seed:products
//      npm run seed:products -- --regen "ชื่อสินค้า"   (สร้างรูปใหม่ให้สินค้านั้น แล้วลบรูปเก่าใน Cloudinary)
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { deleteImage, uploadReferenceImage } from "@/lib/cloudinary";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";

type Seed = { category: string; name: string; price: number; description: string; subject: string; basePrompt: string };

const PRODUCTS: Seed[] = [
  // ชาม
  {
    category: "bowl",
    name: "ชามกะลาขัดเงา",
    price: 159,
    description: "ชามกะลามะพร้าวแท้ ขัดมันเคลือบน้ำมันธรรมชาติ ใส่ขนม ผลไม้ หรือสลัดได้",
    subject: "a round coconut shell bowl, polished glossy natural brown finish, smooth rim",
    basePrompt: "Keep it a round open bowl with a smooth rim.",
  },
  {
    category: "bowl",
    name: "ชุดชามสลัดกะลา พร้อมช้อนส้อมไม้",
    price: 390,
    description: "ชามสลัดกะลาใบใหญ่ มาพร้อมช้อนและส้อมไม้สำหรับเสิร์ฟ",
    subject: "a large coconut shell salad bowl with a wooden serving spoon and fork resting beside it",
    basePrompt: "Keep the bowl and the wooden serving spoon and fork.",
  },
  {
    category: "bowl",
    name: "ชามกะลาขอบเชือก",
    price: 189,
    description: "ชามกะลาตกแต่งขอบด้วยเชือกป่านพันมือ ให้ความรู้สึกธรรมชาติ",
    subject: "a coconut shell bowl with natural jute rope wrapped around the rim",
    basePrompt: "Keep the rope-wrapped rim.",
  },
  {
    category: "bowl",
    name: "ชามกะลาด้านในสีดำด้าน",
    price: 199,
    description: "ด้านนอกโชว์ผิวกะลา ด้านในเคลือบสีดำด้าน ดีไซน์โมเดิร์น",
    subject: "a coconut shell bowl, natural brown outside, matte black lacquered inside, modern minimal look",
    basePrompt: "Keep the two-tone look: outside and inside can use different finishes.",
  },
  // แก้ว
  {
    category: "cup",
    name: "แก้วกะลามีหูจับ",
    price: 149,
    description: "แก้วกะลามะพร้าวพร้อมหูจับไม้ ใช้ดื่มกาแฟ ชา หรือน้ำผลไม้",
    subject: "a coconut shell drinking cup with a carved wooden handle",
    basePrompt: "Keep the cup shape and the side handle.",
  },
  {
    category: "cup",
    name: "แก้วกะลาทรงสูงขาไม้",
    price: 229,
    description: "แก้วกะลาทรงก็อบเล็ต ขาตั้งไม้กลึง เหมาะสำหรับเครื่องดื่มค็อกเทล",
    subject: "a coconut shell goblet cup on a turned wooden stem and round wooden base",
    basePrompt: "Keep the goblet form with the wooden stem.",
  },
  {
    category: "cup",
    name: "ชุดแก้วช็อตกะลา 4 ใบ",
    price: 259,
    description: "แก้วช็อตกะลาใบเล็ก 4 ใบ พร้อมถาดไม้",
    subject: "four small coconut shell shot cups arranged on a small wooden tray",
    basePrompt: "Keep four small cups on a tray.",
  },
  // โคมไฟ
  {
    category: "lamp",
    name: "โคมไฟกะลาฉลุลายดาว",
    price: 590,
    description: "โคมไฟกะลาเจาะลายดาว เปิดไฟแล้วเกิดเงาลวดลายสวยงามบนผนัง",
    subject: "a coconut shell lamp with many star-shaped perforations, warm light glowing through the holes",
    basePrompt: "Keep it a glowing lamp with light shining through the perforations.",
  },
  {
    category: "lamp",
    name: "โคมไฟแขวนกะลาลายดอกไม้",
    price: 790,
    description: "โคมไฟแขวนเพดานจากกะลา ฉลุลายดอกไม้ เหมาะกับร้านอาหารและคาเฟ่",
    subject: "a hanging pendant lamp made from a coconut shell with floral cut-out pattern, hanging by a cord, warm light inside",
    basePrompt: "Keep it a hanging pendant lamp with a cord.",
  },
  {
    category: "lamp",
    name: "โคมไฟตั้งโต๊ะกะลาฐานไม้",
    price: 650,
    description: "โคมไฟตั้งโต๊ะ โป๊ะกะลามะพร้าว ฐานไม้สัก ให้แสงนวลสบายตา",
    subject: "a table lamp with a coconut shell lampshade on a teak wood base, soft warm light",
    basePrompt: "Keep the table lamp structure: shell shade on a wooden base.",
  },
  // กระเป๋า
  {
    category: "bag",
    name: "กระเป๋าถือกะลาหูไม้ไผ่",
    price: 890,
    description: "กระเป๋าถือทำจากกะลาสองซีกประกบกัน หูจับไม้ไผ่ดัดโค้ง",
    subject: "a handbag made from two coconut shell halves joined together, curved bamboo handle, fabric lining",
    basePrompt: "Keep it a handbag with a curved bamboo handle.",
  },
  {
    category: "bag",
    name: "กระเป๋าสะพายกะลาสายเชือกถัก",
    price: 750,
    description: "กระเป๋าสะพายข้างทรงกลมจากกะลา สายเชือกถักมือ",
    subject:
      "a small round crossbody handbag made from a polished coconut shell, with a brass clasp closure on top and a long hand-braided rope shoulder strap attached to both sides, clearly a bag",
    basePrompt: "Keep it a round crossbody bag with a braided strap.",
  },
  {
    category: "bag",
    name: "กระเป๋าใส่เหรียญกะลาปากผ้าทอ",
    price: 250,
    description: "กระเป๋าใส่เหรียญใบเล็ก ตัวกะลาต่อปากผ้าทอสีสด ปิดด้วยตัวล็อกโลหะ พกพาสะดวก",
    subject: "a small coin purse made from a coconut shell with a colorful woven fabric top and a metal kiss-lock clasp",
    basePrompt: "Keep it a small coin purse with a clasp.",
  },
  // ช้อน
  {
    category: "spoon",
    name: "ช้อนกะลาด้ามไม้",
    price: 69,
    description: "ช้อนกะลามะพร้าว ด้ามไม้ จับถนัดมือ ปลอดสารเคมี",
    subject: "a coconut shell spoon with a long wooden handle, lying diagonally",
    basePrompt: "Keep it a spoon with a wooden handle.",
  },
  {
    category: "spoon",
    name: "ทัพพีกะลา",
    price: 129,
    description: "ทัพพีตักแกงจากกะลามะพร้าว ด้ามไม้ยาว ทนความร้อน",
    subject: "a coconut shell ladle with a long straight wooden handle",
    basePrompt: "Keep it a ladle with a long handle.",
  },
  {
    category: "spoon",
    name: "ชุดช้อนส้อมกะลา",
    price: 149,
    description: "ช้อนและส้อมกะลาคู่ ด้ามไม้ขัดมัน เหมาะเป็นของขวัญ",
    subject: "a matching coconut shell spoon and fork set with polished wooden handles, placed side by side",
    basePrompt: "Keep the spoon and fork pair.",
  },
  // ของตกแต่ง
  {
    category: "decor",
    name: "กระถางต้นไม้กะลาแขวน",
    price: 179,
    description: "กระถางแขวนจากกะลา พร้อมเชือกแขวน ปลูกไม้อวบน้ำหรือไม้ประดับเล็ก",
    subject: "a hanging coconut shell planter with a small green succulent, suspended by jute ropes",
    basePrompt: "Keep it a hanging planter with a plant inside.",
  },
  {
    category: "decor",
    name: "เทียนหอมในกะลา",
    price: 199,
    description: "เทียนหอมไขถั่วเหลืองเทในกะลามะพร้าว กลิ่นมะพร้าวอ่อน",
    subject: "a scented soy wax candle poured inside a half coconut shell, lit with a small flame",
    basePrompt: "Keep the candle inside the shell.",
  },
  {
    category: "decor",
    name: "ที่รองแก้วกะลา ชุด 4 ชิ้น",
    price: 159,
    description: "ที่รองแก้วทรงกลมจากกะลา 4 ชิ้น พร้อมที่วางไม้",
    subject: "a set of four round flat coconut shell coasters stacked in a small wooden holder",
    basePrompt: "Keep four round flat coasters.",
  },
  {
    category: "decor",
    name: "นาฬิกาแขวนผนังกะลา",
    price: 450,
    description: "นาฬิกาแขวนผนังหน้าปัดกะลามะพร้าว เข็มไม้ เดินเงียบ",
    subject: "a wall clock made from a coconut shell with wooden clock hands and simple hour markers",
    basePrompt: "Keep it a wall clock with hands and hour markers.",
  },
  // เครื่องประดับ
  {
    category: "decorations",
    name: "ต่างหูกะลาทรงหยดน้ำ",
    price: 159,
    description: "ต่างหูกะลามะพร้าวทรงหยดน้ำ ขัดเงา ตะขอสีทอง น้ำหนักเบา ใส่สบายทั้งวัน",
    subject:
      "a pair of teardrop-shaped dangle earrings made from thin polished coconut shell pieces with small gold hooks, laid side by side",
    basePrompt: "Keep it a matching pair of teardrop dangle earrings with hooks.",
  },
  {
    category: "decorations",
    name: "สร้อยคอจี้กะลาแกะลายดอกไม้",
    price: 259,
    description: "จี้กะลามะพร้าวแกะลายดอกไม้ด้วยมือ ร้อยเชือกฝ้ายปรับความยาวได้",
    subject:
      "a round pendant necklace, the pendant is a thin polished coconut shell disc with a hand-carved flower, on a thin brown cotton cord arranged in a gentle curve",
    basePrompt: "Keep it a pendant necklace on a cord.",
  },
  {
    category: "decorations",
    name: "กำไลข้อมือลูกปัดกะลา",
    price: 199,
    description: "กำไลลูกปัดกะลามะพร้าวขัดมัน ร้อยยางยืด ใส่ได้ทั้งหญิงและชาย",
    subject: "a stretch bracelet of small round polished dark brown coconut shell beads forming a neat circle",
    basePrompt: "Keep it a beaded bracelet in a circle.",
  },
  {
    category: "decorations",
    name: "แหวนกะลาฝังเรซิน",
    price: 149,
    description: "แหวนกะลามะพร้าวขัดเงา ฝังเรซินใสลายคลื่น งานทำมือทีละวง",
    subject: "a finger ring made from polished coconut shell with a band of clear turquoise resin inlay, standing upright",
    basePrompt: "Keep it a single ring with the resin inlay band.",
  },
  {
    category: "decorations",
    name: "กิ๊บติดผมกะลา",
    price: 129,
    description: "กิ๊บติดผมกะลามะพร้าวทรงวงรี ขัดเรียบ ตัวหนีบโลหะแข็งแรง",
    subject: "an oval hair barrette clip made from a polished coconut shell plate with a metal clasp, shown from the front at a slight angle",
    basePrompt: "Keep it an oval hair barrette with a clasp.",
  },
];

// หมวดที่สินค้าตัวอย่างใช้ แต่ npm run seed ไม่ได้สร้างให้ (slug ตรงกับที่แอดมินสร้างไว้)
const EXTRA_CATEGORIES = [{ slug: "decorations", name: "เครื่องประดับ" }];

// ภาพสไตล์เดียวกันทุกชิ้น: พื้นหลังสว่าง ไม่มีอะไรรบกวน เหมาะเป็นรูปต้นแบบให้ AI แก้ต่อ
// ไม่ใช้คำว่า "fiber" — เคยทำให้ AI เติมขน/เส้นใยมะพร้าวฟู ๆ รอบชิ้นงาน
const photoPrompt = (subject: string) =>
  `Professional e-commerce product photograph of ${subject}, handcrafted from real coconut shell, ` +
  "fully cleaned coconut shell sanded smooth and polished, clean smooth surface and crisp clean edges, " +
  "completely free of husk, loose fibers or hairs, natural shell grain visible, " +
  "centered composition, whole product fully visible, " +
  "plain warm off-white seamless background, soft natural studio lighting, gentle soft shadow, " +
  "sharp focus, photorealistic, high detail, no text, no watermark";

async function generateImage(prompt: string): Promise<Buffer> {
  const { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_AI_TOKEN: token } = process.env;
  if (!account || !token) throw new Error("CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_AI_TOKEN is not set");
  const model = process.env.CLOUDFLARE_IMAGE_MODEL || "@cf/black-forest-labs/flux-2-klein-4b";
  const form = new FormData();
  form.append("prompt", prompt);
  form.append("width", "1024");
  form.append("height", "1024");
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/ai/run/${model}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const body = (await res.json().catch(() => ({}))) as { result?: { image?: string }; errors?: { message?: string }[] };
  if (!res.ok || !body.result?.image) {
    throw new Error(`Cloudflare AI ${res.status}: ${body.errors?.map((e) => e.message).join("; ") || "no image"}`);
  }
  return Buffer.from(body.result.image, "base64");
}

/** สร้างรูปใหม่ให้สินค้าที่มีอยู่แล้ว — อัปรูปใหม่ก่อน แล้วค่อยลบรูปเก่า (ไม่มีช่วงที่สินค้าไม่มีรูป) */
async function regenerate(name: string) {
  const seed = PRODUCTS.find((p) => p.name === name);
  if (!seed) throw new Error(`ไม่พบ "${name}" ในรายการสินค้าตัวอย่าง`);
  const product = await Product.findOne({ name: seed.name });
  if (!product) throw new Error(`ยังไม่มีสินค้า "${name}" ในฐานข้อมูล`);
  const oldPublicId = product.refImage.publicId;
  const image = await generateImage(photoPrompt(seed.subject));
  const index = PRODUCTS.indexOf(seed) + 1;
  await writeFile(path.join(process.cwd(), "ai-test-output", "products", `${String(index).padStart(2, "0")}-${seed.category}.jpg`), image);
  product.refImage = await uploadReferenceImage(image);
  product.description = seed.description;
  product.basePrompt = seed.basePrompt;
  await product.save();
  await deleteImage(oldPublicId).catch((err) => console.warn("ลบรูปเก่าไม่สำเร็จ:", err instanceof Error ? err.message : err));
  console.log(`สร้างรูปใหม่ให้ "${name}" แล้ว`);
}

async function main() {
  await connectDB();
  const regen = process.argv.indexOf("--regen");
  if (regen > -1) return regenerate(process.argv[regen + 1] ?? "");
  for (const [i, c] of EXTRA_CATEGORIES.entries()) {
    // เช็คทั้ง slug และชื่อ — ชื่อประเภทเป็น unique ถ้าแอดมินสร้างไว้แล้วด้วย slug อื่นจะไม่สร้างซ้ำ
    if (!(await Category.exists({ $or: [{ slug: c.slug }, { name: c.name }] }))) {
      await Category.create({ ...c, sortOrder: 100 + i });
      console.log(`สร้างประเภท "${c.name}" แล้ว`);
    }
  }
  const categories = new Map((await Category.find().select("slug").lean()).map((c) => [c.slug, c._id]));
  const outDir = path.join(process.cwd(), "ai-test-output", "products");
  await mkdir(outDir, { recursive: true });

  let created = 0;
  let skipped = 0;
  for (const [i, p] of PRODUCTS.entries()) {
    const label = `[${String(i + 1).padStart(2, "0")}/${PRODUCTS.length}] ${p.name}`;
    const categoryId = categories.get(p.category);
    if (!categoryId) {
      console.log(`${label} — skipped (ไม่มีประเภท "${p.category}" รัน npm run seed ก่อน)`);
      skipped++;
      continue;
    }
    if (await Product.exists({ name: p.name })) {
      console.log(`${label} — มีอยู่แล้ว ข้าม`);
      skipped++;
      continue;
    }
    const started = Date.now();
    const image = await generateImage(photoPrompt(p.subject));
    await writeFile(path.join(outDir, `${String(i + 1).padStart(2, "0")}-${p.category}.jpg`), image);
    const refImage = await uploadReferenceImage(image);
    await Product.create({
      name: p.name,
      category: categoryId,
      description: p.description,
      price: p.price,
      basePrompt: p.basePrompt,
      refImage,
      sortOrder: i + 1,
      active: true,
    });
    created++;
    console.log(`${label} — สร้างแล้ว (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  }
  console.log(`\nเสร็จ: สร้างใหม่ ${created} · ข้าม ${skipped} · รูปตัวอย่างอยู่ที่ ${outDir}`);
}

main()
  .catch((err) => {
    console.error("seed products failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
