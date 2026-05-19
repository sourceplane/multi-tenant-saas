# Open Risks

Last updated: 2026-05-19

## Active Risks

- The `aws-admin` repo does not yet have the repo-scoped `sourceplane/multi-tenant-saas` IAM component. Until it lands and is verified, this repo cannot safely assume AWS roles for S3 state or Secrets Manager.
- Supabase provisioning must not log generated database passwords or API keys. Secret names may be reported; secret values may not.
- Cross-repo sequencing matters: `aws-admin` role creation must land before `multi-tenant-saas` consumes the role in CI or Terraform components.
- The S3 backend init step in future terraform components will fail on live runs
  until Task 0004 creates the IAM roles and Task 0005 wires them. Plan-only
  profile skips apply but init may still attempt backend connection.
- The orphaned R2 bucket `sourceplane-tf-state` and Hyperdrive adoption scaffold
  created in Task 0002 remain as live resources. They are intentionally out of
  scope for deletion in Task 0003.1; a future cleanup task may address them.

## Resolved Risks (Task 0003.1)

- `main` was failing (CI run `26113133649`) because `tf-state-r2` selected
  Terraform `apply` on `github-push-main` and attempted to create the existing
  bucket `sourceplane-tf-state`, failing with Cloudflare `409 Conflict`. Resolved
  by deleting `infra/terraform/tf-state-r2/` and `infra/terraform/core/` from
  active repo source. No live resource cleanup was performed.

## Resolved Risks (Task 0003)

- Orun runtime/CI/composition drift from `aws-admin` — resolved by aligning to v2.1.0 and matching composition contract.
- Environment name mismatch (`staging`/`production` vs `stage`/`prod`) — resolved by renaming all component subscriptions.
- Schema contract mismatch (`inputs` vs `parameters`) — resolved by migrating all schemas and components to `parameters`.
- Non-Terraform setup-node `<no value>` failures — resolved in PR #25 by
  updating job templates to use `{{ .parameters.* }}` and Orun identity context.
- Task 0003 PR verification/merge gating — resolved; PR #25 is merged.

## Watch Items

- Keep `.github/workflows/ci.yml` Orun-only.
- Verify that local `kiox -- orun ...` behavior and GitHub Actions behavior use the same rendered plan.
- Keep reusable SaaS starter work separate from product-specific `specs-v2` work.
- Any live AWS, Cloudflare, or Supabase resource creation must be independently verified by the verifier before merge.
