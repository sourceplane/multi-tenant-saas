# Task ID

Task 0031

# Agent

Verifier

# Current Repo Context

- Task 0031 implementer prompt: `ai/tasks/task-0031.md`
- Task 0031 implementer report exists locally at
  `ai/reports/task-0031-implementer.md`.
- PR #72 is open, clean, and not draft:
  `feat: add projects-worker with create and get project routes`
  (`codex/task-0031-projects-worker-create-get` -> `main`).
- PR #72 head is `eee7fe8`
  (`feat: add projects-worker with create and get project routes (#72)`).
- PR CI run `26407182233` is green with 14 checks:
  `plan`, `projects-worker-tests`, `projects-worker` dev/stage/prod,
  `api-edge` dev/stage/prod, `membership-worker` dev/stage/prod, and
  `policy-worker` dev/stage/prod.
- Orchestrator finding to inspect before merge: the local working tree has
  `tests/api-edge/src/project-facade.test.ts`, but PR #72's changed-file list
  does not include that file, and PR CI does not show an `api-edge-tests` job.
  The implementer report claims api-edge project facade tests were added.
- Orchestrator finding to inspect before merge: PR #72's changed-file list does
  not include `ai/reports/task-0031-implementer.md`, although the report exists
  locally. Follow existing repo convention and do not merge until the report
  state is resolved.
- Tasks 0001-0030 are verified and merged on `main` at `1928559`.
- Task 0031 scope is the first public projects runtime slice only:
  project create/get through api-edge, backed by `apps/projects-worker`.

# Objective

Verify that PR #72 safely adds the first deployable projects runtime slice:

- private `apps/projects-worker`;
- public api-edge forwarding for project create and explicit project read;
- authorization through membership-worker authorization-context and policy-worker;
- project persistence through `@saas/db/projects`;
- atomic `project.created` event/audit on project creation.

# PR Boundary

One PR verification. Verifier fixes may be committed to the same PR branch only
when required to satisfy Task 0031 acceptance criteria.

Do not add project list, project update/archive/delete, environment routes,
policy action changes, database migrations, Terraform resources,
Cloudflare account-level resources, UI, SDK, CLI, README cleanup, or
`specs-v2/**` work.

# Read First

