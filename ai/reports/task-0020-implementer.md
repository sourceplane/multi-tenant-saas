# Task 0020 — Implementer Report

## Summary

Added opaque cursor-based pagination for the two existing membership list
endpoints (`GET /v1/organizations` and `GET /v1/organizations/{orgId}/members`).
Default limit is 50, max 100. Cursors are versioned, base64-encoded, and carry
`(created_at, id)` tie-breaker pairs. Invalid pagination params return
`validation_failed`. Authorization and token redaction behavior preserved.

## Files Changed

| File | Change |
|------|--------|
| `specs/contracts/api-guidelines.md` | Clarified V1 list pagination semantics |
| `apps/membership-worker/src/pagination.ts` | New cursor encode/decode/parse helper |
| `apps/membership-worker/src/http.ts` | Added optional `cursor` param to `successResponse` |
| `apps/membership-worker/src/router.ts` | Passes `url` to list handlers |
| `apps/membership-worker/src/handlers/list-organizations.ts` | Uses paged repo method + pagination helper |
| `apps/membership-worker/src/handlers/list-members.ts` | Uses paged repo method + pagination helper; keeps policy auth |
| `packages/db/src/membership/types.ts` | Added `PageQueryParams`, `PagedResult`, `CursorPosition` types and paged methods to interface |
| `packages/db/src/membership/repository.ts` | Implemented `listOrganizationsForSubjectPaged` and `listMembersPaged` |
| `packages/db/src/membership/index.ts` | Exported new types |
| `tests/db/src/membership.test.ts` | 10 new tests for paged repository methods |
| `tests/membership-worker/src/membership-worker.test.ts` | 10 new pagination tests + updated existing tests for new handler signature |
| `tests/api-edge/src/org-facade.test.ts` | 4 new query-string forwarding tests |

## Checks Run

- `pnpm --filter @saas/db typecheck` — pass
- `pnpm --filter @saas/db-tests test` — 177 pass
- `pnpm --filter @saas/contracts typecheck` — pass
- `pnpm --filter @saas/membership-worker typecheck` — pass
- `pnpm --filter @saas/membership-worker-tests test` — 63 pass
- `pnpm --filter @saas/membership-worker build` — pass
- `pnpm --filter @saas/api-edge typecheck` — pass
- `pnpm --filter @saas/api-edge-tests test` — 64 pass
- `pnpm --filter @saas/api-edge build` — pass
- `orun validate` — pass
- `orun plan --changed` — 6 components, 12 jobs (db, db-tests, membership-worker, membership-worker-tests, api-edge-tests, policy-worker)
- `orun run --dry-run` — pass
- `git diff --check` — clean

## Assumptions

- Cursor ordering uses `(created_at DESC, id DESC)` which works without an index
  change for current data volumes. A composite index may be needed at scale.
- The per-member role lookups remain sequential (N+1) within a page. This is
  acceptable given the max page size of 100 and will be optimized in a future task.
- Cursor version field (v:1) allows future format changes without breaking clients.
- `btoa`/`atob` are available in Cloudflare Workers runtime (Web-standard APIs).

## Spec Proposals

None. The api-guidelines clarification added in this task is sufficient.

## Remaining Gaps

- No index on `(created_at, id)` for membership tables — not needed at current
  scale but should be added before high-cardinality organizations.
- Per-member role lookup is still N+1 within a page; batch/join optimization
  deferred.
- `GET /v1/organizations` does not require policy authorization (lists only
  orgs where the actor is a member); future tasks may gate this.

## Next Task Dependencies

- Invitation list/create/revoke endpoints can now be added with pagination
  from day one.
- Member remove/role-update mutations can follow.
- Batch role-lookup optimization can be addressed independently.

## PR Number

61
