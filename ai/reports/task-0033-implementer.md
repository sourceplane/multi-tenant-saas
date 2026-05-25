# Task 0033 – Implementer Report

## Summary

Added project archival through the public API via
`DELETE /v1/organizations/{orgId}/projects/{projectId}`. The endpoint
soft-archives the project (never hard-deletes) and writes a
`project.archived` event/audit entry atomically with the archive mutation.

## Files Changed

| File | Change |
|------|--------|
| `apps/projects-worker/src/handlers/archive-project.ts` | New handler |
| `apps/projects-worker/src/router.ts` | Add DELETE route on project item |
| `apps/api-edge/src/project-facade.ts` | Allow DELETE on project item route |
| `tests/projects-worker/src/projects-worker.test.ts` | 23 new archive tests |
| `tests/api-edge/src/project-facade.test.ts` | 4 new DELETE forwarding tests |

## Checks Run

| Check | Result |
|-------|--------|
| `pnpm --filter @saas/projects-worker typecheck` | ✓ |
| `pnpm --filter @saas/projects-worker build` | ✓ |
| `pnpm --filter @saas/projects-worker-tests test` | 75 pass |
| `pnpm --filter @saas/api-edge typecheck` | ✓ |
| `pnpm --filter @saas/api-edge build` | ✓ |
| `pnpm --filter @saas/api-edge-tests test` | 119 pass |
| `pnpm --filter @saas/contracts typecheck` | ✓ |
| `pnpm --filter @saas/contracts-tests test` | 38 pass |
| `pnpm --filter @saas/policy-engine-tests test` | 90 pass |
| `orun validate` | ✓ |
| `orun plan --changed` | 6 components, 14 jobs |
| `orun run --dry-run` | ✓ (no-op) |
| `git diff --check` | ✓ |

### Changed Plan Components/Jobs

- api-edge: dev/stage/prod verify+deploy
- api-edge-tests: dev verify
- membership-worker: dev/stage/prod verify+deploy
- policy-worker: dev/stage/prod verify+deploy (included as dependency)
- projects-worker: dev/stage/prod verify+deploy
- projects-worker-tests: dev verify

No db-migrate, Terraform, Supabase, AWS, or infra apply jobs selected.

## Assumptions

- `archiveProject` repository method correctly returns `not_found` for
  already-archived or non-existent projects; no additional guard needed.
- The existing `toPublicProject` helper handles archived projects correctly
  (status=archived, archivedAt set).
- Event/audit DB scope columns use raw UUIDs as required by the persistence
  schema; only public payloads use prefixed IDs.

## Spec Proposals

None required.

## Remaining Gaps

- No integration/E2E test against live Supabase (out of scope per task).
- Archived projects still visible via `getProjectById`; the task does not
  require filtering them from the GET item route.

## Next Task Dependencies

- Project update/edit endpoint (if planned) can follow same pattern.
- Project restore/unarchive would reverse the archive mutation.

## PR Number

#74
