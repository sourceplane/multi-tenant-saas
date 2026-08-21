# admin-worker

Internal Cloudflare Worker for audited support/administration diagnostics

Internal support and administration diagnostics. Every call is audited.

A Cloudflare Worker deployed per environment (`stage`, `prod`; `dev` is verify-only). Not publicly routable — reached only through `api-edge` service bindings.

## Depends on

- **cloudflare-hyperdrive** — Provisions Cloudflare Hyperdrive resources for stage and prod Supabase Postgres databases
- **contracts**
- **db**

## Depended on by

- (none)
