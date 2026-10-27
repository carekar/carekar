# CAREKAR Website — Build Plan

> **Your Car • Our Care**
> Subscription-based vehicle cleaning for residential societies and homes in Greater Noida West.

**Source of truth:** the written client brief only. The poster image is AI-generated and is used for visual mood (colours, feel) only — no prices, phone numbers, emails or features are taken from it.

**Primary device:** mobile phone. Every screen — public site *and* admin dashboard — is designed for a 360px-wide phone first, then scaled up to tablet/desktop.

---

## 1. Goals

1. Turn phone visitors (mostly from WhatsApp shares, society groups, QR codes and Meta/Google ads) into booked leads in under 60 seconds.
2. Give the Carekar team one place to see and manage every lead, payment and subscription.
3. Collect payments through Razorpay only after service availability is confirmed.
4. Show exactly where visitors drop off in the funnel.
5. Let the team change plans, prices, service areas and contact details without a developer.
6. Run at ₹0/month hosting at launch (only the domain is paid).

---

## 2. Business Content (from client brief)

### Brand
| Item | Value |
|---|---|
| Brand name | CAREKAR |
| Tagline | Your Car • Our Care |
| Logo | Existing Carekar logo (client to send SVG/PNG, high-res) |
| Colours | Dark Green, Light Green, Cream, Yellow |
| Feel | Modern, premium, clean, trustworthy |

### Service
- 26 scheduled exterior cleaning visits per month
- Weekly interior cleaning for cars
- Monthly subscription plans
- Service updates through WhatsApp

### Plans & pricing (editable from admin)
| Vehicle | Price |
|---|---|
| Hatchback | ₹599/month |
| Sedan | ₹699/month |
| SUV / MUV | ₹799/month |
| Luxury | ₹999/month |
| Bike / Scooty | ₹249/month |

> Note: weekly interior cleaning applies to cars. Bike/Scooty plan inclusions to be confirmed by client (see §19).

**One-time car cleaning: ₹249** (interior + exterior, single visit, same price for every car type, not offered for bikes). Price and visibility are editable in admin Settings. It's stored on the booking as `service = one_time` and excluded from MRR and renewals. Shown as a card below the monthly plans, as a "Monthly plan / One-time clean" switch on step 1 of the booking form (`/book?service=one_time`), and in the FAQ and structured data.

### Copy
- **Headline:** Your Car. Our Care.
- **Subheadline:** Premium, hassle-free vehicle cleaning at your doorstep. Enjoy a cleaner vehicle without the daily effort.
- **Why Choose Carekar?**
  - Convenient monthly subscriptions
  - Regular scheduled cleaning
  - Weekly interior cleaning for cars
  - Trained and verified cleaning staff
  - Easy WhatsApp communication
  - Designed for residential societies and apartments
- **How It Works:** Choose Your Plan → Submit Your Details → Confirm Availability → Start Your Subscription
- **Service area:** Launching in Greater Noida West
- **CTA:** Book Your Cleaning Plan Today!

### Contact (editable from admin until final confirmation)
- Phone: 9205622238
- WhatsApp: 9205622238
- Email: *to be created* (field hidden on site until set)

---

## 3. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | **Next.js (App Router) + TypeScript** | Static pages for SEO and speed (public site), server-rendered admin screens |
| Styling | **Tailwind CSS** | Mobile-first utilities by default, tiny CSS output |
| Backend API | **Node.js 22+ / Express 5 + TypeScript** (`server/`) | Separate backend that owns all business logic: bookings, tracking, admin actions, alerts, and later Razorpay |
| ORM | **Prisma 7** (`@prisma/adapter-pg`) | Typed queries, schema in one file, versioned migrations, Prisma Studio for browsing data |
| Database | **Supabase Postgres** (free tier, Mumbai region) | Leads, payments, events, settings, admin roles |
| Admin auth | **Supabase Auth** (email + password) | Free and secure. The API verifies each login token and checks the role in `admin_users` |
| Customer login | **Firebase Auth: Google sign-in** | Free, one tap, no password. Required to confirm a booking. The API verifies the ID token with Google's public keys |
| Payments | **Razorpay** (Subscriptions + Payment Links + Webhooks) | Indian UPI/cards/netbanking, auto-debit support |
| Hosting (website) | **Netlify free plan** (fallback: Cloudflare Pages) | Commercial use allowed on free tier, HTTPS, CDN |
| Hosting (API) | **Render free web service**, Singapore region (closest to Mumbai DB) | Free Node hosting; kept awake by a 10-minute ping. Upgrade path: Render Starter (~$7/month, always on) |
| Analytics | Own event table (funnel) + **Microsoft Clarity** (free heatmaps/recordings) | Funnel data we own + visual behaviour insight |
| Email alerts | **Resend** free tier | New-lead email to team |
| Instant alerts (optional) | Telegram bot (sent by the API) | Free, instant push on team phones |

**Not using:** Vercel Hobby (free plan forbids commercial use), heavy UI libraries, carousels/sliders libraries, large animation libraries.

### 3.1 Architecture

```
Customer's phone ──► Next.js website (Netlify)
                       │  /api/*  is forwarded (rewrite) to the API — same domain, no CORS
                       │  admin pages call the API server-side with the team member's login token
                       ▼
                  Express API (Render)  ──Prisma──►  Supabase Postgres
                       │                            (RLS on, no policies: the public
                       ├─► Telegram (new-lead alerts)   anon key can read nothing)
                       └─► Supabase Auth (verify admin tokens)
```

- **Website** has no database access and no secret keys. It only knows `API_URL` and the public Supabase Auth keys for the login screen.
- **API** is the only thing that talks to the database. Every admin endpoint checks the login token and role on every request; staff never receive payment data.
- Shared code (plans, prices, form validation, data types in `lib/`) is used by both, so the site and API can't disagree on prices or form rules.
- **Laptop preview:** without `DATABASE_URL` the API stores data in `server/data/db.json`; without Supabase Auth keys the admin uses a preview password.
- If the API is unreachable, public pages still render with default prices/contact, and the booking form shows a WhatsApp/call fallback.

### Monthly cost at launch
| Item | Cost |
|---|---|
| Hosting (website + API), DB, auth, analytics, email | ₹0 |
| Optional: always-on API (Render Starter) once traffic grows | ~₹600/month |
| Domain (.in / .com) | ~₹800–1,200 / year |
| Razorpay | ~2% per successful transaction, no fixed fee |
| WhatsApp Business API (optional, later) | ~₹1,000–2,500/month + per-message fees |

---

## 4. Mobile-First Design Rules (strict)

