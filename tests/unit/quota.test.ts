import { describe, expect, it } from "vitest";
import { dailyQuota, quotaFilter } from "@/lib/quota";

const CUSTOMER_ID = "64b7f0c2a1b2c3d4e5f60718";

describe("dailyQuota", () => {
  it("gives logged-in customers more than guests by default", () => {
    expect(dailyQuota(false, {})).toBe(2);
    expect(dailyQuota(true, {})).toBe(10);
  });

  it("reads limits from env and falls back on invalid values", () => {
    expect(dailyQuota(false, { RATE_LIMIT_PER_DAY: "3" })).toBe(3);
    expect(dailyQuota(true, { RATE_LIMIT_PER_DAY_USER: "25" })).toBe(25);
    expect(dailyQuota(true, { RATE_LIMIT_PER_DAY_USER: "abc" })).toBe(10);
  });
});

describe("quotaFilter", () => {
  it("counts a customer by account, regardless of IP", () => {
    expect(quotaFilter({ ipHash: "abc", customerId: CUSTOMER_ID })).toEqual({ customer: CUSTOMER_ID });
  });

  it("counts a guest by IP, excluding generations made by logged-in customers", () => {
    expect(quotaFilter({ ipHash: "abc", customerId: null })).toEqual({ ipHash: "abc", customer: null });
  });
});
