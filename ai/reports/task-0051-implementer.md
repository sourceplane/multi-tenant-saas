# Task 0051 – Implementer Report

**PR:** https://github.com/sourceplane/multi-tenant-saas/pull/94
**Branch:** `codex/task-0051-public-api-key-admin-runtime`
**Status:** Ready for review

## What Was Done

Full runtime support for public API-key admin (create/list/revoke) across four packages:

### 1. packages/contracts/src/policy.ts
- Added `organization.api_key.create`, `organization.api_key.list`, `organization.api_key.revoke` to `PolicyAction` union.

### 2. packages/policy-engine/src/index.ts
- Granted all 3 api_key actions to `owner` and `admin` roles.
- Introduced `PROJECT_GRANTABLE_ACTIONS` — org-level actions that `project_admin` can authorize when the resource has a `projectId` matching their membership. This is distinct from `PROJECT_SCOPED_ACTIONS` which *require* projectId.
- Updated `authorize()` to check `PROJECT_GRANTABLE_ACTIONS` for project-scoped roles.
- Added all 3 actions to `ALL_KNOWN_ACTIONS`.

### 3. apps/api-edge/src/org-facade.ts
- Added `ORG_API_KEYS_RE` and `ORG_API_KEY_ID_RE` regex patterns.
- Updated `isOrgRoute()` to match API-key paths.
- Added method validation: POST/GET for collection, DELETE for item.
- Routes API-key requests to `env.IDENTITY_WORKER` (not membership-worker).

### 4. apps/identity-worker
- **env.ts** — Added `MEMBERSHIP_WORKER` and `POLICY_WORKER` Fetcher bindings.
- **wrangler.jsonc** — Added service bindings for both workers (stage + prod).
- **membership-client.ts** — `fetchAuthorizationContext()` for policy authorization flow.
- **policy-client.ts** — `authorizeViaPolicy()` for policy decision point.
- **handlers/api-key-admin.ts** — Three handlers:
  - `handleCreateApiKey`: input validation, policy authorization, key material generation (sk_ prefix, SHA-256 hash), SP creation, membership binding, security event + org audit event. Returns secret once on 201.
  - `handleListApiKeys`: paginated listing with SP enrichment, optional projectId filter via query param.
  - `handleRevokeApiKey`: key lookup, scope-aware authorization, revocation with events. Compensating binding revoke on identity persistence failure.
- **router.ts** — Regex-based route matching for API-key endpoints.

### 5. Tests (58 new, all passing)
- **tests/policy-engine/src/api-key-policy.test.ts** (36 tests): all roles × 3 actions, project_admin scoping (match/mismatch/org-wide), cross-org denial, empty memberships.
- **tests/api-edge/src/api-key-routes.test.ts** (7 tests): route matching, identity-worker forwarding, method validation (405s).
- **tests/identity-worker/src/api-key-admin.test.ts** (15 tests): auth, validation, authorization, create/list/revoke success paths with fake repos.
- Updated existing `listEffectivePermissions` test count (16 → 19).

### 6. All 9 existing test suites pass
No regressions.

## Design Decisions

1. **PROJECT_GRANTABLE_ACTIONS vs PROJECT_SCOPED_ACTIONS**: API-key actions are org-level but should be grantable to project_admin when scoped. Created a separate set rather than overloading PROJECT_SCOPED_ACTIONS (which requires projectId on the resource).

2. **Compensating transaction**: If identity persistence fails after SP membership binding creation, the handler best-effort revokes the binding to avoid orphaned membership state.

3. **Key material**: `sk_` prefixed hex secret, SHA-256 hash stored. Prefix (first 12 chars) stored for display. Secret shown only on creation response.

4. **Event sourcing**: Both identity security events (`recordSecurityEvent`) and org-scoped audit events (`appendEventWithAudit`) are recorded for create and revoke operations.

## Files Changed (16)
- `packages/contracts/src/policy.ts` — 3 new action types
- `packages/policy-engine/src/index.ts` — role grants, PROJECT_GRANTABLE_ACTIONS, authorize logic
- `apps/api-edge/src/org-facade.ts` — routing, method validation
- `apps/identity-worker/src/env.ts` — new bindings
- `apps/identity-worker/wrangler.jsonc` — service bindings
- `apps/identity-worker/src/membership-client.ts` — new
- `apps/identity-worker/src/policy-client.ts` — new
- `apps/identity-worker/src/handlers/api-key-admin.ts` — new (3 handlers)
- `apps/identity-worker/src/router.ts` — route wiring
- `tests/policy-engine/src/policy-engine.test.ts` — count fix
- `tests/policy-engine/src/api-key-policy.test.ts` — new (36 tests)
- `tests/api-edge/src/api-key-routes.test.ts` — new (7 tests)
- `tests/identity-worker/src/api-key-admin.test.ts` — new (15 tests)
- `tests/identity-worker/package.json` — test deps
- `tests/identity-worker/tsconfig.json` — types
- `pnpm-lock.yaml` — lockfile
