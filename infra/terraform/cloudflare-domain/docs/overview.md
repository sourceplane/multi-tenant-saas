# cloudflare-domain

Manages the Cloudflare zone and attaches custom domains to environment-specific Worker services (web-console-next)

The zone, and the custom-domain attach for each environment's console. Optional — workers.dev URLs work without it.

Applied per live environment (`stage`, `prod`); `dev` provisions nothing.

## Depends on

- **web-console-next** — Next.js 15 + opennextjs/cloudflare delivery of the Sourceplane web console (per-environment, Workers + Static Assets)

## Depended on by

- (none)
