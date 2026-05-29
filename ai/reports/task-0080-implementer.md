# Task 0080 — Implementer Report

Membership-worker billing entitlement gating on `limit.members` for invitation creation.

## Summary

Mirrored the projects-worker / `limit.projects` gating pattern (Task 0079) for membership-worker / `limit.members`. Creating a new invitation now consults `billing-worker` via service binding before token generation, invitation insert, or `invite.created` event/audit writes. Billable count is `active members + pending, non-expired invitations`.

## Changes

### Production code
- `apps/billing-worker/src/router.ts` — added `membership-worker` to `ALLOWED_INTERNAL_CALLERS`.
- `apps/membership-worker/src/billing-client.ts` (new) — `checkBillingEntitlement(binding, orgPublicId, key, requestId)` returning a `decision | service_error` discriminated union; `decideMembersLimit(decision, count)` returning `allow | deny(reason) | service_error`. Mirrors projects-worker exactly, with `MEMBERS_LIMIT_ENTITLEMENT_KEY = "limit.members"`.
- `apps/membership-worker/src/env.ts` — added `BILLING_WORKER?: Fetcher`.
- `apps/membership-worker/src/handlers/create-invitation.ts` — gate inserted after policy authorization and before token generation / invitation insert / event-audit. Fails closed on any service / DB / misconfiguration error (503), denies on `disabled` / `not_configured` / `limit_reached` / `malformed_limit` (412 with `details.reason`). Tests inject a `checkEntitlement` seam; tests that omit it opt out of the gate to preserve pre-gate handler assertions.
- `packages/db/src/membership/repository.ts` + `types.ts` — added `countBillableMembers(orgId, now)`. Single parameterized SQL query sums `members WHERE status='active' AND deleted_at IS NULL` plus `invitations WHERE status='pending' AND expires_at > now AND revoked_at IS NULL`.

### Deployment
- `apps/membership-worker/wrangler.jsonc` — `BILLING_WORKER` service binding to `billing-worker-stage` / `billing-worker-prod`.
- `apps/membership-worker/component.yaml` — `dependsOn: billing-worker` added.
- `apps/billing-worker/component.yaml` — removed `dependsOn: membership-worker` to break the new Orun dependency cycle. Service-binding calls are resolved per-request, not at deploy time; the Cloudflare runtime does not require deploy ordering. Both workers now coexist with peer-to-peer service bindings.

### Tests
- `tests/billing-worker/src/billing-worker.test.ts` — added assertion that `membership-worker` caller is accepted on `/v1/internal/billing/entitlements/check`.
- `tests/db/src/membership.test.ts` — `countBillableMembers` parameterized-SQL + happy-path + DB-failure tests.
- `tests/membership-worker/src/membership-worker.test.ts` — extended `createRepo` with `countBillableMembers` + 10 new billing-gate tests (call shape, under/at/over limit, unlimited, disabled, not_configured, malformed valueType, service_error fail-closed, DB-count fail-closed, gate-before-token-and-write).
- `tests/membership-worker/src/{authorization-context,service-principal-bindings}.test.ts` — added `countBillableMembers` stub to satisfy MembershipRepository interface.

## Verification

- Typecheck: `pnpm exec turbo run typecheck --filter=@saas/membership-worker --filter=@saas/membership-worker-tests --filter=@saas/billing-worker --filter=@saas/billing-worker-tests --filter=@saas/db --filter=@saas/db-tests` ✓ all green.
- Full workspace typecheck: only pre-existing `@saas/policy-engine-tests` failure (`Cannot find type definition file for 'node'`) unrelated to this task.
- Tests: `pnpm -w test` ✓ 17/17 suites green. Membership-worker 222/222, billing-worker 46/46, db 501/501, projects-worker 156/156, etc.
- Orun: `orun validate` ✓, `orun plan --changed` ✓ (7 components × 3 envs → 15 jobs), `orun run --plan --dry-run --runner github-actions` ✓ (membership-worker correctly sequenced after billing-worker).
- Lint: skipped — pre-existing repo-wide ESLint v9 config migration issue (multiple workers / tests packages fail at config discovery, unrelated to this task).

## Notes / Risk

- One architectural deviation from the task spec: removed `billing-worker dependsOn membership-worker` to break the Orun cycle introduced by `membership-worker dependsOn billing-worker`. Net effect on deploy: both workers now go through verify/deploy in parallel after `policy-worker`. Both bind to each other via Cloudflare service bindings, which resolve at request time and do not require build-order coupling. Flagged for verifier review.
- Gate is fail-closed: any missing binding, service error, DB error, or malformed entitlement returns 503; explicit denies return 412 with safe `reason` only.
- No raw tokens are generated, no DB writes occur, and no `invite.created` event is emitted on any deny / error path.
- Membership-worker imports only `@saas/contracts/billing` types; no `@saas/db/billing` dependency was added.
