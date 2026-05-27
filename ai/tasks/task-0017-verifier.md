# Task ID

Task 0017 Verifier

# Agent

Verifier

# Current Repo Context

The reusable SaaS starter spec pack under `specs/**` is authoritative for this
verification. `specs-v2/**` is out of scope.

Task 0017 implementation is open as PR #58:

- URL: https://github.com/sourceplane/multi-tenant-saas/pull/58
- Branch: `codex/task-0017-policy-authorization-seam`
- Head commit observed when this verifier prompt was written:
  `40c0f8807559cf5da2422225cd67ee63b9be778c`
- Base: `main` at `6bfb18c99023d88a8aa746d2dc3a6e80b702fa11`
- Current PR state: open, ready for review, mergeable, not draft
- Latest observed PR CI run: `26359077449`, all visible checks passed
- Branch content observed: 2 commits ahead of `main`

Observed implementation summary:

- Adds `packages/contracts/src/policy.ts` with policy contract types and
  action/version constants.
- Adds `packages/policy-engine` with `authorize`, `listEffectivePermissions`,
  and `validateRoleAssignment`.
- Adds `apps/policy-worker` with `/health` and three internal JSON policy
  routes.
- Adds `tests/policy-engine` and `tests/policy-worker`.
- Adds Orun component metadata for policy engine, policy Worker, and tests.
- Adds `ai/reports/task-0017-implementer.md`.

Important verification risks:

- The task required unknown future membership facts to be allowed in policy
  contexts without widening access. The observed contract currently types
  `PolicyContext.memberships` as `MembershipFact[]`. Verify whether this is too
  restrictive for the spec contract, and ensure runtime behavior ignores unknown
  fact objects safely instead of throwing or authorizing.
- Scrutinize project/environment scoped actions with missing `projectId`.
  The observed engine appears to allow organization roles to authorize
  project-scoped actions even when `resource.projectId` is absent. Decide
  whether this violates the tenancy/RBAC requirement that project-scoped
  authorization include both `orgId` and `projectId`; fix before merge if it
  does.
- The policy Worker will create new Cloudflare Workers on post-merge deploy.
  Verify stage/prod `workers_dev: false` through Wrangler/Cloudflare evidence
  after merge, not only by reading `wrangler.jsonc`.
- The Worker has no public facade or caller binding yet. Live functional smoke
  through `api-edge` is not expected, but the verifier must still inspect
  deployed Worker state and public exposure after merge.

# Objective

Independently verify PR #58 against Task 0017.

If the PR is production-safe after any strictly Task 0017-scoped verifier
fixes, merge it, wait for the post-merge `main` pipeline, verify the
stage/prod policy Worker deployments and direct-public-exposure boundary, sync
local `main`, update compact orchestration context/state, and write a PASS
report.

If it fails, leave the PR open, do not merge, and write a FAIL report with
concrete blockers. If provider access blocks required live Cloudflare evidence,
write BLOCKED rather than guessing.

# PR Boundary

This verifier task covers PR #58 only.

Allowed verifier changes are limited to:

- `ai/reports/task-0017-verifier.md`;
- small, strictly Task 0017-scoped fixes needed to make PR #58 safe to merge;
- compact orchestration context/state updates after verification is complete.

Do not add membership invitation routes, member administration routes,
membership-to-policy caller wiring, `POLICY_WORKER` service bindings in
existing Workers, api-edge public policy routes, policy persistence, database
migrations, Cloudflare KV, Durable Objects, Queues, R2, audit/event Worker
behavior, UI, SDK, CLI, billing, projects, Terraform resources, new Supabase
resources, AWS resources, S3/Secrets Manager resources, or `specs-v2/**` work.

# Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0017.md`
- `ai/reports/task-0017-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `ai/state.json`
- `ai/reports/task-0016-verifier.md`
- `specs/constitution.md`
- `specs/repo.md`
- `specs/domain-model.md`
- `specs/components/00-foundation-and-tooling.md`
- `specs/components/03-policy-authorization.md`
- `specs/components/04-organizations-membership.md`
- `specs/contracts/api-guidelines.md`
- `specs/contracts/tenancy-and-rbac.md`
- `specs/orun-golden-path.md`
- `packages/contracts/src/tenancy.ts`
- `packages/contracts/src/policy.ts`
- `packages/policy-engine/**`
- `apps/policy-worker/**`
- `tests/policy-engine/**`
- `tests/policy-worker/**`
- `stack-tectonic/compositions/cloudflare-worker-turbo/**`
- PR #58 diff, commits, checks, review state, and CI logs
- GitHub Actions run `26359077449`

# Required Outcomes

## PR Review

- Confirm PR #58 has a real PR number, is based on current `main`, is not
  draft, is mergeable, and has green CI for the final head commit.
- Inspect the actual PR diff, commits, implementer report, and CI logs, not
  only PR summaries.
- Verify the PR is bounded to Task 0017:
  - policy contract types;
  - pure policy engine package;
  - policy Worker wrapper;
  - focused tests;
  - Orun component metadata;
  - implementer report.
- Verify it does not include caller wiring from `api-edge`, `membership-worker`,
  `identity-worker`, or future domain Workers.
- Verify it does not include invitation/member administration behavior, policy
  persistence, database migrations, live infrastructure outside policy Worker
  deployment, audit/event Worker behavior, UI, SDK, CLI, billing, projects, or
  product-specific `specs-v2/**` work.
- Verify no generated/ignored artifacts are committed, including `.orun/**`,
  `plan.json`, `dist/`, `node_modules/`, `.wrangler/`, TypeScript build info,
  Terraform working directories, or aggregate files.
- Verify no raw connection strings, database passwords, Supabase API keys,
  Cloudflare API tokens, AWS credentials, raw invitation tokens, raw bearer
  tokens, raw API keys, token hashes, signing secrets, encryption secrets, or
  Secrets Manager payloads are committed, logged, or returned.

## Contract Review

- Verify `@saas/contracts/policy` models the request and response shape from
  `specs/contracts/tenancy-and-rbac.md`:
  - subject type and ID;
  - action string;
  - resource kind, ID, `orgId`, optional `projectId`, optional
    `environmentId`;
  - context membership facts;
  - allow/deny result, stable reason, `policyVersion`, and derived scope.
- Verify it reuses existing tenancy role/fact types instead of creating a
  conflicting role taxonomy.
- Verify unknown future fact objects can be present without widening access.
  If the TypeScript contract or runtime behavior makes this impossible or
  unsafe, fix or fail the PR.
- Verify public IDs remain opaque. The policy contract and engine must not
  parse `org_`, `usr_`, `prj_`, or database UUID formats.
- Verify the contracts package exports remain stable and existing auth,
  tenancy, membership, health, and error exports still work.

## Policy Engine Review

- Verify the engine is pure, deterministic, side-effect free, and import-clean:
  no Worker handlers, `api-edge`, membership Worker code, database
  repositories, Hyperdrive, Terraform, Wrangler, or runner-only code.
- Verify `authorize(input)` is deny-by-default.
- Verify unknown actions, unknown roles, invalid scopes, missing scopes, and
  malformed future fact objects fail safely.
- Verify cross-organization facts never authorize access to another
  organization.
- Verify project/environment scoped actions require an explicit project scope
  where the tenancy contract requires it. In particular, test/inspect missing
  or mismatched `resource.projectId` behavior for:
  - `project.read`;
  - `project.update`;
  - `project.delete`;
  - `environment.read`;
  - `environment.update`.
- Verify organization roles and project roles match the Task 0017 V1 matrix:
  - owner full org/member/invitation/project/environment/billing access;
  - admin operational and membership access but no billing manage unless
    explicitly justified and tested;
  - builder operational create/update/read but no member, invitation, settings,
    or billing management;
  - viewer read-only;
  - billing_admin billing and org read only;
  - project roles apply only to matching project scope.
- Verify `project.create` is treated as an organization-scoped action and does
  not require an existing `projectId`.
- Verify reason codes are stable and covered by tests.
- Verify every authorization response returns `policyVersion: 1` and a correct
  derived scope.
- Verify `listEffectivePermissions(input)` does not accidentally grant
  permissions outside the requested scope and handles combined role facts
  predictably.
- Verify `validateRoleAssignment(input)` enforces:
  - organization roles only at organization scope;
  - project roles require project scope and `projectId`;
  - all roles require `orgId`;
  - unknown role or scope kinds fail safely.

## Policy Worker Review

- Verify `@saas/policy-worker` follows existing Worker app patterns for
  package scripts, TypeScript config, entry point, and component metadata.
- Verify `apps/policy-worker/component.yaml` is a
  `cloudflare-worker-turbo` component with Node 22 and pnpm 10.12.1, verifies
  in `dev`/`stage`/`prod`, and deploys `stage`/`prod` on
  `github-push-main`.
- Verify `wrangler.jsonc` has:
  - base/local `ENVIRONMENT=local`;
  - `dev` `ENVIRONMENT=dev`;
  - `stage` `ENVIRONMENT=stage` and `workers_dev: false`;
  - `prod` `ENVIRONMENT=prod` and `workers_dev: false`;
  - no Hyperdrive binding and no provider credentials.
- Verify `GET /health` returns service name, environment, timestamp, and policy
  version without secrets, hostnames, raw errors, tokens, or provider internals.
- Verify the Worker exposes only the intended internal JSON routes:
  - `POST /v1/internal/policy/authorize`;
  - `POST /v1/internal/policy/effective-permissions`;
  - `POST /v1/internal/policy/role-assignments/validate`;
  - `GET /health`.
- Verify request ID generation/preservation is safe and consistent with repo
  conventions.
- Verify malformed JSON and invalid bodies return safe `bad_request` or
  `validation_failed` error envelopes.
- Verify authorization denials return HTTP 200 with `allow: false`, not HTTP
  errors.
- Verify catch-all failures return generic safe errors without stack traces,
  raw exception messages, tokens, connection strings, or provider details.
- Verify the Worker is not publicly usable after merge:
  - stage/prod direct `workers.dev` access should be disabled or return
    Cloudflare's disabled-route response;
  - if any public route exists, block or fix unless it is protected by a
    task-scoped, production-safe internal authentication mechanism.

## Tests Review

- Verify policy engine tests cover:
  - deny-by-default for unknown actions and missing facts;
  - owner/admin/builder/viewer/billing_admin organization semantics;
  - project role semantics with matching and mismatched `orgId`/`projectId`;
  - missing `projectId` behavior for project/environment scoped actions;
  - cross-organization denial;
  - unknown future facts being ignored;
  - stable reason and `policyVersion` values;
  - `listEffectivePermissions` output for common role combinations;
  - `validateRoleAssignment` success and failure cases.
- Verify policy Worker tests cover:
  - health response;
  - valid authorize request success envelope;
  - denied authorization as HTTP 200 with `allow: false`;
  - malformed JSON and invalid bodies;
  - request ID generation/preservation;
  - safe error redaction;
  - `workers_dev: false` for stage/prod.
- Verify tests do not require live Cloudflare, Supabase, Hyperdrive, AWS, or
  GitHub access.
- Add focused verifier fixes/tests if a small gap blocks confidence and is
  strictly within Task 0017 scope.

## Orun, CI, And Deployment Review

- Run local targeted checks and Orun checks listed below.
- Inspect PR CI logs with `gh`, including successful jobs, to confirm expected
  commands actually ran.
- Verify PR CI logs show policy-related verify jobs only; no migration apply,
  Terraform apply, Supabase, AWS, S3, Secrets Manager, Hyperdrive, KV, Durable
  Object, Queue, or R2 jobs should run.
- Verify the rendered changed plan includes only policy Worker/engine/tests,
  contracts, and unavoidable dependency jobs.
- If verifier fixes are committed to the PR branch, push and wait for CI to
  pass again before merging.
- After merge, wait for the `main` CI run to complete.
- Inspect main CI logs and confirm `policy-worker` stage/prod deploy jobs ran.
- Independently inspect Cloudflare Worker state after merge. Record non-secret
  observed state in the report, including Worker names, environments, version
  or deployment identifiers where available, and `workers_dev` disabled/public
  direct-access behavior.

# Verification Commands

Run at minimum:

```bash
pnpm --filter @saas/contracts typecheck
pnpm --filter @saas/contracts-tests test
pnpm --filter @saas/policy-engine typecheck
pnpm --filter @saas/policy-engine-tests test
pnpm --filter @saas/policy-worker typecheck
pnpm --filter @saas/policy-worker-tests test
pnpm --filter @saas/policy-worker build
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
git diff --check
```

Also inspect PR CI logs:

```bash
gh run view 26359077449 --log
```

If package names or run IDs differ after verifier fixes, run the equivalent
commands and record the final values.

# Merge Protocol

If verification passes:

1. Merge PR #58 using the repository's normal merge method.
2. Wait for the post-merge `main` CI run and inspect logs.
3. Verify deployed policy Worker stage/prod state and public exposure directly
   through Wrangler/Cloudflare and safe HTTP checks.
4. Checkout `main` locally and fast-forward pull from `origin/main`.
5. Update compact context:
   - `ai/context/current.md`;
   - `ai/context/task-ledger.md`;
   - `ai/context/decisions.md` if new durable decisions were made;
   - `ai/context/open-risks.md` for resolved/new risks.
6. Update `ai/state.json`:
   - add `"0017"` to `completed`;
   - set `repo_health` based on verified state;
   - set `next_focus` to the next likely roadmap area;
   - set `last_verified` to `2026-05-24`;
   - set `waiting_for_input` to `"false"`;
   - set `task_agent` to `ai/reports/task-0017-verifier.md` after writing the
     verifier report.
7. Ensure the local repo is clean except for pre-existing unrelated untracked
   orchestration artifacts. Do not leave the task branch checked out.

If verification fails:

1. Leave PR #58 open.
2. Do not merge.
3. Write `ai/reports/task-0017-verifier.md` with `Result: FAIL` and concrete
   blockers.
4. Update `ai/state.json` `task_agent` to the verifier report path after
   writing it.

# When Done Report

Write `ai/reports/task-0017-verifier.md`:

```md
# Task 0017 Verifier Report

## Result: PASS|FAIL

## Checks

## Issues

## Risk Notes

## Spec Proposals

## Recommended Next Move
```

Include PR number, final head SHA, CI run IDs, local checks, merge status, and
Cloudflare non-secret observed state when applicable. If PASS, note the merge
commit and post-merge main CI result. If FAIL, list blockers before any
summary.
