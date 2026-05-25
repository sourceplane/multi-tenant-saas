# Task 0030 Implementer Report

## Summary

Added a membership-owned internal authorization-context seam so future non-membership workers (starting with `projects-worker`) can obtain policy-ready membership facts without querying `membership.*` storage directly.

The seam is exposed as `POST /v1/internal/membership/authorization-context` on `membership-worker`. It accepts a subject and orgId, loads active role assignments from the membership repository, maps them to `MembershipFact[]` using the same logic as existing `authorizeViaPolicy` callers, and returns them in a typed response envelope. The route is internal-only (not exposed through `api-edge`).

## Files Changed

| File | Change |
|------|--------|
| `packages/contracts/src/policy.ts` | Added `AuthorizationContextRequest` and `AuthorizationContextResponse` types |
| `apps/membership-worker/src/membership-facts.ts` | New shared helper: `mapRoleAssignmentsToFacts` |
| `apps/membership-worker/src/policy-client.ts` | Refactored to delegate to shared `mapRoleAssignmentsToFacts`; preserves `mapRoleAssignments` export for test compatibility |
| `apps/membership-worker/src/handlers/authorization-context.ts` | New internal route handler with validation, DB check, and fact mapping |
| `apps/membership-worker/src/router.ts` | Wired `/v1/internal/membership/authorization-context` route |
| `tests/contracts/src/policy.test.ts` | 6 new contract type structural tests |
| `tests/membership-worker/src/authorization-context.test.ts` | 16 new handler tests covering success, validation, method, DB missing, and repo failure paths |

## Checks Run

| Check | Result |
|-------|--------|
| `pnpm --filter @saas/contracts typecheck` | PASS |
| `pnpm --filter @saas/contracts-tests test` | PASS (36 tests) |
| `pnpm --filter @saas/membership-worker typecheck` | PASS |
| `pnpm --filter @saas/membership-worker-tests test` | PASS (182 tests) |
| `pnpm --filter @saas/membership-worker build` | PASS |
| `orun validate --intent intent.yaml` | PASS |
| `orun plan --changed --intent intent.yaml` | 5 components × 3 envs → 11 jobs |
| `orun run --plan plan.json --dry-run --runner github-actions` | 11 jobs rendered |
| `git diff --check` | Clean |

## Assumptions

- The internal route does not require authentication headers (`x-actor-subject-id` etc.) because it is never exposed through `api-edge` and is called only via service binding from same-environment Workers.
- `mapRoleAssignments` in `policy-client.ts` is kept as a pass-through export so existing test imports (`import { mapRoleAssignments } from "@membership-worker/policy-client"`) continue to resolve.
- The response uses the standard `successResponse` envelope (`{ data, meta }`) for consistency with all other membership-worker responses.

## Spec Proposals

None. The implementation follows the existing contracts and spec guidance without needing spec changes.

## Remaining Gaps

- Future callers (e.g., `projects-worker`) will need a service binding to `membership-worker` to call this seam. That wiring belongs in the projects-worker task.
- No rate limiting or request-size guard on the internal route. Acceptable because it is only reachable via internal service bindings.
- The route does not verify the requested subject exists as a member — it returns whatever active role assignments match. This matches the policy-worker's existing consumption pattern.

## Next Task Dependencies

- A future task should scaffold `apps/projects-worker` and use this seam to obtain membership facts before calling `policy-worker` for project-scoped authorization.
- That task should add the `MEMBERSHIP_WORKER` service binding to `projects-worker` wrangler config.

## PR Number

71
