# Task 0017 — Implementer Report

## Summary

Added the V1 policy authorization seam: a deterministic policy-as-code engine
(`@saas/policy-engine`) plus a deployable internal `policy-worker` that exposes
the shared authorization contract through internal JSON routes.

The engine implements deny-by-default RBAC with the V1 role/action matrix
covering organization, project, environment, billing, member, and invitation
semantics. Cross-organization access is denied. Project roles are scoped to
matching `orgId`/`projectId` pairs. Unknown actions, roles, and future fact
shapes are handled safely without widening access.

## Files Changed

### New Files

- `packages/contracts/src/policy.ts` — Policy contract types
- `packages/policy-engine/package.json` — Engine package manifest
- `packages/policy-engine/tsconfig.json` — TypeScript config
- `packages/policy-engine/tsconfig.build.json` — Build config
- `packages/policy-engine/component.yaml` — Orun component metadata
- `packages/policy-engine/src/index.ts` — Engine implementation
- `apps/policy-worker/package.json` — Worker package manifest
- `apps/policy-worker/tsconfig.json` — TypeScript config
- `apps/policy-worker/wrangler.jsonc` — Cloudflare Worker config
- `apps/policy-worker/component.yaml` — Orun component metadata
- `apps/policy-worker/src/index.ts` — Worker entry point
- `apps/policy-worker/src/env.ts` — Environment interface
- `apps/policy-worker/src/router.ts` — Route dispatch and request ID
- `apps/policy-worker/src/http.ts` — Response envelope helpers
- `apps/policy-worker/src/handlers/health.ts` — Health endpoint
- `apps/policy-worker/src/handlers/authorize.ts` — Authorize route
- `apps/policy-worker/src/handlers/effective-permissions.ts` — Permissions route
- `apps/policy-worker/src/handlers/validate-role-assignment.ts` — Validation route
- `tests/policy-engine/package.json` — Test package manifest
- `tests/policy-engine/tsconfig.json` — Test TypeScript config
- `tests/policy-engine/component.yaml` — Orun component metadata
- `tests/policy-engine/src/policy-engine.test.ts` — 78 engine tests
- `tests/policy-worker/package.json` — Test package manifest
- `tests/policy-worker/tsconfig.json` — Test TypeScript config
- `tests/policy-worker/component.yaml` — Orun component metadata
- `tests/policy-worker/src/policy-worker.test.ts` — 17 worker tests

### Modified Files

- `packages/contracts/package.json` — Added `./policy` export
- `packages/contracts/src/index.ts` — Re-exported policy module
- `pnpm-lock.yaml` — Updated lockfile

## Checks Run

```
pnpm --filter @saas/contracts typecheck           ✓
pnpm --filter @saas/contracts-tests test          ✓ (8 tests)
pnpm --filter @saas/policy-engine typecheck       ✓
pnpm --filter @saas/policy-engine-tests test      ✓ (78 tests)
pnpm --filter @saas/policy-worker typecheck       ✓
pnpm --filter @saas/policy-worker build           ✓ (36.47 KiB)
pnpm --filter @saas/policy-worker-tests test      ✓ (17 tests)
orun validate --intent intent.yaml                ✓
orun plan --changed --intent intent.yaml          ✓ (5 components × 3 envs → 11 jobs)
orun run --plan plan.json --dry-run               ✓ (11 selected, no migrations)
```

## Assumptions

- Admin role intentionally does NOT include billing permissions (owner or
  billing_admin required for billing access).
- Builder role can create projects but cannot delete them (delete requires
  admin or owner).
- Project roles do not grant organization-level actions (e.g., a
  project_admin cannot read the organization).
- `project.create` is not considered project-scoped (it's an org-level action
  to create a new project within the org).
- The policy engine uses the existing `POLICY_VERSION = 1` constant from
  contracts for all responses.

## Spec Proposals

None required. The existing composition (`cloudflare-worker-turbo`) handles
the policy-worker deployment correctly with `workers_dev: false` for
stage/prod.

## Remaining Gaps

- No caller wiring (api-edge, membership-worker, etc. do not yet call policy).
- No POLICY_WORKER service bindings in existing Workers.
- No policy persistence or user-authored policy DSL.
- No audit/event emission from policy decisions.
- No membership invitation or member administration routes.

## Next Task Dependencies

- Task 0018+ should wire `membership-worker` → `policy-worker` service binding
  for invitation/member-admin mutations.
- `api-edge` should gain a POLICY_WORKER binding when public policy-aware
  routes are added.
- Invitation management and member administration can now use the policy
  contract to check authorization before allowing mutations.

## PR Number

58
