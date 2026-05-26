# Task 0035 – Verifier Report

## Summary

Verified public environment archival through projects-worker and api-edge:

- `DELETE /v1/organizations/{orgId}/projects/{projectId}/environments/{environmentId}`
- Project-scoped `environment.delete` policy action (org owner/admin and project_admin only)
- Atomic `environment.archived` event/audit wiring with transaction rollback on failure
- Parent project active-status check before archive
- api-edge forwards DELETE without bearer token or request body

## Files Verified

| File | Change |
|------|--------|
| `packages/policy-engine/src/index.ts` | Added `environment.delete` to owner, admin, project_admin permissions; added to `PROJECT_SCOPED_ACTIONS` and `ALL_KNOWN_ACTIONS` |
| `packages/contracts/src/policy.ts` | Added `environment.delete` to `ORGANIZATION_ACTIONS` |
| `apps/projects-worker/src/handlers/archive-environment.ts` | New handler: policy-gated soft archive + atomic event/audit |
| `apps/projects-worker/src/router.ts` | Added DELETE method dispatch on environment item route |
| `apps/api-edge/src/project-facade.ts` | Allowed DELETE on environment item route |
| `tests/policy-engine/src/policy-engine.test.ts` | Added environment.delete role matrix, scope, cross-org, wrong-project tests |
| `tests/contracts/src/policy.test.ts` | Added environment.delete known action assertion |
| `tests/projects-worker/src/projects-worker.test.ts` | Added 22 archive-environment tests |
| `tests/api-edge/src/project-facade.test.ts` | Added DELETE forwarding, no-bearer, no-body, header, 503, GET preservation tests |

## Checks Run

| Check | Result |
|-------|--------|
| `pnpm --filter @saas/contracts typecheck` | PASS |
| `pnpm --filter @saas/policy-engine typecheck` | PASS |
| `pnpm --filter @saas/projects-worker typecheck` | PASS |
| `pnpm --filter @saas/api-edge typecheck` | PASS |
| `pnpm --filter @saas/contracts-tests test` | PASS (41 tests) |
| `pnpm --filter @saas/policy-engine-tests test` | PASS (116 tests) |
| `pnpm --filter @saas/projects-worker-tests test` | PASS (144 tests) |
| `pnpm --filter @saas/api-edge-tests test` | PASS (136 tests) |
| `pnpm --filter @saas/projects-worker build` | PASS |
| `pnpm --filter @saas/api-edge build` | PASS |
| `git diff --check` | PASS |

## Implementation Verified

### 1. Policy Action

`environment.delete` is properly scoped as a project-scoped action:
- Added to `PROJECT_SCOPED_ACTIONS` set (requires projectId)
- Added to `ALL_KNOWN_ACTIONS` set
- Correct role semantics: only `owner`, `admin`, and `project_admin` can delete environments
- Destructive action excluded from `builder`, `viewer`, `billing_admin`, `project_builder`, `project_viewer`

### 2. Archive Handler

`handleArchiveEnvironment` follows the established pattern from `handleArchiveProject`:
- Checks for required services (SOURCEPLANE_DB, MEMBERSHIP_WORKER, POLICY_WORKER)
- Fetches authorization context from membership-worker
- Authorizes via policy-worker with `environment.delete` action
- Passes parent project check (returns 404 if project missing or archived)
- Uses transaction for atomic operation
- Writes `environment.archived` event with public IDs in payload
- Writes audit entry in `projects` category
- Returns 503 on event append failure (rollback behavior verified)

### 3. Router Integration

- DELETE method properly dispatched to `handleArchiveEnvironment`
- Returns 405 for unsupported methods on environment item
- Returns 401 for missing actor on DELETE

### 4. API Edge Integration

- DELETE allowed on environment item route
- No bearer token forwarded (consistent with existing pattern)
- No request body forwarded

### 5. Parent Project Validation

Tests verify:
- 404 returned when parent project is missing
- 404 returned when parent project is archived
- 404 returned when environment is missing or already archived

## Assumptions Verified

- `archiveEnvironment` repository function already filters by active status and scopes to org+project — SQL `WHERE status = 'active'` ensures this
- `ArchiveEnvironmentResponse` contract type not needed separately (handler returns `successResponse` with `toPublicEnvironment`)
- Environment ID format: `env_` prefix + UUID hex (same as other IDs)

## Remaining Gaps (Out of Scope)

- No restore/unarchive endpoint (excluded per task definition)
- No hard-delete behavior (excluded per task definition)
- Orun validate/plan/run not executed (kiox binary availability not verified)

## Next Task Dependencies

- Task 0036+ may add environment restore, environment update, or filtered lists
- If project restore is added, it should consider restoring previously-archived environments

## Result

**PASS**

## CI Evidence

- CI Run #26435562122: All 23 checks PASS
  - plan: PASS
  - contracts-tests · dev · Verify: PASS
  - policy-engine · dev · Verify: PASS
  - policy-engine-tests · dev · Verify: PASS
  - projects-worker-tests · dev · Verify: PASS
  - api-edge-tests · dev · Verify: PASS
  - contracts · dev · Verify: PASS
  - No db-migrate, Terraform, Supabase, AWS, S3, Secrets Manager, or unrelated infra apply jobs were selected.

## Merge Evidence

- PR #76 merged at `2026-05-26T06:33:08Z`
- Merge commit: `081655e9b98343ace6fd918277b462dade64b1b7`
- Local `main` fast-forwarded to `081655e` (was `9f52313`)
- Repository clean except pre-existing untracked AI artifacts

## PR Number

76