# Open Risks

Last updated: 2026-05-11

## Active Risks

- Existing Cloudflare/Supabase resources are partly human-provided. Next infra work must discover and record live IDs/configuration before Terraform adoption or new provisioning.
- `infra/terraform/state` and `infra/terraform/core` have Terraform configs that pass validation, but no `terraform apply` has been run yet. The R2 state bucket does not exist and the Hyperdrive import has not been executed.
- The Orun Terraform composition only has a `validate-terraform` job; plan/apply jobs are needed before CI can provision or import resources.

## Watch Items

- Keep `.github/workflows/ci.yml` Orun-only.
- Verify that a test-only change produces an Orun test component job after the initial scaffold exists.
- Keep reusable SaaS starter work separate from product-specific `specs-v2` work.
