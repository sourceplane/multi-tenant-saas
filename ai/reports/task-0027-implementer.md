# Task 0027 — Implementer Report

## Summary

- Added `PATCH /v1/organizations/:orgId/members/:memberId` (role update) and `DELETE` (member removal) mutations.
- Both handlers enforce last-owner invariant via `countActiveOwners` (joins role_assignments + organization_members).
- All mutations are wrapped in `executor.transaction()` with atomic event/audit persistence (`membership.updated`, `membership.removed`).
- Policy authorization uses service binding with `organization.member.update_role` and `organization.member.remove` actions.
- api-edge forwards PATCH bodies and validates PATCH/DELETE method constraints on the member ID pattern.
- Added 26 membership-worker tests, 8 api-edge tests, 8 DB tests covering all paths.

## Files Changed

### packages/contracts/src/
- `membership.ts` — Added `UpdateMemberRoleRequest`, `UpdateMemberRoleResponse`, `RemoveMemberResponse` types.

### packages/db/src/membership/
- `types.ts` — Added `revokeAllRoleAssignments` and `countActiveOwners` to `MembershipRepository` interface.
- `repository.ts` — Implemented both methods with parameterized SQL.

### apps/membership-worker/src/
- `ids.ts` — Added `parseMemberPublicId` function.
- `router.ts` — Added `ORG_MEMBER_ID_RE` regex and PATCH/DELETE route dispatch.
- `handlers/update-member-role.ts` — New handler with validation, policy auth, transaction, no-op detection, last-owner guard, event/audit append.
- `handlers/remove-member.ts` — New handler with policy auth, transaction, last-owner guard, revoke-all, event/audit append.

### apps/api-edge/src/
- `org-facade.ts` — Added `ORG_MEMBER_ID_RE`, updated `isOrgRoute`, added method validation, included PATCH in body forwarding.

### tests/
- `tests/db/src/membership.test.ts` — 8 new tests for `revokeAllRoleAssignments` (4) and `countActiveOwners` (4).
- `tests/membership-worker/src/membership-worker.test.ts` — 26 new tests (14 update role, 12 remove member).
- `tests/api-edge/src/org-facade.test.ts` — 8 new tests for member ID pattern forwarding and method validation.

## Checks Run

| Command | Result |
|---------|--------|
| `pnpm --filter @saas/contracts typecheck` | pass |
| `pnpm --filter @saas/db typecheck` | pass |
| `pnpm --filter @saas/membership-worker typecheck` | pass |
| `pnpm --filter @saas/membership-worker build` | pass (dry-run) |
| `pnpm --filter @saas/contracts-tests test` | 18 pass |
| `pnpm --filter @saas/db-tests test` | 236 pass |
| `pnpm --filter @saas/policy-engine-tests test` | 80 pass |
| `pnpm --filter @saas/membership-worker-tests test` | 166 pass |
| `pnpm --filter @saas/api-edge-tests test` | 94 pass |

## Assumptions

- The `randomHex` helper is duplicated in each handler (consistent with existing pattern from task-0024/0026); can be extracted later.
- `revokeAllRoleAssignments` in the update-role handler revokes all org-scoped roles then creates a single new assignment. The non-transactional unit test path uses this simpler approach; the transactional path uses `revokeRoleAssignment` per-role for precision.
- Event payloads include `previousRoles` (array of role strings) and either `role` (for update) or `revokedRoleCount` (for removal).

## Spec Proposals

None.

## Remaining Gaps

- Transaction rollback on event failure is tested implicitly via the "event/audit append failure returns safe error" tests, but not via a real database transaction abort.
- `orun validate/plan/run` commands were not run as they are not available in this environment.

## PR Number

https://github.com/sourceplane/multi-tenant-saas/pull/68
