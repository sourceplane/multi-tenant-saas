# Open Risks

Last updated: 2026-05-11

## Active Risks

- Task 0001 is implemented in PR #4 but not yet independently verified or merged.
- GitHub PR metadata showed no status check rollup during Orchestrator inspection. The Verifier must inspect whether Actions ran, were skipped, or are unavailable.
- The implementer report says local `orun plan --changed` referenced components not present in this repo (`admin-console-pages-git`, `docs-site-direct-upload`). The Verifier must inspect the generated plan and determine whether this is stale Orun state, a composition issue, or harmless local artifact.
- Starter contract names may drift from the normative API and tenancy specs if the shared error code and actor-kind exports do not match `specs/contracts/api-guidelines.md` and `specs/contracts/tenancy-and-rbac.md`.
- Cloudflare and Supabase account/resource details are not yet exercised. Task 0001 avoids live resource creation to prevent credential or environment assumptions.
- Terraform R2 backend, Supabase project creation, and `sourceplane-db` Hyperdrive provisioning remain unimplemented and must be handled in later infra-focused tasks.

## Watch Items

- Verify that `.github/workflows/ci.yml` runs only Orun plan/run jobs once added.
- Verify that a test-only change produces an Orun test component job after the initial scaffold exists.
- Keep reusable SaaS starter work separate from product-specific `specs-v2` work.
