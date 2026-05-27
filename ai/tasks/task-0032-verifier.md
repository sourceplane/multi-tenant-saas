# Task ID

Task 0032

# Agent

Verifier

# Current Repo Context

- Task 0032 implementer prompt: `ai/tasks/task-0032.md`.
- Task 0032 implementer report exists locally at
  `ai/reports/task-0032-implementer.md`.
- PR #73 is open and not draft:
  `feat: add projects-worker list endpoint with project.list policy action`
  (`codex/task-0032-project-list-route` -> `main`).
- PR #73 head is `15c0ec8`
  (`feat: add project.list endpoint with policy action and cursor pagination`).
- PR changed-file list includes only runtime/test files:
  - `apps/api-edge/src/project-facade.ts`
  - `apps/projects-worker/src/handlers/list-projects.ts`
  - `apps/projects-worker/src/pagination.ts`
  - `apps/projects-worker/src/router.ts`
  - `packages/contracts/src/policy.ts`
  - `packages/policy-engine/src/index.ts`
  - `tests/api-edge/src/project-facade.test.ts`
  - `tests/contracts/src/policy.test.ts`
  - `tests/policy-engine/src/policy-engine.test.ts`
  - `tests/projects-worker/src/projects-worker.test.ts`
- The local implementer report is not in the PR changed-file list. Resolve this
  according to existing repo convention before merge.
- PR CI run `26410959115` is green after final orchestration polling. The
  verifier must still inspect rendered-plan and job logs before merge.
- Tasks 0001-0031 are verified and merged on `main` at `3fc15bf`.
- Task 0032 scope is project list only:
  `GET /v1/organizations/{orgId}/projects`.

# Objective

Verify that PR #73 safely adds the public project-list endpoint with an explicit
organization-scoped `project.list` policy action, cursor pagination, and clean
bounded-context seams.

# PR Boundary

One PR verification. Verifier fixes may be committed to the same PR branch only
when required to satisfy Task 0032 acceptance criteria.

Do not add project update/archive/delete, environment routes, project
role-assignment management, project-scoped filtered lists, migrations,
Terraform, Cloudflare account-level resources, UI, SDK, CLI, README cleanup, or
`specs-v2/**` work.

# Read First

