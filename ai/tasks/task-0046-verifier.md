# Task ID

Task 0046 Verifier

# Agent

Verifier

# Current Repo Context

Task 0046 Implementer work is now in review:

- PR: #89
- URL: https://github.com/sourceplane/multi-tenant-saas/pull/89
- Branch: `codex/task-0046-web-console-account-security-events`
- Status at verifier handoff: OPEN, `mergeable=CLEAN/MERGEABLE`
- Latest PR CI run: `26545648324`
- Current PR file scope observed via `gh pr view 89 --json files`:
  - `ai/reports/task-0046-implementer.md`
  - `apps/web-console/src/api.ts`
  - `apps/web-console/src/main.ts`
  - `apps/web-console/src/style.css`

Relevant completed foundation:

- Task 0043 added identity-owned security-event persistence.
- Task 0044 wired auth runtime flows to record identity security events.
- Task 0045 exposed authenticated `GET /v1/auth/security-events` through
  identity-worker and api-edge with cursor pagination and metadata redaction.
- Task 0046 is the first web-console account-security surface for that existing
  public API route.

Important repo-reality notes for verification:

- The Implementer report is already present in the PR file list, but you must
  still verify it is committed on the PR branch before merge.
- The local worktree currently contains unrelated untracked `ai/` carryover
  files from earlier tasks. Do not merge or stage any unrelated carryover while
  verifying Task 0046.
- `ai/waiting_for_input.md` is stale and references Task 0041. That stale file is
  not part of Task 0046 scope and must not be pulled into the PR.

# Objective

Verify that PR #89 correctly implements Task 0046 and satisfies the Verifier
Standard from `agents/orchestrator.md`.

This verifier task has a hard completion rule: it is not complete until one of
these outcomes occurs:

1. PASS: PR #89 is verified, merged, local `main` is synced to `origin/main`, and
   post-merge CI is checked.
2. FAIL: PR #89 remains open and the verifier report documents clear blockers
   with exact evidence.

A PASS result without merging the PR is not a complete verifier outcome.

# PR Boundary

Verify only the Task 0046 surface:

- `apps/web-console/src/api.ts` client method for `GET /v1/auth/security-events`
- `apps/web-console/src/main.ts` account-security entry point, loading/error/
  empty/success states, and cursor pagination behavior
- `apps/web-console/src/style.css` styling needed for the new security-event view
- `ai/reports/task-0046-implementer.md` for process completeness

Out of scope and must not remain in the PR unless clearly required as task
artifacts:

- backend route, persistence, auth runtime, CORS, or infrastructure changes
- account settings mutation work
- API-key or service-principal work
- org-scoped audit/event changes
- unrelated `ai/` planning/task/context churn
- `specs-v2/**` work
- broad web-console redesign unrelated to the account-security view

# Read First

- `agents/orchestrator.md` — especially Verifier Standard and merge protocol
  (sections 349–392)
