# Task 0051 Verifier

Agent: Verifier

## Current Repo Context

- Task 0047 is verified PASS and merged via PR #90 at `08c0e7b`. Identity owns persisted `service_principals` and `api_keys` records through migration 060 plus repository create/get/list/revoke primitives.
- Task 0048 is verified PASS and merged via PR #91 at `2a78a5d`. Identity resolves both session tokens and active API keys, and `api-edge` forwards `x-actor-subject-id` / `x-actor-subject-type=service_principal` without forwarding raw bearer tokens downstream.
- Task 0049 is verified PASS and merged via PR #92 at `c216fa1`. Membership and policy now provide the internal service-principal binding foundation: owner/admin-only policy actions plus private membership routes for create/list/revoke of SP bindings.
- Task 0050 is verified PASS and merged via PR #93 at `77cba75`. The active spec pack consistently defines the V1 public API-key admin surface as tenant-scoped `POST/GET/DELETE /v1/organizations/{orgId}/api-keys[/{apiKeyId}]`.
- Task 0051 implementer work is on PR #94 (`codex/task-0051-public-api-key-admin-runtime`).
- Current PR reality from this orchestrator cycle:
  - PR URL: `https://github.com/sourceplane/multi-tenant-saas/pull/94`
  - Head commit: `e17d715`
  - `mergeStateStatus`: `CLEAN`
  - CI run `26557489620`: all checks green, including `plan`, `api-edge-tests · dev · Verify`, `identity-worker-tests · dev · Verify`, `policy-engine-tests · dev · Verify`, and stage/prod verify-deploy jobs.
- PR diff is implementer-scoped runtime work across `apps/api-edge`, `apps/identity-worker`, `packages/contracts`, `packages/policy-engine`, focused tests, and lockfile changes.
- The implementer report exists locally at `ai/reports/task-0051-implementer.md`, but the PR diff currently does not include it. This is a known recurring gap and must be corrected before merge if still missing on the PR branch.
- Local workspace still contains unrelated untracked historical `ai/tasks/*` and `ai/reports/*` carryover files. They are not part of PR #94 and must remain unstaged/uncommitted during verification.

## Objective

Verify that PR #94 implements exactly the Task 0051 public API-key admin runtime slice, preserves bounded-context ownership across identity, membership, and policy, satisfies the tenant-scoped V1 contract from Task 0050, and is safe to merge.

If the PR only needs verifier-safe cleanup to become acceptable, make that minimal fix on the PR branch, push it, wait for CI to go green again, then continue verification. If contract drift, fail-open behavior, secret leakage, pagination/envelope mismatch, or other correctness issues remain after minimal cleanup, FAIL the task and leave the PR open with explicit blockers.

## PR Boundary

This verifier pass covers exactly:

1. `apps/api-edge/src/**` changes for tenant-scoped API-key route recognition and forwarding.
2. `apps/identity-worker/src/**`, `apps/identity-worker/src/env.ts`, and `apps/identity-worker/wrangler.jsonc` changes for create/list/revoke orchestration, membership/policy clients, and route wiring.
3. `packages/contracts/src/policy.ts` and `packages/policy-engine/src/**` changes for the minimal API-key authorization action surface.
4. Focused tests in `tests/api-edge/**`, `tests/identity-worker/**`, and `tests/policy-engine/**`, plus any touched policy-worker coverage.
5. Minimal verifier-only cleanup needed to:
   - add `ai/reports/task-0051-implementer.md` to the PR branch if it is still missing;
   - add `ai/reports/task-0051-verifier.md`;
   - make a tiny verification-only fix required to satisfy the accepted Task 0051 scope.

Non-goals for this verifier pass:
- no new web-console, CLI, or SDK API-key management UX
- no new public `/v1/auth/api-keys` route family
- no generic service-principal CRUD surface
- no new migration unless a blocking persistence defect is discovered and explicitly documented
- no `specs-v2/**` work
- no unrelated `ai/` cleanup beyond Task 0051 verification artifacts

## Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0051.md`
- `ai/tasks/task-0051-verifier.md`
- `ai/reports/task-0051-implementer.md`
- `ai/state.json`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `ai/reports/task-0048-verifier.md`
- `ai/reports/task-0049-verifier.md`
- `ai/reports/task-0050-verifier.md`
- `specs/constitution.md`
- `specs/product-overview.md`
- `specs/domain-model.md`
- `specs/components/01-edge-api.md`
- `specs/components/02-identity.md`
- `specs/components/04-organizations-membership.md`
- `specs/contracts/api-guidelines.md`
- `specs/contracts/tenancy-and-rbac.md`
- `packages/contracts/src/policy.ts`
- `packages/contracts/src/service-principal.ts`
- `packages/policy-engine/src/index.ts`
- `packages/db/src/identity/repository.ts`
- `packages/db/src/identity/types.ts`
- `apps/api-edge/src/org-facade.ts`
- `apps/api-edge/src/resolve-actor.ts`
- `apps/identity-worker/src/router.ts`
- `apps/identity-worker/src/env.ts`
- `apps/identity-worker/src/handlers/api-key-admin.ts`
- `apps/identity-worker/src/membership-client.ts`
- `apps/identity-worker/src/policy-client.ts`
- `apps/membership-worker/src/handlers/service-principal-bindings.ts`
- PR #94 diff, commits, and CI logs

## Required Outcomes

- [ ] Confirm PR #94 maps to Task 0051 only and does not widen into UI work, CLI work, generic SP lifecycle work, unrelated `ai/` cleanup, or spec churn.
- [ ] Ensure `ai/reports/task-0051-implementer.md` is committed on the PR branch before merge.
- [ ] Verify the only public API-key admin route family is tenant-scoped:
  - `POST /v1/organizations/{orgId}/api-keys`
  - `GET /v1/organizations/{orgId}/api-keys`
  - `DELETE /v1/organizations/{orgId}/api-keys/{apiKeyId}`
- [ ] Verify `api-edge` continues to use `resolveActor()` and explicit actor headers without forwarding raw bearer tokens downstream.
- [ ] Verify the minimal policy surface is implemented and remains deny-by-default:
  - `organization.api_key.create`
  - `organization.api_key.list`
  - `organization.api_key.revoke`
- [ ] Verify org owner/admin access and project-admin-only access when the request is explicitly narrowed to a project-scoped key in that project.
- [ ] Verify identity owns credentials and security events, membership owns role bindings, and policy owns authorization decisions. Identity must orchestrate across those seams rather than re-owning membership data.
- [ ] Verify create returns the raw secret exactly once, while list and revoke never expose raw key material, key hashes, or bearer tokens.
- [ ] Verify create/revoke emit both identity-owned security events and org-scoped audit/event copies.
- [ ] Verify list behavior honors the shared response-envelope and cursor-pagination contract from `specs/contracts/api-guidelines.md`.
- [ ] Verify list/create/revoke fail closed on malformed or ambiguous membership-binding or scope state; do not accept guessed role/project metadata.
- [ ] Verify public response IDs and boundary shapes remain consistent with the repo's public-contract conventions rather than leaking internal-only persistence details.
- [ ] Verify local checks and PR CI evidence are both acceptable.
- [ ] If PASS, merge PR #94, fast-forward local `main`, and leave the repo clean.

## Non-Goals

- No web-console or CLI API-key management surface.
- No public service-principal CRUD route family.
- No `/v1/auth/api-keys` route revival.
- No generic idempotency-system redesign beyond what this route family already requires.
- No membership-worker route redesign if the existing internal seam is sufficient.
- No unrelated cleanup of historical untracked `ai/` carryover files.

## Constraints

1. Follow Constitution rule 8 (`secure by default`): raw API keys, bearer tokens, hashes, and secret-bearing payloads must never appear in logs, tests, list responses, or reports. Create may return the raw secret exactly once.
2. Follow Constitution rule 11 (`bounded contexts are real`): identity owns credentials/events, membership owns role bindings, policy owns authorization decisions.
3. Follow the Task 0050 contract: public admin routes remain tenant-scoped under `/v1/organizations/{orgId}/api-keys`; project scope is an explicit narrowing attribute, not a second V1 path family.
4. Follow `specs/contracts/api-guidelines.md`: mutating POST behavior must honor `Idempotency-Key`, responses must use the standard envelope, and list semantics must use `meta.cursor` pagination.
5. Treat PR hygiene as part of verification. Do not accidentally stage unrelated untracked `ai/` carryover files from the local workspace.
6. Merge only after both local verification and GitHub Actions CI are green.

## Integration Notes

