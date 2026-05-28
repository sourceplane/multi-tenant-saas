# Task 0050 Verifier

Agent: Verifier

## Current Repo Context

- Task 0047 is verified PASS and merged via PR #90 at `08c0e7b`. Identity owns persisted `service_principals` and `api_keys` records through migration 060 plus repository create/get/list/revoke primitives.
- Task 0048 is verified PASS and merged via PR #91 at `2a78a5d`. Identity resolves both session tokens and active API keys, and `api-edge` forwards `x-actor-subject-id` / `x-actor-subject-type=service_principal` for service-principal-authenticated requests without forwarding raw bearer tokens downstream.
- Task 0049 is verified PASS and merged via PR #92 at `c216fa1`. Membership and policy now provide the internal service-principal binding foundation: owner/admin-only policy actions plus private membership routes for create/list/revoke of SP role bindings.
- Task 0050 implementer work is on PR #93 (`codex/task-0050-api-key-admin-contract`). The PR title is `spec: reconcile V1 public API-key admin contract to tenant-scoped routes`.
- PR #93 is currently mergeable (`mergeStateStatus: CLEAN`). Latest observed CI run `26554942026` is green: the `plan` job passed and the matrix job was skipped because this PR changes only specs/report files.
- The PR diff is intentionally narrow: `specs/components/01-edge-api.md`, `specs/components/02-identity.md`, `specs/components/04-organizations-membership.md`, `specs/contracts/api-guidelines.md`, and `ai/reports/task-0050-implementer.md`.
- Repo code reality still has no public API-key admin runtime implementation. `apps/api-edge/src/auth-facade.ts` still exposes only login/session/resolve/logout/security-events routes, and `apps/identity-worker/src/env.ts` still has no `MEMBERSHIP_WORKER`, `POLICY_WORKER`, or `EVENTS_WORKER` bindings.
- Local workspace still contains unrelated untracked historical `ai/tasks/*` and `ai/reports/*` carryover files. They are not part of PR #93 and must remain unstaged/uncommitted during verification.

## Objective

Verify that PR #93 implements exactly the Task 0050 spec-alignment contract work, removes the active route-shape contradiction for V1 public API-key administration, preserves bounded-context ownership across identity/membership/policy, and is safe to merge.

If the PR only needs verifier-safe cleanup to become acceptable, make that minimal fix on the PR branch, push it, wait for CI to go green again, then continue verification. If contract drift, runtime scope creep, or unresolved contradictions remain after minimal cleanup, FAIL the task and leave the PR open with explicit blockers.

## PR Boundary

This verifier pass covers exactly:

1. `specs/components/01-edge-api.md` route-family alignment for public API-key administration.
2. `specs/components/02-identity.md` contract text for tenant-scoped API-key admin routes, create/list/revoke semantics, one-time secret return, and security/audit expectations.
3. `specs/components/04-organizations-membership.md` clarification that membership owns service-principal role bindings while identity owns service principals and API-key credentials.
4. `specs/contracts/api-guidelines.md` tenant-scoped public route guidance for API-key administration.
5. `ai/reports/task-0050-implementer.md` presence and accuracy on the PR branch.
6. Minimal verifier-only PR cleanup needed to:
   - add `ai/reports/task-0050-implementer.md` if it is somehow missing from the PR branch;
   - add the verifier report;
   - make any tiny verification-only docs correction required to satisfy the accepted Task 0050 scope.

Non-goals for this verifier pass:
- no `apps/**` runtime changes
- no `packages/**` TypeScript contract or repository changes
- no migrations
- no new public or internal Worker routes
- no web-console API-key UI
- no CLI/SDK API-key management UX
- no `specs-v2/**` work
- no unrelated `ai/` cleanup beyond Task 0050 verification artifacts

## Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0050.md`
- `ai/tasks/task-0050-verifier.md`
- `ai/reports/task-0050-implementer.md`
- `ai/state.json`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `specs/constitution.md`
- `specs/product-overview.md`
- `specs/domain-model.md`
- `specs/components/01-edge-api.md`
- `specs/components/02-identity.md`
- `specs/components/04-organizations-membership.md`
- `specs/contracts/api-guidelines.md`
- `specs/contracts/tenancy-and-rbac.md`
- `apps/api-edge/src/auth-facade.ts`
- `apps/identity-worker/src/env.ts`
- PR #93 diff, commits, and CI logs

## Required Outcomes

- [ ] Confirm PR #93 maps to Task 0050 only and does not sneak in runtime code, migrations, contract TypeScript changes, or unrelated spec churn.
- [ ] Ensure `ai/reports/task-0050-implementer.md` is committed on the PR branch.
- [ ] Verify the active spec pack consistently presents the V1 public API-key administration route family as:
  - `GET /v1/organizations/{orgId}/api-keys`
  - `POST /v1/organizations/{orgId}/api-keys`
  - `DELETE /v1/organizations/{orgId}/api-keys/{apiKeyId}`
