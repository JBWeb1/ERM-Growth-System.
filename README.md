# ERM-Growth System
**ERM Marketing · Build | Automate | Grow** — CRM + live client-reporting portal.

## Run the demo (Phase 1)
No build step. Open `index.html` in a browser, or run `python3 -m http.server 8000` and visit http://localhost:8000.

| Role | Login | Password |
|---|---|---|
| Admin | admin@ermmarketing.co | admin123 |
| Team member | team@ermmarketing.co | team123 |
| Client (any of 5) | e.g. emily@brightsmile.demo | demo123 |

Click the chips on the login page to auto-fill. In Admin → Clients, **Portal** opens any client's dashboard ("view as client") — ideal for sales meetings.

> Demo auth and data live in your browser (localStorage). Metrics are generated sample data. Nothing is sent anywhere.

## What's included
- **Client portal**: live-counting views (refresh every 60 s with a Live indicator), per-platform cards, 9 metrics with growth vs previous period, gradient charts, donut, best-posting-times heatmap, content library + top posts, monthly goals with pace markers, approvals (approve / request changes), messages and content requests.
- **Reports**: pick range / platforms / sections → branded preview with editable wins & next steps → PDF (print dialog), PNG image, WhatsApp share, mailto, copy summary, copy email HTML, schedule weekly/monthly.
- **Admin CRM**: dashboard (clients, MRR, leads, views, tasks), clients (profile, accounts + OAuth connect flow, content, billing, comms, timeline, notes, status), drag-and-drop Kanban pipeline with one-click convert, tasks + content calendar, multi-currency invoices (USD/ZAR, recurring retainers, printable), proposals with tracking, email/WhatsApp templates + comms log, roles & permissions, global search (`/`), notifications, white-label settings.

## Structure
`index.html` · `css/styles.css` · `js/core.js` (utils, SVG charts) · `js/data.js` (**data layer** — `Metrics` provider + `Store`) · `js/reports.js` · `js/portal.js` · `js/admin.js` · `js/app.js` (auth/router) · `docs/` · `supabase/schema.sql`

## Next
See [docs/UPGRADE-PLAN.md](docs/UPGRADE-PLAN.md) (Supabase + Vercel) and [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) (what each platform API really allows).

## Logo
Files in `assets/logo/`: `erm-mark` (icon), `erm-logo-horizontal-dark` / `-light` — each as SVG (scalable, for print/web) and PNG. The mark is an "E" built from three ascending bars with an arrow tip: ERM + growth.

## Colour themes
Seven professional themes — Corporate Navy (default), Executive White, Ocean Light, Emerald Finance, Charcoal & Gold, Slate Indigo, Royal Burgundy. Switch with the ★ button in the top bar (login page, admin and client portal). Admins set the default for everyone in Settings → Branding. In a client portal, a checkbox toggles between the client's own brand colours and the theme colours.
