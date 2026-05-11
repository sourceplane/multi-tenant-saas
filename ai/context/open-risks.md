# Open Risks

Last updated: 2026-05-11

## Active Risks

- GitHub Actions CI is blocked by organization policy before jobs start. The verifier observed two failed CI runs with 0 jobs and a workflow-file issue, likely because `sourceplane/orun-action@v1.1.0` is not allowed at the org level.
- Task 0002 will need CI-based Orun plan/run and eventually resource verification, so generating it before Actions policy is fixed would create an unverifiable PR.
- Cloudflare and Supabase account/resource details are not yet exercised. Task 0001 avoids live resource creation to prevent credential or environment assumptions.
- Terraform R2 backend, Supabase project creation, and `sourceplane-db` Hyperdrive provisioning remain unimplemented and must be handled in later infra-focused tasks.

## Watch Items

- After org policy is fixed, verify that `.github/workflows/ci.yml` runs only Orun plan/run jobs and that PR checks populate correctly.
- Verify that a test-only change produces an Orun test component job after the initial scaffold exists.
- Keep reusable SaaS starter work separate from product-specific `specs-v2` work.
