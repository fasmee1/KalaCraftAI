# CLAUDE.md — Coconut Shell AI Designer

เว็บสร้างภาพดีไซน์สินค้ากะลามะพร้าวด้วย AI
- ลูกค้า: ไม่ต้องล็อกอิน (ล็อกอินด้วย Google ได้ถ้าต้องการโควตาต่อวันมากขึ้น) → เลือกสินค้า + ตัวเลือก → AI แก้รูปต้นแบบ (image edit) → ดาวน์โหลด / ส่งรหัสดีไซน์ให้เพจ
- แอดมิน: ล็อกอิน → Dashboard, CRUD ประเภทสินค้า / สินค้า / ตัวเลือก

Stack: Next.js (App Router, TypeScript) · MongoDB (Mongoose) · AI แก้รูปแบบ image-to-image: Cloudflare Workers AI (`flux-2-klein-4b`, ค่าเริ่มต้น, โควตาฟรีรายวัน) หรือ Google Gemini (Nano Banana — `gemini-2.5-flash-image`, เสียเงิน) เลือกด้วย `AI_PROVIDER` · Cloudinary (รูปต้นแบบสินค้า + รูปผลลัพธ์ที่ลูกค้าที่ล็อกอินกดบันทึก) · NextAuth (Credentials สำหรับแอดมิน, Google สำหรับลูกค้า)

---

## การทำงานของระบบ

### ลูกค้า (ไม่บังคับล็อกอิน)

```
หน้าแรก → เลือกประเภท → เลือกสินค้า → เลือกตัวเลือก (สไตล์/ลาย/สี/ข้อความสลัก)
→ ผ่าน Turnstile → กด "สร้างดีไซน์" → รอ (แสดง loading)
→ เห็นรูป + ข้อความ "ภาพจำลอง…" + เตือนให้เก็บรูปก่อนออกจากหน้านี้ (ไม่แสดง designCode บนหน้า — ปุ่ม "ส่งให้เพจ" คัดลอกให้เอง)
→ [บันทึกลงประวัติ] เฉพาะลูกค้าที่ล็อกอิน = อัปรูปขึ้น Cloudinary ผูกกับบัญชี
→ [ดาวน์โหลด]  [ส่งให้เพจ] = คัดลอก designCode + เปิด m.me/<NEXT_PUBLIC_FB_PAGE>
→ ลูกค้าแนบรูปเองในแชท
```

ปุ่มบัญชีบน header (หน้าแรก, หน้าสินค้า) → "เข้าสู่ระบบด้วย Google" → ได้ role `customer` + โควตาต่อวันมากขึ้น (นับต่อบัญชี)
ลูกค้าที่ล็อกอิน → เมนูบัญชี → "ดีไซน์ของฉัน" (`/designs`): แสดงเฉพาะดีไซน์ที่กด "บันทึกลงประวัติ" ตอนสร้างเสร็จ (รูปเก็บบน Cloudinary เห็นได้ทุกเครื่อง, ลบเองได้, เก็บได้ 50 รายการล่าสุด — เกินแล้วรูปของรายการเก่าสุดถูกลบอัตโนมัติ)
ออกจากหน้าผลลัพธ์ (ลิงก์ในหน้า / สร้างใหม่ / ปุ่มย้อนกลับ / ปิดแท็บ) ขณะรูปยังไม่ถูกบันทึกและยังไม่ได้ดาวน์โหลด → popup เตือน (`UnsavedDesignPrompt`; ปิดแท็บ/รีเฟรชเป็นกล่องเตือนของเบราว์เซอร์)
ลูกค้าที่ล็อกอิน → กดหัวใจบนการ์ดสินค้า = เก็บเข้า "รายการโปรด" (`/favorites`, ผูกกับบัญชีใน `customers.favorites`) — ไม่ล็อกอินกดหัวใจแล้วขึ้นชวนเข้าสู่ระบบ
แถบเมนูบน (`SiteNav`) ใช้ในหน้าแรก / สินค้า / รายการโปรด / ดีไซน์ของฉัน
หน้าผลลัพธ์ไม่มีปุ่มล็อกอิน เพราะการเด้งไป Google ทำให้รูปที่เพิ่งสร้างหาย

