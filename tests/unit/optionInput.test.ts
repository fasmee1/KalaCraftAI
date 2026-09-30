import { describe, expect, it } from "vitest";
import { optionInputSchema } from "@/lib/validators";

const base = { label: "มินิมอล", promptText: "minimalist, clean simple lines" };

describe("optionInputSchema", () => {
  it("applies defaults", () => {
    const out = optionInputSchema.parse({ ...base, type: "style" });
    expect(out).toMatchObject({ sortOrder: 0, active: true, swatch: null, preview: null });
  });

  it("keeps swatch only for tone and normalises case", () => {
    expect(optionInputSchema.parse({ ...base, type: "tone", swatch: "#C9A27A" }).swatch).toBe("#c9a27a");
    expect(optionInputSchema.parse({ ...base, type: "style", swatch: "#c9a27a" }).swatch).toBeNull();
  });

  it("keeps preview only for pattern, defaulting to none", () => {
    expect(optionInputSchema.parse({ ...base, type: "pattern" }).preview).toBe("none");
    expect(optionInputSchema.parse({ ...base, type: "pattern", preview: "thai" }).preview).toBe("thai");
    expect(optionInputSchema.parse({ ...base, type: "tone", preview: "thai" }).preview).toBeNull();
  });

  it("rejects unknown types, bad colours and unknown previews", () => {
    expect(optionInputSchema.safeParse({ ...base, type: "size" }).success).toBe(false);
    expect(optionInputSchema.safeParse({ ...base, type: "tone", swatch: "red" }).success).toBe(false);
    expect(optionInputSchema.safeParse({ ...base, type: "pattern", preview: "stars" }).success).toBe(false);
  });

  it("rejects prompt text with characters that could break the prompt", () => {
    for (const bad of ["glossy <b>", "a {x}", "back`tick", "slash \\ here"]) {
      expect(optionInputSchema.safeParse({ ...base, type: "style", promptText: bad }).success).toBe(false);
    }
  });

  it("rejects non-string input such as NoSQL operators", () => {
    expect(optionInputSchema.safeParse({ ...base, type: "style", label: { $gt: "" } }).success).toBe(false);
  });
});