These rules apply to every page, including admin.

### Layout
- Design base width: **360px**. Test at 320px (small Android), 375/390px (iPhone), 412px (large Android).
- Single column on phones. Multi-column only from `md` (768px) upward.
- Side padding 16px; no horizontal scrolling anywhere (except intentional scroll-snap rows).
- Respect iPhone notch / home bar with `env(safe-area-inset-*)`.
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` — zoom never disabled.

### Touch & thumb zone
- Minimum tap target **48×48px**, minimum 8px gap between targets.
- Primary actions sit in the bottom third of the screen (thumb reach).
- **Sticky bottom action bar** on all public pages: `[ WhatsApp ]  [ Book Now ]` — always visible, hides while the keyboard is open.
- No hover-only interactions; everything works by tap.
- Phone numbers are `tel:` links, WhatsApp buttons are `https://wa.me/91XXXXXXXXXX?text=...` links with prefilled message.

### Typography (sizes — font families in §4.1)
- Body text 16px minimum, line-height 1.5.
- Form inputs **16px minimum** (prevents iOS auto-zoom on focus).
- Headline ~34–40px on phone, scales up on desktop via `clamp()`.
- Prices use tabular numerals so ₹599 / ₹699 / ₹999 line up across cards.

### Forms on phones
- One question group per screen (multi-step), large tappable option cards instead of dropdowns.
- Correct keyboards: `inputmode="numeric"` + `type="tel"` for mobile, `autocomplete="name"`, `autocomplete="tel"`, etc.
- Native date picker (`type="date"`) — no custom calendar library.
- Inline validation on blur, error text under the field, never only colour.
- Progress bar at top: "Step 2 of 4".
- Form progress saved in `localStorage` so a user who switches to WhatsApp and returns doesn't lose data.
- "Next" button is full-width, fixed above the keyboard area.

### Performance budget (on mid-range Android over 4G)
| Metric | Target |
|---|---|
| Lighthouse mobile performance | ≥ 90 |
| Largest Contentful Paint | < 2.5s |
| Cumulative Layout Shift | < 0.1 |
| Interaction to Next Paint | < 200ms |
| JS on homepage (gzipped) | < 120 KB |
| Hero image | < 120 KB (AVIF/WebP, responsive sizes) |

- Images via `next/image` with explicit width/height, lazy-loaded below the fold.
- Icons as inline SVG (no icon font).
- Third-party scripts (Clarity, Razorpay checkout) loaded `afterInteractive` / only on pages that need them.

### Accessibility
- Colour contrast ≥ 4.5:1 (dark green on cream passes; yellow used only as highlight/background, never for small text on cream).
- All icons have labels; form fields have visible labels (not placeholder-only).
- Works with system font scaling up to 200% without breaking layout.

---

## 4.1 Visual Identity — Colours, Fonts, Imagery

Goal: **modern, premium, clean, trustworthy** (brief). It should feel like a well-run service company, not a cheap flyer: generous whitespace, calm colours, real-looking people, no clutter.

### Colour scheme (from brief: Dark Green, Light Green, Cream, Yellow)
| Role | Token | Value | Used for |
|---|---|---|---|
| **Dark Green** — primary | `--green-900` | `#0A3D24` | Headings, footer, sticky bar, admin top bar |
| Dark Green — action | `--green-700` | `#0F5C36` | Primary buttons, links, active states |
| **Light Green** — accent | `--green-400` | `#7CC47F` | Icons, checkmarks, progress bar, success states |
| Light Green — tint | `--green-100` | `#E3F2E1` | Feature tiles, selected vehicle card, chips |
| **Cream** — background | `--cream-50` | `#FBF7EC` | Page background |
| Cream — surface | `--cream-200` | `#F2EAD6` | Section bands, input backgrounds, dividers |
| **Yellow** — highlight | `--yellow-400` | `#F6C343` | "Launching in Greater Noida West" badge, "Most popular" tag, highlight underline |
| Yellow — hover/pressed | `--yellow-500` | `#E5AE1F` | Pressed state of yellow elements |
| Ink | `--ink-900` | `#14251B` | Body text |
| Muted ink | `--ink-600` | `#4B5D52` | Secondary text |
| Card | `--white` | `#FFFFFF` | Plan cards, form cards (on cream background) |
| Error | `--red-600` | `#C2410C` | Form errors only |

**Colour rules**
- Ratio roughly 60% cream / 25% dark green / 10% light green / 5% yellow — yellow is a spark, never a large background.
- Primary button: dark green (`--green-700`) with white text. One yellow accent CTA is allowed per screen max (e.g. the hero "Book Now").
- Never place yellow or light-green **text** on cream (fails contrast). Text on yellow is always `--green-900`.
- Values are starting points; final shades are sampled from the actual logo file once received.
- Admin dashboard uses the same palette, with white surfaces and green-900 top bar, plus a separate neutral chart palette (§10) so funnel steps stay distinguishable.

### Fonts (modern, new-age, free, self-hosted)
| Role | Font | Why |
|---|---|---|
| Headings, prices, big numbers | **Bricolage Grotesque** (600–800) | Contemporary grotesque with character — feels new and premium, not generic |
| Body, forms, buttons, admin UI | **Plus Jakarta Sans** (400, 500, 600) | Clean geometric sans, highly readable on small screens, great numerals |

