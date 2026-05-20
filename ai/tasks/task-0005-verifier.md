# Task ID

Task 0005 Verifier

# Agent

Verifier

# Current Repo Context

Task 0005 implementation is complete in `multi-tenant-saas` and is now open as
PR #27:

- URL: https://github.com/sourceplane/multi-tenant-saas/pull/27
- Branch: `feat/task-0005-aws-s3-terraform-seam`
- Head commit: `6a87c32461837a4bdd4b1f838726145bf5392a5d`
- Base: `main` at `f6e9ee3`
- Current PR state: open, not draft, mergeable (`mergeStateStatus: CLEAN`)
- Latest PR CI run: `26159717427` with successful checks

Observed repo reality when this prompt was generated:

- `gh pr list --state open` returns PR #27 as the only open PR for this repo.
- The local checkout is on `feat/task-0005-aws-s3-terraform-seam` and reports a
  clean worktree.
- PR #27 restores `infra/` discovery, adds the bootstrap Terraform component,
  updates the Terraform composition/profile path, and bumps Orun to `v2.2.1`.
- The active Terraform job template in the branch currently uses
  `aws-actions/configure-aws-credentials@v4` in
  `stack-tectonic/compositions/terraform/jobs/terraform-validate.yaml`.
- The implementer report in `ai/reports/task-0005-implementer.md` claims the CI
  fix replaced the `use:` action with a native shell OIDC step, which does not
  match the current branch file content and therefore requires verification.
- `gh api repos/sourceplane/multi-tenant-saas/environments` still returns no
  configured GitHub environments, so the deploy-role trust subject
  `repo:sourceplane/multi-tenant-saas:environment:production` is still not
  directly exercisable.
- PR #27 appears to include out-of-scope changes such as `agents/agent-loop.sh`,
  despite the Task 0005 PR-completion prompt explicitly excluding that file.

Task 0006 must not start yet. The next safe step is to verify whether PR #27 is
actually a bounded, correct Task 0005 PR or must be narrowed/fixed before merge.

# Objective

Independently verify PR #27 against Task 0005. If it passes, merge it, confirm
the AWS/S3 Terraform seam is production-grade for the bounded scope, sync local
`main`, and leave the repo clean. If it fails, leave the PR open with clear,
task-scoped blockers.

# PR Boundary

This verifier task covers PR #27 only.

Allowed verifier changes are limited to a concise verifier report and any small,
strictly Task 0005-scoped verification fix needed to complete the task. Do not
start Task 0006, do not widen AWS/IAM scope, and do not preserve unrelated PR
files just because CI is green.

# Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0005.md`
- `ai/tasks/task-0005-pr-completion.md`
- `ai/reports/task-0005-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `specs/orun-golden-path.md`
- `specs/access-and-infra.md`
- `specs/repo.md`
- `specs/components/00-foundation-and-tooling.md`
- `intent.yaml`
- `.github/workflows/ci.yml`
- `kiox.yaml`
- `stack-tectonic/compositions/terraform/**`
- `infra/terraform/bootstrap/**`
- PR #27 diff, commits, review state, and CI logs
- GitHub Actions run `26159717427`

# Required Outcomes

- Confirm PR #27 maps to exactly one PR-sized task: restore the repo-local AWS
  S3 Terraform seam needed before Task 0006.
- Inspect the actual PR diff and current branch content, not only the
  implementer report.
- Check that the PR excludes unrelated local/user changes. In particular,
  determine whether `agents/agent-loop.sh` and any unrelated AI/task history
  files are valid Task 0005 scope or must be removed.
- Verify the active Terraform execution seam:
  - `intent.yaml` discovers `infra/` again;
  - Orun discovers `infra/terraform/bootstrap/`;
  - the Terraform composition and profiles show explicit credential setup before
    `terraform init`;
  - active backend configuration and docs point to AWS S3, not R2.
- Resolve the composition/report drift:
  - verify whether the branch uses `use: aws-actions/configure-aws-credentials@v4`
    or a native shell OIDC step;
  - inspect CI logs to confirm what actually ran;
  - require the report and code to agree before PASS.
- Run local Orun and targeted Terraform checks.
- Inspect successful PR CI logs with `gh` and confirm expected Orun plan/run and
  Terraform steps actually ran for bootstrap in `dev`, `stage`, and `prod`.
- Confirm what Task 0005 actually proves about AWS access:
  - STS / caller identity evidence;
  - S3 backend access evidence;
  - whether Secrets Manager write-path verification is genuinely complete or
    remains a documented blocker.
- Confirm whether the Orun version bump to `v2.2.1` is required and in-scope for
  Task 0005, or whether it is accidental/overreach.
- Write `ai/reports/task-0005-verifier.md`.

# Non-Goals

- No Task 0006 Supabase Terraform implementation.
- No AWS IAM role or policy creation in `aws-admin`.
- No broad CI/agent automation refactor unrelated to the Terraform seam.
- No product-specific `specs-v2/**` work.

# Constraints

- Trust repo code, PR diff, rendered Orun behavior, CI logs, and actual GitHub
  state over stale notes.
- Do not commit secrets, Terraform state, `.orun/**`, `plan.json`, or provider
  caches.
- Preserve unrelated local/user changes unless they are already inside the PR and
  must be explicitly removed to restore Task 0005 scope.
- If verification needs a fix, keep it strictly bounded to Task 0005, commit it
  on the PR branch, push, and wait for CI again before deciding PASS/FAIL.
- Do not merge while the PR contains material out-of-scope changes or report/code
  contradictions.
- Do not assume deploy-role or Secrets Manager write-path verification happened
  unless CI logs or direct evidence prove it.

# Integration Notes

- Task 0005 is the immediate prerequisite for Task 0006.
- The bootstrap component is intentionally narrow: it should prove the backend
  and credential seam without creating the Supabase project.
- The deploy-role path is still constrained by the missing GitHub environment
  `production`; be exact about whether that is an accepted residual gap or a
  merge blocker for this task.
- `specs/orun-golden-path.md` still names Orun `v2.1.0` and
  `sourceplane/orun-action@v1.2.0` as the reference. If PR #27 intentionally
  advances Orun to `v2.2.1`, verification must determine whether that drift is
  justified within this task.

# Acceptance Criteria

- Local verification passes or exact blockers are reported:
  - `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
  - `/Users/irinelinson/.local/bin/kiox -- orun plan --intent intent.yaml --view dag`
  - `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
  - `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`
  - targeted Terraform `fmt -check`, `init`, and `validate` for
    `infra/terraform/bootstrap/terraform`
- PR #27 CI run `26159717427` is acceptable and its logs show the expected Orun
  plan/run plus Terraform bootstrap execution.
- The PR is bounded to Task 0005 only, with unrelated files removed or called as
  blockers.
- Active Terraform backend usage and docs point to AWS S3, not Cloudflare R2.
- The verifier report states clearly whether deploy-role / Secrets Manager
  write-path verification is complete, deferred, or blocked, with evidence.
- If PASS, PR #27 is merged, local `main` is fast-forwarded to `origin/main`,
  and the repo is left clean.
- If FAIL, PR #27 remains open and the report lists concrete blockers.

# Verification

Use the verifier merge protocol from `agents/orchestrator.md`:

- inspect prompt, report, PR diff, local checks, CI logs, and actual repo state;
- verify the PR stays within one bounded Terraform-seam task;
- check successful GitHub Actions logs, not only summaries;
- merge only on PASS;
- sync local `main` after merge.

# When Done Report

Write `ai/reports/task-0005-verifier.md` with:

- Result: PASS or FAIL
- Checks
- Issues
- Risk Notes
- Spec Proposals
- Recommended Next Move
