# supabase — architecture

A `terraform` component rooted at `infra/terraform/supabase/terraform`.

- **State** lives in the platform's HTTP state backend (run-token auth) — no local state and no cloud-vendor state bucket.
- **Credentials are brokered per run** (`SUPABASE_ACCESS_TOKEN`, `TF_VAR_supabaseOrgId`) from the workspace's integration connections; no long-lived provider secret exists anywhere in CI. They are declared at component level because plan-only lanes refresh against the live provider API too, not just apply.
- **Publishes wiring secrets** under lease on the environment rungs: `SUPABASE_DB_PASSWORD`, `SUPABASE_DB_URL`, `SUPABASE_PROJECT_REF`. Consumers resolve them by name at deploy time, so no resource ID is ever committed.
- **Self-healing adoption** (`adopt.tf`): when the platform state is empty but the resource already exists at the provider, a plan-time import adopts it instead of failing with "already exists". That is what makes a re-run after a partial failure converge instead of colliding.
