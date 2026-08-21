# integrations-worker

Cloudflare Worker for the integrations bounded context — provider connections (GitHub App first), inbound delivery inbox, repo links, and the installation-token broker

Provider connections, the GitHub App installation, the inbound delivery inbox, and the repo-scoped token broker that lets the product act on GitHub without holding credentials.

A Cloudflare Worker deployed per environment (`stage`, `prod`; `dev` is verify-only). Not publicly routable — reached only through `api-edge` service bindings.

## Depends on

- **billing-worker** — Cloudflare Worker for the Billing API surface (private, service-binding only)
- **contracts**
- **db**
- **membership-worker** — Cloudflare Worker for the Membership org runtime
- **policy-worker** — Cloudflare Worker for policy authorization decisions
- **projects-worker** — Cloudflare Worker for the Projects runtime

## Depended on by

- **api-edge** — Cloudflare Worker for the API edge Runtime
