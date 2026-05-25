# Task 0028 — Implementer Report

## Summary

- Added `@saas/contracts/projects` with 12 public contract types (PublicProject, PublicEnvironment, CRUD request/response envelopes).
- Added `040_projects_core` migration creating `projects.projects` and `projects.environments` tables with per-org slug uniqueness, `org_id` on every row, environments carrying `org_id + project_id`, and cursor-pagination indexes.
- Added `@saas/db/projects` Worker-safe repository adapter exposing 10 methods (create/get/get-by-slug/list-paged/archive for both projects and environments), all tenant-scoped.
- Added focused contract tests (7 tests) and repository tests (40+ assertions) covering parameterized SQL, conflict mapping, cursor pagination, safe error handling, and Worker import isolation.
- Updated two existing migration tests that incorrectly asserted zero project-scoped migrations.

## Files Changed

### packages/contracts
- `src/projects.ts` — new contract types module
- `src/index.ts` — re-export projects
- `package.json` — added `./projects` subpath export

### packages/db
- `src/migrations/040_projects_core/up.sql` — new migration
- `src/manifest.ts` — registered migration with checksum
- `src/projects/types.ts` — repository types
- `src/projects/repository.ts` — repository implementation
- `src/projects/index.ts` — module barrel
- `package.json` — added `./projects` subpath export

### tests/contracts
- `src/projects.test.ts` — contract type structural tests

### tests/db
- `src/projects.test.ts` — repository unit tests
- `src/migrations.test.ts` — added cross-context FK invariant test
- `src/identity-migration.test.ts` — fixed assertion (was `projectMigrations.length === 0`)
- `src/membership-migration.test.ts` — fixed assertion (was `projectMigrations.length === 0`)
- `tsconfig.json` — added `@saas/db/projects` path mapping
- `package.json` — added `@saas/db/projects` Jest module mapping

## Checks Run

| Command | Result |
|---------|--------|
| `pnpm --filter @saas/contracts typecheck` | ✓ pass |
| `pnpm --filter @saas/contracts-tests test` | ✓ 30 tests pass |
| `pnpm --filter @saas/db typecheck` | ✓ pass |
| `pnpm --filter @saas/db-tests typecheck` | ✓ pass |
| `pnpm --filter @saas/db-tests test` | ✓ 273 tests pass |
| `orun validate --intent intent.yaml` | ✓ pass |
| `orun plan --changed --intent intent.yaml --output plan.json` | ✓ 4 components × 3 envs → 8 jobs |
| `orun run --plan plan.json --dry-run --runner github-actions` | ✓ all 8 jobs verify |
| `git diff --check` | ✓ clean |

## Assumptions

- Project/environment IDs are raw UUIDs at the repository layer; public `prj_`/`env_` prefix conversion is deferred to the future projects-worker/API task.
- The `projects.environments.project_id` FK references `projects.projects(id)` within the same bounded context (permitted per repo spec).
- Active-only filtering on list methods is correct for the default use case; archived projects/environments are still accessible via `getById`.

## Spec Proposals

None.

## Remaining Gaps

- No live migration apply — Orun CI will apply `040_projects_core` to stage/prod after merge (verifier must confirm).
- No event/audit emission for project mutations — deferred to future projects-worker task.
- No default environment bootstrapping on project create — deferred.

## PR Number

#69
