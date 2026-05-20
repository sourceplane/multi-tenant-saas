# Task ID

Task 0003 CI Fix

# Agent

Implementer

# Current Repo Context

Task 0003 has an open PR:

- PR: #25 (`task-0003-orun-golden-path`)
- URL: https://github.com/sourceplane/multi-tenant-saas/pull/25
- Head commit when this prompt was generated: `5aebc73`
- Base: `main` at `01429e1`

The PR correctly excludes the unrelated local `agents/agent-loop.sh` change.
Terraform CI jobs pass, but all non-Terraform app/package/test jobs fail in
their first `setup-node` step.

Observed failed log pattern:

```text
Attempting to download <no value>...
error: Unable to find Node version '<no value>' for platform linux and architecture x64.
```

Sample failed jobs:

- `contracts · dev · Verify`
- `testing · dev · Verify`
- `web-console · dev · Verify deploy`

The likely cause is the Task 0003 migration from `spec.inputs` to
`spec.parameters`: non-Terraform schemas and component manifests now use
`parameters`, but their job templates still read top-level fields such as
`{{.nodeVersion}}`, `{{.pnpmVersion}}`, `{{.buildCommand}}`,
`{{.productionBranch}}`, and `{{.outputDir}}`. The Terraform template already
uses the Orun v2 shape, for example `{{ .parameters.terraformVersion }}` and
`{{ .orun.environment.name }}`.

# Objective

Fix PR #25 so all changed non-Terraform compositions render component
parameters correctly under Orun v2 and PR CI can pass.

# PR Boundary

Same PR #25. This is a fix inside Task 0003, not a new feature PR.

Only update the Stack Tectonic composition/job/template files, component
descriptors, reports, and compact context needed to complete Task 0003.

# Read First

- `ai/tasks/task-0003.md`
- `ai/tasks/task-0003-pr-completion.md`
- `ai/reports/task-0003-implementer.md`
- `specs/orun-golden-path.md`
- `specs/repo.md`
- `specs/access-and-infra.md`
- `specs/components/00-foundation-and-tooling.md`
- `intent.yaml`
- `stack-tectonic/compositions/turbo-package/**`
- `stack-tectonic/compositions/cloudflare-worker-turbo/**`
- `stack-tectonic/compositions/cloudflare-pages-turbo/**`
- `stack-tectonic/compositions/cloudflare-worker/**`
- `stack-tectonic/compositions/cloudflare-pages/**`
- `stack-tectonic/compositions/cloudflare-pages-terraform/**`
- `stack-tectonic/compositions/cloudflare-pages-turbo-terraform/**`
- PR #25 CI logs, especially run `26109080001`

# Required Outcomes

- Update all non-Terraform job templates whose schemas were migrated to
  `parameters` so they read values from the Orun v2 context:
  - use `{{ .parameters.nodeVersion }}` instead of `{{ .nodeVersion }}`;
  - use `{{ .parameters.pnpmVersion }}` instead of `{{ .pnpmVersion }}`;
  - use `{{ .parameters.* }}` for optional commands and resource names;
  - use `{{ .orun.environment.name }}` and `{{ .orun.component.name }}` for
    environment/component identity where the template currently relies on old
    top-level aliases.
- Cover every affected non-Terraform composition, not just the three sampled
  failed jobs, so the next CI run does not fail later in a different template.
- Inspect rendered plans locally to confirm `setup-node` receives concrete Node
  versions for app, package, and test jobs.
- Keep Terraform composition behavior unchanged unless required by the same
  parameter-context issue.
- Keep `agents/agent-loop.sh` out of the PR unless you prove it is required for
  Task 0003 acceptance.
- Update `ai/reports/task-0003-implementer.md` with the CI failure, the fix,
  and the new checks/CI run outcome.
- Push the fix to branch `task-0003-orun-golden-path`.

# Non-Goals

- No verifier report.
- No merge.
- No Task 0004 implementation.
- No `aws-admin` changes.
- No S3 backend migration.
- No Supabase, Cloudflare, or AWS live resource creation.
- No domain app behavior changes.
- No unrelated cleanup or agent-loop automation work.

# Constraints

- Do not widen this PR beyond Task 0003’s Orun/Stack Tectonic contract fix.
- Do not commit generated `.orun/**`, `plan.json`, Terraform state,
  `.terraform/**`, caches, or secrets.
- Do not hide failures by removing app/package/test jobs from the plan. The fix
  must preserve Orun-planned verification.
- If an Orun v2 template path differs from the Terraform example, prove the
  correct path from rendered plan/job output before pushing.

# Integration Notes

- `gh pr checks 25` showed Terraform jobs passing and non-Terraform jobs
  failing at `setup-node`.
- `rg` currently finds non-Terraform job templates still using top-level
  placeholders such as `{{.nodeVersion}}`.
- Component manifests already provide `spec.parameters.nodeVersion` and
  `spec.parameters.pnpmVersion`.
- The current local worktree also has uncommitted orchestrator files and an
  unrelated `agents/agent-loop.sh` edit. Do not accidentally include unrelated
  local changes in the PR commit.

# Acceptance Criteria

- Local rendered plan/job output shows app, package, and test jobs have
  concrete `actions/setup-node` versions (`20` or `22`), not `<no value>`.
- These local checks pass or have exact blockers documented:
  - `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
  - `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
  - `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
- PR #25 receives a new commit and CI no longer fails with
  `Unable to find Node version '<no value>'`.
- `ai/reports/task-0003-implementer.md` records the failure, fix, checks, and
  current PR #25 status.

# Verification

After the fix is pushed and PR CI is green, the next orchestrator step should
produce a Task 0003 verifier prompt. Do not self-verify or merge in this
implementer task.

# When Done Report

Update `ai/reports/task-0003-implementer.md` with:

- Summary
- Files Changed
- Orun Plan Impact
- Checks Run
- CI Follow-Up
- Assumptions
- Spec Proposals
- Remaining Gaps
- Next Task Dependencies
- PR Number
