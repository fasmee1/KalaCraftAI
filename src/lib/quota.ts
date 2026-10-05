const GUEST_PER_DAY = 2;
const CUSTOMER_PER_DAY = 10;

type Env = Record<string, string | undefined>;

/** จำนวนครั้งต่อวัน — ลูกค้าที่ล็อกอินด้วย Google ได้มากกว่าคนไม่ล็อกอิน */
export function dailyQuota(isCustomer: boolean, env: Env = process.env): number {
  return isCustomer
    ? Number(env.RATE_LIMIT_PER_DAY_USER) || CUSTOMER_PER_DAY
    : Number(env.RATE_LIMIT_PER_DAY) || GUEST_PER_DAY;
}

/** ล็อกอิน = นับต่อบัญชี, ไม่ล็อกอิน = นับต่อ IP (ไม่รวมครั้งที่คนล็อกอินสร้างจาก IP เดียวกัน) */
export function quotaFilter(who: { ipHash: string; customerId: string | null }) {
  return who.customerId ? { customer: who.customerId } : { ipHash: who.ipHash, customer: null };
}
