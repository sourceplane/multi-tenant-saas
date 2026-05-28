# Task 0054 — Verifier

Agent: Verifier

## Current Repo Context

- Task 0053 is verified PASS and merged via PR #96 at `c2b467b`; self-scoped `GET/PATCH /v1/auth/profile` is live on main through api-edge and identity-worker.
- Task 0054 implementer opened PR #97 (`impl/task-0054-profile-settings-ui`) to add web-console account profile settings UI backed by those public profile routes.
- PR #97 is open, non-draft, merge state is CLEAN, and CI run `26563632783` is green across plan plus web-console dev/stage/prod verify-deploy jobs as of 2026-05-28T08:29Z.
- The implementer report is committed on the PR branch: `ai/reports/task-0054-implementer.md`.
- Active spec pack remains `specs/**`; `specs-v2/**` is out of scope.

## Objective

Verify PR #97 against Task 0054 and the Verifier Standard, ensuring the web-console profile settings UI is a narrow public-API-only client of `GET/PATCH /v1/auth/profile`, preserves existing Account Security and workspace flows, passes local/CI checks, and is safe to merge.

If verification PASSes and CI remains green, merge PR #97, sync local `main`, and leave the worktree clean per `agents/orchestrator.md` Verifier Merge Protocol. If verification FAILs, leave PR #97 open and document blockers clearly.

## PR Boundary

Verify exactly the Task 0054 boundary:

1. Web-console API client methods for:
   - `GET /v1/auth/profile`
   - `PATCH /v1/auth/profile`
2. Account/profile settings view in `apps/web-console/src/main.ts` that lets an authenticated user:
   - load current `email` and `displayName`;
   - update `displayName` only;
   - clear `displayName` to `null`;
   - see success, validation, loading, and error states.
3. Preserve existing Account Security and workspace flows; profile settings may share an account-level view/navigation but must not remove security-event access.
4. Focused styling/state changes only.

Explicit non-goals:

- No backend changes in identity-worker, api-edge, DB, policy, membership, or contracts except strictly necessary type-only import/export fixes.
- No email-change, MFA/passkey, password, session-management, or security-settings implementation.
- No organization-scoped profile/admin user management.
- No API-key behavior changes.
- No design-system overhaul or router rewrite.
- No `specs-v2/**` work.

## Read First

- `agents/orchestrator.md` — Verifier Standard and Verifier Merge Protocol, especially lines 349–392.
- `ai/tasks/task-0054.md` — implementer task contract.
- `ai/reports/task-0054-implementer.md` — implementer claims, checks, and assumptions.
- PR #97 diff, commits, checks, and CI logs.
- `ai/context/current.md` — current roadmap position and Task 0053/0054 context.
- `ai/context/task-ledger.md` — durable task history.
- `specs/product-overview.md` — account settings and web-console baseline.
- `specs/components/02-identity.md` — self-scoped profile route contract.
- `specs/components/12-web-console.md` — public-API-only web-console constraint.
- `specs/contracts/api-guidelines.md` — envelopes, auth transport, and error handling.
- `apps/web-console/src/api.ts`, `apps/web-console/src/main.ts`, `apps/web-console/src/state.ts` — changed frontend code.
- `packages/contracts/src/auth.ts` — profile request/response contract.

## Required Outcomes

- [ ] PR #97 maps exactly to Task 0054 and contains no unrelated carryover files or generated artifacts.
- [ ] Implementer report is present in the PR branch and has real PR number #97, not `TBD`.
- [ ] Web-console calls only public api-edge routes for profile operations.
- [ ] `PATCH /v1/auth/profile` body is constrained to `{ displayName: string | null }`; no `userId`, `email`, `status`, role, org, or unsupported field can be sent by the UI.
- [ ] Empty display name and explicit clear flow both clear to `null`.
- [ ] Successful PATCH updates in-memory session/header state without page reload.
- [ ] Existing Account Security/security-events view remains reachable.
- [ ] Existing organization selection, workspace tabs, API Keys, audit, project/environment, member, and invitation flows remain reachable or are not regressed by code inspection.
- [ ] Local focused checks and Orun checks pass or any failure is clearly justified as environmental and non-blocking.
- [ ] PR CI logs are inspected with `gh`, not just status summaries, and show expected web-console verification commands.
- [ ] Verification report is written to `ai/reports/task-0054-verifier.md`.

