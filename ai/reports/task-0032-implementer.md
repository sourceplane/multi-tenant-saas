# Task 0032 – Implementer Report

## Summary

Added `GET /v1/organizations/{orgId}/projects` public project-list endpoint with
`project.list` policy action, cursor pagination, and full authorization flow
through api-edge → projects-worker → membership-worker → policy-worker.

## Files Changed

- `packages/contracts/src/policy.ts` – Added `project.list` to `ORGANIZATION_ACTIONS`
- `packages/policy-engine/src/index.ts` – Added `project.list` to role permission
  matrices (owner/admin/builder/viewer) and `ALL_KNOWN_ACTIONS`
- `apps/projects-worker/src/pagination.ts` – New local pagination helper (cursor
  encode/decode, page param parsing)
- `apps/projects-worker/src/handlers/list-projects.ts` – New list handler
- `apps/projects-worker/src/router.ts` – Route GET on collection to list handler
- `apps/api-edge/src/project-facade.ts` – Allow GET on collection route (was 405)
- `tests/contracts/src/policy.test.ts` – Added `project.list` coverage
- `tests/policy-engine/src/policy-engine.test.ts` – Added project.list role matrix
  tests, updated effective-permissions counts
- `tests/projects-worker/src/projects-worker.test.ts` – Added 23 list handler tests
- `tests/api-edge/src/project-facade.test.ts` – Replaced 405 test with forwarding
  test, added 503 test for missing binding

## Checks Run

| Check | Result |
|-------|--------|
| `@saas/contracts typecheck` | ✓ |
| `@saas/contracts-tests test` | ✓ (38 tests) |
| `@saas/policy-engine typecheck` | ✓ |
| `@saas/policy-engine-tests test` | ✓ (90 tests) |
| `@saas/projects-worker typecheck` | ✓ |
| `@saas/projects-worker-tests test` | ✓ (57 tests) |
| `@saas/projects-worker build` | ✓ |
| `@saas/api-edge typecheck` | ✓ |
| `@saas/api-edge-tests test` | ✓ (115 tests) |
| `@saas/api-edge build` | ✓ |
| `orun validate` | ✓ |
| `orun plan --changed` | ✓ (22 jobs, 10 components) |
| `orun run --dry-run` | ✓ |
| `git diff --check` | ✓ |

### Changed Plan Components

api-edge, api-edge-tests, contracts, contracts-tests, policy-engine,
policy-engine-tests, projects-worker, projects-worker-tests + 2 transitive.
No db-migrate, Terraform, Supabase, or infra apply jobs selected.

## Assumptions

- `project.list` is organization-scoped (not project-scoped); no projectId required.
- billing_admin explicitly excluded from project listing per task spec.
- Cursor encoding uses same versioned JSON/base64 scheme as membership-worker but
  is independently implemented (no cross-app import).
- `toPublicProject` reused from create-project handler without relocation.

## Spec Proposals

None.

## Remaining Gaps

- No filtered "my projects" list for users with only project-scoped roles (future task).
- No integration/e2e tests against live workers (existing pattern; covered by unit tests).

## Next Task Dependencies

- Task 0033+ can build on this for project update/archive/delete endpoints.
- Future project-scoped filtered list can add a separate `project.list_own` action.

## PR Number

#73
