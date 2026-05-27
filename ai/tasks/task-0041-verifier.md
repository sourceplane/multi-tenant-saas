# Task 0041 — Verifier

# Agent

Verifier

# Current Repo Context

Task 0040 is verified PASS and merged via PR #81 at `9740ca1`. The web console was deployed as a single `sourceplane-web-console.pages.dev` Pages project with a stage/prod target selector. PR #82 (`codex/task-0041-env-specific-web-consoles`) implements environment-specific console deployments per user direction.

The PR is OPEN, MERGEABLE, with all 20 CI checks passing (SUCCESS). The implementer report is committed to the PR branch.

# Objective

Verify that Task 0041's PR #82 correctly implements environment-specific web console deployments with proper CORS isolation between stage and prod environments, per the orchestrator standard and Task 0041 acceptance criteria.

# PR Boundary

Same as Implementer task — verify the following changes only:

1. Composition enhancement: `environmentAwareProjectName` and `environmentBuildVar` parameters in `cloudflare-pages-turbo` schema and job template
2. Web console changes: `DEPLOY_ENV`, `IS_LOCKED`, filtered `TARGETS` in `api.ts`; conditional target selector rendering in `main.ts`
3. CORS changes: Environment-aware origin allowlist in `api-edge/src/cors.ts` with stage and prod console origin sets
4. Spec updates: Deployment model in `specs/components/12-web-console.md`, CORS policy in `specs/components/01-edge-api.md`

# Read First

- `ai/tasks/task-0041.md` — Implementer task prompt (scope, acceptance criteria, constraints)
- `ai/reports/task-0041-implementer.md` — What was implemented and validated
- `specs/components/12-web-console.md` — Per-environment deployment model (lines 96-111)
- `specs/components/01-edge-api.md` — CORS policy matrix (lines 123-135)
- `apps/web-console/component.yaml` — Environment-aware configuration (lines 39-45)
- `stack-tectonic/compositions/cloudflare-pages-turbo/schema.yaml` — New parameters (lines 72-87)
- PR #82 diff — All changed files listed above

# Required Outcomes

- [ ] Verify PR #82 corresponds exactly to Task 0041 scope
- [ ] Confirm all acceptance criteria from Implementer task are met
- [ ] Verify CORS tests cover the full origin/environment matrix
- [ ] Run Orun validation and plan commands to confirm component discovery works
- [ ] Check that staging/prod console URLs are correctly formed in the composition
- [ ] Verify no cross-environment coupling or security issues
- [ ] Confirm production-grade basics (no plaintext tokens in logs, secrets safe)

# Non-Goals

- No verification of live Pages URLs (will be verified post-merge via main CI)
- No verification of identity security-event implementation (deferred)
- No changes to backend domain routes or persistence
- No verification of dev Supabase (unprovisioned)
- No custom domain or DNS verification

# Constraints

- The verifier must NOT merge the PR until PR CI is fully green (all checks pass)
- CORS must be environment-aware; no wildcard origins allowed
- No secrets should appear in any source files or CI logs
- The implementer report must be verified as committed to the PR branch

# Acceptance Criteria

✅ PR #82 is verified and merged only after all CI checks pass

✅ Component descriptor (`apps/web-console/component.yaml`) follows golden path pattern with `environmentAwareProjectName: true` and `environmentBuildVar: VITE_DEPLOY_ENV`

✅ Composition schema (`stack-tectonic/compositions/cloudflare-pages-turbo/schema.yaml`) includes the new optional parameters correctly

✅ Job template (`cloudflare-pages-turbo-verify-deploy.yaml`) correctly exports `ORUN_ENVIRONMENT` and `EFFECTIVE_PROJECT_NAME` shell variables

✅ `apps/web-console/src/api.ts` uses `VITE_DEPLOY_ENV` to filter targets and `IS_LOCKED` flag is true when single target is selected

✅ `apps/web-console/src/main.ts` conditionally renders target selector only when `!IS_LOCKED && TARGETS.length > 1`

✅ `apps/api-edge/src/cors.ts` implements strict environment-aware origin allowlist:
   - Stage API allows: stage console, stage previews, localhost
   - Prod API allows: prod console, prod previews, localhost
   - Legacy `sourceplane-web-console.pages.dev` is NOT in any allowlist

✅ `tests/api-edge/src/cors.test.ts` covers full matrix:
   - Stage→stage (allowed)
   - Stage→prod (denied)
   - Prod→prod (allowed)
   - Prod→stage (denied)
   - Legacy origin (denied in all environments)
   - Localhost/127.0.0.1 (allowed in all)

✅ `orun validate --intent intent.yaml` passes without errors

✅ `orun plan --changed --intent intent.yaml --output plan.json` discovers web-console component correctly for stage and prod

✅ `orun run --plan plan.json --dry-run --runner github-actions` completes successfully

✅ No plaintext tokens or secrets in any source files or commit messages

✅ Spec updates accurately reflect the environment-specific deployment model and CORS policy

# Verification

The Verifier must:

1. Run local validation commands (`orun validate`, `orun plan --changed`, `orun run --dry-run`)
2. Inspect PR CI logs to confirm expected commands ran (not just status summaries)
3. Verify the composition schema and job template changes are correct
4. Confirm web-console environment-locking logic works correctly
5. Check that the implementer report is committed to the PR branch
6. Merge the PR, sync `main` to `origin/main`, and clean up the branch
7. Record the verification outcome in the verifier report

# PR Creation Requirement

The Implementer has already created the PR. Your job is to verify it. If verification fails, leave the PR open with clear blockers.

# When Done Report

Write `/ai/reports/task-0041-verifier.md` with:

- Result: PASS or FAIL (with clear justification)
- Checks: List all validation steps performed
- Issues: Any problems found (even if non-blocking)
- CI Log Review: PR CI evidence (run IDs, job results)
- Live Resource Evidence: Post-merge verification notes (will be recorded after main CI runs)
- Secret Handling Review: Confirmation of no exposure
- Risk Notes: Residual risks after verification
- Recommended Next Move: What should happen after verification