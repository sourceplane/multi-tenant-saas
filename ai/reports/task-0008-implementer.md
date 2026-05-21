# Task 0008 — Implementer Report

## Summary

Added the first production-safe Supabase Postgres migration runner and
Orun-controlled apply path for the existing `packages/db` manifest. The runner
lives behind a separate `@saas/db/runner` entry point — default exports remain
Worker-safe. A new `db-migrate` Orun composition provides plan-only behavior on
PRs and apply-on-merge for `stage` and `prod`.

## PR

- **Number**: #35
- **URL**: https://github.com/sourceplane/multi-tenant-saas/pull/35
- **Branch**: `codex/task-0008-db-migration-apply`
- **Base**: `main`

## Files Changed

| Path | Purpose |
|------|---------|
| `packages/db/src/runner/types.ts` | Adapter interface, result/plan types |
| `packages/db/src/runner/runner.ts` | Core runner: buildPlan, runMigrations |
| `packages/db/src/runner/pg-adapter.ts` | Postgres adapter using `pg` |
| `packages/db/src/runner/secrets.ts` | AWS Secrets Manager loader |
| `packages/db/src/runner/cli.ts` | CLI entry point (plan/apply modes) |
| `packages/db/src/runner/index.ts` | Barrel export for `@saas/db/runner` |
| `packages/db/package.json` | Added exports, bin, deps |
| `tests/db/src/runner.test.ts` | 22 focused runner tests |
| `tests/db/package.json` | Updated jest moduleNameMapper |
| `stack-tectonic/compositions/db-migrate/composition.yaml` | Composition definition |
| `stack-tectonic/compositions/db-migrate/schema.yaml` | Component schema |
| `stack-tectonic/compositions/db-migrate/profiles/db-migrate-plan.yaml` | Plan profile (PR) |
| `stack-tectonic/compositions/db-migrate/profiles/db-migrate-apply.yaml` | Apply profile (merge) |
| `stack-tectonic/compositions/db-migrate/jobs/db-migrate-run.yaml` | Job template |
| `infra/db-migrate/component.yaml` | Component (stage + prod) |
| `intent.yaml` | Added db-migrate binding |
| `ai/tasks/task-0008.md` | Task specification |

## Migration Runner Behavior

1. Reads `packages/db` manifest (source of truth)
2. Connects to target database via PgAdapter
3. Acquires advisory lock (`pg_try_advisory_lock(839201008)`)
4. Fetches `_migrations.applied` rows to determine already-applied set
5. Verifies checksums of applied migrations against on-disk files
6. Fails immediately on checksum mismatch
7. In `plan` mode: reports pending IDs without executing SQL
8. In `apply` mode: applies each pending migration in a transaction
9. Records each applied migration in `_migrations.applied`
10. Releases advisory lock and disconnects

Transaction boundary: one transaction per migration. If a migration fails, its
transaction is rolled back and the runner reports the failure — no subsequent
migrations are attempted.

## Orun Plan/Apply Behavior

- **PR (github-pull-request)**: `db-migrate.plan` profile runs for stage and
  prod. Authenticates via AWS OIDC, connects to the database, and runs CLI in
  `plan` mode (read-only — no mutations). Reports pending migration IDs.
- **Merge (github-push-main)**: `db-migrate.apply` profile adds the apply step.
  Runs CLI in `apply` mode, executing pending migrations.
- **Plan output confirms**: stage depends on nothing additional; prod depends on
  stage (environment promotion). Apply step is capability-gated.

## Secret Handling Notes

- Credentials loaded from AWS Secrets Manager using
  `@aws-sdk/client-secrets-manager`
- Secret names: `sourceplane/multi-tenant-saas/supabase/stage`,
  `sourceplane/multi-tenant-saas/supabase/prod`
- Connection URI extracted via structured JSON parsing (not string slicing)
- No secrets are printed to stdout; CLI writes only migration IDs and metadata
- stderr output limited to: secret name (not value), mode, env, error messages

## Checks Run

```
✓ pnpm install
✓ pnpm --filter @saas/db build
✓ pnpm --filter @saas/db typecheck
✓ pnpm --filter @saas/db lint
✓ pnpm --filter @saas/db-tests test (22 passed)
✓ pnpm --filter @saas/db-tests typecheck
✓ pnpm --filter @saas/db-tests lint
✓ orun validate --intent intent.yaml
✓ orun plan --changed --intent intent.yaml --output plan.json
✓ orun run --plan plan.json --dry-run --runner github-actions
✓ gh pr create (PR #35)
```

## Assumptions

- The OIDC role
  `arn:aws:iam::306024784101:role/<env>-github-sourceplane-multi-tenant-saas-plan`
  has permission to read from Secrets Manager and connect to Supabase databases
  for both plan and apply.
- The `_migrations.applied` table already exists via the baseline control
  migration (applied by hand or by the first apply run which will execute it).
- Advisory lock ID `839201008` is reserved for the migration runner and not used
  by other processes.
- Supabase connection strings in Secrets Manager are reachable from GitHub
  Actions runners (no VPN/IP-allowlist blocking).

## Spec Proposals

None required. The implementation fits within existing spec boundaries. The
environment-scoped `dependsOn` limitation (from proposal
`ai/proposals/task-0007.1-spec-update.md`) also applies here — `db-migrate` has
no Orun-level dependency on `db-tests` — but this is the accepted pattern and
does not need a new proposal.

## Remaining Gaps

- First live apply has not been verified (requires merge to main and AWS
  credentials in CI). Verifier should confirm via GitHub Actions logs.
- No `dev` environment for the migration runner (by design — no dev Supabase).
- CLI `--connection-uri` / `DATABASE_URL` override is available for local
  testing but not exercised in CI.

## Next Task Dependencies

- Task 0009+ can add domain schema migrations to the manifest; the runner will
  apply them automatically on merge.
- Cloudflare Hyperdrive wiring (future task) can reference the same Supabase
  project refs and secret paths documented here.
- Worker repository/adapter implementations will import from `@saas/db` (not
  `@saas/db/runner`) keeping the Worker-safe boundary intact.
