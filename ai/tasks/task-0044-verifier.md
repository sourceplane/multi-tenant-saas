# Task ID

Task 0044 Verifier

# Agent

Verifier

# Current Repo Context

Task 0044 Implementer has completed identity-worker auth runtime security-event
wiring. The Implementer opened PR #87 and filed the implementer report at
`ai/reports/task-0044-implementer.md`.

Key outcomes claimed in the Implementer report:
- Identity-worker auth flows (login start, login complete, logout, session) now
  record security events in `identity.security_events`.
- Security-event recording happens for successful mutations and failed attempts.
- Metadata includes request context (request ID, IP via cf-connecting-ip, user-agent).
- No raw codes, secrets, hashes, or tokens are stored in the recorded events.
- All existing auth response contracts remain unchanged.
- Tests pass, including secret-safety assertions.
- PR CI run passed with all expected jobs green.

Your task is to verify that the implementation meets the task requirements and
Verifier Standard before merging. The key requirement you must enforce is that
the PR must be fully merged before the task can be reported complete.

# Objective

Verify Task 0044 Implementer work against the task requirements and Verifier
Standard. Ensure all acceptance criteria are met, security-event recording is
safe, tests are adequate, and the PR can be merged. After verification passes,
merge PR #87 to main and verify the post-merge CI run.

# PR Boundary

Verify that the PR stays within the declared scope:
- Identity-worker auth service and/or handlers recording security events ✓
- Identity-worker tests and fakes updated ✓
- Small identity-worker helpers (e.g., generateSecurityEventId) if added ✓

OUT OF SCOPE (must not be present):
- Public `GET /v1/auth/security-events` route
- api-edge forwarding for security events
- web-console security-event UI
- Shared org-less event_log or audit_entries rows
- Organization-scoped identity audit/event copies
- API-key or service-principal implementation
- New database migrations
- specs-v2 work
- Unrelated refactors, formatting churn, or opportunistic cleanup

# Read First

- `agents/orchestrator.md` — Verifier Standard (sections 349–392)
- `ai/tasks/task-0044.md` — Implementer task prompt and all requirements
- `ai/reports/task-0044-implementer.md` — Implementer report
- `specs/components/02-identity.md` — Identity spec
- `specs/components/09-events-audit-observability.md` — Events/audit spec
- `specs/contracts/event-envelope.schema.yaml` — Event envelope contract
- PR #87 diff and commits
- GitHub Actions logs from PR CI run (identify run ID from implementer report)

# Required Outcomes

1. **Repo state confirmed clean**: main is synced with origin/main, git status is clean

2. **PR scope verified**: PR #87 code diff shows only identity-worker security-event
   recording work; no out-of-scope changes (public routes, api-edge, web-console,
   new migrations, etc.)

3. **Implementation correctness**:
   - Identity-worker calls `recordSecurityEvent` during login/session flows
   - Successful events recorded: `login.challenge.created`, `session.created`,
     `session.revoked` (or task-specified event names)
   - Failed attempt events recorded without storing codes/secrets
   - Event metadata includes safe request context (request ID, IP, user-agent)
   - No raw one-time codes, tokens, hashes, or API keys stored in events
   - Auth response contracts unchanged

4. **Test coverage**: Tests prove:
   - Security events are recorded on the happy path
   - Failed auth attempts record events without secret leakage
   - Request context is propagated (request ID, IP, user-agent)
   - Secret-safety via assertions on recorded event payloads
   - Fake identity repository stores/exposes events for test assertions

5. **Local validation passes**:
   - `pnpm --filter @saas/identity-worker typecheck` passes
   - `pnpm --filter @saas/identity-worker-tests test` passes
   - `pnpm --filter @saas/db typecheck` passes
   - `kiox -- orun validate --intent intent.yaml` passes
   - `kiox -- orun plan --changed --intent intent.yaml` produces no jobs
     (identity-worker is not Orun-discoverable; no component.yaml needed)
   - If Orun jobs exist, `kiox -- orun run --plan plan.json --dry-run` passes

6. **GitHub Actions CI logs show**:
   - PR CI run completed successfully (all expected jobs green)
   - Test jobs ran and passed (identity-worker-tests, db, etc.)
   - Orun plan/validation jobs passed if applicable

7. **Secret handling verified**:
   - Search committed files for patterns like `one.time.code`, `bearer`, `token`,
     `secret` in the context of security-event recording
   - Confirm no plaintext codes/tokens/secrets in test fixtures or mocked events
   - Verify that if a request includes a code, it is NOT stored in the
     security-event record

8. **Spec alignment checked**:
   - Event envelope usage matches the contract in
     `specs/contracts/event-envelope.schema.yaml`
   - No deviation from identity-owned event sourcing (pre-organization history
     stays in `identity.security_events`)
   - Identify any spec drift and document it in a proposal if needed

9. **Production-grade basics verified**:
   - No console.log() or debug statements left in auth handlers
   - Error handling does not leak sensitive context
   - If recording a security event fails on a required path (e.g., successful
     login), the implementer either handles recovery safely or has documented the
     trade-off in the report

