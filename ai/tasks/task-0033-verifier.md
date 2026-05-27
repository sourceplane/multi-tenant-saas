# Task ID

Task 0033

# Agent

Verifier

# Current Repo Context

- Task 0033 implementer prompt: `ai/tasks/task-0033.md`.
- Task 0033 implementer report exists locally at
  `ai/reports/task-0033-implementer.md`.
- PR #74 is open and not draft:
  `feat: add project archive endpoint with project.delete policy action`
  (`codex/task-0033-project-archive-route` -> `main`).
- PR #74 head is `fd3daef`
  (`feat: add project archive endpoint with project.delete policy action`).
- PR #74 changed-file list from orchestration inspection:
  - `apps/api-edge/src/project-facade.ts`
  - `apps/projects-worker/src/handlers/archive-project.ts`
  - `apps/projects-worker/src/router.ts`
  - `tests/api-edge/src/project-facade.test.ts`
  - `tests/projects-worker/src/projects-worker.test.ts`
- The local implementer report is not in the PR changed-file list. Resolve this
  according to existing repo convention before merge.
- PR CI run `26412635496` is green as of final orchestration polling. The
  verifier must still inspect the rendered plan and job logs before merge.
- Tasks 0001-0032 are verified and merged on `main` at `06c7dbb`.
- Task 0033 scope is project archival only:
  `DELETE /v1/organizations/{orgId}/projects/{projectId}`.

# Objective

Verify that PR #74 safely adds public project archival through api-edge and
projects-worker, using existing `project.delete` authorization, soft-archiving
through `archiveProject`, and writing `project.archived` event/audit records
atomically with the archive mutation.

# PR Boundary

One PR verification. Verifier fixes may be committed to the same PR branch only
when required to satisfy Task 0033 acceptance criteria.

Do not add project update/edit, restore/unarchive, hard delete, environment
routes, project role-assignment management, project-scoped filtered lists,
policy action changes, database migrations, Terraform, Cloudflare account-level
resources, UI, SDK, CLI, README cleanup, or `specs-v2/**` work.

# Read First

