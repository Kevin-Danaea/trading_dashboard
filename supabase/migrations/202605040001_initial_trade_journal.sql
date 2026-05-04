-- Trade Journal & Performance Dashboard
-- Run this in Supabase SQL editor. It is safe to run on a fresh project.

create extension if not exists pgcrypto;

create type public.market_type as enum ('crypto_spot', 'crypto_futures', 'futures', 'forex', 'stocks', 'commodities', 'cfd');
create type public.trade_side as enum ('long', 'short');
create type public.trade_status as enum ('planned', 'open', 'closed', 'void');
create type public.trade_result as enum ('win', 'loss', 'breakeven');
create type public.session_name as enum ('Asia', 'London', 'NY AM', 'NY PM', 'Overnight');
create type public.import_status as enum ('uploaded', 'mapped', 'validated', 'persisted', 'failed', 'partial');
create type public.execution_source as enum ('manual', 'csv_import', 'exchange_api');
create type public.setup_status as enum ('active', 'review', 'paused', 'archived');
create type public.insight_tone as enum ('gain', 'loss', 'warn', 'info');
create type public.rule_severity as enum ('info', 'warn', 'block');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Trader',
  timezone text not null default 'America/Mexico_City',
  base_currency text not null default 'USD',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brokers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('broker', 'exchange')),
  supported_markets market_type[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, name)
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  broker_id uuid references public.brokers(id) on delete set null,
  name text not null,
  market_types market_type[] not null default '{}',
  base_currency text not null default 'USD',
  starting_balance numeric(18, 4) not null default 0 check (starting_balance >= 0),
  current_balance_cache numeric(18, 4),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, name)
);

create unique index accounts_one_default_per_user
  on public.accounts(user_id)
  where is_default and deleted_at is null;

create table public.symbols (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  base_asset text not null,
  quote_asset text not null,
  market_type market_type not null,
  tick_size numeric(18, 8),
  is_active boolean not null default true,
  is_default boolean not null default false,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, symbol, market_type)
);

create table public.setups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status setup_status not null default 'active',
  context text not null default '',
  triggers text not null default '',
  invalidations text not null default '',
  confirmations text,
  risk_management text not null default '',
  checklist text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, name)
);

create table public.strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, name)
);

create table public.strategy_setups (
  strategy_id uuid not null references public.strategies(id) on delete cascade,
  setup_id uuid not null references public.setups(id) on delete cascade,
  primary key (strategy_id, setup_id)
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, name)
);

create table public.imported_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  broker_id uuid references public.brokers(id) on delete set null,
  source execution_source not null default 'csv_import',
  filename text not null,
  status import_status not null default 'uploaded',
  content_hash text not null,
  mapping_version int not null default 1,
  row_count int not null default 0 check (row_count >= 0),
  accepted_rows int not null default 0 check (accepted_rows >= 0),
  rejected_rows int not null default 0 check (rejected_rows >= 0),
  error_report jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, content_hash)
);

create table public.positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  symbol_id uuid not null references public.symbols(id),
  market_type market_type not null,
  side trade_side not null,
  opened_at timestamptz not null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  position_id uuid references public.positions(id) on delete set null,
  symbol_id uuid not null references public.symbols(id),
  setup_id uuid references public.setups(id) on delete set null,
  strategy_id uuid references public.strategies(id) on delete set null,
  market_type market_type not null,
  side trade_side not null,
  status trade_status not null default 'closed',
  opened_at timestamptz not null,
  closed_at timestamptz,
  session session_name not null default 'NY AM',
  timezone text not null default 'America/Mexico_City',
  planned_entry numeric(18, 8),
  planned_stop numeric(18, 8) not null check (planned_stop > 0),
  planned_target numeric(18, 8),
  average_entry numeric(18, 8) not null check (average_entry > 0),
  average_exit numeric(18, 8),
  quantity numeric(22, 8) not null check (quantity > 0),
  planned_risk_amount numeric(18, 4) not null check (planned_risk_amount > 0),
  fees numeric(18, 4) not null default 0 check (fees >= 0),
  slippage_estimate numeric(18, 4) not null default 0 check (slippage_estimate >= 0),
  gross_pnl numeric(18, 4) not null default 0,
  net_pnl numeric(18, 4) generated always as (gross_pnl - fees - slippage_estimate) stored,
  r_multiple numeric(18, 6) generated always as ((gross_pnl - fees - slippage_estimate) / nullif(planned_risk_amount, 0)) stored,
  followed_plan boolean not null default false,
  confidence int check (confidence between 1 and 10),
  execution_score int check (execution_score between 1 and 10),
  emotion text,
  result trade_result generated always as (
    case
      when (gross_pnl - fees - slippage_estimate) > 0 then 'win'::trade_result
      when (gross_pnl - fees - slippage_estimate) < 0 then 'loss'::trade_result
      else 'breakeven'::trade_result
    end
  ) stored,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint closed_trade_has_exit check (status <> 'closed' or (closed_at is not null and average_exit is not null))
);

