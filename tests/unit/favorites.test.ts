import { describe, expect, it } from "vitest";
import { favoriteSchema } from "@/lib/validators";

const PRODUCT_ID = "64b7f0c2a1b2c3d4e5f60718";

describe("favoriteSchema", () => {
  it("accepts a product id with a boolean flag", () => {
    expect(favoriteSchema.parse({ productId: PRODUCT_ID, favorite: true })).toEqual({ productId: PRODUCT_ID, favorite: true });
    expect(favoriteSchema.safeParse({ productId: PRODUCT_ID, favorite: false }).success).toBe(true);
  });

  it("rejects query objects and malformed ids (NoSQL injection)", () => {
    expect(favoriteSchema.safeParse({ productId: { $gt: "" }, favorite: true }).success).toBe(false);
    expect(favoriteSchema.safeParse({ productId: "not-an-id", favorite: true }).success).toBe(false);
  });

  it("requires an explicit boolean", () => {
    expect(favoriteSchema.safeParse({ productId: PRODUCT_ID }).success).toBe(false);
    expect(favoriteSchema.safeParse({ productId: PRODUCT_ID, favorite: "true" }).success).toBe(false);
  });
});
