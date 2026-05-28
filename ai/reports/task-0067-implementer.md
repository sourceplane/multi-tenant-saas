# Implementer Report — task-0067: Webhooks Core Persistence

**PR**: https://github.com/sourceplane/multi-tenant-saas/pull/110
**Branch**: `impl/task-0067-webhooks-core`
**Status**: COMPLETE

## What Was Built

### Migration 080_webhooks_core (`packages/db/src/migrations/080_webhooks_core/up.sql`)
Three tables in dedicated `webhooks` schema:
- **endpoints** — webhook endpoint registration with encrypted secrets (`secret_ciphertext`, `secret_key_version`), status lifecycle (`active`/`paused`/`disabled`), org/project scoping, metadata JSONB
- **subscriptions** — event-type subscriptions linked to endpoints, optional `filter` JSONB, active/paused status
- **delivery_attempts** — delivery tracking with HTTP status codes, request/response headers+body, retry scheduling (`next_retry_at`), attempt counting

All tables: RLS enabled, `IF NOT EXISTS` guards, composite indexes for common query patterns, `updated_at` triggers.

### Repository (`packages/db/src/webhooks/`)
- **types.ts** — internal DB types, `WebhookRepository` interface
- **repository.ts** — full implementation using `SqlExecutor` pattern:
  - Endpoints: create, get, list (cursor-paginated), update, disable, delete, rotateSecret
  - Subscriptions: create, get, list, update, delete
  - Delivery attempts: create, get, list (cursor-paginated), update
- **index.ts** — re-exports
- Secret-safe: `secret_ciphertext` never in SELECT projections for reads; explicit column lists (no `SELECT *`)

### Contracts (`packages/contracts/src/webhooks.ts`)
Public API types: `PublicWebhookEndpoint`, `PublicWebhookSubscription`, `PublicWebhookDeliveryAttempt` plus request/response types for all operations. No secret material exposed.

### Supporting Changes
- `packages/db/src/types.ts` — added `"webhooks"` to `BoundedContext` union
- `packages/db/src/manifest.ts` — added `080_webhooks_core` entry (checksum: `bfffc592...`)
- `packages/db/package.json` — added `./webhooks` export
- `packages/contracts/package.json` — added `./webhooks` export
- `packages/contracts/src/index.ts` — added webhooks re-export
- `tests/db/src/migrations.test.ts` — added `"webhooks"` to VALID_CONTEXTS

## Tests
- **37 DB repository tests** (`tests/db/src/webhooks.test.ts`) — fake executor pattern covering all CRUD, pagination, error cases, secret safety
- **14 contract shape tests** (`tests/contracts/src/webhooks.test.ts`) — type structure validation
- **Full suite**: 426 tests pass, 0 failures

## Acceptance
- [x] Typechecks: `@saas/db` ✓, `@saas/contracts` ✓
- [x] Tests: 426/426 pass
- [x] Idempotent migration (IF NOT EXISTS)
- [x] No plaintext secrets in contracts
- [x] Follows existing patterns (SqlExecutor, cursor pagination, result types)
