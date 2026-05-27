# Task ID

Task 0028

# Agent

Verifier

# Current Repo Context

- Task 0028 implementer report: `ai/reports/task-0028-implementer.md`.
- PR #69 is open:
  `feat: add projects/environments persistence foundation`
  (`codex/task-0028-projects-persistence-foundation` -> `main`).
- PR #69 is currently clean and not draft.
- Latest PR CI run `26386471490` passed all 9 checks after the implementer
  report commit on branch head `afdbfe3`
  (`docs: add task-0028 implementer report`).
- The feature commit under review is `38dffda`
  (`feat: add projects/environments persistence foundation (#task-0028)`).
- Tasks 0001-0027 are verified and merged on `main` at `60240ce`.
- Task 0028 scope is intentionally limited to `@saas/contracts`,
  `packages/db`, and focused contract/db tests. No Worker, api-edge, policy,
  Terraform, or Cloudflare runtime should be in this PR.

# Objective

Verify that PR #69 safely adds the projects/environments persistence
foundation: public contract types, migration `040_projects_core`,
Worker-safe `@saas/db/projects`, and focused tests, while preserving tenant
isolation and keeping Orun/db-migrate behavior safe.

# PR Boundary

One PR verification. Fixes may be committed to the same PR branch only if they
are required to satisfy Task 0028 acceptance criteria. Do not add new feature
scope.

# Read First

