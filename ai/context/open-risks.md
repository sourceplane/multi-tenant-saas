# Open Risks

Last updated: 2026-05-11

## Active Risks

- Existing Cloudflare/Supabase resources are partly human-provided. Next infra work must discover and record live IDs/configuration before Terraform adoption or new provisioning.
- `infra/terraform/state` and `infra/terraform/core` still contain descriptors/READMEs only; no Terraform files exist yet.
- The current local stack supports Terraform validation but not a full apply/import workflow; the next task may need a narrow local stack adjustment or a conservative plan-only first step.

## Watch Items

- Keep `.github/workflows/ci.yml` Orun-only.
- Verify that a test-only change produces an Orun test component job after the initial scaffold exists.
- Keep reusable SaaS starter work separate from product-specific `specs-v2` work.
