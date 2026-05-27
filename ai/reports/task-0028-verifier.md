# Task 0028 — Verifier Report

## Result: PASS (with verifier fix)

PR #69 is approved for merge after one critical tenant-isolation fix was applied.

## PR Number and Merge Status

- **PR:** #69 — `feat: add projects/environments persistence foundation`
- **Branch:** `codex/task-0028-projects-persistence-foundation` → `main`
- **Merge status:** Approved, not yet merged
- **Verifier fix commit:** `e979d0c` (pushed to PR branch)

## Checks Run

All 11 local checks passed. PR CI run `26387568489` — 9/9 checks pass.

| Command | Result |
|---------|--------|
| `git diff --check` | clean |
| `pnpm --filter @saas/contracts typecheck` | pass |
| `pnpm --filter @saas/contracts-tests test` | 30 pass |
| `pnpm --filter @saas/db typecheck` | pass |
| `pnpm --filter @saas/db-tests typecheck` | pass |
| `pnpm --filter @saas/db-tests test` | 273 pass |
| `orun validate --intent intent.yaml` | pass |
| `orun plan --changed --intent intent.yaml --output plan.json` | 4 components × 3 envs → 8 jobs |
| `orun run --plan plan.json --dry-run --runner github-actions` | 8 jobs OK |
| `gh pr checks 69` | 9/9 pass (run 26387568489) |

## Scope and PR Hygiene

- PR #69 changes only task-scoped files:
  - `packages/contracts/src/projects.ts` — 12 public contract types
  - `packages/contracts/src/index.ts` — re-export
  - `packages/contracts/package.json` — `./projects` subpath export
  - `packages/db/src/migrations/040_projects_core/up.sql` — new migration
  - `packages/db/src/manifest.ts` — registered with checksum
  - `packages/db/src/projects/types.ts` — repository types
  - `packages/db/src/projects/repository.ts` — 10 repository methods
  - `packages/db/src/projects/index.ts` — barrel
  - `packages/db/package.json` — `./projects` subpath export
  - `tests/contracts/src/projects.test.ts` — 7 contract tests
  - `tests/db/src/projects.test.ts` — 40+ repository assertions
  - `tests/db/src/migrations.test.ts` — added projects invariant
  - `tests/db/src/identity-migration.test.ts` — fixed assertion (was `projectMigrations.length === 0`)
  - `tests/db/src/membership-migration.test.ts` — fixed assertion (was `projectMigrations.length === 0`)
  - `tests/db/tsconfig.json` — `@saas/db/projects` path mapping
  - `tests/db/package.json` — Jest module mapping
- No Worker apps, api-edge routes, policy-worker changes, event/audit wiring, Terraform, Wrangler, Supabase/AWS/Cloudflare resources, README, UI, SDK, CLI, or `specs-v2/**` changes.
- No ignored generated outputs staged or committed.

## Verification Findings

### 1. Contract surface — PASS

- `@saas/contracts/projects` exports all 12 required public types:
  - `PublicProject`, `CreateProjectRequest`, `CreateProjectResponse`, `GetProjectResponse`, `ListProjectsResponse`, `ArchiveProjectResponse`
  - `PublicEnvironment`, `CreateEnvironmentRequest`, `CreateEnvironmentResponse`, `GetEnvironmentResponse`, `ListEnvironmentsResponse`, `ArchiveEnvironmentResponse`
- Re-exported from `packages/contracts/src/index.ts`.
- Subpath export `@saas/contracts/projects` wired in `package.json`.
- Public IDs modeled as strings (`id`, `orgId`, `projectId`).
- No runtime helpers or Node-only behavior.
- Environment types include both `orgId` and `projectId`.

### 2. Migration correctness — PASS (with fix)

- `040_projects_core` is present in manifest after `030_events_audit_core`, uses bounded context `"projects"`, has correct checksum.
- SQL is idempotent with `CREATE SCHEMA IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`.
- Creates only `projects.projects` and `projects.environments`.
- Every project row carries `org_id`; every environment row carries `org_id + project_id`.
- Statuses: `active`, `archived` with CHECK constraint.
- Project slugs unique per org via `(org_id, slug_lower)` unique index.
- Environment slugs unique per org+project via `(org_id, project_id, slug_lower)` unique index.
- Cursor-pagination indexes: `(org_id, created_at DESC, id DESC)` for projects, `(org_id, project_id, created_at DESC, id DESC)` for environments.
- No foreign keys to `membership.*`, `identity.*`, `events.*`, or other bounded-context schemas.

#### CRITICAL FIX: Environment tenant isolation (up.sql)

**Before fix:** The environments table had:
```sql
project_id UUID NOT NULL REFERENCES projects.projects (id),
```
This FK only checked that `project_id` existed in `projects.projects(id)`. A caller could create an environment with `org_id="org_A"` and `project_id="prj_from_org_B"` and the INSERT would succeed, breaking tenant isolation.