- Loaded with `next/font/google` (self-hosted at build, no Google request at runtime), Latin subset only, `display: swap`, only the weights listed → ~60–80 KB total.
- Fallback stack: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` with size-adjust to avoid layout shift.
- Headings use slightly tight letter-spacing (-0.02em); body stays default.
- Alternative pair if client prefers a softer look: **Sora** (headings) + **Manrope** (body).

### Imagery (display / placeholder images)
Images are used to help the client and customers *understand* the service; they are clearly placeholders until Carekar has real photos.

| Spot | Image | Notes |
|---|---|---|
| Hero | Uniformed cleaner wiping a car in a society parking / under an apartment tower, morning light | Main trust image; person looks professional (cap, polo, gloves, microfiber) |
| Vehicle picker & plan cards | Clean side-profile cut-outs: hatchback, sedan, SUV, luxury sedan, scooter | Same angle, same lighting, transparent background (PNG/WebP) for consistency |
| What you get / How it works | Close-ups: microfiber cloth on bonnet, interior vacuum, WhatsApp update on phone, calendar | Small, cropped square images or icon + photo combo |
| Why Choose Carekar | Team photo (2–3 staff in uniform), eco-friendly products | Builds "trained & verified staff" credibility |
| Service area | Greater Noida West society skyline / apartment towers | Local feel |
| Thank-you page | Friendly staff giving a thumbs-up next to clean car | Positive closure |
| WhatsApp/OG share image | Logo + tagline + car + "Plans from ₹249/month" on dark green | Shown when links are shared in society groups |

**Image sourcing & rules**
- Source: free-licence stock (Unsplash / Pexels) or AI-generated, chosen to look Indian-context (Indian society parking, Indian car models, Indian staff). Licences noted in a `public/images/CREDITS.md`.
- No fake brand logos on vehicles; no Carekar logo on stock people's uniforms unless the photo is real (avoid misleading).
- One consistent treatment: natural warm daylight, slight cream/green grade, rounded corners (16–20px), soft shadow.
- Every placeholder is listed in a swap-list so real Carekar photos (staff, actual societies) can replace them later — real photos are the single biggest trust upgrade.
- Performance: AVIF/WebP, responsive `srcset`, hero ≤ 120 KB on phone, everything below the fold lazy-loaded, blur-up placeholders.

### Professional & trustworthy — design checklist
- **Transparent pricing** everywhere: price + "/month" + what's included + "No hidden charges".
- **Trust strip** under hero: ✓ Trained & verified staff · ✓ Pay after availability is confirmed · ✓ WhatsApp support · ✓ Cancel anytime (if policy allows).
- **Clear "what happens next"** at every step of the booking — no surprises.
- Real contact visible: tap-to-call number, WhatsApp, area; legal pages linked in footer.
- Consistent iconography (one outline icon set, e.g. Lucide/Phosphor, inline SVG, 1.75px stroke).
- Calm motion only: subtle fade/slide on scroll (CSS only, respects `prefers-reduced-motion`), no auto-playing carousels or popups.
- Copy tone: polite, simple English; short sentences; no exaggerated claims.
- Testimonials section (phase 2) only with real customer names/societies after launch — never fabricated.
- Secure payment badge ("Payments secured by Razorpay") on payment page only.

---

## 5. Sitemap

### Public
| URL | Purpose |
|---|---|
| `/` | Homepage (single long page with all sections) |
| `/book` | Multi-step booking / lead form (also reachable with `?vehicle=sedan`) |
| `/book/thank-you` | Confirmation + WhatsApp button |
| `/pay/[token]` | Payment page for confirmed leads (optional; Razorpay link may be used instead) |
| `/privacy-policy` | Required (brief + Razorpay) |
| `/terms` | Required (brief + Razorpay) |
| `/refund-cancellation` | Required by Razorpay |
| `/contact` | Required by Razorpay |
| `/car-cleaning-greater-noida-west` | Local SEO landing page (optional, phase 2) |

### Admin (login required)
| URL | Purpose |
|---|---|
| `/admin/login` | Login |
| `/admin` | Overview dashboard |
| `/admin/leads` | Lead list |
| `/admin/leads/[id]` | Lead detail & actions |
| `/admin/payments` | Payments & subscriptions |
| `/admin/funnel` | Funnel & drop-off analytics |
| `/admin/societies` | Society / service-area management |
| `/admin/settings` | Plans, prices, contact details, team users |

---

## 6. Homepage — Section by Section (phone layout)

Order is designed for a scrolling thumb; a Book/WhatsApp action is never more than one swipe away.

1. **Top bar** (56px, sticky): logo left, `Call` icon button right. No hamburger menu needed — single-page site; footer holds links.
2. **Hero**
   - Headline: *Your Car. Our Care.*
   - Subheadline (brief text)
   - Yellow badge: "Launching in Greater Noida West"
   - Primary CTA: **Book Now** (→ `/book`), secondary: **Chat on WhatsApp**
   - Hero image: compressed real/stock photo of car cleaning in a society (client to supply real photo later).
3. **What you get** — 4 compact icon tiles in a 2×2 grid:
   26 exterior visits/month · Weekly interior (cars) · Monthly subscription · WhatsApp updates
4. **Choose your vehicle** (the main funnel entry)
   - 5 vehicle chips in a horizontal scroll-snap row: Hatchback · Sedan · SUV/MUV · Luxury · Bike/Scooty
   - Selecting a chip shows that plan's card below (price, inclusions, **Book this plan** button).
   - Below: "See all plans" expands a stacked list of all 5 pricing cards (each a separate card per brief, each with its own CTA).
   - Tapping any CTA opens `/book?vehicle=<type>` with vehicle + plan pre-filled (skips step 1).
5. **Why Choose Carekar?** — 6 points from brief, 2-column icon grid on phone.
6. **How It Works** — vertical 4-step timeline on phone (horizontal on desktop):
   Choose Your Plan → Submit Your Details → Confirm Availability → Start Your Subscription
7. **Service area** — "Launching in Greater Noida West" + list of currently serviced societies (from admin) + "Don't see your society? Request it" → lead form. Optional lightweight map: static map image linking to Google Maps (no heavy embed on load).
8. **FAQ** (accordion, native `<details>`): timing of cleaning, what's included, water usage, what if I'm not home, cancellation, payment methods, staff verification.
9. **Final CTA band** — "Book Your Cleaning Plan Today!" + Book Now + WhatsApp + tap-to-call.
10. **Footer** — logo, tagline, contact, area, legal links, © year.
11. **Sticky bottom bar** (always): `[ WhatsApp ]  [ Book Now ]`.

---

## 7. Booking Funnel & Lead Form (`/book`)

### Funnel (from brief)
1. Customer visits website
2. Selects vehicle type
3. Views applicable monthly plan and price
4. Fills lead/booking form
5. Receives confirmation via WhatsApp or phone
6. Carekar team confirms service availability in the society
7. Subscription activated after confirmation and payment

### Form steps (one screen each on phone)

**Step 1 — Vehicle & Plan**
- Vehicle Type * — large tappable cards with price: Hatchback / Sedan / SUV-MUV / Luxury / Bike-Scooty
- Selected Subscription Plan * — auto-set from vehicle, shown as a summary card with price and inclusions
- Vehicle Model (optional) — text, e.g. "Hyundai i20"
- Number of vehicles (optional, default 1) — stepper (+/–)

**Step 2 — Your Details**
- Customer Name * — `autocomplete="name"`
- Mobile Number * — 10 digits, Indian format, `type="tel" inputmode="numeric"`, validates `^[6-9]\d{9}$`
- Checkbox (pre-ticked, editable): "Same number on WhatsApp" — else show WhatsApp number field

**Step 3 — Location**
- Society/Apartment Name * — type-ahead from admin's society list + free text allowed ("Other")
- Tower/Block and Flat Number (optional)
- Locality/Area * — default "Greater Noida West", editable (e.g. sector)
- Parking type (optional) — chips: Basement / Stilt / Open / Street
- Parking slot number (optional)

**Step 4 — Schedule & Extras**
- Preferred Start Date * — native date picker, min = tomorrow
- Preferred cleaning time (optional) — chips: Early morning (5–7) / Morning (7–9) / No preference
- Additional Requirements (our recommendations, all optional):
  - Vehicle colour
  - Vehicle registration number (helps staff identify vehicle in parking)
  - How did you hear about us? — Society WhatsApp group / Friend / Poster / Instagram / Google / Other
  - Notes (textarea, 300 chars)
- Consent checkbox *: "I agree to be contacted on WhatsApp/phone about my booking" + link to Privacy Policy & Terms

**Review & Submit**
- Summary card with **Edit** links per step
- Two buttons: **Book Now** (primary) and **Get a Callback** (secondary — same lead, tagged `callback_requested`)
- **Google login is required to Book Now** (see below). Until the customer logs in, the primary button reads **Continue with Google to book**; after a successful login the booking is submitted straight away, with no extra tap.

### Customer login (Google, Firebase Auth)
- **Where:** the Review & confirm step (the step right before payment once Razorpay is live), a **Login** button in the site header, and a `/login` page (`?next=` returns the customer to where they were; not indexed).
- **Method:** "Continue with Google" only (free, no SMS cost). It opens as a popup, with a full-page redirect if the browser blocks popups.
- **Why:** each booking is tied to a real account, which is the base for the later customer area (view subscription, pause, renew) and the payment step.
- **In-app browsers:** Google blocks login inside WhatsApp / Instagram / Facebook browsers, and many visitors come from society WhatsApp groups. On those, the page explains this and offers **Open in Chrome** (Android) or **Copy link**. **Get a Callback** still works without login, so these visitors are never stuck.
- **Server check:** the website sends the Firebase ID token with the booking. The Express API verifies it against Google's public keys (no Firebase secret on the server) and rejects a Book Now without a valid login (`401`). Callback requests are accepted without login.
- **Stored on the lead:** `customer_uid`, `customer_email`, `customer_name`. The admin lead page shows the Google account, and the CSV export includes the email.
- **Performance:** the Firebase SDK loads only on `/login` and on the Review step. The header button reads a small local copy of the name, so the homepage stays light.
- **Firebase console setup:** enable the Google provider, and add every website domain (e.g. `carekar.in`, the Netlify URL) under Authentication → Settings → Authorized domains.

### My bookings (`/account`)
- Opened from the header (shows "Hi, {name}" once logged in), the login page, and the thank-you page ("View my bookings"). Logged-out visitors see the Google login panel in place.
- **Running subscriptions:** monthly plans with status Active, showing plan, monthly price, start date, next renewal (30 days after the last successful payment), location, and a WhatsApp link to pause, change or cancel.
- **All bookings:** every booking made while logged in, newest first: service, ref, booked date, price (per month or one-time), start/cleaning date, location, payments, and a customer-friendly status ("Request received", "Available in your society", "Payment pending", "Active" / "Confirmed" for one-time, "Not available yet", etc.).
- **Privacy:** `GET /api/me/bookings` verifies the Firebase ID token and returns only bookings with that Google account's `customer_uid`. Team notes, lost reasons and tracking data are never sent.
- Bookings made without logging in (callback requests, or bookings from before login was added) don't appear; the page says so and links to WhatsApp.
- Later: pause / renew / pay online from this page once Razorpay is live.

### After submit (`/book/thank-you`)
- "Thanks, {name}! We'll confirm availability in {society} within X hours."
- Lead reference ID (e.g. `CK-1042`)
- Button: **Message us on WhatsApp** (prefilled: "Hi Carekar, I just booked — Ref CK-1042, {vehicle}, {society}")
- What happens next (3 steps: availability check → payment link on WhatsApp → service starts)

### Anti-spam & reliability
- Honeypot hidden field + server-side rate limit (per IP & per mobile number).
- Cloudflare Turnstile (free, invisible) only if spam appears — avoids friction by default.
- Duplicate check: same mobile + vehicle within 24h → update existing lead instead of creating new one.
- Server-side validation with Zod (same schema used in the browser).

---

## 8. Payments — Razorpay

### Flow (payment only after availability confirmed)
```
Lead submitted ─► Team confirms society is serviceable (admin)
                ─► Admin taps "Send payment link"
                ─► Server creates Razorpay Subscription (or Payment Link)
                ─► Link sent to customer on WhatsApp (one-tap from admin)
                ─► Customer pays (UPI / card / netbanking / UPI Autopay)
                ─► Razorpay webhook ─► server verifies signature
                ─► Lead → ACTIVE, payment recorded, team notified
