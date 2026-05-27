# Task ID

Task 0038 — Verification

# Agent

Verifier

# Current Repo Context

- Task 0038 implementer prompt: `ai/tasks/task-0038.md`
- Implementer report: `ai/reports/task-0038-implementer.md`
- Implementer PR: #79 (`codex/task-0038-org-bootstrap-events`)
- Latest `origin/main` is `de0a351` from PR #78 (Task 0037)
- PR #79 has 2 commits, 672 additions, 15 deletions across 4 files
- PR is open, mergeable, with no reviews yet

# Objective

Verify that PR #79 correctly wires `organization.created` and initial `membership.added` event/audit rows atomically with the membership-worker organization bootstrap (`POST /v1/organizations`).

# Read First

- `ai/tasks/task-0038.md` — the implementer prompt (full acceptance criteria)
- `ai/reports/task-0038-implementer.md` — implementer's self-reported results
- `apps/membership-worker/src/handlers/create-organization.ts` (PR diff)
- `tests/membership-worker/src/membership-worker.test.ts` (PR diff)
- `tests/events-worker/src/events-worker.test.ts` (PR diff)

# Verification Steps

## 1. Inspect PR Changes

- Confirm the PR maps to exactly one task (Task 0038: organization bootstrap event/audit coverage)
- Confirm no unrelated files changed (no migrations, Terraform, policy, config)
- Review the code for:
  - Atomicity: organization, member, role assignment, and both events commit or roll back together
  - Canonical IDs: raw UUIDs in persistence columns, public IDs in payload/description fields
  - Payload safety: no tokens, secrets, or raw SQL in event payloads
  - Dead code: `createOrganizationService` was left untouched (as noted)
  - Spec drift: confirm no behavioral changes outside the task scope

## 2. Run Local Checks

```bash
pnpm --filter @saas/membership-worker typecheck
pnpm --filter @saas/membership-worker-tests test
pnpm --filter @saas/membership-worker-tests typecheck
pnpm --filter @saas/events-worker-tests test
pnpm --filter @saas/events-worker-tests typecheck
pnpm --filter @saas/db-tests test
pnpm --filter @saas/db-tests typecheck
```

## 3. Run Orun Validation

```bash
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
```

## 4. Inspect PR CI Logs

- Check `gh pr checks 79` — confirm all checks green
- Inspect CI logs for relevant jobs (membership-worker-tests, events-worker-tests, etc.)
- Confirm CI ran the expected commands (orun plan, run, etc.)

## 5. Validate Acceptance Criteria

- ✅ Creating org emits `organization.created` event/audit
- ✅ Creating org emits `membership.added` event/audit for creator
- ✅ Raw UUIDs in canonical fields, public IDs only in payload/description
- ✅ Atomic transaction: failure rolls back bootstrap
- ✅ Public audit response exposes `org_`/`mem_` IDs, no raw UUIDs
- ✅ Existing response shape unchanged
- ✅ No migration, Terraform, or binding changes

# Verifier Merge Protocol

- If PASS: merge PR #79, checkout main, fast-forward pull, verify main CI starts
- If FAIL: leave PR open with clear blockers, write verifier report
- Commit any verifier fixes to the PR branch and wait for CI before merging

# Report

Write `/ai/reports/task-0038-verifier.md` with:
- Result: PASS|FAIL
- Checks: commands run and their exit codes
- Issues: any bugs or concerns found
- Risk Notes: residual risks not fixed in this PR
- Spec Proposals: none required unless spec drift found
- Recommended Next Move: merge instructions or blocker description