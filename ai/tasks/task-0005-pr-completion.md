# Task ID

Task 0005 PR Completion

# Agent

Implementer

# Current Repo Context

Task 0005 work exists locally in this checkout, but it has not been turned into a
reviewable PR yet.

Observed repo reality when this prompt was generated:

- `main` is synced with `origin/main` at `f6e9ee3`.
- `gh pr list --state open` returns no open PRs for this repo.
- The worktree is dirty on `main` and includes Task 0005-oriented changes under
  `intent.yaml`, `stack-tectonic/compositions/terraform/**`,
  `infra/terraform/bootstrap/**`, `ai/context/**`, and
  `ai/reports/task-0005-implementer.md`.
- The worktree also includes unrelated local changes such as
  `agents/agent-loop.sh`; those are not part of Task 0005 unless proven
  necessary.
- The current Task 0005 report says the work is awaiting PR creation and CI, and
  it defers deploy-role and Secrets Manager smoke verification.
- `gh api repos/sourceplane/multi-tenant-saas/environments` currently returns no
  configured GitHub environments. The deploy-role trust subject from Task 0004
  expects GitHub environment `production`.

Task 0006 must not start yet. The next safe step is to finish Task 0005 as one
bounded PR and make the AWS/S3 Terraform seam reviewable.

# Objective

Finish Task 0005 as one reviewable PR in `multi-tenant-saas`.

Land the existing AWS/S3 Terraform-backend seam work, keep the PR scoped to Task
0005 only, and close as much of the remaining Task 0005 acceptance gap as can be
completed safely before merge.

# PR Boundary

One PR in `multi-tenant-saas` for Task 0005 only.

This PR may include:

- the existing `infra/` discovery restoration;
- the Terraform composition/profile/job changes needed for explicit AWS role
  assumption;
- the bootstrap Terraform component under `infra/terraform/bootstrap/`;
- CI and README/report/context updates required to complete Task 0005;
- a bounded fix for apply-role / GitHub-environment wiring if it can be done
  safely inside this task.

Do not include unrelated agent automation changes, product/domain code,
Supabase provisioning, or follow-on Task 0006 work.

# Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0005.md`
- `ai/reports/task-0005-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `ai/reports/task-0004-verifier.md`
- `specs/orun-golden-path.md`
- `specs/access-and-infra.md`
- `specs/repo.md`
- `specs/components/00-foundation-and-tooling.md`
- `intent.yaml`
- `.github/workflows/ci.yml`
- `stack-tectonic/compositions/terraform/**`
- `infra/terraform/bootstrap/**`

# Required Outcomes

- Inspect the dirty worktree and map each changed file to Task 0005 scope.
- Keep the PR scoped to Task 0005 and exclude unrelated local/user changes,
  especially `agents/agent-loop.sh`.
- Re-run and finish the Task 0005 implementation only where required to satisfy
  the task acceptance more accurately than the current local draft does.
- Create a branch, commit the Task 0005 changes, push it, and open the PR.
- Ensure the rendered Terraform job path keeps AWS credential setup explicit
  before `terraform init`.
- Ensure Terraform plan-only execution uses the verified plan-role pattern.
- If safe and reviewable in the same PR, ensure Terraform apply execution is
  wired to the verified deploy-role pattern rather than reusing the plan role.
- If apply-role wiring requires GitHub environment `production`, either:
  - implement the repo/workflow side of that wiring in this task and record the
    exact observed repo environment state, or
  - document the precise blocker if the environment cannot be created or bound
    safely within this task.
- Verify that active Terraform backend usage is AWS S3 only and no active
  component or README still presents Cloudflare R2 as the current backend.
- Run the required local Orun and Terraform checks.
- Update `ai/reports/task-0005-implementer.md` so it matches the final committed
  PR diff, current CI status, remaining gaps, and PR number.

# Non-Goals

- No Task 0006 Supabase Terraform implementation.
- No AWS IAM role or policy creation in `aws-admin`.
- No broad infrastructure rollout beyond the bounded bootstrap seam.
- No domain code, migrations, API/UI behavior, or `specs-v2/**` work.
- No unrelated cleanup or refactors.

# Constraints

- Do not commit `.orun/**`, `plan.json`, Terraform state, `.terraform/**`, or
  generated caches.
- Do not commit secrets, provider tokens, secret values, or generated
  credentials.
- Do not discard unrelated local changes you did not make.
- Do not widen CI into direct Terraform shell execution outside Orun.
- If the dirty worktree cannot be isolated into a clean Task 0005 PR, stop and
  report the blocker rather than guessing.
- If GitHub environment setup is changed, keep it minimal: only `production` if
  required by the existing deploy-role trust subject. Do not invent extra
  environments, protections, or naming schemes without evidence.

# Integration Notes

- The bootstrap component already exists locally and currently proves
  `aws_caller_identity` plus S3 bucket access through Terraform data sources.
- The local report explicitly says Secrets Manager write smoke verification was
  deferred; do not silently claim that gap is closed unless this task actually
  proves it.
- PR CI can prove the plan-role path. Deploy-role and write-path verification may
  still require post-merge `main` execution or explicit GitHub environment
  binding. Be exact about what this PR proves and what it does not.
- Task 0006 stays blocked until Task 0005 has a PR and the AWS/S3 seam is either
  verified or reduced to a clearly documented, bounded residual blocker.

# Acceptance Criteria

- A Task 0005 PR exists in GitHub and contains one coherent Terraform-seam PR.
- The PR diff excludes unrelated local changes such as `agents/agent-loop.sh`.
- `ai/reports/task-0005-implementer.md` contains the actual PR number and
  matches the final PR diff and CI status.
- `intent.yaml` discovers `infra/`, and Orun discovers
  `infra/terraform/bootstrap/`.
- Active Terraform backend configuration and docs point to AWS S3, not R2.
- Rendered Orun Terraform jobs show explicit AWS credential setup before
  `terraform init`.
- Local checks pass or have exact blockers documented:
  - `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
  - `/Users/irinelinson/.local/bin/kiox -- orun plan --intent intent.yaml --view dag`
  - `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
  - `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`
  - targeted Terraform `fmt -check`, `init`, and `validate` for
    `infra/terraform/bootstrap/terraform`
- PR CI passes on the Task 0005 branch.
- The report states clearly whether deploy-role / Secrets Manager write-path
  verification is complete in this task or remains the explicit blocker for
  verification.

# Verification

Do not self-verify or merge. The next orchestrator step should emit a Task 0005
verifier prompt after the PR exists.

# When Done Report

Update `ai/reports/task-0005-implementer.md` with:

- Summary
- Files Changed
- Backend Setup Notes
- AWS Role And Access Verification
- GitHub Environment State
- Orun Plan Impact
- Checks Run
- Assumptions
- Remaining Gaps
- Next Task Dependencies
- PR Number
