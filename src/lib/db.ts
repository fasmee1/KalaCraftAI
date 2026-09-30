import "server-only";
import dns from "node:dns";
import mongoose from "mongoose";

// บางเครื่อง (Windows) Node ได้ DNS เป็น 127.0.0.1 ที่ไม่มีอะไรตอบ → lookup SRV ของ mongodb+srv:// ล้ม (querySrv ECONNREFUSED)
// เปลี่ยนไปใช้ public DNS เฉพาะกรณีนี้ ไม่ทับ DNS ปกติของเครื่อง
// ตั้งทั้ง dns และ dns.promises เพราะใน Next บางครั้งเป็นคนละ resolver กัน และ driver ของ MongoDB ใช้ dns.promises
const isLoopbackOnly = (servers: string[]) => servers.every((s) => s === "127.0.0.1" || s === "::1");
const PUBLIC_DNS = ["8.8.8.8", "1.1.1.1"];
if (isLoopbackOnly(dns.getServers())) dns.setServers(PUBLIC_DNS);
if (isLoopbackOnly(dns.promises.getServers())) dns.promises.setServers(PUBLIC_DNS);

// เก็บ connection ไว้ใน globalThis เพื่อไม่ให้เปิด connection ใหม่ทุกครั้งที่ dev server hot-reload
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const g = globalThis as typeof globalThis & { _mongoose?: Cache };
const cache: Cache = (g._mongoose ??= { conn: null, promise: null });

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured");

  cache.promise ??= mongoose.connect(uri, { bufferCommands: false, serverSelectionTimeoutMS: 10_000 });
  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }
  return cache.conn;
}
