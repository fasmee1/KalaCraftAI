import { describe, expect, it } from "vitest";
import { evictionCodes, HISTORY_LIMIT, toHistoryItem } from "@/lib/designHistory";

const PRODUCT_ID = "64b7f0c2a1b2c3d4e5f60718";

const generation = (extra: Record<string, unknown> = {}) => ({
  designCode: "KC-ABC123",
  aspectRatio: "1:1",
  createdAt: new Date("2026-10-04T10:00:00.000Z"),
  sentToPageAt: null,
  product: { _id: PRODUCT_ID, name: "ชามกะลา", refImage: { publicId: "coconut-designs/abc123" } },
  options: [{ label: "มินิมอล" }, { label: "โทนอุ่น" }],
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
    });
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

describe("evictionCodes", () => {
  const entry = (designCode: string, createdAt: number) => ({ designCode, createdAt });

  it("keeps everything while under the limit", () => {
    expect(evictionCodes([entry("a", 1), entry("b", 2)], 2)).toEqual([]);
  });

  it("evicts the oldest entries beyond the limit", () => {
    const entries = [entry("new", 30), entry("oldest", 10), entry("mid", 20), entry("newest", 40)];
    expect(evictionCodes(entries, 2).sort()).toEqual(["mid", "oldest"]);
  });

  it("defaults to the history limit", () => {
    const entries = Array.from({ length: HISTORY_LIMIT + 1 }, (_, i) => entry(`c${i}`, i));
    expect(evictionCodes(entries)).toEqual(["c0"]);
  });
});
