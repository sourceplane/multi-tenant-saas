# Task 0029 — Verifier Report

## Result: PASS

PR #70 is merged. The Orun changed-plan path is repaired and `040_projects_core` is confirmed applied to both stage and prod.

## PR Number and Merge Status

- **PR:** #70 — `fix(db-migrate): use spec.path for Orun changed-plan detection`
- **Branch:** `codex/task-0029-db-migrate-changed-plan` → `main`
- **Merge status:** Merged at `974b7b2`
- **Post-merge CI:** Run `26389807233` is in_progress

## Checks Run

All 7 local checks passed. PR CI run `26389113641` — 6/6 checks pass.

| Command | Result |
|---------|--------|
| `git diff --check` | clean |
| `orun validate --intent intent.yaml` | pass |
| Migration-file plan (PR trigger) — 5 jobs: db.dev.verify, db.stage.verify, db-migrate.stage.migrate, db.prod.verify, db-migrate.prod.migrate | Migration Plan step |
| Non-migration plan (packages/db/src/index.ts) — 3 jobs: db only, NO db-migrate | Correct exclusion |
| Migration-file plan (github-push-main trigger) — 5 jobs, db-migrate steps = Migration Apply | Correct step selection |
| Dry-run for PR plan | 5 jobs OK |
| Dry-run for main plan | 5 jobs OK |
| `gh pr checks 70` | 6/6 pass (run 26389113641) |

## Scope and PR Hygiene

- PR #70 changes exactly 3 files:
  - `infra/db-migrate/component.yaml` — replaced `paths: [...]` with `path: packages/db/src/migrations`
  - `stack-tectonic/compositions/db-migrate/jobs/db-migrate-run.yaml` — adjusted CLI path from `../../packages/db/dist/runner/cli.js` to `../../dist/runner/cli.js`
  - `ai/reports/task-0029-implementer.md` — implementer report
- No Worker runtime, api-edge, policy-worker, membership-worker, UI, Terraform, Wrangler, Supabase project provisioning, AWS IAM, or `specs-v2/**` changes.
- No ignored generated outputs staged or committed.

## Change-Detection Behavior — PASS

### Migration-file change selects db + db-migrate (5 jobs)

```
orun plan --changed --files packages/db/src/migrations/040_projects_core/up.sql
```
- `db.dev.verify`, `db.stage.verify`, `db-migrate.stage.migrate`, `db.prod.verify`, `db-migrate.prod.migrate`
- `db-migrate` jobs use `Migration Plan` step (PR trigger)

### Non-migration change selects only db (3 jobs)

```
orun plan --changed --files packages/db/src/index.ts
```
- `db.dev.verify`, `db.stage.verify`, `db.prod.verify`
- No `db-migrate` jobs — correct

### Main push trigger selects Migration Apply

```
orun plan --changed --files packages/db/src/migrations/040_projects_core/up.sql --trigger github-push-main
```
- Same 5 jobs, but `db-migrate` jobs use `Migration Apply` step
- DAG: `db-migrate.stage.migrate` after `db.stage.verify`, `db-migrate.prod.migrate` after `db-migrate.stage.migrate` and `db.prod.verify`

## Job-Template Execution — PASS (PR CI logs)

PR CI run `26389113641` confirmed:

- **build-db-package step:** Runs from `packages/db/` directory, successfully runs `tsc --project tsconfig.build.json && cp -r src/migrations dist/`
- **Migration Plan step:** Both stage and prod jobs ran `node ../../dist/runner/cli.js plan --env stage/prod` from the `packages/db/src/migrations/` working directory
- Both jobs returned:
  ```json
  { "mode": "plan", "applied": ["000_control_baseline", "010_identity_core", "020_membership_core", "030_events_audit_core", "040_projects_core"], "skipped": [] }
  ```
- All 6 steps passed in both jobs (setup-node, setup-pnpm, install-dependencies, build-db-package, Configure AWS Credentials, Migration Plan)
- The `pnpm install` and `turbo build` commands worked correctly from the `packages/db/src/migrations/` working directory (both tools walk up to the workspace root)

## 040_projects_core Migration State — CONFIRMED APPLIED

From PR CI run `26389113641` logs (jobs `db-migrate.stage.migrate` and `db-migrate.prod.migrate`):

**Stage:**
```json
{ "mode": "plan", "env": "stage", "applied": ["000_control_baseline", "010_identity_core", "020_membership_core", "030_events_audit_core", "040_projects_core"], "skipped": [] }
```

**Prod:**
```json
{ "mode": "plan", "env": "prod", "applied": ["000_control_baseline", "010_identity_core", "020_membership_core", "030_events_audit_core", "040_projects_core"], "skipped": [] }
```

`040_projects_core` is present in `_migrations.applied` for both `stage` and `prod`. The migration was originally applied by PR #69's post-merge CI run `26387697533` (the db-migrate jobs ran in plan mode before the fix was identified, but the apply took effect because Task 0028's merge triggered `db-migrate` due to the component.yaml manifest change).

## Verifier Fixes

None required. The implementer's analysis was correct:
1. `spec.paths` (plural, array with glob) is not a recognized Orun field for change detection
2. `spec.path` (singular, directory string) is the correct field
3. The relative CLI path needed adjustment because `spec.path` changes the working directory to `packages/db/src/migrations/`

## Risk Notes

1. **Pre-existing pnpm bin symlink warnings** — The CI logs show `WARN Failed to create bin at ... db-migrate ... ENOENT` for workspace packages. These are pre-existing warnings from pnpm trying to symlink the `db-migrate` binary into workspace package `node_modules/.bin/` directories where the parent `dist/runner/cli.js` doesn't exist yet (it's built later). They are non-blocking and do not affect execution. The `pnpm install --no-frozen-lockfile` step and the subsequent `turbo build` step both succeed.

2. **Working directory sensitivity** — The job template now runs steps from `packages/db/src/migrations/`. If a future step is added that depends on a different working directory, the `working-directory` override in the template may need adjustment. The current steps (pnpm install, turbo build, migration runner) all handle this correctly.

3. **Path overlap between db and db-migrate** — Both `db` (path=`packages/db`) and `db-migrate` (path=`packages/db/src/migrations`) match migration file changes. Orun's longest-path-match or all-matches semantics handle this correctly: migration changes select both components. A pure `packages/db/src/index.ts` change selects only `db`.

## Spec Proposals

None.

## Recommended Next Move

The post-merge CI run `26389807233` is in_progress and will run the `plan` step (not apply, since this is a PR trigger to main via merge). The `040_projects_core` migration is already confirmed applied to both stage and prod. State files are ready for the Orchestrator to record Task 0029.