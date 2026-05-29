# Task 0081 Verifier

Agent: Verifier

## Current Repo Context

- Tasks 0078-0080 established the billing entitlement-check seam and proved two callers: `projects-worker` gates project creation on `limit.projects`, and `membership-worker` gates invitation creation on `limit.members`.
- PR #124 (`impl/task-0081-env-billing-gate`) implements Task 0081: `projects-worker` environment creation is gated on `limit.environments` through the existing billing-worker service-binding seam.
- PR #124 is open, non-draft, mergeable, and currently CLEAN. CI run `26618797766` completed SUCCESS for all 18 jobs on head `bd8e527`.
- The implementer report is present at `ai/reports/task-0081-implementer.md` and records real PR #124.

## Objective

Verify PR #124 against Task 0081, the verifier standard in `agents/orchestrator.md` sections 349-392, and the reusable SaaS specs. If PASS and CI remains green, merge PR #124, sync local `main`, write `ai/reports/task-0081-verifier.md`, and leave the repo clean. If FAIL, leave PR #124 open with clear blockers.

## PR Boundary

1. Verify only the environment-create quota gate in `projects-worker`.
2. Confirm the PR adds/updates:
   - `apps/projects-worker/src/billing-client.ts`
   - `apps/projects-worker/src/handlers/create-environment.ts`
   - `packages/db/src/projects/repository.ts`
   - `packages/db/src/projects/types.ts`
   - focused `tests/projects-worker` and `tests/db` coverage
   - Task 0081 prompt/report files only
3. No scope expansion: no billing mutations, provider adapters, Stripe/payment SDK, webhook ingest, Secrets Store, Queue/KV/Durable Object/Analytics Engine, Terraform, migrations, policy-worker refactor, api-edge route changes, web-console UI changes, or `specs-v2/**` work.

## Read First

- `agents/orchestrator.md` sections 349-392 — verifier standard and merge protocol.
- `ai/tasks/task-0081.md` — original implementer task contract.
- `ai/reports/task-0081-implementer.md` — implementer evidence and assumptions.
- PR #124 diff and commits — `gh pr diff 124`, `gh pr view 124 --json ...`.
- `ai/reports/task-0080-verifier.md` — verified multi-caller entitlement pattern and dependency-graph decision.
- `ai/reports/task-0079-implementer.md` — project-create `limit.projects` first-caller pattern.
- `specs/constitution.md` — bounded contexts, secure-by-default, contract-first behavior.
- `specs/product-overview.md` — quota enforcement before expensive actions.
- `specs/components/05-projects-environments.md` — projects-worker owns projects/environments and must carry explicit `orgId + projectId` for environments.
- `specs/components/11-billing.md` — billing owns entitlements; product surfaces may be blocked by plan limits.
- `specs/orun-golden-path.md` — validation and CI plan expectations.

## Required Outcomes

- [ ] PR #124 maps exactly to Task 0081 with no unrelated state/docs/UI/provider/infrastructure churn.
- [ ] `handleCreateEnvironment` calls billing-worker's internal entitlement seam with `entitlementKey: "limit.environments"` and `x-internal-caller: projects-worker` through the existing service binding.
- [ ] Billing is called only after body validation, membership authorization-context lookup, and `environment.create` policy allow.
- [ ] Billing/count checks occur before environment UUID/event UUID/audit UUID generation, `createEnvironment`, and `appendEventWithAudit`.
- [ ] Denied, malformed, missing-binding, billing-error, and count-error paths do not create environment rows, append `environment.created`, or leak SQL/provider/internal details.
- [ ] `limit.environments` quantity semantics are explicit and tested: unlimited `limitValue:null` allows; finite non-negative limits allow only while active environment count is below the limit; disabled/not_configured/malformed/limit_reached deny with safe 412 details; service/count failures return generic 503.
- [ ] Repository counting is projects-owned and scoped to `orgId + projectId`, excluding archived/non-active environments as intended.
- [ ] Existing `limit.projects` behavior remains unchanged.
- [ ] Bounded-context imports remain clean: projects-worker uses billing contracts/service binding only and does not import `@saas/db/billing` or query `billing.*`; billing-worker does not read projects persistence.
- [ ] Public api-edge exposure remains unchanged; the internal billing entitlement path remains non-public.
- [ ] All local checks and PR CI pass.

