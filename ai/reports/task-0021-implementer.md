# Task 0021 — Implementer Report

## Result

**DONE**

## Summary

PR #62 (`codex/task-0021-invitation-admin-api`) implements policy-gated
invitation administration with three endpoints:

- `POST /v1/organizations/{orgId}/invitations` — create invitation
- `GET /v1/organizations/{orgId}/invitations` — list with cursor pagination
- `DELETE /v1/organizations/{orgId}/invitations/{invitationId}` — revoke

Key design decisions:
- Tokens: 32 random bytes → SHA-256 hash stored in DB; raw only in `DEBUG_DELIVERY=true` response
- Public IDs: `inv_` prefix + UUID hex (no dashes), matching existing `org_`/`mem_` pattern
- Pagination: `(created_at DESC, id DESC)` ordering, base64 versioned cursors, `limit+1` detection
- Authorization: fail-closed, policy denial → 404 (no org enumeration)
- Status derivation: `expired` computed from `expiresAt < now` without DB mutation
- Dependency injection: all handlers accept optional `*Deps` for testability

## Files Changed

| File | Change |
|------|--------|
| `packages/contracts/src/membership.ts` | Add invitation types (`InvitationRole`, request/response interfaces) |
| `packages/db/src/membership/types.ts` | Add `listInvitationsPaged` to `MembershipRepository` |
| `packages/db/src/membership/repository.ts` | Implement cursor-paginated invitation query |
| `apps/membership-worker/src/env.ts` | Add `DEBUG_DELIVERY` to `Env` |
| `apps/membership-worker/src/ids.ts` | Add `invitationPublicId`, `parseInvitationPublicId`, `generateInvitationToken` |
| `apps/membership-worker/src/handlers/create-invitation.ts` | New handler |
| `apps/membership-worker/src/handlers/list-invitations.ts` | New handler |
| `apps/membership-worker/src/handlers/revoke-invitation.ts` | New handler |
| `apps/membership-worker/src/router.ts` | Add invitation route patterns and dispatch |
| `apps/membership-worker/wrangler.jsonc` | Add `DEBUG_DELIVERY` env var per environment |
| `apps/api-edge/src/org-facade.ts` | Route invitation paths to membership-worker |
| `tests/membership-worker/src/membership-worker.test.ts` | 22 new invitation tests |
| `tests/db/src/membership.test.ts` | Pagination integration tests |
| `tests/api-edge/src/org-facade.test.ts` | Invitation facade routing tests |

## Checks

| Check | Result |
|-------|--------|
| `pnpm --filter @saas/contracts typecheck` | Pass |
| `pnpm --filter @saas/db typecheck` | Pass |
| `pnpm --filter @saas/db-tests test` | Pass — 183 tests |
| `pnpm --filter @saas/membership-worker typecheck` | Pass |
| `pnpm --filter @saas/membership-worker build` | Pass |
| `pnpm --filter @saas/membership-worker-tests test` | Pass — 104 tests |
| `pnpm --filter @saas/api-edge typecheck` | Pass |
| `pnpm --filter @saas/api-edge build` | Pass |
| `pnpm --filter @saas/api-edge-tests test` | Pass — 78 tests |
| `orun validate` | Pass |
| `orun plan` | Pass — 21 components × 3 envs → 44 jobs |
| `orun run --dry-run` | Pass — 44 selected |
| `git diff --check` | Clean |

## PR

https://github.com/sourceplane/multi-tenant-saas/pull/62
