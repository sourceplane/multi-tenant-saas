# Task 0022 — Verifier Report

## Summary

PR #63 adds `POST /v1/organizations/{orgId}/invitations/accept` through api-edge → membership-worker. The verifier identified one atomicity blocker: the acceptance CTE used `ON CONFLICT (id) DO NOTHING` on the member and role-assignment INSERTs, which could theoretically leave the invitation marked accepted without creating the member or role assignment if a generated UUID collided. The fix removed those `ON CONFLICT` clauses so any collision raises an error that aborts the entire statement. After the fix, all checks passed and the PR was merged.

## Files Changed

| File | Change |
|------|--------|
| `packages/contracts/src/membership.ts` | Added `AcceptInvitationRequest` and `AcceptInvitationResponse` types |
| `packages/db/src/membership/types.ts` | Added `AcceptInvitationInput` interface |
| `packages/db/src/membership/index.ts` | Exported `AcceptInvitationInput` |
| `packages/db/src/membership/repository.ts` | Rewrote `acceptInvitation` with 3-part CTE; removed `ON CONFLICT (id) DO NOTHING` from member/role INSERTs (verifier fix) |
| `apps/membership-worker/src/ids.ts` | Factored `hashToken()` from `generateInvitationToken()` |
| `apps/membership-worker/src/handlers/accept-invitation.ts` | New handler |
| `apps/membership-worker/src/router.ts` | Added accept route before invitation-ID route |
| `apps/api-edge/src/org-facade.ts` | Added accept route recognition; forwards `x-actor-email` |
| `tests/db/src/membership.test.ts` | 10 acceptance tests |
| `tests/membership-worker/src/membership-worker.test.ts` | 15 handler tests |
| `tests/api-edge/src/org-facade.test.ts` | 7 api-edge tests |

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
| `orun plan --changed` | ✓ 18 jobs |
| `orun run --dry-run` | ✓ 18 selected |
| `git diff --check` | ✓ |
| PR CI run `26370955338` (post-fix) | ✓ 19/19 jobs |
| Post-merge main CI run `26371024844` | ✓ |

## PR Review

- PR #63 is real, was based on current `main` (25ad769), was not draft, was mergeable clean, and had green CI.
- `ai/reports/task-0022-implementer.md` was committed in the PR.
- PR is bounded to Task 0022 scope: acceptance contract types, repository acceptance CTE, token hash helper, membership-worker accept handler/route, api-edge email forwarding and accept route forwarding, focused tests.
- No generated/ignored artifacts committed.
- No secrets, raw tokens, token hashes, or credentials committed, logged, or returned.

## Atomicity Review

- `acceptInvitation` accepts only a token hash, never a raw token.
- Pre-check validates token hash, org ID, email lower, revoked, accepted, and expiry before the CTE.
- The CTE UPDATE also validates `status = 'pending' AND revoked_at IS NULL AND accepted_at IS NULL AND expires_at > $2`.
- After verifier fix: member and role-assignment INSERTs no longer use `ON CONFLICT (id) DO NOTHING`. Any primary key collision raises a unique violation error that aborts the entire statement, rolling back the invitation UPDATE.
- Member `(org_id, subject_id)` uniqueness violation raises 23505 caught by `isUniqueViolation` → returns conflict; invitation is NOT marked accepted because the error aborts the whole statement.
- Role-assignment uniqueness violation similarly aborts the statement.
- Returned role assignment uses `scope_kind = 'organization'` and `scope_ref = NULL`.
- SQL is fully parameterized; no raw tokens in queries.
- No database migration added.

## Live/CI Evidence

- PR branch CI run `26370711117` passed 19/19 jobs (original head `ba5e331`).
- PR branch CI run `26370955338` passed 19/19 jobs (verifier fix head `909fd52`).
- Post-merge main CI run `26371024844` passed (merge commit `28dd671`).

## Assumptions

- Invitation acceptance authorized by token possession + authenticated email match, not policy-worker (invited user is not yet a member).
- `x-actor-email` forwarded for all org routes; downstream workers ignore it for policy-gated routes.
- UUID collision probability (~2^-122) is effectively zero, but the code now correctly fails-closed rather than silently succeeding with partial state.

## Spec Proposals

None.

## Remaining Gaps

- No database uniqueness constraint prevents duplicate pending invitations for same email+org.
- No idempotent acceptance (re-submit returns `already_accepted` → 404, not 200).
- No audit event emitted for acceptance (deferred per non-goal).

## Result

**PASS**

## PR Number

63

## Merge Commit

`28dd671`

## Post-Merge Main CI Run

`26371024844` — completed successfully.