create table public.trade_tags (
  trade_id uuid not null references public.trades(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (trade_id, tag_id)
);

create table public.executions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  trade_id uuid references public.trades(id) on delete set null,
  imported_file_id uuid references public.imported_files(id) on delete set null,
  external_execution_id text,
  symbol_id uuid not null references public.symbols(id),
  market_type market_type not null,
  side trade_side not null,
  executed_at timestamptz not null,
  quantity numeric(22, 8) not null check (quantity > 0),
  price numeric(18, 8) not null check (price > 0),
  gross_value numeric(22, 8) not null check (gross_value >= 0),
  fee numeric(18, 4) not null default 0 check (fee >= 0),
  fee_currency text not null default 'USD',
  source execution_source not null default 'manual',
  dedupe_key text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (account_id, dedupe_key)
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_id uuid references public.trades(id) on delete set null,
  journal_date date not null,
  timezone text not null default 'America/Mexico_City',
  confidence int check (confidence between 1 and 10),
  execution_score int check (execution_score between 1 and 10),
  emotion text,
  market_context text,
  wins text,
  losses text,
  lesson text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.daily_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_date date not null,
  timezone text not null default 'America/Mexico_City',
  adherence_score int not null default 0 check (adherence_score between 0 and 100),
  net_pnl numeric(18, 4) not null default 0,
  total_r numeric(18, 6) not null default 0,
  trade_count int not null default 0 check (trade_count >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, review_date)
);

create table public.risk_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  max_risk_per_trade_pct numeric(8, 4) not null default 1 check (max_risk_per_trade_pct > 0),
  daily_loss_limit_amount numeric(18, 4) not null default 300 check (daily_loss_limit_amount >= 0),
  weekly_loss_limit_amount numeric(18, 4) not null default 1000 check (weekly_loss_limit_amount >= 0),
  max_consecutive_losses int not null default 2 check (max_consecutive_losses >= 1),
  cooldown_minutes_after_stop int not null default 30 check (cooldown_minutes_after_stop >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, account_id)
);

create table public.risk_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.risk_profiles(id) on delete cascade,
  code text not null,
  name text not null,
  enabled boolean not null default true,
  severity rule_severity not null default 'warn',
  params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (profile_id, code)
);

create table public.discipline_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_id uuid references public.trades(id) on delete set null,
  daily_review_id uuid references public.daily_reviews(id) on delete set null,
  type text not null,
  severity text not null check (severity in ('low', 'medium', 'high')),
  occurred_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  tone insight_tone not null default 'info',
  dimensions jsonb not null default '{}'::jsonb,
  metric_refs text[] not null default '{}',
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_id uuid references public.trades(id) on delete cascade,
  journal_entry_id uuid references public.journal_entries(id) on delete cascade,
  kind text not null check (kind in ('screenshot', 'document', 'csv', 'other')),
  url text not null,
  content_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete cascade,
  snapshot_key text not null,
  from_date date,
  to_date date,
  filters jsonb not null default '{}'::jsonb,
  metrics jsonb not null,
  version int not null default 1,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, snapshot_key, filters)
);

