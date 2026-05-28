# Task 0071 — Implementer Report

## Summary

Added the metering persistence and contract foundation: a new `metering` bounded-context schema with four tables (usage_records, usage_rollups, quota_definitions, quota_violations), a typed `@saas/db/metering` repository module, and starter contract types in `@saas/contracts`. All tables enforce `org_id NOT NULL` with optional project/environment/resource scoping. Raw usage ingestion supports exactly-once semantics via `(org_id, idempotency_key)` uniqueness. Quota checks return structured facts without throwing. No billing state, Worker runtime, or public routes introduced.

## Files Changed

| File | Action |
|------|--------|
| `packages/db/src/migrations/100_metering_foundation/up.sql` | Added — metering schema DDL |
| `packages/db/src/manifest.ts` | Modified — added migration entry |
| `packages/db/src/types.ts` | Modified — added `"metering"` to `BoundedContext` |
| `packages/db/src/metering/types.ts` | Added — repository types and interfaces |
| `packages/db/src/metering/repository.ts` | Added — repository implementation |
| `packages/db/src/metering/index.ts` | Added — barrel exports |
| `packages/db/package.json` | Modified — added `./metering` export |
| `packages/contracts/src/metering.ts` | Added — public API contract types |
| `packages/contracts/src/index.ts` | Modified — added metering re-export |
| `tests/db/package.json` | Modified — added metering moduleNameMapper |
| `tests/db/src/migrations.test.ts` | Modified — added `"metering"` to VALID_CONTEXTS |
| `tests/db/src/metering.test.ts` | Added — 22 focused repository tests |

## Migration/Manifest Checksum

- Migration ID: `100_metering_foundation`
- Context: `metering`
- Path: `100_metering_foundation/up.sql`
- SHA-256: `d02693e6ec3d76193d58b9038a211c877adbf1c141e4f40d9ca8bb7a78c90930`

## Repository API

| Method | Description |
|--------|-------------|
| `recordUsage(input)` | Insert single usage record with idempotency conflict detection |
| `ingestUsageBatch(inputs)` | Per-record batch wrapper around recordUsage |
| `getUsageSummary(query)` | Aggregate rollups by org/metric/time with optional project/env filters |
| `listUsageRollups(orgId, params)` | Cursor-paginated rollup listing |
| `checkQuota(orgId, metric, options?)` | Structured quota check returning {allowed, limit, used, remaining, period, enforcement, reason} |
| `listQuotaViolations(query, params)` | Cursor-paginated violation listing with optional dimension filters |

## Contract Types

- `RecordUsageRequest` / `RecordUsageResponse` / `PublicUsageRecord`
- `IngestUsageBatchRequest` / `IngestUsageBatchResponse`
- `GetUsageSummaryRequest` / `GetUsageSummaryResponse` / `PublicUsageRollup`
- `CheckQuotaRequest` / `CheckQuotaResponse`
- `ListQuotaViolationsRequest` / `ListQuotaViolationsResponse` / `PublicQuotaViolation`

All exported from `@saas/contracts` via `packages/contracts/src/index.ts`.

## Checks Run

```
$ pnpm --filter @saas/db typecheck
✅ Pass

$ pnpm --filter @saas/contracts typecheck
✅ Pass

$ pnpm --filter @saas/db-tests test -- --testPathPattern metering
✅ 22/22 tests pass (metering.test.ts)

$ pnpm --filter @saas/db-tests test -- --testPathPattern migrations
✅ 21/21 tests pass (migrations.test.ts) — includes checksum for 100_metering_foundation

$ pnpm --filter @saas/contracts test
✅ Pass

$ kiox -- orun validate --intent intent.yaml
✅ Intent is valid — All validation passed

$ kiox -- orun plan --changed --intent intent.yaml --output plan.json
✅ 4 components × 3 envs → 9 jobs (contracts, db, db-migrate, db-tests)

$ kiox -- orun run --plan plan.json --dry-run --runner github-actions
✅ 9/9 jobs pass (dry-run)
```

Pre-existing failure: `webhooks.test.ts` fails to resolve `@saas/db/webhooks` module — not introduced by this task.

## Assumptions

1. Migration ID `100` is the next valid ID after `090_webhooks_delivery` — repo reality confirmed no intervening migrations.
2. `ingestUsageBatch` is a conservative per-record wrapper around `recordUsage` — no partial-success complexity beyond per-record results.
3. `checkQuota` calculates current usage from raw `usage_records` (not rollups) for accuracy. A future optimization could use rollups + delta for performance.
4. Quota period boundaries use UTC calendar math (hour/day/month start). `billing_cycle` falls back to month start — billing integration will refine this.
5. The `metadata` JSONB columns document a "bounded safe metadata" contract — no secrets, tokens, or credentials. This is enforced by code convention and column comments, not DB-level validation.

## Spec Proposals

None required. The spec (`specs/components/10-metering.md`) was sufficient for this persistence-layer task. No conflicts encountered.

## Remaining Gaps

- No metering Worker runtime (apps/metering-worker) — future task
- No public/internal HTTP routes for usage/quota APIs
- No rollup generation logic (Worker will produce rollups from raw records)
- No billing integration (billing consumes metering outputs)
- Quota `billing_cycle` period uses month start as placeholder — billing task will provide actual cycle boundaries
- Batch ingestion is sequential per-record — a future optimization could use multi-row INSERT for throughput

## Next Task Dependencies

- Metering Worker (`apps/metering-worker`) depends on `@saas/db/metering` repository
- Usage/quota API routes depend on `@saas/contracts` metering types
- Billing foundation depends on metering being queryable (this PR)

## PR Number

TBD — pushing and creating PR next.