## Non-Goals

- No new feature work while verifying.
- No provider adapter, payment, checkout/portal, webhook, seeded entitlement, migration, or UI changes.
- No state-file completion update unless the verifier actually merges PR #124; if verification fails, report blockers only.

## Constraints

1. Merge only if local verification and PR CI logs are both acceptable.
2. Never merge with unresolved blockers, failing/pending CI, or mergeStateStatus other than CLEAN/MERGEABLE.
3. If verifier adds a report or small verifier-only fix to the PR branch before merge, push it and wait for CI again before merging.
4. Do not commit secret material. Reports may name run IDs and non-secret resource names only.
5. After PASS merge, checkout `main`, fast-forward from `origin/main`, run `git status --short`, and leave no uncommitted local changes.

## Acceptance Criteria

✅ PR metadata is acceptable:

```bash
gh pr view 124 --json number,title,state,headRefName,isDraft,mergeStateStatus,mergeable,headRefOid,baseRefName,url,statusCheckRollup
```

✅ Changed-file boundary is limited to Task 0081 scope:

```bash
gh pr diff 124 --name-only
```

✅ Local focused checks pass:

```bash
pnpm --filter @saas/projects-worker typecheck
pnpm --filter @saas/projects-worker-tests test
pnpm --filter @saas/db-tests test -- projects
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
```

✅ PR CI run `26618797766` or newer has all checks green, and logs show expected Orun plan/run behavior.

✅ Code inspection confirms gate ordering and no-side-effect deny/error paths.

✅ If PASS: PR #124 is squash-merged, local `main` is synced to the merge commit, and `ai/reports/task-0081-verifier.md` is written with Result: PASS.

## Verification

Verifier should:

1. Check out PR #124 or inspect its diff from the current branch.
2. Confirm implementer report exists on the PR branch and names PR #124.
3. Inspect `apps/projects-worker/src/handlers/create-environment.ts` for exact ordering: validation -> membership auth-context -> policy allow -> billing/count gate -> UUID generation -> create environment -> append event/audit.
4. Inspect `apps/projects-worker/src/billing-client.ts` for parity with the verified `limit.projects` quantity-gate semantics and safe error handling.
5. Inspect `packages/db/src/projects/repository.ts` and `types.ts` for `countActiveEnvironments(orgId, projectId)` or equivalent, parameterized SQL, correct active-status filter, and safe error scrubbing.
6. Inspect tests in `tests/projects-worker/src/projects-worker.test.ts` and `tests/db/src/projects.test.ts` for allow, unlimited, disabled, not_configured, malformed, over-limit, billing service error, count error, missing binding, authorization/policy-deny no-billing, and no-create/no-event side-effect assertions.
7. Run the local checks listed above and compare the changed-plan job scope with PR CI.
8. Inspect PR CI logs, including successful jobs, not just status summaries.
9. Review secret safety and bounded-context imports.
10. If PASS and CI remains green, merge PR #124, sync main, write the verifier report, and update state/context files as appropriate. If FAIL, write a clear blocker report and do not merge.

## Verifier Merge Protocol

Follow `agents/orchestrator.md` sections 377-392 exactly:

- Prefer `/Users/irinelinson/.local/bin/kiox` when `kiox` is not on PATH.
- Run local Orun validate, changed-plan, and dry-run.
- Inspect GitHub Actions logs with `gh`, including successful jobs.
- Merge only after local checks and PR CI logs are acceptable.
- After merge, checkout `main`, fast-forward pull from `origin/main`, and run `git status --short`.
- Never merge a PR with unresolved verification blockers.

## When Done Report

Write `/ai/reports/task-0081-verifier.md` with:

- Result: PASS or FAIL
- Summary
- Checks
- CI Log Review
- Secret Handling Review
- Issues
- Risk Notes
- Spec Proposals
- Live Resource Evidence
- Recommended Next Move
- PR Number