10. **No overreach**: Confirm that security-event recording did not:
    - Add hidden coupling between identity and membership/projects/environments
    - Expand environment setup (no new env vars added to workers/infrastructure)
    - Change Hyperdrive/Postgres access patterns

# Non-Goals

- This verifier does not implement missing acceptance criteria from the task
- This verifier does not add new test coverage beyond what the Implementer should
  have done
- This verifier does not modify spec files (record proposals instead)

# Constraints

- Do not merge until all required checks pass
- If local Terraform validation fails due to missing providers, confirm PR CI
  passed before proceeding (local failures are common and not blockers when CI
  passed)
- If a minor issue is found that does not block merge (e.g., missing docstring),
  allow the PR to merge and record it as a residual gap for follow-up

# Integration Notes

- The identity-worker is not discovered by Orun (no component.yaml), so no
  infrastructure plan changes are expected
- PR CI run must show successful identity-worker-tests and api-edge-tests runs
- Post-merge main CI run will be the definitive proof that the changes work in
  the integrated environment

# Acceptance Criteria for Verifier

✅ PR #87 exists and is open (or already merged during this task)

✅ PR code diff is bounded to identity-worker security-event recording

✅ No out-of-scope files changed (no public routes, api-edge forwarding,
  web-console UI, migrations, etc.)

✅ All identity-worker and db typecheck/test commands pass locally

✅ Orun validation passes (or is not applicable)

✅ PR CI run passed (all expected jobs green)

✅ GitHub Actions logs show identity-worker-tests and db tests ran and passed

✅ Security-event recording calls happen in all four required flows:
   1. `login.challenge.created` on `startLogin`
   2. `session.created` on successful `completeLogin`
   3. Failed `completeLogin` records event without code storage
   4. `session.revoked` on `logout`

✅ Recorded event metadata includes request context (request ID, IP, user-agent)
  when available

✅ No raw one-time codes, bearer tokens, session secrets, token hashes, code
  hashes, API keys, or provider secrets in any recorded events (verified by grep
  search and test assertions)

✅ Auth response contracts unchanged (existing public routes return the same
  shape)

✅ Tests prove secret-safety through assertions and fake repository integration

✅ No unrelated refactors, formatting churn, or opportunistic cleanup

✅ Repo checkpoint (main synced, git status clean) ready for merge

✅ Spec proposals written if spec drift detected

# Verification Steps (In Order)

## 1. Confirm Repo State

```bash
git status  # Must be clean
git log --oneline -1  # Should show recent commit on main
git diff origin/main  # Must be empty
```

## 2. Inspect PR Metadata

```bash
gh pr view 87 --json title,state,mergeCommit,mergedAt,commits
```

Note the PR state (OPEN or MERGED) and review the title/description to understand
the implementer's intent.

## 3. Review PR Diff

```bash
gh pr diff 87
```

Confirm scope:
- Only identity-worker files changed (app code, tests, fake repository updates)
- No component.yaml, Terraform, migrations, or api-edge changes
- No specs modified (any spec drift goes to ai/proposals/)

## 4. Check PR CI Run Status

Locate the PR CI run ID from the implementer report. Query the status:

```bash
gh run view <PR-run-id> --json conclusion,jobs
```

Identify key jobs:
- `identity-worker-tests · dev · Verify` — must PASS
- `db-tests · dev · Verify` — must PASS
- `api-edge-tests · dev · Verify` — should PASS (identity-worker is not exposed
  publicly, but api-edge may test through internal binding)
- Any Orun plan/validation jobs — must PASS if present

## 5. Local Validation (if on macOS with Hermes tools)

```bash
cd /Users/irinelinson/sourceplane/multi-tenant-saas

# TypeScript validation
pnpm --filter @saas/identity-worker typecheck
pnpm --filter @saas/identity-worker-tests typecheck
pnpm --filter @saas/db typecheck

# Test execution
pnpm --filter @saas/identity-worker-tests test
pnpm --filter @saas/db test

# Orun validation (if applicable)
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
```

Record exact results.

## 6. Security-Event Recording Verification

Inspect the PR diff for the actual security-event recording code:

- Locate `recordSecurityEvent` calls in identity-worker auth handlers
- Verify calls happen in all four required flows (login start, login complete
  success, login complete failure, logout)
- Confirm metadata passed includes:
  - `eventType` (e.g., "login.challenge.created")
  - `userId` and/or `challengeId`/`sessionId` (as available)
  - Optional `requestId`, `ip`, `userAgent`
  - NO raw codes, tokens, secrets, or hashes

Check the fake repository in tests:

```bash
grep -A 20 "recordSecurityEvent" tests/identity-worker/src/helpers/fake-repository.ts
```

Verify the fake stores events for assertion. Inspect test files:

```bash
grep -A 10 "recordSecurityEvent" tests/identity-worker/src/auth-service.test.ts
```

Confirm tests assert on:
- Event is recorded with correct type
- Metadata does not contain secrets
- Request context is preserved

## 7. Secret-Safety Audit

Search the PR for any plaintext secret storage:

```bash
gh pr diff 87 | grep -i "code\|token\|secret\|password" | head -20
```

