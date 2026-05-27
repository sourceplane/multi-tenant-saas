# Task ID

Task 0034

# Agent

Verifier

# Current Repo Context

- Task 0034 implementer prompt: `ai/tasks/task-0034.md`.
- Task 0034 implementer report exists locally at `ai/reports/task-0034-implementer.md`.
- PR #75 is open and not draft:
  `feat: add environment create/list/get routes with project-scoped policy`
  (`codex/task-0034-environment-runtime-create-list-get` -> `main`).
- PR #75 head is at recent commits implementing the environment routes.
- PR #75 changed-file list from orchestration inspection:
  - `apps/projects-worker/src/ids.ts` — added `environmentPublicId()` and `parseEnvironmentPublicId()`
  - `apps/projects-worker/src/router.ts` — added environment collection + item route matching
  - `apps/projects-worker/src/handlers/create-environment.ts` — new handler
  - `apps/projects-worker/src/handlers/list-environments.ts` — new handler
  - `apps/projects-worker/src/handlers/get-environment.ts` — new handler
  - `apps/api-edge/src/project-facade.ts` — extended `isProjectRoute` and `handleProjectRoute`
  - `packages/contracts/src/policy.ts` — added `environment.create`
  - `packages/policy-engine/src/index.ts` — added `environment.create` to role permission maps
  - `tests/projects-worker/src/projects-worker.test.ts` — 46 new tests
  - `tests/api-edge/src/project-facade.test.ts` — 13 new tests
  - `tests/policy-engine/src/policy-engine.test.ts` — 14 new tests
  - `tests/contracts/src/policy.test.ts` — 2 new assertions
- PR CI run `26431482114` is green (22/22 checks pass).
- Tasks 0001-0033 are verified and merged on `main`.
- Task 0034 scope is environment create/list/get only:
  - `POST /v1/organizations/{orgId}/projects/{projectId}/environments`
  - `GET /v1/organizations/{orgId}/projects/{projectId}/environments`
  - `GET /v1/organizations/{orgId}/projects/{projectId}/environments/{environmentId}`

# Objective

Verify that PR #75 safely adds the first public environment runtime slice through api-edge and projects-worker, including:
- Project-scoped `environment.create` policy action
- Project-scoped `environment.read` authorization for list/get
- `environment.created` event/audit written atomically with environment creation
- Parent project existence and active state verification before all environment operations

# PR Boundary

One PR verification. Verifier fixes may be committed to the same PR branch only when required to satisfy Task 0034 acceptance criteria.

Do not add environment update/edit, archive/delete, project update/restore, hard delete, project role-assignment management, filtered lists, policy action changes (beyond environment.create), database migrations, Terraform, Cloudflare account-level resources, UI, SDK, CLI, README cleanup, public audit API, or `specs-v2/**` work.

# Read First

