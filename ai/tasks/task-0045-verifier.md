# Task ID

Task 0045 Verifier

# Agent

Verifier

# Current Repo Context

Task 0045 Implementer work is now in review:

- PR: #88
- URL: https://github.com/sourceplane/multi-tenant-saas/pull/88
- Branch: `codex/task-0045-identity-security-events-query`
- Status at verifier handoff: OPEN, MERGEABLE
- Latest PR CI run: `26544257632` — completed successfully

Relevant completed foundation:

- Task 0043 added identity-owned security-event persistence:
  `identity.security_events`, `recordSecurityEvent`, and
  `querySecurityEventsByUser`.
- Task 0044 wired auth runtime flows to record identity security events for
  login challenge creation, successful session creation, failed login
  completion, and logout/session revocation.
- Task 0045 is the first public read/query surface for that identity-owned,
  pre-organization, user-scoped security-event history.

Important repo-reality notes for verification:

- The Implementer report exists locally at `ai/reports/task-0045-implementer.md`,
  but you must verify that it is committed on the PR branch. If it is missing
  from the PR branch, commit and push it before merge.
- PR #88 currently includes route/code changes plus multiple `ai/` planning and
  context files. Treat any planning/context churn outside the Task 0045 scope as
  out-of-scope unless it is strictly required task artifact state. Do not merge
  accidental orchestration file carryover.

# Objective

Verify that PR #88 correctly implements Task 0045 and satisfies the Verifier
Standard from `agents/orchestrator.md`.

This verifier task has a hard completion rule: it is not complete until one of
these outcomes occurs:

1. PASS: PR #88 is verified, merged, local `main` is synced to `origin/main`, and
   post-merge CI is checked.
2. FAIL: PR #88 remains open and the verifier report documents clear blockers
   with exact evidence.

A PASS result without merging the PR is not a complete verifier outcome.

# PR Boundary

Verify only the Task 0045 surface:

- `@saas/contracts` public security-event response types
- `apps/identity-worker` authenticated `GET /v1/auth/security-events` route,
  pagination validation, and safe public response mapping
- `apps/api-edge` auth-facade forwarding for the new route
- focused `tests/identity-worker` and `tests/api-edge` coverage
- implementer/verifier task reports required for process completeness

Out of scope and must not remain in the PR unless clearly required as task
artifacts:

- API-key or service-principal work
- account settings/profile mutation work
- web-console UI work
- organization-scoped audit/event copies
- new database migrations
- specs-v2 work
- unrelated roadmap/context rewrites
- accidental `ai/` planning/task churn unrelated to Task 0045 verification

# Read First

- `agents/orchestrator.md` — especially Verifier Standard and merge protocol
  (sections 349–392)