- `ai/tasks/task-0046.md`
- `ai/reports/task-0046-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `specs/constitution.md`
- `specs/product-overview.md`
- `specs/components/12-web-console.md`
- `specs/components/02-identity.md`
- `specs/contracts/api-guidelines.md`
- `apps/web-console/src/api.ts`
- `apps/web-console/src/main.ts`
- `apps/web-console/src/state.ts`
- `apps/web-console/src/style.css`
- `packages/contracts/src/security-events.ts`
- `packages/contracts/src/auth.ts`
- `tests/identity-worker/src/security-events.test.ts`
- `tests/api-edge/src/auth-facade.test.ts`
- PR #89 diff and CI logs

# Required Outcomes

1. Confirm repo and PR state.
   - Verify PR #89 is the correct Task 0046 PR and is still mergeable.
   - Confirm the verifier is reviewing the correct branch/diff.
   - Confirm local repo is returned to clean `main` after merge if PASS.

2. Confirm the implementer report is committed on the PR branch.
   - Run a branch-tree check against
     `origin/codex/task-0046-web-console-account-security-events`.
   - If `ai/reports/task-0046-implementer.md` is missing from the branch,
     commit and push it before merge, then wait for CI again.

3. Verify scope discipline.
   - Confirm the PR contains only the web-console account-security surface and
     the required task report.
   - Inspect every `ai/` file in the PR diff and reject any unrelated planning or
     context carryover.
   - If verifier cleanup is needed, push a cleanup commit and wait for CI again
     before merging.

4. Verify implementation correctness.
   - The UI exposes a clear signed-in account-security entry point.
   - The view calls only the existing public `GET /v1/auth/security-events`
     route through the existing public api-edge target.
   - The UI remains user-scoped, not org-scoped.
   - Loading, empty, success, and error states are visible and coherent.
   - Cursor pagination preserves already-loaded items and handles follow-up load
     failures visibly.
   - The UI does not expose raw codes, bearer tokens, token hashes, API keys, or
     reconstructed secret material.

5. Verify browser behavior, not only build output.
   - On stage: sign in, open the account-security view, confirm events render,
     confirm pagination works, confirm no secret leakage.
   - On prod: confirm the view exists, uses the locked prod target, and behaves
     safely without debug-code leakage.
   - Check desktop and mobile-width behavior for overlap or unreadable rows.

6. Verify local quality gates and CI logs.
   - `web-console` typecheck, lint, and build pass.
   - Orun validation, changed plan, DAG, and dry-run pass.
   - GitHub Actions logs show the expected `web-console` verification jobs
     actually ran successfully.

7. Enforce merge completion.
   - If all checks pass, merge PR #89, sync local `main`, and inspect post-merge
     main CI.
   - If any blocker remains, do not merge.

# Non-Goals

- Do not expand the feature beyond the account-security history view.
- Do not add backend routes or contract changes unless a tiny verifier fix is
  strictly required to complete the scoped PR.
- Do not leave the verifier task in a "PASS but unmerged" state.
- Do not stage unrelated local untracked `ai/` files.

# Constraints

- Merge is mandatory for PASS. A PASS verifier report with an open PR is
  incomplete and invalid for this task.
- Never merge with failing CI, unresolved blockers, or unreviewed out-of-scope
  file churn.
- Preserve the public API rules from `specs/contracts/api-guidelines.md`,
  especially the success/error envelopes and cursor-pagination semantics.
- Keep this surface identity-owned and user-scoped. Do not require `orgId` for
  the security-event query path.
- Keep bearer tokens and any credential material out of logs, screenshots,
  reports, and the rendered UI.
- If verification adds a report or cleanup commit, push it to the PR branch and
  wait for CI again before merging.

# Integration Notes

- `packages/contracts/src/security-events.ts` already defines the public
  `PublicSecurityEvent` contract used by the UI.
- `apps/web-console/src/api.ts` should remain the client seam; do not introduce a
  second client abstraction during verification.
- `apps/web-console/src/main.ts` uses lightweight DOM rendering and tab state;
  verifier fixes should stay stylistically consistent with that implementation.
- The deployed consoles are environment-specific. Stage must call stage api-edge;
  prod must call prod api-edge.

# Acceptance Criteria

✅ PR #89 exists, is the Task 0046 PR, and is reviewed against the Task 0046 prompt

✅ `ai/reports/task-0046-implementer.md` is committed on the PR branch before merge

✅ PR scope is bounded to Task 0046; unrelated `ai/` carryover is not merged

✅ A signed-in user can access an account-security/security-events view in the
web console

✅ The view calls the existing `GET /v1/auth/security-events` public route and
renders only the authenticated user’s security-event history

✅ Loading, empty, success, and error states are clear

✅ Cursor pagination works through the UI and preserves already-rendered results

✅ The UI does not expose raw login codes, bearer tokens, token hashes, API
keys, or other credential material

✅ Existing org/project/audit console flows remain intact

✅ Local checks pass:
- `pnpm --filter @saas/web-console typecheck`
- `pnpm --filter @saas/web-console lint`
- `pnpm --filter @saas/web-console build`
- `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
- `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
- `/Users/irinelinson/.local/bin/kiox -- orun plan --intent intent.yaml --view dag`
- `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`

✅ GitHub Actions PR CI run `26545648324` is green and logs show expected jobs
actually ran successfully

✅ If PASS, PR #89 is merged, local `main` is fast-forwarded to `origin/main`,
and post-merge main CI is checked

✅ If FAIL, PR #89 remains open and blockers are documented with exact evidence

# Verification

Run and record exact results.

## 1. Confirm repo state and PR metadata

```bash
git status --short
git branch --show-current
gh pr view 89 --json number,title,state,mergeable,mergeStateStatus,headRefName,baseRefName,url
```

## 2. Confirm the implementer report is committed on the PR branch

```bash
git ls-tree origin/codex/task-0046-web-console-account-security-events --name-only ai/reports/task-0046-implementer.md
```

If missing:

```bash
git add ai/reports/task-0046-implementer.md
git commit -m "task-0046: add implementer report"
git push origin codex/task-0046-web-console-account-security-events
```

Then wait for PR CI to rerun and pass before continuing.

## 3. Review PR scope carefully

```bash
gh pr diff 89 --name-only
gh pr view 89 --json files,commits,statusCheckRollup,mergeable,mergeStateStatus
```

Confirm runtime scope is bounded. Any unrelated `ai/` file churn must be either:
- removed with a verifier cleanup commit, or
- treated as a blocker if it cannot be safely separated.

## 4. Run local validation

```bash
pnpm --filter @saas/web-console typecheck
pnpm --filter @saas/web-console lint
pnpm --filter @saas/web-console build
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun plan --intent intent.yaml --view dag
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
```

## 5. Inspect CI logs, not only check summaries

```bash
gh pr checks 89
gh run view 26545648324 --log
```

Confirm the expected plan and `web-console` verify jobs actually ran
successfully.

## 6. Perform browser verification

At minimum, verify:

- stage console sign-in and account-security view load
- event rows render core contract fields only
- `Load more` works when additional pages exist
- error handling is visible if a follow-up request fails
- prod console exposes the view safely against the prod target
- no overlapping controls or unreadable event rows at narrow widths

## 7. PASS / FAIL decision and merge protocol

If any blocker remains:
- leave PR #89 open
- write `Result: FAIL`
- document exact blockers and evidence

If all checks pass:

```bash
gh pr merge 89 --squash --subject "feat(web-console): account security events view (#89)"
git checkout main
git pull --ff-only origin main
gh run list --branch main --limit 1
```

Then inspect the latest main CI run and record whether it is still in progress or
has completed successfully.

This verifier task is not complete until one of the following is true:

1. PASS: PR #89 is merged to `main`, local `main` is synced, and post-merge CI is checked.
2. FAIL: PR #89 stays open and the verifier report lists exact blockers.

# When Done Report

Write `ai/reports/task-0046-verifier.md` with these sections:

- `Result: PASS|FAIL`
- `Checks`
- `Issues`
- `Browser Verification`
- `CI Log Review`
- `Risk Notes`
- `Spec Proposals`
- `Recommended Next Move`
- `PR Number`