- `ai/tasks/task-0032.md`
- `ai/reports/task-0032-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `ai/state.json`
- `ai/reports/task-0031-verifier.md`
- `specs/constitution.md`
- `specs/repo.md`
- `specs/orun-golden-path.md`
- `specs/domain-model.md`
- `specs/contracts/api-guidelines.md`
- `specs/contracts/tenancy-and-rbac.md`
- `specs/components/03-policy-authorization.md`
- `specs/components/05-projects-environments.md`

Do not read or apply `specs-v2/**`; this remains reusable SaaS foundation work.

Then inspect:

- PR #73 diff, changed-file list, commits, comments, and checks
- `packages/contracts/src/policy.ts`
- `packages/policy-engine/src/index.ts`
- `apps/policy-worker/src/handlers/authorize.ts`
- `apps/projects-worker/src/router.ts`
- `apps/projects-worker/src/handlers/list-projects.ts`
- `apps/projects-worker/src/pagination.ts`
- `apps/projects-worker/src/handlers/create-project.ts`
- `apps/projects-worker/src/handlers/get-project.ts`
- `apps/projects-worker/src/membership-client.ts`
- `apps/projects-worker/src/policy-client.ts`
- `apps/projects-worker/src/ids.ts`
- `packages/db/src/projects/repository.ts`
- `packages/db/src/projects/types.ts`
- `apps/api-edge/src/project-facade.ts`
- `tests/projects-worker/src/projects-worker.test.ts`
- `tests/api-edge/src/project-facade.test.ts`
- `tests/policy-engine/src/policy-engine.test.ts`
- `tests/contracts/src/policy.test.ts`

# Required Outcomes

1. Scope and PR hygiene
   - Confirm PR #73 maps exactly to Task 0032.
   - Confirm no project update/archive/delete, environment routes, project
     role-assignment management, project-scoped filtered list, migrations,
     Terraform, live infra definitions, UI, SDK, CLI, README cleanup, or
     `specs-v2/**` changes are included.
   - Resolve the implementer-report discrepancy according to existing task
     convention before merge.
   - Confirm no ignored generated outputs are staged or committed.

2. Policy contract and engine
   - Confirm `project.list` is added as a known policy action.
   - Confirm `project.list` is organization-scoped and does not require
     `projectId`.
   - Confirm `owner`, `admin`, `builder`, and `viewer` organization roles allow
     project listing.
   - Confirm `billing_admin` denies project listing.
   - Confirm project-scoped roles alone do not grant organization-wide project
     listing.
   - Confirm `project.read` still requires explicit `projectId` and was not
     weakened to authorize list behavior.
   - Confirm unknown future membership facts remain ignored safely.

3. projects-worker list behavior
   - Confirm `GET /v1/organizations/{orgId}/projects` is routed in
     `apps/projects-worker`.
   - Confirm malformed public `org_` IDs return 404, not 500.
   - Confirm actor headers are required and resolved the same way as create/get.
   - Confirm `limit`/`cursor` parsing follows the established cursor contract:
     default 50, max 100, opaque versioned cursor, malformed cursor or invalid
     limit returns `validation_failed`.
   - Inspect `apps/projects-worker/src/pagination.ts` carefully, including
     timestamp/UUID validation and cursor encode/decode behavior.
   - Confirm the implementation does not import `apps/membership-worker` code.
   - Confirm membership-worker authorization-context is called with actor
     subject and raw org UUID.
   - Confirm policy-worker authorize is called with action `project.list` and an
     organization-scoped resource.
   - Confirm membership-context errors/malformed envelopes, policy errors,
     malformed policy responses, and policy denial fail closed without leaking
     internal details.
   - Confirm `listProjectsPaged(orgId, pageParams)` is used and there is no
     cross-organization query path.
   - Confirm response shape is `{ projects: PublicProject[] }` with
     `meta.cursor`.
   - Confirm list responses use public `org_` and `prj_` IDs and do not expose
     raw UUIDs.

4. api-edge facade
   - Confirm `GET /v1/organizations/{orgId}/projects` forwards to
     `PROJECTS_WORKER` after identity resolution.
   - Confirm query params are preserved.
   - Confirm actor headers, request ID, traceparent, and idempotency-key
     forwarding remain correct.
   - Confirm bearer tokens are not forwarded to projects-worker.
   - Confirm existing project create and explicit project read behavior remains
     intact.
   - Confirm no project update/archive/delete or environment route is exposed.
   - Confirm missing `PROJECTS_WORKER` returns a safe 503.

5. Boundary cleanliness
   - Confirm projects-worker does not import membership repository code or query
     `membership.*` storage directly.
   - Confirm policy changes are limited to `project.list` and required role
     matrix behavior.
   - Confirm api-edge does not expose membership or policy internal routes.

6. Tests and CI evidence
   - Confirm contracts tests cover `project.list` and existing
     `ListProjectsResponse`.
   - Confirm policy-engine tests cover org-role allows, billing_admin deny,
     no-membership deny, cross-org deny, project-scoped-role deny, and
     `project.read` explicit projectId behavior.
   - Confirm projects-worker tests cover list success, pagination defaults,
     limit bounds, invalid cursor, next cursor, malformed org ID, missing
     bindings, membership/policy fail-closed behavior, repository failure, and
     raw UUID redaction.
   - Confirm api-edge tests cover GET collection forwarding, query preservation,
     actor headers, bearer-token redaction, and missing binding 503.
   - Inspect PR CI run `26410959115` with `gh`; cite real rendered-plan and job
     log evidence, not only the summary.
   - Confirm PR CI is still green before merge. Do not merge while any check is
     pending/failing.
   - Confirm no `db-migrate`, Terraform, Supabase, AWS, S3, Secrets Manager, or
     unrelated infra apply jobs are selected.

7. Live resource verification after merge
   - If verification passes and PR #73 is merged, inspect post-merge main CI
     logs.
   - Independently verify non-secret Cloudflare state for updated Workers:
     policy-worker, projects-worker, and api-edge stage/prod deployment/version
     IDs or equivalent deployment metadata.
   - Confirm stage/prod projects-worker remain private (`workers_dev: false`),
     and api-edge still binds `PROJECTS_WORKER` to same-environment
     projects-worker.

# Non-Goals

- No Task 0033 planning.
- No product-specific Git catalog or `specs-v2/**` work.
- No project update/archive/delete.
- No environment runtime behavior.
- No project-scoped filtered list or role-assignment management.
- No database migration or Terraform change.
- No unrelated cleanup.

# Constraints

- Trust code reality over stale docs.
- Authorization must be deny-by-default.
- Project list is organization-scoped for Task 0032.
- Project-scoped roles alone must not grant org-wide list access.
- `project.read` must remain project-scoped and require explicit `projectId`.
- Public list route must include explicit organization scope.
- Do not log, report, or commit database passwords, connection strings, API
  keys, service keys, bearer tokens, token hashes, SQL stack traces, or other
  secrets.
- Leave the local repo clean after verifier-created changes and merge protocol.

# Integration Notes

- `@saas/db/projects` already owns `listProjectsPaged(orgId, params)`.
- Existing membership list pagination is reference behavior, but projects-worker
  must not import membership-worker source.
- Task 0031 established projects-worker create/get and api-edge project facade;
  do not regress those behaviors.
- Task 0030 authorization-context remains the only allowed source of membership
  facts for projects-worker.

# Acceptance Criteria

- PR #73 includes the task-required source and test changes.
- The implementer report state is resolved before merge.
- Local required checks pass.
- PR CI logs confirm expected changed plan and successful jobs.
- All project-list API semantics, policy boundaries, pagination behavior, and
  bounded-context seams pass review and tests.
- Any verifier fixes are committed to PR #73 and CI is green afterward.
- If PASS, PR #73 is merged, local `main` is synced, post-merge CI/resource
  evidence is recorded, and the verifier report is written.
- If FAIL, PR #73 remains open with a concise blocker report.

# Verification

Run at minimum:

```bash
pnpm --filter @saas/contracts typecheck
pnpm --filter @saas/contracts-tests test
pnpm --filter @saas/policy-engine typecheck
pnpm --filter @saas/policy-engine-tests test
pnpm --filter @saas/projects-worker typecheck
pnpm --filter @saas/projects-worker-tests test
pnpm --filter @saas/projects-worker build
pnpm --filter @saas/api-edge typecheck
pnpm --filter @saas/api-edge-tests test
pnpm --filter @saas/api-edge build
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
git diff --check
gh pr checks 73
```

Also inspect PR CI run `26410959115` with `gh` so the report cites actual
rendered-plan and job-log evidence. If you add verifier fixes, rerun affected
local checks and ensure PR CI is green after pushing.

# PR Creation Requirement

This is a verifier task for existing PR #73. Do not open a new PR. If fixes are
needed, commit them to `codex/task-0032-project-list-route`, push that branch,
and wait for PR CI.

# When Done Report

Write `ai/reports/task-0032-verifier.md` with:

- Result: PASS|FAIL
- Checks
- Issues
- Risk Notes
- Spec Proposals
- Recommended Next Move
