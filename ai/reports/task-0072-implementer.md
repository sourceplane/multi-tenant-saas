# Task 0072 — Metering Worker — Implementer Report

**Status**: COMPLETE
**PR**: https://github.com/sourceplane/multi-tenant-saas/pull/115
**Branch**: `impl/task-0072-metering-worker`

## What was built

Full metering worker following existing config-worker patterns exactly:

### apps/metering-worker (14 files)
- **src/index.ts** — Worker entry point (fetch handler)
- **src/env.ts** — Env type (SOURCEPLANE_DB, MEMBERSHIP_WORKER, POLICY_WORKER, ENVIRONMENT)
- **src/router.ts** — URL-pattern router with auth, policy checks, org resolution
- **src/http.ts** — Response helpers (success, list, error, notFound, methodNotAllowed, validationError)
- **src/ids.ts** — Public ID parsing (org_, prj_, env_), request ID + usage record ID generation
- **src/metadata.ts** — Metadata validation (max 20 keys, no secrets, value length limits)
- **src/membership-client.ts** — Membership worker service binding client
- **src/policy-client.ts** — Policy worker service binding client
- **src/handlers/record-usage.ts** — POST /v1/organizations/:id/usage
- **src/handlers/ingest-batch.ts** — POST /v1/organizations/:id/usage/batch (max 100 records)
- **src/handlers/get-usage-summary.ts** — GET /v1/organizations/:id/usage/summary
- **src/handlers/check-quota.ts** — POST /v1/organizations/:id/quotas/check
- **src/handlers/list-quota-violations.ts** — GET /v1/organizations/:id/quotas/violations
- **src/handlers/health.ts** — GET /health

### tests/metering-worker (25 tests)
- ids: generateRequestId, parseOrgPublicId, parseProjectPublicId, parseEnvironmentPublicId, generateUsageRecordId
- metadata: null/undefined/valid/arrays/secret-keys/too-many-keys/long-values
- router: health 200/503, 404 unknown routes, 401 unauth, 405 wrong method, invalid org ID, x-request-id preservation/generation
- policy: denied access returns 404, unauthenticated returns 401

### Modified packages
- **packages/policy-engine** — Added organization.metering.read (viewer+), organization.metering.write (admin+), organization.metering.quota.check (admin+)
- **packages/contracts** — Added `./metering` export subpath
- **apps/api-edge** — Added metering-facade.ts, METERING_WORKER env binding, route integration in index.ts, wrangler.jsonc service bindings (stage+prod)
- **tests/policy-engine** — Updated owner permission count 25→27, added organization.metering.read to viewer expected list

## Verification

| Check | Result |
|-------|--------|
| metering-worker typecheck | ✅ clean |
| api-edge typecheck | ✅ clean |
| policy-engine typecheck | ✅ clean |
| contracts typecheck | ✅ clean |
| metering-worker tests | ✅ 25/25 pass |
| policy-engine tests | ✅ 177/177 pass |
| orun validate | ✅ pass |

## Design decisions
- Handler `deps?` parameter pattern for test injection (matches config-worker)
- Actor context from `x-actor-subject-id`/`x-actor-subject-type` headers
- Policy checks via POLICY_WORKER service binding
- Metadata validation rejects secret-like keys, limits to 20 keys, 1000 char values
- Batch ingestion capped at 100 records per request
- 404 returned for policy denials (hide resource existence)
