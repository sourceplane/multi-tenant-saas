# cloudflare-domain — architecture

A `terraform` component rooted at `infra/terraform/cloudflare-domain/terraform`.

- **State** lives in the platform's HTTP state backend (run-token auth) — no local state and no cloud-vendor state bucket.
- **Credentials are brokered per run** (none declared) from the workspace's integration connections; no long-lived provider secret exists anywhere in CI. They are declared at component level because plan-only lanes refresh against the live provider API too, not just apply.
- **Publishes wiring secrets** under lease on the environment rungs: none declared. Consumers resolve them by name at deploy time, so no resource ID is ever committed.
- **No adoption shim.** This root has no `adopt.tf`, so a resource that already exists at the provider but is absent from platform state must be state-migrated or deleted by hand before the lane can converge.