### `POST /api/generate` (ลำดับการทำงาน)

1. validate body ด้วย Zod (`productId`, `optionIds[]`, `aspectRatio`, `note?`, `turnstileToken`)
2. ตรวจ Turnstile → ไม่ผ่าน = 403
3. ตรวจ rate limit (ล็อกอิน Google = ต่อบัญชี `RATE_LIMIT_PER_DAY_USER`, ไม่ล็อกอิน = ต่อ `ipHash` `RATE_LIMIT_PER_DAY`) และงบรายวันทั้งระบบ → เกิน = 429
4. โหลด product + options จาก DB (ต้อง `active: true`)
5. ประกอบ prompt ใน `lib/prompt.ts` (basePrompt + promptText + `note` ที่ sanitize แล้ว)
6. ดึง `refImage` จาก Cloudinary → ส่งรูป + prompt ให้ AI (`editReferenceImage` ใน `lib/imageAi.ts`)
7. บันทึก `generations` เป็น `pending` ก่อนเรียก AI (metadata เท่านั้น, ไม่มีรูป) + สร้าง `designCode` (`KC-XXXXXX`) แล้วอัปเดตเป็น `success`/`failed` + จด `imageHash` (SHA-256 ของรูป)
8. คืน `{ designCode, imageBase64 }` → **server ยังไม่เก็บรูป** จนกว่าลูกค้าที่ล็อกอินจะกด "บันทึกลงประวัติ"

error จาก AI (รวมถึงถูก safety filter บล็อก หรือโควตาฟรีรายวันหมด) → บันทึก `status: failed`, ไม่นับโควตาลูกค้า, คืนข้อความทั่วไป

### `POST /api/me/generations/[code]/image` (บันทึกลงประวัติ)

ต้องล็อกอินเป็นลูกค้า + ดีไซน์เป็นของบัญชีนั้น → เบราว์เซอร์ส่งรูปกลับมา → รับเฉพาะรูปที่ SHA-256 ตรงกับ `imageHash` (`lib/designImage.ts`) → อัปขึ้น Cloudinary โฟลเดอร์ `designs` แบบ authenticated → เก็บ `savedImage` ใน `generations`
`GET` = ส่งรูปให้เจ้าของบัญชีเท่านั้น (ผ่าน origin ของเรา, `Cache-Control: private`) · `DELETE` = เจ้าของลบรูป

### แอดมิน

```
/admin/login → (ผิดเกิน 5 ครั้ง ล็อค 15 นาที)
→ Dashboard: จำนวนการสร้างวันนี้/เดือนนี้, ค่า API, สินค้า/สไตล์ยอดนิยม, จำนวนกดส่งเพจ
→ ประเภทสินค้า: CRUD, เปิด/ปิด active, เรียงลำดับ
→ สินค้า: CRUD + อัป refImage (signed upload → Cloudinary) + basePrompt
→ ตัวเลือก: CRUD (type, label, promptText)
→ ลูกค้า: รายชื่อลูกค้าที่ล็อกอิน Google (ชื่อ, อีเมล, วันที่สมัคร/เข้าใช้ล่าสุด, จำนวนดีไซน์) + ค้นหา + ระงับ/ปลดระงับ + ลบบัญชี
→ ค้นหา designCode: เห็นสินค้า + ตัวเลือก + prompt + เวลา + ชื่อ/อีเมลลูกค้าถ้าล็อกอิน (ไม่มีรูป)
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
CLOUDFLARE_EDIT_MODEL=@cf/black-forest-labs/flux-2-klein-9b   # ใช้เมื่อลูกค้าพิมพ์ note
GEMINI_API_KEY=
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=               # ล็อกอินลูกค้าด้วย Google — เว้นว่าง = ปิด
GOOGLE_CLIENT_SECRET=           # redirect URI: <NEXTAUTH_URL>/api/auth/callback/google
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=coconut-designs
TURNSTILE_SECRET_KEY=           # dev ใช้ test key: 1x0000000000000000000000000000000AA
NEXT_PUBLIC_TURNSTILE_SITE_KEY= # dev ใช้ test key: 1x00000000000000000000AA
IP_HASH_SALT=                   # salt สำหรับ hash IP
NEXT_PUBLIC_FB_PAGE=         # ชื่อเพจสำหรับลิงก์ m.me
RATE_LIMIT_PER_DAY=2            # ไม่ล็อกอิน (ต่อ IP)
RATE_LIMIT_PER_DAY_USER=10      # ล็อกอิน Google (ต่อบัญชี)
DAILY_BUDGET_USD=10
```