Inspect each result to ensure:
- If the PR mentions "code" it's in a comment, not in stored data
- If "token" appears, it's only in comments or configuration, not event storage
- No test fixtures have hardcoded secrets

## 8. Auth Response Contract Verification

Confirm the PR does not change public response shapes. Spot-check one handler:

```bash
gh pr diff 87 -- apps/identity-worker/src/handlers/login-complete.ts
```

Verify:
- Return type unchanged
- Error responses unchanged
- Only internal calls to recordSecurityEvent added

## 9. Production-Grade Basics Check

Scan the auth handlers for:

```bash
gh pr diff 87 | grep -E "console\.(log|warn|error|debug)" | head -5
```

Should find no debug output or should only be in test files.

## 10. Spec Drift Assessment

Compare the implementation against `specs/contracts/event-envelope.schema.yaml`:

- Confirm event envelope structure matches spec (at minimum, has `id`, `timestamp`,
  `eventType`, `data`)
- Confirm identity-owned events stay in `identity.security_events` (no shared
  `events.event_log` creation)
- Identify any deviation and record in a spec proposal if needed

## 11. Merge Decision

If all checks pass:
- Merge the PR with `gh pr merge 87 --squash --delete-branch`
  (or `--rebase` if repo prefers rebases)
- Checkout main and fast-forward pull: `git checkout main && git pull origin main`
- Verify clean state: `git status --short` (must be empty)

If any check fails:
- Leave the PR open
- Document blockers in the verifier report with exact failure details
- Do not merge

## 12. Post-Merge Verification (if merged)

```bash
git log --oneline -1  # Should show the merge commit
gh run list --branch main --limit 1  # Identify post-merge main CI run

# Wait a few seconds for the run to start, then check status
gh run view <main-run-id> --json conclusion,jobs
```

Confirm:
- Post-merge main CI run starts and jobs run
- No unexpected failures
- Integration test results confirm security-event recording works end-to-end

# When Done Report

Write `/ai/reports/task-0044-verifier.md` with:

**Result: PASS | FAIL**

**Checks**

List all verification steps run and their results:
- Repo state clean: ✓
- PR scope bounded: ✓
- PR CI run passed: ✓
- Local validation: ✓ (or N/A if not run locally)
- Security-event recording verified: ✓
- Secret-safety audit passed: ✓
- Auth response contracts unchanged: ✓
- Production-grade basics OK: ✓
- Spec alignment OK: ✓

**Issues**

List any problems found (critical blockers only for FAIL):
- If PASS: list residual non-blocking concerns (e.g., "No docstrings on new
  helpers, recommend follow-up")
- If FAIL: list exact blockers with commands/errors that prove failure

**CI Log Review**

- PR CI run ID: <id>
- Conclusion: PASSED
- Key jobs passed: identity-worker-tests, db-tests, api-edge-tests
- Evidence: [Link or command output]

**Secret Handling Review**

- Confirmed: No raw codes, tokens, secrets, or hashes stored in recorded events
- Method: `gh pr diff 87 | grep -i "<pattern>"` returned no concerning results
- Test assertions on fake repository verify metadata safety

**Spec Proposals**

- If needed: link to `ai/proposals/task-0044-spec-*.md` with one-line reason
- If none: "No spec drift detected; event envelope and identity ownership align
  with spec"

**Risk Notes**

- Residual risks or compatibility notes
- If PASS but some edge case exists: note it here for later

**Recommended Next Move**

- If PASS: "Merge PR #87 to main. Post-merge CI run will be final integration
  proof."
- If FAIL: "Do not merge. Implementer must fix blockers and push updates to PR
  #87. Trigger new CI run."

# PR Merge Requirement and State Update

**Critical: This verifier task is not complete until one of two outcomes occurs:**

1. **Verification PASS + PR Merged**: The PR is successfully merged to main,
   post-merge CI passes, and the verifier report is filed.

2. **Verification FAIL + PR Remains Open**: The PR remains open with clear blockers
   documented in the report, ready for the Implementer to fix and resubmit.

**State file update (after merge):**
- Add "0044" to the `completed` list in `/ai/state.json`
- Update `current_task` to the next task
- Update `/ai/context/task-ledger.md` to append a `## Task 0044` entry marked
  "verified and merged"

**No intermediate state allowed:**
- Do NOT report "verification complete" while leaving the PR in OPEN state with
  unresolved blockers
- Do NOT leave a PASS verification hanging without merging
- The PR merge is the hard requirement; verification is only complete when the
  merge happens or blockers are definitively documented

# Final Checklist

Before submitting the verifier report:

☐ PR #87 status confirmed (OPEN, MERGED, or FAILED to merge)
☐ All verification checks documented with exact results
☐ Secret-safety audit completed and recorded
☐ Spec alignment assessed and proposals filed if needed
☐ Production-grade basics OK'd or risks documented
☐ If PASS: PR merged and post-merge CI run started
☐ If FAIL: Blockers documented with exact commands/evidence
☐ Repo state clean (git status empty, main synced with origin/main)
☐ Verifier report written to `/ai/reports/task-0044-verifier.md`
