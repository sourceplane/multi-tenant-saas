# Task 0034 — Verifier Report

## Result

**PASS** -- PR #75 is merged.

## Summary

Verified that PR #75 safely adds the first public environment runtime slice through api-edge and projects-worker, including:

- `env_` public ID helpers (`environmentPublicId`, `parseEnvironmentPublicId`)
- Project-scoped `environment.create` policy action for create authorization
- `environment.created` event/audit written atomically with environment creation
- Parent project existence and active state verification before all environment operations
- Cursor-paginated environment list using existing `environment.read`
- Environment get using `environment.read` with explicit environment ID

## Verifier Fix Applied

- **Missing implementer report** (commit `83831f3`): The implementer report `ai/reports/task-0034-implementer.md` was created locally by the implementer but not committed to the PR branch. Committed and pushed; CI re-ran green.

## Scope and PR Hygiene (Outcome 1)

- PR #75 maps exactly to Task 0034: environment create/list/get only.
- No environment update/edit, archive/delete, project update/restore, role-assignment management, filtered lists, extra policy actions (beyond `environment.create`), migrations, Terraform, infra definitions, UI, SDK, CLI, or `specs-v2/**` changes.
- 12 source/test files changed; no ignored generated outputs staged.

## Environment Public ID Handling (Outcome 2)

- `environmentPublicId()` and `parseEnvironmentPublicId()` added in `apps/projects-worker/src/ids.ts`, matching `env_` + UUID hex pattern.
- Malformed `org_`, `prj_`, and `env_` IDs return 404 at the route boundary.

## Environment Create Behavior (Outcome 3)

- `POST /v1/organizations/{orgId}/projects/{projectId}/environments` routed in projects-worker router.
- Both `org_` and `prj_` parsed; malformed IDs return 404.
- Missing actor headers return 401.
- JSON body validation: `name` required (1-100 chars), `slug` optional with project-like rules.
- Parent project existence verified; missing or archived parent returns 404.
- Membership-worker authorization-context called with actor subject and raw org UUID.
- Policy-worker authorize uses action `environment.create` with explicit project resource `{ kind: "environment", orgId, projectId }`.
- Role semantics: org `owner`/`admin`/`builder` and `project_admin`/`project_builder` may create; `viewer`/`billing_admin`/`project_viewer` may not; cross-org/wrong-project denials.
- Slug conflicts map to 409; repository/internal failures map to 503.
- Missing `SOURCEPLANE_DB`, `MEMBERSHIP_WORKER`, or `POLICY_WORKER` returns safe 503.

## Environment List Behavior (Outcome 4)

- `GET /v1/organizations/{orgId}/projects/{projectId}/environments` uses explicit project scope.
- Membership-worker authorization-context called before policy-worker.
- Authorization uses `environment.read` with resource `{ kind: "environment", orgId, projectId }`.
- Cursor pagination: default 50, max 100, opaque cursor in `meta.cursor`.
- Uses `listEnvironmentsPaged(orgId, projectId, pageParams)`.
- Missing/archived parent project returns 404.
- Returns `{ data: { environments: PublicEnvironment[] } }` with public IDs.

## Environment Get Behavior (Outcome 5)

- `GET /v1/organizations/{orgId}/projects/{projectId}/environments/{environmentId}` includes all three IDs.
- Authorization uses `environment.read` with resource containing `environmentId`.
- Uses `getEnvironmentById(orgId, projectId, environmentId)`.
- Policy denial and repository not-found return 404.
- Missing parent project returns 404.

## Event/Audit Atomicity (Outcome 6)

- Environment insert and `environment.created` event/audit append share the transaction-capable SQL executor.
- Event/audit append failure prevents successful create commit (throws Error).
- Event type `environment.created`, source `projects-worker`, category `projects`.
- Public-facing payloads use public IDs (`org_`, `prj_`, `env_`) without raw UUIDs.
- No secrets, bearer tokens, SQL, stack traces, or connection details in payloads.

## Api-Edge Facade (Outcome 7)

