# Trade Journal & Performance Dashboard

## 1. Product Domain Summary

The product is a daily operating system for active traders. It separates raw executions from consolidated trades so analytics stay reliable, then connects quantitative results with setup discipline, journal context, and risk behavior. The first production slice should be single-user and local-first-friendly, but the domain assumes multi-account, multi-market, timezones, imports, recalculation, and future auth.

## 2. Event Storming / Domain Events

- `UserCreated`
- `AccountCreated`
- `RiskProfileConfigured`
- `TradeManuallyCreated`
- `ImportedFileUploaded`
- `ImportMappingDetected`
- `ImportPreviewValidated`
- `ExecutionPersisted`
- `ExecutionsDeduplicated`
- `PositionConsolidated`
- `TradeClosed`
- `TradeLinkedToSetup`
- `JournalEntryWritten`
- `DisciplineEventLogged`
- `RiskRuleViolated`
- `AnalyticsRecalculationRequested`
- `AnalyticsSnapshotUpdated`
- `InsightGenerated`
- `DataExportRequested`

## 3. Bounded Contexts

- Identity & Settings: user, timezone, currency, preferences.
- Trading Ledger: accounts, broker/exchange, executions, positions, trades.
- Imports: uploaded files, mapping, validation, dedupe, import versions.
- Analytics: metrics, filters, snapshots, materialized views.
- Journal & Discipline: journal entries, daily reviews, discipline events.
- Playbook: setups, strategies, tags, checklist definitions.
- Risk: risk profiles, rules, live status, violations.
- Insights: generated summaries and recommendations.

## 4. Entity Model

Core TypeScript entities are in `shared/domain/types.ts`.

- `User`: owns settings and data. Required: display name, timezone, base currency. Optional: email until auth lands.
- `Account`: trading account. Required: user, name, market types, base currency, starting balance. Derived cache: current balance.
- `Broker`: exchange/broker catalog. Required: name, kind, supported markets.
- `ImportedFile`: immutable source artifact. Required: source, filename, content hash, mapping version, row counts, status. Unique: user + content hash.
- `Execution`: raw fill. Required: account, symbol, side, executed time, quantity, price, fee, dedupe key. Unique: account + dedupe key.
- `Position`: consolidation group over executions. Derived from raw fills; can own multiple logical trades when scale-in/out rules split intent.
- `Trade`: analytics unit. Required: account, symbol, side, session, planned stop, average entry, planned risk, gross/net PnL, status. R multiple derives from planned risk.
- `Setup`: playbook pattern. Required: name, status, context, triggers, invalidations, risk management, checklist.
- `Strategy`: grouping over setups.
- `Tag`: flexible dimensions for analytics.
- `JournalEntry`: trade-linked or daily. Optional scores/emotion/text, but date/timezone required.
- `DailyReview`: daily rollup with adherence and notes.
- `RiskProfile/RiskRule`: rule configuration and thresholds.
- `DisciplineEvent`: explicit behavior event that can affect score/insights.
- `Insight`: generated read model from metrics and journal/risk context.
- `Attachment`: screenshot/document with content hash.

## 5. Business Rules

- Persist raw executions separately from consolidated trades.
- Imports are idempotent by file hash and execution dedupe key.
- Net PnL equals gross PnL minus fees and estimated slippage.
- R multiple uses initial planned risk, not a later moved stop.
- Win rate is never shown alone; pair with expectancy and profit factor.
- Metrics accept date, symbol, setup, session, market, strategy, tag, and account filters.
- Trading day grouping uses the account/user timezone, not server timezone.
- Risk violations create discipline events and can block new trade commands.
- Journal and discipline events contribute to adherence score and insights.
- Multi-currency support requires normalized reporting currency plus source currency preservation.

## 6. Metrics Formulas And Edge Cases

- Gross PnL: sum of trade gross PnL before fees/slippage. Test long/short winners and losers.
- Net PnL: `grossPnl - fees - slippageEstimate`. Missing slippage means zero.
- PnL %: `netPnl / startingEquity`; null when starting equity is missing or zero.
- R multiple: `netPnl / plannedRiskAmount`; invalid/null when planned risk is zero.
- Win rate: wins / closed trades. Empty range is zero.
- Average win/loss: average net PnL of winning/losing trades. Missing side returns zero.
- Profit factor: gross winners / absolute gross losers. If no losses and at least one win, expose `null`/infinite in UI instead of dividing by zero.
- Expectancy: `(winRate * averageWin) - (lossRate * averageLoss)`.
- Max drawdown: max peak-to-trough decline over equity curve.
- Consecutive wins/losses: longest closed-trade streak, breakeven resets.
- Average hold time: closedAt minus openedAt. Null if no valid closed trades.
- Fees ratio: `fees / abs(grossPnl)`. Null when gross is zero.
- Adherence score: weighted checklist/rule compliance. MVP uses followed-plan percentage; V2 weights risk, journal, cooldown, news windows.
- Setup performance score: weighted expectancy, PF, win rate, adherence, sample size confidence.

