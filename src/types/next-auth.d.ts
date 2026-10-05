import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/roles";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & { role?: Role; customerId?: string };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    customerId?: string;
  }
}