---

## โครงสร้างโปรเจกต์

```
src/
├─ app/
│  ├─ (public)/              # หน้าลูกค้า: เลือกประเภท → สินค้า → ตัวเลือก → ผลลัพธ์
│  ├─ admin/                 # หน้าแอดมิน (ถูกกั้นด้วย proxy.ts)
│  │  ├─ login/
│  │  ├─ dashboard/
│  │  ├─ categories/
│  │  ├─ products/
│  │  ├─ options/
│  │  └─ customers/
│  └─ api/
│     ├─ generate/           # POST สร้างรูป (rate limit + captcha)
│     ├─ generations/[code]/ # สถานะ / mark ส่งเพจแล้ว
│     ├─ me/generations/     # GET ดีไซน์ที่ลูกค้าบันทึกไว้ · [code]/image = บันทึก/ดู/ลบรูปที่บันทึกลงประวัติ
│     ├─ me/favorites/       # GET/POST รายการโปรดของลูกค้าที่ล็อกอิน
│     └─ admin/              # CRUD + dashboard (ต้อง auth)
├─ lib/
│  ├─ db.ts                  # เชื่อม MongoDB
│  ├─ imageAi.ts             # จุดเดียวที่ระบบเรียก AI แก้รูป — เลือกค่ายตาม AI_PROVIDER
│  ├─ cloudflareAi.ts        # เรียก Cloudflare Workers AI (server only, รูปเข้า ≤ 512px)
│  ├─ gemini.ts              # เรียก Gemini แก้รูปต้นแบบ (server only)
│  ├─ cloudinary.ts          # อัปโหลด/ลบ/สร้าง URL รูป (server only)
│  ├─ prompt.ts              # ประกอบ prompt จาก basePrompt + options
│  ├─ auth.ts                # NextAuth config (แอดมิน: Credentials, ลูกค้า: Google) + getAdminSession/getCustomer/getCustomerId
│  ├─ roles.ts               # เช็ค role ของ session (admin | customer)
│  ├─ rateLimit.ts           # จำกัดครั้งต่อบัญชี/IP + งบรายวัน (รีเซ็ตเที่ยงคืนเวลาไทย)
│  ├─ quota.ts               # จำนวนครั้งต่อวัน + เงื่อนไขการนับ (ไม่มี server-only)
│  ├─ turnstile.ts           # ตรวจ captcha ฝั่ง server
│  ├─ csp.ts                 # สร้าง Content-Security-Policy (แหล่งภายนอก: Turnstile, Cloudinary)
│  ├─ catalog.ts             # ข้อมูลที่ popup ใช้ (ไม่มี prompt)
│  ├─ optionTypes.ts         # ชนิดตัวเลือก + ขนาดภาพ (ใช้ทั้ง server/client)
│  ├─ designCode.ts          # สร้าง/ตรวจรูปแบบ designCode
│  ├─ designHistory.ts       # ประวัติดีไซน์: field ที่ลูกค้าเห็นได้ + จำนวนรายการ/ขนาดรูปสูงสุด (ไม่มี server-only)
│  ├─ designImage.ts         # ตรวจว่ารูปที่ลูกค้าส่งมาบันทึกเป็นรูปที่ AI สร้างจริง (เทียบ SHA-256)
│  ├─ savedDesigns.ts        # ลบรูปที่บันทึกไว้เกินจำนวนสูงสุดต่อบัญชี
│  ├─ dashboard.ts           # ตัวเลขแดชบอร์ด (aggregate ตามเวลาไทย, นับเฉพาะ success)
│  └─ validators.ts          # Zod schemas
├─ models/                   # Admin, Customer, Category, Product, Option, Generation
├─ components/
└─ proxy.ts                  # กั้น /admin/* และ /api/admin/* + ตั้ง CSP (nonce ใหม่ทุก request) ให้ทุกหน้า
tests/
├─ unit/
└─ e2e/
```

