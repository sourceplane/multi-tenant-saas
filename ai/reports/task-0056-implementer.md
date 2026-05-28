# Task 0056 — Implementer Report

## Summary
Implemented the config-worker read-only API surface: settings, feature flags, and secret metadata endpoints across organization, project, and environment scopes.

## PR
https://github.com/sourceplane/multi-tenant-saas/pull/99

## Branch
`impl/task-0056-config-worker-read-api`

## What Was Built

### Contracts (`packages/contracts`)
- `src/config.ts`: `PublicSetting`, `PublicFeatureFlag`, `PublicSecretMetadata` types with list response envelopes
- `src/policy.ts`: Added `organization.config.read` and `project.config.read` to `ORGANIZATION_ACTIONS`
- `package.json`: Added `./config` export map entry

### Policy Engine (`packages/policy-engine`)
- All org roles (owner, admin, member, viewer) receive `config.read`
- `billing_admin` excluded (no config access)
- `project.config.read` added to `PROJECT_SCOPED_ACTIONS` and `ALL_KNOWN_ACTIONS`

### Config Worker (`apps/config-worker`) — NEW PACKAGE
- **Router** (`router.ts`, 168 lines): 9 route patterns (3 resources × 3 scopes), all GET-only
  - `GET /v1/organizations/{orgId}/config/settings|feature-flags|secrets`
  - `GET /v1/organizations/{orgId}/projects/{prjId}/config/settings|feature-flags|secrets`
  - `GET /v1/organizations/{orgId}/projects/{prjId}/environments/{envId}/config/settings|feature-flags|secrets`
- **Handlers**: `list-settings`, `list-feature-flags`, `list-secrets`, `health`
- **Mappers** (`mappers.ts`): DB entities → public contract types (UUID-to-public-ID translation, no secret material leakage)
- **Supporting**: `ids.ts`, `pagination.ts`, `membership-client.ts`, `policy-client.ts`, `http.ts`, `env.ts`
- **Auth**: fail-closed on membership/policy errors (returns 404, not 500)
- **Config**: `package.json`, `tsconfig.json`, `wrangler.jsonc`, `component.yaml`

### API Edge (`apps/api-edge`)
- `config-facade.ts`: Session resolution → actor header injection → CONFIG_WORKER forwarding
- `env.ts`: Added `CONFIG_WORKER: Fetcher` binding
- `index.ts`: Config route dispatch via `isConfigRoute` / `handleConfigRoute`
- `wrangler.jsonc`: CONFIG_WORKER service binding (both stage and production)

### Tests
- `tests/config-worker/` — 55 tests covering:
  - ID generation and parsing (round-trip, prefixes, malformed input)
  - Cursor-based pagination (encode/decode, limit validation)
  - Mappers (all 3 entity types, null handling, no secret leakage)
  - Router (health, 404, 405, 401, route matching for all 9 patterns)
  - Auth fail-closed (membership errors, policy denial, malformed envelopes)
  - Service unavailability (503 for missing bindings)
  - Request ID handling (custom, generated, invalid)
- `tests/api-edge/config-facade.test.ts` — config facade tests covering:
  - Route matching (all 9 patterns + non-matches)
  - Method enforcement (405 for POST/PUT/DELETE)
  - Service unavailability (503 for missing IDENTITY/CONFIG workers)
  - Forwarding (query params, actor headers, request ID)
  - Error handling (CONFIG_WORKER fetch throws → 503)

## Validation Results
- ✅ `@saas/config-worker` typecheck passes
- ✅ `@saas/api-edge` typecheck passes
- ✅ `@saas/policy-engine` typecheck passes
- ✅ `@saas/contracts` build passes
- ✅ 55 config-worker tests pass
- ✅ 222 api-edge tests pass (7 suites including new config facade)
- ⚠️ Pre-existing `@saas/identity-worker-tests#typecheck` failure (unrelated, fails on main)

## Files Changed
32 files changed, 2127 insertions, 1 deletion

## Design Decisions
1. **Read-only**: All endpoints are GET-only; POST/PUT/DELETE return 405. Mutation endpoints deferred to a future task.
2. **Fail-closed auth**: Membership or policy errors result in 404 (not 500/503), preventing information leakage.
3. **No billing_admin access**: Config read is excluded from billing_admin role, consistent with operational (not billing) scope.
4. **Scope hierarchy**: Routes support org, project, and environment scopes with proper ID validation at each level.
5. **Pattern fidelity**: All patterns (router structure, pagination, membership/policy clients, mappers, test helpers) follow projects-worker exactly.
