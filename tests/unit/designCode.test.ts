import { describe, expect, it } from "vitest";
import { DESIGN_CODE_PATTERN, generateDesignCode } from "@/lib/designCode";

describe("generateDesignCode", () => {
  it("matches the public pattern and avoids ambiguous characters", () => {
    for (let i = 0; i < 500; i++) {
      const code = generateDesignCode();
      expect(code).toMatch(DESIGN_CODE_PATTERN);
      expect(code.slice(3)).not.toMatch(/[01OIL]/);
    }
  });

  it("rejects malformed codes", () => {
    for (const bad of ["KC-ABC12", "kc-ABCDEF", "KC-ABCDE0", "KC-ABCDEFG", "X-ABCDEF"]) {
      expect(DESIGN_CODE_PATTERN.test(bad)).toBe(false);
    }
  });
});
