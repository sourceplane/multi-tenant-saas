# Task ID

Task 0014 Verifier

# Agent

Verifier

# Current Repo Context

The reusable SaaS starter spec pack under `specs/**` is authoritative for this
verification. `specs-v2/**` is out of scope.

Task 0014 implementation is open as PR #55:

- URL: https://github.com/sourceplane/multi-tenant-saas/pull/55
- Branch: `codex/task-0014-api-edge-auth-facade`
- Head commit observed when this verifier prompt was written:
  `73e608c2661223551e7f4e248f5a5463d0f75f8d`
- Base: `main` at `6e8d50872ac0850fce1b884b2e11f39610b1fee8`
- Current PR state: open, ready for review, mergeable, not draft
- Latest observed PR CI run: `26350978090`, all visible checks passed
- Branch content observed: 2 commits ahead of `origin/main`, 0 behind

Observed implementation summary:

- Adds `apps/api-edge/src/auth-facade.ts` and `apps/api-edge/src/http.ts`.
- Extends `apps/api-edge/src/env.ts` with `IDENTITY_WORKER?: Fetcher`.
- Routes the four existing auth paths from `api-edge` to
  `env.IDENTITY_WORKER.fetch(...)`.
- Adds stage/prod `IDENTITY_WORKER` service bindings in
  `apps/api-edge/wrangler.jsonc`:
  - stage -> `identity-worker-stage`
  - prod -> `identity-worker-prod`
- Extends `apps/api-edge/scripts/verify-bindings.mjs` to check service binding
  targets and cross-environment mistakes.
- Adds `tests/api-edge` with 30 Jest tests and a dev-only Orun component.
- Adds `ai/reports/task-0014-implementer.md`.

Important verification risks:

- Confirm the Cloudflare service-binding config syntax is accepted by the
  installed Wrangler and actually appears in stage/prod dry-run output.
- Confirm PR CI uses verify/dry-run only and does not deploy or mutate live
  Worker bindings on pull requests.
- Confirm the facade preserves method, path, query, body, `Authorization`,
  `Content-Type`, valid `X-Request-Id`, `traceparent`, and `Idempotency-Key`
  without logging, parsing, or storing secrets.
- Confirm `api-edge` stays a pure transport facade: no imports from
  `apps/identity-worker`, no identity repository import, no direct identity DB
  access, and no duplicated auth logic.
- Confirm dev/local missing service binding produces a safe envelope error and
  stage/prod are not cross-bound.
- After merge, verify live stage/prod `api-edge` deployments and exercise auth
  through `api-edge`, not directly through `identity-worker`.
- Stage may expose a one-time debug login code via the identity-worker
  downstream response. Prod must not expose raw debug codes through `api-edge`.

# Objective

Independently verify PR #55 against Task 0014.

If the PR is production-safe after any strictly Task 0014-scoped verifier fixes,
merge it, wait for the `main` merge pipeline, verify the `api-edge` stage/prod
deployments and live auth facade behavior, sync local `main`, update compact
orchestration context/state, and write a PASS report.

If it fails, leave the PR open, do not merge, and write a FAIL report with
concrete blockers. If provider access blocks required live Worker evidence,
write BLOCKED rather than guessing.

# PR Boundary

This verifier task covers PR #55 only.

Allowed verifier changes are limited to:

- `ai/reports/task-0014-verifier.md`;
- small, strictly Task 0014-scoped fixes needed to make PR #55 safe to merge;
- compact orchestration context/state updates after verification is complete.

Do not add new identity behavior, API keys, service principals, organizations,
memberships, policy, projects, billing, notifications, webhooks, SDK, CLI, UI,
email delivery, rate limiting, custom domains, Terraform provisioning,
Supabase resources, Cloudflare resources, AWS/S3/Secrets Manager resources, or
`specs-v2/**` work.

# Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0014.md`
- `ai/reports/task-0014-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `ai/state.json`
- `ai/reports/task-0013-verifier.md`
- `specs/repo.md`
- `specs/components/00-foundation-and-tooling.md`
- `specs/components/01-edge-api.md`
- `specs/components/02-identity.md`
- `specs/contracts/api-guidelines.md`
- `specs/contracts/tenancy-and-rbac.md`
- `specs/orun-golden-path.md`
- `apps/api-edge/**`
- `apps/identity-worker/wrangler.jsonc`
- `apps/identity-worker/src/router.ts`
- `packages/contracts/src/auth.ts`
- `tests/api-edge/**`
- PR #55 diff, commits, checks, review state, and CI logs
- GitHub Actions run `26350978090`
- Current Wrangler config schema or Cloudflare docs before treating service
  binding syntax as valid or invalid.

# Required Outcomes

## PR Review

- Confirm PR #55 has a real PR number, is based on current `main`, is not
  draft, is mergeable, and has green CI for the final head commit.
- Inspect the actual PR diff, commits, implementer report, and CI logs, not
  only PR summaries.
- Verify the PR is bounded to Task 0014:
  - `api-edge` auth facade routing;
  - service-binding configuration and validation;
  - focused `api-edge` tests;
  - no identity-worker behavior changes;
  - no out-of-scope domain/product/infra work.
- Verify no generated/ignored artifacts are committed, including `.orun/**`,
  `plan.json`, `dist/`, `node_modules/`, `.wrangler/`, TypeScript build info,
  Terraform working directories, or aggregate files.
- Verify no raw connection strings, database passwords, Supabase API keys,
  Cloudflare API tokens, AWS credentials, raw bearer tokens, token hashes, code
  hashes, raw login codes, signing secrets, encryption secrets, or Secrets
  Manager payloads are committed, logged, or returned outside the allowed
  stage debug-code downstream response.

## Service Binding Configuration Review

- Verify `apps/api-edge/wrangler.jsonc` has:
  - no `IDENTITY_WORKER` service binding in base/local or dev unless a safe
    local-only binding is explicitly justified;
  - stage service binding `IDENTITY_WORKER -> identity-worker-stage`;
  - prod service binding `IDENTITY_WORKER -> identity-worker-prod`;
  - existing stage/prod `SOURCEPLANE_DB` Hyperdrive IDs preserved;
  - `ENVIRONMENT` vars still match their environment names.
- Verify the installed Wrangler schema accepts the `services` binding shape.
- Run or inspect `verify-bindings` and confirm it detects missing service
  bindings and stage/prod cross-binding mistakes.
- Inspect Wrangler dry-run output for `dev`, `stage`, and `prod`:
  - dev should not bind a live stage/prod identity service;
  - stage should show `identity-worker-stage`;
  - prod should show `identity-worker-prod`.
- Verify the composition path uses `--env {{ .orun.environment.name }}` and the
  dead component `dryRunCommand`/`deployCommand` parameters do not force prod
  bindings during stage verification/deploy.

## Auth Facade Behavior Review

- Verify only these routes are forwarded:
  - `POST /v1/auth/login/start`
  - `POST /v1/auth/login/complete`
  - `GET /v1/auth/session`
  - `POST /v1/auth/logout`
- Verify unsupported methods for these routes return a standard public error
  envelope with semantic code `unsupported`.
- Verify unknown auth and non-auth routes return a standard public error
  envelope with semantic code `not_found`.
- Verify the facade preserves method, pathname, query string, JSON body,
  `Authorization`, `Content-Type`, valid `X-Request-Id`, `traceparent`, and
  `Idempotency-Key` when forwarding.
- Verify invalid incoming request IDs are not forwarded as trusted IDs and a
  generated safe `req_` request ID is used instead.
- Verify downstream success and semantic error envelopes are passed through
  with status code and body intact.
- Verify missing `IDENTITY_WORKER` and thrown service-binding errors return a
  safe envelope error without raw exception messages, Worker names, hostnames,
  connection details, stack traces, bearer tokens, login codes, or hashes.
- Verify `/health` remains safe, reports `api-edge`, preserves database health
  behavior, and does not call or leak downstream identity response bodies.
- Decide whether `/health` should reject non-GET methods in this PR. Do not
  fail solely for preserving pre-existing behavior unless it creates a new
  Task 0014 regression.

## Boundary And Import Review

- Verify `apps/api-edge` does not import from:
  - `apps/identity-worker/**`;
  - `@saas/db/identity`;
  - identity repository internals;
  - identity Worker auth services, route handlers, crypto helpers, or ID
    mapping helpers.
- Verify `api-edge` does not query identity tables or own login/session
  business logic.
- Verify `api-edge` only forwards transport-level auth requests and does not
  parse, hash, generate, store, or validate raw bearer tokens or login codes.
- Verify any shared contract changes are minimal and reusable.

## Tests Review

- Verify `tests/api-edge` exercises the real `api-edge` facade modules rather
  than only copied logic.
- Verify tests cover:
  - each supported auth route;
  - method/path/query/body/header preservation;
  - downstream success envelope pass-through;
  - downstream error envelope pass-through;
  - missing service binding;
  - thrown service-binding error redaction;
  - unsupported auth methods and unknown routes;
  - generated and preserved request IDs;
  - safe `/health` behavior;
  - config verification for stage/prod service targets.
- Verify tests do not require live Cloudflare, Supabase, Hyperdrive, or
  identity-worker access.
- Verify any fake service binding avoids broad unsafe casts where a simple
  local interface would prove the same behavior more clearly. Do not fail
  solely for test-only casts unless they hide a real runtime mismatch.
- Verify the new `api-edge-tests` Orun component is first-class, dev-scoped,
  and does not add an unsound cross-environment dependency edge.

## Orun And CI Review

- Inspect PR CI run `26350978090` logs. Confirm pull-request jobs are verify
  only and do not deploy live Workers or mutate live bindings.
- Inspect the rendered changed PR plan and confirm it includes:
  - `api-edge` in dev/stage/prod verify profile;
  - `api-edge-tests` in dev quick-check/verify;
  - no Terraform, db-migrate, Supabase, Hyperdrive provisioning, or live apply
    jobs.
- Run local Orun validation/changed-plan/dry-run as needed to independently
  confirm the DAG and profiles.
- Inspect the rendered main/push behavior before merge. Confirm stage/prod
  `api-edge` deploy profile will run after merge through Orun and will select
  the environment-specific Wrangler env.

## Merge And Live Verification

If the PR passes review:

- Merge PR #55 using the repository's normal merge method.
- Wait for the post-merge `main` pipeline to finish.
- Confirm the `main` pipeline deployed `api-edge` stage and prod with the
  expected service bindings.
- Inspect Cloudflare Worker state or deployment output for non-secret evidence:
  - stage `api-edge` has `IDENTITY_WORKER -> identity-worker-stage`;
  - prod `api-edge` has `IDENTITY_WORKER -> identity-worker-prod`;
  - existing Hyperdrive bindings remain correct.
- Exercise live stage through the `api-edge` URL:
  - `POST /v1/auth/login/start` returns an envelope with `delivery.mode`
    `local_debug` and a one-time debug `code`;
  - `POST /v1/auth/login/complete` with that challenge/code returns a bearer
    token once;
  - `GET /v1/auth/session` with the token returns session/user data;
  - `POST /v1/auth/logout` revokes the token;
  - `GET /v1/auth/session` with the same token returns `unauthenticated`.
- Exercise live prod through the `api-edge` URL:
  - `POST /v1/auth/login/start` succeeds through the facade;
  - response has `delivery.mode` `email`;
  - response has no raw `code` field.
- Verify live `/health` for stage and prod remains safe and does not leak
  downstream response bodies or secrets.
- Sync local `main` after merge.

# Required Checks

Run the checks needed to independently prove the changed surface. At minimum:

```bash
pnpm install --frozen-lockfile
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
pnpm --filter @saas/api-edge exec wrangler deploy --dry-run --config wrangler.jsonc --env dev
pnpm --filter @saas/api-edge exec wrangler deploy --dry-run --config wrangler.jsonc --env stage
pnpm --filter @saas/api-edge exec wrangler deploy --dry-run --config wrangler.jsonc --env prod
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
git diff --check
```

Also inspect GitHub Actions logs for PR run `26350978090` and the post-merge
main run if the PR is merged.

# Reporting

Write `ai/reports/task-0014-verifier.md` with:

- Result: PASS, FAIL, or BLOCKED.
- PR details: URL, branch, base/head SHAs, merge commit if merged, PR CI run,
  and main CI run if merged.
- Scope review and changed files.
- Service-binding and Wrangler config evidence.
- Auth facade behavior evidence.
- Tests and local checks run with exact results.
- Orun/CI profile evidence.
- Live stage/prod verification evidence after merge, if merged.
- Secret-handling review.
- Verifier fixes, if any.
- Remaining gaps.

If PASS after merge, update compact orchestration context:

- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/open-risks.md`
- `ai/state.json`
- `ai/waiting_for_input.md` if its status text is stale

Set `ai/state.json.task_agent` to the verifier report path after writing the
report.
