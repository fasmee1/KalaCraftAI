# CLAUDE.md — Coconut Shell AI Designer

เว็บสร้างภาพดีไซน์สินค้ากะลามะพร้าวด้วย AI
- ลูกค้า: ไม่ต้องล็อกอิน → เลือกสินค้า + ตัวเลือก → AI แก้รูปต้นแบบ (image edit) → ดาวน์โหลด / ส่งรหัสดีไซน์ให้เพจ
- แอดมิน: ล็อกอิน → Dashboard, CRUD ประเภทสินค้า / สินค้า / ตัวเลือก

Stack: Next.js (App Router, TypeScript) · MongoDB (Mongoose) · AI แก้รูปแบบ image-to-image: Cloudflare Workers AI (`flux-2-klein-4b`, ค่าเริ่มต้น, โควตาฟรีรายวัน) หรือ Google Gemini (Nano Banana — `gemini-2.5-flash-image`, เสียเงิน) เลือกด้วย `AI_PROVIDER` · Cloudinary (เก็บรูปต้นแบบสินค้าเท่านั้น) · NextAuth (Credentials)

---

## การทำงานของระบบ

### ลูกค้า (ไม่ต้องล็อกอิน)

```
หน้าแรก → เลือกประเภท → เลือกสินค้า → เลือกตัวเลือก (สไตล์/ลาย/สี/ข้อความสลัก)
→ ผ่าน Turnstile → กด "สร้างดีไซน์" → รอ (แสดง loading)
→ เห็นรูป + designCode + ข้อความ "ภาพจำลอง…" + เตือน "ดาวน์โหลดก่อนออกจากหน้านี้"
→ [ดาวน์โหลด]  [ส่งให้เพจ] = คัดลอก designCode + เปิด m.me/<NEXT_PUBLIC_FB_PAGE>
→ ลูกค้าแนบรูปเองในแชท
```

### `POST /api/generate` (ลำดับการทำงาน)

1. validate body ด้วย Zod (`productId`, `optionIds[]`, `aspectRatio`, `note?`, `turnstileToken`)
2. ตรวจ Turnstile → ไม่ผ่าน = 403
3. ตรวจ rate limit ต่อ `ipHash` และงบรายวันทั้งระบบ → เกิน = 429
4. โหลด product + options จาก DB (ต้อง `active: true`)
5. ประกอบ prompt ใน `lib/prompt.ts` (basePrompt + promptText + `note` ที่ sanitize แล้ว)
6. ดึง `refImage` จาก Cloudinary → ส่งรูป + prompt ให้ AI (`editReferenceImage` ใน `lib/imageAi.ts`)
7. บันทึก `generations` เป็น `pending` ก่อนเรียก AI (metadata เท่านั้น, ไม่มีรูป) + สร้าง `designCode` (`KC-XXXXXX`) แล้วอัปเดตเป็น `success`/`failed`
8. คืน `{ designCode, imageBase64 }` → **รูปไม่ถูกเก็บที่ไหนเลย**

error จาก AI (รวมถึงถูก safety filter บล็อก หรือโควตาฟรีรายวันหมด) → บันทึก `status: failed`, ไม่นับโควตาลูกค้า, คืนข้อความทั่วไป

### แอดมิน

```
/admin/login → (ผิดเกิน 5 ครั้ง ล็อค 15 นาที)
→ Dashboard: จำนวนการสร้างวันนี้/เดือนนี้, ค่า API, สินค้า/สไตล์ยอดนิยม, จำนวนกดส่งเพจ
→ ประเภทสินค้า: CRUD, เปิด/ปิด active, เรียงลำดับ
→ สินค้า: CRUD + อัป refImage (signed upload → Cloudinary) + basePrompt
→ ตัวเลือก: CRUD (type, label, promptText)
→ ค้นหา designCode: เห็นสินค้า + ตัวเลือก + prompt + เวลา (ไม่มีรูป)
```

ลบ/ปิดสินค้า → ใช้ `active: false` (soft delete) เพื่อไม่ให้ประวัติ `generations` เสีย

---

## คำสั่ง

```bash
npm install                 # ติดตั้ง
cp .env.example .env.local  # ตั้งค่า env (ดูด้านล่าง)
npm run dev                 # dev server → http://localhost:3000
npm run build && npm start  # production

npm run lint                # ESLint
npm run typecheck           # tsc --noEmit
npm test                    # unit test (Vitest)
npm run test:e2e            # e2e (Playwright)
npm run seed                # สร้างแอดมินคนแรก + ข้อมูลตัวอย่าง
npm run test:ai             # ลองให้ AI แก้รูปต้นแบบจริง → บันทึกไฟล์ใน ai-test-output/
npm audit                   # ตรวจช่องโหว่ dependency
```

