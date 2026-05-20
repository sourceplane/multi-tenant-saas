# Current Context

Last updated: 2026-05-21

## Repo Reality

- `main` is synced with `origin/main` at `fc795e4d974ae57d3e262084c393c04e18076f90`.
- Tasks 0001, 0001.1, 0002, 0003, 0003.1, 0004, and 0005 are verified and
  merged.
- Task 0005 merged as PR #27:
  https://github.com/sourceplane/multi-tenant-saas/pull/27
- PR #27 head after verifier fixes was `4c343b22a1f4d5bebfda251595f68c90f9029164`;
  merge commit on `main` is `0af75d05bb3660c58d9f991924f2f821c2522d0f`.
- PR #28 (`[codex] Prepare Task 0006 Supabase target`) merged at
  `9982aaeecbc78c6adde3edf4fae436e299b79515` and updated the active Task 0006
  prompt, compact context, and specs for the chosen Supabase org and the Orun
  `v2.2.1` runtime reference.
- PR #28 post-merge `main` CI run `26179180475` failed because `main` still
  planned unchanged verify jobs and remote Orun execution timed out/failed to
  authenticate.
- PR #29 (`chore: update orun-plan-changed`) merged at
  `024f8fe99c0b646acd0d7da36178cce5499ea41d` and changed `.github/workflows/ci.yml`
  so `orun plan --changed` runs on both pull requests and pushes to `main`.
- Post-merge `main` CI run `26180142027` passed; its matrix was empty because no
  changed components were selected on that merge commit.
- The repo now uses Orun `v2.2.1` with `sourceplane/orun-action@v1.2.0`.
- `intent.yaml` discovers `apps/`, `infra/`, `packages/`, and `tests/`, and the
  repo continues to use `dev`, `stage`, and `prod` environments with
  `parameterDefaults.terraform` aligned to the `aws-admin` shape.
- Terraform components are discovered under `infra/terraform/**` and currently
  include `infra/terraform/bootstrap/`, which proves the S3 backend and AWS role
  seam for this repo.
- The active Terraform job path still uses
  `aws-actions/configure-aws-credentials@v4`; Task 0005 verification confirmed
  the earlier native-shell claim was report drift, not shipped code.
- `.github/workflows/ci.yml` currently exports both `SUPABASE_API_KEY` and
  `SUPABASE_ACCESS_TOKEN` into Orun run jobs.
- `gh api repos/sourceplane/multi-tenant-saas/environments` still returns no
  configured GitHub environments, so the deploy-role trust subject requiring
  environment `production` is still not exercised end-to-end.
- Historical Task 0002 artifacts remain outside active source: the orphaned R2
  bucket cleanup question and Hyperdrive adoption scaffold were intentionally not
  revisited by Task 0003.1 or Task 0005.
- Human input for Task 0006 is resolved. Supabase provisioning target is
  organization `sourceplane` with slug/id `dwazxcrywsdbxpuouifa`, `stage` and
  `prod` only, with separate projects/databases named
  `multi-tenant-saas-stage` and `multi-tenant-saas-prod`. `dev` stays
  unprovisioned for now.
- Local read-only Supabase CLI check confirmed the `sourceplane` org id/slug.
  `supabase projects list` did not reveal a reusable existing project target in
  this checkout.
- Local worktree note: untracked `agents/agent-loop.sh` is present in this
  checkout but is now also part of merged `main` via PR #29.
- PR #30 (`chore: update supabase-infra`) merged at
  `fc795e4d974ae57d3e262084c393c04e18076f90` and landed the first
  `infra/terraform/supabase/` component plus CI mapping of `SUPABASE_API_KEY`
  to `SUPABASE_ACCESS_TOKEN`.
- PR #30 PR CI run `26185038583` passed, including `supabase · stage · Terraform`
  and `supabase · prod · Terraform` in plan-only mode.
- Post-merge `main` CI run `26185145757` failed in live apply for both
  `supabase.stage.terraform` and `supabase.prod.terraform`.
- The `stage` apply failure exposed two concrete gaps:
  - the Supabase provider call still sent `instance_size`, which the current
    free-plan `sourceplane` organization rejects with HTTP 402;
  - the repo-scoped AWS role lacks Secrets Manager create/write permissions for
    `sourceplane/multi-tenant-saas/supabase/<env>`.
- Local worktree currently includes Task 0006.1 remediation artifacts on `main`:
  modified `infra/terraform/supabase/terraform/main.tf` plus untracked
  `ai/tasks/task-0006.1-supabase-merge-fix.md` and
  `ai/reports/task-0006.1-implementer.md`.

## Current Roadmap Position

- Active spec pack: reusable SaaS starter under `specs/**`.
- Current phase: Week 0 / operations foundation remains active, but the AWS S3
  backend, Terraform credential seam, and first Supabase component are now
  landed.
- Immediate focus: remediate the Task 0006 post-merge apply failure with Task
  0006.1, keeping the repo-local fix in `multi-tenant-saas` and recording the
  exact `aws-admin` IAM delta required for Secrets Manager writes.

## Current Task

- Next implementer task: `ai/tasks/task-0006.1-supabase-merge-fix.md`.
- Task 0006 shipped in PR #30, but verification is not complete because merged
  `main` apply failed. Task 0006.1 is the active remediation task; do not
  generate Task 0007 until the Supabase apply path is stabilized and verified.
- Human input is no longer blocking; `ai/waiting_for_input.md` has been
  replaced with a no-input-requested note.
- The Orun `v2.2.1` spec alignment proposal has been accepted into
  `specs/orun-golden-path.md`; follow this repo's verified runtime and
  `aws-admin`'s Terraform component/backend structure.
