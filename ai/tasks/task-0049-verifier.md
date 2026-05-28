# Task 0049 Verifier

Agent: Verifier

## Current Repo Context

- Task 0047 is verified PASS and merged via PR #90 at `08c0e7b`. Identity owns persisted `service_principals` and `api_keys` records through migration 060 plus repository create/get/list/revoke primitives.
- Task 0048 is verified PASS and merged via PR #91 at `2a78a5d`. Identity resolves API-key bearers into `service_principal` actors, and `api-edge` now forwards `x-actor-subject-id` / `x-actor-subject-type` without forwarding raw bearer tokens downstream.
- Task 0049 implementer work is on PR #92 (`codex/task-0049-service-principal-role-bindings`). The PR title is `feat(task-0049): service-principal role-binding support`.
- Latest observed PR CI run `26553711720` has 14/15 checks green; `membership-worker · prod · Verify deploy` is still in progress at this orchestrator handoff, so `mergeStateStatus` is currently `UNSTABLE` until CI completes.
- The PR diff is scoped to contracts, policy-engine, membership-worker, focused tests, and the implementer report. No public `api-edge` or identity-worker administration routes are in the diff.
- `ai/reports/task-0049-implementer.md` is now committed on the PR branch and must remain in the final merged history.
- Local workspace also contains unrelated untracked historical `ai/tasks/*` and `ai/reports/*` carryover files. They are not in the PR diff and must remain unstaged/uncommitted during verification.

## Objective

Verify that PR #92 implements exactly the Task 0049 internal service-principal role-binding foundation, preserves subject-ID compatibility with Task 0048 actor forwarding, satisfies the membership/policy bounded-context constraints, and is safe to merge.

If the PR only needs verifier-safe cleanup to become acceptable, make that minimal fix on the PR branch, push it, wait for CI to go green again, then continue verification. If scope drift or correctness issues remain after minimal cleanup, FAIL the task and leave the PR open with explicit blockers.

## PR Boundary

This verifier pass covers exactly:

1. `packages/contracts/src/policy.ts` and `packages/contracts/src/service-principal.ts` changes for the narrow service-principal binding action surface and subject-ID helpers.
2. `packages/policy-engine/src/**` changes that authorize the new service-principal binding actions.
3. `apps/membership-worker/src/**` changes that add internal service-principal binding read/write routes and handler validation.
4. Focused tests in `tests/policy-engine/**`, `tests/policy-worker/**`, and `tests/membership-worker/**` for the new action surface and internal seam.
5. Minimal verifier-only PR cleanup needed to:
   - add `ai/reports/task-0049-implementer.md` to the PR branch if it is still missing;
   - add the verifier report;
   - make any tiny verification-only fix required to satisfy the accepted Task 0049 scope.

Non-goals for this verifier pass:
- no public `GET /v1/auth/api-keys`, `POST /v1/auth/api-keys`, or `DELETE /v1/auth/api-keys/{apiKeyId}` routes
- no `apps/identity-worker` membership/policy/events orchestration
- no `apps/api-edge` route expansion
- no web-console, CLI, or SDK UI
- no billing, metering, notifications, or webhook work
- no unrelated `ai/` cleanup beyond Task 0049 verification artifacts

## Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0049.md`
- `ai/tasks/task-0049-verifier.md`
- `ai/reports/task-0049-implementer.md`
- `ai/state.json`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `specs/constitution.md`
- `specs/product-overview.md`
- `specs/domain-model.md`
- `specs/components/02-identity.md`
- `specs/components/04-organizations-membership.md`
- `specs/contracts/api-guidelines.md`
- `specs/contracts/tenancy-and-rbac.md`
- `packages/contracts/src/policy.ts`
- `packages/contracts/src/service-principal.ts`
- `packages/policy-engine/src/index.ts`
- `apps/membership-worker/src/router.ts`
- `apps/membership-worker/src/handlers/service-principal-bindings.ts`
- `apps/membership-worker/src/handlers/authorization-context.ts`
- `apps/membership-worker/src/policy-client.ts`
- `packages/db/src/membership/types.ts`
- `packages/db/src/membership/repository.ts`
- `tests/policy-engine/src/policy-engine.test.ts`
- `tests/policy-worker/src/**`
- `tests/membership-worker/src/service-principal-bindings.test.ts`
- PR #92 diff, commits, and CI logs

## Required Outcomes