ก่อน commit ต้องผ่าน: `lint` → `typecheck` → `test`

### Environment (`.env.local`)

```
MONGODB_URI=
AI_PROVIDER=cloudflare        # cloudflare | gemini
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_AI_TOKEN=
CLOUDFLARE_IMAGE_MODEL=@cf/black-forest-labs/flux-2-klein-4b
GEMINI_API_KEY=
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=coconut-designs
TURNSTILE_SECRET_KEY=           # dev ใช้ test key: 1x0000000000000000000000000000000AA
NEXT_PUBLIC_TURNSTILE_SITE_KEY= # dev ใช้ test key: 1x00000000000000000000AA
IP_HASH_SALT=                   # salt สำหรับ hash IP
NEXT_PUBLIC_FB_PAGE=         # ชื่อเพจสำหรับลิงก์ m.me
RATE_LIMIT_PER_DAY=5
DAILY_BUDGET_USD=10
```

---

## โครงสร้างโปรเจกต์

```
src/
├─ app/
│  ├─ (public)/              # หน้าลูกค้า: เลือกประเภท → สินค้า → ตัวเลือก → ผลลัพธ์
│  ├─ admin/                 # หน้าแอดมิน (ถูกกั้นด้วย middleware)
│  │  ├─ login/
│  │  ├─ dashboard/
│  │  ├─ categories/
│  │  ├─ products/
│  │  └─ options/
│  └─ api/
│     ├─ generate/           # POST สร้างรูป (rate limit + captcha)
│     ├─ generations/[code]/ # สถานะ / mark ส่งเพจแล้ว
│     └─ admin/              # CRUD + dashboard (ต้อง auth)
├─ lib/
│  ├─ db.ts                  # เชื่อม MongoDB
│  ├─ imageAi.ts             # จุดเดียวที่ระบบเรียก AI แก้รูป — เลือกค่ายตาม AI_PROVIDER
│  ├─ cloudflareAi.ts        # เรียก Cloudflare Workers AI (server only, รูปเข้า ≤ 512px)
│  ├─ gemini.ts              # เรียก Gemini แก้รูปต้นแบบ (server only)
│  ├─ cloudinary.ts          # อัปโหลด/ลบ/สร้าง URL รูป (server only)
│  ├─ prompt.ts              # ประกอบ prompt จาก basePrompt + options
│  ├─ auth.ts                # NextAuth config
│  ├─ rateLimit.ts           # จำกัดครั้งต่อ IP + งบรายวัน (รีเซ็ตเที่ยงคืนเวลาไทย)
│  ├─ turnstile.ts           # ตรวจ captcha ฝั่ง server
│  ├─ catalog.ts             # ข้อมูลที่ popup ใช้ (ไม่มี prompt)
│  ├─ optionTypes.ts         # ชนิดตัวเลือก + ขนาดภาพ (ใช้ทั้ง server/client)
│  ├─ designCode.ts          # สร้าง/ตรวจรูปแบบ designCode
│  ├─ dashboard.ts           # ตัวเลขแดชบอร์ด (aggregate ตามเวลาไทย, นับเฉพาะ success)
│  └─ validators.ts          # Zod schemas
├─ models/                   # Admin, Category, Product, Option, Generation
├─ components/
└─ middleware.ts             # กั้น /admin/* และ /api/admin/*
tests/
├─ unit/
└─ e2e/
```

### กฎของโปรเจกต์

