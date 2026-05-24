# Task 0018 — Implementer Report

## Summary

Wired `membership-worker` to `policy-worker` through a private service binding
and added a reusable policy authorization seam. The existing
`GET /v1/organizations/{orgId}` route now authorizes through policy-worker using
action `organization.read` instead of the prior local "any active role" check.

## Files Changed

| File | Change |
|------|--------|
| `apps/membership-worker/src/env.ts` | Added `POLICY_WORKER?: Fetcher` binding |
| `apps/membership-worker/wrangler.jsonc` | Added stage/prod `services` bindings |
| `apps/membership-worker/src/policy-client.ts` | New — authorization helper/client |
| `apps/membership-worker/src/services/organization.ts` | `getOrganization` accepts `PolicyAuthorizer`; fail-closed without it |
| `apps/membership-worker/src/handlers/get-organization.ts` | Wires policy-client to handler; fail-closed when binding missing |
| `apps/membership-worker/component.yaml` | Added `dependsOn: [{component: policy-worker}]` |
| `tests/membership-worker/src/membership-worker.test.ts` | 31 tests covering policy client, fact mapping, allow/deny/failure modes, config |

## Checks Run

| Check | Result |
|-------|--------|
| `pnpm --filter @saas/membership-worker typecheck` | ✓ Pass |
| `pnpm --filter @saas/membership-worker-tests test` | ✓ 31/31 pass |
| `pnpm --filter @saas/membership-worker build` | ✓ Pass |
| `pnpm --filter @saas/policy-worker typecheck` | ✓ Pass |
| `pnpm --filter @saas/policy-worker-tests test` | ✓ 20/20 pass |
| `orun validate --intent intent.yaml` | ✓ All validation passed |
| `orun plan --changed` | ✓ 3 components × 3 envs → 7 jobs |
| `orun run --dry-run --runner github-actions` | ✓ 7 jobs selected |
| `git diff --check` | ✓ No whitespace issues |

## Assumptions

- `Fetcher.fetch` with a synthetic `http://policy-worker/...` URL works for
  service bindings (standard Cloudflare Workers pattern).
- The `role` field from `membership.role_assignments` always contains valid
  `TenancyRole` string values; cast is safe.
- `dependsOn` in `component.yaml` is accepted by Orun (validation passed).

## Spec Proposals

None required.

## Remaining Gaps

- `POST /v1/organizations` and `GET /v1/organizations` are not policy-gated
  (by design — bootstrap and subject-query paths).
- No integration/smoke test exercises the live service binding; covered by
  unit tests with fake Fetcher.

## Next Task Dependencies

- Invitation/member-administration endpoints (Task 0019+) can now use the
  `PolicyAuthorizer` seam by calling `authorizeViaPolicy` with appropriate
  actions.
- No blocking issues.

## PR Number

59
