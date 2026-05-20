# Current Context

Last updated: 2026-05-20

## Repo Reality

- `main` is synced with `origin/main` at `f6e9ee3`.
- Task 0003 merged as PR #25:
  https://github.com/sourceplane/multi-tenant-saas/pull/25
- PR #25 head was `fb0f2e4`; merge commit on `main` is `f645d41`.
- PR #25 checks passed on CI run `26110433274`.
- Post-merge `main` CI run `26113133649` failed because legacy Terraform
  component `tf-state-r2` attempted to create the existing bucket
  `sourceplane-tf-state` and failed with Cloudflare `409 Conflict`.
  This is resolved by Task 0003.1 (see below).
- Tasks 0001, 0001.1, 0002, and 0003 are verified and merged.
- Task 0003.1 merged as PR #26:
  https://github.com/sourceplane/multi-tenant-saas/pull/26
- PR #26 head was `727bda7`; merge commit on `main` is `f6e9ee3`.
- PR #26 checks passed on CI run `26114914435`.
- Post-merge `main` CI run `26115035887` passed after deleting
  `infra/terraform/tf-state-r2/` and `infra/terraform/core/` from active repo
  source. No live resource cleanup was performed; the orphaned R2 bucket and
  Hyperdrive adoption scaffold remain as historical Task 0002 artifacts.
- The repo uses Orun v2.1.0 with `sourceplane/orun-action@v1.2.0`.
- Environments are `dev`, `stage`, `prod` with promotion chains and
  `parameterDefaults.terraform` matching `aws-admin`.
- Composition source is `kind: dir` pointing to `stack-tectonic/`, bound as
  the `terraform` type. Non-terraform compositions (turbo-package,
  cloudflare-worker-turbo, cloudflare-pages-turbo) are also resolved from the
  same local stack.
- Terraform components use `spec.parameters`, `plan-only`/`apply` profiles,
  explicit `dependsOn`, and colocated READMEs in `aws-admin` style.
- All non-terraform components migrated from `spec.inputs` to `spec.parameters`
  and from old environment names (`staging`/`production`) to `stage`/`prod`.
- CI uses the same plan/run shape as `aws-admin` with conditional `--changed`.
- Task 0004 merged in `../aws-admin` as PR #22:
  https://github.com/sourceplane/aws-admin/pull/22
- PR #22 head was `c309a06`; local `../aws-admin` is synced to `main` at
  `6c406a9` after verifier merge.
- PR #22 CI run `26134161800` passed on the PR branch.
- Post-merge `aws-admin` main CI run `26134394923` passed and applied the new
  IAM component for `sourceplane/multi-tenant-saas`.
- The merged `aws-admin` component is
  `domains/access/github-repositories/sourceplane-multi-tenant-saas/` and adds
  environment-scoped GitHub OIDC IAM roles for `sourceplane/multi-tenant-saas`
  with S3 state and Secrets Manager access scoped to
  `sourceplane/multi-tenant-saas/*`.
- Verified plan role ARNs:
  - `arn:aws:iam::306024784101:role/dev-github-sourceplane-multi-tenant-saas-plan`
  - `arn:aws:iam::306024784101:role/stage-github-sourceplane-multi-tenant-saas-plan`
  - `arn:aws:iam::306024784101:role/prod-github-sourceplane-multi-tenant-saas-plan`
- Verified deploy role ARNs:
  - `arn:aws:iam::306024784101:role/dev-github-sourceplane-multi-tenant-saas-production-deploy`
  - `arn:aws:iam::306024784101:role/stage-github-sourceplane-multi-tenant-saas-production-deploy`
  - `arn:aws:iam::306024784101:role/prod-github-sourceplane-multi-tenant-saas-production-deploy`
- This repo can now proceed with S3 backend and Secrets Manager consumption in
  Task 0005.

## Current Roadmap Position

- Active spec pack: reusable SaaS starter under `specs/**`.
- Current phase: Week 0 / operations foundation aligned with golden path.
- Immediate focus: finish Task 0005 as a reviewable PR in this repo so the AWS
  S3 backend and Terraform credential seam are actually landed and verified
  before advancing to Task 0006.

## Current Task

- Task 0005 exists only as local, uncommitted work on `main`; there is not yet
  a Task 0005 branch or PR.
- The local Task 0005 draft re-adds `infra/` to `intent.yaml`, adds explicit
  AWS OIDC credential setup to the Terraform composition, and creates
  `infra/terraform/bootstrap/`.
- Local Task 0005 checks are reported as passing for Orun validate, plan DAG,
  changed plan, dry-run, Terraform fmt, `init -backend=false`, and validate.
- The current local Task 0005 report still defers deploy-role / Secrets
  Manager write-path verification and does not include a PR number.
- `gh pr list --state open` currently returns no open PRs for this repo.
- `gh api repos/sourceplane/multi-tenant-saas/environments` currently returns
  no GitHub environments, so the existing deploy-role trust subject requiring
  environment `production` cannot yet be exercised.
- The next worker handoff is `ai/tasks/task-0005-pr-completion.md`.
