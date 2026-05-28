# Task 0048 Verifier

Agent: Verifier

## Current Repo Context

- Task 0047 is verified PASS and merged via PR #90 at `08c0e7b`. Identity now owns persisted `service_principals` and `api_keys` records through migration 060 plus repository create/get/list/revoke primitives.
- Task 0048 implementer work is on PR #91 (`task-0048/api-key-bearer-resolution`). The PR title is `feat: API key bearer resolution for service_principal auth`.
- PR #91 is currently mergeable (`mergeStateStatus: CLEAN`) and the latest observed CI run `26551391669` is green. The run completed successfully with plan, contracts, identity-worker tests, api-edge tests, and all expected verify/deploy jobs passing.
- The PR diff is scoped to 15 files under `apps/identity-worker`, `apps/api-edge`, `packages/contracts`, `packages/db`, and focused tests. No API-key administration routes are in the diff.
- Current repo reality still has one workflow gap to verify before merge: `ai/reports/task-0048-implementer.md` exists locally in this checkout but is not committed on the PR branch yet.
- Local workspace also contains untracked historical `ai/tasks/*` and `ai/reports/*` carryover files unrelated to Task 0048. They are not in the PR diff and must remain unstaged/uncommitted during verification.

## Objective

Verify that PR #91 implements exactly the Task 0048 API-key bearer actor-resolution seam, preserves existing session-backed behavior, satisfies the identity/api-edge contract constraints, and is safe to merge.

If the PR only needs verifier-safe cleanup to become acceptable, make that minimal fix on the PR branch, push it, wait for CI to go green again, then continue verification. If scope drift or correctness issues remain after minimal cleanup, FAIL the task and leave the PR open with explicit blockers.

## PR Boundary

This verifier pass covers exactly:

1. `packages/contracts/src/auth.ts` actor-aware bearer-resolution contract changes.
2. `apps/identity-worker/src/**` changes that add API-key bearer resolution through `resolveBearer()` and `GET /v1/auth/resolve`.
3. `apps/api-edge/src/**` changes that consume the new identity response and forward correct actor headers for `service_principal` actors on org/project/audit routes.
4. Focused tests in `tests/identity-worker/**` and `tests/api-edge/**` for the new bearer-resolution seam.
5. Minimal verifier-only PR cleanup needed to:
   - add `ai/reports/task-0048-implementer.md` to the PR branch if it is still missing;
   - add the verifier report;
   - make any tiny verification-only fix required to satisfy the accepted Task 0048 scope.

Non-goals for this verifier pass:
- no `POST /v1/auth/api-keys`, `GET /v1/auth/api-keys`, or `DELETE /v1/auth/api-keys/{apiKeyId}` administration routes
- no service-principal creation UX, CLI, or web-console surface
- no membership or policy role-assignment redesign
- no billing, metering, notifications, or webhook work
- no unrelated `ai/` cleanup beyond Task 0048 verification artifacts

## Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0048.md`
- `ai/tasks/task-0048-verifier.md`
- `ai/reports/task-0048-implementer.md`
- `ai/state.json`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `specs/constitution.md`
- `specs/product-overview.md`
- `specs/components/01-edge-api.md`
- `specs/components/02-identity.md`
- `specs/contracts/api-guidelines.md`
- `specs/contracts/tenancy-and-rbac.md`
- `packages/contracts/src/auth.ts`
- `packages/db/src/identity/index.ts`
- `apps/identity-worker/src/services/auth.ts`
- `apps/identity-worker/src/handlers/resolve-bearer.ts`
- `apps/identity-worker/src/router.ts`
- `apps/api-edge/src/resolve-actor.ts`
- `apps/api-edge/src/org-facade.ts`
- `apps/api-edge/src/project-facade.ts`
- `apps/api-edge/src/audit-facade.ts`
- `tests/identity-worker/src/resolve-bearer.test.ts`
- `tests/identity-worker/src/helpers/fake-repository.ts`
- `tests/api-edge/src/org-facade.test.ts`
- `tests/api-edge/src/project-facade.test.ts`
- `tests/api-edge/src/audit-facade.test.ts`
- PR #91 diff, commits, and CI logs

## Required Outcomes

- [ ] Confirm PR #91 maps to Task 0048 only and does not sneak in API-key admin routes or unrelated bounded-context changes.
- [ ] Ensure `ai/reports/task-0048-implementer.md` is committed on the PR branch.
- [ ] Verify the contract change is backward-compatible for existing user-session consumers.
- [ ] Verify identity resolves both bearer session tokens and active API keys, and fails closed for revoked, expired, malformed, or unknown credentials.
- [ ] Verify api-edge forwards `x-actor-subject-id` and `x-actor-subject-type=service_principal` correctly for organization/project/audit route forwarding, without forwarding raw bearer tokens downstream.
- [ ] Verify no raw API-key secret, bearer token, or key hash is exposed in response shapes, logs, reports, or tests beyond safe fixtures and hashes already required by persistence seams.
- [ ] Verify local checks and PR CI evidence are both acceptable.
- [ ] If PASS, merge PR #91, fast-forward local `main`, and leave the repo clean.