- Three environment routes forward to `PROJECTS_WORKER` after identity resolution.
- Query params preserved on list route.
- Actor headers, request ID, traceparent, idempotency-key forwarded correctly.
- Bearer token not forwarded.
- POST body forwarded only for create.
- Existing project routes remain covered.
- Missing `PROJECTS_WORKER` returns safe 503.

## Policy Semantics (Outcome 8)

- `environment.create` is project-scoped (in `PROJECT_SCOPED_ACTIONS`).
- `environment.read` authorization uses explicit project scope.
- No `environment.list` action added.
- Role matrix matches spec: org owner/admin/builder and project_admin/project_builder may create; viewer/billing_admin/project_viewer denied.

## Bounded-Context Seams (Outcome 9)

- projects-worker does not import membership repository code; uses membership-client and policy-client.
- api-edge does not expose membership or policy internal routes.

## Tests and CI Evidence (Outcome 10)

### Projects-worker tests (126 tests)
- Create success with authorization-context + policy allow
- `environment.create` policy action and explicit project resource shape
- Parent project not found and archived parent → 404
- Duplicate slug conflict → 409
- Event/audit append failure prevents successful create → 503
- List success with cursor pagination, limit bounds, invalid cursor → 422, next cursor
- Get success
- Malformed public IDs → 404
- Missing actor → 401
- Unsupported methods → 405
- Missing bindings → 503
- Membership-context failure → 404
- Policy denial and malformed envelope → 404
- Repository internal failures → 503
- Responses/event payloads do not expose raw UUIDs

### Api-edge tests (130 tests)
- POST environment collection forwards body
- GET list forwards query params
- GET item forwards correctly
- Actor headers forwarded; bearer token not forwarded
- Missing `PROJECTS_WORKER` → 503
- Existing project routes intact
- Method restrictions enforce 405

### Policy-engine tests (102 tests)
- `environment.create` role matrix: owner/admin/builder allow; viewer/billing_admin deny
- Project role matrix: project_admin/project_builder allow; project_viewer deny
- Project scope requirement: denies without projectId
- Cross-org denial, wrong-project denial

### Contracts tests (40 tests)
- `environment.create` and `environment.read` verified as known actions

### PR CI run 26431482114
- **22/22 checks all SUCCESS**
- Plan job: rendered plan selected expected components (api-edge, contracts, policy-engine, projects-worker, test suites)
- No db-migrate, Terraform, Supabase, AWS, S3, Secrets Manager, or infra apply jobs selected
- All verify/deploy jobs passed across dev/stage/prod environments

### Post-fix CI run 26432668853
- **All 22 checks SUCCESS** after verifier commit

## Live Resource Verification (Outcome 11)

- Post-merge CI run `26432854069` is queued on main (sha `7e4dc5e`).
- Stage/prod projects-worker remain private (`workers_dev: false`).
- Api-edge stage/prod bind `PROJECTS_WORKER` to same-environment projects-worker.
- No Terraform, migration, or infrastructure changes were part of this PR.

## Local Checks

| Check | Result |
|-------|--------|
| `pnpm --filter @saas/projects-worker typecheck` | pass |
| `pnpm --filter @saas/projects-worker-tests test` | 126 tests pass |
| `pnpm --filter @saas/projects-worker build` | pass (161.71 KiB) |
| `pnpm --filter @saas/api-edge typecheck` | pass |
| `pnpm --filter @saas/api-edge-tests test` | 130 tests pass |
| `pnpm --filter @saas/api-edge build` | pass (120.42 KiB) |
| `pnpm --filter @saas/contracts typecheck` | pass |
| `pnpm --filter @saas/contracts-tests test` | 40 tests pass |
| `pnpm --filter @saas/policy-engine typecheck` | pass |
| `pnpm --filter @saas/policy-engine-tests test` | 102 tests pass |
| `orun validate` | pass |
| `git diff --check` | clean |

## Merge

PR #75 squash-merged at `7e4dc5e` into `main`.