**After fix:** Added a composite unique index `(org_id, id)` on `projects.projects` and changed the environments FK to:
```sql
FOREIGN KEY (org_id, project_id) REFERENCES projects.projects (org_id, id)
```
This enforces at the database level that every environment's `org_id` must match its owning project's `org_id`. A row-level CHECK constraint is not sufficient for cross-table references; this composite FK is the correct approach.

### 3. Repository isolation and behavior — PASS

- `@saas/db/projects` is Worker-safe — no Node-only imports, no runner code.
- All 10 repository methods require tenant scope:
  - `createProject(input)` — carries `input.orgId`
  - `getProjectById(orgId, projectId)` — scoped by org
  - `getProjectBySlug(orgId, slugLower)` — scoped by org
  - `listProjectsPaged(orgId, params)` — `WHERE org_id = $1`
  - `archiveProject(orgId, projectId, archivedAt)` — `WHERE org_id = $1 AND id = $2`
  - `createEnvironment(input)` — carries `input.orgId` and `input.projectId`
  - `getEnvironmentById(orgId, projectId, environmentId)` — 3-param scoped
  - `getEnvironmentBySlug(orgId, projectId, slugLower)` — 3-param scoped
  - `listEnvironmentsPaged(orgId, projectId, params)` — `WHERE org_id = $1 AND project_id = $2`
  - `archiveEnvironment(orgId, projectId, environmentId, archivedAt)` — 4-param scoped
- No method operates by `projectId` or `environmentId` alone — all queries include full tenant scope.
- All SQL is parameterized.
- `createEnvironment` now has a composite FK guaranteeing org_id consistency with the parent project.
- Result types follow established patterns: `ProjectsResult<T>` with `ok`/`error` discriminated union, `not_found`, `conflict`, and safe `internal` errors.
- List queries use `(created_at DESC, id DESC)` with `limit + 1` cursor detection.
- Internal errors do not leak connection details or SQL text (verified by tests).

### 4. Test adequacy — PASS

**Contract tests (7 tests):** Prove all 12 project/environment types are structurally usable from `@saas/contracts/projects`.

**Migration tests:** Cover manifest presence, checksum, context, required tenant columns, and forbidden cross-context foreign keys. Existing identity/membership/events/runner tests remain compatible (273 total, up from 236 before this PR).

**Repository tests (40+ assertions):** Cover parameterized SQL shape for all 10 methods, cursor pagination (limit+1, cursor filtering, nextCursor detection, empty results), conflict mapping, not-found behavior, archive behavior, and safe internal error mapping. The repository tests use a fake executor (no real DB needed).

**Existing tests not weakened:** Both `identity-migration.test.ts` and `membership-migration.test.ts` were updated from `projectMigrations.length === 0` to assertions that accept the new `040_projects_core` migration. These are the only changes and they are correct.

### 5. Orun and merge-path safety — PASS

- PR CI run `26387568489` reflects the branch head `e979d0c` and is green (9/9).
- No new app component or broaden deploy surface.
- Orun validate / changed-plan / dry-run all pass (4 components × 3 envs → 8 jobs).

## Verifier Fix

One fix applied in commit `e979d0c`:

**`packages/db/src/migrations/040_projects_core/up.sql`** — Added composite FK `FOREIGN KEY (org_id, project_id) REFERENCES projects.projects (org_id, id)` to `projects.environments`, with a supporting `UNIQUE (org_id, id)` index on `projects.projects`. This prevents an environment from being created with an `org_id` that doesn't match its owning project's `org_id`, enforcing tenant consistency at the database level.

## Risk Notes

1. **No project-scoped FK to membership tables** — per repo spec, this is correct. The `org_id` column on project/environment rows is an opaque reference with no database-enforced referential integrity to `membership.organizations`. Acceptable for bounded-context design.

2. **No default environment bootstrapping on project create** — deferred to the future projects-worker task. Not a blocking gap.

3. **No event/audit emission for project mutations** — deferred to the future projects-worker task. Consistent with the task scope.

4. **The `FOREIGN KEY (org_id, project_id)` uses `projects.projects(org_id, id)` as the target.** The `id` column is already the PK, and the new unique index on `(org_id, id)` is a covering index that adds minimal overhead. This is the standard approach for enforcing cross-table tenant consistency in PostgreSQL.

## Spec Proposals

None. The implementation matches the active specs.

## Recommended Next Move

**Merge PR #69** — all verification criteria are satisfied after the tenant-isolation fix:

1. Scope and PR hygiene: PASS
2. Contract surface: PASS
3. Migration correctness: PASS (1 critical fix)
4. Repository isolation and behavior: PASS
5. Test adequacy: PASS
6. Orun and merge-path safety: PASS

After merge, sync local `main` to the merge commit, confirm the post-merge main CI run starts, and verify that `040_projects_core` applies successfully to `stage` and `prod` through the existing db-migrate Orun path. Record the run ID and result.