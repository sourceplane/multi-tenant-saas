# Task ID

Task 0029

# Agent

Verifier

# Current Repo Context

- Task 0029 implementer prompt: `ai/tasks/task-0029.md`
- Task 0029 implementer report: `ai/reports/task-0029-implementer.md`
- PR #70 is open and clean:
  `fix(db-migrate): use spec.path for Orun changed-plan detection`
  (`codex/task-0029-db-migrate-changed-plan` -> `main`)
- PR #70 branch head is `1fb490d`
  (`docs: update task-0029 report with PR number`)
- Feature commit under review is `9939dec`
  (`fix(db-migrate): use spec.path for Orun changed-plan detection (#70)`)
- Latest PR CI run `26389113641` passed all 6 checks, including:
  - `plan`
  - `db · dev · Verify`
  - `db · stage · Verify`
  - `db · prod · Verify`
  - `db-migrate · stage · Migrate`
  - `db-migrate · prod · Migrate`
- Tasks 0001-0028 are verified and merged on `main` at `240e412`
- Task 0028 merged `040_projects_core`, but post-merge main CI run
  `26387697533` did not include `db-migrate`, so the migration is still not
  proven applied to `stage` and `prod`

# Objective

Verify that PR #70 safely repairs Orun changed-plan ownership for
`packages/db/src/migrations/**`, preserves the intended `db` -> `db-migrate`
DAG, and makes the merge path apply `040_projects_core` to the live `stage` and
`prod` Supabase projects through the existing Orun-controlled CI path.

# PR Boundary

One PR verification. Fixes may be committed to the same PR branch only if they
are required to satisfy Task 0029 acceptance criteria. Do not add new feature
scope, new migrations, direct provider apply commands, or bespoke GitHub
Actions logic.

# Read First