```

### Two payment modes (configurable per lead)
1. **Auto-debit Subscription** (recommended) — Razorpay Subscriptions API; one Razorpay *Plan* per vehicle type (amount synced from admin settings). Monthly renewal charged automatically via UPI Autopay / card / eMandate.
2. **Monthly Payment Link** — one-time link each month for customers who don't want auto-debit. Admin sees "renewal due" list and sends links.

### Implementation
- Express API endpoints (in `server/`):
  - `POST /api/admin/leads/:id/payment-link` — creates subscription/link (admin-only)
  - `POST /api/webhooks/razorpay` — called by Razorpay directly on the API's URL (raw body kept for signature check); handles `payment.captured`, `payment.failed`, `subscription.activated`, `subscription.charged`, `subscription.halted`, `subscription.cancelled`, `payment_link.paid`
- Verify `X-Razorpay-Signature` with webhook secret on every webhook; store raw payload; make handler idempotent (unique on Razorpay event/payment ID).
- `RAZORPAY_KEY_SECRET` and webhook secret only in server env vars; never sent to the browser.
- Payment status is only ever set by verified webhooks, never by a client redirect.
- Use **Test Mode** keys during development; switch to live after KYC.

### Razorpay account activation checklist (client side)
- PAN, bank account, business proof (GST or Udyam registration recommended)
- Live website showing: pricing, Privacy Policy, Terms, Refund & Cancellation, Contact Us
- Enable Subscriptions + UPI Autopay on dashboard

---

## 9. Admin Dashboard

Built mobile-first too — the team will check it on their phones in society parking lots.

### Phone-specific admin rules
- Tables become **stacked cards** on phones (name, society, vehicle, status, time) with swipe-free tap actions.
- Every lead card has one-tap **Call**, **WhatsApp**, and **Change status** buttons.
- Bottom tab bar on phone: Overview · Leads · Payments · Funnel · More.
- Filters in a bottom sheet, not a sidebar.

### Overview (`/admin`)
- Today / 7 days / 30 days toggle
- KPI tiles: New leads · Awaiting availability check · Payment links pending · Active subscriptions · Monthly recurring revenue (MRR) · Conversion rate (visit → paid)
- "Needs action" list: new leads > 2 hours old, failed payments, renewals due in 3 days
- Small charts: leads per day, revenue per month

### Leads (`/admin/leads`)
- Search by name, mobile, society, ref ID
- Filters: status, vehicle type, society, date range, source (UTM), callback requested
- Status pipeline:
  `New → Contacted → Availability Confirmed → Payment Link Sent → Active`
  side statuses: `Not Serviceable`, `Paused`, `Cancelled`, `Lost` (with reason)
- Bulk: export CSV, change status
- Lead detail page: all form data, status history (who changed what, when), notes, payment history, quick actions (Call, WhatsApp with templates, Send payment link, Mark not serviceable)

### WhatsApp quick templates (prefilled `wa.me` messages, editable in settings)
- Booking received / availability being checked
- Availability confirmed + payment link
- Not serviceable yet (we'll notify you when we launch in your society)
- Payment received / service starting on {date}
- Renewal reminder

### Payments (`/admin/payments`)
- All transactions: amount, method, status, date, linked lead
- Active subscriptions with next charge date
- Failed / halted subscriptions (needs follow-up)
- Renewals due this week (for payment-link customers)
- Totals: collected this month, MRR, by vehicle type

### Funnel (`/admin/funnel`)
Detailed funnel analytics — full spec in §10. Summary of screens:
- **Funnel overview** — full journey from visit to paid, count + conversion % + drop % per step
- **Website funnel**, **Form funnel (field level)**, **Sales/operations funnel** as separate tabs
- **Breakdowns** — source/campaign, device & browser, vehicle, society, landing page, day/hour
- **Trends** — conversion over time, compare two date ranges
- **Time-to-convert** — how long each step takes
- **Abandoned bookings** — partial forms for recovery (consent-based)
- **Session journeys** — step-by-step timeline of any visitor/lead
- **Alerts** — automatic warnings when a step's conversion drops

### Societies (`/admin/societies`)
- Add/edit societies: name, locality, status (Serviceable / Coming soon / Not serviceable)
- Leads and active customers per society → shows where demand is building
- Serviceable list feeds the homepage "Service area" section and form type-ahead

### Settings (`/admin/settings`)
- **Plans:** name, vehicle type, price, inclusions, active/hidden, display order (changes reflect on site immediately; Razorpay plan auto-created for new price)
- **Contact:** phone, WhatsApp number, email, address line
- **Content:** service area text, launch badge text, FAQ items
- **Team users:** invite/remove admins; roles: Owner (everything) / Staff (leads only, no revenue)

---

## 10. Funnel Tracking (detailed)

The admin must answer, at any time: **How many people came, where did they come from, where exactly did they leave, why, and how many became paying customers?** Tracking is built in-house (our own `events` + `sessions` tables) so the data is complete, owned and joinable with leads and payments. Microsoft Clarity adds heatmaps/recordings on top.

### 10.1 Identity & attribution
- **Visitor ID** — anonymous first-party cookie/localStorage ID (1 year); identifies returning visitors on the same phone.
- **Session ID** — new after 30 min inactivity.
- **Lead link** — on form submit the visitor ID is stored on the lead, so the *whole pre-lead journey* (all visits, sources, pages) is attached to that lead; after payment, the same chain continues to revenue.
- **Attribution captured on every session:** `utm_source / medium / campaign / content / term`, referrer, landing page, `gclid` / `fbclid`, plus a derived **channel**: WhatsApp group · Poster QR · Instagram/Facebook ads · Google search · Google ads · Direct · Referral · Other.
- **First-touch and last-touch** source both stored on the lead.
- **QR / link builder** in admin: generate tagged links and QR codes per society/poster/campaign (e.g. `?utm_source=poster&utm_campaign=gaur-city-2&utm_content=lift-lobby`) so offline posters are measurable.
- **Device info:** device type, OS, browser, **in-app browser detection** (WhatsApp, Instagram, Facebook), screen width, connection type (where available).

### 10.2 Funnel definitions

**A. Full business funnel (headline view)**
| Step | Event | Source |
|---|---|---|
| 1 | Visited site | `session_start` |
| 2 | Engaged (scrolled ≥ 50% or interacted) | `engaged` |
| 3 | Selected vehicle | `vehicle_selected` |
| 4 | Viewed plan & price | `plan_viewed` |
| 5 | Clicked Book / opened form | `book_clicked` / `form_opened` |
| 6 | Started form (first field filled) | `form_started` |
| 7 | Submitted lead | `lead_submitted` |
| 8 | Contacted by team | lead status `contacted` |
| 9 | Availability confirmed | lead status `availability_confirmed` |
| 10 | Payment link sent | `payment_link_sent` |
| 11 | Payment link opened | Razorpay link/checkout opened |
| 12 | Paid / subscription active | verified webhook |
| 13 | Renewed (month 2, 3…) | `subscription.charged` webhook |

**B. Website funnel** — steps 1–7 only, for marketing/website optimisation.

**C. Booking form funnel (step + field level)**
- Per step: viewed → completed → time spent → back-button presses.
- Per field: focused → filled → **validation errors** (e.g. invalid mobile number count) → last field before abandonment.
- Answers distribution: vehicle type split, preferred time split, parking type split, "how did you hear" split.

**D. Sales / operations funnel** — steps 7–13: how well the team converts leads.
- Response time (lead → first contact), confirmation time, payment time.
- Not-serviceable rate and **lost reasons** (price, society not covered, no response, chose competitor, other).

**E. Contact funnel** — WhatsApp clicks, call clicks, and where on the page they came from (hero, sticky bar, plan card, footer, thank-you).

### 10.3 Event catalogue
| Event | Key properties |
|---|---|
| `session_start` | landing page, utm*, referrer, channel, device, os, browser, in_app, is_returning |
| `page_view` | path, title |
| `scroll_depth` | 25 / 50 / 75 / 100 |
| `section_view` | hero, plans, why_us, how_it_works, service_area, faq, final_cta |
| `engaged` | trigger (scroll / click / 15s on page) |
| `vehicle_selected` | vehicle_type, location (picker / plan_card / form) |
| `plan_viewed` | plan_id, price |
| `all_plans_expanded` | — |
| `book_clicked` | location (hero / plan_card / sticky_bar / final_cta), vehicle_type |
| `form_opened` | prefilled_vehicle (bool) |
| `form_started` | first_field |
| `form_step_viewed` / `form_step_completed` | step (1–4, review), duration_ms |
| `form_field_error` | field, error_type |
| `form_back` | from_step |
| `form_resumed` | restored from saved progress |
| `society_not_listed` | typed society name (demand signal) |
| `callback_requested` | — |
| `login_prompt_viewed` / `login_page_viewed` | location (booking / login_page) |
| `login_started` / `login_completed` / `login_failed` | location, method (google), error code |
| `login_in_app_browser` | location, app (WhatsApp / Instagram / Facebook), shown when Google login is blocked |
| `logout` | location |
| `lead_submitted` | lead_id, vehicle_type, plan_id, society |
| `whatsapp_clicked` / `call_clicked` | location |
| `faq_opened` | question_id |
| `legal_page_viewed` | page |
| `form_abandoned` | last_step, last_field (sent on page hide) |
| Server-side: `lead_status_changed`, `payment_link_sent`, `payment_link_opened`, `payment_success`, `payment_failed`, `subscription_activated`, `subscription_charged`, `subscription_halted`, `subscription_cancelled` | lead_id, amount, method, reason |

- Client events batched and sent with `navigator.sendBeacon` (no impact on page speed); `form_abandoned` fires on `visibilitychange`/`pagehide`.
- Server events written by the Express API in the same request/webhook that changes the data (cannot be blocked by ad blockers).
- Bots filtered (user-agent + no-interaction heuristics); admin users' own visits excluded (flag cookie set on admin login).
- No personal data in event properties except on `lead_submitted` (lead_id only).

### 10.4 Admin funnel dashboard — screens

**1. Funnel overview** (default)
- Date range picker (Today, 7d, 30d, This month, Custom) + **compare to previous period**.
- Horizontal funnel bars (phone-friendly vertical list): count, % of previous step, % of total, **drop-off count in red** between steps.
- Tap any step → list of sessions/leads that **stopped at that step**.
- Headline KPIs: visitors, lead conversion %, paid conversion %, cost per lead / per customer (when monthly ad spend per channel is entered in settings), revenue, average time to pay.

**2. Breakdowns** (filter the funnel by any dimension, or view as table)
- Channel / UTM source / campaign / content (poster location)
- Landing page
- Device type, OS, browser, **in-app browser** (WhatsApp vs Instagram vs Chrome)
- Vehicle type
- Society (from form) — demand and conversion per society
- New vs returning visitors
- Day of week & hour of day heatmap (when people book)

**3. Form analytics**
- Step funnel with average time per step.
- Field table: started / completed / error count / abandonment (field where people left most).
- Top validation errors.
- Prefilled vs not-prefilled form conversion (plan-card CTA vs generic Book button).

**4. Sales & ops funnel**
- Lead → contacted → confirmed → link sent → paid, per team member.
- Median times: first response, confirmation, payment.
- Lost-reason breakdown, not-serviceable societies list (with lead counts → expansion planning).
- Payment funnel: link sent → opened → paid → failed (by method UPI/card/netbanking).

**5. Retention**
- Monthly cohort table: customers who started in month X, % still active in month 2, 3, 6.
- Churn reasons, halted subscriptions, MRR movement (new / churned / renewed).

**6. Abandoned bookings (recovery list)**
- Visitors who entered a mobile number but didn't submit — shown only when the consent/privacy notice covers it (§14). Otherwise only anonymous counts.
- Shows vehicle, step reached, time; one-tap WhatsApp follow-up; mark as recovered.

**7. Session journey viewer**
- Open any lead → timeline of every visit and event before booking (e.g. *"Day 1: WhatsApp group link → viewed SUV plan → left. Day 3: poster QR → submitted form → paid Day 4"*).
- Link to the matching Clarity recording (via Clarity custom tag = visitor ID).

**8. Alerts & reports**
- Automatic alerts (email/Telegram) when: no leads in 24h, form completion drops > 30% vs previous 7 days, payment failures spike, a lead waits > 2h without contact.
- Weekly summary email to owner: visitors, leads, paid, revenue, best channel, biggest drop-off step.

**9. Export**
- CSV export of any funnel view, breakdown or session list.

### 10.5 Implementation notes
- Aggregations via Postgres views / materialised views refreshed every 15 min (free tier friendly); funnel queries ordered per visitor (step must happen after previous step).
- Charts: lightweight library (e.g. Recharts or uPlot) loaded **only in admin**, never on the public site.
- Funnel chart colours: sequential greens for steps, red for drop-offs, yellow for highlights — readable on phone.
- Events table retention: raw events 13 months, aggregates kept indefinitely; old rows archived to keep within Supabase free 500 MB.
- Microsoft Clarity: heatmaps of homepage & form, rage-click / dead-click detection, masked form inputs (no personal data recorded).

---

## 11. Data Model (Supabase Postgres, managed with Prisma)

The schema lives in `server/prisma/schema.prisma`, and migrations in `server/prisma/migrations/`. Column names in the database are snake_case; Prisma maps them to camelCase in code.

### Live tables

| Model → table | Holds | Notes |
|---|---|---|
| `Lead` → `leads` | Every booking request | `ref` = `CK-1001…` from sequence `lead_ref_seq`; `vehicle` and `status` are Postgres enums; price snapshot `plan_price`; status `history` and `team_notes` as JSON; attribution `visitor_id`, `first_touch`, `last_touch`, `device`, `in_app`; Google account `customer_uid`, `customer_email`, `customer_name` (migration 0002); `service` enum `subscription` / `one_time` (migration 0003); `demo` flag |
| `Session` → `sessions` | One website visit | channel, UTM source/medium/campaign/content, landing page, referrer, device/OS/browser, in-app browser, returning visitor |
| `Event` → `events` | Funnel events (page views, plan clicks, form steps, submit, status changes) | `props` JSON; indexed by time, visitor and lead |
| `Payment` → `payments` | Payments per lead | `razorpay_payment_id` unique (idempotent webhooks), `razorpay_subscription_id`; cascades when a lead is deleted |
| `Setting` → `settings` | Admin-editable site settings | key `site`: contact numbers/email, prices, hidden plans, society list |
| `AdminUser` → `admin_users` | Who can log in to /admin | `user_id` = Supabase Auth user id; role enum `owner` / `staff` |

Demo rows (`demo = true`) let the dashboard be previewed and can be cleared from Settings without touching real bookings.

### Planned additions (added as new Prisma migrations when each feature is built)
- `plans` (Razorpay plan id per vehicle type) and `subscriptions` (mode autodebit / payment_link, current period end): Phase 3 payments.
- `societies` with status serviceable / coming_soon / not_serviceable: replaces the plain society list in settings.
- `form_partials` (abandoned bookings, consent-based) and `tracking_links` (QR / campaign link builder history).
- `lead_activity` (who changed what, WhatsApp sent, calls) if the JSON history on the lead outgrows its use.

### Workflow for schema changes
1. Edit `server/prisma/schema.prisma`.
2. Run `npm run db:migrate:dev -- --name what_changed` (in `server/`) to create and apply a migration.
3. Commit the migration. On deploy, `npm run db:migrate` (`prisma migrate deploy`) applies it to Supabase.

**Security:**
- Only the Express API connects to the database (Prisma, as the database owner). The website holds no database credentials.
- Row Level Security is enabled on every table with **no policies**, so Supabase's public anon key and REST API can read or write nothing.
- Admin endpoints verify the Supabase login token and the role in `admin_users` on every request. Staff never receive payment data, and settings, payments and demo data are owner-only.
- The Supabase service-role key is used only by the one-off `admin:create` script on a laptop, never on a server.

---

## 12. Notifications

| Trigger | Who | Channel (launch) | Channel (later) |
|---|---|---|---|
| New lead | Team | Telegram (sent by the API, live now) + email (Resend) | WhatsApp API |
| Lead submitted | Customer | Thank-you page + WhatsApp button | Auto WhatsApp confirmation |
| Payment success | Team + customer | Email to team; admin sends WhatsApp | Auto WhatsApp receipt |
| Payment failed / subscription halted | Team | Email | WhatsApp API |
| Renewal due (link customers) | Team | "Needs action" list in admin | Auto reminder |

---

## 13. SEO (local search)

- Titles/descriptions targeting: "car cleaning Greater Noida West", "daily car wash subscription Greater Noida West", "car cleaning service in society", "bike cleaning Greater Noida West".
- `LocalBusiness` + `Service` + `Offer` JSON-LD (plans with prices), `FAQPage` JSON-LD.
- Open Graph + WhatsApp preview image (1200×630) — important since links get shared in society WhatsApp groups.
- `sitemap.xml`, `robots.txt` (admin disallowed + `noindex`).
- Google Business Profile setup for Carekar (client action) linked to site.
- Fast mobile performance (Core Web Vitals) as ranking factor — see §4 budget.
- Optional phase 2: per-society landing pages (`/societies/<name>`) once there are several serviceable societies.

---

## 14. Legal Pages & Privacy

- **Privacy Policy** — what is collected (name, mobile, address, vehicle), why, retention, WhatsApp contact consent, cookies/analytics (Clarity), Razorpay as payment processor, contact for deletion requests. Aligned with India's DPDP Act 2023.
- **Terms & Conditions** — service scope (26 exterior visits, weekly interior for cars), missed visits policy, customer responsibilities (vehicle access/keys for interior), damage liability limits, subscription terms.
- **Refund & Cancellation** — cancellation notice period, pro-rata or no refund, failed auto-debit handling.
- **Contact** — phone, WhatsApp, email, area.
- Draft templates will be written; **client must review/approve final wording.**
- Partial-lead capture (number entered but not submitted) only if covered in the Privacy Policy; otherwise only aggregate step drop-off is tracked.

---

## 15. Editable Content (no developer needed)

Editable in admin: plans & prices, plan inclusions, plan visibility, serviceable societies, service area text, launch badge, contact phone/WhatsApp/email, FAQ, WhatsApp message templates.

Requires developer: layout/design changes, new pages, new form fields.

Settings are saved through the API into the `settings` table. The website reads them from `GET /api/config`, caches them for 60 seconds, and refreshes them immediately when the owner saves, so the site stays static-fast.

---

## 16. Project Structure

```
carekar/
├─ app/                            # ── Website (Next.js) ──
│  ├─ (site)/
│  │  ├─ page.tsx                  # homepage
│  │  ├─ book/page.tsx             # multi-step form
│  │  ├─ book/thank-you/page.tsx
│  │  ├─ privacy-policy/ terms/ refund-cancellation/ contact/ credits/
│  ├─ admin/
│  │  ├─ login/                    # Supabase Auth sign-in
│  │  ├─ (panel)/ overview, leads, leads/[id], leads/export, payments, funnel, settings
│  │  └─ actions.ts                # form actions → API calls
│  ├─ sitemap.ts  robots.ts  layout.tsx
├─ components/  site/  admin/      # UI only, no data access
├─ lib/
│  ├─ site.ts  config.ts  validation.ts  types.ts   # shared with the API
│  ├─ api.ts                       # server-side fetch to the API (+ login token)
│  ├─ admin.ts  auth.ts            # login session, requireAdmin
│  ├─ settings.ts                  # GET /api/config (cached)
│  ├─ analytics.ts  leads.ts  track.ts
├─ middleware.ts                   # protects /admin
├─ next.config.ts                  # rewrites /api/* → API_URL
├─ public/                         # logo, og image, photos
├─ .env.example                    # website keys
│
└─ server/                         # ── API (Node + Express + Prisma) ──
   ├─ src/
   │  ├─ index.ts  app.ts          # Express app, /health
   │  ├─ routes/public.ts          # GET /api/config, POST /api/events, POST /api/leads
   │  ├─ routes/admin.ts           # /api/admin/* (me, data, status, notes, settings, demo)
   │  ├─ auth.ts                   # verifies Supabase token + role
   │  ├─ repo.ts                   # storage interface → Postgres or local file
   │  ├─ db/ client.ts postgres.ts mappers.ts file.ts
   │  ├─ notify.ts  demo.ts  settings.ts
   │  └─ generated/prisma/         # generated client (not committed)
   ├─ prisma/ schema.prisma  migrations/
   ├─ scripts/ db-import.ts  create-admin.ts
   ├─ data/db.json                 # laptop preview data (not committed)
   └─ .env.example                 # API keys
