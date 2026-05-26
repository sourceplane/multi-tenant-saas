# Task 0034 — Implementer Report

## Summary

Added the first public environment runtime slice under projects-worker and api-edge:

- `POST /v1/organizations/{orgId}/projects/{projectId}/environments`
- `GET /v1/organizations/{orgId}/projects/{projectId}/environments`
- `GET /v1/organizations/{orgId}/projects/{projectId}/environments/{environmentId}`

Environment creation is authorized via a new project-scoped `environment.create` policy action and writes an `environment.created` event/audit atomically with the environment insert.

## Files Changed

### projects-worker
- `apps/projects-worker/src/ids.ts` — added `environmentPublicId()` and `parseEnvironmentPublicId()`
- `apps/projects-worker/src/router.ts` — added environment collection + item route matching
- `apps/projects-worker/src/handlers/create-environment.ts` — new handler
- `apps/projects-worker/src/handlers/list-environments.ts` — new handler
- `apps/projects-worker/src/handlers/get-environment.ts` — new handler

### api-edge
- `apps/api-edge/src/project-facade.ts` — extended `isProjectRoute` and `handleProjectRoute` to match and forward environment routes

### packages/contracts
- `packages/contracts/src/policy.ts` — added `environment.create` to `ORGANIZATION_ACTIONS`

### packages/policy-engine
- `packages/policy-engine/src/index.ts` — added `environment.create` to `ALL_KNOWN_ACTIONS`, `PROJECT_SCOPED_ACTIONS`, and the role permission maps for owner/admin/builder/project_admin/project_builder

### tests
- `tests/projects-worker/src/projects-worker.test.ts` — 46 new tests for environment handlers and router
- `tests/api-edge/src/project-facade.test.ts` — 13 new tests for environment route forwarding
- `tests/policy-engine/src/policy-engine.test.ts` — 14 new tests for `environment.create` role matrix
- `tests/contracts/src/policy.test.ts` — 2 new assertions for `environment.create` and `environment.read`

## Local Checks and Results

| Check | Result |
|-------|--------|
| `pnpm --filter @saas/projects-worker typecheck` | ✓ pass |
| `pnpm --filter @saas/projects-worker-tests test` | ✓ 126 tests pass |
| `pnpm --filter @saas/projects-worker build` | ✓ pass (161.71 KiB) |
| `pnpm --filter @saas/api-edge typecheck` | ✓ pass |
| `pnpm --filter @saas/api-edge-tests test` | ✓ 130 tests pass |
| `pnpm --filter @saas/api-edge build` | ✓ pass (120.42 KiB) |
| `pnpm --filter @saas/contracts typecheck` | ✓ pass |
| `pnpm --filter @saas/contracts-tests test` | ✓ 40 tests pass |
| `pnpm --filter @saas/policy-engine typecheck` | ✓ pass |
| `pnpm --filter @saas/policy-engine-tests test` | ✓ 102 tests pass |
| `orun validate` | ✓ pass |
| `orun plan --changed` | ✓ 10 components, 22 jobs |
| `orun run --dry-run` | ✓ 22 selected |
| `git diff --check` | ✓ clean |

## Orun Plan Components/Jobs Selected

Components: api-edge, api-edge-tests, contracts, contracts-tests, membership-worker, policy-engine, policy-engine-tests, policy-worker, projects-worker, projects-worker-tests

No db-migrate, Terraform, Supabase, AWS, S3, Secrets Manager, or infra apply jobs were selected.

## Assumptions

- `environment.create` follows the same role semantics as existing project-scoped actions (owner/admin/builder at org level; project_admin/project_builder at project level).
- No `environment.list` action was added; the list route uses existing `environment.read` since explicit `orgId + projectId` scope is already required.
- The `environmentId` field in `PolicyResource` (already defined in contracts) is passed for the get-environment authorization request.
- Slug derivation for environments follows the same rules as projects.

## Spec Proposals

None.

## Remaining Gaps

- Environment update/archive/delete endpoints (future tasks).
- Default-environment bootstrapping on project creation (out of scope).

## PR

**PR #75**: https://github.com/sourceplane/multi-tenant-saas/pull/75
