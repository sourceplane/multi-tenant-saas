# Open Risks

Last updated: 2026-05-11

## Active Risks

- The repo has no implementation scaffold or CI yet, so quality gates cannot run until Task 0001 lands.
- Orun and Stack Tectonic behavior has not been verified in this checkout because `intent.yaml` and component descriptors do not exist yet.
- Cloudflare and Supabase account/resource details are not yet exercised. Task 0001 avoids live resource creation to prevent credential or environment assumptions.
- Terraform R2 backend, Supabase project creation, and `sourceplane-db` Hyperdrive provisioning remain unimplemented and must be handled in later infra-focused tasks.

## Watch Items

- Verify that `.github/workflows/ci.yml` runs only Orun plan/run jobs once added.
- Verify that a test-only change produces an Orun test component job after the initial scaffold exists.
- Keep reusable SaaS starter work separate from product-specific `specs-v2` work.
