# contracts

Wire types and schemas. Every Worker, the SDK and the console read the same file, which is what makes contract drift a build error rather than a production surprise.

A shared package of this workspace, consumed by the components below at build time. There is no publish step — the repo is the registry.

## Depended on by

- **admin-worker** — Internal Cloudflare Worker for audited support/administration diagnostics
- **api-edge** — Cloudflare Worker for the API edge Runtime
- **billing-worker** — Cloudflare Worker for the Billing API surface (private, service-binding only)
- **config-worker** — Cloudflare Worker for the Config read-only API surface
- **events-worker** — Cloudflare Worker for the Events and Audit runtime
- **identity-worker** — Cloudflare Worker for the Identity auth runtime
- **integrations-worker** — Cloudflare Worker for the integrations bounded context — provider connections (GitHub App first), inbound delivery inbox, repo links, and the installation-token broker
- **membership-worker** — Cloudflare Worker for the Membership org runtime
- **metering-worker** — Cloudflare Worker for the Metering API surface (usage recording, quota checks)
- **notifications-worker** — Cloudflare Worker for the Notifications bounded context
- **policy-worker** — Cloudflare Worker for policy authorization decisions
- **projects-worker** — Cloudflare Worker for the Projects runtime
- **web-console-next** — Next.js 15 + opennextjs/cloudflare delivery of the Sourceplane web console (per-environment, Workers + Static Assets)
- **webhooks-worker** — Cloudflare Worker for webhook endpoint, subscription, and delivery-attempt management
