# cloudflare-hyperdrive

Provisions Cloudflare Hyperdrive resources for stage and prod Supabase Postgres databases

Pooled Postgres connectivity for the Workers runtime, originating from the connection `supabase` published.

Applied per live environment (`stage`, `prod`); `dev` provisions nothing.

## Depends on

- **supabase** — Provisions Supabase projects for stage and prod and wires credentials into orun secrets

## Depended on by

- **admin-worker** — Internal Cloudflare Worker for audited support/administration diagnostics
- **api-edge** — Cloudflare Worker for the API edge Runtime
- **identity-worker** — Cloudflare Worker for the Identity auth runtime
