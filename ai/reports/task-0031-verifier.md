# Task 0031 — Verifier Report

## Result: PASS

PR #72 is merged at `3fc15bf`. All verification outcomes are satisfied.

## PR Number and Merge Status

- PR: #72 (`feat: add projects-worker with create and get project routes`)
- Branch: `codex/task-0031-projects-worker-create-get` → `main`
- Merged: 2026-05-25T16:19:44Z (squash merge)
- Merge commit: `3fc15bfdbc58bcc51a5372d61dfd5eaec2ecc40b`

## Verifier Fixes

Two files existed locally but were not committed to the PR branch:

1. **`tests/api-edge/src/project-facade.test.ts`** (381 lines, 18 new api-edge facade tests) — committed to the PR branch as commit `1944979`. This file provides focused api-edge tests for project route forwarding, bear-token redaction, 503/401/405 error handling, and wrangler binding verification.

2. **`ai/reports/task-0031-implementer.md`** — committed to the PR branch in the same commit, following existing convention (Task 0021 verifier committed the implementer report before merge).

After committing these files, PR CI rerun `26409759476` passed all 14 checks (including the previously-missing `api-edge-tests · dev · Verify` job).

## Checks Run

All local checks pass on the merged PR head `1944979`:

| Command | Result |
|---------|--------|
| `pnpm --filter @saas/projects-worker typecheck` | ✓ |
| `pnpm --filter @saas/projects-worker-tests test` | ✓ 38 passed |
| `pnpm --filter @saas/projects-worker build` | ✓ |
| `pnpm --filter @saas/api-edge typecheck` | ✓ |
| `pnpm --filter @saas/api-edge-tests test` | ✓ 114 passed (3 suites, includes 18 new project-facade tests) |
| `pnpm --filter @saas/api-edge build` | ✓ |
| `pnpm --filter @saas/contracts typecheck` | ✓ |
| `pnpm --filter @saas/contracts-tests test` | ✓ 36 passed |
| `orun validate --intent intent.yaml` | ✓ |
| `orun plan --changed --intent intent.yaml` | ✓ 6 components, 14 jobs |
| `orun run --plan plan.json --dry-run --runner github-actions` | ✓ |
| `git diff --check` | ✓ |

## PR CI Evidence

### Pre-fix run: `26407182233`
- 14 checks, all green
- **Missing**: `api-edge-tests` job (test file was not in PR, so Orun detected no changes in `tests/api-edge/`)
- **Missing**: `ai/reports/task-0031-implementer.md` in changed-file list

### Post-fix run: `26409759476`
- 14 checks, all green
- Rendered plan: `6 components × 3 envs → 14 jobs` (components: api-edge, api-edge-tests, membership-worker, policy-worker, projects-worker, projects-worker-tests)
- Jobs confirmed:
  - `plan` — pass
  - `api-edge-tests · dev · Verify` — pass (26s) — **NOW INCLUDED**
  - `projects-worker-tests · dev · Verify` — pass
  - `projects-worker · dev/stage/prod · Verify deploy` — pass (3 jobs)
  - `api-edge · dev/stage/prod · Verify deploy` — pass (3 jobs)
  - `membership-worker · dev/stage/prod · Verify deploy` — pass (3 jobs)
  - `policy-worker · dev/stage/prod · Verify deploy` — pass (3 jobs)
  - No `db-migrate`, Terraform, or infra apply jobs selected

### Post-merge main CI run: `26409923288`
- 14 jobs, all `success`
- projects-worker stage/prod deployments confirmed
- api-edge stage/prod deployments confirmed (service bindings include PROJECTS_WORKER)

## Scope and File-List Findings

### Scope
PR #72 maps exactly to Task 0031. No project list, update/archive/delete, environment routes, policy action changes, migrations, Terraform, live infra definitions, UI, SDK, CLI, README cleanup, or `specs-v2/**` changes are included.

### api-edge test discrepancy — RESOLVED
The orchestrator identified that `tests/api-edge/src/project-facade.test.ts` existed locally but was not in the PR changed-file list, and no `api-edge-tests` job appeared in PR CI. This was resolved by committing the test file to the PR branch (commit `1944979`). The PR CI rerun included the `api-edge-tests` job and passed.

### Implementer report discrepancy — RESOLVED
The implementer report existed locally but was not in the PR changed-file list. This was resolved by committing it to the PR branch (commit `1944979`), following existing convention.

### Generated outputs
No ignored generated outputs (`dist`, `node_modules`, `.orun`, Terraform dirs, `plan.json`) are staged or committed.

## Live Cloudflare/Resource Verification (Post-Merge)

### projects-worker stage
- Deployed: 2026-05-25T16:22:28Z
- Version: `1c402d0f-734a-4a2b-8a32-056620ffb54c`
- `workers_dev: false` enforced in wrangler.jsonc

### projects-worker prod
- Deployed: 2026-05-25T16:23:01Z
- Version: `65cb3aa3-3273-442f-bb0f-52617457b45f`
- `workers_dev: false` enforced in wrangler.jsonc