```

### API endpoints (Express)

| Method & path | Who | Purpose |
|---|---|---|
| `GET /health` | anyone | Uptime / keep-alive check |
| `GET /api/config` | public | Prices, visible plans, contact, societies |
| `POST /api/events` | public (browser beacon) | Funnel tracking events + session attribution |
| `POST /api/leads` | public (booking form) | Validate (zod), price from settings (monthly plan or one-time), Google login required unless callback, dedupe within 24 h (same mobile + vehicle + service), save, Telegram alert. Honeypot + rate limit (8 per IP per 10 min) |
| `GET /api/me/bookings` | logged-in customer (Firebase token) | The customer's own bookings, status and payments for `/account` |
| `GET /api/admin/me` | team | Who is logged in + role |
| `GET /api/admin/data` | team | Leads, sessions, events (last ~6 months), payments (owner only) |
| `POST /api/admin/leads/:id/status` | team | Change pipeline status (+ lost reason) |
| `POST /api/admin/leads/:id/notes` | team | Add a team note |
| `PUT /api/admin/settings` | owner | Save prices, hidden plans, contact, societies |
| `POST /api/admin/demo/clear` · `/restore` | owner | Demo data for previews |
| `POST /api/admin/leads/:id/payment-link` · `POST /api/webhooks/razorpay` | owner · Razorpay | Phase 3 |

### Running locally
- `npm run dev:api` (or `npm run dev` inside `server/`): API on port 4000.
- `npm run dev`: website on port 3000.
- In `server/`: `npm run db:migrate`, `npm run db:import`, `npm run admin:create -- email password owner "Name"`, and `npm run db:studio` to browse data.

### Deployment
| Part | Where | Settings |
|---|---|---|
| Database | Supabase (Mumbai) | Run `npm run db:migrate` from `server/` once per schema change |
| API | Render web service, Singapore | Root directory `server`. Build: `npm ci && npm run build`. Start: `npm start`. Health check: `/health`. Env vars from `server/.env.example` (no service-role key). Node 22+ |
| Keep-alive | cron-job.org (free) | GET `https://<api>/health` every 10 minutes so the free instance doesn't sleep |
| Website | Netlify | Build `npm run build`. Env: `API_URL` = Render URL, Supabase URL + anon key, `SITE_URL`. Node 22+ |
| Razorpay webhook (Phase 3) | Points at the API URL directly | `https://<api>/api/webhooks/razorpay` |

