# Task ID

Task 0019 Verifier

# Agent

Verifier

# Current Repo Context

The reusable SaaS starter spec pack under `specs/**` is authoritative for this
verification. `specs-v2/**` is out of scope.

Task 0019 implementation is open as PR #60:

- URL: https://github.com/sourceplane/multi-tenant-saas/pull/60
- Branch: `codex/task-0019-member-list-endpoint`
- Head commit observed when this verifier prompt was written:
  `48c3316c40805c7061f181dc8a8832173d0938fc`
- Base: `main` at `0b0c9ec3493597fe165cb747de2d08abe9b92b93`
- Current PR state: open, ready for review, mergeable, not draft
- Latest observed PR CI run: `26362124620`, all visible checks passed
- Branch content observed: 2 commits ahead of `main`

Observed implementation summary:

- Adds `ListMembersResponse` contract types to
  `packages/contracts/src/membership.ts`.
- Adds `memberPublicId()` in `apps/membership-worker/src/ids.ts`.
- Adds `apps/membership-worker/src/handlers/list-members.ts`.
- Adds `GET /v1/organizations/{orgId}/members` routing in
  `membership-worker`.
- Extends `api-edge` org facade matching/forwarding for the members route.
- Expands membership-worker and api-edge tests.
- Adds `ai/reports/task-0019-implementer.md`.

Important verification risks:

- The observed membership-worker tests for member-list behavior appear to test
  response-shape snippets and lower-level helpers rather than exercising
  `handleListMembers` or `route()` end-to-end with a real fake repository seam.
  Verify whether the actual handler behavior is covered. If not, add focused
  tests or fail the PR.
- `handleListMembers` creates its own SQL executor/repository, which may make
  it hard to test failure modes without a seam. A small task-scoped extraction
  or dependency injection seam is allowed if needed to prove behavior.
- The endpoint returns subject IDs owned by identity. Confirm those IDs are
  public-safe in current code reality and that no identity-owned email/display
  fields are invented by membership.
- Member-list is a new public API surface through `api-edge`. Verify method
  gating, route matching, auth resolution, bearer-token redaction, and
  downstream passthrough carefully.

# Objective

Independently verify PR #60 against Task 0019.

If the PR is production-safe after any strictly Task 0019-scoped verifier fixes,
merge it, wait for the post-merge `main` pipeline, verify the expected Worker
deployments/configuration from CI logs and available provider evidence, sync
local `main`, update compact orchestration context/state, and write a PASS
report.

If it fails, leave the PR open, do not merge, and write a FAIL report with
concrete blockers. If provider access blocks required live evidence, write
BLOCKED rather than guessing.

# PR Boundary

This verifier task covers PR #60 only.

Allowed verifier changes are limited to:

- `ai/reports/task-0019-verifier.md`;
- small, strictly Task 0019-scoped fixes needed to make PR #60 safe to merge;
- compact orchestration context/state updates after verification is complete.

Do not add member removal, member role update, invitation create/list/revoke,
invitation acceptance, email delivery, notification queues, audit/event
persistence, policy-engine behavior changes, database migrations, Terraform
resources, Supabase resources, AWS IAM/S3/Secrets Manager resources, Queues, KV,
R2, UI, SDK, CLI, billing, projects, or `specs-v2/**` work.

# Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0019.md`
- `ai/reports/task-0019-implementer.md`
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
- `packages/contracts/src/membership.ts`
- `apps/membership-worker/src/router.ts`
- `apps/membership-worker/src/handlers/list-members.ts`
- `apps/membership-worker/src/policy-client.ts`
- `apps/membership-worker/src/ids.ts`
- `apps/api-edge/src/org-facade.ts`
- `packages/db/src/membership/**`
- `tests/membership-worker/**`
- `tests/api-edge/**`
- PR #60 diff, commits, checks, review state, and CI logs
- GitHub Actions run `26362124620`

# Required Outcomes

## PR Review

- Confirm PR #60 has a real PR number, is based on current `main`, is not draft,
  is mergeable, and has green CI for the final head commit.
- Inspect the actual PR diff, commits, implementer report, and CI logs, not only
  PR summaries.
- Verify the PR is bounded to Task 0019:
  - member-list contract types;
  - `mem_` public ID helper;
  - membership-worker list-members route/handler;
  - api-edge facade routing;
  - focused tests;
  - implementer report.
