# Current Context

Last updated: 2026-05-19

## Repo Reality

- `main` is synced with `origin/main` at `f645d41` (Task 0003.1 PR pending merge).
- Task 0003 merged as PR #25:
  https://github.com/sourceplane/multi-tenant-saas/pull/25
- PR #25 head was `fb0f2e4`; merge commit on `main` is `f645d41`.
- PR #25 checks passed on CI run `26110433274`.
- Post-merge `main` CI run `26113133649` failed because legacy Terraform
  component `tf-state-r2` attempted to create the existing bucket
  `sourceplane-tf-state` and failed with Cloudflare `409 Conflict`.
  This is resolved by Task 0003.1 (see below).
- Tasks 0001, 0001.1, 0002, and 0003 are verified and merged.
- Task 0003.1 deletes `infra/terraform/tf-state-r2/` and
  `infra/terraform/core/` from active repo source (PR pending). No live
  resource cleanup was performed; the orphaned R2 bucket and Hyperdrive
  adoption scaffold remain as historical Task 0002 artifacts.
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
- `aws-admin` IAM roles for this repo do not yet exist (Task 0004).
- S3 backend consumption is deferred to Task 0005.

## Current Roadmap Position

- Active spec pack: reusable SaaS starter under `specs/**`.
- Current phase: Week 0 / operations foundation aligned with golden path.
- Immediate focus: verify and merge Task 0003.1, then AWS-admin IAM access
  (Task 0004), then S3 state migration (Task 0005), then fresh Supabase infra
  (Task 0006).

## Current Task

- Task 0003.1 is implemented, pending verification and merge.
- After Task 0003.1 merges and `main` CI passes, next implementer task is
  Task 0004 in `aws-admin`.
- Task 0004 in `aws-admin` is blocked until Task 0003.1 restores a green
  `main` branch.
