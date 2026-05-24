# Task 0022 — Implementer Report

## Summary

Added `POST /v1/organizations/{orgId}/invitations/accept` through api-edge → membership-worker. A signed-in user whose email matches a pending invitation can accept it; acceptance atomically marks the invitation accepted, creates the organization member, and creates an organization-scoped role assignment using the invitation's role—all in a single CTE.

## Files Changed

| File | Change |
|------|--------|
| `packages/contracts/src/membership.ts` | Added `AcceptInvitationRequest` and `AcceptInvitationResponse` types |
| `packages/db/src/membership/types.ts` | Added `AcceptInvitationInput` interface; updated `acceptInvitation` signature |
| `packages/db/src/membership/index.ts` | Exported `AcceptInvitationInput` |
| `packages/db/src/membership/repository.ts` | Rewrote `acceptInvitation` to validate org/email/status pre-check and use 3-part CTE (accept + member + role) |
| `apps/membership-worker/src/ids.ts` | Factored out `hashToken()` from `generateInvitationToken()` |
| `apps/membership-worker/src/handlers/accept-invitation.ts` | New handler: parse/validate body, hash token, call repo, map errors, return public envelope |
| `apps/membership-worker/src/router.ts` | Added `ORG_INVITATIONS_ACCEPT_RE` route before generic invitation-ID route; requires `x-actor-email` header |
| `apps/api-edge/src/org-facade.ts` | Added accept route recognition; `resolveSession` now returns email; forwards `x-actor-email`; method guard excludes accept from DELETE-only invitation-ID check |
| `tests/db/src/membership.test.ts` | Updated accept tests: org/email validation, role assignment, conflict, token hygiene (10 tests) |
| `tests/membership-worker/src/membership-worker.test.ts` | Added 15 handler tests: success, validation, error mapping, no policy call, token hygiene |
| `tests/api-edge/src/org-facade.test.ts` | Added 7 tests: route match, body forwarding, email forwarding, missing-email auth failure, method restriction, bearer redaction |

## Checks Run

| Check | Result |
|-------|--------|
| `pnpm --filter @saas/contracts typecheck` | ✓ |
| `pnpm --filter @saas/db typecheck` | ✓ |
| `pnpm --filter @saas/db-tests test` | ✓ 188 passed |
| `pnpm --filter @saas/membership-worker typecheck` | ✓ |
| `pnpm --filter @saas/membership-worker-tests test` | ✓ 119 passed |
| `pnpm --filter @saas/membership-worker build` | ✓ |
| `pnpm --filter @saas/api-edge typecheck` | ✓ |
| `pnpm --filter @saas/api-edge-tests test` | ✓ 85 passed |
| `pnpm --filter @saas/api-edge build` | ✓ |
| `orun validate` | ✓ |
| `orun plan --changed` | ✓ 8 components × 3 envs → 18 jobs |
| `orun run --dry-run` | ✓ 18 selected |
| `git diff --check` | ✓ no whitespace errors |

## Assumptions

- Invitation acceptance is authorized by token possession + authenticated email match, not policy-worker. The invited user is not yet a member so no role assignments exist for policy evaluation.
- The `x-actor-email` header is forwarded for all org routes (not only accept). This is a minimal cost and simplifies the forwarding code; downstream workers ignore it for policy-gated routes.
- Role assignment `scope_ref` is `NULL` for organization-scoped roles (consistent with bootstrap).
- The CTE derives `role` and `org_id` from the invitation row so callers cannot override them.

## Spec Proposals

None.

## Remaining Gaps

- No database uniqueness constraint prevents two pending invitations for the same email+org. Acceptance of a duplicate would succeed for the first token used; the second would conflict if the member row already exists.
- No idempotent acceptance: if the same user re-submits the same token after success, the repo returns `already_accepted` → 404 (safe but not idempotent-200).
- Audit event for acceptance is not emitted (deferred per non-goal).

## Next Task Dependencies

- Task 0023+ may add idempotent acceptance or duplicate-invitation prevention migrations.
- Audit/event persistence can hook into the acceptance handler once the events Worker is ready.

## PR Number

63