---

## 17. Milestones

| Phase | Scope | Output |
|---|---|---|
| **0. Mockup** (client approval) | Phone-first clickable design of homepage, booking form, thank-you, and 2 admin screens | Shareable mockup link + cost estimate |
| **1. Public site** | Homepage, plans, multi-step form, thank-you, legal pages, SEO basics, WhatsApp/call integration, Express API + Prisma with Supabase Postgres leads storage, Telegram/email alert | Live site collecting leads |
| **2. Admin v1** | Login, leads list/detail, status pipeline, notes, WhatsApp templates, CSV export, settings (plans/contact/societies) | Team can manage leads |
| **3. Payments** | Razorpay plans, subscription + payment link creation, webhook, payments page, MRR | Online payments live (after KYC) |
| **4. Funnel analytics** | Event tracking is wired in from Phase 1 (so no data is lost); this phase builds the dashboards: funnel overview, breakdowns, form field analytics, sales/ops funnel, retention cohorts, abandoned bookings, session journeys, QR/link builder, alerts & weekly email, Clarity | Detailed drop-off visibility |
| **5. Polish & launch** | Real-device testing, performance tuning, Google Business Profile, domain, go-live | Production launch |
| **Later** | WhatsApp Business API automation, per-society SEO pages, self-service on the My bookings page (pause, renew, pay online), staff visit-tracking app | — |