### กฎของโปรเจกต์

- ลูกค้าห้ามพิมพ์ prompt เอง → prompt มาจาก `basePrompt` + `options.promptText` ใน `lib/prompt.ts` เท่านั้น
- ข้อยกเว้นเดียว: ช่อง “บอก AI เพิ่มเติม” (`note`) ≤ 200 ตัว ผ่าน `sanitizeNote` → แปลเป็นอังกฤษด้วย `lib/noteTranslate.ts` (Qwen3 บน Workers AI, ผลแปลผ่าน `sanitizeNote` ซ้ำ, ล้มเหลวใช้ข้อความเดิม) → ใส่เป็น**บรรทัดแรกของ prompt** ให้ AI ทำตาม
- มี note → ใช้ `CLOUDFLARE_EDIT_MODEL` (klein-9b) เพราะ klein-4b ไม่ทำตามคำขอที่ต้องเปลี่ยนบางส่วนของดีไซน์ (ทดสอบแล้ว) — ใช้โควตาฟรีมากกว่า ~10 เท่า
- prompt ห้ามใส่ชื่อสินค้า (ชื่อไทยอย่าง “ลายดาว” ขัดกับคำขอ) และมีบรรทัด “คงรูปทรงเดิม” แค่บรรทัดเดียว
- รูปต้นแบบมาจากสินค้าที่แอดมินอัปเท่านั้น — ลูกค้าเลือกสินค้า ไม่ได้อัปโหลดรูปเอง
- ตัวเลือก (Option) มี type: style*, tone*, pattern, texture, material (เลือกหลายอัน), background, camera — กำหนดใน `lib/optionTypes.ts` (* = บังคับ)
- ทุกสินค้าต้องมี `refImage` และส่งรูปต้นแบบให้ AI แก้ทุกครั้ง (ไม่สร้างรูปจากศูนย์)
- ทุกการสร้างรูปต้องมี `designCode` และบันทึกลง `generations` (metadata: สินค้า, ตัวเลือก, prompt, สถานะ, cost, `imageHash`)
- รูปที่ลูกค้าสร้าง **ไม่เก็บอัตโนมัติ** → ส่งกลับเป็น base64 ให้ client แสดง/ดาวน์โหลด
  - เก็บบน Cloudinary เฉพาะเมื่อลูกค้าที่ล็อกอินกด "บันทึกลงประวัติ" เอง — ห้ามอัปรูปแทนลูกค้าโดยไม่กด และห้ามรับรูปที่ hash ไม่ตรงกับ `imageHash`
  - รูปที่บันทึกเป็นของส่วนตัว: ดูได้เฉพาะเจ้าของบัญชีผ่าน `/api/me/generations/[code]/image` (ห้ามส่ง publicId/URL ของ Cloudinary ให้ client, ห้ามให้ CDN cache)
- ใต้รูปผลลัพธ์ต้องแสดง “ภาพจำลอง สินค้าจริงอาจต่างเล็กน้อย”
- รองรับ dark mode ผ่าน token สีใน `globals.css` (`data-theme` บน <html>) — ห้ามใช้สีตายตัว:
  การ์ด/กล่องใช้ `bg-surface` (ไม่ใช่ `bg-white`), พื้นหลังใต้ popup ใช้ `bg-scrim/…`,
  ตัวอักษรบนปุ่มทอง (`bg-accent`) ใช้ `text-on-accent`, ตัวอักษรบนพื้นมืดตายตัว (แถบข้างแอดมิน) ใช้ `text-on-dark`

