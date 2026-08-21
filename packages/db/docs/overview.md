# db

Schema, repositories and the migration set, one module per bounded context.

A shared package of this workspace, consumed by the components below at build time. There is no publish step — the repo is the registry.

## Depended on by

- **admin-worker** — Internal Cloudflare Worker for audited support/administration diagnostics
- **api-edge** — Cloudflare Worker for the API edge Runtime
- **billing-worker** — Cloudflare Worker for the Billing API surface (private, service-binding only)
- **config-worker** — Cloudflare Worker for the Config read-only API surface
- **db-migrate** — Applies database migrations to stage and prod Supabase instances
- **events-worker** — Cloudflare Worker for the Events and Audit runtime
- **identity-worker** — Cloudflare Worker for the Identity auth runtime
- **integrations-worker** — Cloudflare Worker for the integrations bounded context — provider connections (GitHub App first), inbound delivery inbox, repo links, and the installation-token broker
- **membership-worker** — Cloudflare Worker for the Membership org runtime
- **metering-worker** — Cloudflare Worker for the Metering API surface (usage recording, quota checks)
- **notifications-worker** — Cloudflare Worker for the Notifications bounded context
- **projects-worker** — Cloudflare Worker for the Projects runtime
- **webhooks-worker** — Cloudflare Worker for webhook endpoint, subscription, and delivery-attempt management
