# Task 0029 Implementer Report

## Summary

Fixed the Orun changed-plan path so migration file changes under
`packages/db/src/migrations/**` correctly select the `db-migrate` component for
stage and prod environments. The root cause was that `spec.paths` (plural, array
with glob) is not a recognized Orun field for change detection. Orun uses
`spec.path` (singular, directory string) to determine a component's file
ownership for `--changed` mode.

The fix:
1. Replaced `spec.paths: [packages/db/src/migrations/**]` with
   `spec.path: packages/db/src/migrations` in the db-migrate component manifest.
2. Updated the job template CLI node path from `../../packages/db/dist/runner/cli.js`
   to `../../dist/runner/cli.js` to account for the new working directory
   (`packages/db/src/migrations/` → `../../` = `packages/db/`).

## Files Changed

- `infra/db-migrate/component.yaml` — replaced `paths` (plural/glob) with `path`
  (singular/directory) for Orun change detection.
- `stack-tectonic/compositions/db-migrate/jobs/db-migrate-run.yaml` — adjusted
  the relative CLI path for Migration Plan and Migration Apply steps.

## Checks Run

```
git diff --check                              → clean
orun validate --intent intent.yaml            → ✓ All validation passed
orun plan --changed --files packages/db/src/migrations/040_projects_core/up.sql
  → 2 components (db, db-migrate), 5 jobs
orun plan --changed --files packages/db/src/migrations/040_projects_core/up.sql \
  --trigger github-push-main
  → db-migrate.stage.migrate: Migration Apply
  → db-migrate.prod.migrate: Migration Apply
orun plan --changed --files packages/db/src/index.ts
  → 1 component (db only), db-migrate NOT triggered
orun run --plan ... --dry-run --runner github-actions → ✓ for both PR and main plans
```

## Plan Evidence

### PR plan (default trigger)

```json
{
  "id": "db-migrate.stage.migrate",
  "checkName": "db-migrate · stage · Migrate",
  "steps": ["setup-node","setup-pnpm","install-dependencies","build-db-package",
            "Configure AWS Credentials","Migration Plan"]
}
{
  "id": "db-migrate.prod.migrate",
  "checkName": "db-migrate · prod · Migrate",
  "steps": ["setup-node","setup-pnpm","install-dependencies","build-db-package",
            "Configure AWS Credentials","Migration Plan"]
}
```

### Main push plan (github-push-main trigger)

```json
{
  "id": "db-migrate.stage.migrate",
  "checkName": "db-migrate · stage · Migrate",
  "steps": ["setup-node","setup-pnpm","install-dependencies","build-db-package",
            "Configure AWS Credentials","Migration Apply"]
}
{
  "id": "db-migrate.prod.migrate",
  "checkName": "db-migrate · prod · Migrate",
  "steps": ["setup-node","setup-pnpm","install-dependencies","build-db-package",
            "Configure AWS Credentials","Migration Apply"]
}
```

### DAG ordering

- `db-migrate.stage.migrate` depends on `db.stage.verify`
- `db-migrate.prod.migrate` depends on `db-migrate.stage.migrate` and `db.prod.verify`

## PR Number

PR #70 (pending — will be filled after push)

## Post-Merge Apply Notes

After merge to main, the CI `github-push-main` trigger will:
1. Detect changes to `infra/db-migrate/component.yaml` (changed in this PR)
2. Select `db-migrate` with `apply` profile
3. Execute "Migration Apply" for both stage and prod
4. Apply `040_projects_core` (and confirm all prior migrations are applied)

The merge itself triggers db-migrate because the component manifest is modified.

## Remaining Risks

- The `pnpm install` and `pnpm exec turbo` commands in the job template now run
  from `packages/db/src/migrations/` as working directory. Both tools walk up to
  the workspace root, so this should work correctly. If CI fails on the install
  or build step, the composition may need explicit `working-directory` overrides.
- If a future Orun version changes path-prefix matching behavior (e.g., longest
  match vs. all matches), the overlap between `db` (path=`packages/db`) and
  `db-migrate` (path=`packages/db/src/migrations`) could need revisiting.