## Non-Goals

- Do not add new feature scope while verifying.
- Do not implement backend changes unless needed as a verifier fix for a Task 0054 blocker.
- Do not add live stage/prod manual smoke dependencies unless local/CI evidence is insufficient.
- Do not merge with failing CI, unresolved blockers, unrelated artifacts, or uncommitted verifier fixes.

## Constraints

1. Merge only if both local verification and PR CI/log inspection are acceptable.
2. The web console must remain a replaceable client of public `api-edge` routes only.
3. The profile route is self-scoped by bearer session; client code must not supply identity-management fields.
4. Do not expose, log, or store bearer tokens, API keys, raw secrets, or sensitive security-event metadata.
5. If verification adds a report or small verification-only fix, commit it to the PR branch, push, and wait for CI again before merging.
6. If verification FAILs, leave PR #97 open and document exact blockers in the verifier report.
7. After PASS merge, checkout `main`, fast-forward pull from `origin/main`, and leave local repo clean.

## Acceptance Criteria

✅ PR shape:

- PR #97 is open, non-draft, and mergeable/clean before verification merge.
- Changed files are limited to Task 0054 scope: web-console API/state/main plus implementer report, and verifier report if added.
- No generated artifacts (`dist`, `node_modules`, `.orun`, `plan.json`, tsbuild info) are staged or committed.

✅ Local frontend and contract checks pass:

```bash
pnpm --filter @saas/web-console typecheck
pnpm --filter @saas/web-console build
pnpm --filter @saas/contracts typecheck
```

✅ Orun validation/plan/dry-run evidence is acceptable:

```bash
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
```

✅ UI contract by code inspection:

- `GET /v1/auth/profile` loads profile data.
- `PATCH /v1/auth/profile` sends only `{ displayName: string | null }`.
- Display name clear behavior results in `null`.
- Backend/request errors surface through existing error patterns and preserve `requestId` where available.
- Session state updates after success and does not require reload.
- Account Security/security-events remains reachable.

✅ CI verification:

- All PR #97 GitHub Actions checks pass.
- CI logs confirm expected plan and web-console verify-deploy jobs ran successfully.
- No secret material is present in command output reviewed.

✅ Merge protocol:

- If PASS, merge PR #97, sync `main`, and clean the local worktree.
- If FAIL, leave PR #97 open and report blockers.

## Verification Steps

1. Confirm PR metadata:

```bash
gh pr view 97 --json number,title,state,isDraft,mergeStateStatus,headRefName,baseRefName,files,commits,statusCheckRollup,url
```

2. Confirm implementer report is committed to the PR branch:

```bash
git ls-tree origin/impl/task-0054-profile-settings-ui --name-only ai/reports/task-0054-implementer.md
```

3. Inspect changed files and diff:

```bash
gh pr diff 97 --name-only
gh pr diff 97
```

4. Run local checks from Acceptance Criteria.

5. Inspect PR CI logs, including successful jobs:

```bash
gh run view 26563632783 --json name,conclusion,jobs
# Use gh run view --log or job logs as needed to confirm expected commands ran.
```

6. Inspect source code for public API route usage, PATCH body safety, clear behavior, state refresh, and Account Security reachability.

7. Write `ai/reports/task-0054-verifier.md` with Result PASS or FAIL and the evidence sections below.

8. If PASS and any verifier report/cleanup commit is added to the PR branch, push it and wait for CI to pass again.

9. If PASS and CI is green, merge PR #97, checkout `main`, fast-forward pull, and run `git status --short`.

## When Done Report

Write `ai/reports/task-0054-verifier.md` with these sections:

- Result: PASS or FAIL
- Summary
- Checks
- PR/CI Log Review
- Code Inspection
- UI Contract Verification
- Issues
- Risk Notes
- Spec Proposals
- Recommended Next Move
- Merge Evidence (if PASS and merged)