- `ai/tasks/task-0034.md`
- `ai/reports/task-0034-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `ai/state.json`
- `ai/reports/task-0033-verifier.md`
- `specs/constitution.md`
- `specs/repo.md`
- `specs/orun-golden-path.md`
- `specs/domain-model.md`
- `specs/contracts/api-guidelines.md`
- `specs/contracts/tenancy-and-rbac.md`
- `specs/components/03-policy-authorization.md`
- `specs/components/05-projects-environments.md`
- `specs/components/09-events-audit-observability.md`

Then inspect:

- PR #75 diff, changed-file list, commits, comments, and checks
- `apps/projects-worker/src/ids.ts`
- `apps/projects-worker/src/router.ts`
- `apps/projects-worker/src/handlers/create-environment.ts`
- `apps/projects-worker/src/handlers/list-environments.ts`
- `apps/projects-worker/src/handlers/get-environment.ts`
- `apps/projects-worker/src/handlers/create-project.ts`
- `apps/projects-worker/src/handlers/get-project.ts`
- `apps/projects-worker/src/handlers/list-projects.ts`
- `apps/projects-worker/src/pagination.ts`
- `apps/projects-worker/src/membership-client.ts`
- `apps/projects-worker/src/policy-client.ts`
- `apps/projects-worker/src/http.ts`
- `apps/api-edge/src/project-facade.ts`
- `packages/contracts/src/projects.ts`
- `packages/contracts/src/policy.ts`
- `packages/policy-engine/src/index.ts`
- `packages/db/src/projects/types.ts`
- `packages/db/src/projects/repository.ts`
- `packages/db/src/events/types.ts`
- `packages/db/src/events/repository.ts`
- `tests/projects-worker/src/projects-worker.test.ts`
- `tests/api-edge/src/project-facade.test.ts`
- `tests/db/src/projects.test.ts`
- `tests/policy-engine/src/policy-engine.test.ts`
- `tests/contracts/src/policy.test.ts`

# Required Outcomes

1. Scope and PR hygiene
   - Confirm PR #75 maps exactly to Task 0034.
   - Confirm no environment update/edit, archive/delete, project update/restore,
     project role-assignment management, filtered lists, policy action changes
     beyond `environment.create`, migrations, Terraform, live infra definitions,
     UI, SDK, CLI, README cleanup, or `specs-v2/**` changes are included.
   - Confirm no ignored generated outputs are staged or committed.

2. Environment public ID handling
   - Confirm `env_` public ID helpers are added in projects-worker, matching the
     existing `org_` and `prj_` UUID-hex pattern.
   - Confirm malformed `org_`, `prj_`, and `env_` IDs return 404, not 500.

3. Environment create behavior
   - Confirm `POST /v1/organizations/{orgId}/projects/{projectId}/environments` is routed.
   - Confirm both public IDs are parsed (`org_`, `prj_`) and malformed IDs return 404.
   - Confirm missing actor headers return 401.
   - Confirm JSON body validation: `name` required, `slug` optional with project-like rules.
   - Confirm parent project existence is verified; missing or archived parent returns 404.
   - Confirm membership-worker authorization-context is called with actor subject and raw org UUID.
   - Confirm policy-worker authorize uses action `environment.create` with explicit project resource.
   - Confirm policy action is project-scoped: `{ kind: "environment", orgId, projectId }`.
   - Confirm role semantics: org `owner`/`admin`/`builder` and `project_admin`/`project_builder` may create; `viewer`/`billing_admin`/`project_viewer` may not; cross-org wrong-project denials.
   - Confirm slug conflicts map to 409.
   - Confirm repository/internal failures map to safe 503.
   - Confirm missing `SOURCEPLANE_DB`, `MEMBERSHIP_WORKER`, or `POLICY_WORKER` returns safe 503.

4. Environment list behavior
   - Confirm `GET /v1/organizations/{orgId}/projects/{projectId}/environments` uses explicit project scope.
   - Confirm membership-worker authorization-context is called before policy-worker.
   - Confirm authorization uses existing `environment.read` with explicit resource `{ kind: "environment", orgId, projectId }`.
   - Confirm cursor pagination: default 50, max 100, opaque cursor in `meta.cursor`.
   - Confirm `listEnvironmentsPaged(orgId, projectId, pageParams)` is used.
   - Confirm missing/archived parent project returns 404.
   - Confirm returns `{ environments: PublicEnvironment[] }` with public IDs.

5. Environment get behavior
   - Confirm `GET /v1/organizations/{orgId}/projects/{projectId}/environments/{environmentId}` includes all three IDs.
   - Confirm authorization uses `environment.read` with resource containing `environmentId`.
   - Confirm uses `getEnvironmentById(orgId, projectId, environmentId)`.
   - Confirm policy denial and repository not-found return 404.
   - Confirm missing parent project returns 404.

6. Event/audit atomicity for create
   - Confirm environment insert and `environment.created` event/audit append share the transaction-capable SQL executor.
   - Confirm event/audit append failure prevents successful create commit.
   - Confirm event type `environment.created`, source `projects-worker`, category `projects`.
   - Confirm public-facing payloads use public IDs (`org_`, `prj_`, `env_`) without raw UUIDs.
   - Confirm no secrets, bearer tokens, SQL, stack traces, or connection details in payloads.

7. api-edge facade
   - Confirm three environment routes forward to `PROJECTS_WORKER` after identity resolution.
   - Confirm query params preserved on list route.
   - Confirm actor headers, request ID, traceparent, idempotency-key forwarding correct.
   - Confirm bearer token not forwarded.
   - Confirm POST body forwarded only for create.
   - Confirm existing project routes remain covered.
   - Confirm missing `PROJECTS_WORKER` returns safe 503.

8. Policy semantics
   - Confirm `environment.create` is project-scoped (not org-scoped).
   - Confirm `environment.read` authorization uses explicit project scope.
   - Confirm no `environment.list` action was added incorrectly.
   - Confirm role matrix matches spec: org owner/admin/builder and project_admin/project_builder may create; others denied.

9. Bounded-context seams
   - Confirm projects-worker does not import membership repository code.
   - Confirm projects-worker does not query `membership.*` storage directly.
   - Confirm api-edge does not expose membership or policy internal routes.

10. Tests and CI evidence
    - Confirm projects-worker tests cover: create success, policy action/resource shape, parent not found/archived cases, duplicate slug 409, event/audit failure blocks create, list with pagination, get success, malformed IDs 404, missing actor 401, unsupported methods 405, missing bindings/safe errors, fail-closed behavior, response/event redaction.
    - Confirm api-edge tests cover: POST forwarding with body, GET list forwarding with query params, GET item forwarding, actor headers, bearer redaction, missing PROJECTS_WORKER 503, existing project routes intact.
    - Confirm policy-engine tests cover `environment.create` role matrix, project scope requirement, cross-org denial, wrong-project denial.
    - Inspect PR CI run `26431482114` with `gh` and cite actual rendered-plan and job-log evidence.
    - Confirm PR CI is green before merge. Do not merge while any check is pending/failing.
    - Confirm no `db-migrate`, Terraform, Supabase, AWS, S3, Secrets Manager, or unrelated infra apply jobs selected.

11. Live resource verification after merge
    - If PASS, inspect post-merge main CI logs.
    - Independently verify non-secret Cloudflare state for updated Workers.
    - Confirm stage/prod projects-worker remain private (`workers_dev: false`), and api-edge still binds `PROJECTS_WORKER` to same-environment projects-worker.

# Non-Goals

- No Task 0035 planning.
- No product-specific Git catalog or `specs-v2/**` work.
- No environment update/edit endpoint.
- No environment archive/delete endpoint.
- No project update/edit endpoint.
- No project restore/unarchive endpoint.
- No hard-delete behavior.
- No project role-assignment management.
- No project-scoped filtered list.
- No policy action changes beyond `environment.create`.
- No database migration or Terraform change.
- No unrelated cleanup.

# Constraints

- Trust code reality over stale docs.
- Authorization must be deny-by-default.
- Environment creation requires audit/event coverage.
- Environment routes must include explicit `orgId + projectId` scope; get includes `environmentId`.
- Never query or authorize environment data by `environmentId` alone.
- Stage/prod internal projects-worker must remain private.
- Do not log, report, or commit database passwords, connection strings, API keys, bearer tokens, SQL stack traces, or other secrets.
- Leave the local repo clean after verifier-created changes and merge protocol.

# Integration Notes

- Existing project create/archive handlers are reference for transactionally coupling source mutation with `events.appendEventWithAudit`.
- Existing project list is reference for cursor pagination and fail-closed membership/policy behavior.
- Existing api-edge project facade is reference for identity resolution and header forwarding.
- `@saas/db/projects.listEnvironmentsPaged` already filters active environments by `orgId + projectId`.
- Environment table has composite FK to `projects.projects (org_id, id)`, but handlers still explicitly reject archived parent projects.

# Acceptance Criteria

- PR #75 includes the task-required source, test, and report files.
- Local required checks pass.
- PR CI logs confirm expected plan and successful jobs.
- All environment API semantics, authorization boundaries, event/audit atomicity, api-edge forwarding, and bounded-context seams pass review and tests.
- Any verifier fixes are committed to PR #75 and CI is green afterward.
- If PASS, PR #75 is merged, local `main` is synced, post-merge CI/resource evidence is recorded, and the verifier report is written.
- If FAIL, PR #75 remains open with a concise blocker report.

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
gh pr checks 75
```

Also inspect PR CI run `26431482114` and any later reruns with `gh` so the report cites actual rendered-plan and job-log evidence.

If you add verifier fixes, rerun affected local checks and ensure PR CI is green after pushing.

# PR Creation Requirement

This is a verifier task for existing PR #75. Do not open a new PR. If fixes are needed, commit them to `codex/task-0034-environment-runtime-create-list-get`, push that branch, and wait for PR CI.