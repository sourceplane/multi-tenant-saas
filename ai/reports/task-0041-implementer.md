# Task 0041 — Implementer Report

## Summary

Split the web-console deployment into environment-specific Cloudflare Pages
projects (stage and prod) with environment-bound builds, updated CORS policy,
and an enhanced generic composition for environment-aware project naming.

## Files Changed

### Composition (generic enhancement)
- `stack-tectonic/compositions/cloudflare-pages-turbo/schema.yaml` — Added
  `environmentAwareProjectName` (boolean) and `environmentBuildVar` (string)
  optional parameters.
- `stack-tectonic/compositions/cloudflare-pages-turbo/jobs/cloudflare-pages-turbo-verify-deploy.yaml`
  — Build step exports `environmentBuildVar` before running buildCommand;
  provision/deploy steps compute effective project name with environment suffix;
  smoke step exports `ORUN_ENVIRONMENT` and `EFFECTIVE_PROJECT_NAME`.

### Web Console
- `apps/web-console/src/api.ts` — Added `DEPLOY_ENV` (from
  `import.meta.env.VITE_DEPLOY_ENV`), `IS_LOCKED` flag, and filtered `TARGETS`
  array that locks to a single environment when built with the env var.
- `apps/web-console/src/vite-env.d.ts` — Added `ImportMetaEnv` type declaration
  for `VITE_DEPLOY_ENV`.
- `apps/web-console/src/main.ts` — Target selector only rendered when
  `!IS_LOCKED && TARGETS.length > 1`; environment badge always visible.
- `apps/web-console/component.yaml` — Set `environmentAwareProjectName: true`,
  `environmentBuildVar: VITE_DEPLOY_ENV`; smokeCommand uses
  `$EFFECTIVE_PROJECT_NAME` and `$ORUN_ENVIRONMENT` shell vars.

### CORS
- `apps/api-edge/src/cors.ts` — Environment-aware origin allowlist: stage API
  allows stage console + previews; prod API allows prod console + previews;
  localhost allowed in all environments. Legacy `sourceplane-web-console.pages.dev`
  no longer in any allowlist.
- `tests/api-edge/src/cors.test.ts` — Full matrix covering: stage→stage
  (allowed), stage→prod (denied), prod→prod (allowed), prod→stage (denied),
  legacy origin (denied), localhost/127.0.0.1 (allowed), test/unknown env
  (fallback allows both).

### Specs
- `specs/components/12-web-console.md` — Added "Deployment Model" section
  documenting per-environment Pages projects and VITE_DEPLOY_ENV.
- `specs/components/01-edge-api.md` — Added "CORS Policy" section documenting
  environment-aware allowlist matrix.

## Checks Run

| Check | Result |
|-------|--------|
| `pnpm --filter @saas/web-console typecheck` | PASS |
| `pnpm --filter @saas/web-console lint` | PASS (21 pre-existing `no-explicit-any` warnings) |
| `pnpm --filter @saas/web-console build` | PASS |
| `VITE_DEPLOY_ENV=stage pnpm build` | PASS — "stage" injected, filter locks target |
| `VITE_DEPLOY_ENV=prod pnpm build` | PASS — "prod" injected, filter locks target |
| `pnpm --filter @saas/api-edge typecheck` | PASS |
| `pnpm --filter @saas/api-edge-tests test` | PASS (178 tests, 5 suites) |
| `orun validate --intent intent.yaml` | PASS |
| `orun plan --changed --intent intent.yaml` | PASS (7 components × 3 envs → 19 jobs) |
| `orun run --plan plan.json --dry-run --runner github-actions` | PASS (19 jobs green) |

## Preview/Browser Verification

- Stage-locked build (`VITE_DEPLOY_ENV=stage`): serves at localhost:4174, title
  "Sourceplane Console", environment badge shows "stage", no target selector
  rendered (conditional evaluates to false since `IS_LOCKED=true`).
- Prod-locked build (`VITE_DEPLOY_ENV=prod`): builds successfully, env var
  replaced at build time with "prod", TARGETS filtered to single prod entry.
- Desktop/mobile widths: header uses `flex-wrap: wrap` with responsive media
  query at 640px; target selector absent in locked builds eliminates width
  contention.

## Cloudflare/Orun Notes

- The composition's `environmentAwareProjectName` feature computes effective
  project name as `${projectName}-${environment.name}` in provision, deploy,
  and smoke steps. This is a generic enhancement usable by any
  `cloudflare-pages-turbo` consumer.
- The `environmentBuildVar` feature exports the named env var before the build
  command, enabling any Vite/esbuild/webpack app to receive the target
  environment at build time.
- The smoke step now always exports `ORUN_ENVIRONMENT` and
  `EFFECTIVE_PROJECT_NAME` so the `smokeCommand` parameter can reference them
  as shell variables.
- The actual Cloudflare Pages projects (`sourceplane-web-console-stage`,
  `sourceplane-web-console-prod`) will be created by the `ensure-pages-project`
  step on first deploy after merge.

## Assumptions

1. The Orun job template rendering context provides `.environment.name` as the
   current environment string (stage/prod/dev).
2. Orun renders Go templates in step `run` fields with access to
   `.parameters.*` and `.environment.*`.
3. The `ENVIRONMENT` variable in `api-edge` Env interface is set to "stage" or
   "prod" in the deployed Worker bindings (consistent with existing
   `wrangler.toml` configuration).
4. Discovery finds the single `apps/web-console/component.yaml` and runs it
   per-subscribed-environment. The `environmentAwareProjectName` suffix
   differentiates the Pages project per environment without needing separate
   component files.
5. Build-time `VITE_DEPLOY_ENV` replacement by Vite is sufficient to lock
   runtime target selection (dead code remains in bundle but never executes).

## Spec Proposals

- `specs/components/12-web-console.md` updated inline with deployment model.
- `specs/components/01-edge-api.md` updated inline with CORS policy table.

## Remaining Gaps

- Live verification of Pages URLs pending actual deployment after merge.
- The legacy `sourceplane-web-console.pages.dev` project is not deleted; it
  continues to exist but is no longer referenced as canonical.
- If `.environment.name` is not the correct template variable in Orun's context,
  the provision/deploy/smoke steps will need adjustment (verifier should confirm
  during CI run).

## PR Number

See below after push.
