# Task 0081 — Verifier Report

## Result: PASS

## Summary

PR #124 (`impl/task-0081-env-billing-gate`) extends the billing entitlement seam established by Tasks 0078–0080 to a third caller: `projects-worker` environment creation, gated on `limit.environments`. The implementation reuses the verified quantity-gate pattern by extracting a private `decideQuantityGate(...)` helper in `billing-client.ts` that backs both `decideProjectsLimit` (existing, unchanged behavior) and new `decideEnvironmentsLimit`. Only deny copy differs between the two — the malformed/disabled/not_configured/limit_reached branch matrix is shared. Repository adds `countActiveEnvironments(orgId, projectId)` scoped to `projects.environments` with `status = 'active'`. The handler enforces ordering: body validation → membership authorization-context → `environment.create` policy allow → billing entitlement → active count → quantity gate → UUID generation → `createEnvironment` + `appendEventWithAudit` inside the existing `executor.transaction(...)` callback. Fail-closed on every binding/service/count error path. Squash-merged at `2037922` after all checks PASS.

## Checks

| Check | Result |
|---|---|
| PR metadata: OPEN, non-draft, MERGEABLE, mergeStateStatus CLEAN, head `bd8e527` | PASS |
| Changed-file boundary matches Task 0081 scope (7 files: 2 projects-worker, 2 db, 2 tests, 1 implementer report; +1 task prompt) | PASS |
| Implementer report committed to PR branch (`git ls-tree origin/impl/task-0081-env-billing-gate ai/reports/task-0081-implementer.md`) | PASS |
| Handler ordering: validation → membership → policy → billing+count → UUID → create+event | PASS |
| Billing call uses service binding + `x-internal-caller: projects-worker` + `entitlementKey: "limit.environments"` + `orgPublicId` | PASS |
| `decideEnvironmentsLimit` quantity semantics: unlimited (limitValue null) allows; count < limit allows; count >= limit denies `limit_reached`; non-quantity valueType denies `malformed_limit`; disabled/not_configured deny with safe 412 reason | PASS |
| Fail-closed paths: missing BILLING_WORKER binding → 503, billing fetch throw → 503, billing non-OK → 503, malformed envelope → 503, count repo failure → 503; none create env/event/audit rows | PASS |
| `countActiveEnvironments` is projects-owned, parameterized SQL, scoped by `org_id + project_id + status='active'`, safe error scrubbing (no connection strings / SQL leaked) | PASS |
| `decideProjectsLimit` (`limit.projects`) behavior unchanged — extracted helper preserves the same matrix, called with project-specific copy | PASS |
| Bounded-context imports clean: projects-worker imports `@saas/contracts/billing` only; does NOT import `@saas/db/billing` or query `billing.*`; billing-worker untouched | PASS |
| `pnpm --filter @saas/projects-worker typecheck` | PASS (0 errors) |
| `pnpm --filter @saas/projects-worker-tests test` → 170/170 | PASS |
| `pnpm --filter @saas/db-tests test -- projects` → 49/49 | PASS |
| `kiox -- orun validate --intent intent.yaml` | PASS |
| `kiox -- orun plan --changed` → 7 components × 3 envs → 17 jobs (plan `50c11776fa37`) | PASS |
| `kiox -- orun run --plan ... --dry-run --runner github-actions` → all 17 simulated SUCCESS | PASS |
| PR CI run `26618797766`: 18/18 SUCCESS (plan + 17 verify/verify-deploy jobs) — matches local plan exactly | PASS |
| Public api-edge surface unchanged; internal `/v1/internal/billing/entitlements/check` remains non-public | PASS |
| Test coverage: allow, unlimited, scope (orgId+projectId), at-limit deny, disabled, not_configured, malformed_limit, non-OK billing, fetch-throw, malformed envelope, count-error, missing binding, policy-deny no-billing | PASS |

## CI Log Review

PR CI run `26618797766` (head `bd8e527`) completed at 2026-05-29T04:58:05Z. All 18 jobs SUCCESS:

- `plan` job: SUCCESS. Same 7-component × 3-env matrix that local `orun plan --changed` resolved.
- `db · {dev,stage,prod} · Verify` (3 jobs): SUCCESS.
- `db-tests · dev · Verify` and `projects-worker-tests · dev · Verify`: SUCCESS — same tests that local run reports 170/49 PASS.
- `policy-worker / billing-worker / membership-worker / projects-worker · {dev,stage,prod} · Verify deploy` (12 jobs): SUCCESS — all four Workers verify deploy across all envs.

No surprising jobs, no flaky retries, no warnings escalated. The plan-only PR profile is consistent with the merge protocol (apply jobs run on main CI post-merge).

## Secret Handling Review

- No tokens, keys, or connection strings introduced anywhere in the diff.
- `INTERNAL_CALLER_HEADER = "x-internal-caller"` and value `"projects-worker"` are non-secret provenance markers, only honored over service binding.
- Error responses use generic envelopes (`internal_error` / `precondition_failed`) — no SQL, provider, or stack content leaks.
- `countActiveEnvironments` wraps the executor call in try/catch and returns `safeError("Failed to count active environments")`; tested explicitly against a poisoned `connection to 10.0.0.1:5432 refused` error to confirm the IP is scrubbed.
- Billing client returns `{ kind: "service_error" }` for every failure shape (network throw, non-OK, malformed JSON, missing/typed-wrong envelope fields) — the handler maps these uniformly to 503 with no detail.
- Event payload uses public IDs (`environmentPublicId`, `projectPublicId`, `orgPublicId`) — no raw UUIDs in event/audit payload.

## Issues

None. No verifier fixes were required on the PR branch.

## Risk Notes

- Quantity semantics here are non-atomic with the actual environment insert: the gate reads `countActiveEnvironments` and then the transaction creates the row. Two concurrent requests at `count = limit - 1` can both pass the gate and both succeed. This matches the same risk profile accepted in Task 0079 for `limit.projects`. A future hardening pass could move the count under a SERIALIZABLE transaction or use a count-and-insert CTE with a check constraint — out of scope for Task 0081, recommend tracking as a follow-up only if real abuse appears.
- `decideQuantityGate` rejects `activeCount` that is non-finite or negative as `service_error`. Given the repo coerces strings/bigints and rejects NaN at the source, this branch is defense in depth; correct behavior either way.
- The handler builds a pre-transaction executor for the count when injected deps are absent, then uses a separate `executor!.transaction(...)` for the write. This is consistent with the existing project-creation handler's seam but means the count and the write are not in the same connection. Acceptable for a soft quota gate.

## Spec Proposals

None required. Task 0081 cleanly composes existing contracts in `specs/components/05-projects-environments.md` (projects-worker owns environments, explicit `orgId + projectId`) and `specs/components/11-billing.md` (billing owns entitlements). No drift.

## Live Resource Evidence

PR CI is plan-only by design; live infrastructure verification belongs on the post-merge main CI run.

- Squash merge commit: `2037922022857cb63069d7688e1fcb684bc23eca`
- Merged at: 2026-05-29T05:08:18Z
- Local `main` fast-forwarded to merge commit; `git status --short` clean of repo code (only orchestration state files remain modified per merge protocol).
- No new infrastructure was provisioned by this PR (no Terraform, no migrations, no new bindings). Worker code change ships via the existing projects-worker deploy pipeline on main CI. No wrangler/Terraform live-resource verification required for this task.

## Recommended Next Move

Task 0081 complete on main. Next orchestrator cycle should evaluate one of the post-quota candidates:

1. Surface plan-limit / `precondition_failed` copy in `apps/web-console` create-project and create-environment flows so users see clear quota messages.
2. Add observability around entitlement decisions by caller × key (counts only, no provider payloads/secrets) — billing-worker is the natural emitter.
3. Continue billing provider-adapter scaffolding for privileged read-sync / webhook intake, still separate from public billing mutation surfaces.

## PR Number

**#124** — https://github.com/sourceplane/multi-tenant-saas/pull/124
