# Phase 2 — real backend (Supabase + Vercel)

## Architecture
- **Frontend**: this static app → move to Next.js (or keep Vite/vanilla) on **Vercel**. The UI already talks only to `Metrics` and `Store` in `js/data.js`; replace their internals, not the screens.
- **Auth**: Supabase Auth (email+password / magic link). Roles in `profiles.role` (`admin|team|client`); clients are linked to one `client_id`.
- **DB**: Postgres — schema in `supabase/schema.sql` (clients, leads, tasks, content, invoices, proposals, templates, comms, goals, schedules, `metric_snapshots`, `posts`, `post_snapshots`, `social_accounts`).
- **Security**: Row-Level Security. Clients can `SELECT` only rows where `client_id = their profile.client_id`; staff see all; only staff can write CRM tables. Never use the service key in the browser.
- **Secrets**: OAuth refresh tokens in `social_accounts`, encrypted (Supabase Vault / pgsodium), readable only by server functions.
- **Jobs** (Vercel Cron → Supabase Edge Functions / API routes):
  - `sync-metrics` every 15–60 min: pull from each connected account (or Windsor.ai), upsert `metric_snapshots` (per client/platform/day) and `posts`/`post_snapshots`.
  - `scheduled-reports`: render the report (Playwright/`@sparticuz/chromium` → PDF), email via Resend, log in comms.
  - `retainer-invoices` monthly; `overdue-check` daily.
- **Live feel**: Supabase Realtime on `metric_snapshots` (or the existing 60 s poll).
- **Payments**: Stripe (USD) and PayFast/Peach (ZAR) payment links on invoices + webhooks to mark paid.
- **WhatsApp**: wa.me links now; WhatsApp Business Cloud API later for automated sends.

## Migration steps
1. Create Supabase project; run `supabase/schema.sql`; create first admin user and set `profiles.role='admin'`.
2. Swap `Store` to Supabase (`supabase-js`) with the same method names; replace `login()` in `js/app.js` with `supabase.auth`.
3. Implement `ApiProvider` for `Metrics` reading `metric_snapshots`/`posts` (same return shape as `SampleProvider`). Remove `Metrics.tick` simulation.
4. Build `sync-metrics` for one platform end-to-end (start with YouTube — easiest OAuth), then Meta, then TikTok. Or connect Windsor.ai first.
5. Deploy to Vercel, add a custom domain (e.g. `portal.ermmarketing.co`), set env vars (never commit them).
6. Add tests for RLS: a client JWT must get zero rows from another client's data.
7. Like-for-like comparisons: with real data, compare *period-to-date* against the same elapsed span of the prior period.

## Costs (rough, verify)
Supabase Pro ~US$25/mo, Vercel Pro ~US$20/mo (Hobby is non-commercial), Windsor.ai paid plan optional, Resend free tier to start.