## Non-Goals

- No API-key lifecycle administration routes.
- No service-principal role assignment creation or management surface.
- No new identity security-event or org-audit mutation work beyond what already exists.
- No web-console, CLI, or SDK API-key management UX.
- No membership or policy schema changes.

## Constraints

1. Follow Constitution rule 8 (`secure by default`): raw API keys, hashes, session bearer material, and secret-bearing error payloads must never be exposed in reports, logs, or public response shapes.
2. Follow Constitution rule 11 (`bounded contexts are real`): identity validates credentials and identifies the actor; membership/policy remain the source of authorization facts and decisions.
3. Follow `specs/contracts/api-guidelines.md`: the public edge must resolve the acting user or service principal before dispatching to internal services; explicit organization/project selection rules must remain intact.
4. Keep compatibility for current session-backed consumers. Any contract extension must remain backward-compatible.
5. Treat PR hygiene as part of verification. Do not accidentally stage unrelated untracked `ai/` carryover files from the local workspace.
6. Merge only after both local verification and GitHub Actions CI are green.

## Acceptance Criteria

✅ PR #91 corresponds exactly to Task 0048 auth-resolution-only scope.

✅ `ai/reports/task-0048-implementer.md` is committed on the PR branch before merge.

✅ `packages/contracts/src/auth.ts` exposes an actor-aware bearer-resolution contract that remains compatible with existing session-backed callers.

✅ `apps/identity-worker/src/services/auth.ts` and `apps/identity-worker/src/handlers/resolve-bearer.ts` safely resolve both session tokens and active API keys backed by active service principals.

✅ Revoked, expired, deleted, suspended, malformed, or unknown API-key credentials fail closed with safe error behavior and no secret leakage.

✅ `apps/api-edge/src/resolve-actor.ts` plus the org/project/audit facades forward `x-actor-subject-id` and `x-actor-subject-type=service_principal` correctly, while continuing not to forward raw bearer tokens to downstream workers.

✅ Focused local tests pass. At minimum, run and record exact commands equivalent to:
```bash
pnpm exec vitest run tests/identity-worker/src/resolve-bearer.test.ts tests/api-edge/src/org-facade.test.ts tests/api-edge/src/project-facade.test.ts tests/api-edge/src/audit-facade.test.ts
```

✅ Orun validation for changed components passes and is recorded in the report:
```bash
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
```

✅ PR CI logs show the expected checks actually ran successfully, including run `26551391669` or a later rerun if the verifier adds a cleanup commit.

✅ MergeStateStatus is `CLEAN` at merge time.

## Verification

Run and record exact results:

- `git status --short`
- `gh pr view 91 --json files,commits,statusCheckRollup,mergeStateStatus,url`
- `git ls-tree origin/task-0048/api-key-bearer-resolution --name-only ai/reports/task-0048-implementer.md`
- `git diff --name-only origin/main...origin/task-0048/api-key-bearer-resolution`
- `pnpm exec vitest run tests/identity-worker/src/resolve-bearer.test.ts tests/api-edge/src/org-facade.test.ts tests/api-edge/src/project-facade.test.ts tests/api-edge/src/audit-facade.test.ts`
- `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
- `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
- `/Users/irinelinson/.local/bin/kiox -- orun plan --intent intent.yaml --view dag`
- `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`
- `gh run view 26551391669 --json name,conclusion,jobs`
- any focused inspection commands needed to confirm actor-shape compatibility and secret-safe behavior

If the implementer report is missing, commit only that report (and any required verifier artifact) to the PR branch, push, and wait for CI again before final PASS/FAIL. Do not stage unrelated untracked `ai/` carryover files from the local workspace.

## PR Merge Protocol

- If PASS: merge PR #91, checkout `main`, fast-forward pull from `origin/main`, ensure `git status --short` is clean, and update orchestration state files for the next cycle.
- If FAIL: leave PR #91 open and document exact blockers.
- Never merge a PR with unresolved verification blockers or failing CI.

## When Done Report

Write `ai/reports/task-0048-verifier.md` with sections:

- Result: PASS or FAIL
- Checks
- Issues
- CI Log Review
- Secret Handling Review
- Risk Notes
- Spec Proposals
- Recommended Next Move
- PR Number
