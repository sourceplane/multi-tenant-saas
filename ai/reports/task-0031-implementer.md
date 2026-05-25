# Task 0031 — Implementer Report

## Summary

Scaffolded `apps/projects-worker` as a new private Cloudflare Worker and wired
project create/read through `api-edge`. Authorization flows:
projects-worker → membership-worker (authorization-context seam) →
policy-worker (authorize). Project creation emits a `project.created`
event/audit atomically with the project INSERT.

## Files Changed

### New files (apps/projects-worker)

- `apps/projects-worker/package.json`
- `apps/projects-worker/tsconfig.json`
- `apps/projects-worker/wrangler.jsonc`
- `apps/projects-worker/component.yaml`
- `apps/projects-worker/src/index.ts`
- `apps/projects-worker/src/env.ts`
- `apps/projects-worker/src/router.ts`
- `apps/projects-worker/src/http.ts`
- `apps/projects-worker/src/ids.ts`
- `apps/projects-worker/src/membership-client.ts`
- `apps/projects-worker/src/policy-client.ts`
- `apps/projects-worker/src/handlers/health.ts`
- `apps/projects-worker/src/handlers/create-project.ts`
- `apps/projects-worker/src/handlers/get-project.ts`

### New files (tests/projects-worker)

- `tests/projects-worker/package.json`
- `tests/projects-worker/tsconfig.json`
- `tests/projects-worker/component.yaml`
- `tests/projects-worker/src/projects-worker.test.ts`

### New files (api-edge)

- `apps/api-edge/src/project-facade.ts`

### Modified files

- `apps/api-edge/src/env.ts` — added `PROJECTS_WORKER?: Fetcher`
- `apps/api-edge/src/index.ts` — imported and wired project facade before org routes
- `apps/api-edge/wrangler.jsonc` — added PROJECTS_WORKER service bindings (stage/prod)
- `apps/api-edge/scripts/verify-bindings.mjs` — added PROJECTS_WORKER expectations
- `apps/api-edge/component.yaml` — added `dependsOn: projects-worker`
- `pnpm-lock.yaml` — updated for new workspace packages

### New test file (api-edge)

- `tests/api-edge/src/project-facade.test.ts`

## Checks Run

| Command | Result |
|---------|--------|
| `pnpm --filter @saas/projects-worker typecheck` | ✓ |
| `pnpm --filter @saas/projects-worker-tests test` | ✓ 38 passed |
| `pnpm --filter @saas/projects-worker build` | ✓ |
| `pnpm --filter @saas/api-edge typecheck` | ✓ |
| `pnpm --filter @saas/api-edge-tests test` | ✓ 114 passed |
| `pnpm --filter @saas/api-edge build` | ✓ |
| `pnpm --filter @saas/contracts typecheck` | ✓ |
| `pnpm --filter @saas/contracts-tests test` | ✓ 36 passed |
| `orun validate --intent intent.yaml` | ✓ |
| `orun plan --changed --intent intent.yaml` | ✓ 6 components, 14 jobs |
| `orun run --plan plan.json --dry-run` | ✓ |
| `git diff --check` | ✓ |

## Assumptions

1. `project.create` and `project.read` actions are already defined in the
   policy engine from previous tasks (they are listed in
   `@saas/contracts/policy` ORGANIZATION_ACTIONS).
2. The `040_projects_core` migration is already applied (verified in task 0028/0029).
3. Public IDs use `prj_` + 32-hex-char format (UUID without dashes).
4. Slug derivation rules match organization creation: lowercase alphanumeric +
   hyphens, 2-63 chars, starts/ends alphanumeric.
5. The `TransactionalSqlExecutor.transaction()` provides rollback semantics if
   the event append throws.

## Spec Proposals

None required — this implementation stays within existing spec boundaries.

## Remaining Gaps

- No integration test against a real database (unit tests use fakes).
- Smoke test command is a placeholder echo; needs a live route test post-deploy.
- No rate limiting on project creation.
- No default environment bootstrap on project creation (deferred to a future task).

## Live Resource Notes

No live Cloudflare resources were created before merge. The `projects-worker`
Worker will be deployed to stage and prod on the first `github-push-main`
trigger after merge, per the component.yaml profile rules.

## Next Task Dependencies

- Project list endpoint (`GET /v1/organizations/{orgId}/projects`) requires a
  `project.list` policy action and new route.
- Environment routes depend on this worker existing.
- Project update/archive/delete depend on this worker.

## PR Number

72