- [ ] Confirm PR #92 maps to Task 0049 only and does not sneak in public API-key admin routes or unrelated bounded-context changes.
- [ ] Ensure `ai/reports/task-0049-implementer.md` is committed on the PR branch.
- [ ] Verify the new policy action surface is minimal, deny-by-default, and limited to owner/admin callers.
- [ ] Verify the internal membership seam fails closed on malformed subject IDs, ambiguous scope, cross-org mismatches, unknown subject types, and invalid role/scope combinations.
- [ ] Verify service-principal binding subject IDs use the same canonical opaque shape that Task 0048-authenticated requests forward downstream via `x-actor-subject-id`.
- [ ] Verify no raw API-key secret, bearer token, or secret-bearing payload is exposed in routes, tests, reports, or logs.
- [ ] Verify local checks and PR CI evidence are both acceptable.
- [ ] If PASS, merge PR #92, fast-forward local `main`, and leave the repo clean.

## Non-Goals

- No API-key lifecycle administration routes.
- No service-principal creation or management UI.
- No identity-worker env binding expansion.
- No membership schema redesign beyond the accepted seam.
- No speculative follow-on work for the later public API-key admin task.

## Constraints

1. Follow Constitution rule 8 (`secure by default`): raw API keys, hashes, bearer material, and secret-bearing error payloads must never be exposed in reports, logs, or public response shapes.
2. Follow Constitution rule 11 (`bounded contexts are real`): identity remains credential-only for this slice; membership owns role assignments; policy owns authorization decisions.
3. Follow `specs/contracts/tenancy-and-rbac.md`: service principals and API keys must be organization-bound, and project-scoped bindings must remain explicit under `orgId + projectId` semantics.
4. Treat PR hygiene as part of verification. Do not accidentally stage unrelated untracked `ai/` carryover files from the local workspace.
5. Merge only after both local verification and GitHub Actions CI are green.

## Acceptance Criteria

✅ PR #92 corresponds exactly to Task 0049 internal binding-foundation scope.

✅ `ai/reports/task-0049-implementer.md` is committed on the PR branch before merge.

✅ `packages/contracts/src/policy.ts` exposes only the minimal service-principal binding action set required for this slice.

✅ `packages/policy-engine/src/index.ts` allows owner/admin callers to manage service-principal bindings and denies builder/viewer/billing_admin by default.

✅ `packages/contracts/src/service-principal.ts` plus the membership-worker handlers preserve Task 0048-compatible subject-ID shape for downstream authorization.

✅ `apps/membership-worker/src/handlers/service-principal-bindings.ts` and `apps/membership-worker/src/router.ts` implement an internal-only seam that fails closed and does not leak cross-org bindings.

✅ Focused local tests pass. At minimum, run and record exact commands equivalent to:
```bash
pnpm exec vitest run tests/policy-engine/src tests/policy-worker/src tests/membership-worker/src
```

✅ Orun validation for changed components passes and is recorded in the report:
```bash
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
```

✅ PR CI logs show the expected checks actually ran successfully, including run `26553711720` or a later rerun if the verifier adds a cleanup commit.

✅ MergeStateStatus is `CLEAN` at merge time.

## Verification

Run and record exact results:

- `git status --short`
- `gh pr view 92 --json files,commits,statusCheckRollup,mergeStateStatus,url`
- `git ls-tree origin/codex/task-0049-service-principal-role-bindings --name-only ai/reports/task-0049-implementer.md`
- `git diff --name-only origin/main...origin/codex/task-0049-service-principal-role-bindings`
- `pnpm exec vitest run tests/policy-engine/src tests/policy-worker/src tests/membership-worker/src`
- `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
- `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
- `/Users/irinelinson/.local/bin/kiox -- orun plan --intent intent.yaml --view dag`
- `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`
- `gh run view 26553711720 --json name,conclusion,jobs`
- any focused inspection commands needed to confirm subject-ID compatibility and secret-safe behavior

If the implementer report is missing, commit only that report (and any required verifier artifact) to the PR branch, push, and wait for CI again before final PASS/FAIL. Do not stage unrelated untracked `ai/` carryover files from the local workspace.

## PR Merge Protocol

- If PASS: merge PR #92, checkout `main`, fast-forward pull from `origin/main`, ensure `git status --short` is clean, and update orchestration state files for the next cycle.
- If FAIL: leave PR #92 open and document exact blockers.
- Never merge a PR with unresolved verification blockers or failing CI.

## When Done Report

Write `ai/reports/task-0049-verifier.md` with sections:

- Result: PASS or FAIL
- Checks
- Issues
- CI Log Review
- Secret Handling Review
- Risk Notes
- Spec Proposals
- Recommended Next Move
- PR Number
