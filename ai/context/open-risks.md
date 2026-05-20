# Open Risks

Last updated: 2026-05-20

## Active Risks

- Supabase provisioning must not log generated database passwords or API keys. Secret names may be reported; secret values may not.
- The deploy trust subject from Task 0004 is
  `repo:sourceplane/multi-tenant-saas:environment:production`. If this repo
  later adopts per-environment GitHub environments for live apply, `aws-admin`
  trust subjects will need a follow-up update.
- This repo currently has no GitHub environments configured. Until environment
  `production` exists and apply jobs bind to it correctly, the Task 0005
  deploy-role path cannot be exercised end-to-end.
- Task 0006 will create live Supabase `stage` and `prod` projects. The PR must
  prove the plan targets only organization `sourceplane`
  (`dwazxcrywsdbxpuouifa`), does not create `dev`, and does not leak
  `SUPABASE_API_KEY`, generated database passwords, service keys, or connection
  strings.
- Task 0006 post-merge apply on `main` is currently blocked by two verified
  issues: the Supabase provider call must omit `instance_size` for the current
  free-plan organization, and the `aws-admin`-managed repo role still lacks the
  Secrets Manager create/write actions required for
  `sourceplane/multi-tenant-saas/supabase/<env>`.
- PR CI is not sufficient proof for Terraform components that switch from
  plan-only in pull requests to apply on `github-push-main`; remediation and
  verification must inspect the post-merge apply path directly.
- `multi-tenant-saas` now runs Orun `v2.2.1`; specs were updated to treat this
  repo's verified runtime as intentional while continuing to use `aws-admin` as
  the Terraform structure/backend reference.
- The orphaned R2 bucket `sourceplane-tf-state` and Hyperdrive adoption scaffold
  created in Task 0002 remain as live resources. They are intentionally out of
  scope for deletion in Task 0003.1; a future cleanup task may address them.

## Resolved Risks (Task 0005)

- The repo-level AWS S3 Terraform seam was blocking all new Terraform
  components. Resolved by merging PR #27, restoring `infra/` discovery, adding
  `infra/terraform/bootstrap/`, and confirming post-merge main CI run
  `26160643425` passed.
- Task 0005 report/code drift around the AWS credentials mechanism was resolved
  during verification. The shipped path uses
  `aws-actions/configure-aws-credentials@v4`; the report was corrected before
  merge.

## Resolved Risks (Task 0006 Planning)

- Supabase organization/account and environment mapping were blocking Task 0006.
  Human input resolved the target: use organization `sourceplane`
  (`dwazxcrywsdbxpuouifa`), provision separate `stage` and `prod`
  projects/databases, and leave `dev` unprovisioned for now.
- Orun runtime spec drift was resolved for this repo by accepting `v2.2.1` as
  the current verified local runtime in `specs/orun-golden-path.md`.

## Resolved Risks (Task 0004)

- Cross-repo AWS access was blocking S3 backend and Secrets Manager work.
  Resolved by verifying and merging `sourceplane/aws-admin#22`, then confirming
  post-merge apply in CI run `26134394923` and recording the exact IAM role
  identifiers for Task 0005.

## Resolved Risks (Task 0003.1)

- `main` was failing (CI run `26113133649`) because `tf-state-r2` selected
  Terraform `apply` on `github-push-main` and attempted to create the existing
  bucket `sourceplane-tf-state`, failing with Cloudflare `409 Conflict`. Resolved
  by deleting `infra/terraform/tf-state-r2/` and `infra/terraform/core/` from
  active repo source in PR #26. Post-merge `main` CI run `26115035887` passed.
  No live resource cleanup was performed.

## Resolved Risks (Task 0003)

- Orun runtime/CI/composition drift from `aws-admin` resolved by aligning to
  v2.1.0 and matching composition contract at that time.
- Environment name mismatch (`staging`/`production` vs `stage`/`prod`) resolved
  by renaming all component subscriptions.
- Schema contract mismatch (`inputs` vs `parameters`) resolved by migrating all
  schemas and components to `parameters`.
- Non-Terraform setup-node `<no value>` failures resolved in PR #25 by updating
  job templates to use `{{ .parameters.* }}` and Orun identity context.
- Task 0003 PR verification/merge gating resolved; PR #25 is merged.

## Watch Items

- Keep `.github/workflows/ci.yml` Orun-only.
- Verify that local `kiox -- orun ...` behavior and GitHub Actions behavior use the same rendered plan.
- Keep reusable SaaS starter work separate from product-specific `specs-v2` work.
- Any live AWS, Cloudflare, or Supabase resource creation must be independently verified by the verifier before merge.