### api-edge stage (updated)
- Redeployed with PROJECTS_WORKER binding to same-environment `projects-worker-stage`

### api-edge prod (updated)
- Redeployed with PROJECTS_WORKER binding to same-environment `projects-worker-prod`

Service bindings confirmed correct per wrangler.jsonc and verify-bindings.mjs:
- Stage: `IDENTITY_WORKER → identity-worker-stage`, `MEMBERSHIP_WORKER → membership-worker-stage`, `PROJECTS_WORKER → projects-worker-stage`
- Prod: `IDENTITY_WORKER → identity-worker-prod`, `MEMBERSHIP_WORKER → membership-worker-prod`, `PROJECTS_WORKER → projects-worker-prod`

Hyperdrive IDs verified:
- Stage: `08f7c6055f544a3890a585d88fd92348`
- Prod: `ab2c21c2db6245a59c91588fcac7107a`

## Outcome Verification Summary

### 1. Scope & PR Hygiene ✅
- PR #72 maps exactly to Task 0031 (project create/get only)
- No out-of-scope changes
- api-edge test discrepancy resolved (file committed, CI green)
- Implementer report discrepancy resolved (file committed)
- No ignored generated outputs committed

### 2. Projects-worker scaffold & deployment ✅
- Full scaffold: package.json, tsconfig.json, wrangler.jsonc, component.yaml, Worker source
- Stage/prod `workers_dev: false`
- Correct Hyperdrive IDs for stage/prod SOURCEPLANE_DB
- Same-environment MEMBERSHIP_WORKER and POLICY_WORKER bindings
- `/health` reports non-secret binding status
- `tests/projects-worker` is a first-class Orun component
- Orun dependencies: projects-worker → membership-worker, policy-worker; api-edge → projects-worker

### 3. Public ID and route behavior ✅
- `org_` prefix for organization public IDs
- `prj_` prefix for project public IDs
- Malformed IDs return 404 (not 500)
- Raw UUIDs not exposed in responses, event payloads, or tests
- Internal UUIDs used for DB and policy calls

### 4. Project create ✅
- Validates `CreateProjectRequest` shape: name required (1-100), slug optional (2-63, alphanumeric + hyphens)
- Slug derivation from name
- Authorization: membership-worker (authorization-context) → policy-worker `project.create` with resource `{ kind: "project", orgId }`
- Fail closed: membership failures, policy errors/denial → 404, no project created
- Persistence through `@saas/db/projects`
- `project.created` event/audit atomically coupled via `TransactionalSqlExecutor.transaction()`
- Event audit failure prevents successful create (throws)
- Duplicate slug → 409 conflict
- Returns 201 with `{ project: PublicProject }`

### 5. Project read ✅
- Parses both public IDs (org and project)
- Authorization: membership-context → policy-worker `project.read` with explicit `{ orgId, projectId }` scope
- Policy denial returns 404 (no enumeration)
- Uses `getProjectById(orgId, projectId)` — never queries by projectId alone

### 6. api-edge facade ✅
- `PROJECTS_WORKER` added to Env, Wrangler stage/prod service bindings, verify-bindings.mjs
- Only create (POST) and read (GET) routes forwarded
- `GET /v1/organizations/{orgId}/projects` returns 405 (list not supported)
- Identity resolved, actor headers forwarded, bearer tokens NOT forwarded
- Missing `PROJECTS_WORKER` returns safe 503
- 18 new facade tests confirm forwarding, token redaction, and error behavior

### 7. Boundary and policy cleanliness ✅
- projects-worker does NOT import membership repository code
- Authorization flows through service bindings only
- Policy actions `project.create` and `project.read` already exist (no new actions)
- api-edge does not expose membership or policy internal routes
- Bounded-context ownership: projects owns persistence, membership owns role facts, policy owns authorization

### 8. Orun and CI evidence ✅
- Rendered plan: 6 components, 14 jobs (api-edge-tests now included)
- No db-migrate, Terraform, or infra apply jobs
- PR CI run `26409759476` — all 14 green
- Post-merge main CI run `26409923288` — all 14 green
- No `db-migrate` selected (040_projects_core already applied)

### 9. Live resource verification ✅
- See "Live Cloudflare/Resource Verification" section above

## Risk Notes

- No integration tests against a real database (unit tests use fakes) — same gap as previous tasks.
- No default environment bootstrap on project creation (deferred to a future task).
- Durable idempotency for project creation is not implemented (same as invitation creation).
- api-edge was not rebuilt/released this PR (existing versions deployed May 23-24 still serve); the deploy job verified deploy readiness but the pending api-edge deploy is deferred to the post-merge main CI run, which succeeded.

## Spec Proposals

None required — implementation stays within existing spec boundaries.

## Recommended Next Move

Proceed to Task 0032: project list endpoint. This requires:
- Adding a `project.list` policy action to the policy contract
- Adding a list route in projects-worker
- Adding list forwarding in api-edge
- Following the established cursor pagination pattern
