# Task ID

Task 0016 Verifier

# Agent

Verifier

# Current Repo Context

The reusable SaaS starter spec pack under `specs/**` is authoritative for this
verification. `specs-v2/**` is out of scope.

Task 0016 implementation is open as PR #57:

- URL: https://github.com/sourceplane/multi-tenant-saas/pull/57
- Branch: `codex/task-0016-membership-worker-org-runtime`
- Head commit observed when this verifier prompt was written:
  `6a70c7a952cd545db4c4d1c24421efb149b334d1`
- Base: `main` at `2e56bad2f008ddb3bb5e980cd39a98d699d1e141`
- Current PR state: open, ready for review, mergeable, not draft
- Latest observed PR CI run: `26354210715`, all visible checks passed
- Branch content observed: 2 commits ahead of `main`

Observed implementation summary:

- Adds `apps/membership-worker` with organization create/list/read runtime.
- Adds `MEMBERSHIP_WORKER` service bindings from `api-edge` to
  `membership-worker-stage` and `membership-worker-prod`.
- Adds `apps/api-edge/src/org-facade.ts` to resolve sessions through
  `IDENTITY_WORKER` and forward actor headers to `MEMBERSHIP_WORKER`.
- Adds public membership contract types under `@saas/contracts/membership`.
- Adds `tests/membership-worker` and `tests/api-edge/src/org-facade.test.ts`.
- Adds `ai/reports/task-0016-implementer.md`.

Important verification risks:

- `membership-worker` trusts `x-actor-subject-id` and
  `x-actor-subject-type` headers. Its `wrangler.jsonc` does not currently show
  an explicit `workers_dev = false` / public-exposure control. If the Worker is
  publicly reachable, any caller can spoof those headers and create or read
  organizations as any subject. Do not merge unless direct public access is
  impossible, cryptographically protected, or fixed in this PR.
- `api-edge` and `membership-worker` deploy in the same main push plan, but
  `api-edge/component.yaml` does not visibly declare a `dependsOn` edge to
  `membership-worker`. Verify the rendered DAG/order or prove Cloudflare
  service bindings tolerate binding to the named Worker before the new version
  is deployed.
- Auto-generated slugs are not revalidated after slicing to 63 characters.
  Verify long names cannot produce invalid trailing-hyphen slugs that pass into
  persistence.
- `GET /v1/organizations/{orgId}` gates access through active role assignments,
  not active membership status. Decide whether this satisfies Task 0016's
  "active membership/role fact" boundary or needs a narrow fix.
- Task 0016 intentionally does not implement audit/events for
  `organization.created`; the verifier should document this constitutional gap
  as a follow-up only if the rest of the slice is safe.

# Objective

Independently verify PR #57 against Task 0016.

If the PR is production-safe after any strictly Task 0016-scoped verifier
fixes, merge it, wait for the post-merge `main` pipeline, verify the stage/prod
Worker deployments and service bindings, run live non-secret smoke checks
through `api-edge`, sync local `main`, update compact orchestration
context/state, and write a PASS report.

If it fails, leave the PR open, do not merge, and write a FAIL report with
concrete blockers. If provider access blocks required live Cloudflare or API
evidence, write BLOCKED rather than guessing.

# PR Boundary

This verifier task covers PR #57 only.

Allowed verifier changes are limited to:

- `ai/reports/task-0016-verifier.md`;
- small, strictly Task 0016-scoped fixes needed to make PR #57 safe to merge;
- compact orchestration context/state updates after verification is complete.

Do not add invitation routes, member administration, role update routes, policy
Worker behavior, project behavior, billing, notifications, webhooks,
audit/event worker behavior, UI, SDK, CLI, Terraform resources, new Supabase
resources, new Cloudflare resources outside the Worker/binding deployment, AWS
resources, S3/Secrets Manager resources, database migrations, or
`specs-v2/**` work.

# Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0016.md`
- `ai/reports/task-0016-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `ai/state.json`
- `ai/reports/task-0015-verifier.md`
- `specs/constitution.md`
- `specs/repo.md`
- `specs/domain-model.md`
- `specs/components/00-foundation-and-tooling.md`
- `specs/components/01-edge-api.md`
- `specs/components/02-identity.md`
- `specs/components/03-policy-authorization.md`
- `specs/components/04-organizations-membership.md`
- `specs/contracts/api-guidelines.md`
- `specs/contracts/tenancy-and-rbac.md`
- `specs/orun-golden-path.md`
- `apps/api-edge/**`
- `apps/identity-worker/src/handlers/session.ts`
- `apps/identity-worker/wrangler.jsonc`
- `apps/membership-worker/**`
- `packages/db/src/membership/**`
- `packages/db/src/hyperdrive/**`
- `packages/contracts/src/auth.ts`
- `packages/contracts/src/membership.ts`
- `packages/contracts/src/tenancy.ts`
- `tests/api-edge/**`
- `tests/membership-worker/**`
- `stack-tectonic/compositions/cloudflare-worker-turbo/**`
- PR #57 diff, commits, checks, review state, and CI logs
- GitHub Actions run `26354210715`

# Required Outcomes

## PR Review

- Confirm PR #57 has a real PR number, is based on current `main`, is not
  draft, is mergeable, and has green CI for the final head commit.
- Inspect the actual PR diff, commits, implementer report, and CI logs, not
  only PR summaries.
- Verify the PR is bounded to Task 0016:
  - membership Worker runtime;
  - api-edge organization facade and service binding;
  - public organization contract types;
  - focused membership-worker and api-edge tests;
  - Orun component metadata for the new Worker/test package.
- Verify it does not include invitation management, member administration,
  policy Worker behavior, project behavior, audit/event worker behavior,
  billing, notifications, webhooks, UI, SDK, CLI, Terraform provisioning,
  database migrations, or product-specific `specs-v2/**` work.
- Verify no generated/ignored artifacts are committed, including `.orun/**`,
  `plan.json`, `dist/`, `node_modules/`, `.wrangler/`, TypeScript build info,
  Terraform working directories, or aggregate files.
- Verify no raw connection strings, database passwords, Supabase API keys,
  Cloudflare API tokens, AWS credentials, raw invitation tokens, raw bearer
  tokens, raw API keys, token hashes, signing secrets, encryption secrets, or
  Secrets Manager payloads are committed, logged, or returned.

## Security And Boundary Review

- Verify `api-edge` resolves bearer sessions through `IDENTITY_WORKER` and does
  not import identity Worker handlers, identity services, or `@saas/db/identity`.
- Verify `api-edge` does not import `@saas/db/membership` or query membership
  tables directly.
- Verify raw bearer tokens are not forwarded to `membership-worker`.
- Verify `x-request-id`, `traceparent`, and `Idempotency-Key` handling matches
  Task 0016 without leaking secrets.
- Verify `membership-worker` does not import identity Worker code or query
  identity tables.
- Block merge unless one of these is true:
  - `membership-worker` is not reachable from public `workers.dev` or routes,
    and service binding calls still work; or
  - direct public calls cannot spoof actor context because they are protected
    by a task-scoped, production-safe internal authentication mechanism; or
  - the PR is fixed so organization routes cannot trust caller-controlled
    `x-actor-*` headers from public traffic.
- Use Wrangler/Cloudflare evidence for public exposure. Do not rely only on the
  implementer report's assertion. If direct access exists, test that a request
  with forged `x-actor-*` headers cannot create/list/read organizations.
- Verify health endpoints do not leak downstream response bodies, raw errors,
  connection strings, hostnames, tokens, hashes, or provider internals.
- Verify semantic error envelopes are used for organization routes.

## Membership Worker Behavior Review

- Verify `POST /v1/organizations`:
  - requires a resolved authenticated user actor;
  - validates JSON, `name`, and optional `slug`;
  - normalizes slug lookup with `slugLower`;
  - generates UUID storage IDs with Web Crypto for org/member/role assignment;
  - returns public `org_<hex>` IDs and never raw UUIDs in the public API;
  - stores the identity public user ID as opaque membership `subjectId`;
  - calls `bootstrapOrganization` exactly for all-or-nothing org + creator
    member + owner role assignment;
  - maps repository conflict/internal outcomes to safe semantic API errors.
- Verify slug edge cases:
  - uppercase explicit slugs are either rejected or normalized consistently;
  - generated slugs cannot end with `-` after truncation;
  - generated slugs cannot be empty or invalid for one-character/non-ASCII
    names;
  - conflict behavior is deterministic for case-insensitive duplicates.
- Verify `GET /v1/organizations` lists only organizations for the current
  actor's subject ID.
- Verify `GET /v1/organizations/{orgId}`:
  - rejects malformed public IDs safely;
  - avoids cross-tenant existence leaks;
  - checks the current actor's active membership/role fact for the requested
    organization;
  - does not permit access through stale/revoked role assignments if that can
    happen with current repository behavior.
- Verify returned errors never include raw SQL errors, connection details,
  hostnames, usernames, token material, token hashes, stack traces, or provider
  internals.
- Verify the Worker runtime source is free of Node-only migration runner
  imports and remains Worker-safe.

## API Edge Facade Review

- Verify only these public routes are added:
  - `POST /v1/organizations`;
  - `GET /v1/organizations`;
  - `GET /v1/organizations/{orgId}`.
- Verify unsupported methods and unknown organization subroutes return standard
  public error envelopes and do not call downstream Workers unnecessarily.
- Verify session resolution failure maps to safe `unauthenticated` errors.
- Verify missing/throwing service bindings map to safe 503 envelopes.
- Verify downstream membership success and semantic error envelopes pass
  through with appropriate status and headers.
- Verify `apps/api-edge/scripts/verify-bindings.mjs` catches missing,
  swapped, or cross-environment `MEMBERSHIP_WORKER` service targets.
- Verify `api-edge` `/health` remains safe and accurately reports configured
  identity and membership bindings without leaking provider details.

## Contract Review

- Verify `packages/contracts/src/membership.ts` contains only the public
  organization types needed by this task.
- Verify no invitation, member-admin, role-update, policy, project, billing,
  audit, SDK, CLI, or UI contracts are introduced.
- Verify membership response shapes match the standard envelope style already
  used by auth.
- Verify contracts package exports are stable and contract tests still pass.

## Tests Review

- Verify `tests/membership-worker` covers the Task 0016 runtime surface:
  - health behavior with and without DB binding;
  - missing actor context;
  - create organization bootstrap arguments;
  - storage UUID vs public `org_` ID mapping;
  - slug normalization and validation, including long/generated edge cases;
  - conflict/not-found/internal repository mapping;
  - list organizations by current subject;
  - get organization tenant isolation;
  - safe error redaction.
- Verify `tests/api-edge` covers:
  - session resolution through `IDENTITY_WORKER`;
  - actor context forwarded to `MEMBERSHIP_WORKER`;
  - raw bearer token not forwarded;
  - missing identity/membership bindings;
  - downstream success/error passthrough;
  - unsupported methods and unknown org subroutes;
  - binding verification for membership service targets.
- Verify tests do not require live Cloudflare, Supabase, Hyperdrive, or AWS
  access.
- If the tests miss the public-exposure/spoofing risk, add a focused test or
  require a fix before merge.

## Orun And CI Review

- Inspect PR CI run `26354210715` logs. Confirm pull-request Worker jobs are
  verify/dry-run only and do not deploy live Workers or mutate live bindings.
- Inspect the rendered changed PR plan and confirm it includes:
  - `membership-worker` in dev/stage/prod verify-deploy;
  - `api-edge` in dev/stage/prod verify-deploy;
  - `membership-worker-tests` in dev verify;
  - `api-edge-tests` in dev verify;
  - `contracts` in dev/stage/prod verify.
- Verify `github-push-main` will deploy stage/prod `membership-worker` and
  stage/prod `api-edge` through `cloudflare-worker-turbo`.
- Verify deploy ordering:
  - If the rendered DAG has no explicit dependency from `api-edge` to
    `membership-worker`, prove that service binding deployment is still safe
    because Cloudflare can bind to an existing named Worker before the current
    push's new version deploys; or add a narrow same-environment dependency
    edge if Orun supports it safely.
  - Do not add unsound dev-only test dependencies to stage/prod components.
- Verify the dead `dryRunCommand`/`deployCommand` component parameters remain
  overridden by composition behavior and do not force `--env prod` in PR or
  stage jobs.

## Merge And Live Verification

If the PR passes review:

- Merge PR #57 using the repository's normal merge method.
- Wait for the post-merge `main` pipeline to finish.
- Verify `membership-worker-stage` and `membership-worker-prod` were deployed
  by the main pipeline with the expected non-secret bindings:
  - stage `SOURCEPLANE_DB` → `08f7c6055f544a3890a585d88fd92348`;
  - prod `SOURCEPLANE_DB` → `ab2c21c2db6245a59c91588fcac7107a`;
  - correct `ENVIRONMENT` values.
- Verify `api-edge` stage/prod were redeployed with:
  - existing `IDENTITY_WORKER` binding to the same-environment identity Worker;
  - new `MEMBERSHIP_WORKER` binding to the same-environment membership Worker;
  - existing Hyperdrive binding preserved.
- Run live non-secret smoke checks through public `api-edge`:
  - `/health` reports database reachable and identity/membership configured in
    stage and prod;
  - stage auth flow can obtain a session through api-edge debug delivery;
  - stage `POST /v1/organizations` through api-edge succeeds with that session;
  - stage `GET /v1/organizations` lists the created org;
  - stage `GET /v1/organizations/{orgId}` returns the created org;
  - unauthenticated organization routes return `unauthenticated`;
  - prod auth remains debug-disabled and does not expose raw codes.
- Verify direct public access to `membership-worker` cannot spoof actor
  headers. If the Worker has a public URL and forged `x-actor-*` headers can
  trigger organization behavior, fail the PR or apply a narrow fix before
  merge.
- Inspect live non-secret database state only as needed to confirm no
  accidental schema/migration changes and to confirm the stage smoke-created
  organization/member/role rows are consistent. Do not print secrets or token
  values.
- Sync local `main` after merge.

# Required Checks

Run the checks needed to independently prove the changed surface. At minimum:

```bash
pnpm install --frozen-lockfile
pnpm --filter @saas/membership-worker build
pnpm --filter @saas/membership-worker typecheck
pnpm --filter @saas/membership-worker lint
pnpm --filter @saas/membership-worker-tests test
pnpm --filter @saas/membership-worker-tests typecheck
pnpm --filter @saas/membership-worker-tests lint
pnpm --filter @saas/api-edge build
pnpm --filter @saas/api-edge typecheck
pnpm --filter @saas/api-edge lint
pnpm --filter @saas/api-edge verify-bindings
pnpm --filter @saas/api-edge-tests test
pnpm --filter @saas/api-edge-tests typecheck
pnpm --filter @saas/api-edge-tests lint
pnpm --filter @saas/contracts build
pnpm --filter @saas/contracts typecheck
pnpm --filter @saas/contracts lint
pnpm --filter @saas/contracts-tests test
pnpm --filter @saas/contracts-tests typecheck
pnpm --filter @saas/contracts-tests lint
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
git diff --check
```

Also inspect GitHub Actions logs for PR run `26354210715` and the post-merge
main run if the PR is merged.

# Reporting

Write `ai/reports/task-0016-verifier.md` with:

- Result: PASS, FAIL, or BLOCKED.
- PR details: URL, branch, base/head SHAs, merge commit if merged, PR CI run,
  and main CI run if merged.
- Scope review and changed files.
- Security/boundary review, especially actor headers, public Worker exposure,
  and bearer-token handling.
- Membership Worker behavior review.
- API edge facade review.
- Contract review.
- Tests and local checks run with exact results.
- Orun/CI profile and deploy-order evidence.
- Live Cloudflare/API/database evidence if merged.
- Secret-handling review.
- Verifier fixes, if any.
- Remaining gaps, including invitations, member administration, policy Worker,
  audit/events, and durable idempotency.

If PASS after merge, update compact orchestration context:

- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/open-risks.md`
- `ai/state.json`
- `ai/waiting_for_input.md` if its status text is stale

Set `ai/state.json.task_agent` to the verifier report path after writing the
report.