- Verify no generated/ignored artifacts are committed, including `.orun/**`,
  `plan.json`, `dist/`, `node_modules/`, `.wrangler/`, TypeScript build info,
  Terraform working directories, or aggregate files.
- Verify no raw connection strings, database passwords, Supabase API keys,
  Cloudflare API tokens, AWS credentials, raw bearer tokens, invitation tokens,
  token hashes, signing secrets, encryption secrets, or Secrets Manager payloads
  are committed, logged, or returned.

## Contract Review

- Verify `packages/contracts/src/membership.ts` exports a stable
  `ListMembersResponse` shape.
- Verify public member records include only membership-owned or public-safe
  fields:
  - `mem_` member public ID;
  - subject type;
  - subject ID only if it is public-safe in current identity code;
  - status;
  - joined/created timestamp;
  - organization-scoped role names.
- Verify no raw member UUIDs, role-assignment UUIDs, database IDs, token hashes,
  or provider internals appear in public responses.
- Verify project-scoped role assignments do not leak raw `scopeRef` or raw
  project UUIDs. If project-scoped roles are included, their shape must be safe
  and explicit.
- Verify no identity-owned profile fields such as email/display name are added
  without an identity service contract.

## Membership Worker Review

- Verify `GET /v1/organizations/{orgId}/members` is matched before the existing
  `/v1/organizations/{orgId}` route and rejects unsupported methods safely.
- Verify invalid `orgId` returns safe `not_found`.
- Verify actor headers are required.
- Verify `SOURCEPLANE_DB` and `POLICY_WORKER` are required.
- Verify the handler authorizes before listing members using:
  - actor role facts from `repo.listRoleAssignments(orgUuid, actor.subjectId)`;
  - policy action `organization.member.list`;
  - resource `{ kind: "organization", id: orgUuid, orgId: orgUuid }`;
  - the verified policy-worker `{ data, meta }` envelope parser.
- Verify actor role-list failure, policy denial, policy fetch failure, malformed
  policy response, and missing policy binding fail closed without member data.
- Verify policy denial preserves no-enumeration behavior with `not_found`, not
  `forbidden`.
- Verify `repo.listMembers(orgUuid)` is called only after authorization.
- Verify member role lookups fail safely without returning partial member data.
- Verify active-member filtering is owned by the repository and matches current
  SQL reality.
- Verify existing organization create/list/read behavior remains unchanged.
- Verify Worker errors are generic and do not leak stack traces, Worker names,
  service URLs, SQL, raw UUIDs, role facts, or provider details.

## Api Edge Review

- Verify `api-edge` recognizes
  `/v1/organizations/{orgId}/members` as an org route.
- Verify only `GET` is allowed for the members route.
- Verify `api-edge` resolves auth through `IDENTITY_WORKER` before forwarding.
- Verify it forwards only actor headers, request ID, traceparent, idempotency
  key, and allowed content headers.
- Verify it never forwards raw bearer tokens to `membership-worker`.
- Verify downstream success and error envelopes pass through unchanged.
- Verify deeper nested routes like
  `/v1/organizations/{orgId}/members/{memberId}` are not accidentally matched.

## Test Review

- Verify membership-worker tests exercise actual route or handler behavior for:
  - allowed member list with expected response shape;
  - policy request action/resource for `organization.member.list`;
  - policy denial returning `not_found`;
  - missing policy binding;
  - actor role-list failure;
  - member role-list failure;
  - no raw member UUID or role-assignment UUID exposure;
  - no raw project UUID/scopeRef exposure for project-scoped roles;
  - existing org create/list/read regression coverage.
- If tests only exercise snippets or helpers and not the actual route/handler,
  add a focused dependency-injected seam and tests, or fail the PR.
- Verify api-edge tests cover:
  - route matching for `/v1/organizations/{orgId}/members`;
  - unsupported methods;
  - auth resolution and actor header forwarding;
  - no bearer-token forwarding;
  - downstream success/error passthrough;
  - deeper nested route rejection.

## CI And Logs Review

- Inspect PR CI logs for run `26362124620`, including successful jobs.
- Verify logs show `orun plan --changed --intent intent.yaml --output plan.json`
  and `orun run --plan plan.json --runner github-actions --remote-state` where
  applicable.
