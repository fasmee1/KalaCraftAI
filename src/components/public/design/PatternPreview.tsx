import type { CSSProperties } from "react";
import type { PatternPreview as PatternPreviewKey } from "@/lib/optionTypes";

// ภาพตัวอย่างลวดลายวาดด้วย CSS ล้วน — ไม่ต้องโหลดรูปเพิ่ม
const STYLES: Record<PatternPreviewKey, CSSProperties> = {
  carve: {
    backgroundColor: "#a9744c",
    backgroundImage:
      "radial-gradient(circle at 50% 50%, transparent 18%, rgba(62,42,28,.55) 19%, rgba(62,42,28,.55) 22%, transparent 23%)," +
      "radial-gradient(circle at 50% 50%, rgba(250,246,240,.25) 0 8%, transparent 9%)",
    backgroundSize: "100% 100%, 100% 100%",
    boxShadow: "inset 0 0 0 6px rgba(62,42,28,.35)",
  },
  cutout: {
    backgroundColor: "#6b4226",
    backgroundImage: "radial-gradient(circle, #faf6f0 22%, transparent 24%)",
    backgroundSize: "14px 14px",
  },
  thai: {
    backgroundColor: "#3e2a1c",
    backgroundImage:
      "radial-gradient(circle at 0 100%, transparent 38%, #d9a441 40%, #d9a441 46%, transparent 48%)," +
      "radial-gradient(circle at 100% 0, transparent 38%, #d9a441 40%, #d9a441 46%, transparent 48%)",
    backgroundSize: "22px 22px",
  },
  geometric: {
    backgroundColor: "#a9744c",
    backgroundImage:
      "repeating-linear-gradient(45deg, rgba(62,42,28,.75) 0 2px, transparent 2px 12px)," +
      "repeating-linear-gradient(-45deg, rgba(62,42,28,.75) 0 2px, transparent 2px 12px)",
  },
  none: {
    backgroundImage: "linear-gradient(135deg, #c99a6b, #8b5a3c)",
  },
};

export function PatternPreview({ preview }: { preview: PatternPreviewKey | null }) {
  return <div aria-hidden className="size-full rounded-lg" style={STYLES[preview ?? "none"]} />;
}