- `ai/tasks/task-0033.md`
- `ai/reports/task-0033-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `ai/state.json`
- `ai/reports/task-0032-verifier.md`
- `specs/constitution.md`
- `specs/repo.md`
- `specs/orun-golden-path.md`
- `specs/domain-model.md`
- `specs/contracts/api-guidelines.md`
- `specs/contracts/tenancy-and-rbac.md`
- `specs/components/03-policy-authorization.md`
- `specs/components/05-projects-environments.md`
- `specs/components/09-events-audit-observability.md`

Do not read or apply `specs-v2/**`; this remains reusable SaaS foundation work.

Then inspect:

- PR #74 diff, changed-file list, commits, comments, and checks
- `apps/projects-worker/src/handlers/archive-project.ts`
- `apps/projects-worker/src/router.ts`
- `apps/projects-worker/src/handlers/create-project.ts`
- `apps/projects-worker/src/handlers/get-project.ts`
- `apps/projects-worker/src/handlers/list-projects.ts`
- `apps/projects-worker/src/membership-client.ts`
- `apps/projects-worker/src/policy-client.ts`
- `apps/projects-worker/src/http.ts`
- `apps/projects-worker/src/ids.ts`
- `packages/contracts/src/projects.ts`
- `packages/contracts/src/policy.ts`
- `packages/policy-engine/src/index.ts`
- `packages/db/src/projects/repository.ts`
- `packages/db/src/projects/types.ts`
- `packages/db/src/events/repository.ts`
- `packages/db/src/events/types.ts`
- `apps/api-edge/src/project-facade.ts`
- `tests/projects-worker/src/projects-worker.test.ts`
- `tests/api-edge/src/project-facade.test.ts`
- `tests/db/src/projects.test.ts`
- `tests/policy-engine/src/policy-engine.test.ts`

# Required Outcomes

1. Scope and PR hygiene
   - Confirm PR #74 maps exactly to Task 0033.
   - Confirm no project update/edit, restore/unarchive, hard delete,
     environment routes, project role-assignment management, project-scoped
     filtered list, policy action changes, migrations, Terraform, live infra
     definitions, UI, SDK, CLI, README cleanup, or `specs-v2/**` changes are
     included.
   - Resolve the implementer-report discrepancy according to existing task
     convention before merge.
   - Confirm no ignored generated outputs are staged or committed.

2. projects-worker archive behavior
   - Confirm `DELETE /v1/organizations/{orgId}/projects/{projectId}` is routed
     in `apps/projects-worker`.
   - Confirm both public IDs are parsed (`org_`, `prj_`) and malformed IDs
     return 404, not 500.
   - Confirm missing actor headers return 401.
   - Confirm the endpoint does not accept or depend on a request body.
   - Confirm missing `SOURCEPLANE_DB`, `MEMBERSHIP_WORKER`, or `POLICY_WORKER`
     returns a safe 503.
   - Confirm membership-worker authorization-context is called with actor
     subject and raw org UUID.
   - Confirm policy-worker authorize is called with action `project.delete` and
     an explicit project resource containing raw `orgId` and `projectId`.
   - Confirm policy denial and membership/policy fetch or malformed-envelope
     failures fail closed without internal detail leaks.
   - Confirm `archiveProject(orgId, projectId, archivedAt)` is used and there is
     no hard-delete path.
   - Confirm repository `not_found` maps to 404 and repository internal errors
     map to a safe service error.
   - Confirm the response is a standard success envelope containing
     `{ project: PublicProject }` with status `archived` and public IDs.
   - Confirm existing create, list, and get routes remain intact. List must
     continue returning active projects only through `listProjectsPaged`.

3. Event/audit atomicity
   - Confirm project archive and `project.archived` event/audit append share the
     transaction-capable SQL executor path in production code.
   - Confirm event/audit append failure prevents a successful archive commit.
   - Confirm event type is `project.archived`, source is `projects-worker`, and
     audit category is `projects`.
   - Confirm public-facing event payloads, audit descriptions, API responses,
     and tests use public `org_` and `prj_` IDs and do not expose raw UUIDs.
   - Confirm database scope columns may use raw UUIDs as required by the events
     schema, but no secrets, bearer tokens, SQL, stack traces, or connection
     details are written to payloads, audit descriptions, or reports.

4. api-edge facade
   - Confirm `DELETE /v1/organizations/{orgId}/projects/{projectId}` forwards to
     `PROJECTS_WORKER` only after identity resolution.
   - Confirm actor headers, request ID, traceparent, and idempotency-key
     forwarding remain correct.
   - Confirm bearer tokens are not forwarded to projects-worker.
   - Confirm DELETE request bodies are not forwarded.
   - Confirm existing POST create, GET list, and GET item behavior remains
     intact.
   - Confirm no project update, restore, hard delete, or environment route is
     exposed.
   - Confirm missing `PROJECTS_WORKER` returns a safe 503.

5. Policy and bounded-context seams
   - Confirm no policy action is added or renamed.
   - Confirm existing `project.delete` semantics are preserved: owner/admin org
     roles and matching `project_admin` may archive; builder, viewer,
     billing_admin, project_builder, and project_viewer do not get archive
     permission.
   - Confirm projects-worker does not import membership repository code or
     query `membership.*` storage directly.
   - Confirm api-edge does not expose membership or policy internal routes.

6. Tests and CI evidence
   - Confirm projects-worker tests cover success, policy action/resource shape,
     malformed public IDs, missing actor, unsupported methods, missing bindings,
     membership/policy fail-closed behavior, repository not-found/internal
     errors, event append failure, response/event/audit redaction, and existing
     route regressions.
   - Confirm api-edge tests cover DELETE item forwarding after identity
     resolution, actor headers, bearer-token redaction, missing PROJECTS_WORKER
     503, and existing POST/GET behavior.
   - Confirm policy-engine tests still cover `project.delete` role semantics.
   - Inspect PR CI run `26412635496` and any later reruns with `gh`; cite real
     rendered-plan and job-log evidence, not only the summary.
   - Confirm PR CI is green before merge. Do not merge while any check is
     pending/failing.
   - Confirm no `db-migrate`, Terraform, Supabase, AWS, S3, Secrets Manager, or
     unrelated infra apply jobs are selected.

7. Live resource verification after merge
   - If verification passes and PR #74 is merged, inspect post-merge main CI
     logs.
   - Independently verify non-secret Cloudflare state for updated Workers:
     projects-worker and api-edge stage/prod deployment/version IDs or
     equivalent deployment metadata.
   - Confirm stage/prod projects-worker remain private (`workers_dev: false`),
     and api-edge still binds `PROJECTS_WORKER` to same-environment
     projects-worker.

# Non-Goals

- No Task 0034 planning.
- No product-specific Git catalog or `specs-v2/**` work.
- No project update/edit endpoint.
- No project restore/unarchive endpoint.
- No hard-delete behavior.
- No environment runtime behavior.
- No project role-assignment management.
- No project-scoped filtered list.
- No policy action changes.
- No database migration or Terraform change.
- No unrelated cleanup.

# Constraints

- Trust code reality over stale docs.
- Authorization must be deny-by-default.
- Project archival is destructive and must include audit/event coverage.
- Project archival must include both organization and project scope.
- Stage/prod internal projects-worker must remain private.
- Do not log, report, or commit database passwords, connection strings, API
  keys, service keys, bearer tokens, token hashes, SQL stack traces, or other
  secrets.
- Leave the local repo clean after verifier-created changes and merge protocol.

# Integration Notes

- `@saas/db/projects.archiveProject` updates active rows to `archived` and
  returns `not_found` when the project does not exist, is outside the org, or is
  already archived.
- Existing project creation is the reference for transactionally coupling a
  source mutation with `events.appendEventWithAudit`.
- Task 0030 authorization-context remains the only allowed source of membership
  facts for projects-worker.
- Task 0032 project list intentionally remains org-scoped and filters active
  projects; do not change that behavior for archival.

# Acceptance Criteria

- PR #74 includes the task-required source, test, and report files.
- Local required checks pass.
- PR CI logs confirm the expected changed plan and successful jobs.
- All archive API semantics, authorization boundaries, soft-delete behavior,
  event/audit atomicity, api-edge forwarding, and bounded-context seams pass
  review and tests.
- Any verifier fixes are committed to PR #74 and CI is green afterward.
- If PASS, PR #74 is merged, local `main` is synced, post-merge CI/resource
  evidence is recorded, and the verifier report is written.
- If FAIL, PR #74 remains open with a concise blocker report.

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
pnpm --filter @saas/policy-engine typecheck
pnpm --filter @saas/policy-engine-tests test
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
git diff --check
gh pr checks 74
```

Also inspect PR CI run `26412635496` and any later reruns with `gh` so the
report cites actual rendered-plan and job-log evidence.

If you add verifier fixes, rerun affected local checks and ensure PR CI is green
after pushing.

# PR Creation Requirement

This is a verifier task for existing PR #74. Do not open a new PR. If fixes are
needed, commit them to `codex/task-0033-project-archive-route`, push that
branch, and wait for PR CI.
