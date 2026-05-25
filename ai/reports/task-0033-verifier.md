# Task 0033 – Verifier Report

## Result: PASS

## Summary

PR #74 (`feat: add project archive endpoint with project.delete policy action`) from `codex/task-0033-project-archive-route` to `main` adds `DELETE /v1/organizations/{orgId}/projects/{projectId}` through projects-worker and api-edge. The endpoint soft-archives the project (never hard-deletes) and writes a `project.archived` event/audit entry atomically with the archive mutation via `TransactionalSqlExecutor`.

Verifier commit `fe4b427` added the missing implementer report `ai/reports/task-0033-implementer.md` to the PR branch, following the existing convention from Tasks 0031/0032.

PR #74 was merged by squash (`9666308`). Post-merge main CI run `26413213117` passed all 15/15 jobs.

## Files Changed (PR #74)

| File | Change |
|------|--------|
| `apps/projects-worker/src/handlers/archive-project.ts` | Added (134 lines) - new archive handler |
| `apps/projects-worker/src/router.ts` | Modified (+8 lines) - DELETE route on project item |
| `apps/api-edge/src/project-facade.ts` | Modified (+1, -1) - allow DELETE method on project item |
| `tests/projects-worker/src/projects-worker.test.ts` | Modified (+214, -1) - 17 new archive tests |
| `tests/api-edge/src/project-facade.test.ts` | Modified (+92 lines) - 4 new DELETE forwarding tests |
| `ai/reports/task-0033-implementer.md` | Added (75 lines) - verifier commit |

## Checks Run

| Check | Result |
|-------|--------|
| `pnpm --filter @saas/projects-worker typecheck` | ✓ |
| `pnpm --filter @saas/projects-worker build` | ✓ |
| `pnpm --filter @saas/projects-worker-tests test` | 75 pass (56 existing + 17 archive) |
| `pnpm --filter @saas/api-edge typecheck` | ✓ |
| `pnpm --filter @saas/api-edge build` | ✓ |
| `pnpm --filter @saas/api-edge-tests test` | 119 pass |
| `pnpm --filter @saas/contracts typecheck` | ✓ |
| `pnpm --filter @saas/contracts-tests test` | 38 pass |
| `pnpm --filter @saas/policy-engine-tests test` | 90 pass (project.delete semantics verified) |
| `git diff --check` | ✓ |

## Required Outcomes Verification

### 1. Scope and PR Hygiene ✅

- PR #74 maps exactly to Task 0033: project archival via `DELETE /v1/organizations/{orgId}/projects/{projectId}`.
- No project update/edit, restore/unarchive, hard delete, environment routes, role-assignment management, project-scoped filtered list, policy action changes, migrations, Terraform, UI, SDK, CLI, README, or `specs-v2/**` changes.
- Implementer report discrepancy resolved: verifier commit `fe4b427` added `ai/reports/task-0033-implementer.md` to the PR branch (following Tasks 0031/0032 convention).
- No ignored generated outputs (`dist`, `node_modules`, `.orun`, `plan.json`) are staged or committed.

### 2. projects-worker Archive Behavior ✅

- `DELETE /v1/organizations/{orgId}/projects/{projectId}` is routed in `router.ts` lines 84-89.
- Both public IDs parsed (`org_` via `parseOrgPublicId`, `prj_` via `parseProjectPublicId`); malformed IDs return 404.
- Missing actor headers (`x-actor-subject-id`/`x-actor-subject-type`) return 401.
- Endpoint does not accept or depend on a request body (DELETE body never forwarded from api-edge, no body parsing in archive handler).
- Missing `SOURCEPLANE_DB`, `MEMBERSHIP_WORKER`, or `POLICY_WORKER` returns 503.
- Membership-worker authorization-context called with actor subject and raw org UUID.
- Policy-worker authorize called with action `project.delete` and explicit project resource `{ kind: "project", id: projectUuid, orgId, projectId }`.
- Policy denial, membership/policy fetch failures, and malformed envelopes fail closed with 404 (no internal detail leaks).
- Uses `archiveProject(orgId, projectId, archivedAt)` — soft archive, no hard-delete path.
- Repository `not_found` maps to 404; repository internal errors map to 503 with safe message.
- Response is standard success envelope containing `{ project: PublicProject }` with public IDs and `status: "archived"`.
- Existing create, list, and get routes remain intact. `listProjectsPaged` continues returning active projects only.

### 3. Event/Audit Atomicity ✅

- Archive mutation and `project.archived` event/audit append share the transaction-capable `executor.transaction(...)` SQL executor path in production code (lines 114-118 of `archive-project.ts`).
- Both `projectsRepo` and `eventsRepo` are constructed from the same `txExecutor` inside the transaction callback.
- Event append failure throws inside the callback (line 104), triggering `sql.begin` rollback — prevents successful archive commit.
- Event type is `project.archived`, source is `projects-worker`, audit category is `projects`.
- Public-facing event payloads use `projectPublicId()` and `orgPublicId()` (prefixed public IDs).
- Audit description `Archived project "name"` does not expose UUIDs or secrets.
- Database scope columns (`orgId`, `projectId`) use raw UUIDs as required by events schema.
- No secrets, bearer tokens, SQL, stack traces, or connection details in payloads or audit descriptions.

