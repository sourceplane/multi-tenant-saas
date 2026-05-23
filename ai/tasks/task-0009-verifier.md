# Task ID

Task 0009 Verifier

# Agent

Verifier

# Current Repo Context

The reusable SaaS bootstrap specs under `specs/**` are authoritative for this
verification. `specs-v2/**` is not present in this checkout and remains out of
scope.

Current code reality:

- Local `main` is synced with `origin/main` at
  `3e6e5d0e80bda6df435b3002232de74e5d96529c`.
- PR #44 (`Revert main to f9356dc (clean rollback)`) merged on
  2026-05-23 and restored the repo tree to the Task 0009 baseline from PR #36.
- PR #44 intentionally reverted the later Worker-binding/deployment work from
  PRs #37, #38, and #39, plus CI-check metadata PRs #40/#42.
- Tasks 0001 through 0008 are verified. Task 0009 implementation is merged, but
  its verifier prompt/report were removed by the rollback and must be recreated
  before downstream Worker binding work resumes.
- PR #36 (`Task 0009: Cloudflare Hyperdrive infrastructure component`) merged
  with commit `f9356dcab5e3f32f0a06e64805c69201d1442252`.
- Task 0009 added `infra/terraform/cloudflare-hyperdrive/` and upgraded this
  repo's Orun runtime references from `v2.2.1` to `v2.3.0`.
- Main CI run `26293764021` applied the Hyperdrive resources:
  - stage: `08f7c6055f544a3890a585d88fd92348`,
    `stg-multi-tenant-saas-stage`
  - prod: `ab2c21c2db6245a59c91588fcac7107a`,
    `prod-multi-tenant-saas-prod`
- PR #44/main CI run `26322419196` passed after the rollback and refreshed both
  Hyperdrive resources with "No changes. Your infrastructure matches the
  configuration."
- Local Orun validation currently passes:
  `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`.
- Local component discovery currently shows 12 components, including
  `cloudflare-hyperdrive` stage and prod instances.

Known verification concerns to inspect carefully:

- `specs/orun-golden-path.md` and `specs/access-and-infra.md` still describe
  Orun `v2.2.1`, while code and CI now use `v2.3.0`. See
  `ai/proposals/task-0009-spec-update.md`.
- `infra/terraform/cloudflare-hyperdrive/component.yaml` does not currently
  declare an explicit `dependsOn` edge to `supabase`; determine whether that is
  a verifier blocker or a deferred Orun/spec limitation.
- The previous Task 0009 verifier report was removed by PR #44. Do not rely on
  it as durable repo state; inspect PR #36, PR #44, current code, and CI logs
  directly.

# Objective

Independently verify the merged Task 0009 Hyperdrive infrastructure baseline on
current `main`. Confirm the Terraform component, Orun behavior, live apply
evidence, secret handling, rollback outcome, and spec drift are production-safe
before any downstream Worker binding task is created.

# PR Boundary

This verifier task covers only Task 0009 and the post-rollback Task 0009
baseline currently on `main`.

Allowed verifier changes are limited to:

- a concise verifier report at `ai/reports/task-0009-verifier.md`;
- compact orchestration context/state updates that record the verification
  outcome;
- a spec proposal update if the Orun `v2.3.0` drift or Hyperdrive dependency
  contract needs a durable decision.

Do not reintroduce the reverted Worker package/binding/deployment work from
PRs #37, #38, or #39. Do not start the next feature task.

# Read First

