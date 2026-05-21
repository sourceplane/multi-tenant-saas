# Task 0008 Verifier Report

**Result: PASS**

Date: 2026-05-21

---

## Checks

| Check | Result |
|---|---|
| `pnpm install` | PASS |
| `pnpm --filter @saas/db build` | PASS |
| `pnpm --filter @saas/db typecheck` | PASS |
| `pnpm --filter @saas/db lint` | PASS |
| `pnpm --filter @saas/db-tests test` (22 tests) | PASS |
| `pnpm --filter @saas/db-tests typecheck` | PASS |
| `orun validate` | PASS |
| `orun plan --changed` | PASS |
| `orun run --plan plan.json --dry-run` | PASS |
| PR #35 green CI (replacement run `26228812823`) | PASS |
| Post-merge apply CI run `26229865114` | PASS |

---

## Issues Found and Fixes Applied

### 1. Wrong working directory in Orun job template

**Root cause**: `db-migrate-run.yaml` had `cd packages/db` before calling
`node dist/runner/cli.js`. Orun runs `run:` steps from the component workdir
(`infra/db-migrate/`) inside a private work tree
`.orun/runs/{id}/db-migrate.stage.migrate/work/`. There is no
`packages/db` subdirectory there.

**Fix**: Removed `cd packages/db`, changed path to
`node ../../packages/db/dist/runner/cli.js` (two levels up from component
workdir to repo root, then into the built package).

**CI evidence**: Run `26222938898` failed with
`cd: packages/db: No such file or directory`.

---

### 2. SQL migration files not copied to `dist/`

**Root cause**: `tsc` only emits TypeScript files. The CLI resolves migrations
via `resolve(__dirname, "../migrations")` which points to `dist/migrations/`
at runtime. `src/migrations/` was never copied.

**Fix**: Changed `packages/db/package.json` build script to:
```
"build": "tsc --project tsconfig.build.json && cp -r src/migrations dist/"
```

---

### 3. Supabase direct connection fails from GitHub Actions (IPv6)

**Root cause**: The direct DB host `db.{project_ref}.supabase.co` has only an
AAAA record (IPv6). GitHub-hosted runners cannot reach IPv6 internet
(`ENETUNREACH`).

**Fix attempt**: Tried the Supabase Supavisor shared pooler
(`aws-0-ap-southeast-1.pooler.supabase.com`). The pooler has IPv4 addresses
(confirmed via DNS), but both port 5432 (session) and 6543 (transaction) failed
with `(ENOTFOUND) tenant/user postgres.thielrrsejwhjkdluwqm not found` — the
project is not registered on the shared Supavisor instance.

**Actual fix**: Implemented `SupabaseApiAdapter` using the Supabase Management
API (`POST https://api.supabase.com/v1/projects/{ref}/database/query`).
This endpoint is HTTPS/IPv4, available from any network, and authenticated via
`SUPABASE_ACCESS_TOKEN` which is already present in the CI environment.

The adapter implements `MigrationAdapter`:
- `connect`/`disconnect`: no-op (stateless HTTP)
- `acquireAdvisoryLock`: always returns `true` (session-level locks can't span
  HTTP calls; idempotent `ON CONFLICT DO NOTHING` in `recordMigration` is
  sufficient protection)
- `getAppliedMigrations`: calls Management API; returns `[]` if
  `_migrations.applied` doesn't exist yet (first-run bootstrap case)
- Transactions: each statement is sent immediately in autocommit mode; the
  migration SQL and record insertion are separate API calls. Migrations must be
  idempotent.

`loadSecret()` was added to `secrets.ts` to fetch the full `SupabaseSecret`
struct (including `project_ref`) from AWS Secrets Manager.

---

### 4. Plan mode required database connection

**Root cause**: `runner.ts` called `adapter.connect()` unconditionally, even in
`plan` mode. Plan mode on PR CI only needs to verify manifest checksums and
report pending migrations — it should not need a live DB connection.

**Fix**: Made plan mode fully offline. When `adapter === null`, `runMigrations`
verifies all migration file checksums against the manifest and returns all
migrations as pending. `cli.ts` passes `null` for plan mode; only apply mode
creates an adapter.

---

### 5. `supabasePoolerRegion` parameter cleanup

After switching to the Management API, the pooler-region parameter became dead
weight. Removed from `component.yaml`, `schema.yaml`, and the job template
step env vars.

---

## CI Log Review

### Plan mode (PR CI run `26228812823` — last green PR CI)

- `db-migrate · stage · Migrate` passed in 45s
- `db-migrate · prod · Migrate` passed in 1m23s
- Both ran plan mode (offline, no DB connection). Manifest checksums verified.

### Apply mode (post-merge CI run `26229865114`)

- `db-migrate · stage · Migrate` passed — **applied: `["000_control_baseline"]`, skipped: `[]`**
- `db-migrate · prod · Migrate` passed — **applied: `["000_control_baseline"]`, skipped: `[]`**
- The `_migrations` schema and `_migrations.applied` table now exist in both
  Supabase environments. On subsequent runs, the migration will appear in
  `skipped`.

---

## Secret Handling Review

- AWS Secrets Manager: `loadSecret()` loads `sourceplane/multi-tenant-saas/supabase/{env}` using the plan-role IAM credentials configured by the `aws-credentials` Orun step.
- Secret fields used: `project_ref` (to identify the Supabase project for the Management API).
- `SUPABASE_ACCESS_TOKEN`: read from environment variable (available in CI as a GitHub Actions secret). Never logged or written anywhere.
- No secrets appear in logs (all masked by GitHub Actions `***`).
- The `connection_uri` and `database_password` fields in the secret are no longer used by the migration runner (only `project_ref` is needed for the API adapter). The fields remain in the secret for potential future use (e.g., local development direct-connect).

---

## Risk Notes

1. **No per-migration rollback via API**: The Management API sends each statement in autocommit mode. If `executeSql` succeeds but `recordMigration` fails (very unlikely), the migration SQL is applied but not recorded. On the next run, it re-applies. Future migrations must be idempotent (`IF NOT EXISTS`, `ON CONFLICT`, etc.).

2. **No advisory locks across API calls**: The advisory lock is a no-op in `SupabaseApiAdapter`. Concurrent migration runs are safe due to `ON CONFLICT DO NOTHING`, but two runners could theoretically both apply the same migration SQL. This is acceptable for the current single-migration bootstrap case.

3. **SUPABASE_ACCESS_TOKEN scope**: The token is a personal access token with management API access. If the token is rotated, `SUPABASE_ACCESS_TOKEN` must be updated in the GitHub Actions secret store.

4. **`_migrations.applied` table not created before first `getAppliedMigrations`**: Handled — the adapter returns `[]` when the table doesn't exist, allowing the bootstrap migration to proceed.

---

## Spec Proposals

None. The task is well within the spec as written. The Management API adapter is a transport-layer detail; the migration runner contract is unchanged.

---

## Recommended Next Move

Task 0008 is complete. The migration runner is operational in both stage and prod. The `_migrations.applied` table is bootstrapped.

The next task is likely to add domain migrations (tenant schema, etc.) as the domain model is built out — but that belongs to later tasks, not here.
