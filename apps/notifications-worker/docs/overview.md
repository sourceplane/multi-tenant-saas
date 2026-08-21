# notifications-worker

Cloudflare Worker for the Notifications bounded context

Notification rules, channels and delivery for the whole platform.

A Cloudflare Worker deployed per environment (`stage`, `prod`; `dev` is verify-only). Not publicly routable — reached only through `api-edge` service bindings.

## Depends on

- **contracts**
- **db**
- **db-migrate** — Applies database migrations to stage and prod Supabase instances
- **events-worker** — Cloudflare Worker for the Events and Audit runtime

## Depended on by

- **api-edge** — Cloudflare Worker for the API edge Runtime
- **identity-worker** — Cloudflare Worker for the Identity auth runtime
