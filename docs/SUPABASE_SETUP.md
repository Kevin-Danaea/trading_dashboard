# Supabase Setup

## 1. Environment

`.env` must contain:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-public-key
```

The app uses the anon key with Supabase Auth JWTs. RLS protects every user-owned table.

## 2. Create Tables

Open Supabase SQL Editor and run:

```text
supabase/migrations/202605040001_initial_trade_journal.sql
```

This creates:

- Auth-linked `profiles`
- `accounts`, `symbols`, `setups`, `strategies`, `tags`
- `trades`, `executions`, `positions`
- `journal_entries`, `daily_reviews`
- `risk_profiles`, `risk_rules`, `discipline_events`
- `imported_files`, `insights`, `attachments`, `analytics_snapshots`
- RLS policies for `auth.uid()`
- A trigger that seeds each new user with BTC/USDT, XAU/USD, a default account, starter setups, and risk rules

If your Supabase user already exists before running the migration, the final backfill statement seeds it too.

## 3. Login

Create your user in Supabase Auth or enable email login/magic links. The app currently supports:

- Email/password sign-in
- Magic link sign-in

## 4. First Real Trade

Start Nuxt:

```bash
npm run dev -- --host 127.0.0.1 --port 3010
```

Open `http://127.0.0.1:3010/`, log in, go to `Trades`, and use `Log trade`.

BTC/USDT and XAU/USD appear by default. Use `Add symbol` to add more pairs later.