### 4. api-edge Facade ✅

- `DELETE /v1/organizations/{orgId}/projects/{projectId}` forwards to `PROJECTS_WORKER` after identity resolution.
- Actor headers (`x-actor-subject-id`, `x-actor-subject-type`, `x-actor-email`), request ID, traceparent, and idempotency-key are forwarded correctly.
- Bearer tokens are not forwarded to projects-worker (only actor headers set on downstream request).
- DELETE request bodies are not forwarded (only POST has `init.body = request.body`).
- Existing POST create, GET list, and GET item behavior remains intact (verified in tests).
- No project update, restore, hard delete, or environment route exposed.
- Missing `PROJECTS_WORKER` returns 503.

### 5. Policy and Bounded-Context Seams ✅

- No policy action added or renamed. Uses existing `project.delete` in policy engine.
- `project.delete` semantics preserved: owner/admin org roles and matching `project_admin` may archive; builder, viewer, billing_admin, project_builder, project_viewer do not get archive permission (verified in policy engine tests — 90 tests pass).
- projects-worker does not import membership repository code or query `membership.*` storage; uses `fetchAuthorizationContext` from `membership-client.ts`.
- api-edge does not expose membership or policy internal routes.

### 6. Tests and CI Evidence ✅

**projects-worker tests** (75 total, 17 archive-specific):
- Archive success with authorization-context + policy allow
- `project.delete` policy action and explicit resource shape (`kind: "project"`, `id`, `orgId`, `projectId`)
- Malformed public IDs via router (404 for bad org and bad project IDs)
- Missing actor via router (401 for DELETE)
- Missing bindings (503 for missing DB, membership, policy)
- Membership-context failure/malformed envelope fail closed (404)
- Policy denial/policy fetch throw/malformed envelope fail closed (404)
- Repository not-found maps to 404
- Repository internal failure maps to 503
- Event append failure prevents successful archive (503)
- Response/event payload/audit description do not expose raw UUIDs or secrets

**api-edge tests** (119 total, 4 new DELETE-specific):
- DELETE forwards to PROJECTS_WORKER after identity resolution
- Actor headers forwarded
- Bearer token not forwarded
- Missing PROJECTS_WORKER returns 503

**Policy-engine tests** (90 total):
- All existing `project.delete` role semantics covered

**CI Evidence:**
- Original PR CI run `26412635496`: 15/15 checks SUCCESS (before verifier commit)
- Post-verifier-fix PR CI run `26413053582`: 15/15 checks SUCCESS (after implementer report added)
- Plan job output: `6 components × 3 envs → 14 jobs` — api-edge, api-edge-tests, membership-worker, policy-worker, projects-worker, projects-worker-tests
- No `db-migrate`, Terraform, Supabase, AWS, or infra apply jobs selected
- All job logs confirm expected verify-deploy and test jobs ran successfully

### 7. Live Resource Verification (Post-Merge) ✅

- Post-merge main CI run `26413213117`: 15/15 jobs all SUCCESS
- Deploy jobs for projects-worker (stage/prod), api-edge (dev/stage/prod), membership-worker (dev/stage/prod), policy-worker (dev/stage/prod)
- No db-migrate, Terraform, or infra apply jobs selected
- Stage/prod Workers remain private via existing `workers_dev: false` configuration
- api-edge maintains `PROJECTS_WORKER` service bindings to same-environment projects-worker

## Issues Found

None. All checks pass without blockers.

## Risk Notes

- Archived projects are still visible via `getProjectById` (the GET item route does not filter by status). This matches the existing behavior documented in the implementer report as an acceptable gap — the task scope was explicitly bounded to the DELETE endpoint only.
- The `project.archived` event wiring uses the same `TransactionalSqlExecutor` pattern verified in Tasks 0031 and 0024/0026. Code path inspection confirms both repositories share the transaction-bound executor.

## Spec Proposals

None required.

## Recommended Next Move

The project archival route is now live on main. Next tasks may include:
- Project update/edit endpoint (if planned)
- Project restore/unarchive endpoint
- Environment routes through projects-worker

## Repository State After Merge

| Attribute | Value |
|-----------|-------|
| **Branch** | main |
| **Commit** | `9666308` (squash merge of PR #74) |
| **Post-merge CI run** | `26413213117` (15/15 jobs, all green) |
| **Feature branch** | `codex/task-0033-project-archive-route` (deleted) |
| **Repo health** | 🟢 Green |
| **Tasks completed** | 0001–0033 (33 total) |
| **Next** | Task 0034 |