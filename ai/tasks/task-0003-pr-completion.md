# Task ID

Task 0003 PR Completion

# Agent

Implementer

# Current Repo Context

Task 0003 was implemented locally but has not been committed, pushed, or opened
as a PR. `gh pr list --state open` currently returns no open PRs for this repo.

The workspace is on `main` with a dirty worktree containing the Task 0003 Orun
golden-path implementation, `ai/reports/task-0003-implementer.md`, and an
unexpected `agents/agent-loop.sh` modification that is not described in the
Task 0003 report.

Task 0004 is already planned but remains blocked until Task 0003 has a PR,
verification, and merge.

# Objective

Finish Task 0003 as one reviewable PR in `multi-tenant-saas`.

The PR should land the Orun golden-path alignment from `ai/tasks/task-0003.md`
and include an accurate implementer report with the PR number. Do not advance
to Task 0004.

# PR Boundary

One PR in `multi-tenant-saas` for Task 0003 only.

The PR may include Orun runtime, intent, CI, Stack Tectonic composition,
component manifest, component README, and compact AI context/report changes
needed for Task 0003.

Do not include unrelated agent-loop automation changes unless you can show they
are required for Task 0003 acceptance. If `agents/agent-loop.sh` is unrelated
local/user work, preserve it locally without committing it to the Task 0003 PR.

# Read First

- `ai/tasks/task-0003.md`
- `ai/reports/task-0003-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `specs/orun-golden-path.md`
- `specs/repo.md`
- `specs/access-and-infra.md`
- `specs/components/00-foundation-and-tooling.md`
- `intent.yaml`
- `kiox.yaml`
- `.github/workflows/ci.yml`
- `stack-tectonic/compositions/terraform/**`
- `infra/terraform/**/component.yaml`
- `infra/terraform/**/README.md`
- `../aws-admin/intent.yaml`
- `../aws-admin/kiox.yaml`
- `../aws-admin/.github/workflows/ci.yaml`
- `../aws-admin/stacks/aws-admin-terraform/**`

# Required Outcomes

- Inspect the dirty worktree and map each changed file to Task 0003 acceptance.
- Re-run or update the Task 0003 implementation only where required to satisfy
  `ai/tasks/task-0003.md`.
- Keep the PR scoped to Task 0003. Exclude unrelated local changes from the
  commit and PR diff.
- Ensure the new Terraform profile files are committed if they are part of the
  Terraform composition change.
- Ensure deleted old Terraform profile files are intentional and represented in
  the PR diff.
- Update `ai/reports/task-0003-implementer.md` so it accurately describes the
  final committed diff, checks run, remaining gaps, and PR number.
- If any non-trivial spec or scope drift is needed, write an
  `ai/proposals/task-0003-*.md` proposal instead of silently changing behavior.
- Create a branch, commit the Task 0003 changes, push it, and open the PR.

# Non-Goals

- No Task 0004 implementation.
- No `aws-admin` changes.
- No S3 backend consumption migration.
- No Supabase project/database creation.
- No Cloudflare Hyperdrive creation or import.
- No domain code, database migrations, UI, API, identity, billing, audit, or
  product behavior.
- No product-specific `specs-v2/**` work.

# Constraints

- Trust code and rendered Orun plans over stale docs.
- Do not commit `.orun/**`, `plan.json`, Terraform state, `.terraform/**`, or
  generated caches.
- Do not commit secrets, provider tokens, Terraform state, or generated
  credentials.
- Do not run destructive git commands or discard unrelated user changes.
- Do not add direct Terraform, Wrangler, Supabase, AWS, pnpm, or turbo CI jobs
  outside Orun.
- If the local dirty state makes it impossible to isolate a clean Task 0003 PR,
  stop and report the blocker clearly.

# Integration Notes

- Open PR list was empty when this prompt was generated.
- `main` was synced with `origin/main` at `01429e1`.
- Current dirty files include `agents/agent-loop.sh`; that file is not part of
  Task 0003 unless proven otherwise.
- The Task 0003 report currently says `PR Number: TBD`; update it after opening
  the PR.
- Task 0005 will consume S3 backend behavior after Task 0004 creates the
  `aws-admin` IAM roles. Task 0003 must not require those roles to pass local
  planning.

# Acceptance Criteria

- A Task 0003 PR exists in GitHub and contains one coherent Orun golden-path
  alignment.
- The PR diff excludes unrelated local/user changes.
- `ai/reports/task-0003-implementer.md` contains the actual PR number and
  matches the final PR diff.
- `kiox.yaml`, `kiox.lock`, and CI use Orun v2.1.0 /
  `sourceplane/orun-action@v1.2.0`.
- `intent.yaml` has `dev`, `stage`, and `prod` environments with Terraform
  defaults aligned with `aws-admin`.
- Terraform composition docs/schema/profiles use the `aws-admin` mental model:
  `spec.parameters`, `plan-only`, `apply`, `terraformDir`, and pinned
  `terraformVersion`.
- Existing Terraform components use `spec.parameters`, environment hardening,
  explicit dependencies, and `plan-only`/`apply` profile rules.
- Component READMEs follow the `aws-admin` component README style.
- Local checks pass or have exact, reproducible blockers documented:
  - `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
  - `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
  - `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`

# Verification

Do not self-verify or merge. The next orchestrator step should produce a
Task 0003 verifier prompt after the PR exists.

# When Done Report

Update `ai/reports/task-0003-implementer.md` with:

- Summary
- Files Changed
- Orun Plan Impact
- Checks Run
- Assumptions
- Spec Proposals
- Remaining Gaps
- Next Task Dependencies
- PR Number
