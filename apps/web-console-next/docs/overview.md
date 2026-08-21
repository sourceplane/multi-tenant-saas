# web-console-next

Next.js 15 + opennextjs/cloudflare delivery of the Sourceplane web console (per-environment, Workers + Static Assets)

The console UI — Next.js compiled to a Cloudflare Worker with Static Assets, configured against the API edge.

Deployed per environment as a Worker plus a static-assets upload.

## Depends on

- **api-edge** — Cloudflare Worker for the API edge Runtime
- **contracts**
- **sdk** — Runtime-agnostic TypeScript SDK for the Sourceplane control plane API

## Depended on by

- **cloudflare-domain** — Manages the Cloudflare zone and attaches custom domains to environment-specific Worker services (web-console-next)
