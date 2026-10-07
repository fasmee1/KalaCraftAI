import { describe, expect, it } from "vitest";
import { serializeCustomer } from "@/lib/customer";
import { customerPatchSchema } from "@/lib/validators";

const doc = (extra: Record<string, unknown> = {}) => ({
  _id: "64b7f0c2a1b2c3d4e5f60718",
  googleSub: "google-sub-123",
  email: "somchai@example.com",
  name: "สมชาย",
  favorites: ["64b7f0c2a1b2c3d4e5f60719"],
  createdAt: new Date("2026-10-01T03:00:00.000Z"),
  lastLoginAt: new Date("2026-10-05T09:30:00.000Z"),
  suspendedAt: null,
  ...extra,
});

describe("serializeCustomer", () => {
  it("returns what the admin list shows, without Google ids or favorites", () => {
    const dto = serializeCustomer(doc(), { designs: 7, saved: 3 });
    expect(dto).toEqual({
      id: "64b7f0c2a1b2c3d4e5f60718",
      name: "สมชาย",
      email: "somchai@example.com",
      createdAt: "2026-10-01T03:00:00.000Z",
      lastLoginAt: "2026-10-05T09:30:00.000Z",
      suspended: false,
      designs: 7,
      saved: 3,
    });
  });

  it("marks suspended accounts", () => {
    expect(serializeCustomer(doc({ suspendedAt: new Date() })).suspended).toBe(true);
  });

  it("handles customers who never generated or logged in again", () => {
    const dto = serializeCustomer(doc({ lastLoginAt: null, name: undefined }));
    expect(dto).toMatchObject({ lastLoginAt: null, name: "", designs: 0, saved: 0 });
  });
});

describe("customerPatchSchema", () => {
  it("accepts only the suspended flag", () => {
    expect(customerPatchSchema.safeParse({ suspended: true }).success).toBe(true);
    expect(customerPatchSchema.safeParse({ suspended: "yes" }).success).toBe(false);
    expect(customerPatchSchema.safeParse({}).success).toBe(false);
    expect(customerPatchSchema.parse({ suspended: false, email: "x@y.z", role: "admin" })).toEqual({ suspended: false });
  });
});