- `ai/tasks/task-0028.md`
- `ai/reports/task-0028-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `specs/constitution.md`
- `specs/repo.md`
- `specs/orun-golden-path.md`
- `specs/domain-model.md`
- `specs/contracts/api-guidelines.md`
- `specs/contracts/tenancy-and-rbac.md`
- `specs/components/05-projects-environments.md`
- `specs/components/09-events-audit-observability.md`

Then inspect:

- PR #69 diff and changed-file list
- `packages/contracts/src/index.ts`
- `packages/contracts/src/projects.ts`
- `packages/contracts/package.json`
- `packages/db/src/manifest.ts`
- `packages/db/src/migrations/040_projects_core/up.sql`
- `packages/db/src/projects/types.ts`
- `packages/db/src/projects/repository.ts`
- `packages/db/src/projects/index.ts`
- `packages/db/package.json`
- `tests/contracts/src/projects.test.ts`
- `tests/db/src/projects.test.ts`
- `tests/db/src/migrations.test.ts`
- `tests/db/src/identity-migration.test.ts`
- `tests/db/src/membership-migration.test.ts`
- `tests/db/tsconfig.json`
- `tests/db/package.json`

# Required Verification

1. Scope and PR hygiene
   - Confirm PR #69 changes only task-scoped contract, db, migration-manifest,
     and focused test files.
   - Confirm no Worker apps, api-edge routes, policy-worker changes,
     event/audit wiring, Terraform, Wrangler, Supabase/AWS/Cloudflare
     resources, README cleanup, UI, SDK, CLI, or `specs-v2/**` changes.
   - Confirm no ignored generated outputs are staged or committed.
   - Confirm `ai/reports/task-0028-implementer.md` is committed to the PR branch
     before merge.

2. Contract surface
   - Confirm `@saas/contracts/projects` exists and exports the intended public
     types only:
     `PublicProject`, `CreateProjectRequest`, `CreateProjectResponse`,
     `GetProjectResponse`, `ListProjectsResponse`, `ArchiveProjectResponse`,
     `PublicEnvironment`, `CreateEnvironmentRequest`,
     `CreateEnvironmentResponse`, `GetEnvironmentResponse`,
     `ListEnvironmentsResponse`, `ArchiveEnvironmentResponse`.
   - Confirm root exports and package subpath exports are wired correctly.
   - Confirm public IDs are modeled as strings, environment shapes include both
     `orgId` and `projectId`, and the contract does not accidentally add
     runtime helpers or Node-only behavior.

3. Migration correctness and bounded-context safety
   - Confirm manifest entry `040_projects_core` is present, ordered after
     `030_events_audit_core`, uses bounded context `"projects"`, and has the
     correct checksum.
   - Confirm the SQL is idempotent and creates only the `projects` schema plus
     `projects.projects` and `projects.environments`.
   - Confirm every project row carries `org_id`, every environment row carries
     `org_id + project_id`, and slug uniqueness/indexing matches task scope.
   - Confirm there are no foreign keys to `membership.*`, `identity.*`,
     `events.*`, or other bounded-context schemas.
   - Verification focus: inspect whether the schema truly enforces that an
     environment's `org_id` matches the owning project's `org_id`. A plain
     `project_id -> projects(id)` FK is not enough to preserve tenant
     consistency. If cross-org project/environment mismatches are currently
     possible, fix before approving.

4. Repository isolation and behavior
   - Confirm `@saas/db/projects` is Worker-safe and does not export runner-only
     code.
   - Confirm repository methods require tenant scope:
     - `createProject`
     - `getProjectById`
     - `getProjectBySlug`
     - `listProjectsPaged`
     - `archiveProject`
     - `createEnvironment`
     - `getEnvironmentById`
     - `getEnvironmentBySlug`
     - `listEnvironmentsPaged`
     - `archiveEnvironment`
   - Confirm there is no method and no SQL query path that operates by
     `projectId` or `environmentId` alone.
   - Confirm project queries always include `org_id`.
   - Confirm environment queries always include `org_id + project_id`.
   - Confirm `createEnvironment` cannot successfully attach an environment to a
     project from another organization. If the repository currently relies on a
     weaker FK and can persist mismatched tenant data, fix before approving.
   - Confirm SQL is parameterized, conflict/not_found/internal result mapping is
     safe, and internal errors do not leak connection details or SQL text.
   - Confirm list queries use deterministic `(created_at DESC, id DESC)` cursor
     pagination with `limit + 1` behavior.

5. Test adequacy
   - Confirm contract tests prove the new public project/environment types are
     structurally usable from `@saas/contracts/projects`.
   - Confirm migration tests cover manifest presence, checksum, context,
     required tenant columns, and forbidden cross-context foreign keys.
   - Confirm db repository tests cover parameterized SQL shape, cursor
     pagination, conflict mapping, not-found behavior, archive behavior, and
     safe internal error mapping.
   - Add verifier coverage if needed for the tenant-consistency edge above,
     especially if the current tests do not catch cross-org
     `environment.project_id` mismatches.
   - Confirm existing identity/membership/events/migration-runner tests were not
     weakened while updating historical assertions.

6. Orun and merge-path safety
   - Confirm PR #69 CI run `26386471490` reflects the branch head and is green.
   - Confirm the PR does not add a new app component or broaden deploy surface.
   - Confirm Orun validate / changed-plan / dry-run still behave correctly for a
     migration-only foundation PR.
   - After merge, confirm the post-merge `main` CI run starts and that the
     existing db-migrate path applies `040_projects_core` to `stage` and `prod`.
     Record the run ID and result in the verifier report.

# Required Checks

Run at minimum:

```bash
pnpm --filter @saas/contracts typecheck
pnpm --filter @saas/contracts-tests test
pnpm --filter @saas/db typecheck
pnpm --filter @saas/db-tests typecheck
pnpm --filter @saas/db-tests test
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
git diff --check
gh pr checks 69
```

If you add verifier fixes, rerun the affected local checks and ensure PR CI is
green after pushing.

# Merge Requirement

If verification passes:

- Merge PR #69.
- Sync local `main` to the merge commit.
- Confirm the post-merge main CI run starts or, if already complete, record its
  result.
- Explicitly confirm whether `040_projects_core` applied successfully to `stage`
  and `prod`.
- Leave `ai/state.json` and compact context ready for the Orchestrator to
  record Task 0028 as verified.

If verification fails:

- Keep PR #69 open.
- Either commit scoped verifier fixes to the PR branch or write a concise FAIL
  report explaining the blocker.

# Report Expectations

Write `ai/reports/task-0028-verifier.md` with:

- Result: PASS or FAIL.
- PR number and merge status.
- Checks run with exact commands and results.
- Findings/issues, if any.
- Verifier fixes, if any.
- Risk notes, especially around tenant isolation and migration apply behavior.
- Spec proposals, if any.
- Recommended next move.
