import { getCustomer } from "@/lib/auth";
import { AiQuotaExceededError } from "@/lib/cloudflareAi";
import { connectDB } from "@/lib/db";
import { generateDesignCode } from "@/lib/designCode";
import { hashImage } from "@/lib/designImage";
import { editReferenceImage, estimateCostUsd, getAiProvider, type EditLevel } from "@/lib/imageAi";
import { OPTION_TYPES, type OptionType } from "@/lib/optionTypes";
import { translateNote } from "@/lib/noteTranslate";
import { buildPrompt, sanitizeNote } from "@/lib/prompt";
import { checkGenerateLimits, getClientIp, hashIp } from "@/lib/rateLimit";
import { verifyTurnstile } from "@/lib/turnstile";
import { generateSchema } from "@/lib/validators";
import { Category } from "@/models/Category";
import { Generation } from "@/models/Generation";
import { Option } from "@/models/Option";
import { Product } from "@/models/Product";

// รอ AI ได้นานสุด 60 วินาที
export const maxDuration = 60;

const error = (message: string, status: number) => Response.json({ error: message }, { status });

export async function POST(request: Request) {
  // 1. validate
  const parsed = generateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error("ข้อมูลไม่ถูกต้อง กรุณาเลือกใหม่อีกครั้ง", 400);
  const { productId, aspectRatio, note, turnstileToken } = parsed.data;
  const optionIds = [...new Set(parsed.data.optionIds)];

  // 2. captcha
  const ip = getClientIp(request.headers);
  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return error("ยืนยันตัวตนไม่สำเร็จ กรุณาลองใหม่", 403);
  }

  await connectDB();

  // 3. rate limit ต่อบัญชี (ล็อกอิน Google) หรือต่อ IP (ไม่ล็อกอิน) + งบรายวันทั้งระบบ
  const ipHash = hashIp(ip);
  const customer = await getCustomer();
  if (customer?.suspended) return error("บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อเพจ", 403);
  const customerId = customer?.id ?? null;
  const provider = getAiProvider();
  // มีคำขอพิมพ์เอง → ใช้โมเดลแก้รูปตัวใหญ่ (ทำตามคำขอได้) ซึ่งแพงกว่า — คิดงบตามระดับจริง
  const cleanNote = sanitizeNote(note);
  const level: EditLevel = cleanNote ? "edit" : "restyle";
  const costUsd = estimateCostUsd(provider, level);
  const limit = await checkGenerateLimits({ ipHash, customerId }, costUsd);
  if (!limit.ok) {
    const messages = {
      ip: "วันนี้คุณสร้างภาพครบโควตาแล้ว เข้าสู่ระบบด้วย Google ที่หน้าแรกเพื่อสร้างได้เพิ่ม หรือกลับมาใหม่พรุ่งนี้",
      account: "วันนี้คุณสร้างภาพครบโควตาแล้ว กรุณากลับมาใหม่พรุ่งนี้",
      budget: "วันนี้ระบบสร้างภาพครบโควตาแล้ว กรุณากลับมาใหม่พรุ่งนี้",
    };
    return error(messages[limit.reason], 429);
  }

  // 4. โหลดสินค้า + ตัวเลือก (ต้อง active ทั้งหมด) — cast id เป็น string กัน NoSQL injection
  const product = await Product.findOne({ _id: String(productId), active: true })
    .select("name category refImage basePrompt")
    .lean();
  const categoryActive = product && (await Category.exists({ _id: product.category, active: true }));
  if (!product || !categoryActive) return error("ไม่พบสินค้านี้ หรือสินค้าปิดการใช้งานแล้ว", 404);

  const options = await Option.find({ _id: { $in: optionIds.map(String) }, active: true })
    .select("type promptText")
    .lean();
  if (options.length !== optionIds.length) return error("ตัวเลือกบางรายการไม่พร้อมใช้งาน กรุณาเลือกใหม่", 400);
  for (const t of OPTION_TYPES) {
    const count = options.filter((o) => o.type === t.key).length;
    if (t.required && count === 0) return error(`กรุณาเลือก${t.label}`, 400);
    if (!t.multiple && count > 1) return error(`เลือก${t.label}ได้เพียง 1 แบบ`, 400);
  }

  // 5. prompt มาจากข้อมูลของแอดมิน + note ที่ sanitize แล้วเท่านั้น
  // แปลคำขอภาษาไทยเป็นอังกฤษให้โมเดลรูปเข้าใจ — note ใน DB เก็บข้อความเดิมของลูกค้าไว้ให้แอดมินอ่าน
  const { text: promptNote } = await translateNote(cleanNote);
  const finalPrompt = buildPrompt({
    basePrompt: product.basePrompt ?? "",
    options: options.map((o) => ({ type: o.type as OptionType, promptText: o.promptText })),
    note: promptNote,
  });

  // 6. บันทึกเป็น pending ก่อน (นับโควตาทันที) แล้วค่อยเรียก AI
  let generation = null;
  for (let attempt = 0; attempt < 3 && !generation; attempt++) {
    try {
      generation = await Generation.create({
        designCode: generateDesignCode(),
        product: product._id,
        options: options.map((o) => o._id),
        note: cleanNote,
        aspectRatio,
        finalPrompt,
        provider,
        costUsd,
        ipHash,
        customer: customerId,
      });
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err; // designCode ซ้ำ → สุ่มใหม่
    }
  }
  if (!generation) return error("ระบบขัดข้อง กรุณาลองใหม่", 500);

  const started = Date.now();
  try {
    const result = await editReferenceImage({ publicId: product.refImage.publicId, prompt: finalPrompt, aspectRatio, level });
    const durationMs = Date.now() - started;
    // จด hash ของรูปไว้ — ลูกค้าที่ล็อกอินกด "บันทึกลงประวัติ" ได้เฉพาะรูปนี้
    const imageHash = hashImage(Buffer.from(result.imageBase64, "base64"));
    await Generation.updateOne(
      { _id: generation._id },
      { status: "success", model: result.model, durationMs, imageHash },
    );
    console.info(
      `[generate] ${generation.designCode} ok provider=${provider} model=${result.model} ${durationMs}ms ` +
        `cost≈$${costUsd} tokens=${result.inputTokens}/${result.outputTokens}`,
    );
    // 7. คืนรูปให้ client — server ยังไม่เก็บรูป จนกว่าลูกค้าจะกดบันทึกเอง
    return Response.json({
      designCode: generation.designCode,
      imageBase64: result.imageBase64,
      mimeType: result.mimeType,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await Generation.updateOne(
      { _id: generation._id },
      { status: "failed", costUsd: 0, durationMs: Date.now() - started, error: message.slice(0, 500) },
    );
    console.error(`[generate] ${generation.designCode} failed provider=${provider}: ${message}`);
    // โควตา AI ของทั้งระบบหมด — บอกตรง ๆ ว่ากลับมาได้เมื่อไหร่ (เปลี่ยนตัวเลือกไม่ช่วย)
    if (err instanceof AiQuotaExceededError) {
      return error("วันนี้ระบบสร้างภาพครบโควตาแล้ว เปิดให้สร้างใหม่ได้หลัง 07:00 น. (ไม่นับโควตาของคุณ)", 503);
    }
    return error("AI สร้างภาพไม่สำเร็จ กรุณาลองเปลี่ยนตัวเลือกหรือลองใหม่อีกครั้ง (ไม่นับโควตา)", 502);
  }
}