Implementation lives in `shared/domain/metrics.ts`.

## 7. API Design

See `docs/API_CONTRACTS.md`. Commands validate DTOs with Zod and should later call repository services. Reads are query-oriented and can be backed by analytics snapshots.

## 8. Database Schema Proposal

PostgreSQL tables:

- `users`, `accounts`, `brokers`
- `imported_files`, `import_rows`, `import_mappings`
- `executions`
- `positions`, `position_executions`
- `trades`, `trade_executions`
- `setups`, `strategies`, `strategy_setups`
- `tags`, `trade_tags`
- `journal_entries`, `daily_reviews`
- `risk_profiles`, `risk_rules`, `discipline_events`
- `insights`, `attachments`
- `analytics_snapshots`, `recalculation_jobs`

Indexes and constraints:

- Unique `imported_files(user_id, content_hash)`.
- Unique `executions(account_id, dedupe_key)`.
- Index `trades(user_id, opened_at)`, `trades(account_id, symbol, opened_at)`, `trades(setup_id, opened_at)`, `trades(session, opened_at)`.
- Check positive quantity, positive planned risk, valid scores 1-10, non-negative fees.
- Soft delete on user-facing mutable entities; do not soft-delete raw import rows by default.
- Use `version` or `updated_at` optimistic concurrency on mutable trades/setups/risk rules.

## 9. Background Jobs / Workflows

CSV import flow:

1. Upload file and compute content hash.
2. Parse into staged rows.
3. Detect source/mapping from headers.
4. Preview normalized rows and warnings.
5. Validate required fields and row-level types.
6. Deduplicate with execution dedupe keys.
7. Persist raw executions.
8. Consolidate executions into positions/trades.
9. Queue analytics recalculation by affected account/date range.
10. Generate import report with accepted, duplicate, rejected, and warning rows.

Analytics strategy:

- On-demand for narrow detail pages.
- Precomputed snapshots for overview cards, daily equity, setup/session matrices.
- Incremental recomputation after import/edit using affected date ranges.
- Materialized views for heavy cross-dimensional analytics once data volume grows.
- Cache frequent filters by normalized filter key and snapshot version.

## 10. MVP Roadmap Por Fases

- Phase 0: Nuxt scaffold, tokens, app shell, typed domain, metric functions, API stubs.
- Phase 1: Manual trade creation, trade table, detail drawer, setup linking.
- Phase 2: Analytics overview with reliable metrics and filter contracts.
- Phase 3: CSV preview/import/dedupe/persist workflow.
- Phase 4: Journal/daily review and adherence scoring.
- Phase 5: Risk rules and violation detection.
- V2: auth, multi-user, exchange API sync, screenshots storage, automated insights, materialized views, alerts, exports.

Extensible from day one: raw-vs-consolidated ledger, import versioning, timezone-aware trade days, planned-risk based R, and analytics snapshots.

## 11. Testing Strategy

- Unit: metric formulas, R multiple edge cases, drawdown, streaks, adherence, setup score.
- Contract: DTO parsing for API commands, error shapes, idempotency conflicts.
- Integration: CSV import pipeline from staged rows through executions/trades/snapshot job.
- Component: shell navigation, filters, table rendering, accessible drawer focus.
- E2E: create trade, import preview, filter analytics, journal link.
- Visual regression: preserve handoff tokens/density/dark theme on core screens.

## 12. Riesgos Técnicos Y Decisiones Arquitectónicas

- Nuxt API is enough for MVP, but keep domain services/repositories framework-neutral to avoid coupling business logic to handlers.
- Prisma is the safest first ORM for speed and migrations; Drizzle is leaner but asks for more SQL discipline.
- Snapshots reduce dashboard latency but create consistency risk; solve with snapshot version and event-driven recomputation.
- Imports are deceptively hard; make idempotency and staged validation MVP, not V2.
- R multiple and adherence are product trust anchors; never infer them from incomplete data without marking confidence.