---

## 18. Testing & Launch Checklist

### Devices (real devices, not only emulator)
- Low/mid-range Android (Chrome) at 360px — primary target
- iPhone (Safari) — notch, keyboard, date picker, safe areas
- Android WebView inside WhatsApp / Instagram in-app browsers (links are shared there)
- Slow 4G throttling test

### Functional
- [ ] All 5 plan CTAs prefill correct vehicle/plan
- [ ] Form validation (mobile format, required fields, date ≥ tomorrow)
- [ ] Form resumes after leaving app and coming back
- [ ] Lead appears in admin + email alert received
- [ ] Duplicate submission handling
- [ ] WhatsApp links open app with prefilled text on Android & iOS
- [ ] `tel:` links dial correctly
- [ ] Razorpay test-mode: success, failure, subscription charge, cancellation webhooks
- [ ] Webhook signature rejection for tampered payloads
- [ ] Price change in admin reflects on site & new payment links
- [ ] Staff role cannot see payments
- [ ] Admin pages `noindex` and inaccessible when logged out

### Funnel tracking
- [ ] Every event in §10.3 fires once (no duplicates) on Android Chrome, iPhone Safari and WhatsApp in-app browser
- [ ] UTM / QR links attribute correctly to the lead (first & last touch)
- [ ] `form_abandoned` fires when the app is switched or tab closed
- [ ] Server events recorded for status changes and webhooks
- [ ] Admin visits excluded; bots filtered
- [ ] Funnel numbers match raw lead/payment counts for a test day

