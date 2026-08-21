# db-migrate — architecture

A `db-migrate` component rooted at `infra/db-migrate`.

- Connects with the wiring secrets the `supabase` terraform publishes, resolved per run and never stored in CI.
- **Plan on pull requests** (what would change), **apply on merge** — the same convergence contract as every other component. What a merge will do to the database is on the diff that proposes it.
- Migrations are forward-only; a rollback is a new migration.
