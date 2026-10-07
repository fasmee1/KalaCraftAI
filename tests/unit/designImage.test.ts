import { describe, expect, it } from "vitest";
import { MAX_SAVED_IMAGE_BYTES } from "@/lib/designHistory";
import { hashImage, matchSavedImage } from "@/lib/designImage";

const image = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const base64 = image.toString("base64");

describe("matchSavedImage", () => {
  it("accepts the exact image the AI produced", () => {
    expect(matchSavedImage(base64, hashImage(image))?.equals(image)).toBe(true);
  });

  it("rejects any other image", () => {
    const other = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 9, 9, 9, 9]).toString("base64");
    expect(matchSavedImage(other, hashImage(image))).toBeNull();
  });

  it("rejects designs created before hashes were recorded", () => {
    expect(matchSavedImage(base64, null)).toBeNull();
    expect(matchSavedImage(base64, "")).toBeNull();
    expect(matchSavedImage(base64, "not-a-hash")).toBeNull();
  });

  it("rejects empty and oversized uploads", () => {
    expect(matchSavedImage("", hashImage(Buffer.alloc(0)))).toBeNull();
    const big = Buffer.alloc(MAX_SAVED_IMAGE_BYTES + 1, 1);
    expect(matchSavedImage(big.toString("base64"), hashImage(big))).toBeNull();
  });
});
