# Task 0019 — Implementer Report

## Summary

Added the first policy-gated member administration read endpoint:
`GET /v1/organizations/{orgId}/members`. The endpoint is served by
`membership-worker`, forwarded through `api-edge` after bearer-token
authentication, and authorized via `policy-worker` using action
`organization.member.list`. Member records use `mem_`-prefixed public IDs and
include organization-scoped role names without exposing internal UUIDs or
project scope references.

## Files Changed

| File | Change |
|------|--------|
| `packages/contracts/src/membership.ts` | Added `PublicMember`, `PublicMemberRoleAssignment`, `ListMembersResponse` types |
| `apps/membership-worker/src/ids.ts` | Added `memberPublicId()` helper |
| `apps/membership-worker/src/handlers/list-members.ts` | New handler for member-list endpoint |
| `apps/membership-worker/src/router.ts` | Added `/v1/organizations/{orgId}/members` route |
| `apps/api-edge/src/org-facade.ts` | Extended route matching and forwarding for members route |
| `tests/membership-worker/src/membership-worker.test.ts` | 10 new tests for member-list behavior |
| `tests/api-edge/src/org-facade.test.ts` | 7 new/updated tests for members route forwarding |

## Checks Run

| Check | Result |
|-------|--------|
| `pnpm --filter @saas/contracts typecheck` | ✓ |
| `pnpm --filter @saas/membership-worker typecheck` | ✓ |
| `pnpm --filter @saas/membership-worker-tests test` | ✓ 43 tests |
| `pnpm --filter @saas/membership-worker build` | ✓ |
| `pnpm --filter @saas/api-edge typecheck` | ✓ |
| `pnpm --filter @saas/api-edge-tests test` | ✓ 60 tests |
| `pnpm --filter @saas/api-edge build` | ✓ |
| `orun validate --intent intent.yaml` | ✓ |
| `orun plan --changed --intent intent.yaml` | ✓ 6 components, 14 jobs |
| `orun run --plan plan.json --dry-run --runner github-actions` | ✓ |
| `git diff --check` | ✓ clean |

## Assumptions

1. `repo.listMembers(orgId)` returns only active members (confirmed via SQL
   `WHERE status = 'active'`).
2. `repo.listRoleAssignments(orgId, subjectId)` returns only non-revoked
   assignments (confirmed via existing filtering in fake repo and real
   repository).
3. Only `scopeKind` (not `scopeRef`) is safe to expose in public responses;
   project-scoped role assignments omit `scopeRef` to avoid raw project UUID
   leakage.
4. Member `subjectId` values (e.g., `usr_xyz`) are already public-safe
   identifiers set by identity-worker at org bootstrap time.
5. No pagination needed for MVP; cursor support can be added in a follow-up.

## Spec Proposals

- Consider adding `parseMemberPublicId()` if future endpoints need to accept
  member public IDs as path parameters.
- `specs/contracts/api-guidelines.md` could document cursor-based pagination
  requirements for list endpoints once the pattern is exercised.

## Remaining Gaps

- No cursor-based pagination on member-list (acceptable for early orgs, needed
  before production scale).
- No identity profile enrichment (email, display name) for member records.
- No audit/event emission for read operations.
- No `DELETE`, `PATCH`, or invitation endpoints for members.

## Next Task Dependencies

- Task 0020 could add member invite/remove/role-update mutation endpoints.
- Pagination support can be a standalone task.
- Identity profile enrichment (returning display names alongside subject IDs)
  depends on cross-service resolution patterns.

## PR Number

60
