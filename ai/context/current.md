# Current Context

Last updated: 2026-05-19

## Repo Reality

- `main` is synced with `origin/main` at `431cbcc`.
- No GitHub pull requests are currently open.
- Tasks 0001, 0001.1, and 0002 are verified and merged.
- The repo has a pnpm/Turbo/Orun scaffold, committed `stack-tectonic/`, provider-style `kiox.yaml`/`kiox.lock`, schema-aligned component descriptors, and Orun-only CI.
- The current checked-in Orun runtime and stack model have drifted from the newer `aws-admin` golden path: `multi-tenant-saas` is temporarily pinned to Orun v1.26.0 and still uses an older Terraform composition style.
- The two existing Terraform component manifests carry a temporary top-level
  `inputs` mirror so current CI can validate them when workflow changes trigger
  infra planning. Task 0003 should replace this compatibility shape with the
  final `spec.parameters`/Orun v2 contract.
- `aws-admin` is the current reference for Orun Terraform work: Orun v2.1.0, `sourceplane/orun-action@v1.2.0`, `dev`/`stage`/`prod` environments, `parameterDefaults.terraform`, S3 state buckets, and component-local README conventions.
- A concise Orun golden-path reference now lives at `specs/orun-golden-path.md`.

## Current Roadmap Position

- Active spec pack: reusable SaaS starter under `specs/**`.
- Current phase: Week 0 / operations foundation realignment.
- Next focus: align Orun/Stack Tectonic behavior with `aws-admin`, then add AWS-admin IAM access, migrate Terraform state from R2 to S3, and create Supabase infra with AWS Secrets Manager storage.

## Current Task

- `ai/tasks/task-0003.md` is the next implementer task.
- Task 0003 must align `multi-tenant-saas` Orun runtime, environment shape, Terraform composition, component manifests, READMEs, and CI/local verification behavior with the `aws-admin` golden path.
