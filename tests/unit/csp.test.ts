import { describe, expect, it } from "vitest";
import { buildCsp } from "@/lib/csp";

const directive = (csp: string, name: string) =>
  csp
    .split(";")
    .map((d) => d.trim())
    .find((d) => d.startsWith(`${name} `) || d === name);

describe("buildCsp", () => {
  const prod = buildCsp("abc123", false);
  const dev = buildCsp("abc123", true);

  it("allows scripts only through the per-request nonce", () => {
    const scripts = directive(prod, "script-src")!;
    expect(scripts).toContain("'nonce-abc123'");
    expect(scripts).toContain("'strict-dynamic'");
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'unsafe-eval'");
  });

  it("only relaxes eval and websockets in development", () => {
    expect(directive(dev, "script-src")).toContain("'unsafe-eval'");
    expect(directive(dev, "connect-src")).toContain("ws:");
    expect(directive(prod, "connect-src")).toBe("connect-src 'self'");
    expect(prod).toContain("upgrade-insecure-requests");
    expect(dev).not.toContain("upgrade-insecure-requests");
  });

  it("allows the image sources the site really uses", () => {
    const images = directive(prod, "img-src")!;
    // api.cloudinary.com = signed download URL ที่ /api/images/[id] redirect ไป (CSP ตรวจปลายทางของ redirect ด้วย)
    for (const source of ["'self'", "blob:", "data:", "https://res.cloudinary.com", "https://api.cloudinary.com"]) {
      expect(images).toContain(source);
    }
  });

  it("allows the Turnstile frame and nothing else to embed or be embedded", () => {
    expect(directive(prod, "frame-src")).toBe("frame-src https://challenges.cloudflare.com");
    expect(directive(prod, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(prod, "object-src")).toBe("object-src 'none'");
    expect(directive(prod, "base-uri")).toBe("base-uri 'self'");
  });
});
