import "server-only";
import bcrypt from "bcryptjs";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db";
import { loginSchema } from "@/lib/validators";
import { Admin } from "@/models/Admin";

const MAX_FAILED_LOGINS = 5;
const LOCK_MS = 15 * 60 * 1000;
const SESSION_MAX_AGE = 8 * 60 * 60; // 8 ชั่วโมง
export const LOCKED_ERROR = "LOCKED";

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
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = "admin";
      return token;
    },
  },
};

/** ใช้ในทุก route/page ของแอดมิน — proxy อย่างเดียวไม่พอ ต้องเช็คฝั่ง server ซ้ำ */
export async function getAdminSession() {
  const session = await getServerSession(authOptions);
  return session?.user?.name ? session : null;
}
