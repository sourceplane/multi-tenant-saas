# Task ID

Task 0013 Verifier

# Agent

Verifier

# Current Repo Context

The reusable SaaS starter spec pack under `specs/**` is authoritative for this
verification. `specs-v2/**` is out of scope.

Task 0013 implementation is open as PR #54:

- URL: https://github.com/sourceplane/multi-tenant-saas/pull/54
- Branch: `codex/task-0013-identity-worker-auth-runtime`
- Head commit observed when this verifier prompt was written:
  `35a5991f0a91b82540ffd240815a0d6c88f13533`
- Base: `main` at `088a7bd409542f8c26bb6bc625a9a67b6aac6e5f`
- Current PR state: open, ready for review, mergeable, not draft
- Latest observed PR CI run: `26343451814`, all visible checks passed
- Branch content observed: 2 commits ahead of `origin/main`, 0 behind

Observed implementation summary:

- Adds `apps/identity-worker` with `/health`,
  `POST /v1/auth/login/start`, `POST /v1/auth/login/complete`,
  `GET /v1/auth/session`, and `POST /v1/auth/logout`.
- Adds auth contract types in `packages/contracts/src/auth.ts`.
- Adds `tests/identity-worker` with Jest tests and Orun component metadata.
- Adds `ai/reports/task-0013-implementer.md`.
- No Terraform, new Supabase project, new Hyperdrive resource, api-edge facade,
  organization, membership, project, policy, billing, notification, webhook,
  UI, SDK, CLI, or `specs-v2/**` source changes were observed in the PR file
  list.

Important verification risks:

- Task 0012 identity tables use UUID primary keys, while Task 0013 code
  generates IDs with public prefixes such as `usr_`, `chl_`, `ses_`, and
  `aid_` and passes those IDs directly into repository create methods. A fake
  repository will not catch a live UUID/type mismatch. Verify live stage
  `login/start` before passing this PR.
- The identity-worker tests currently re-implement the auth service logic
  instead of importing `apps/identity-worker/src/services/auth.ts`. Decide
  whether this fails the independent-test requirement. If the shipped code can
  diverge from tests without failing, require a narrow fix.
- `login/complete` returns top-level `token`, `tokenType`, `expiresAt`, and
  `user`; the Task 0013 prompt and identity spec examples describe a session
  object with actor/session/user shape. Verify the response contract is
  acceptable before merge, or fix it in-scope.
- Stage may return raw debug login codes so the verifier can run a live flow.
  Prod must never return raw login codes. Check the actual Wrangler env config,
  rendered Orun jobs, and live prod response behavior.
- The follow-up api-edge service-binding facade is intentionally deferred.
  Do not fail the PR only because `api-edge` still does not route
  `/v1/auth/*`, but do fail any claim that full public edge auth acceptance is
  complete.

# Objective

Independently verify PR #54 against Task 0013.

If the PR is production-safe after any strictly Task 0013-scoped verifier fixes,
merge it, wait for the `main` merge pipeline, verify the `identity-worker`
stage/prod deployments and live auth behavior, sync local `main`, update compact
orchestration context/state, and write a PASS report.

If it fails, leave the PR open, do not merge, and write a FAIL report with
concrete blockers. If provider access blocks required live Worker evidence,
write BLOCKED rather than guessing.

# PR Boundary

This verifier task covers PR #54 only.

Allowed verifier changes are limited to:

- `ai/reports/task-0013-verifier.md`;
- small, strictly Task 0013-scoped fixes needed to make PR #54 safe to merge;
- compact orchestration context/state updates after verification is complete.

Do not start the api-edge service-binding facade follow-up. Do not add API keys,
service principals, organizations, memberships, policy, projects, billing,
notifications, webhooks, SDK, CLI, UI behavior, Terraform provisioning,
Supabase resources, Cloudflare resources, AWS/S3/Secrets Manager resources, or
`specs-v2/**` work.

# Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0013.md`
- `ai/reports/task-0013-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `ai/state.json`
- `ai/reports/task-0012-verifier.md`
- `specs/constitution.md`
- `specs/repo.md`
- `specs/components/00-foundation-and-tooling.md`
- `specs/components/01-edge-api.md`
- `specs/components/02-identity.md`
- `specs/contracts/api-guidelines.md`
- `specs/contracts/tenancy-and-rbac.md`
- `specs/orun-golden-path.md`
- `apps/identity-worker/**`
- `tests/identity-worker/**`
- `packages/contracts/**`
- `packages/db/src/identity/**`
- `packages/db/src/hyperdrive/**`
- `stack-tectonic/compositions/cloudflare-worker-turbo/**`
- PR #54 diff, commits, checks, review state, and CI logs
- GitHub Actions run `26343451814`

# Required Outcomes

## PR Review

- Confirm PR #54 has a real PR number, is based on current `main`, is not
  draft, is mergeable, and has green CI for the final head commit.
- Inspect the actual PR diff, commits, implementer report, and CI logs, not
  only PR summaries.
- Verify the PR is bounded to Task 0013:
  - first deployable `apps/identity-worker` runtime slice;
  - auth contract types;
  - focused identity-worker tests;
  - Orun component metadata for Worker verification/deployment;
  - no api-edge facade or out-of-scope domain/product work.
- Verify no generated/ignored artifacts are staged or committed, including
  `.orun/**`, `plan.json`, `dist/`, `node_modules/`, `.wrangler/`,
  TypeScript build info, Terraform working directories, or aggregate files.
- Verify no raw connection strings, database passwords, Supabase API keys,
  Cloudflare API tokens, AWS credentials, raw bearer tokens, token hashes, code
  hashes, signing secrets, encryption secrets, or Secrets Manager payloads are
  committed, logged, or returned outside the one-time allowed debug-code
  response in non-prod debug delivery.

## Identity Worker Runtime Review

- Verify `apps/identity-worker` follows existing Worker app conventions for
  package scripts, TypeScript config, lint config, Wrangler config, and
  component metadata.
- Verify `wrangler.jsonc` has:
  - base/local `ENVIRONMENT=local`, `DEBUG_DELIVERY=true`;
  - `dev` with no Hyperdrive binding;
  - `stage` with only stage Hyperdrive
    `08f7c6055f544a3890a585d88fd92348`;
  - `prod` with only prod Hyperdrive
    `ab2c21c2db6245a59c91588fcac7107a`;
  - `DEBUG_DELIVERY=false` in prod.
- Verify `/health` returns service name, environment, timestamp, database
  configured/reachable state, and debug-delivery state without secrets,
  connection strings, raw errors, codes, tokens, or hashes.
- Verify database resource cleanup cannot mask safe responses or leak errors.
- Verify request routing returns the standard envelope and safe semantic error
  codes for unknown routes, bad methods, invalid JSON, validation failures, DB
  unconfigured state, and internal failures.
- Verify request ID handling preserves valid `X-Request-Id`, rejects invalid
  IDs, and generates `req_` IDs.

## Auth Behavior Review

- Verify `login/start`:
  - validates JSON and email input;
  - normalizes email lookup consistently;
  - finds or creates user and email auth identity safely under conflicts;
  - generates one-time codes with Web Crypto, never `Math.random()`;
  - stores only code hashes through the repository;
  - creates a short-lived challenge;
  - includes raw code only when `DEBUG_DELIVERY=true`;
  - never returns a raw code in prod.
- Verify `login/complete`:
  - accepts public `challengeId` plus code;
  - distinguishes unknown, expired, consumed, and wrong-code cases as well as
    the Task 0012 repository allows;
  - calls `consumeLoginChallenge(id, codeHash, consumedAt)` for atomic code
    verification;
  - creates a high-entropy bearer token with Web Crypto;
  - stores only token hash through the repository;
  - returns the raw token exactly once in the success response.
- Verify `session`:
  - requires `Authorization: Bearer <token>`;
  - returns actor/session/user data for valid, unexpired, unrevoked sessions;
  - returns `unauthenticated` for missing, malformed, expired, revoked, or
    unknown tokens;
  - does not expose token hashes or raw token secrets.
- Verify `logout`:
  - resolves the bearer token;
  - revokes the session through the repository;
  - makes the same token unusable for later session resolution.
- Verify ID handling against the live Task 0012 UUID schema. If prefixed public
  IDs are passed directly into UUID columns and live auth writes fail, fix the
  mapping or mark FAIL. The public API may expose `usr_`, `ses_`, and `chl_`
  identifiers, but persistence must remain compatible with the deployed schema.
- Verify the public contract shape matches Task 0013 and the identity spec. If
  the implemented `login/complete` or `session` response shape is materially
  different from the expected session/actor/user shape, require a narrow fix or
  write a spec proposal before passing.

## Contracts And Tests Review

- Verify reusable auth/session request and response types live in
  `packages/contracts` and are exported through a stable subpath.
- Verify tests exercise the real implementation, not only copied or
  reimplemented logic. If tests duplicate `createAuthService`, ID generation,
  token parsing, or hashing instead of importing the shipped modules, require a
  narrow fix or record the residual risk explicitly if still passing.
- Verify tests cover:
  - start-login success with debug delivery enabled;
  - start-login with debug delivery disabled/prod behavior;
  - invalid email/body validation;
  - complete-login success and one-time consumption;
  - wrong code, consumed challenge, expired challenge, unknown challenge;
  - valid, expired, revoked, malformed, and missing session tokens;
  - logout revocation and token reuse failure;
  - no raw codes/tokens passed to persistence, only hashes;
  - API envelopes and request IDs;
  - route handlers or Worker fetch behavior where practical.
- Verify tests do not require a live database and do not import runner-only
  modules.
- Verify coverage is strong enough to catch the UUID/public-ID mismatch risk.
  If not, add a focused test around repository-compatible ID mapping or require
  a live stage proof before merge.

## Orun And CI Review

- Inspect PR CI run `26343451814` logs. Confirm pull-request jobs are verify
  only and do not live-deploy Cloudflare Workers or mutate databases.
- Verify the rendered PR plan includes the expected changed components:
  `contracts`, `identity-worker`, and `identity-worker-tests`.
- Verify the `cloudflare-worker-turbo` composition uses
  `--env {{ .orun.environment.name }}` for verify/deploy jobs. The dead
  `dryRunCommand` and `deployCommand` parameters in component YAML must not
  cause stage jobs to run prod deploys.
- Inspect the rendered main/push plan before merging. Confirm:
  - stage deploys the stage Wrangler environment;
  - prod deploys the prod Wrangler environment;
  - dev remains verify-only and does not deploy;
  - no job applies database migrations or provisions infrastructure.
- Do not pass verification if stage would deploy prod, prod would deploy stage,
  dev points at stage/prod resources, or PR CI mutates live resources.

## Required Local Checks

Run the cheapest full set that proves the changed surface, at minimum:

```bash
pnpm install --frozen-lockfile
pnpm --filter @saas/identity-worker build
pnpm --filter @saas/identity-worker typecheck
pnpm --filter @saas/identity-worker lint
pnpm --filter @saas/contracts build
pnpm --filter @saas/contracts typecheck
pnpm --filter @saas/contracts lint
pnpm --filter @saas/identity-worker-tests test
pnpm --filter @saas/identity-worker-tests typecheck
pnpm --filter @saas/identity-worker-tests lint
pnpm --filter @saas/identity-worker exec wrangler deploy --dry-run --config wrangler.jsonc --env dev
pnpm --filter @saas/identity-worker exec wrangler deploy --dry-run --config wrangler.jsonc --env stage
pnpm --filter @saas/identity-worker exec wrangler deploy --dry-run --config wrangler.jsonc --env prod
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
git diff --check
```

If `pnpm install --frozen-lockfile` cannot run because dependencies are already
installed and the lockfile is unchanged, record that clearly and run the rest.
Do not commit `plan.json`, `.orun/**`, `dist/`, `node_modules/`, or build info.

## Merge And Post-Merge Verification

- If all pre-merge checks pass, merge PR #54 using `gh`.
- Wait for the `main` CI run created by the merge commit.
- Inspect `main` CI logs, not only status summaries. Confirm:
  - the expected Orun jobs ran;
  - stage/prod `identity-worker` jobs used deploy profile;
  - dev stayed verify-only;
  - no infrastructure/database provisioning ran.
- Use local Wrangler CLI, GitHub Actions logs, or provider output to inspect
  deployed Cloudflare Worker state:
  - `pnpm --filter @saas/identity-worker exec wrangler deployments list --env stage --config wrangler.jsonc --json`
  - `pnpm --filter @saas/identity-worker exec wrangler deployments list --env prod --config wrangler.jsonc --json`
  - `pnpm --filter @saas/identity-worker exec wrangler deployments status --env stage --config wrangler.jsonc --json`
  - `pnpm --filter @saas/identity-worker exec wrangler deployments status --env prod --config wrangler.jsonc --json`
  - `pnpm --filter @saas/identity-worker exec wrangler versions list --env stage --config wrangler.jsonc --json`
  - `pnpm --filter @saas/identity-worker exec wrangler versions list --env prod --config wrangler.jsonc --json`
- Discover live stage and prod Worker URLs from Wrangler, CI logs, or
  Cloudflare output.
- Hit live `/health` for stage and prod. Confirm:
  - `service: "identity-worker"`;
  - `environment` matches the Worker env;
  - database is configured and reachable in stage/prod;
  - stage debug delivery is enabled;
  - prod debug delivery is disabled;
  - no raw errors or secret material are returned.
- Run a live stage auth flow because Task 0013 intentionally enables stage
  debug delivery:
  - `POST /v1/auth/login/start` with a verifier-owned test email;
  - confirm response includes `challengeId`, `expiresAt`, `delivery.mode =
    "local_debug"`, and a 6-digit `delivery.code`;
  - `POST /v1/auth/login/complete` with that challenge/code;
  - confirm success returns a bearer token exactly once;
  - `GET /v1/auth/session` with the bearer token;
  - `POST /v1/auth/logout` with the bearer token;
  - confirm the same token no longer resolves.
- Run a live prod boundary check without completing a real login:
  - `POST /v1/auth/login/start` with a verifier-owned test email;
  - confirm response does not include a raw code and reports email delivery
    mode, or record any provider limitation/blocker.
  - Do not complete prod login unless a safe non-debug delivery path exists and
    the verifier controls the mailbox.
- Inspect live non-secret database state if needed to resolve the UUID/ID risk.
  Do not print secrets, token values, code values, code hashes, token hashes, or
  connection strings.
- Record only non-secret observed state in the verifier report: PR number,
  commit SHAs, run IDs, job IDs, Worker names, version IDs, deployment IDs,
  public URLs, environment names, route/status summaries, and Supabase project
  refs are acceptable.
- If local Wrangler/Cloudflare/Supabase credentials or provider permissions are
  unavailable, record the exact blocker. Do not claim live verification from CI
  summaries alone.

# Non-Goals

- No `api-edge` `/v1/auth/*` facade or service binding.
- No API keys, service principals, organizations, memberships, projects,
  policy, audit, events, billing, notifications, webhooks, SDK, CLI, or UI.
- No new schema migrations unless a tiny Task 0013 fix is unavoidable and fully
  justified. If the UUID/public-ID mismatch requires changing the Task 0012
  persistence contract rather than a Worker mapping fix, write a spec proposal
  and mark FAIL/BLOCKED as appropriate.
- No new Cloudflare, Supabase, AWS, S3, Secrets Manager, Hyperdrive, or
  Terraform-managed resources.
- No `dev` Supabase project, `dev` Hyperdrive resource, or dev live Worker.
- No `specs-v2/**` work.

# Constraints

- Trust code, PR diff, rendered Orun plans, GitHub Actions logs, live Worker
  responses, local Wrangler output, and provider-observed state over stale docs.
- Do not merge while checks are failing, while live deploy boundaries are
  ambiguous, while stage/prod auth behavior is unproven, or while prod can leak
  raw login codes.
- Keep any verifier fix strictly bounded to Task 0013. Push it to PR #54's
  branch and wait for replacement green CI before deciding PASS.
- Do not commit ignored/generated outputs.
- Do not log or report secret values, raw login codes, raw bearer tokens, token
  hashes, code hashes, database credentials, or provider secrets.

# Report Requirements

Write `ai/reports/task-0013-verifier.md` with:

- `Result: PASS`, `FAIL`, or `BLOCKED`;
- PR number, URL, branch, final head commit, merge commit if merged, and CI run
  IDs/job evidence;
- concise PR scope review;
- local checks run with exact commands and outcomes;
- Orun/rendered-plan and CI review;
- Worker config/deploy boundary review;
- auth behavior review, including stage live flow and prod no-code boundary;
- security/secret handling review;
- files changed by the verifier, if any;
- remaining gaps and follow-up tasks, especially the deferred api-edge facade;
- compact context/state updates made after verification.

If PASS and merged, update:

- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/open-risks.md`
- `ai/state.json`
- `ai/waiting_for_input.md` if its status text is stale

Set `ai/state.json.task_agent` to the verifier report path after writing the
report. If FAIL or BLOCKED, set it to `ai/reports/task-0013-verifier.md` and
leave enough context for the orchestrator to choose the next action.
