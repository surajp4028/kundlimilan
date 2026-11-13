# ASTRO — Vedic astrology website

Next.js 16 (App Router) · MySQL / MariaDB (raw SQL, no ORM) · Tailwind v4 + Aceternity-style UI · Razorpay · AstrologyAPI.com · private S3.
Core security layer (OTP auth, sessions, KMS envelope encryption, CSP/CSRF, rate limits, audit, Razorpay verify/webhook/refunds) is ported from SKYO.

## Quick start

```bash
npm install
npm run db:setup     # creates DB `kundlimilan`, all tables, admin, 8 reports, coupon ASTRO10 (safe to re-run)
npm run dev          # http://localhost:3000
```

- Customer login: `/login` (email or mobile → OTP; `OTP_DRY_RUN=true` prints codes in the server console)
- Admin console: `/login?as=agent` → `/admin` (seed admin = `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env.local`)
- All config in `.env.local` (git-ignored); `.env.example` lists every key.

## Keys

| What | Env | Notes |
|---|---|---|
| AstrologyAPI JSON (free tools) | `ASTRO_ACCESS_TOKEN` | wallet access token (`x-astrologyapi-key`), **pay-as-you-go** → cached + daily cap |
| AstrologyAPI PDF (paid reports) | `ASTRO_PDF_USER_ID`, `ASTRO_PDF_API_KEY` | subscription plan, HTTP Basic. Plan currently allows `match_making_pdf`, `pro_horoscope_pdf`, `basic_horoscope_pdf`, `mini_horoscope_pdf` |
| Razorpay | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | test keys now |
| S3 + KMS | `AWS_*`, `KM_S3_PREFIX` | reports at `imoneytest/kundali/<AST ID>/reports/<ORDER>_<slug>.pdf` |
| DB | `DB_*` | XAMPP MariaDB on port 3307, database `kundlimilan` |

To switch to your own AstrologyAPI account later, just replace those three values and restart.

## How a paid report works

```
/reports/<slug>  → birth details (wheel date/time pickers, place search, saved profiles) → review → coupon
POST /api/orders          price from OUR catalogue (+coupon, row-locked) → order ASTR… → Razorpay order
Razorpay Checkout         → POST /api/orders/verify (HMAC on our stored order id + GET /payments/{id})
                          → webhook /api/payments/razorpay/webhook (signed + re-fetched, de-duplicated)
                          → order page polling also re-checks Razorpay if the callback was missed
confirmPayment()          idempotent → generateReport(): AstrologyAPI PDF → download (https/amazonaws only,
                          %PDF check, 40 MB max) → private S3 (SSE-KMS) → reports row → email (Resend)
failures                  auto-retry with back-off (Admin → Settings → Orders), then auto-refund (toggle)
```

Customers download only through `/api/reports/<ref>` after an ownership check. Receipts: `/api/orders/<ref>/invoice`.

**Webhook** (production): Razorpay Dashboard → Webhooks → `https://<domain>/api/payments/razorpay/webhook`,
secret = `RAZORPAY_WEBHOOK_SECRET`, events `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`, `refund.failed`.

**Safety-net cron** (every 10 min): `npm run reconcile` — confirms captured payments and generates missing reports.
One order: `npm run reconcile -- ASTRXXXXXXXXXX`.

## Free tools (AstrologyAPI JSON)

Free Kundli (astro details, planets, D1/D9 charts, current dasha, Manglik) · Kundli Milan (Ashtakoot + Manglik) ·
Rashifal (yesterday / today / tomorrow / week, EN/HI, cached per sign per day) · Panchang (per city per day) · Numerology.
Every identical request is cached (encrypted) for `astro_cache_days`; global daily cap `astro_daily_cap`; per-visitor /
per-user daily runs; kill switch — all in Admin → Settings → Free tools. Usage meter: Admin → API usage.

Place search: built-in list of major Indian cities (instant) + Open-Meteo geocoding (free; shows tehsil / district / state
and the IANA time zone). Historical time-zone offsets are computed locally from the birth date.

