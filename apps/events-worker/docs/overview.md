# events-worker

Cloudflare Worker for the Events and Audit runtime

The event stream and the audit trail — streams, groups, dead letters, and a scheduled retention sweep that ages records out on purpose.

A Cloudflare Worker deployed per environment (`stage`, `prod`; `dev` is verify-only). Not publicly routable — reached only through `api-edge` service bindings.

## Depends on

- **contracts**
- **db**
- **membership-worker** — Cloudflare Worker for the Membership org runtime
- **policy-worker** — Cloudflare Worker for policy authorization decisions

## Depended on by

- **api-edge** — Cloudflare Worker for the API edge Runtime
- **notifications-worker** — Cloudflare Worker for the Notifications bounded context
