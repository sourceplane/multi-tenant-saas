# Task 0036 Verifier

## Agent

Verifier

## Current Repo Context

- Task 0035 merged PR #76 at `081655e`, adding public environment archival.
- Task 0036 implementer completed PR #77 (branch: `task-0036/organization-audit-list`).
- All CI checks passed on PR #77 (run 26439198439): events-worker deploy jobs, api-edge tests, contracts tests, db tests, policy-engine tests.
- Implementer report available at `ai/reports/task-0036-implementer.md`.
- The repo has an existing events/audit persistence foundation (migration `030_events_audit_core`, `@saas/db/events` repository).
- This task adds: `GET /v1/organizations/{orgId}/audit` route through new private `apps/events-worker`.

## Objective

Verify Task 0036 PR #77: validate that the organization audit list endpoint is correctly implemented, all files follow Orun/Terraform conventions, and no secrets are exposed in outputs. Confirm post-merge Cloudflare state shows events-worker is private and api-edge binds to same-environment events-worker.

## PR Boundary

Verify PR #77 exactly matches Task 0036 scope:
- New private `apps/events-worker` runtime with health and audit-list route
- New `tests/events-worker` package/component
- api-edge forwarding for `GET /v1/organizations/{orgId}/audit`
- Policy action `audit.read` (org-scoped, owner/admin only)
- Public audit response contract types
- `queryAuditByOrg` category filtering
- Focused tests for events-worker, api-edge, policy-engine

## Read First

- `ai/tasks/task-0036.md` — implementer task prompt
- `ai/reports/task-0036-implementer.md` — implementer report
- `specs/constitution.md` — architectural rules
- `specs/orun-golden-path.md` — Orun component patterns
- `specs/contracts/event-envelope.schema.yaml` — event contract
- `specs/contracts/api-guidelines.md` — API conventions
- `specs/components/09-events-audit-observability.md` — events worker spec
- `apps/events-worker/component.yaml` — verify component manifest
- `apps/api-edge/component.yaml` — verify events-worker dependency
- `apps/events-worker/wrangler.jsonc` — verify private worker config

## Required Outcomes

- [ ] Verify all acceptance criteria from Task 0036 implementer task are met
- [ ] Confirm Orun validation passes (no infra apply jobs selected)
- [ ] Verify all files follow Orun/Terraform conventions
- [ ] Confirm no secrets exposed in any output or CI logs
- [ ] Verify events-worker is private (`workers_dev: false`) and api-edge has `EVENTS_WORKER` service bindings
- [ ] Write verifier report to `ai/reports/task-0036-verifier.md`

## Verification

### 1. Confirm Repo State

```bash
git status
git log --oneline -1
```
Ensure main is synced and worktree clean. The PR branch should be `task-0036/organization-audit-list`.

### 2. Check Implementer Report Is Committed (Recurring Fix)

The implementer report must be on the PR branch:
```bash
git ls-tree origin/task-0036/organization-audit-list --name-only ai/reports/task-0036-implementer.md
```
If missing, this is a blocker that must be fixed before verification can proceed.

### 3. Orun Validation Checks

```bash
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun component --intent intent.yaml --long  # Confirm events-worker is discovered
/Users/irinelinson/.local/bin/kiox -- orun plan --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
```
Verify no infra/Terraform apply jobs are selected (this is a Worker-only change).

### 4. Terraform/Code Quality Checks

```bash
# Check wrangler config is valid
cd apps/events-worker && pnpm exec wrangler deploy --dry-run --config wrangler.jsonc --env stage
cd apps/events-worker && pnpm exec wrangler deploy --dry-run --config wrangler.jsonc --env prod

# Verify no Terraform changes
git diff origin/main...origin/task-0036/organization-audit-list --name-only | grep -E "terraform|\.tf$" || echo "No infra changes"
```

### 5. Verify events-worker Privacy and Bindings

Check `apps/events-worker/wrangler.jsonc`:
- `workers_dev: false` for both stage and prod
- `SOURCEPLANE_DB` binds to verified Hyperdrive IDs (use existing values)
- `MEMBERSHIP_WORKER` binds to same-environment membership-worker
- `POLICY_WORKER` binds to same-environment policy-worker

Check `apps/api-edge/wrangler.jsonc`:
- `EVENTS_WORKER` service binding for stage (points to events-worker-stage)
- `EVENTS_WORKER` service binding for prod (points to events-worker-prod)

### 6. Verify Policy Semantics

```bash
grep -A5 "audit.read" packages/policy-engine/src/index.ts
```
Confirm `audit.read` is in owner/admin ORG_ROLE_PERMISSIONS and NOT in builder/viewer/billing_admin.

### 7. Secret Handling Review

```bash
# Check for exposed secrets in committed files
git diff origin/main...origin/task-0036/organization-audit-list -- "*.ts" "*.json" "*.jsonc" | grep -iE "token|secret|password|api.?key|connection.?string" || echo "No secret patterns found"
```

### 8. Acceptance Criteria Verification

✅ PR #77 corresponds exactly to Task 0036 as described in the Implementer report
✅ All files follow Orun/Terraform conventions and are properly formatted
✅ Component descriptor (`component.yaml`) follows the golden path pattern
✅ No `terraform fmt` or `terraform validate` needed (Worker-only change)
✅ Orun component discovery works correctly for stage and prod instances
✅ Plan dry-run completes successfully with no infra jobs
✅ No secrets are logged in any command output or CI logs
✅ Dependencies (membership-worker, policy-worker) are correctly declared in `component.yaml`
✅ All acceptance criteria from the Implementer Standard are met
✅ GitHub Actions logs show expected commands actually ran successfully
✅ Production-grade basics verified (no plaintext tokens, secrets safe, etc.)
✅ No overreach or hidden coupling with unrelated components
✅ MergeStateStatus is CLEAN and branch is up-to-date
✅ **All required GitHub Actions CI checks have passed** (PR #77 run 26439198439)

## When Done Report

Write `/ai/reports/task-0036-verifier.md` with:
- Result: PASS or FAIL with clear justification
- Checks: List all verification steps performed
- Issues: Any blockers or non-blocking concerns
- Risk Notes: Residual risks after verification
- Spec Proposals: Drift assessment and follow-up
- Recommended Next Move: Action after verification

## PR Creation Requirement

If any checks FAIL or the implementer report is missing from the PR branch, leave PR #77 open with clear blockers and do not merge.

If all checks PASS:
1. Merge the PR, checkout main, fast-forward pull, clean up branch
2. Commit the verifier report to main
3. Update state files (state.json, task-ledger.md, current.md, waiting_for_input.md)