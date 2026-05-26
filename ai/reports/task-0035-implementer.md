# Task 0035 – Implementer Report

## Summary

Added public environment archival through projects-worker and api-edge:

- `DELETE /v1/organizations/{orgId}/projects/{projectId}/environments/{environmentId}`
- Project-scoped `environment.delete` policy action (org owner/admin and project_admin only)
- Atomic `environment.archived` event/audit wiring with transaction rollback on failure
- Parent project active-status check before archive
- api-edge forwards DELETE without bearer token or request body

## Files Changed

| File | Change |
|------|--------|
| `packages/policy-engine/src/index.ts` | Added `environment.delete` to owner, admin, project_admin permissions; added to `PROJECT_SCOPED_ACTIONS` and `ALL_KNOWN_ACTIONS` |
| `packages/contracts/src/policy.ts` | Added `environment.delete` to `ORGANIZATION_ACTIONS` |
| `apps/projects-worker/src/handlers/archive-environment.ts` | New handler: policy-gated soft archive + atomic event/audit |
| `apps/projects-worker/src/router.ts` | Added DELETE method dispatch on environment item route |
| `apps/api-edge/src/project-facade.ts` | Allowed DELETE on environment item route |
| `tests/policy-engine/src/policy-engine.test.ts` | Added environment.delete role matrix, scope, cross-org, wrong-project tests |
| `tests/contracts/src/policy.test.ts` | Added environment.delete known action assertion |
| `tests/projects-worker/src/projects-worker.test.ts` | Added 23 archive-environment tests |
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

## Assumptions

- `archiveEnvironment(orgId, projectId, environmentId, archivedAt)` in `@saas/db/projects` already filters by active status and scopes to org+project — no additional SQL guard needed.
- `ArchiveEnvironmentResponse` contract type already existed in `@saas/contracts/projects`.
- `environment.delete` mirrors `project.delete` role semantics: only owner/admin/project_admin (destructive action excluded from builder/viewer/billing_admin/project_builder/project_viewer).
- No migration needed; schema supports environment archival since task 0028/0029.

## Spec Proposals

None required. `environment.delete` aligns with existing destructive-action semantics documented in specs.

## Remaining Gaps

- No restore/unarchive endpoint (out of scope per task definition).
- No hard-delete behavior.
- Orun validate/plan/run not executed (kiox binary availability not verified in this environment).

## Next Task Dependencies

- Task 0036+ may add environment restore, environment update, or filtered lists.
- If project restore is added, it should consider restoring previously-archived environments.

## PR Number

76
