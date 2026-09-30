import Link from "next/link";
import { DesignStudio } from "@/components/public/design/DesignStudio";
import { ProductCard } from "@/components/public/ProductCard";
import { ChevronIcon, ImageIcon, SparkleIcon, SunIcon } from "@/components/public/icons";
import { getDesignCatalog, type DesignCatalog } from "@/lib/catalog";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";

type FeaturedProduct = { id: string; name: string; price: number | null; imageUrl: string };

async function getFeaturedProducts(): Promise<FeaturedProduct[]> {
  await connectDB();
  const docs = await Product.find({ active: true }).sort({ sortOrder: 1, createdAt: -1 }).limit(8).lean();
  return docs.map((doc) => ({
    id: String(doc._id),
    name: doc.name,
    price: doc.price ?? null,
    imageUrl: `/api/images/${doc._id}?v=${doc.refImage.publicId.split("/").pop()}`,
  }));
}

export default async function HomePage() {
  const [products, catalog] = await Promise.all([getFeaturedProducts(), getDesignCatalog()]);

  return (
    <div className="mx-auto w-full max-w-[1200px] pb-10 lg:pb-20">
      <Header />
      <main className="px-6 lg:px-10">
        <Hero catalog={catalog} />
        <FeaturedProducts products={products} />
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between pl-[15px] pr-4 pt-3 lg:px-10 lg:pt-6">
      <Link href="/" className="flex items-center gap-3">
        <span className="flex size-[43px] items-center justify-center rounded-full bg-primary text-[15px] font-bold leading-none text-cream">
          KC
        </span>
        <span>
          <span className="block text-base font-semibold leading-[1.3] text-primary">KalaCraft AI</span>
          <span className="block text-[11px] leading-[1.3] text-ink-muted">หัตถกรรมกะลามะพร้าว</span>
        </span>
      </Link>
      <button
        type="button"
        aria-label="สลับธีม"
        className="flex size-10 items-center justify-center rounded-full bg-beige text-ink transition hover:bg-border/60"
      >
        <SunIcon size={20} />
      </button>
    </header>
  );
}

function Hero({ catalog }: { catalog: DesignCatalog }) {
  return (
    <section className="mt-[27px] flex min-h-[552px] flex-col items-center justify-center rounded-3xl border border-border bg-white px-6 py-10 text-center shadow-[0_8px_24px_rgba(107,66,38,0.08)] lg:mt-8 lg:grid lg:min-h-0 lg:grid-cols-2 lg:gap-12 lg:px-16 lg:py-16 lg:text-left">
      <div className="lg:flex lg:justify-center">
        <HeroIllustration />
      </div>

      <div className="flex w-full max-w-[420px] flex-col items-center lg:max-w-none lg:items-start">
        <span className="mt-[22px] inline-flex items-center gap-1.5 rounded-full bg-secondary/12 py-[3px] pl-2.5 pr-3 text-xs font-medium leading-[1.5] text-secondary lg:mt-0">
          <SparkleIcon size={12} />
          AI Design Studio
        </span>

        <h1 className="mt-2.5 text-2xl font-bold leading-[1.4] text-primary lg:mt-4 lg:text-[40px]">
          เปลี่ยนกะลามะพร้าว
          <br />
          เป็นดีไซน์ใหม่ด้วย AI
        </h1>

        <p className="mt-2 text-sm leading-[1.5] text-ink-muted lg:mt-3 lg:text-base">
          อัปโหลดรูปสินค้า เลือกสไตล์ที่ชอบ
          <br />
          แล้วให้ AI ช่วยออกแบบภาพต้นแบบให้
        </p>

        <DesignStudio
          catalog={catalog}
          className="mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-accent px-6 text-base font-semibold text-ink shadow-[0_6px_16px_rgba(217,164,65,0.35)] transition hover:brightness-[1.04] active:scale-[0.98] lg:mt-8 lg:h-14 lg:w-auto lg:px-10"
        />

        <Steps />
      </div>
    </section>
  );
}

function HeroIllustration() {
  return (
    // ขนาดเท่า Figma (250×178) แล้วขยาย 1.5 เท่าบนเดสก์ท็อป
    <div className="relative h-[178px] w-[250px] lg:h-[267px] lg:w-[375px]" aria-hidden>
      <div className="absolute left-0 top-0 h-[178px] w-[250px] origin-top-left lg:scale-150">
        <DesignTile className="left-[32px] top-[25px] h-[124px] w-[96px] -rotate-10 bg-[linear-gradient(to_bottom_right,#E3C08A,#B98B5E_50%)]" />
        <DesignTile className="left-[126.5px] top-[25.5px] h-[124px] w-[96px] rotate-10 bg-[linear-gradient(to_bottom_right,#8FA876,#5A7D4F_50%)]" />
        <DesignTile className="left-[69px] top-[12px] h-[144px] w-[112px] bg-[linear-gradient(to_bottom_right,#A9744C,#6B4226_50%)]" />
        <span className="absolute left-[162px] top-0 flex size-10 items-center justify-center rounded-full border-[3px] border-white bg-accent text-ink">
          <SparkleIcon size={20} />
        </span>
      </div>
    </div>
  );
}

function DesignTile({ className }: { className: string }) {
  return (
    <div
      className={`absolute flex items-center justify-center rounded-2xl border-[3px] border-white text-cream shadow-[0_6px_14px_rgba(46,33,24,0.18)] ${className}`}
    >
      <ImageIcon size={26} />
    </div>
  );
}

const STEPS = ["อัปโหลด", "เลือกสไตล์", "รับภาพ"];

function Steps() {
  return (
    <ol className="mt-[18px] flex items-center gap-1.5 lg:mt-6">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-1.5">
          <span className="flex items-center gap-[5px]">
            <span className="flex size-[18px] items-center justify-center rounded-full bg-beige text-[10px] font-semibold leading-none text-primary">
              {i + 1}
            </span>
            <span className="text-xs leading-[1.5] text-ink-muted">{label}</span>
          </span>
          {i < STEPS.length - 1 && <span className="h-px w-3 bg-border" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

function FeaturedProducts({ products }: { products: FeaturedProduct[] }) {
  return (
    <section className="mt-8 lg:mt-14">
      <div className="flex h-[30px] items-center justify-between">
        <h2 className="text-xl font-semibold leading-[1.4] text-ink lg:text-2xl">สินค้าแนะนำ</h2>
        <Link href="/products" className="flex items-center gap-0.5 text-[13px] font-medium leading-[1.5] text-primary hover:underline">
          ดูทั้งหมด
          <ChevronIcon size={16} />
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="mt-[17px] rounded-2xl border border-border bg-white px-4 py-10 text-center text-sm text-ink-muted">
          ยังไม่มีสินค้าแนะนำในขณะนี้
        </p>
      ) : (
        <ul className="mt-[17px] grid grid-cols-2 gap-[13px] md:grid-cols-3 lg:mt-5 lg:grid-cols-4 lg:gap-6">
          {products.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