- `agents/orchestrator.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `ai/reports/task-0009-implementer.md`
- `ai/proposals/task-0009-spec-update.md`
- `ai/proposals/task-0007.1-spec-update.md`
- `specs/constitution.md`
- `specs/repo.md`
- `specs/access-and-infra.md`
- `specs/components/00-foundation-and-tooling.md`
- `specs/orun-golden-path.md`
- `infra/terraform/cloudflare-hyperdrive/**`
- `infra/terraform/supabase/**`
- `stack-tectonic/compositions/terraform/**`
- `.github/workflows/ci.yml`
- PR #36 diff, commits, and CI logs
- PR #44 diff, commits, and CI logs
- Main CI runs `26293764021` and `26322419196`

# Required Outcomes

- Confirm PR #36 maps to exactly one PR-sized task: Cloudflare Hyperdrive
  infrastructure for the existing stage/prod Supabase projects.
- Confirm PR #44 restored the repo to the Task 0009 baseline and removed the
  reverted Worker-binding/deployment work.
- Verify the Hyperdrive Terraform component follows the Orun/Terraform golden
  path closely enough to stand as the current baseline.
- Verify CI/main logs show Hyperdrive resources were created and later
  refreshed without drift, without exposing secrets.
- Verify `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, Supabase database
  credentials, AWS credentials, and connection strings are not committed or
  logged in full.
- Decide whether the Orun `v2.3.0` runtime bump is acceptable as current repo
  reality and whether the specs need an accepted follow-up update.
- Decide whether the missing explicit `dependsOn` edge from
  `cloudflare-hyperdrive` to `supabase` is a blocker, a required small fix for
  a new implementer task, or a documented non-blocking limitation.
- Write a PASS or FAIL verifier report with concrete evidence and recommended
  next move.

# Non-Goals

- No Worker binding setup.
- No Worker runtime database adapter.
- No `packages/worker` restoration.
- No Wrangler deployment changes.
- No domain schema migration beyond existing Task 0008 baseline behavior.
- No `dev` Supabase or Hyperdrive provisioning.
- No direct Terraform, Cloudflare, Supabase, AWS, or Wrangler mutation outside
  Orun-controlled verification.
- No changes to product-specific `specs-v2/**`.

# Constraints

- Trust current code, PR diffs, rendered Orun behavior, GitHub Actions logs, and
  provider-observed state over stale docs.
- Inspect GitHub Actions logs, not only status summaries.
- Do not log generated database passwords, connection URIs, Supabase API keys,
  Cloudflare tokens, AWS credentials, or Secrets Manager payloads.
- Reports may include run IDs, job IDs, Hyperdrive IDs/names, Supabase project
  refs, secret names, and non-secret ARNs only.
- If source fixes are required, mark this verification FAIL and recommend a
  bounded follow-up implementer task. Do not make broad source changes in this
  verifier task.
- Do not commit ignored/generated outputs such as `.orun/**`, `plan.json`,
  `node_modules/`, `dist/`, TypeScript build info, or Terraform working
  directories.

# Integration Notes

- Supabase stage project ref: `thielrrsejwhjkdluwqm`.
- Supabase prod project ref: `npbvrxkrlyrpnhrqucxa`.
- Supabase secret names:
  - `sourceplane/multi-tenant-saas/supabase/stage`
  - `sourceplane/multi-tenant-saas/supabase/prod`
- Hyperdrive resource evidence from main CI run `26293764021`:
  - stage apply created `08f7c6055f544a3890a585d88fd92348`
    (`stg-multi-tenant-saas-stage`)
  - prod apply created `ab2c21c2db6245a59c91588fcac7107a`
    (`prod-multi-tenant-saas-prod`)
- Rollback validation evidence from run `26322419196`:
  - `cloudflare-hyperdrive · stage · Terraform` refreshed stage state and
    reported no changes.
  - `cloudflare-hyperdrive · prod · Terraform` refreshed prod state and
    reported no changes.
- Local AWS credentials may be unavailable in this checkout. Use GitHub Actions
  logs, Terraform state evidence, or authenticated provider CLIs when
  available; record any local access blockers clearly.

# Acceptance Criteria

Verification passes only if all of the following are true:

- Local `main` is synced with `origin/main` and the worktree is clean before and
  after verification.
- Current code contains Task 0009 and does not contain the reverted Task
  0010/0011/0012 Worker package/deployment changes.
- `infra/terraform/cloudflare-hyperdrive` is formatted and validates under the
  repo's Terraform/Orun workflow.
- Required local checks pass or exact environmental blockers are recorded:
  - `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
  - `/Users/irinelinson/.local/bin/kiox -- orun component --intent intent.yaml --long`
  - `/Users/irinelinson/.local/bin/kiox -- orun plan --intent intent.yaml --output plan.json`
  - `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`
  - `terraform -chdir=infra/terraform/cloudflare-hyperdrive/terraform fmt -check`
  - `terraform -chdir=infra/terraform/cloudflare-hyperdrive/terraform init -backend=false -input=false`
  - `terraform -chdir=infra/terraform/cloudflare-hyperdrive/terraform validate -no-color`
- GitHub Actions logs for PR #36, main run `26293764021`, PR #44, and main run
  `26322419196` prove the expected Orun plan/run commands and Terraform
  plan/apply/no-op behavior actually ran.
- No secret material is committed or exposed in logs/reports.
- The Orun `v2.3.0` spec drift is either accepted with a concrete follow-up or
  treated as a verification issue with a clear blocker.
- The missing explicit Supabase dependency is either shown to be safe under
  current Orun behavior or reported as a blocker/follow-up with enough detail
  for the next implementer.
- `ai/reports/task-0009-verifier.md` clearly states `Result: PASS` or
  `Result: FAIL`.

# Verification

Use the verifier standard from `agents/orchestrator.md`:

- inspect prompt, report, PR diffs, CI logs, local checks, current code, and
  actual repo state;
- detect overreach and hidden coupling;
- inspect provider/resource evidence directly where possible;
- do not rely on previous removed verifier artifacts;
- leave `main` clean.

# PR Creation Requirement

PR #36 and PR #44 are already merged. Do not open a new implementation PR for
this verifier task.

If verification passes, write the verifier report and compact context/state
updates as verification artifacts. If your execution environment requires those
artifacts to land through a branch/PR, keep that PR limited to verification
records only. If verification fails, do not create source fixes; report the
blockers and recommend the next bounded implementer task.

# When Done Report

Write `ai/reports/task-0009-verifier.md` with:

- `Result: PASS` or `Result: FAIL`
- `Checks`
- `Issues`
- `CI Log Review`
- `Live Resource Evidence`
- `Secret Handling Review`
- `Spec Proposals`
- `Risk Notes`
- `Recommended Next Move`
