# Task ID

Task 0018 Verifier

# Agent

Verifier

# Current Repo Context

The reusable SaaS starter spec pack under `specs/**` is authoritative for this
verification. `specs-v2/**` is out of scope.

Task 0018 implementation is open as PR #59:

- URL: https://github.com/sourceplane/multi-tenant-saas/pull/59
- Branch: `codex/task-0018-membership-policy-binding`
- Head commit observed when this verifier prompt was written:
  `e6f68ab3f3114452ca42804ad1aa9686b81cb21a`
- Base: `main` at `0bd265d8369fd9325b23f7428ab1bc91316c074d`
- Current PR state: open, ready for review, mergeable, not draft
- Latest observed PR CI run: `26360415060`, all visible checks passed
- Branch content observed: 2 commits ahead of `main`

Observed implementation summary:

- Adds `POLICY_WORKER` service binding to `apps/membership-worker`.
- Adds `apps/membership-worker/src/policy-client.ts`.
- Replaces the local "any active role assignment" check for
  `GET /v1/organizations/{orgId}` with a policy-worker authorization call.
- Adds a `membership-worker -> policy-worker` `dependsOn` edge.
- Expands `tests/membership-worker/src/membership-worker.test.ts`.
- Adds `ai/reports/task-0018-implementer.md`.

Important verification risks:

- `apps/policy-worker` returns success envelopes shaped as
  `{ data: AuthorizationResponse, meta: ... }`. The observed Task 0018 policy
  client appears to parse `allow` at the top level of the JSON response. If this
  is true, every real service-binding authorization call will fail closed even
  when policy allows. Verify this against the actual policy-worker handler or a
  faithful envelope-shaped fake, and fix or fail the PR before merge.
- The Task 0018 prompt required tests for missing policy binding and repository
  role-list failure. The observed test file may not cover those exact failure
  modes. Verify coverage and add focused tests if missing.
- The service binding changes are live Cloudflare Worker configuration changes
  after merge. Verify deployed stage/prod `membership-worker` configuration
  directly after the post-merge pipeline, not only from `wrangler.jsonc`.

# Objective

Independently verify PR #59 against Task 0018.

If the PR is production-safe after any strictly Task 0018-scoped verifier fixes,
merge it, wait for the post-merge `main` pipeline, verify live stage/prod
`membership-worker` deployments and service-binding configuration, sync local
`main`, update compact orchestration context/state, and write a PASS report.

If it fails, leave the PR open, do not merge, and write a FAIL report with
concrete blockers. If provider access blocks required live Cloudflare evidence,
write BLOCKED rather than guessing.

# PR Boundary

This verifier task covers PR #59 only.

Allowed verifier changes are limited to:

- `ai/reports/task-0018-verifier.md`;
- small, strictly Task 0018-scoped fixes needed to make PR #59 safe to merge;
- compact orchestration context/state updates after verification is complete.

Do not add invitation routes, member administration routes, audit/event
persistence, email delivery, API-edge policy facade routes, policy persistence,
policy-engine behavior changes beyond a narrow caller-contract defect, database
migrations, Terraform resources, Supabase resources, AWS IAM/S3/Secrets Manager
resources, Queues, KV, R2, UI, SDK, CLI, billing, projects, or `specs-v2/**`
work.

# Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0018.md`
- `ai/reports/task-0018-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `ai/state.json`
- `specs/constitution.md`
- `specs/repo.md`
- `specs/orun-golden-path.md`
- `specs/components/03-policy-authorization.md`
- `specs/components/04-organizations-membership.md`
- `specs/contracts/api-guidelines.md`
- `specs/contracts/tenancy-and-rbac.md`
- `apps/membership-worker/**`
- `apps/policy-worker/src/router.ts`
- `apps/policy-worker/src/handlers/authorize.ts`
- `apps/policy-worker/src/http.ts`
- `packages/contracts/src/policy.ts`
- `packages/db/src/membership/**`
- `tests/membership-worker/**`
- PR #59 diff, commits, checks, review state, and CI logs
- GitHub Actions run `26360415060`

# Required Outcomes

## PR Review

- Confirm PR #59 has a real PR number, is based on current `main`, is not draft,
  is mergeable, and has green CI for the final head commit.
- Inspect the actual PR diff, commits, implementer report, and CI logs, not only
  PR summaries.
- Verify the PR is bounded to Task 0018:
  - membership-worker service binding;
  - membership-worker policy client/helper;
  - role-assignment to policy-fact mapping;
  - org-read authorization replacement;
  - focused tests;
  - Orun dependency edge if accepted by validation;
  - implementer report.
- Verify no generated/ignored artifacts are committed, including `.orun/**`,
  `plan.json`, `dist/`, `node_modules/`, `.wrangler/`, TypeScript build info,
  Terraform working directories, or aggregate files.
- Verify no raw connection strings, database passwords, Supabase API keys,
  Cloudflare API tokens, AWS credentials, raw bearer tokens, invitation tokens,
  token hashes, signing secrets, encryption secrets, or Secrets Manager payloads
  are committed, logged, or returned.

## Membership To Policy Contract Review

- Verify `membership-worker` depends only on shared policy contracts and a
  service binding. It must not import `apps/policy-worker` internals or
  `packages/policy-engine`.
- Verify `Env` and Wrangler stage/prod config define `POLICY_WORKER` correctly:
  - stage `POLICY_WORKER` -> `policy-worker-stage`;
  - prod `POLICY_WORKER` -> `policy-worker-prod`;
  - no stage/prod cross-binding;
  - existing `workers_dev: false` and `SOURCEPLANE_DB` bindings are preserved.
- Verify `apps/membership-worker/component.yaml` validates with the
  `dependsOn: [{ component: policy-worker }]` edge and that the rendered plan
  ordering is sensible. If the edge causes unsound cross-environment behavior,
  write a spec proposal and fail or fix as appropriate.
- Verify the policy client calls
  `POST /v1/internal/policy/authorize` through `POLICY_WORKER.fetch`, includes
  JSON content type and `x-request-id`, and never forwards raw bearer tokens.
- Verify the policy client parses the actual policy-worker success envelope.
  A raw top-level `{ allow: true }` fake is not sufficient.
- Verify policy-worker errors, non-OK responses, malformed JSON, missing or
  malformed `data.allow`, and thrown fetches all fail closed without exposing
  internal names, stack traces, role facts, database UUIDs, or service URLs.
- Verify role assignments from `repo.listRoleAssignments(orgUuid,
  actor.subjectId)` map into V1 `role_assignment` facts:
  - organization scope -> `{ kind: "organization", orgId }`;
  - project scope -> `{ kind: "project", orgId, projectId: scopeRef }`.
- Verify unknown or unsupported role/scope data cannot widen access.

## Organization Read Review

- Verify `GET /v1/organizations/{orgId}` authorizes through policy-worker using
  action `organization.read` before returning organization data.
- Verify denial keeps the existing no-enumeration behavior: public response is
  `not_found`, not `forbidden`.
- Verify missing `POLICY_WORKER`, policy denial, policy failure, malformed policy
  response, and repository role-list failure do not return organization data.
- Verify a policy infrastructure failure may return a safe `internal_error` or
  service-unavailable style envelope, but must not leak internals.
- Verify `POST /v1/organizations` remains a pre-organization bootstrap path
  without a policy call.
- Verify `GET /v1/organizations` remains a membership-owned subject query unless
  a narrow code-reality reason justifies otherwise.
- Verify public organization IDs remain opaque in API responses and raw UUIDs
  are not exposed publicly.

## Test Review

- Verify membership-worker tests cover:
  - authorization request construction using the actual policy-worker envelope;
  - role-assignment fact mapping for organization and project scopes;
  - allow and deny;
  - missing policy binding;
  - policy fetch failure;
  - non-OK policy response;
  - malformed policy response;
  - repository role-list failure;
  - org-read denial returning non-enumerating `not_found`;
  - stage/prod `POLICY_WORKER` config and no cross-environment binding.
- Add focused tests for missing coverage if they are strictly Task 0018-scoped.
- Verify existing membership-worker org creation/list tests still pass and still
  prove bootstrap/list behavior was not accidentally policy-gated.

## CI And Logs Review

- Inspect PR CI logs for run `26360415060`, including successful jobs.
- Verify logs show `orun plan --changed --intent intent.yaml --output plan.json`
  and `orun run --plan plan.json --runner github-actions --remote-state` where
  applicable.
- Verify the changed plan includes the expected membership-worker,
  membership-worker-tests, and policy-worker jobs caused by the dependency edge.
- Confirm no Terraform, Supabase, AWS, S3, Secrets Manager, KV, R2, Queue, or
  database migration work runs for this task.

## Merge And Live Verification

If local review, checks, and PR CI are acceptable:

- Merge PR #59.
- Wait for the post-merge `main` pipeline to complete.
- Inspect post-merge CI logs, not only status summaries.
- Verify live Cloudflare stage/prod `membership-worker` deployments directly:
  - stage and prod Workers exist;
  - `workers_dev` remains disabled;
  - `SOURCEPLANE_DB` Hyperdrive bindings are preserved;
  - `POLICY_WORKER` binds to the same-environment policy Worker;
  - no public direct membership-worker route is exposed.
- If feasible without leaking secrets, perform or document a safe live smoke
  that proves organization read can still be authorized through `api-edge`.
  If not feasible, explain the blocker and rely on direct deployment/config
  evidence plus local/CI tests.
- Sync local `main` to `origin/main`, leave the local repo clean, and write the
  verifier report.

# Non-Goals

- No new membership public surface beyond existing org read verification.
- No invitation create/list/revoke/accept behavior.
- No member list/remove/update-role behavior.
- No public policy facade.
- No policy persistence or policy-engine feature expansion.
- No database migration.
- No live Terraform, Supabase, AWS IAM, S3, Secrets Manager, Queue, KV, R2, or
  Hyperdrive resource changes beyond the Worker deployment/config changes caused
  by merging this PR.
- No product-specific `specs-v2/**` work.

# Constraints

- Trust code reality over stale documentation.
- Keep `membership-worker` and `policy-worker` private.
- Keep authorization deny-by-default.
- Keep bounded contexts clean: membership supplies role facts; policy decides.
- Do not duplicate role-action authorization rules locally in membership-worker.
- Do not leak policy-worker service names, internal URLs, stack traces, role
  facts, raw database IDs, or secrets in public responses.
- Avoid unrelated refactors and formatting churn.
- Do not stage or commit ignored generated outputs.
- Prefer `/Users/irinelinson/.local/bin/kiox` when `kiox` is not on `PATH`.

# Integration Notes

- `apps/policy-worker/src/handlers/authorize.ts` returns success via
  `successResponse`, which wraps the policy result under `data`.
- `packages/db/src/membership/repository.ts` exposes
  `listRoleAssignments(orgId, subjectId)`.
- `api-edge` resolves bearer tokens through `identity-worker` and forwards actor
  headers to membership-worker. Do not forward raw bearer tokens to
  membership-worker or policy-worker.
- The first policy-gated route is read-only. Invitation and member
  administration routes should wait for a later task after this seam is
  verified and merged.

# Acceptance Criteria

- PR #59 is verified against Task 0018 and does not exceed its boundary.
- `membership-worker` stage/prod service bindings point to same-environment
  policy Workers.
- `GET /v1/organizations/{orgId}` uses the policy-worker authorization seam and
  parses the actual policy-worker response envelope.
- Policy denial cannot leak organization existence.
- Binding/fetch/malformed-response/repository role-list failures fail closed and
  do not leak internal details.
- Tests cover request construction, envelope parsing, fact mapping, allow/deny,
  missing binding, and failure modes.
- Local checks and PR CI pass for the final head commit.
- If PASS, PR #59 is merged, post-merge main CI passes, live Worker
  configuration is independently verified, compact orchestration context/state
  are updated, and local `main` is clean.
- If FAIL or BLOCKED, PR #59 remains open and the verifier report lists concrete
  blockers.

# Verification

Run at minimum:

```bash
pnpm --filter @saas/membership-worker typecheck
pnpm --filter @saas/membership-worker-tests test
pnpm --filter @saas/membership-worker build
pnpm --filter @saas/policy-worker typecheck
pnpm --filter @saas/policy-worker-tests test
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
git diff --check
```

Also inspect PR CI and, after merge on PASS, post-merge `main` CI logs with
`gh`.

# PR Creation Requirement

Do not create a new implementation PR. Verify PR #59.

If small verifier fixes are required and remain strictly within Task 0018, commit
them to `codex/task-0018-membership-policy-binding`, push the branch, wait for
CI again, and verify the final head before merge.

If fixes would exceed Task 0018, leave PR #59 open and write a FAIL report.

# When Done Report

Write `ai/reports/task-0018-verifier.md` with:

- Result: `PASS`, `FAIL`, or `BLOCKED`
- Checks
- Issues
- Risk Notes
- Spec Proposals
- Recommended Next Move

For PASS, include the PR merge commit, post-merge main CI run, live
membership-worker stage/prod deployment evidence, and confirmation that local
`main` is clean.