- ลูกค้าห้ามพิมพ์ prompt เอง → prompt มาจาก `basePrompt` + `options.promptText` ใน `lib/prompt.ts` เท่านั้น
- ข้อยกเว้นเดียว: ช่อง “บอก AI เพิ่มเติม” (`note`) ≤ 200 ตัว ผ่าน `sanitizeNote` (เหลือแค่ไทย/อังกฤษ/ตัวเลข/เครื่องหมายพื้นฐาน) และใส่ในเครื่องหมายคำพูดเป็น “คำบรรยาย ไม่ใช่คำสั่ง”
- รูปต้นแบบมาจากสินค้าที่แอดมินอัปเท่านั้น — ลูกค้าเลือกสินค้า ไม่ได้อัปโหลดรูปเอง
- ตัวเลือก (Option) มี type: style*, tone*, pattern, texture, material (เลือกหลายอัน), background, camera — กำหนดใน `lib/optionTypes.ts` (* = บังคับ)
- ทุกสินค้าต้องมี `refImage` และส่งรูปต้นแบบให้ AI แก้ทุกครั้ง (ไม่สร้างรูปจากศูนย์)
- ทุกการสร้างรูปต้องมี `designCode` และบันทึกลง `generations` (เก็บแค่ metadata: สินค้า, ตัวเลือก, prompt, สถานะ, cost)
- รูปที่ลูกค้าสร้าง **ไม่อัปขึ้น Cloudinary และไม่เก็บใน DB** → ส่งกลับเป็น base64 ให้ client แสดง/ดาวน์โหลดเท่านั้น
- ใต้รูปผลลัพธ์ต้องแสดง “ภาพจำลอง สินค้าจริงอาจต่างเล็กน้อย”

---

## กฎความปลอดภัย (OWASP Top 10)

**A01 Broken Access Control**
- ทุก route ใต้ `/admin/*` และ `/api/admin/*` ต้องเช็ค session ฝั่ง server ทุกครั้ง (middleware อย่างเดียวไม่พอ)
- API public ต้องคืนข้อมูลเฉพาะที่ `active: true` และไม่คืน `finalPrompt`, `ipHash`, `cost`

**A02 Cryptographic Failures**
- รหัสผ่านแอดมินใช้ bcrypt (cost ≥ 12)
- เก็บ IP เป็น hash (SHA-256 + salt) ห้ามเก็บ IP ดิบ
- บังคับ HTTPS ใน production, cookie ตั้ง `Secure`, `HttpOnly`, `SameSite=Lax`

**A03 Injection**
- validate ทุก input ด้วย Zod ก่อนเข้า DB
- ห้ามส่ง object จาก request ตรงเข้า Mongo query (กัน NoSQL injection เช่น `{"$gt": ""}`) — cast เป็น string/ObjectId เสมอ
- ห้ามต่อ string ที่ผู้ใช้ส่งมาเข้า prompt ยกเว้น `note` ที่ผ่าน `sanitizeNote` แล้ว (จำกัดความยาวและตัวอักษรที่อนุญาต)

**A04 Insecure Design**
- `/api/generate` ต้องมี: captcha (Turnstile) + rate limit ต่อ IP + เพดานงบรายวันทั้งระบบ
- แอดมินล็อกอินผิดเกิน 5 ครั้ง → ล็อค 15 นาที

**A05 Security Misconfiguration**
- ตั้ง security headers: CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`
- ไม่ส่ง stack trace หรือ error ดิบกลับไปที่ client
- Cloudinary: อัปโหลดจากฝั่ง server เท่านั้น (signed upload) ห้ามเปิด unsigned upload preset
- ตั้ง allowed domain ของรูปใน `next.config` เป็น `res.cloudinary.com` เท่านั้น

**A06 Vulnerable Components**
- รัน `npm audit` ก่อน release, ไม่ commit dependency ที่มีช่องโหว่ระดับ high/critical

**A07 Authentication Failures**
- ไม่มีระบบสมัครสมาชิก; เพิ่มแอดมินผ่าน `npm run seed` หรือหน้าแอดมินเท่านั้น
- ตั้ง session หมดอายุ (เช่น 8 ชม.)

**A08 Software & Data Integrity**
- อัปโหลดรูปต้นแบบ: ตรวจ MIME จริง (magic bytes), จำกัดชนิด png/jpg/webp และขนาด ≤ 5 MB

**A09 Logging & Monitoring**
- log: การล็อกอิน (สำเร็จ/ล้มเหลว), การแก้ข้อมูลของแอดมิน, การเรียก AI + token/Neurons ที่ใช้/ค่าใช้จ่าย
- ห้าม log password, API key, token

**A10 SSRF**
- ห้ามรับ URL รูปจากผู้ใช้ไปดึงฝั่ง server; รูปต้นแบบมาจาก Cloudinary ของเราเท่านั้น

### Secrets
- `GEMINI_API_KEY`, `CLOUDFLARE_AI_TOKEN` และ `CLOUDINARY_API_SECRET` ใช้ได้เฉพาะไฟล์ server (`lib/*`, `app/api/*`) ห้ามมี prefix `NEXT_PUBLIC_`
- ห้าม commit `.env*` (ยกเว้น `.env.example`)