import type { Session } from "next-auth";
import { describe, expect, it } from "vitest";
import { isAdminSession, isCustomerSession } from "@/lib/roles";

const session = (user: Session["user"]): Session => ({ user, expires: "2099-01-01T00:00:00.000Z" });
const CUSTOMER_ID = "64b7f0c2a1b2c3d4e5f60718";

describe("isAdminSession", () => {
  it("accepts an admin session", () => {
    expect(isAdminSession(session({ name: "admin", role: "admin" }))).toBe(true);
  });

  it("rejects a Google customer even though the session has a name", () => {
    expect(isAdminSession(session({ name: "Somchai", email: "s@example.com", role: "customer", customerId: CUSTOMER_ID }))).toBe(false);
  });

  it("rejects a session without a role, and no session at all", () => {
    expect(isAdminSession(session({ name: "admin" }))).toBe(false);
    expect(isAdminSession(null)).toBe(false);
  });
});

describe("isCustomerSession", () => {
  it("accepts a customer with a valid id", () => {
    expect(isCustomerSession(session({ name: "Somchai", role: "customer", customerId: CUSTOMER_ID }))).toBe(true);
  });

  it("rejects admins, missing ids and malformed ids", () => {
    expect(isCustomerSession(session({ name: "admin", role: "admin" }))).toBe(false);
    expect(isCustomerSession(session({ name: "Somchai", role: "customer" }))).toBe(false);
    expect(isCustomerSession(session({ name: "Somchai", role: "customer", customerId: "not-an-id" }))).toBe(false);
    expect(isCustomerSession(null)).toBe(false);
  });
});
