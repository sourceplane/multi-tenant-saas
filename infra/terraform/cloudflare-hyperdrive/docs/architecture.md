# cloudflare-hyperdrive — architecture

A `terraform` component rooted at `infra/terraform/cloudflare-hyperdrive/terraform`.

- **State** lives in the platform's HTTP state backend (run-token auth) — no local state and no cloud-vendor state bucket.
- **Credentials are brokered per run** (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `TF_VAR_cloudflare_account_id`, `TF_VAR_supabase_db_password`, `TF_VAR_supabase_project_ref`) from the workspace's integration connections; no long-lived provider secret exists anywhere in CI. They are declared at component level because plan-only lanes refresh against the live provider API too, not just apply.
- **Publishes wiring secrets** under lease on the environment rungs: `WIRING_CLOUDFLARE_HYPERDRIVE`. Consumers resolve them by name at deploy time, so no resource ID is ever committed.
- **Self-healing adoption** (`adopt.tf`): when the platform state is empty but the resource already exists at the provider, a plan-time import adopts it instead of failing with "already exists". That is what makes a re-run after a partial failure converge instead of colliding.
