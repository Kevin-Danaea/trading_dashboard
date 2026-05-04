# Trade Journal & Performance Dashboard

Professional trade journal and performance dashboard for active traders. The app is built for daily use: log trades, connect them to setups and discipline notes, calculate reliable performance metrics, and evolve the journal into a real analytics system.

The first production target is a private single-user workspace, with Supabase Auth and Row Level Security already in place so it can grow into a multi-user product later.

## Stack

- Nuxt 3
- Vue 3
- TypeScript
- Supabase Auth
- Supabase Postgres
- Nitro server API
- Vitest

## Product Scope

Current functional slice:

- Email/password and magic-link login.
- Supabase-backed user data with RLS.
- Seeded instruments for `BTC/USDT` and `XAU/USD`.
- Manual trade logging.
- Custom symbol creation.
- Performance metrics from real trades.
- Overview dashboard using live Supabase data after login.
- Initial risk, journal, imports, playbook, and analytics contracts.

Planned next slices:

- CSV import pipeline.
- Trade detail drawer.
- Journal editor.
- Setup/playbook editor.
- Risk-rule enforcement UI.
- Analytics filters and saved views.
- Screenshots/attachments.

## Project Structure

```text
app/
  assets/css/              Design tokens and app-wide styling
  components/              App shell, charts, auth, trade form
  composables/             Supabase and dashboard state
  pages/                   Nuxt pages
  plugins/                 Supabase client plugin
  server/
    api/                   Nuxt/Nitro API routes
    utils/                 Server-side Supabase helpers

shared/
  data/                    Development seed/mock data
  domain/                  Domain types, DB mappers, metrics, tests

supabase/
  migrations/              SQL schema, RLS, seed functions

docs/                      Architecture, API contracts, setup notes
```

## Why `server/api` Is Empty Or Missing

This project uses:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  srcDir: 'app/'
})
```

Because `srcDir` points to `app/`, Nuxt expects app code under `app/`, including Nitro server routes. That means API routes live in:

```text
app/server/api
```

not:

```text
server/api
```

If you see a root-level `server/api`, it is either an old local empty folder or a leftover from before `srcDir` was set. It is not used by Nuxt in this project.

## Environment

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Required variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-public-key
```

Do not commit `.env`. The anon key is intended for client use, but environment files should still stay local.

## Supabase Setup

Run the migration in the Supabase SQL Editor:

```text
supabase/migrations/202605040001_initial_trade_journal.sql
```

The migration creates:

- `profiles`
- `accounts`
- `symbols`
- `setups`
- `strategies`
- `tags`
- `trades`
- `executions`
- `positions`
- `journal_entries`
- `daily_reviews`
- `risk_profiles`
- `risk_rules`
- `discipline_events`
- `imported_files`
- `insights`
- `attachments`
- `analytics_snapshots`

It also enables RLS and adds policies scoped to `auth.uid()`.

When a new Supabase Auth user is created, the trigger seeds:

- A default trading account.
- `BTC/USDT`.
- `XAU/USD`.
- Starter setups.
- A basic risk profile.
- Default risk rules.

More setup detail is in [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).

## Development

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev -- --host 127.0.0.1 --port 3010
```

Open:

```text
http://127.0.0.1:3010/
```

## Validation

Run unit tests:

```bash
npm test
```

Run typecheck:

```bash
npm run typecheck
```

## API Routes

Authenticated API routes live under `app/server/api`.

Current routes:

- `GET /api/bootstrap`
- `GET /api/analytics/overview`
- `GET /api/trades`
- `POST /api/trades`
- `GET /api/symbols`
- `POST /api/symbols`
- `GET /api/risk/status`
- `GET /api/journal`
- `GET /api/playbook/setups`
- `GET /api/imports`
- `POST /api/imports/preview`

Most routes require a Supabase session JWT. The client sends it as:

```http
Authorization: Bearer <access_token>
```

## Domain Notes

The app intentionally separates:

- Raw fills/executions.
- Consolidated positions.
- Logical trades used for analytics.

Metrics are calculated from closed trades and use planned initial risk for R multiple. Net P&L is gross P&L minus fees and slippage. The formulas live in [shared/domain/metrics.ts](shared/domain/metrics.ts), with tests in [shared/domain/metrics.test.ts](shared/domain/metrics.test.ts).

## Git Hygiene

Ignored locally:

- `.env`
- `node_modules`
- `.nuxt`
- `.output`
- `.DS_Store`

Commit source, migrations, docs, and lockfile. Do not commit generated build output or secrets.