- `ai/tasks/task-0031.md`
- `ai/reports/task-0031-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `ai/state.json`
- `ai/reports/task-0030-verifier.md`
- `specs/constitution.md`
- `specs/repo.md`
- `specs/orun-golden-path.md`
- `specs/domain-model.md`
- `specs/contracts/api-guidelines.md`
- `specs/contracts/tenancy-and-rbac.md`
- `specs/components/03-policy-authorization.md`
- `specs/components/04-organizations-membership.md`
- `specs/components/05-projects-environments.md`
- `specs/components/09-events-audit-observability.md`

Do not read or apply `specs-v2/**`; this remains reusable SaaS foundation work.

Then inspect:

- PR #72 diff, changed-file list, commits, and checks
- `apps/projects-worker/**`
- `apps/api-edge/src/project-facade.ts`
- `apps/api-edge/src/index.ts`
- `apps/api-edge/src/env.ts`
- `apps/api-edge/wrangler.jsonc`
- `apps/api-edge/scripts/verify-bindings.mjs`
- `apps/api-edge/component.yaml`
- `packages/contracts/src/projects.ts`
- `packages/contracts/src/policy.ts`
- `packages/db/src/projects/repository.ts`
- `packages/db/src/events/repository.ts`
- `apps/membership-worker/src/handlers/authorization-context.ts`
- `apps/policy-worker/src/router.ts`
- `tests/projects-worker/src/projects-worker.test.ts`
- `tests/api-edge/src/project-facade.test.ts`, if present locally or in the PR

# Required Outcomes

1. Scope and PR hygiene
   - Confirm PR #72 maps to exactly Task 0031.
   - Confirm no project list, update/archive/delete, environment routes, policy
     semantics, migrations, Terraform, live infra definitions, UI, SDK, CLI,
     README cleanup, or `specs-v2/**` changes are included.
   - Resolve the api-edge test discrepancy: either commit the missing
     `tests/api-edge/src/project-facade.test.ts` to the PR branch and rerun
     checks, or fail the PR if required api-edge facade coverage is absent.
   - Resolve the implementer-report discrepancy according to existing task
     convention before merge.
   - Confirm no ignored generated outputs are staged or committed.

2. Projects-worker scaffold and deployment contract
   - Confirm `apps/projects-worker` has package, TypeScript, Worker source,
     Wrangler config, and Orun component manifest following existing Worker
     patterns.
   - Confirm stage/prod `workers_dev: false`.
   - Confirm stage/prod bind `SOURCEPLANE_DB` to the verified Hyperdrive IDs,
     `MEMBERSHIP_WORKER` to same-environment membership-worker, and
     `POLICY_WORKER` to same-environment policy-worker.
   - Confirm `/health` returns non-secret binding/config status.
   - Confirm `tests/projects-worker` is a first-class component/package.
   - Confirm Orun ordering is safe: projects-worker depends on membership and
     policy workers, and api-edge depends on projects-worker.

3. Public ID and route behavior
   - Confirm org/project public IDs use `org_` and `prj_` at API boundaries.
   - Confirm malformed org/project IDs return 404, not 500.
   - Confirm raw project UUIDs are not exposed in public responses, event
     payloads intended for external consumption, audit descriptions, or tests.
   - Confirm internal UUIDs are still used for database and policy calls.

4. Project create
   - Confirm `POST /v1/organizations/{orgId}/projects` validates the existing
     `CreateProjectRequest` shape and slug rules.
   - Confirm api-edge resolves identity first and forwards actor headers without
     forwarding bearer tokens.
   - Confirm projects-worker calls membership-worker authorization-context with
     actor subject and raw org UUID, then policy-worker with action
     `project.create` and resource `{ kind: "project", orgId }`.
   - Confirm membership-context failures, malformed envelopes, policy errors,
     and policy denial fail closed and do not create a project.
   - Confirm project persistence uses `@saas/db/projects`.
   - Confirm `project.created` event/audit append is transactionally coupled to
     the project insert, and event append failure prevents success.
   - Confirm duplicate slug/project conflicts map to safe `409 conflict`.

5. Project read
   - Confirm `GET /v1/organizations/{orgId}/projects/{projectId}` parses both
     public IDs and never queries by project ID alone.
   - Confirm authorization uses membership-context then policy-worker action
     `project.read` with explicit `{ orgId, projectId }` scope.
   - Confirm policy denial returns 404 to avoid project enumeration.
   - Confirm `getProjectById(orgId, projectId)` is used for retrieval.

6. api-edge facade
   - Confirm `PROJECTS_WORKER` is added to api-edge Env, Wrangler stage/prod
     service bindings, and binding verification.
   - Confirm only the create and explicit read routes are forwarded.
   - Confirm `GET /v1/organizations/{orgId}/projects` is not exposed as list.
   - Confirm request, trace, idempotency, and actor headers are forwarded as
     appropriate, while bearer tokens are not forwarded.
   - Confirm missing `PROJECTS_WORKER` returns a safe 503.

7. Boundary and policy cleanliness
   - Confirm projects-worker does not import membership repository code or query
     `membership.*` storage directly.
   - Confirm policy-engine actions and semantics are unchanged.
   - Confirm api-edge does not expose membership or policy internal routes.
   - Confirm bounded-context ownership remains: projects owns project
     persistence, membership owns role facts, policy owns authorization.

8. Orun and CI evidence
   - Inspect PR CI run `26407182233` with `gh`; cite real job/log evidence, not
     only the summary.
   - Confirm the changed plan includes all expected components. If
     `api-edge-tests` is absent, explain why it is acceptable or fix/fail the
     PR.
   - Confirm no `db-migrate`, Terraform, Supabase, AWS, S3, Secrets Manager, or
     unrelated infra apply jobs are selected.

9. Live resource verification after merge
   - If verification passes and PR #72 is merged, inspect post-merge main CI
     logs and independently verify non-secret Cloudflare state for the newly
     deployed/updated Workers.
   - Record observed stage/prod projects-worker deployment/version IDs, api-edge
     deployment/version IDs if updated, same-environment service bindings, and
     `workers_dev: false` / direct workers.dev blocked behavior for
     projects-worker.

# Non-Goals

- No Task 0032 planning.
- No product-specific Git catalog or `specs-v2/**` work.
- No new policy action or project list semantics.
- No live database migration or Terraform change.
- No unrelated cleanup.

# Constraints

- Trust code reality over stale docs.
- Authorization must be deny-by-default.
- Project reads must include both org and project scope.
- Stage/prod internal projects-worker must remain private.
- Do not log, report, or commit database passwords, connection strings, API
  keys, service keys, bearer tokens, token hashes, SQL stack traces, or other
  secrets.
- Leave the local repo clean after verifier-created changes and merge protocol.

# Integration Notes

- Current policy has no `project.list`; do not treat list absence as a gap.
- `040_projects_core` is already applied on stage/prod via main CI
  `26389807233`; this PR should not run db-migrate.
- Task 0030's authorization-context seam is the only allowed source of
  membership facts for projects-worker.
- Existing membership-worker event wiring is the reference for transactionally
  coupling mutation and audit/event writes.

# Acceptance Criteria

- PR #72 includes the task-required source, test, and report files.
- Local required checks pass.
- PR CI logs confirm the expected changed plan and successful jobs.
- All create/get API semantics, authorization boundaries, and event/audit
  requirements pass review and tests.
- Any verifier fixes are committed to PR #72 and CI is green afterward.
- If PASS, PR #72 is merged, local `main` is synced, post-merge CI/resource
  evidence is recorded, and the verifier report is written.
- If FAIL, PR #72 remains open with a concise blocker report.

# Verification

Run at minimum:

```bash
pnpm --filter @saas/projects-worker typecheck
pnpm --filter @saas/projects-worker-tests test
pnpm --filter @saas/projects-worker build
pnpm --filter @saas/api-edge typecheck
pnpm --filter @saas/api-edge-tests test
pnpm --filter @saas/api-edge build
pnpm --filter @saas/contracts typecheck
pnpm --filter @saas/contracts-tests test
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
git diff --check
gh pr checks 72
```

Also inspect PR CI run `26407182233` with `gh` so the report cites actual
rendered-plan and job-log evidence.

If you add verifier fixes, rerun affected local checks and ensure PR CI is
green after pushing.

# PR Creation Requirement

This is a verifier task for existing PR #72. Do not open a new PR. If fixes are
needed, commit them to `codex/task-0031-projects-worker-create-get`, push that
branch, and wait for PR CI.

# When Done Report

Write `ai/reports/task-0031-verifier.md` with:

- Result: PASS or FAIL
- PR number and merge status
- Checks run with exact commands and results
- PR CI evidence, including run `26407182233` and any rerun IDs
- Scope and file-list findings, especially api-edge test/report resolution
- Verifier fixes, if any
- Live Cloudflare/resource verification after merge, if PASS
- Risk notes
- Spec proposals, if any
- Recommended next move
