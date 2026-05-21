# Task ID

Task 0008 Verifier

# Agent

Verifier

# Current Repo Context

Task 0008 implementation is open as PR #35:

- URL: https://github.com/sourceplane/multi-tenant-saas/pull/35
- Branch: `codex/task-0008-db-migration-apply`
- Head commit before this verifier prompt: `45e3b7b69a50c8006c8e4d1b9924d586199c6cdd`
- Base: `main` at `cc40ff0750880b0c34a3b487bec447937968952c`
- Current PR state: open
- Latest observed PR CI run: `26222938898`

Observed repo reality when this prompt was generated:

- PR #35 adds a Node-only migration runner behind `@saas/db/runner`, an
  `infra/db-migrate` component, and a new `db-migrate` Stack Tectonic
  composition.
- Most PR checks in run `26222938898` passed, including package verification,
  Supabase Terraform plan jobs, and existing app/package jobs.
- `db-migrate · stage · Migrate` failed in PR CI at the `Migration Plan` step:
  `cd: packages/db: No such file or directory`.
- `db-migrate · prod · Migrate` failed because dependency
  `db-migrate.stage.migrate` failed.
- The likely cause is that Orun runs the `db-migrate` job from the component
  workdir `infra/db-migrate`, while the job template tries to `cd packages/db`
  using a path relative to the repo root.

The next safe move is to independently verify PR #35, fix only Task
0008-scoped verification blockers if needed, and merge only after the PR is
green and production-safe.

# Objective

Independently verify PR #35 against Task 0008. Confirm the migration runner and
Orun apply path are correct, bounded, secret-safe, and ready to merge.

If it passes after any necessary verifier fix, merge PR #35, sync local `main`,
and leave `main` clean. If it fails, leave the PR open with explicit blockers.

# PR Boundary

This verifier task covers PR #35 only.

Allowed verifier changes are limited to:

- a concise verifier report;
- small, strictly Task 0008-scoped fixes needed to make the migration runner or
  Orun job behave as specified;
- compact orchestration context/state updates that record the verification
  outcome.

Do not start the next feature task. Do not add domain migrations, Hyperdrive
wiring, Worker repository adapters, `dev` Supabase provisioning, or unrelated
Orun/CI refactors.

# Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0008.md`
- `ai/reports/task-0008-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `ai/proposals/task-0007.1-spec-update.md`
- `specs/constitution.md`
- `specs/repo.md`
- `specs/access-and-infra.md`
- `specs/domain-model.md`
- `specs/components/00-foundation-and-tooling.md`
- `specs/orun-golden-path.md`
- `README.md`
- `packages/db/**`
- `tests/db/**`
- `infra/db-migrate/component.yaml`
- `stack-tectonic/compositions/db-migrate/**`
- `infra/terraform/supabase/README.md`
- PR #35 diff, commits, review state, and CI logs
- GitHub Actions run `26222938898`

# Required Outcomes

- Confirm PR #35 maps to exactly one PR-sized task: the first production-safe
  migration runner and Orun-controlled apply path.
- Inspect the actual PR diff, branch content, implementer report, and CI logs,
  not only check summaries.
- Verify `@saas/db` default public exports remain Worker-safe and do not import
  Node-only modules from the default entry point.
- Verify Node-only code is isolated behind explicit runner/CLI entry points.
- Verify the runner actually:
  - reads the canonical migration manifest;
  - loads SQL files deterministically;
  - verifies checksums before apply;
  - detects already-applied migrations;
  - fails on checksum mismatch for an already-applied migration;
  - applies missing migrations in manifest order;
  - records successful applications in `_migrations.applied`;
  - is idempotent when re-run with no pending migrations;
  - uses safe transaction boundaries;
  - acquires and releases an advisory lock or documents why not.
- Verify PR CI migration jobs do not mutate live databases. PRs must run
  plan/read-only behavior only.
- Verify main-branch jobs apply only to `stage` and `prod`, never `dev`.
- Investigate the current CI failure in run `26222938898`. If the path issue is
  confirmed and the fix is small, fix it on the PR branch, push, and wait for
  the replacement CI run before deciding PASS/FAIL.
- Inspect successful replacement CI logs if a fix is pushed. Do not merge based
  only on local checks.
- If PASS, merge PR #35, switch to `main`, fast-forward from `origin/main`, and
  confirm `git status --short` is empty.
- If FAIL, leave PR #35 open and write blockers in the verifier report.

# Non-Goals

- No new domain schema beyond the existing baseline `_migrations` control
  migration unless a defect in that baseline is a Task 0008 blocker.
- No Cloudflare Hyperdrive Terraform component.
- No Worker database adapter or repository implementation.
- No identity, membership, projects, policy, events, billing, UI, product CLI,
  or runtime behavior.
- No `dev` Supabase provisioning.
- No direct use of raw connection strings in Worker code or committed config.
- No changes to `specs-v2/**`.
- No broad Orun, CI, or Terraform refactor unrelated to Task 0008.

# Constraints

- Trust repo code, PR diff, rendered Orun behavior, GitHub logs, and actual
  repo state over stale notes.
- Do not commit `.orun/**`, `plan.json`, `dist/`, `node_modules/`, TypeScript
  build info files, Terraform working directories, or secrets.
- Do not log generated database passwords, connection URIs, Supabase API keys,
  AWS credentials, or Secrets Manager payloads.
- Reports may include migration IDs, project refs, secret names, run IDs, and
  non-secret ARNs only.
- If verification needs a fix, keep it strictly bounded to Task 0008 scope,
  commit it on the PR branch, push, and wait for CI again before deciding
  PASS/FAIL.
- Do not merge while PR checks are failing or while the migration job could
  mutate live databases on pull requests.

# Integration Notes

- Supabase project refs:
  - stage: `thielrrsejwhjkdluwqm`
  - prod: `npbvrxkrlyrpnhrqucxa`
- Secret names:
  - `sourceplane/multi-tenant-saas/supabase/stage`
  - `sourceplane/multi-tenant-saas/supabase/prod`
- Current failing stage log line:
  `Migration Plan ... cd: packages/db: No such file or directory`.
- Current failing prod reason:
  `dependency db-migrate.stage.migrate failed`.
- Local AWS credentials may be unavailable. Do not fake live apply evidence;
  use GitHub Actions logs and provider inspection available through CI.
- The verifier should confirm post-merge main CI applied or no-op planned the
  migrations without exposing secret values.

# Acceptance Criteria

- Local verification passes or exact blockers are reported:
  - `pnpm install`
  - `pnpm --filter @saas/db build`
  - `pnpm --filter @saas/db typecheck`
  - `pnpm --filter @saas/db lint`
  - `pnpm --filter @saas/db-tests test`
  - `pnpm --filter @saas/db-tests typecheck`
  - `pnpm --filter @saas/db-tests lint`
  - `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
  - `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
  - `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`
- PR #35 has a green replacement CI run after any verifier fix.
- PR CI logs prove `db-migrate` runs in plan/read-only mode for `stage` and
  `prod`.
- Main CI logs after merge prove `db-migrate` apply behavior ran or no-op'd
  safely for `stage` and `prod`.
- The PR remains bounded to Task 0008 or the report lists concrete scope
  blockers.
- `ai/reports/task-0008-verifier.md` clearly states PASS or FAIL.
- If PASS, PR #35 is merged, local `main` is fast-forwarded to `origin/main`,
  and `git status --short` is empty.

# Verification

Use the verifier merge protocol from `agents/orchestrator.md`:

- inspect prompt, report, PR diff, local checks, CI logs, and actual repo state;
- fix only small Task 0008 blockers if necessary;
- verify the PR stays within one bounded migration-runner task;
- inspect successful GitHub Actions logs, not only summaries;
- merge only on PASS;
- sync local `main` after merge and leave it clean.

# PR Creation Requirement

PR #35 already exists and is the only PR in scope for this verifier task. Do
not open a new PR. If verification requires a small fix, keep it on the
existing PR branch, push the branch, and continue verification there.

# When Done Report

Write `ai/reports/task-0008-verifier.md` with:

- Result: PASS or FAIL
- Checks
- Issues
- CI Log Review
- Secret Handling Review
- Risk Notes
- Spec Proposals
- Recommended Next Move
