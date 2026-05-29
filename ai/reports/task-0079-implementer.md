# Task 0079 — Implementer Report

Agent: Implementer
Branch: `impl/task-0079-projects-entitlement-gate`
PR: #122 — https://github.com/sourceplane/multi-tenant-saas/pull/122

## Summary

Wired `apps/projects-worker` as the first internal consumer of the
billing-worker entitlement-check seam introduced in Task 0078. Project
creation (`POST /v1/organizations/{orgId}/projects`) now consults
`limit.projects` after auth/membership/policy allow and before any
`projects` row or `project.created` event/audit row is written, and
hardened the billing-worker internal route with an explicit
`x-internal-caller` allow-list. This proves the bounded-context
service-binding decision seam can shape behavior in another worker
without expanding the public API surface, adding provider SDKs, or
sharing tables across domains.

The gate is fail-closed: any billing-worker outage, missing binding,
non-OK response, malformed envelope, fetch exception, missing/unknown
`x-internal-caller`, malformed limit, or active-count failure produces a
generic `503 internal_error` (or a stable `precondition_failed` on real
limit-reached / disabled / not-configured denials), and no project or
event row is written.

## Files Changed

New
- `apps/projects-worker/src/billing-client.ts` — `checkBillingEntitlement`
  service-binding call (fails closed on any network/shape error) +
  `decideProjectsLimit` pure decision logic with quantity / unlimited /
  disabled / not_configured / malformed / limit_reached semantics.

Modified — projects-worker
- `apps/projects-worker/src/handlers/create-project.ts` — calls billing
  entitlement after membership/policy allow and before project write;
  computes active count via `countActiveProjects`; denies with
  `precondition_failed` on limit; `503` on any service error; no rows
  written on deny/error.
- `apps/projects-worker/src/env.ts` — adds `BILLING_WORKER?: Fetcher`.
- `apps/projects-worker/wrangler.jsonc` — binds `BILLING_WORKER` to
  `billing-worker-stage` and `billing-worker-prod`.
- `apps/projects-worker/component.yaml` — declares `billing-worker` as
  an Orun dependency.

Modified — billing-worker
- `apps/billing-worker/src/router.ts` — adds `x-internal-caller`
  allow-list (currently `{ projects-worker }`) on
  `/v1/internal/billing/entitlements/check`; rejects missing/unknown
  callers with `403 unauthorized` before any repository access. Public
  api-edge billing facade unchanged.

Modified — db
- `packages/db/src/projects/repository.ts` — adds `countActiveProjects(orgId)`
  helper (parameterized; counts rows where `archived_at IS NULL`; safe
  internal-error mapping).
- `packages/db/src/projects/types.ts` — extends `ProjectsRepository` with
  the new method.

Modified — tests
- `tests/projects-worker/src/projects-worker.test.ts` — adds allow,
  unlimited, disabled-deny, not_configured-deny, malformed-deny,
  over-limit-deny, billing-service-error, count-error, missing-binding
  cases; asserts no project / no event written on deny/error paths.
- `tests/billing-worker/src/billing-worker.test.ts` — caller-gating
  cases: missing header → 403; unknown caller → 403 before repo access;
  allow-listed `projects-worker` proceeds to handler.
- `tests/db/src/projects.test.ts` — `countActiveProjects` happy / empty
  / safe-error coverage.

## Checks Run

- `pnpm --filter @saas/projects-worker typecheck` ✓
- `pnpm --filter @saas/projects-worker-tests test` ✓ 156/156
- `pnpm --filter @saas/billing-worker typecheck` ✓
- `pnpm --filter @saas/billing-worker-tests test` ✓ 45/45
- `pnpm --filter @saas/db-tests test -- projects` ✓ 42/42
- `kiox exec -- orun validate --intent intent.yaml` ✓
- `kiox exec -- orun plan --changed --intent intent.yaml --output plan.json` ✓
  - 8 components × 3 envs → 18 jobs
  - Components: `billing-worker`, `billing-worker-tests`, `db`,
    `db-tests`, `projects-worker`, `projects-worker-tests`,
    `membership-worker`, `policy-worker`
  - No migration apply, Terraform, provider, web-console, or specs-v2
    jobs introduced.
- `kiox exec -- orun run --plan plan.json --dry-run --runner github-actions` ✓
  18 jobs simulated green.

## Assumptions

1. The internal-caller allow-list is treated as a non-secret provenance
   contract (Task 0079 constraint #5). It is enforced inside
   billing-worker against a header presented by the bound caller; only
   Workers explicitly bound over a Cloudflare service binding can
   present it, so it cannot be reached from public traffic.
2. "Active project count" means projects that are not archived
   (`archived_at IS NULL`). This matches existing projects-worker
   semantics for visibility.
3. For quantity comparison we use `<` (strict less than). `limitValue:N`
   permits exactly N active projects (counts 0..N-1 → allow; >=N → deny).
4. The pre-transaction count is computed against the same Hyperdrive
   binding via a transient executor when no injected repository is
   provided. A theoretical TOCTOU race (count just under the limit, two
   concurrent creates land at N) is accepted as out-of-scope for this
   task. A stronger guarantee belongs in a follow-up that adds a
   transactional pre-write count or a per-org advisory lock.
5. Membership/policy ordering is preserved: unauthorized actors never
   reach the billing call, preserving existing no-enumeration policy
   behavior.

## Spec Proposals

None. Behavior maps cleanly onto:
- `specs/components/11-billing.md` (project creation may be blocked by
  plan limits via the entitlement seam)
- `specs/components/03-policy-authorization.md` (entitlement facts come
  from billing; domain services add invariant checks but do not bypass
  policy)
- `specs/components/05-projects-environments.md` (projects-worker
  ownership of project create)

If a future task adds a second internal caller (e.g., environments or
members), we can promote the allow-list to a shared constant exported
from billing contracts; deferring until there's a real second caller to
avoid speculative shape.

## Remaining Gaps

1. Concurrency: see Assumption #4. A transactional count or per-org
   advisory lock around create would close the small TOCTOU window
   between count and insert.
2. Observability: billing-side metrics for allow/deny counts by
   `entitlementKey` and caller would help operate the gate; not in
   scope for Task 0079.
3. UX: the web-console "Create project" flow does not surface
   `precondition_failed` distinctly from other 4xx errors today. A
   small message-mapping follow-up could surface plan-limit denials
   nicely. Explicitly out of scope per the task's "no project-creation
   UI changes" non-goal.

## Next Task Dependencies

This task unblocks:
- A second internal caller (e.g., environments-create gated on
  `limit.environments` or members-invite gated on `limit.members`),
  which can copy the projects-worker pattern almost verbatim and grow
  the billing-worker allow-list.
- A small projects-worker UI polish to surface `precondition_failed`
  denials from plan limits.
- A metering / usage seam (`POST /v1/internal/billing/usage/check` or
  equivalent) for expensive operations, following the same
  caller-identity contract.

## PR Number

#122
