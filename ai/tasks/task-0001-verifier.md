# Task ID

Task 0001 Verification

# Agent

Verifier

# Current Repo Context

Task 0001 has an Implementer result on PR #4:

- PR: `https://github.com/sourceplane/multi-tenant-saas/pull/4`
- Branch: `task-0001-scaffold`
- Head commit observed by the Orchestrator: `60168d4`
- Base branch: `main`
- Implementer report: `ai/reports/task-0001-implementer.md`

The PR claims to add the initial pnpm/Turbo/Orun monorepo scaffold, Orun-only CI, starter Worker and Pages apps, shared packages, contract tests, and infra component placeholders. No spec proposals were filed. Orchestrator inspection found no open proposals and no human input blocker.

GitHub PR metadata showed `mergeStateStatus: CLEAN` and no `statusCheckRollup` entries at the time this verifier task was written. Confirm the actual GitHub Actions state yourself before deciding PASS or FAIL.

# Objective

Verify PR #4 against Task 0001, the reusable SaaS starter specs, and real repo behavior. If it fully satisfies the task and quality gates, merge it and sync local `main`. If it does not, leave the PR open with clear blockers.

# PR Boundary

This verification covers only the initial workspace and Orun component scaffold from Task 0001.

The PR must not include domain business behavior, live Cloudflare or Supabase resource creation, product-specific `specs-v2` work, or unrelated cleanup.

# Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0001.md`
- `ai/reports/task-0001-implementer.md`
- `ai/context/current.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `specs/constitution.md`
- `specs/product-overview.md`
- `specs/repo.md`
- `specs/access-and-infra.md`
- `specs/components/00-foundation-and-tooling.md`
- `specs/contracts/api-guidelines.md`
- `specs/contracts/tenancy-and-rbac.md`

Reference only:

- `specs/schedule.md`

# Required Outcomes

- Inspect PR #4 metadata, diff, implementer report, and current open review state.
- Confirm the PR maps to exactly Task 0001 and one coherent initial scaffold.
- Confirm the workspace installs and the required local gates pass:
  - `pnpm install`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
- Confirm all required Orun commands run and record their results:
  - `/Users/irinelinson/.local/bin/kiox -- orun compositions lock --intent intent.yaml`
  - `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
  - `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
  - `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`
- Inspect GitHub Actions with `gh`, including logs for successful jobs if jobs exist. Confirm CI uses Orun plan/run and does not run package, Wrangler, Terraform, or deploy commands directly.
- If PR checks are absent, determine whether GitHub Actions did not run, were skipped, or are unavailable. Treat missing required CI as a blocker unless there is a concrete repository-level reason and local Orun verification fully covers the task.
- Verify `.github/workflows/ci.yml` follows the Orun plan/run model from `specs/repo.md`, including `--remote-state` for CI run jobs.
- Verify `intent.yaml`, `kiox.yaml`, and `.orun/compositions.lock.yaml` match the pinned Stack Tectonic and Orun model.
- Verify each required component has a colocated `component.yaml` and that descriptors match the intended composition types and dependency model.
- Verify the Worker and Pages app scaffolds are buildable and remain minimal.
- Verify `packages/contracts`, `packages/shared`, `packages/testing`, and `tests/contracts` preserve extraction-safe boundaries.
- Write `ai/reports/task-0001-verifier.md`.
- If PASS, merge PR #4, checkout `main`, fast-forward from `origin/main`, and leave the local repo clean.
- If FAIL, leave PR #4 open and report concrete blockers.

# Non-Goals

- Do not add new product behavior.
- Do not provision or mutate live Cloudflare, Supabase, Hyperdrive, R2, or Terraform resources.
- Do not broaden Task 0001 into Terraform implementation, database migrations, identity, organization, project, billing, audit, webhook, notification, runtime, resource, or admin/support work.
- Do not apply `specs-v2/**`.

# Constraints

- Trust code and command output over stale docs.
- Do not merge with unresolved verification blockers.
- If verification finds a behavior, API contract, security boundary, persistence model, roadmap, or user-facing semantic spec drift, require an `ai/proposals/task-0001-spec-update.md` proposal or fail the PR until the drift is resolved.
- Verification-only fixes may be committed to the PR branch if small and directly required to complete Task 0001. Push them, wait for CI again, and include them in the verifier report.
- Do not commit secrets, temporary credentials, generated caches, or build output.
- If local Orun creates or changes `plan.json`, remove it or keep the worktree clean before finishing unless it is intentionally committed as a verifier fix.

# Integration Notes

Pay particular attention to these risks from Orchestrator inspection:

- The implementer report says local `orun plan --changed` referenced components named `admin-console-pages-git` and `docs-site-direct-upload`, which do not appear in this repo. Independently inspect the generated plan and decide whether this indicates stale Orun state, a composition problem, or a harmless local artifact.
- The starter error and actor contracts should not materially drift from `specs/contracts/api-guidelines.md` and `specs/contracts/tenancy-and-rbac.md`. In particular, compare the shared error code names and canonical actor kinds against the normative specs.
- The Worker `Env` type includes an `ENVIRONMENT` binding. Confirm this is acceptable for local build/dev behavior even though live binding configuration is deferred.
- The implementer report says `.orun/compositions.lock.yaml` was manually reconstructed because the lock command wrote inside the kiox container. Verify the committed lock file is accurate enough for Task 0001 or fail with a concrete remediation.
- CI currently had no status rollup in PR metadata when checked by the Orchestrator. Do not assume CI passed without inspecting GitHub Actions state and logs.

# Acceptance Criteria

- PR #4 satisfies every Task 0001 acceptance criterion or the verifier report identifies blockers.
- Local package gates and Orun verification commands pass, or any failure is clearly external and acceptable for this scaffold task.
- CI is present, Orun-only, and either successfully verified through GitHub Actions logs or explicitly blocked in the report.
- No live Cloudflare or Supabase resources are created or required by this PR.
- No secrets or plaintext credentials are committed.
- No meaningful spec drift is accepted silently.
- `ai/reports/task-0001-verifier.md` exists with `Result: PASS` or `Result: FAIL`.
- On PASS, PR #4 is merged and local `main` is clean and up to date with `origin/main`.
- On FAIL, PR #4 remains open with actionable issues.

# Verification

Use the Verifier Standard in `agents/orchestrator.md`.

Minimum commands to consider:

```bash
git status --short --branch
gh pr view 4 --json number,title,headRefName,baseRefName,isDraft,mergeStateStatus,statusCheckRollup,reviewDecision,commits,files,url
gh pr checks 4
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
/Users/irinelinson/.local/bin/kiox -- orun compositions lock --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
git status --short
```

Also inspect GitHub Actions workflow runs and job logs with `gh`.

# When Done Report

Write `ai/reports/task-0001-verifier.md` with:

- Result: PASS|FAIL
- Checks
- Issues
- Risk Notes
- Spec Proposals
- Recommended Next Move

If PASS, include the merge commit or merged PR reference and confirm local `main` sync. If FAIL, include exact blockers and what the Implementer should change.
