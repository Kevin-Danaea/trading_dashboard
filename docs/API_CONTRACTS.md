# API Contracts

Nuxt API lives in `app/server/api` because the project uses `srcDir: app/`. It is intentionally shaped around product modules, not database tables.

## Modules

- `analytics`: read-side aggregations. `GET /api/analytics/overview?from&to&symbol&setupId&session&marketType`
- `trades`: manual trade commands and trade-log reads. `GET /api/trades`, `POST /api/trades`
- `imports`: CSV/import workflow. `GET /api/imports`, `POST /api/imports/preview`
- `journal`: journal and daily-review reads. `GET /api/journal`
- `playbook`: setups/strategy read model. `GET /api/playbook/setups`
- `risk`: live risk monitor. `GET /api/risk/status`
- `bootstrap`: authenticated startup data. `GET /api/bootstrap`
- `symbols`: selectable instruments. `GET /api/symbols`, `POST /api/symbols`

## Mutator Rules

Commands validate DTOs at the API boundary with `zod`. Production persistence should live behind repositories, then publish domain events for analytics recomputation.

Expected errors:

- `400`: invalid DTO, invalid mapping, invalid date range.
- `401/403`: auth later.
- `404`: trade/setup/import not found.
- `409`: duplicate import row, stale edit version, idempotency key conflict.
- `422`: trade violates domain validation, impossible fill consolidation, missing planned risk.