- `ai/tasks/task-0045.md`
- `ai/reports/task-0045-implementer.md`
- `ai/context/current.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `specs/components/02-identity.md`
- `specs/components/09-events-audit-observability.md`
- `specs/contracts/api-guidelines.md`
- `specs/domain-model.md`
- `packages/contracts/src/security-events.ts`
- `packages/contracts/src/auth.ts`
- `apps/identity-worker/src/handlers/security-events.ts`
- `apps/identity-worker/src/pagination.ts`
- `apps/identity-worker/src/router.ts`
- `apps/api-edge/src/auth-facade.ts`
- `tests/identity-worker/src/security-events.test.ts`
- `tests/api-edge/src/auth-facade.test.ts`
- PR #88 diff and CI logs

# Required Outcomes

1. Confirm repo and PR state.
   - Verify PR #88 is the correct Task 0045 PR and is still mergeable.
   - Confirm the verifier is working from the PR branch when reviewing code.
   - Confirm the local repo is returned to clean `main` after merge if PASS.

2. Confirm the implementer report is actually on the PR branch.
   - Run a branch-tree check against `origin/codex/task-0045-identity-security-events-query`.
   - If `ai/reports/task-0045-implementer.md` is missing from the branch, commit
     and push it before merge, then wait for CI again.

3. Verify scope discipline.
   - Confirm the route/code changes map exactly to Task 0045.
   - Inspect every `ai/` file in the PR diff and decide whether it is required
     task/report state or accidental carryover.
   - If unrelated planning/context/task files remain in the PR, fail the
     verification or push a verifier cleanup commit before merge.

4. Verify implementation correctness.
   - `GET /v1/auth/security-events` is authenticated and self-scoped.
   - Pagination follows V1 rules: `limit`, `cursor`, default 50, max 100,
     opaque next cursor, and `validation_failed` for invalid values.
   - Response shape uses standard success/error envelopes.
   - Safe mapping/redaction is applied before data is returned publicly.
   - No raw auth material is exposed in metadata.

5. Verify transport behavior.
   - `apps/api-edge` forwards the new auth route only as transport.
   - Query string, authorization, request ID, and tracing headers are preserved.
   - No business logic was added at the edge layer.

6. Verify tests and local quality gates.
   - Contracts, identity-worker, and api-edge typecheck pass.
   - Focused tests for identity-worker and api-edge pass.
   - Orun validation/plan/dry-run checks pass and their actual outcomes are
     recorded faithfully.

7. Verify CI logs, not only check summaries.
   - Confirm PR CI run `26544257632` shows the expected jobs and successful
     command execution.
   - Do not merge if required jobs failed or if verification-only follow-up
     commits have not rerun CI.

8. Enforce merge completion.
   - If all checks pass, merge PR #88, sync local `main`, and inspect post-merge
     main CI.
   - If any blocker remains, do not merge.

# Non-Goals

- Do not expand the feature beyond `GET /v1/auth/security-events`.
- Do not add API-key, service-principal, or account-settings behavior.
- Do not add new migrations.
- Do not modify specs unless a clarifying docs-only change is essential and kept
  inside the PR boundary.
- Do not leave the verifier task in a "PASS but unmerged" state.

# Constraints

- Merge is mandatory for PASS. A PASS verifier report with an open PR is
  incomplete and invalid for this task.
- Never merge with failing CI, unresolved blockers, or unreviewed out-of-scope
  file churn.
- Preserve the pre-organization, identity-owned, user-scoped security-event
  model. Do not convert this route into org-scoped audit history.
- Preserve public API rules from `specs/contracts/api-guidelines.md`.
- Do not expose raw codes, tokens, token hashes, session secrets, API keys,
  provider secrets, or similar credential material.
- If verification adds a report or small cleanup commit, push it to the PR
  branch and wait for CI again before merging.

# Integration Notes

- `querySecurityEventsByUser` already exists and should remain the persistence
  seam for this route.
- `apps/events-worker/src/handlers/list-audit.ts` and
  `apps/events-worker/src/pagination.ts` are reference patterns, not a dependency.
- `apps/api-edge/src/auth-facade.ts` should remain transport-only.
- This route is intended to unblock later account-security UI or adjacent
  account/security management work, but those follow-ons are not part of this PR.

# Acceptance Criteria

✅ PR #88 exists, is the Task 0045 PR, and is reviewed against the Task 0045 prompt

✅ `ai/reports/task-0045-implementer.md` is committed on the PR branch before merge

✅ PR scope is bounded to Task 0045; unrelated `ai/` planning/context churn is not merged

✅ Authenticated clients can call `GET /v1/auth/security-events` and receive a
standard success envelope with `meta.requestId` and `meta.cursor`

✅ The route lists only the authenticated user’s identity security events

✅ Pagination follows V1 rules: default 50, max 100, opaque cursor, and
`validation_failed` for invalid `limit`/`cursor`

✅ Returned metadata is redacted/safe and does not expose codes, bearer tokens,
hashes, secrets, or API keys

✅ `apps/api-edge` forwards the route correctly and preserves query string and
required headers without adding business logic

✅ Local checks pass:
- `pnpm --filter @saas/contracts typecheck`
- `pnpm --filter @saas/identity-worker typecheck`
- `pnpm --filter @saas/api-edge typecheck`
- `pnpm --filter @saas/identity-worker-tests test`
- `pnpm --filter @saas/api-edge-tests test`
- `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
- `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
- `/Users/irinelinson/.local/bin/kiox -- orun plan --intent intent.yaml --view dag`
- `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`

✅ GitHub Actions PR CI run `26544257632` is green and logs show expected jobs
actually ran successfully

✅ If PASS, PR #88 is merged, local `main` is fast-forwarded to `origin/main`,
and post-merge main CI is checked

✅ If FAIL, PR #88 remains open and blockers are documented with exact evidence

# Verification

Run and record exact results.

## 1. Confirm repo state and PR metadata

```bash
git status --short
git branch --show-current
gh pr view 88 --json number,title,state,mergeable,mergeStateStatus,headRefName,baseRefName,url
```

## 2. Confirm the implementer report is committed on the PR branch

```bash
git ls-tree origin/codex/task-0045-identity-security-events-query --name-only ai/reports/task-0045-implementer.md
```

If missing:

```bash
git add ai/reports/task-0045-implementer.md
git commit -m "task-0045: add implementer report"
git push origin codex/task-0045-identity-security-events-query
```

Then wait for PR CI to rerun and pass before continuing.

## 3. Review PR scope carefully

```bash
gh pr diff 88 --name-only
gh pr view 88 --json files
```

Confirm runtime scope is bounded. Any unrelated `ai/` file churn must be either:
- removed with a verifier cleanup commit, or
- documented as a blocker that prevents merge.

## 4. Run local checks

```bash
pnpm --filter @saas/contracts typecheck
pnpm --filter @saas/identity-worker typecheck
pnpm --filter @saas/api-edge typecheck
pnpm --filter @saas/identity-worker-tests test
pnpm --filter @saas/api-edge-tests test
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun plan --intent intent.yaml --view dag
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
```

## 5. Inspect behavior and redaction

- Review `apps/identity-worker/src/handlers/security-events.ts` and
  `apps/identity-worker/src/pagination.ts`.
- Confirm invalid pagination input returns `validation_failed`.
- Confirm response mapping strips/redacts unsafe metadata.
- Confirm public IDs and user-scoping rules are correct.

## 6. Inspect edge forwarding

- Review `apps/api-edge/src/auth-facade.ts` and the corresponding tests.
- Confirm route matching, query-string preservation, and transport-only behavior.

## 7. Inspect PR CI logs

```bash
gh run view 26544257632 --json status,conclusion,jobs
gh run view 26544257632 --log --job <job-id>
```

Inspect the key jobs/logs, including at minimum:
- `plan`
- `contracts · dev · Verify`
- `identity-worker-tests · dev · Verify`
- `api-edge-tests · dev · Verify`
- relevant deploy verification jobs touched by the PR plan

## 8. Merge protocol

Only after all checks pass:

```bash
gh pr merge 88 --squash --delete-branch
git checkout main
git pull --ff-only origin main
git status --short
gh run list --branch main --limit 1
```

Inspect the post-merge main CI run and record whether it passes or, at minimum,
has started with the expected jobs.

## 9. If verification requires a small fix

- Commit the fix to the PR branch
- Push it
- Wait for CI to finish green
- Re-run any affected local checks
- Only then merge

# PR Creation Requirement

The Implementer has already created PR #88.

This verifier task is not complete until one of the following is true:

1. PASS: PR #88 is merged to `main`, local `main` is synced, and post-merge CI is checked.
2. FAIL: PR #88 stays open and the verifier report lists exact blockers.

Do not end with "verified" while the PR is still open and mergeable.

# When Done Report

Write `ai/reports/task-0045-verifier.md` with:

- Result: PASS or FAIL
- Summary
- Scope Review
- Checks Run
- PR/CI Evidence
- Secret Handling Review
- Issues Found
- Remaining Risks
- Recommended Next Move
- Merge Outcome

`Merge Outcome` must explicitly say one of:
- `Merged PR #88 to main`
- `Did not merge PR #88; blockers remain`