- [ ] Verify `/v1/auth/api-keys` is no longer presented as a recommended public admin surface.
- [ ] Verify project scope remains an explicit narrowing attribute of the backing service principal / role-binding model, not a required path segment for the initial V1 public admin surface.
- [ ] Verify the spec pack clearly preserves bounded-context ownership:
  - identity owns API keys, service principals, and identity security events;
  - membership owns service-principal role bindings / role assignments;
  - policy owns authorization decisions.
- [ ] Verify the spec pack clearly documents one-time secret return on create, hash-only persistence, list never returning raw key material, and create/revoke security-event plus org-scoped audit/event expectations.
- [ ] Verify local checks and PR CI evidence are both acceptable.
- [ ] If PASS, merge PR #93, fast-forward local `main`, and leave the repo clean.

## Non-Goals

- No implementation of public API-key admin routes.
- No `identity-worker` service-binding expansion.
- No `api-edge` route implementation beyond existing auth facade reality checks.
- No membership/policy runtime orchestration work.
- No web-console, CLI, SDK, billing, metering, notifications, or webhook follow-on work.

## Constraints

1. Follow Constitution rule 2 (`contract-first development`): verify durable contract clarity, not implementation detail churn.
2. Follow Constitution rule 8 (`secure by default`): no raw API keys, bearer tokens, hashes, or secret-bearing payloads in docs examples, reports, or logs beyond the one-time create-response description.
3. Follow Constitution rule 11 (`bounded contexts are real`): do not accept spec text that moves role-assignment ownership into identity or authorization ownership into membership.
4. Treat `specs/**` as the active spec pack. Do not accept `specs-v2/**` drift in this PR.
5. Treat PR hygiene as part of verification. Do not accidentally stage unrelated untracked `ai/` carryover files from the local workspace.
6. Merge only after both local verification and GitHub Actions CI are green.

## Acceptance Criteria

✅ PR #93 corresponds exactly to Task 0050 spec-alignment-only scope.

✅ `ai/reports/task-0050-implementer.md` is committed on the PR branch before merge.

✅ The active spec pack consistently describes the canonical V1 route family as:
- `GET /v1/organizations/{orgId}/api-keys`
- `POST /v1/organizations/{orgId}/api-keys`
- `DELETE /v1/organizations/{orgId}/api-keys/{apiKeyId}`

✅ `/v1/auth/api-keys` is removed as a recommended public admin route and appears only, if at all, as a stale/deprecation note.

✅ Any mention of project-scoped API keys remains clearly subordinate to explicit `orgId + projectId` scope and does not redefine the initial V1 public route family.

✅ The changed specs preserve the ownership split across identity, membership, and policy, and they remain consistent with `specs/domain-model.md`, `specs/product-overview.md`, and `specs/contracts/tenancy-and-rbac.md`.

✅ The changed specs clearly document one-time raw secret return on create, hash-only persistence, list never returning raw key material, and create/revoke security-event plus org-scoped audit/event expectations.

✅ Focused local checks pass. At minimum, run and record exact commands equivalent to:
```bash
git diff --name-only origin/main...origin/codex/task-0050-api-key-admin-contract
rg -n "auth/api-keys|organizations/\{orgId\}/projects/\{projectId\}/api-keys|organizations/\{orgId\}/api-keys" specs
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
```
If `plan --changed` yields no jobs because the PR is docs-only, record the no-op result explicitly.

✅ PR CI logs show the expected checks actually ran successfully, including run `26554942026` or a later rerun if the verifier adds a cleanup commit.

✅ MergeStateStatus is `CLEAN` at merge time.

## Verification

Run and record exact results:

- `git status --short`
- `gh pr view 93 --json files,commits,statusCheckRollup,mergeStateStatus,url`
- `git ls-tree origin/codex/task-0050-api-key-admin-contract --name-only ai/reports/task-0050-implementer.md`
- `git diff --name-only origin/main...origin/codex/task-0050-api-key-admin-contract`
- `gh pr diff 93 --name-only`
- `rg -n "auth/api-keys|organizations/\{orgId\}/projects/\{projectId\}/api-keys|organizations/\{orgId\}/api-keys" specs`
- `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
- `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
- `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`
- `gh run view 26554942026 --json name,conclusion,jobs,url,workflowName`
- any focused inspection commands needed to confirm unchanged runtime reality (`apps/api-edge/src/auth-facade.ts`, `apps/identity-worker/src/env.ts`) and bounded-context ownership consistency

If the implementer report is missing, commit only that report (and any required verifier artifact) to the PR branch, push, and wait for CI again before final PASS/FAIL. Do not stage unrelated untracked `ai/` carryover files from the local workspace.

## PR Merge Protocol

- If PASS: merge PR #93, checkout `main`, fast-forward pull from `origin/main`, ensure `git status --short` is clean, and update orchestration state files for the next cycle.
- If FAIL: leave PR #93 open and document exact blockers.
- Never merge a PR with unresolved verification blockers or failing CI.

## When Done Report

Write `ai/reports/task-0050-verifier.md` with sections:

- Result: PASS or FAIL
- Checks
- Issues
- CI Log Review
- Secret Handling Review
- Risk Notes
- Spec Proposals
- Recommended Next Move
- PR Number
