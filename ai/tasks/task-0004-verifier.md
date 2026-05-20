# Task ID

Task 0004 Verifier

# Agent

Verifier

# Current Repo Context

Task 0003.1 is verified and merged in `multi-tenant-saas`; `main` is green at
`f6e9ee3` and this repo remains blocked on the cross-repo AWS access task.

Task 0004 implementation is complete in sibling repo `../aws-admin` and is now
open as PR #22:

- URL: https://github.com/sourceplane/aws-admin/pull/22
- Branch: `feat/github-repo-sourceplane-multi-tenant-saas`
- Head commit: `c309a06`
- Base: `main` at `b915504`
- Current PR state: open, not draft, mergeable
- Current PR CI run: `26134161800` with successful checks

The implementer report says PR #22 adds a new
`github-repo-sourceplane-multi-tenant-saas` component under
`domains/access/github-repositories/` that provisions environment-scoped GitHub
OIDC IAM roles for `sourceplane/multi-tenant-saas`. The reported permission
scope is:

- S3 Terraform state access for `sourceplane-dev`, `sourceplane-stage`, and
  `sourceplane-prod`
- Secrets Manager access limited to `sourceplane/multi-tenant-saas/*`

The roles are not useful to this repo until verification confirms the PR is
correct, CI actually ran the expected Orun/Terraform steps, and the resulting
AWS IAM resources exist after merge/apply.

# Objective

Independently verify `sourceplane/aws-admin` PR #22 against Task 0004. If it
passes, merge PR #22, confirm the IAM roles and policies exist in AWS, sync the
local `aws-admin` checkout back to `main`, and leave the repo clean except for
unrelated pre-existing local changes.

# PR Boundary

This verifier task covers PR #22 only.

Allowed verifier changes are limited to a concise verifier report and any small
verification-only correction required to complete Task 0004. Do not start Task
0005 in `multi-tenant-saas`, do not widen IAM scope beyond the task, and do not
rewrite unrelated `aws-admin` modules or workflow behavior.

# Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0004.md`
- `ai/reports/task-0004-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `specs/orun-golden-path.md`
- `specs/access-and-infra.md`
- `../aws-admin/README.md`
- `../aws-admin/intent.yaml`
- `../aws-admin/.github/workflows/ci.yaml`
- `../aws-admin/stacks/aws-admin-terraform/**`
- `../aws-admin/modules/github-repository-role/**`
- `../aws-admin/domains/access/github-repositories/sourceplane-multi-tenant-saas/**`
- PR #22 diff, commits, review state, and CI logs
- GitHub Actions run `26134161800`

# Required Outcomes

- Confirm PR #22 maps to exactly one PR-sized task: add repo-scoped IAM access
  for `sourceplane/multi-tenant-saas` in `aws-admin`.
- Inspect the PR diff and current PR head, not just the local `multi-tenant-saas`
  checkout.
- Confirm the new component follows existing `aws-admin` conventions for:
  `component.yaml`, `terraform/`, `policies/`, README shape, environment
  subscriptions, and profile behavior.
- Confirm plan-role permissions are limited to the required read/inspect scope:
  shared S3 state reads, IAM/OIDC inspection, `sts:GetCallerIdentity`, and
  Secrets Manager read/list access for `sourceplane/multi-tenant-saas/*`.
- Confirm deploy-role permissions are limited to the required write scope:
  repo-specific S3 state key writes, Secrets Manager lifecycle actions for
  `sourceplane/multi-tenant-saas/*`, and only the minimal KMS permissions needed
  for Secrets Manager usage.
- Confirm trust policy subjects are appropriate for PR planning, `main` branch
  verification, and deploy/apply workflows under current `aws-admin`
  conventions. Flag any mismatch that would block Task 0005.
- Run local `aws-admin` verification and local Orun/Terraform checks where
  available.
- Inspect successful PR CI logs with `gh` and confirm expected Orun plan/run and
  Terraform steps actually ran.
- After merge/apply, verify AWS IAM role names, policy names, attachments, and
  trust policies directly via AWS CLI/API or Terraform/provider evidence.
- Write `ai/reports/task-0004-verifier.md`.

# Non-Goals

- No Task 0005 implementation in `multi-tenant-saas`.
- No Supabase project or database creation.
- No broad `aws-admin` module refactor unless a tiny verifier fix is required.
- No speculative widening of IAM or Secrets Manager permissions.
- No product-specific `specs-v2` work.

# Constraints

- Trust repo code, PR diff, rendered Orun/Terraform behavior, CI logs, and live
  AWS IAM state over stale notes.
- Do not commit secrets, Terraform state, `.orun/**`, or provider caches.
- Preserve unrelated local/user changes, including the existing untracked
  `plan.json` in `../aws-admin` unless it is verifier-created and safely
  removable.
- If verification requires a tiny fix, keep it strictly scoped to Task 0004,
  commit it on the PR branch, push, and wait for CI again before merging.
- Do not merge without checking successful CI logs and direct IAM state.
- If AWS account ID, role ARNs, or trust subjects cannot be verified, fail the
  task instead of assuming.

# Integration Notes

- This task is the immediate prerequisite for `multi-tenant-saas` Task 0005.
- Task 0005 needs deterministic role names or exact ARNs for `dev`, `stage`, and
  `prod`.
- The target secret namespace is `sourceplane/multi-tenant-saas/*`.
- The target Terraform state path pattern is
  `env/<environment>/multi-tenant-saas/<component>/terraform.tfstate` in the
  shared `sourceplane-<env>` buckets.
- PR #22 currently reports deploy trust subject
  `repo:sourceplane/multi-tenant-saas:environment:production`; verify whether
  that matches the intended downstream deploy/apply model or is a follow-up gap.

# Acceptance Criteria

- Local verification passes or exact blockers are reported:
  - `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
  - `/Users/irinelinson/.local/bin/kiox -- orun plan --intent intent.yaml --view dag`
  - `/Users/irinelinson/.local/bin/kiox -- orun plan --intent intent.yaml --output plan.json`
  - `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`
  - targeted Terraform checks for the new component consistent with `aws-admin`
    conventions
- PR #22 CI run `26134161800` is acceptable and its logs show the expected Orun
  plan/run plus Terraform execution for the new component.
- AWS IAM verification confirms the created role names, attached policies, and
  trust policy subjects for `dev`, `stage`, and `prod`.
- Secrets Manager resource scope is limited to
  `arn:aws:secretsmanager:*:*:secret:sourceplane/multi-tenant-saas/*` except for
  AWS-required list/discovery exceptions that are explicitly documented.
- S3 permissions are limited to the shared `sourceplane-<env>` buckets and this
  repo's state-key paths.
- No secrets, Terraform state, or generated Orun artifacts are committed.
- If PASS, PR #22 is merged, local `aws-admin` is fast-forwarded to `origin/main`,
  and the verifier report records the exact non-secret role/policy identifiers
  needed by Task 0005.
- If FAIL, PR #22 remains open and the report lists concrete blockers.

# Verification

Use the verifier merge protocol from `agents/orchestrator.md`:

- inspect prompt, report, PR diff, review state, local checks, CI logs, and live
  AWS IAM state;
- verify the PR stays within one bounded IAM-access task;
- check successful GitHub Actions logs, not only summaries;
- merge only on PASS;
- sync local `main` after merge.

# When Done Report

Write `ai/reports/task-0004-verifier.md` with:

- Result: PASS or FAIL
- Checks
- Issues
- Risk Notes
- Spec Proposals
- Recommended Next Move
