# Task 0056.1

Agent: Verifier

## Current Repo Context

- Task 0055 verified PASS and merged via PR #98. The config persistence foundation is live on main: `config.settings`, `config.feature_flags`, and `config.secret_metadata` plus the typed `@saas/db/config` repository.
- Task 0056 Implementer opened PR #99 (`impl/task-0056-config-worker-read-api`) to add the first read-only config runtime/API surface.
- PR #99 current head is `9de926b` (`feat(config-worker): add read-only config API surface`). It adds `apps/config-worker`, read-only config contracts, policy actions, api-edge forwarding, and focused tests.
- PR CI run `26567374841` was still in progress when this verifier prompt was first scoped; a later orchestrator re-check showed it completed successfully (27/27 jobs green). The verifier must still inspect CI logs before merge.
- Important orchestration caveat: the local checkout contains untracked `ai/` carryover files, including `ai/tasks/task-0056.md` and `ai/reports/task-0056-implementer.md`. PR #99's changed-file list did not include the implementer report at prompt-scoping time. The verifier must confirm whether the implementer report and task prompt are committed to the PR branch and, if missing, commit the required report/prompt artifacts to the PR branch before final CI/merge.

## Objective

Verify PR #99 against Task 0056, the specs, and `agents/orchestrator.md` Verifier Standard sections 349-392. If verification passes and all CI checks pass, merge PR #99, sync local `main`, and leave the repository clean. If verification fails, leave PR #99 open and document blockers clearly.

## PR Boundary

PR #99 must stay limited to the read-only config API foundation:

1. Add private `apps/config-worker` runtime, component manifest, Wrangler config, env typing, router/handlers, and tests.
2. Add shared public contract types for read-only config settings, feature flags, and secret metadata list responses.
3. Expose read-only GET routes through `api-edge` and `config-worker` for organization, project, and environment scopes:
   - `/v1/organizations/{orgId}/config/settings`
   - `/v1/organizations/{orgId}/config/feature-flags`
   - `/v1/organizations/{orgId}/config/secrets`
   - `/v1/organizations/{orgId}/projects/{projectId}/config/settings`
   - `/v1/organizations/{orgId}/projects/{projectId}/config/feature-flags`
   - `/v1/organizations/{orgId}/projects/{projectId}/config/secrets`
   - `/v1/organizations/{orgId}/projects/{projectId}/environments/{environmentId}/config/settings`
   - `/v1/organizations/{orgId}/projects/{projectId}/environments/{environmentId}/config/feature-flags`
   - `/v1/organizations/{orgId}/projects/{projectId}/environments/{environmentId}/config/secrets`
4. Add deliberate policy coverage for read-only config access and focused tests for contracts/policy/config-worker/api-edge.

Explicit non-goals: no config mutations, no setting/flag create/update/delete routes, no secret value storage/reveal flow, no web-console UI, no KV cache, no config versioning/promotion, no Terraform/Supabase/AWS resource provisioning, and no `specs-v2/**` work.

## Read First

- `agents/orchestrator.md` — Verifier Standard and Verifier Merge Protocol, especially lines 349-392.
- `ai/tasks/task-0056.md` — original Implementer task prompt.
- `ai/reports/task-0056-implementer.md` — Implementer report. If missing from the PR branch, commit it before final merge.
- PR #99 diff and commits via `gh pr view 99 --json ...` and `gh pr diff 99`.
- `specs/constitution.md` — bounded contexts, secure-by-default, organization/project/environment invariants, Definition of Done.
- `specs/contracts/tenancy-and-rbac.md` — role/action semantics and tenant-scope rules.
- `specs/components/01-edge-api.md` — api-edge public facade and internal Worker routing.
- `specs/components/07-config-secrets-flags.md` — config/settings/feature-flag/secret metadata requirements and secret rules.
- `specs/components/09-events-audit-observability.md` — mutation event/audit requirements, which should remain deferred because this task is read-only.
- `specs/orun-golden-path.md` — component manifest and Orun validation workflow.
- `ai/context/current.md`, `ai/context/decisions.md`, `ai/context/open-risks.md` — current repo state and constraints.
- `ai/reports/task-0055-verifier.md` — verified config persistence behavior and secret-safety invariants.

