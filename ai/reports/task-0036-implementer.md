# Task 0036 Implementer Report

## Summary

Added the first public audit-read surface: `GET /v1/organizations/{orgId}/audit` exposed through api-edge and a new private `apps/events-worker`. The route authorizes via membership-worker authorization-context and policy-worker `audit.read` action (owner/admin only), queries the existing `events.audit_entries` table with optional category filtering and cursor pagination, maps internal UUIDs to public boundary IDs, redacts payload fields per `redactPaths`, and returns a standard response envelope.

## Files Changed

### New files (apps/events-worker)
- `apps/events-worker/package.json` — workspace package
- `apps/events-worker/tsconfig.json` — extends worker tsconfig
- `apps/events-worker/wrangler.jsonc` — stage/prod private worker with Hyperdrive + service bindings
- `apps/events-worker/component.yaml` — Orun component manifest
- `apps/events-worker/src/index.ts` — worker entry
- `apps/events-worker/src/env.ts` — Env interface (SOURCEPLANE_DB, MEMBERSHIP_WORKER, POLICY_WORKER)
- `apps/events-worker/src/router.ts` — route matching, actor resolution, org ID parsing
- `apps/events-worker/src/handlers/health.ts` — /health endpoint
- `apps/events-worker/src/handlers/list-audit.ts` — audit list handler with authorization, pagination, redaction, public ID mapping
- `apps/events-worker/src/http.ts` — response helpers
- `apps/events-worker/src/ids.ts` — UUID↔public-ID mapping for all known subject kinds
- `apps/events-worker/src/pagination.ts` — cursor encode/decode (occurredAt-based keyset)
- `apps/events-worker/src/membership-client.ts` — fetchAuthorizationContext
- `apps/events-worker/src/policy-client.ts` — authorizeViaPolicy

### New files (tests)
- `tests/events-worker/package.json` — test package
- `tests/events-worker/tsconfig.json` — test tsconfig with path mappings
- `tests/events-worker/src/events-worker.test.ts` — 17 tests covering router, handler, public ID mapping, redaction, pagination, error cases

### New files (api-edge)
- `apps/api-edge/src/audit-facade.ts` — audit route forwarding facade
- `tests/api-edge/src/audit-facade.test.ts` — 11 tests covering routing, header forwarding, bearer stripping, 503/401/405

### Modified files
- `packages/contracts/package.json` — added `./events` export
- `packages/contracts/src/events.ts` — added PublicAuditEntry, ListAuditEntriesResponse types
- `packages/contracts/src/policy.ts` — `audit.read` already present in ORGANIZATION_ACTIONS
- `packages/db/src/events/types.ts` — queryAuditByOrg signature with optional category
- `packages/db/src/events/repository.ts` — category-aware SQL filtering with parameterized cursor pagination
- `packages/policy-engine/src/index.ts` — `audit.read` in owner/admin ORG_ROLE_PERMISSIONS
- `apps/api-edge/src/index.ts` — import and register audit-facade
- `apps/api-edge/src/env.ts` — EVENTS_WORKER in Env
- `apps/api-edge/wrangler.jsonc` — EVENTS_WORKER stage/prod service bindings
- `apps/api-edge/component.yaml` — events-worker dependency
- `pnpm-lock.yaml` — lockfile updated for new workspace packages
- `tests/contracts/src/events.test.ts` — PublicAuditEntry and ListAuditEntriesResponse shape tests
- `tests/contracts/src/policy.test.ts` — audit.read in ORGANIZATION_ACTIONS test
- `tests/db/src/events.test.ts` — category filtering, cursor+category, safe error tests
- `tests/policy-engine/src/policy-engine.test.ts` — audit.read role matrix, project-role denial, owner permission count fix

## Checks Run

| Command | Result |
|---------|--------|
| `pnpm --filter @saas/events-worker typecheck` | PASS |
| `pnpm --filter @saas/events-worker-tests test` | PASS (17 tests) |
| `pnpm --filter @saas/events-worker build` | PASS |
| `pnpm --filter @saas/api-edge typecheck` | PASS |
| `pnpm --filter @saas/api-edge-tests test` | PASS (148 tests) |
| `pnpm --filter @saas/api-edge build` | PASS |
| `pnpm --filter @saas/contracts typecheck` | PASS |
| `pnpm --filter @saas/contracts-tests test` | PASS (45 tests) |
| `pnpm --filter @saas/db typecheck` | PASS |
| `pnpm --filter @saas/db-tests test -- events` | PASS (37 tests) |
| `pnpm --filter @saas/policy-engine typecheck` | PASS |
| `pnpm --filter @saas/policy-engine-tests test` | PASS (126 tests) |
| `git diff --check` | PASS |

## Assumptions

1. The `./events` export was missing from contracts package.json — added here since the types existed but were unreachable from workers via package exports.
2. Redact paths are stored in various formats (`$.payload.x`, `payload.x`). The redaction function normalizes both by stripping `$.` and `payload.` prefixes before traversing the payload object.
3. The policy-engine test expected 12 owner permissions; updated to 13 to account for `audit.read` being a legitimate owner permission added in a prior task.
4. events-worker pagination uses `occurredAt`-based keyset (not `createdAt` like projects-worker) since audit entries are ordered by occurrence time.
5. `structuredClone` is available in Cloudflare Workers runtime (used for payload redaction deep copy).

## Spec Proposals

None. All implementation follows existing spec patterns.

## Remaining Gaps

- Orun validation not run (requires `kiox` runtime and `intent.yaml`; verifier should confirm no infra jobs are selected).
- No integration/smoke test against live stage environment.
- Per-actor audit lookup remains N+1 within a page (acceptable at current scale per open-risks.md).

## Next Task Dependencies

- Verifier task should inspect post-merge Cloudflare state for evidence that events-worker is private and api-edge binds to same-environment events-worker.
- Future tasks may add audit-by-target routes, security-event query APIs, or event fanout.

## PR Number

77