- `ai/tasks/task-0029.md`
- `ai/reports/task-0029-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `specs/orun-golden-path.md`
- `specs/repo.md`
- `specs/access-and-infra.md`
- `specs/components/00-foundation-and-tooling.md`
- `infra/db-migrate/component.yaml`
- `stack-tectonic/compositions/db-migrate/jobs/db-migrate-run.yaml`
- `packages/db/src/migrations/040_projects_core/up.sql`
- `packages/db/src/manifest.ts`
- `packages/db/src/runner/cli.ts`

Do not read or apply `specs-v2/**`; this remains reusable SaaS foundation work.

Then inspect:

- PR #70 diff, changed-file list, checks, and job logs
- the rendered changed-plan output for both PR and `github-push-main`
- post-merge main CI evidence after merge, including migration apply logs

# Required Verification

1. Scope and PR hygiene
   - Confirm PR #70 changes only the task-scoped `db-migrate` component wiring,
     composition job template wiring, and the implementer report.
   - Confirm no Worker runtime, api-edge, policy-worker, membership-worker, UI,
     Terraform, Wrangler, Supabase project provisioning, AWS IAM, or
     `specs-v2/**` files changed.
   - Confirm no ignored generated outputs are staged or committed.
   - Confirm `ai/reports/task-0029-implementer.md` is committed on the PR
     branch before merge.

2. Change-detection behavior
   - Confirm `infra/db-migrate/component.yaml` now uses supported Orun
     change-ownership behavior for migration files.
   - Confirm a migration-file change such as
     `packages/db/src/migrations/040_projects_core/up.sql` selects both the `db`
     component and `db-migrate` for `stage` and `prod`.
   - Confirm a non-migration change such as `packages/db/src/index.ts` does not
     incorrectly select `db-migrate`.
   - Confirm no unexpected extra components/jobs are selected for the focused
     migration-file changed plan.

3. Job-template execution correctness
   - Confirm the updated CLI path in
     `stack-tectonic/compositions/db-migrate/jobs/db-migrate-run.yaml`
     correctly resolves `packages/db/dist/runner/cli.js` from the actual job
     working-directory context.
   - Inspect PR CI logs to confirm the `build-db-package` step and the
     `Migration Plan` steps executed successfully with the updated path.
   - Confirm the change does not rely on accidental shell behavior that would
     break on a clean GitHub runner.

4. DAG and trigger semantics
   - Confirm PR-style changed plans select `db-migrate.stage.migrate` and
     `db-migrate.prod.migrate` with the `Migration Plan` step, not apply.
   - Confirm `--trigger github-push-main` selects the same migrate jobs with the
     `Migration Apply` step.
   - Confirm the DAG still preserves:
     - `db.stage.verify` before `db-migrate.stage.migrate`
     - `db.prod.verify` and `db-migrate.stage.migrate` before
       `db-migrate.prod.migrate`
   - Confirm no ad hoc CI branching or direct provider apply commands were
     added outside Orun-controlled jobs.

5. Live-apply completion for `040_projects_core`
   - If local verification passes, merge PR #70.
   - Sync local `main` to the merge commit.
   - Inspect the post-merge `main` CI run and record its run ID.
   - Confirm `db-migrate.stage.migrate` and `db-migrate.prod.migrate` both ran
     on `main` and completed successfully.
   - Confirm the observed migration state shows `040_projects_core` present in
     `_migrations.applied` for both `stage` and `prod`, using migration-runner
     output, CI logs, or another approved non-secret inspection path.
   - Do not print database passwords, API keys, service-role keys, or
     connection strings.

# Required Checks

Run at minimum:

```bash
git diff --check
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed \
  --files packages/db/src/migrations/040_projects_core/up.sql \
  --intent intent.yaml \
  --output /tmp/task-0029-migration-pr-plan.json
jq -r '.jobs[].id' /tmp/task-0029-migration-pr-plan.json
jq '.jobs[] | select(.id|contains("db-migrate")) | {id, checkName, steps: [.steps[]?.name // .steps[]?.id]}' /tmp/task-0029-migration-pr-plan.json
/Users/irinelinson/.local/bin/kiox -- orun run \
  --plan /tmp/task-0029-migration-pr-plan.json \
  --dry-run --runner github-actions
/Users/irinelinson/.local/bin/kiox -- orun plan --changed \
  --files packages/db/src/index.ts \
  --intent intent.yaml \
  --output /tmp/task-0029-non-migration-plan.json
jq -r '.jobs[].id' /tmp/task-0029-non-migration-plan.json
/Users/irinelinson/.local/bin/kiox -- orun plan --changed \
  --files packages/db/src/migrations/040_projects_core/up.sql \
  --trigger github-push-main \
  --intent intent.yaml \
  --output /tmp/task-0029-migration-main-plan.json
jq '.jobs[] | select(.id|contains("db-migrate")) | {id, checkName, steps: [.steps[]?.name // .steps[]?.id]}' /tmp/task-0029-migration-main-plan.json
/Users/irinelinson/.local/bin/kiox -- orun run \
  --plan /tmp/task-0029-migration-main-plan.json \
  --dry-run --runner github-actions
gh pr checks 70
```

Also inspect the successful PR CI run `26389113641` with `gh` so you can cite
real job/log evidence for the updated path and step names.

If you add verifier fixes, rerun the affected local checks and ensure PR CI is
green again before merging.

# Merge Requirement

If verification passes:

- Merge PR #70.
- Sync local `main` to the merge commit.
- Confirm the post-merge main CI run starts or, if already complete, record its
  result.
- Explicitly confirm whether `040_projects_core` applied successfully to
  `stage` and `prod`.
- Leave `ai/state.json` and compact context ready for the Orchestrator to
  record Task 0029 as verified.

If verification fails:

- Keep PR #70 open.
- Either commit scoped verifier fixes to the PR branch or write a concise FAIL
  report explaining the blocker.

# Report Expectations

Write `ai/reports/task-0029-verifier.md` with:

- Result: PASS or FAIL.
- PR number and merge status.
- Checks run with exact commands and results.
- PR CI evidence, including run `26389113641` and the relevant job/log findings.
- Post-merge main CI run ID and migrate-job conclusions.
- Observed migration state for `040_projects_core` in `stage` and `prod`.
- Findings/issues, if any.
- Verifier fixes, if any.
- Risk notes.
- Spec proposals, if any.
- Recommended next move.