## Required Outcomes

- [ ] Confirm PR #99 maps exactly to Task 0056 and has no unrelated carryover files, generated artifacts, or out-of-scope scope expansion.
- [ ] Confirm `apps/config-worker` is private in stage/prod (`workers_dev: false`) and binds only same-environment `SOURCEPLANE_DB`, `MEMBERSHIP_WORKER`, and `POLICY_WORKER`.
- [ ] Confirm `api-edge` has stage/prod `CONFIG_WORKER` service bindings and forwards config routes only after actor resolution, without forwarding raw bearer tokens.
- [ ] Confirm public contract shapes never expose plaintext, ciphertext envelopes, token material, hashes, provider tokens, SQL details, or stack traces.
- [ ] Confirm route scope invariants: org routes require `orgId`; project routes require `orgId + projectId`; environment routes require `orgId + projectId + environmentId`; no auth/query path uses child IDs alone.
- [ ] Confirm read-only behavior: only GET routes are added; POST/PATCH/PUT/DELETE return method-not-allowed or remain unimplemented.
- [ ] Confirm policy actions are deny-by-default, owner/admin/builder/viewer read access is intentional, and `billing_admin` is not accidentally granted operational config read access.
- [ ] Confirm cursor pagination follows repo conventions: default limit 50, max 100, opaque cursor, malformed limit/cursor returns `validation_failed`.
- [ ] Confirm all required local checks and PR CI logs pass before merge.
- [ ] Write `ai/reports/task-0056-verifier.md` with PASS/FAIL and evidence.

## Verification Steps

1. Prepare and inspect PR state:
   ```bash
   git fetch origin main pull/99/head:verify/task-0056-pr99
   git checkout verify/task-0056-pr99
   git status --short
   gh pr view 99 --json number,title,state,headRefName,baseRefName,isDraft,mergeStateStatus,statusCheckRollup,commits,files,url
   gh pr diff 99 --name-only
   ```

2. Ensure required task/report artifacts are in the PR branch:
   ```bash
   git ls-tree -r HEAD --name-only ai/tasks/task-0056.md ai/reports/task-0056-implementer.md
   ```
   If `ai/reports/task-0056-implementer.md` is missing, add the report from the local working copy or reconstruct it from PR evidence, commit it to the PR branch, push, and wait for CI again. If `ai/tasks/task-0056.md` is missing and repo convention requires prompts to remain committed for active tasks, add it too.

3. Run targeted local checks:
   ```bash
   pnpm --filter @saas/contracts typecheck
   pnpm --filter @saas/policy-engine typecheck
   pnpm --filter @saas/policy-engine test
   pnpm --filter @saas/config-worker typecheck
   pnpm --filter @saas/config-worker build
   pnpm --filter @saas/config-worker-tests typecheck
   pnpm --filter @saas/config-worker-tests test
   pnpm --filter @saas/api-edge typecheck
   pnpm --filter @saas/api-edge-tests typecheck
   pnpm --filter @saas/api-edge-tests test
   ```
   If a broader test/typecheck fails, determine whether it is pre-existing on main before treating it as a blocker.

4. Run Orun checks:
   ```bash
   /Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
   /Users/irinelinson/.local/bin/kiox -- orun component --intent intent.yaml --long
   /Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
   /Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
   ```
   Confirm component discovery includes `config-worker` and `config-worker-tests`, and the rendered plan includes the expected config-worker/api-edge/package/test jobs.

5. Inspect implementation details:
   - Read `apps/config-worker/src/router.ts`, handlers, mappers, membership/policy clients, env typing, and Wrangler config.
   - Read `apps/api-edge/src/config-facade.ts`, `apps/api-edge/src/index.ts`, `apps/api-edge/src/env.ts`, and `apps/api-edge/wrangler.jsonc`.
   - Read `packages/contracts/src/config.ts`, `packages/contracts/src/policy.ts`, and `packages/policy-engine/src/index.ts`.
   - Read config-worker and api-edge tests to ensure they exercise actual handlers/facade behavior, not only helpers.