create index trades_user_opened_at_idx on public.trades(user_id, opened_at desc) where deleted_at is null;
create index trades_user_symbol_opened_at_idx on public.trades(user_id, symbol_id, opened_at desc) where deleted_at is null;
create index trades_user_setup_opened_at_idx on public.trades(user_id, setup_id, opened_at desc) where deleted_at is null;
create index trades_user_session_opened_at_idx on public.trades(user_id, session, opened_at desc) where deleted_at is null;
create index executions_user_executed_at_idx on public.executions(user_id, executed_at desc) where deleted_at is null;
create index journal_entries_user_date_idx on public.journal_entries(user_id, journal_date desc) where deleted_at is null;
create index discipline_events_user_occurred_idx on public.discipline_events(user_id, occurred_at desc) where deleted_at is null;
create index analytics_snapshots_user_key_idx on public.analytics_snapshots(user_id, snapshot_key, computed_at desc);

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger brokers_updated_at before update on public.brokers for each row execute function public.set_updated_at();
create trigger accounts_updated_at before update on public.accounts for each row execute function public.set_updated_at();
create trigger symbols_updated_at before update on public.symbols for each row execute function public.set_updated_at();
create trigger setups_updated_at before update on public.setups for each row execute function public.set_updated_at();
create trigger strategies_updated_at before update on public.strategies for each row execute function public.set_updated_at();
create trigger tags_updated_at before update on public.tags for each row execute function public.set_updated_at();
create trigger imported_files_updated_at before update on public.imported_files for each row execute function public.set_updated_at();
create trigger positions_updated_at before update on public.positions for each row execute function public.set_updated_at();
create trigger trades_updated_at before update on public.trades for each row execute function public.set_updated_at();
create trigger executions_updated_at before update on public.executions for each row execute function public.set_updated_at();
create trigger journal_entries_updated_at before update on public.journal_entries for each row execute function public.set_updated_at();
create trigger daily_reviews_updated_at before update on public.daily_reviews for each row execute function public.set_updated_at();
create trigger risk_profiles_updated_at before update on public.risk_profiles for each row execute function public.set_updated_at();
create trigger risk_rules_updated_at before update on public.risk_rules for each row execute function public.set_updated_at();
create trigger discipline_events_updated_at before update on public.discipline_events for each row execute function public.set_updated_at();
create trigger insights_updated_at before update on public.insights for each row execute function public.set_updated_at();
create trigger attachments_updated_at before update on public.attachments for each row execute function public.set_updated_at();

