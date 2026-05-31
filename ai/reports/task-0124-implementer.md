# Task 0124 — Implementer Report

**Agent:** Implementer
**Milestone:** B9 — Entitlement-decision observability (counts by caller × entitlement key × outcome)
**Branch:** `impl/task-0124-entitlement-observability`
**PR Number:** [#179](https://github.com/sourceplane/multi-tenant-saas/pull/179)

## Summary

Wired secret-free, counts-only **entitlement-decision observability** end to end. Every
decision produced on the billing-worker internal `check-entitlement` path now emits a
best-effort, non-blocking observation carrying only `orgId + entitlementKey + outcome
(+ denialReason) + occurredAt` — never limit values, subscription IDs, provider payloads, or
any secret. A new forward-only migration (`150_entitlement_decision_observations`) creates an
append-only observation table in the existing `billing` schema. The admin-support worker
exposes a new **deny-by-default** internal-only aggregation read
(`GET /v1/internal/support/organizations/:orgId/entitlement-decisions`) returning bounded
per-`(entitlementKey, outcome)` counts over a bounded time window, mirroring the
`list-support-actions.ts` audited-denial pattern. The entitlement response bytes and
`decideEntitlement` semantics are **unchanged** — the observation is a pure additive
side-effect.

## Files Changed

### New — DB observation storage (`packages/db/src/`)
- `migrations/150_entitlement_decision_observations/up.sql` — append-only
  `billing.entitlement_decision_observations` table (counts-only columns: org_id,
  entitlement_key, outcome, denial_reason, occurred_at) + bounded read index on
  `(org_id, occurred_at)`; forward-only, `IF NOT EXISTS` guards, no backfill.
- `billing/entitlement-decisions.ts` — narrow `EntitlementDecisionRepository`
  (`recordDecisionObservation` + `aggregateDecisions`); separate from the broad
  `BillingRepository` so the observation concern never exposes value fields.

### Modified — DB registration / exports
- `manifest.ts` — registered migration 150 (context `billing`, checksum
  `ba7a1a00ad723752e1bdedc8bcd47c210b24ae18bd3245cb71af84432aefa7f8`).
- `billing/index.ts` — barrel exports for the new types + `createEntitlementDecisionRepository`.

### Modified — billing-worker emission seam (`apps/billing-worker/src/`)
- `ids.ts` — `generateUuid()` RFC-4122 v4 helper via `crypto.getRandomValues`
  (`crypto.randomUUID` may be unavailable in Workers); injectable for deterministic tests.
- `handlers/check-entitlement.ts` — extended `CheckEntitlementDeps` with injectable
  `recorderFactory` / `now` / `generateId`; added `defaultRecorderFactory` and a
  `recordDecisionObservation` helper that **swallows all errors** (both throw and
  error-result paths) so the entitlement response is never altered; emission fires after the
  decision, before the success response.

### New — admin read surface (`apps/admin-worker/src/`)
- `handlers/list-entitlement-decisions.ts` — deny-by-default aggregated read handler
  (`authorizeSupportAction` gate; denied reads emit `support.access_denied`); bounded window
  (`DEFAULT_WINDOW_HOURS=24`, `MAX_WINDOW_HOURS=168`) and bounded groups (`MAX_GROUPS=200`);
  narrow projection — per-`(entitlementKey, outcome)` counts only.

### Modified — admin-worker routing
- `router.ts` — `ENTITLEMENT_DECISIONS_RE` route registered before `ORG_LOOKUP_RE`.

### New / Modified — tests
- `tests/billing-worker/src/billing-worker.test.ts` — appended "decision-observation emission
  (B9)" describe block (6 tests): emission on allowed + denied paths, and that a recorder
  throw OR error-result does NOT change the entitlement response.
- `tests/admin-worker/src/list-entitlement-decisions.test.ts` — deny-by-default (+
  `support.access_denied`), aggregation correctness, and no-secret-fields projection assertions.
- `tests/admin-worker/package.json` — explicit `^@saas/db/billing$` moduleNameMapper (generic
  `$1.ts` fallback otherwise mis-resolves the subpath to `billing.ts`).

## Checks Run

| Command | Result |
|---|---|
| `pnpm --filter @saas/db typecheck` | ✅ exit 0 |
| `pnpm --filter @saas/billing-worker typecheck` | ✅ exit 0 |
| `pnpm --filter @saas/admin-worker typecheck` | ✅ exit 0 |
| `pnpm --filter @saas/billing-worker-tests test` | ✅ 52/52 (incl. 6 new B9 emission tests) |
| `pnpm --filter @saas/admin-worker-tests test` | ✅ 28/28, 4 suites (incl. new read tests) |
| `pnpm --filter @saas/db-tests test` | ✅ 522/522, 15 suites (migration-150 checksum verified) |
| `lint` (db, billing-worker, admin-worker, billing-worker-tests, admin-worker-tests) | ✅ all clean |
| `orun validate --intent intent.yaml` | ✅ All validation passed |
| `orun plan --changed --base origin/main --intent intent.yaml` | ✅ 6 components × 13 jobs |
| `orun run -p plan.json --dry-run --runner github-actions` | ✅ 13/13 jobs preview clean |

Plan scope (changed-only) = `admin-worker`, `admin-worker-tests`, `billing-worker`,
`billing-worker-tests`, `db`, `db-migrate` — billing-worker + admin-worker + db all discovered
and in the plan (verify on dev; verify+deploy on stage/prod; db-migrate Migrate on stage/prod).

## Assumptions

- **Owning context — extend `billing`, not a new context.** The decision logic and
  `billing.entitlements` already live in the `billing` bounded context; observations are
  billing-owned facts. This avoids touching the `BoundedContext` union. The admin-worker reads
  cross-schema (the same narrow-projection pattern it already uses to read membership/identity
  for support lookups).
- **Storage shape — append-only observation table aggregated at read time** (NOT a
  pre-aggregated rollup counter). Best-effort inserts then have no read-modify-write
  contention; aggregation is a cheap bounded `GROUP BY` over a `(org_id, occurred_at)` index;
  no backfill. The trade-off (read-time aggregation cost) is bounded by the window + group caps.
- **Observation granularity** = `orgId × entitlementKey × outcome (+ denialReason)`, counts
  only. The narrowest counts-only assumption consistent with the milestone ("who is hitting
  the gate").
- **Window default 24h, max 168h (7d); max 200 groups.** Bounded read; no unbounded scan
  reachable via the API.
- **ID generation** hand-rolled via `crypto.getRandomValues` (Workers may lack
  `crypto.randomUUID`), injectable for deterministic tests.

## Spec Proposals

None. No contract is altered — this is an additive observability side-effect plus a new
internal-only read. (`CheckBillingEntitlementResponse` and `decideEntitlement` are frozen and
untouched.)

## Remaining Gaps

- No Analytics Engine / external structured-log sink (explicitly out of scope; in-repo DB
  persistence only this round). Clean seam left.
- No Console support UI for the aggregation (separate later surface).
- Read-time aggregation: if observation volume grows large, a future rollup/materialized
  projection could replace read-time `GROUP BY` behind the same repository interface.

## Next Task Dependencies

- A later Console support surface can consume `GET …/entitlement-decisions` directly.
- A future rollup/retention job could compact `billing.entitlement_decision_observations`
  without changing the `EntitlementDecisionRepository` contract.

## PR Number

[#179](https://github.com/sourceplane/multi-tenant-saas/pull/179)
