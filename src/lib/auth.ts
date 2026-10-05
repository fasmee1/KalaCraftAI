import "server-only";
import bcrypt from "bcryptjs";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider, { type GoogleProfile } from "next-auth/providers/google";
import { connectDB } from "@/lib/db";
import { isAdminSession, isCustomerSession } from "@/lib/roles";
import { loginSchema } from "@/lib/validators";
import { Admin } from "@/models/Admin";
import { Customer } from "@/models/Customer";

const MAX_FAILED_LOGINS = 5;
const LOCK_MS = 15 * 60 * 1000;
const SESSION_MAX_AGE = 8 * 60 * 60; // 8 ชั่วโมง
export const LOCKED_ERROR = "LOCKED";
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

// hash ไว้เทียบเมื่อไม่พบ username เพื่อให้เวลาตอบกลับใกล้เคียงกรณีรหัสผิด
const DUMMY_HASH = bcrypt.hashSync("dummy-password", 12);

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE },
  jwt: { maxAge: SESSION_MAX_AGE },
  pages: { signIn: "/admin/login" },
  providers: [
    CredentialsProvider({
      name: "Admin",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { username, password } = parsed.data;

        await connectDB();
        const admin = await Admin.findOne({ username: String(username) }).select("+passwordHash");
        if (!admin) {
          await bcrypt.compare(password, DUMMY_HASH);
          console.warn(`[auth] login failed: unknown user "${username}"`);
          return null;
        }

        if (admin.lockUntil && admin.lockUntil.getTime() > Date.now()) {
          console.warn(`[auth] login blocked: "${username}" is locked until ${admin.lockUntil.toISOString()}`);
          throw new Error(LOCKED_ERROR);
        }

        const ok = await bcrypt.compare(password, admin.passwordHash);
        if (!ok) {
          const failed = (admin.failedLoginCount ?? 0) + 1;
          const locked = failed >= MAX_FAILED_LOGINS;
          await Admin.updateOne(
            { _id: admin._id },
            locked
              ? { failedLoginCount: 0, lockUntil: new Date(Date.now() + LOCK_MS) }
              : { failedLoginCount: failed },
          );
          console.warn(`[auth] login failed: wrong password for "${username}" (${failed}/${MAX_FAILED_LOGINS})`);
          if (locked) throw new Error(LOCKED_ERROR);
          return null;
        }

        await Admin.updateOne({ _id: admin._id }, { failedLoginCount: 0, lockUntil: null, lastLoginAt: new Date() });
        console.info(`[auth] login success: "${username}"`);
        return { id: String(admin._id), name: admin.username };
      },
    }),
    // ลูกค้าล็อกอินด้วย Google (ไม่บังคับ) — ได้ role "customer" เท่านั้น ไม่มีทางเป็นแอดมิน
    ...(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({ clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET })]
      : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      // รับเฉพาะบัญชีที่ Google ยืนยันอีเมลแล้ว
      const google = profile as GoogleProfile | undefined;
      return google?.email_verified === true && Boolean(google.email);
    },
    async jwt({ token, user, account, profile }) {
      if (!user) return token;
      if (account?.provider !== "google") {
        token.role = "admin";
        return token;
      }

      const google = profile as GoogleProfile;
      await connectDB();
      const customer = await Customer.findOneAndUpdate(
        { googleSub: String(account.providerAccountId) },
        { email: String(google.email), name: String(google.name ?? ""), lastLoginAt: new Date() },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
      );
      token.role = "customer";
      token.customerId = String(customer._id);
      delete token.picture; // ไม่เก็บรูปโปรไฟล์ Google
      console.info(`[auth] customer login: ${token.customerId}`);
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.customerId = token.customerId;
      }
      return session;
    },
  },
};

/** ใช้ในทุก route/page ของแอดมิน — proxy อย่างเดียวไม่พอ ต้องเช็คฝั่ง server ซ้ำ */
export async function getAdminSession() {
  const session = await getServerSession(authOptions);
  return isAdminSession(session) ? session : null;
}

/** id ของลูกค้าที่ล็อกอินด้วย Google — null ถ้าไม่ได้ล็อกอิน (หรือเป็นแอดมิน) */
export async function getCustomerId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return isCustomerSession(session) ? (session.user?.customerId ?? null) : null;
}