### Quality
- [ ] Lighthouse mobile ≥ 90 on homepage and `/book`
- [ ] No horizontal scroll at 320px
- [ ] Inputs don't trigger iOS zoom
- [ ] Contrast & labels pass accessibility check
- [ ] OG preview correct when link pasted in WhatsApp

---

## 19. Open Questions for Client

1. **Logo files** — high-res SVG/PNG of the existing Carekar logo.
2. **Email** — which address to use once created (hidden on site until then).
3. **Bike/Scooty plan inclusions** — 26 exterior visits? Any interior/seat cleaning?
4. **Luxury plan** — which vehicles qualify as "Luxury" (brand list or price band)?
5. **Payment mode** — auto-debit subscriptions, monthly payment links, or offer both?
6. **Multi-vehicle discount** — any discount for 2+ vehicles in one flat?
7. **Cleaning timings** — fixed time window (e.g. 5–9 AM)? Which days are off (26 visits implies ~4 off days/month)?
8. **Interior cleaning** — does it need the customer present / car keys?
9. **Cancellation & refund policy** — notice period, refunds, pause option (e.g. travel).
10. **Serviceable societies at launch** — initial list for the service-area section.
11. **Real photos** — any photos of staff/cleaning (uniforms, kit) to replace the placeholder images (§4.1); until then stock/AI display images are used.
12. **Business details for Razorpay KYC** — business name, PAN, GST/Udyam, bank account.
13. **Domain** — preferred domain (carekar.in / carekar.com / other), and who will own the account.
14. **Admin users** — how many team members, and who should see revenue.
15. **Fonts** — approve Bricolage Grotesque + Plus Jakarta Sans (or the softer Sora + Manrope alternative).
16. **Ad spend** — will they share monthly ad spend per channel so the dashboard can show cost per lead / per customer?