- Verify the changed plan includes the expected contracts, membership-worker,
  membership-worker-tests, api-edge, api-edge-tests, and policy-worker jobs if
  dependency/path selection requires them.
- Confirm no Terraform, Supabase, AWS, S3, Secrets Manager, KV, R2, Queue, or
  database migration work runs for this task.

## Merge And Live Verification

If local review, checks, and PR CI are acceptable:

- Merge PR #60.
- Wait for the post-merge `main` pipeline to complete.
- Inspect post-merge CI logs, not only status summaries.
- Verify stage/prod membership-worker and api-edge deploy jobs ran as expected
  from Orun/CI logs.
- Verify membership-worker remains private (`workers_dev: false`) and preserves
  `SOURCEPLANE_DB` and `POLICY_WORKER` bindings.
- Verify api-edge preserves `IDENTITY_WORKER` and `MEMBERSHIP_WORKER` bindings.
- If feasible without leaking secrets, perform or document a safe live smoke
  through api-edge. If no valid bearer token/session is available, record that
  blocker and rely on local/CI tests plus deployment evidence.
- Sync local `main` to `origin/main`, leave the local repo clean, and write the
  verifier report.

# Non-Goals

- No member removal or role update endpoints.
- No invitation create/list/revoke/accept endpoints.
- No identity profile enrichment.
- No audit/event persistence.
- No policy-engine semantic changes.
- No database migrations.
- No live Terraform, Supabase, AWS IAM, S3, Secrets Manager, Queue, KV, R2, or
  Hyperdrive resource changes beyond Worker deploy/config changes caused by
  merging this PR.
- No product-specific `specs-v2/**` work.

# Constraints

- Trust code reality over stale documentation.
- Keep `membership-worker` private.
- Keep authorization deny-by-default.
- Keep bounded contexts clean: membership owns membership state, policy owns
  decisions, identity owns user profile data.
- Do not duplicate role-action authorization rules locally.
- Do not expose raw database UUIDs, role-assignment IDs, raw project IDs,
  tokens, hashes, secrets, SQL, or provider details.
- Avoid unrelated refactors and formatting churn.
- Do not stage or commit ignored generated outputs.
- Prefer `/Users/irinelinson/.local/bin/kiox` when `kiox` is not on `PATH`.

# Acceptance Criteria

- PR #60 is verified against Task 0019 and does not exceed its boundary.
- `GET /v1/organizations/{orgId}/members` exists through membership-worker and
  api-edge.
- Member listing is authorized through policy-worker action
  `organization.member.list` before member data is loaded.
- Denial and actor role-list failure cannot leak organization existence.
- Binding/policy/member-role-list failures fail closed and do not return partial
  data or internal details.
- Public responses do not expose raw member UUIDs, role-assignment UUIDs, raw
  project UUIDs, token hashes, or secrets.
- Tests exercise the actual behavior, not just constructed examples.
- Local checks and PR CI pass for the final head commit.
- If PASS, PR #60 is merged, post-merge main CI passes, compact orchestration
  context/state are updated, and local `main` is clean.
- If FAIL or BLOCKED, PR #60 remains open and the verifier report lists concrete
  blockers.

# Verification

Run at minimum:

```bash
pnpm --filter @saas/contracts typecheck
pnpm --filter @saas/membership-worker typecheck
pnpm --filter @saas/membership-worker-tests test
pnpm --filter @saas/membership-worker build
pnpm --filter @saas/api-edge typecheck
pnpm --filter @saas/api-edge-tests test
pnpm --filter @saas/api-edge build
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
git diff --check
```

Also inspect PR CI and, after merge on PASS, post-merge `main` CI logs with
`gh`.

# PR Creation Requirement

Do not create a new implementation PR. Verify PR #60.

If small verifier fixes are required and remain strictly within Task 0019,
commit them to `codex/task-0019-member-list-endpoint`, push the branch, wait for
CI again, and verify the final head before merge.

If fixes would exceed Task 0019, leave PR #60 open and write a FAIL report.

# When Done Report

Write `ai/reports/task-0019-verifier.md` with:

- Result: `PASS`, `FAIL`, or `BLOCKED`
- Checks
- Issues
- Risk Notes
- Spec Proposals
- Recommended Next Move

For PASS, include the PR merge commit, post-merge main CI run, deployment/config
evidence, and confirmation that local `main` is clean.