create or replace function public.seed_trade_journal_user(target_user_id uuid, target_email text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_risk_profile_id uuid;
begin
  insert into public.profiles (id, display_name, timezone, base_currency)
  values (target_user_id, coalesce(split_part(target_email, '@', 1), 'Trader'), 'America/Mexico_City', 'USD')
  on conflict (id) do nothing;

  insert into public.accounts (user_id, name, market_types, base_currency, starting_balance, is_default)
  values (target_user_id, 'Main Trading Account', array['crypto_futures'::market_type, 'cfd'::market_type], 'USD', 0, true)
  on conflict (user_id, name) do update set is_default = true
  returning id into v_account_id;

  insert into public.symbols (user_id, symbol, base_asset, quote_asset, market_type, is_default, sort_order)
  values
    (target_user_id, 'BTC/USDT', 'BTC', 'USDT', 'crypto_futures', true, 10),
    (target_user_id, 'XAU/USD', 'XAU', 'USD', 'cfd', true, 20)
  on conflict (user_id, symbol, market_type) do update set is_active = true, is_default = true;

  insert into public.setups (user_id, name, status, context, triggers, invalidations, confirmations, risk_management, checklist)
  values
    (target_user_id, 'Liquidity Sweep', 'active', 'Sweep of prior liquidity with rejection back into range.', 'Close back inside range plus momentum shift.', 'Acceptance beyond swept level.', 'Volume reaction and lower-timeframe break of structure.', 'Stop beyond sweep. First partial near 1R.', array['HTF context aligned', 'Liquidity level clear', 'Risk defined', 'Invalidation clear', 'No news within 30m', 'Cooldown respected']),
    (target_user_id, 'Breakout Pullback', 'active', 'Clean breakout followed by retest of broken level.', 'Retest holds with continuation signal.', 'Retest fails and closes back through level.', 'Volume on breakout, lower volume on pullback.', 'Stop beyond retest wick. Target next liquidity.', array['Trend context aligned', 'Breakout clean', 'Pullback controlled', 'Risk defined', 'Invalidation clear', 'Session valid']),
    (target_user_id, 'Learning Trade', 'review', 'Trade taken primarily for observation and deliberate practice.', 'Documented thesis before entry.', 'Thesis invalidated or risk rule violated.', 'Journal entry attached.', 'Small size only. Protect process over PnL.', array['Lesson defined', 'Risk small', 'Screenshot captured', 'Journal planned'])
  on conflict (user_id, name) do nothing;

  insert into public.risk_profiles (user_id, account_id, max_risk_per_trade_pct, daily_loss_limit_amount, weekly_loss_limit_amount, max_consecutive_losses, cooldown_minutes_after_stop)
  values (target_user_id, v_account_id, 1, 300, 1000, 2, 30)
  on conflict (user_id, account_id) do update set account_id = excluded.account_id
  returning id into v_risk_profile_id;

  insert into public.risk_rules (user_id, profile_id, code, name, enabled, severity, params)
  values
    (target_user_id, v_risk_profile_id, 'max_risk_per_trade', 'Max risk per trade', true, 'block', '{"maxPct":1}'::jsonb),
    (target_user_id, v_risk_profile_id, 'daily_loss_limit', 'Daily loss limit', true, 'block', '{"amount":300}'::jsonb),
    (target_user_id, v_risk_profile_id, 'loss_streak_cutoff', 'Loss streak cutoff', true, 'warn', '{"maxLosses":2}'::jsonb),
    (target_user_id, v_risk_profile_id, 'cooldown_after_stop', 'Cooldown after stop-out', true, 'warn', '{"minutes":30}'::jsonb)
  on conflict (profile_id, code) do nothing;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_trade_journal_user(new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_trade_journal on auth.users;
create trigger on_auth_user_created_trade_journal
  after insert on auth.users
  for each row execute function public.handle_new_user();

select public.seed_trade_journal_user(id, email) from auth.users;

alter table public.profiles enable row level security;
alter table public.brokers enable row level security;
alter table public.accounts enable row level security;
alter table public.symbols enable row level security;
alter table public.setups enable row level security;
alter table public.strategies enable row level security;
alter table public.strategy_setups enable row level security;
alter table public.tags enable row level security;
alter table public.imported_files enable row level security;
alter table public.positions enable row level security;
alter table public.trades enable row level security;
alter table public.trade_tags enable row level security;
alter table public.executions enable row level security;
alter table public.journal_entries enable row level security;
alter table public.daily_reviews enable row level security;
alter table public.risk_profiles enable row level security;
alter table public.risk_rules enable row level security;
alter table public.discipline_events enable row level security;
alter table public.insights enable row level security;
alter table public.attachments enable row level security;
alter table public.analytics_snapshots enable row level security;

create policy profiles_own on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

create policy brokers_own on public.brokers for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy accounts_own on public.accounts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy symbols_own on public.symbols for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy setups_own on public.setups for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy strategies_own on public.strategies for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tags_own on public.tags for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy imported_files_own on public.imported_files for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy positions_own on public.positions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy trades_own on public.trades for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy executions_own on public.executions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy journal_entries_own on public.journal_entries for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy daily_reviews_own on public.daily_reviews for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy risk_profiles_own on public.risk_profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy risk_rules_own on public.risk_rules for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy discipline_events_own on public.discipline_events for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy insights_own on public.insights for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy attachments_own on public.attachments for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy analytics_snapshots_own on public.analytics_snapshots for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy strategy_setups_own on public.strategy_setups
  for all
  using (
    exists (select 1 from public.strategies s where s.id = strategy_id and s.user_id = auth.uid())
    and exists (select 1 from public.setups su where su.id = setup_id and su.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.strategies s where s.id = strategy_id and s.user_id = auth.uid())
    and exists (select 1 from public.setups su where su.id = setup_id and su.user_id = auth.uid())
  );

create policy trade_tags_own on public.trade_tags
  for all
  using (
    exists (select 1 from public.trades t where t.id = trade_id and t.user_id = auth.uid())
    and exists (select 1 from public.tags tag where tag.id = tag_id and tag.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.trades t where t.id = trade_id and t.user_id = auth.uid())
    and exists (select 1 from public.tags tag where tag.id = tag_id and tag.user_id = auth.uid())
  );
