// ชนิดของตัวเลือกดีไซน์ — ใช้ร่วมกันทั้ง server (validate/prompt) และ client (popup)
export const OPTION_TYPES = [
  { key: "style", label: "สไตล์", required: true, multiple: false },
  { key: "tone", label: "โทนสี", required: true, multiple: false },
  { key: "pattern", label: "ลวดลาย/การตกแต่ง", required: false, multiple: false },
  { key: "texture", label: "ผิวสัมผัส", required: false, multiple: false },
  { key: "material", label: "วัสดุผสม", required: false, multiple: true },
  { key: "background", label: "ฉากหลัง", required: false, multiple: false },
  { key: "camera", label: "มุมกล้อง", required: false, multiple: false },
] as const;

export type OptionType = (typeof OPTION_TYPES)[number]["key"];

export const OPTION_TYPE_KEYS = OPTION_TYPES.map((t) => t.key) as OptionType[];

export const PATTERN_PREVIEWS = ["carve", "cutout", "thai", "geometric", "none"] as const;
export type PatternPreview = (typeof PATTERN_PREVIEWS)[number];

export const ASPECT_RATIOS = [
  { value: "1:1", label: "โพสต์โซเชียล" },
  { value: "3:4", label: "หน้าร้านค้า" },
  { value: "16:9", label: "แบนเนอร์" },
] as const;

export const NOTE_MAX_LENGTH = 200;