6. Secret handling review:
   - Search committed files for risky serialized field names and ensure public mappers never include secret values or ciphertext envelopes.
   - Inspect CI logs for secret exposure. Reports may include route names, resource IDs, and CI run IDs only.

7. Inspect CI logs, not just status summaries:
   ```bash
   gh run view 26567374841 --json status,conclusion,jobs
   gh run view 26567374841 --log
   ```
   Confirm plan, contracts, policy-engine, config-worker-tests, api-edge-tests, config-worker deploy verification, and api-edge deploy verification completed successfully. Do not merge while any required check is pending or failed.

8. Decide:
   - PASS only if local checks, code inspection, secret-safety review, scope review, and PR CI are all acceptable.
   - FAIL if any blocker remains; leave PR #99 open and document exact blockers.

## Acceptance Criteria

✅ PR #99 corresponds exactly to Task 0056 and remains one PR-sized read-only config API foundation.

✅ No out-of-scope files, stale carryover `ai/` artifacts, generated `.orun` output, `dist`, `node_modules`, `plan.json`, or unrelated docs are committed.

✅ `apps/config-worker` follows the established private Worker pattern with stage/prod `workers_dev: false` and same-environment service bindings.

✅ `api-edge` remains a transport facade: it resolves the actor and forwards safe actor/request metadata to `CONFIG_WORKER`; it does not query config storage directly and does not forward raw bearer tokens downstream.

✅ Config-worker uses `@saas/db/config` repository abstractions and does not duplicate SQL in route handlers.

✅ Secret metadata public responses cannot include plaintext values, ciphertext envelopes, hashes, tokens, provider credentials, SQL, stack traces, or raw secret material.

✅ Policy behavior is deliberate and deny-by-default. `billing_admin` does not receive operational config read access unless a spec-backed reason is documented.

✅ Local targeted package checks pass, or any failure is proven pre-existing on `main` and non-blocking.

✅ Orun validation, component discovery, changed plan, and dry-run pass.

✅ GitHub Actions run for the final PR head passes. The verifier must inspect logs for successful jobs, not only rollup status.

✅ If verifier adds the missing implementer report/task prompt or verifier report to the PR branch, it pushes those changes and waits for final CI before merge.

✅ If PASS, verifier merges PR #99, checks out `main`, fast-forwards from `origin/main`, and leaves `git status --short` clean except for known unrelated local carryover that is explicitly documented and not on main.

## Verifier Merge Protocol

Follow `agents/orchestrator.md` lines 377-392 exactly:

- Prefer `/Users/irinelinson/.local/bin/kiox` when `kiox` is not on `PATH`.
- Run the local Orun validation commands when `intent.yaml` exists.
- Inspect GitHub Actions logs with `gh`, including successful jobs.
- If verification adds a report or small verification-only fix, commit it to the PR branch, push, and wait for CI again.
- Merge only after local checks and PR CI logs are both acceptable.
- After merge, checkout `main`, fast-forward pull from `origin/main`, and do not leave the task branch checked out.
- Run `git status --short`; resolve verifier-created local changes before ending.
- Never merge a PR with unresolved verification blockers.

## When Done Report

Write `ai/reports/task-0056-verifier.md` with these sections:

- Result: PASS or FAIL
- PR / Merge Evidence
- Checks Run
- CI Log Review
- Code Path / Scope Review
- Secret Handling Review
- Issues
- Risk Notes
- Spec Proposals
- State Updates
- Recommended Next Move

If PASS and merged, also update orchestration state files on `main` after merge: `ai/state.json`, `ai/context/current.md`, `ai/context/task-ledger.md`, and `ai/waiting_for_input.md`, then commit/push that state update as required by repo convention.