- `packages/db/src/identity/repository.ts` already provides create/get/list/revoke primitives for identity-owned API-key state.
- `apps/membership-worker/src/handlers/service-principal-bindings.ts` already provides the internal binding create/list/revoke seam; the verifier should confirm identity consumes it rather than duplicating role-assignment logic.
- `apps/api-edge/src/org-facade.ts` is the public transport seam and must keep actor/header forwarding safe.
- `apps/projects-worker/src/handlers/create-project.ts` remains the best reference for membership-context fetch + policy authorize + DB-backed event/audit append patterns.
- Known areas that deserve explicit inspection during verification because they are easy to get subtly wrong in this slice:
  - list pagination and `meta.cursor` behavior
  - fail-closed handling when SP binding metadata is missing or ambiguous
  - org/project scope derivation for project-admin authorization
  - public ID / raw persistence ID leakage at the API boundary
  - implementer report presence on the PR branch

## Acceptance Criteria

✅ PR #94 corresponds exactly to Task 0051 runtime scope.

✅ `ai/reports/task-0051-implementer.md` is committed on the PR branch before merge.

✅ The only public V1 route family is:
- `POST /v1/organizations/{orgId}/api-keys`
- `GET /v1/organizations/{orgId}/api-keys`
- `DELETE /v1/organizations/{orgId}/api-keys/{apiKeyId}`

✅ `api-edge` recognizes and forwards those routes through the existing org-facade / actor-resolution pattern without leaking bearer material.

✅ `identity-worker` orchestrates membership + policy checks, persists identity-owned API-key state safely, returns the raw secret only on create, and never returns it on list/revoke.

✅ The minimal policy surface (`organization.api_key.{create,list,revoke}`) is implemented and deny-by-default.

✅ Project-admin access is allowed only when the request is explicitly narrowed to a project-scoped key in the same project; otherwise it is denied.

✅ Identity records `api_key.created` / `api_key.revoked` security events and writes org-scoped audit/event copies for create/revoke.

✅ List responses satisfy the shared envelope/cursor contract, never expose raw key material, and fail closed rather than guessing role/scope metadata.

✅ Focused local checks pass. At minimum, run and record exact commands equivalent to:
```bash
pnpm --filter @saas/policy-engine-tests test
pnpm --filter @saas/identity-worker-tests test
pnpm --filter @saas/api-edge-tests test
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
```

✅ PR CI logs show the expected checks actually ran successfully, including run `26557489620` or a later rerun if the verifier adds a cleanup commit.

✅ MergeStateStatus is `CLEAN` at merge time.

## Verification

Run and record exact results:

- `git status --short`
- `gh pr view 94 --json files,commits,statusCheckRollup,mergeStateStatus,url`
- `git ls-tree origin/codex/task-0051-public-api-key-admin-runtime --name-only ai/reports/task-0051-implementer.md`
- `git diff --name-only origin/main...origin/codex/task-0051-public-api-key-admin-runtime`
- `gh pr diff 94 --name-only`
- focused code inspection of:
  - `apps/api-edge/src/org-facade.ts`
  - `apps/identity-worker/src/router.ts`
  - `apps/identity-worker/src/handlers/api-key-admin.ts`
  - `apps/identity-worker/src/membership-client.ts`
  - `apps/identity-worker/src/policy-client.ts`
  - `packages/policy-engine/src/index.ts`
- `pnpm --filter @saas/policy-engine-tests test`
- `pnpm --filter @saas/identity-worker-tests test`
- `pnpm --filter @saas/api-edge-tests test`
- `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
- `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
- `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`
- `gh run view 26557489620 --json name,conclusion,jobs,url,workflowName`
- any focused inspection commands needed to confirm envelope, cursor, scope, secret-safety, and fail-closed behavior

If the implementer report is missing, commit only that report (and any required verifier artifact) to the PR branch, push, and wait for CI again before final PASS/FAIL. Do not stage unrelated untracked `ai/` carryover files from the local workspace.

## PR Creation Requirement

The Implementer has already created the PR. Your job is to verify PR #94.

## PR Merge Protocol

- If PASS: merge PR #94, checkout `main`, fast-forward pull from `origin/main`, ensure `git status --short` is clean, and update orchestration state files for the next cycle.
- If FAIL: leave PR #94 open and document exact blockers.
- Never merge a PR with unresolved verification blockers or failing CI.

## When Done Report

Write `ai/reports/task-0051-verifier.md` with sections:

- Result: PASS or FAIL
- Checks
- Issues
- CI Log Review
- Secret Handling Review
- Risk Notes
- Spec Proposals
- Recommended Next Move
- PR Number
