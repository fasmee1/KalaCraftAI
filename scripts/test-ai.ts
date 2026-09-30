// ทดลองให้ AI แก้รูปต้นแบบสินค้าจริง แล้วบันทึกผลเป็นไฟล์ใน ai-test-output/ (ไม่ขึ้น Cloudinary / DB)
// ใช้: npm run test:ai
//      npm run test:ai -- --product <productId> --prompt "carve a Thai lotus pattern"
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import mongoose, { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { editReferenceImage, getAiProvider } from "@/lib/imageAi";
import { Product } from "@/models/Product";

const DEFAULT_PROMPT =
  "Keep the exact same coconut shell product, shape, size, camera angle and background. " +
  "Add a finely hand-carved traditional Thai floral (kranok) pattern around the outer surface, " +
  "natural brown coconut shell texture, warm studio lighting, realistic product photo.";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const productId = arg("product");
  const prompt = arg("prompt") ?? DEFAULT_PROMPT;
  if (productId && !isValidObjectId(productId)) throw new Error("--product must be a valid ObjectId");

  await connectDB();
  const product = await Product.findOne(productId ? { _id: String(productId) } : { active: true })
    .sort({ createdAt: 1 })
    .select("name refImage")
    .lean();
  if (!product) throw new Error("No product found — upload a product with a reference image first");

  console.log(`provider : ${getAiProvider()}`);
  console.log(`product  : ${product.name} (${product._id})`);
  console.log(`prompt   : ${prompt}`);

  const started = Date.now();
  const result = await editReferenceImage({ publicId: product.refImage.publicId, prompt });
  const ext = result.mimeType.split("/")[1] === "jpeg" ? "jpg" : result.mimeType.split("/")[1];
  const outDir = path.join(process.cwd(), "ai-test-output");
  await mkdir(outDir, { recursive: true });
  const file = path.join(outDir, `${result.provider}-${Date.now()}.${ext}`);
  await writeFile(file, Buffer.from(result.imageBase64, "base64"));

  console.log(`model    : ${result.model}`);
  console.log(`time     : ${((Date.now() - started) / 1000).toFixed(1)}s`);
  console.log(`saved    : ${file}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
