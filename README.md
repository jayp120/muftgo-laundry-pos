# MuftGo Laundry POS — Pune, India

A modern billing & order management system for laundry shops. A product by **[MuftGo](https://muftgo.com)**.

Built for Indian laundry workflow: per-kg / per-piece / combo services, ₹ INR billing, UPI / Cash / Card, WhatsApp alerts, loyalty points, multi-store & offline mode.

## Live

- Web (PWA): `https://muftgo.com` (deploy `dist/` to Vercel)
- Local dev: `npm run dev` → http://localhost:8080
- Prod preview: `npm run build && npm run preview` → http://localhost:4173
- Android APK: `https://github.com/jayp120/muftgo-laundry-pos/releases/latest/download/muftgo-laundry-latest.apk` (built via GitHub Actions `build-android` / `release-android`; same-origin alias `/muftgo-laundry-latest.apk` via vercel.json when this app serves the domain)

## Setup

```sh
npm install
npm run dev
```

Supabase (Postgres) is the database. Create your own project, run `supabase/migrations/*.sql` in order, update `src/integrations/supabase/client.ts`.

## Pricing for shops

1-month free demo, then ₹1000/month/store (hosting, backup, WhatsApp templates, support). Yearly ₹10,000.

Contact: support@muftgo.com · https://muftgo.com · Pune, Maharashtra, India
