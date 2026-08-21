# webhooks-worker

Cloudflare Worker for webhook endpoint, subscription, and delivery-attempt management

Outbound webhook endpoints, subscriptions and delivery attempts, with signed payloads customers can verify.

A Cloudflare Worker deployed per environment (`stage`, `prod`; `dev` is verify-only). Not publicly routable — reached only through `api-edge` service bindings.

## Depends on

- **contracts**
- **db**
- **membership-worker** — Cloudflare Worker for the Membership org runtime
- **policy-worker** — Cloudflare Worker for policy authorization decisions

## Depended on by

- **api-edge** — Cloudflare Worker for the API edge Runtime
