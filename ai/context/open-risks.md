# Open Risks

Last updated: 2026-05-19

## Active Risks

- `multi-tenant-saas` Orun runtime, CI action version, environment names, Terraform composition schema, and Terraform component manifests have drifted from the newer `aws-admin` pattern.
- Existing Terraform components still model an R2 backend path. They must be migrated or replaced with S3 backend usage before any new apply-capable infra task.
- The `aws-admin` repo does not yet have the repo-scoped `sourceplane/multi-tenant-saas` IAM component. Until it lands and is verified, this repo cannot safely assume AWS roles for S3 state or Secrets Manager.
- Supabase provisioning must not log generated database passwords or API keys. Secret names may be reported; secret values may not.
- Cross-repo sequencing matters: `aws-admin` role creation must land before `multi-tenant-saas` consumes the role in CI or Terraform components.

## Watch Items

- Keep `.github/workflows/ci.yml` Orun-only.
- Verify that local `kiox -- orun ...` behavior and GitHub Actions behavior use the same rendered plan.
- Keep reusable SaaS starter work separate from product-specific `specs-v2` work.
- Any live AWS, Cloudflare, or Supabase resource creation must be independently verified by the verifier before merge.
