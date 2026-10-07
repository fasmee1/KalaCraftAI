import { describe, expect, it } from "vitest";
import { toHistoryItem } from "@/lib/designHistory";

const PRODUCT_ID = "64b7f0c2a1b2c3d4e5f60718";

const generation = (extra: Record<string, unknown> = {}) => ({
  designCode: "KC-ABC123",
  aspectRatio: "1:1",
  createdAt: new Date("2026-10-04T10:00:00.000Z"),
  sentToPageAt: null,
  product: { _id: PRODUCT_ID, name: "ชามกะลา", refImage: { publicId: "coconut-designs/abc123" } },
  options: [{ label: "มินิมอล" }, { label: "โทนอุ่น" }],
  savedImage: { publicId: "coconut-designs/designs/xyz789" },
  ...extra,
});

describe("toHistoryItem", () => {
  it("returns only the fields the customer may see", () => {
    const item = toHistoryItem(
      generation({ finalPrompt: "secret prompt", ipHash: "hash", costUsd: 0.02, customer: "id", note: "x", error: "e" }),
    );
    expect(item).toEqual({
      designCode: "KC-ABC123",
      aspectRatio: "1:1",
      createdAt: "2026-10-04T10:00:00.000Z",
      sentToPage: false,
      product: { name: "ชามกะลา", imageUrl: `/api/images/${PRODUCT_ID}?v=abc123` },
      labels: ["มินิมอล", "โทนอุ่น"],
      imageUrl: "/api/me/generations/KC-ABC123/image?v=xyz789",
    });
  });

  it("never exposes where the saved image lives", () => {
    const item = toHistoryItem(generation());
    expect(JSON.stringify(item)).not.toContain("coconut-designs/designs");
  });

  it("marks designs already sent to the page", () => {
    expect(toHistoryItem(generation({ sentToPageAt: new Date() })).sentToPage).toBe(true);
  });

  it("survives a deleted product and deleted options", () => {
    const item = toHistoryItem(generation({ product: null, options: [null, { label: "ลายไทย" }] }));
    expect(item.product).toBeNull();
    expect(item.labels).toEqual(["ลายไทย"]);
  });
});