## Admin (`/admin`)

Dashboard · Orders (birth input, payment attempts, provider logs, regenerate / resend / re-check Razorpay / refund / cancel) ·
Services (full report catalogue: price, MRP, endpoint, languages, features, status, featured, order) · Coupons ·
API usage · Transactions · Customers · Messages · Staff (granular permissions) · Sessions · Audit · Settings:
**Branding** (name, tagline, colour, logo emblem Ganesh/Simha/Kumbh/monogram or upload, home Ganesh image upload,
contact, social), PDF branding, orders, free tools, site.

## Brand assets (`public/brand`)

`ganesh-mangalmurthy.jpg` (+ crops `ganesh-face.jpg`, `ganesh-painting.jpg`): *Shri Mangalmurti*, Ravi Varma Press, 1900s — **public domain**, from Wikimedia Commons (File:Sri_Mangalmurthy.jpg). Used for the default logo (`logo_mode = painting`) and home hero (`hero_mode = painting`).

`logo-*.svg/png` (emblem + wordmark), `mark-*.svg/png`, `ganesh-color.svg` + `ganesh-color-800/1600.png` (original artwork),
`ganesh.svg` (gold line art). Regenerate emblem files: `node --import tsx scripts/export-brand.mts`.

## Deploy on Vercel (Aiven MySQL)

**Tables create themselves** — no manual SQL:
- Every deploy runs `npm run vercel-build` → `db:migrate` → `next build`. The migration is idempotent: it creates missing
  tables, applies any new `database/migrations/NNN_*.sql` once (tracked in `schema_meta`), and seeds the report catalogue,
  the `ASTRO10` coupon and the first admin (only if missing — admin edits are never overwritten).
- Safety net: the app also checks once per server instance on its first DB call (a single SELECT when up to date).
  Disable with `DB_AUTO_MIGRATE=off`.
- Future schema changes: add `database/migrations/002_something.sql` and deploy.
- Every connection sets one `sql_mode` + UTC, because Aiven defaults to ANSI mode (`ANSI_QUOTES`, `PIPES_AS_CONCAT`, …).

**Vercel → Settings → Environment Variables** (copy values from `.env.local`; database values from Aiven):

| Key | Value |
|---|---|
| `DB_HOST` / `DB_PORT` | `mysql-2b3b0117-surajp4028-2972.a.aivencloud.com` / `21999` |
| `DB_USER` / `DB_PASS` / `DB_NAME` | `avnadmin` / *(Aiven password)* / `kundalimilan` |
| `DB_SSL` / `DB_SSL_CA` | `true` / Aiven "CA certificate" (paste the PEM; recommended — without it TLS is still encrypted but the server certificate isn't verified) |
| `DB_POOL` | `3` (optional; Aiven's free plan has few connections) |
| `APP_HMAC_SECRET`, `APP_LOCAL_DATA_KEY` | **exactly the same as `.env.local`** — they key the blind indexes / local encryption of data already in the DB |
| `AWS_*`, `KM_S3_PREFIX`, `ASTRO_*`, `RAZORPAY_*`, `ZEPTO_*`, `FAST2SMS*`, `RESEND_*` | as in `.env.local` |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | first admin (created only if missing) |
| `APP_URL`, `PUBLIC_BASE_URL` | `https://<your-domain>` |
| `OTP_DRY_RUN` | `false` |

The Aiven database `kundalimilan` is already set up (22 tables, reports, admin) — the first deploy will just report "up to date".

## Still to do before going live

- Replace test Razorpay keys with live keys; add the webhook in the Razorpay dashboard.
- Point `APP_URL` / `PUBLIC_BASE_URL` to the https domain (also lets PDFs use your uploaded logo).
- Set `OTP_DRY_RUN=false` and register ASTRO-branded ZeptoMail / Fast2SMS DLT templates; verify a Resend sending domain.
- Enable Premium Kundli / Varshphal / Numerology / Gemstone in Admin → Services once your AstrologyAPI plan includes them.
- Have Privacy, Terms and Refund policy reviewed by counsel.
