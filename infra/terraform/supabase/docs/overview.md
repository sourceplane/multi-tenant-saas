# supabase

Provisions Supabase projects for stage and prod and wires credentials into orun secrets

Provisions the Postgres project for each live environment and publishes its credentials as wiring secrets.

Applied per live environment (`stage`, `prod`); `dev` provisions nothing.

## Depends on

- (none)

## Depended on by

- **cloudflare-hyperdrive** — Provisions Cloudflare Hyperdrive resources for stage and prod Supabase Postgres databases
- **db-migrate** — Applies database migrations to stage and prod Supabase instances