---

## กฎความปลอดภัย (OWASP Top 10)

**A01 Broken Access Control**
- ทุก route ใต้ `/admin/*` และ `/api/admin/*` ต้องเช็ค session ฝั่ง server ทุกครั้งด้วย `getAdminSession()` (proxy อย่างเดียวไม่พอ)
- แอดมินกับลูกค้าใช้ NextAuth ชุดเดียวกัน แยกด้วย `role` ใน JWT — ห้ามเช็คแค่ว่า "มี session" ต้องเช็ค `role === "admin"` เสมอ (ลูกค้าที่ล็อกอิน Google ก็มี session)
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
  - CSP อยู่ใน `lib/csp.ts` + `proxy.ts` (script ต้องมี nonce — ห้ามเพิ่ม `'unsafe-inline'` ให้ script); header ที่เหลืออยู่ใน `next.config.ts`
  - เพิ่มบริการภายนอก (script / iframe / รูป / API ที่เบราว์เซอร์เรียกตรง) ต้องเพิ่มโดเมนใน `lib/csp.ts` ด้วย ไม่งั้นถูกบล็อก
- ไม่ส่ง stack trace หรือ error ดิบกลับไปที่ client
- Cloudinary: อัปโหลดจากฝั่ง server เท่านั้น (signed upload) ห้ามเปิด unsigned upload preset
- ตั้ง allowed domain ของรูปใน `next.config` เป็น `res.cloudinary.com` เท่านั้น

**A06 Vulnerable Components**
- รัน `npm audit` ก่อน release, ไม่ commit dependency ที่มีช่องโหว่ระดับ high/critical

**A07 Authentication Failures**
- แอดมินไม่มีระบบสมัครสมาชิก; เพิ่มแอดมินผ่าน `npm run seed` หรือหน้าแอดมินเท่านั้น — ล็อกอิน Google ได้แค่ role `customer`
- บัญชีลูกค้าที่แอดมินระงับ (`customers.suspendedAt`): ล็อกอินไม่ได้ และ session ที่ค้างอยู่ใช้ `/api/me/*` กับ `/api/generate` ไม่ได้ — route ของลูกค้าต้องเช็คผ่าน `getCustomerId()` / `getCustomer()` เท่านั้น (เช็ค DB ทุกครั้ง) ห้ามอ่าน `customerId` จาก session ตรง ๆ
- ลบบัญชีลูกค้า (แอดมิน): ลบรูปที่บันทึกไว้บน Cloudinary + ข้อมูลบัญชี, `generations` เก็บไว้แต่ตัดการผูกบัญชี
- ลูกค้า Google: รับเฉพาะบัญชีที่ `email_verified`, เก็บแค่ `googleSub` + ชื่อ + อีเมล (ไม่เก็บรูปโปรไฟล์/token ของ Google)
- ตั้ง session หมดอายุ (เช่น 8 ชม.)

**A08 Software & Data Integrity**
- อัปโหลดรูปต้นแบบ: ตรวจ MIME จริง (magic bytes), จำกัดชนิด png/jpg/webp และขนาด ≤ 5 MB

**A09 Logging & Monitoring**
- log: การล็อกอิน (สำเร็จ/ล้มเหลว), การแก้ข้อมูลของแอดมิน, การเรียก AI + token/Neurons ที่ใช้/ค่าใช้จ่าย
- ห้าม log password, API key, token

**A10 SSRF**
- ห้ามรับ URL รูปจากผู้ใช้ไปดึงฝั่ง server; รูปต้นแบบมาจาก Cloudinary ของเราเท่านั้น

### Secrets
- `GEMINI_API_KEY`, `CLOUDFLARE_AI_TOKEN`, `GOOGLE_CLIENT_SECRET` และ `CLOUDINARY_API_SECRET` ใช้ได้เฉพาะไฟล์ server (`lib/*`, `app/api/*`) ห้ามมี prefix `NEXT_PUBLIC_`
- ห้าม commit `.env*` (ยกเว้น `.env.example`)