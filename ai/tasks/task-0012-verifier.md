# Task ID

Task 0012 Verifier

# Agent

Verifier

# Current Repo Context

The reusable SaaS starter spec pack under `specs/**` is authoritative for this
verification. `specs-v2/**` is out of scope.

Task 0012 implementation is open as PR #53:

- URL: https://github.com/sourceplane/multi-tenant-saas/pull/53
- Branch: `codex/task-0012-identity-persistence-foundation`
- Head commit observed when this verifier prompt was written:
  `de0a9962a72849da0785ee32e815fe641633f61e`
- Base: `main` at `9272a75f4b4813ef60d46e50edcaf4da062194bb`
- Current PR state: open, ready for review, mergeable
- Latest observed PR CI run: `26335039462`, all visible checks passed
- Branch content observed: 2 commits ahead of `origin/main`, 0 behind

Observed implementation summary:

- Adds `packages/db/src/hyperdrive/executor.ts`.
- Adds `@saas/db/identity` repository types/implementation.
- Adds identity migration `010_identity_core`.
- Adds `dependsOn: [component: db]` to `infra/db-migrate/component.yaml`.
- Adds tests for executor, identity repository, and identity migration SQL.
- Adds `ai/reports/task-0012-implementer.md`.

Important verification risks:

- The repository types currently include `codeHash` and `tokenHash` fields on
  returned `LoginChallenge` and `Session` objects. Task 0012 required that raw
  code/token values and code/token hashes not leak through repository outputs
  or errors. Verify whether this is acceptable internal persistence data or a
  blocker; if hashes can leave the repository boundary, require a narrow fix.
- The migration uses `UUID` primary keys, while existing contract examples and
  shared ID helpers use opaque string IDs such as `usr_123`. Verify this does
  not create a contract mismatch for future identity Worker code.
- PR CI shows `db-migrate · stage/prod · Migrate` jobs on a pull request.
  Inspect logs to prove these run the plan/read-only profile only and do not
  apply migrations on PRs.

# Objective

Independently verify PR #53 against Task 0012.

If the PR is production-safe after any strictly Task 0012-scoped verifier fixes,
merge it, wait for the `main` merge pipeline, verify the identity migration was
applied to stage and prod through Orun/db-migrate, inspect live non-secret
database state, sync local `main`, and write a PASS report.

If it fails, leave the PR open, do not merge, and write a FAIL report with
concrete blockers. If local/provider access blocks required live DB evidence,
write BLOCKED rather than guessing.

# PR Boundary

This verifier task covers PR #53 only.

Allowed verifier changes are limited to:

- `ai/reports/task-0012-verifier.md`;
- small, strictly Task 0012-scoped fixes needed to make PR #53 safe to merge;
- compact orchestration context/state updates after verification is complete.

Do not start Task 0013. Do not add `apps/identity-worker`, public auth routes,
login/session behavior, API keys, organizations, membership, projects, policy,
billing, notifications, webhooks, UI, SDK, CLI, Terraform provisioning, new
Supabase resources, or new Cloudflare resources.

# Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0012.md`
- `ai/reports/task-0012-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `ai/state.json`
- `ai/reports/task-0011-verifier.md`
- `specs/constitution.md`
- `specs/repo.md`
- `specs/schedule.md`
- `specs/domain-model.md`
- `specs/components/00-foundation-and-tooling.md`
- `specs/components/02-identity.md`
- `specs/contracts/api-guidelines.md`
- `specs/contracts/tenancy-and-rbac.md`
- `specs/orun-golden-path.md`
- `packages/db/**`
- `tests/db/**`
- `infra/db-migrate/component.yaml`
- `stack-tectonic/compositions/db-migrate/**`
- PR #53 diff, commits, checks, review state, and CI logs
- GitHub Actions run `26335039462`

# Required Outcomes

## PR Review

- Confirm PR #53 has a real PR number, is based on current `main`, is not
  draft, is mergeable, and has green CI for the final head commit.
- Inspect the actual PR diff, commits, implementer report, and CI logs, not
  only PR summaries.
- Verify the PR is bounded to Task 0012:
  - identity persistence schema;
  - Worker-safe SQL executor/repository interfaces;
  - identity repository adapter;
  - migration/test coverage;
  - Orun `db-migrate` selection fix if required.
- Verify it does not include public API/auth behavior, identity Worker source,
  domain-service orchestration, organization/project/policy behavior, UI, SDK,
  CLI, Terraform provisioning, or product-specific `specs-v2/**` work.
- Verify no generated/ignored artifacts are staged or committed, including
  `.orun/**`, `plan.json`, `dist/`, `node_modules/`, `.wrangler/`,
  TypeScript build info, Terraform working directories, or aggregate files.
- Verify no raw connection strings, database passwords, Supabase API keys,
  Cloudflare API tokens, AWS credentials, raw login codes, raw bearer tokens,
  raw API keys, signing secrets, encryption secrets, or Secrets Manager payloads
  are committed, logged, or returned.

## Migration Review

- Verify migration `010_identity_core` is present in the manifest, ordered
  after `000_control_baseline`, context `identity`, and checksum-stable.
- Verify the SQL creates only identity-owned state and no cross-context foreign
  keys.
- Verify the migration is safe for the current Task 0008 Management API runner:
  statements must be idempotent enough for autocommit/no-rollback behavior.
- Verify the migration does not require unapproved extensions such as `citext`.
- Verify secret material is never stored raw:
  - login proofs store only code hashes;
  - sessions store only token hashes;
  - no token/code/password/API key secret columns are created.
- Verify normalized email lookup cannot be bypassed by case-sensitive duplicate
  emails.
- Verify ID column types match the intended identity contract. If future public
  identity IDs are opaque strings like `usr_123`, the schema must not force UUID
  values without an explicit accepted decision/proposal.
- Verify table/index/comment names are stable and do not collide with
  cross-schema objects.

## Repository Adapter Review

- Verify `@saas/db/identity` is an explicit Worker-safe subpath export.
- Verify default `@saas/db` exports remain Worker-safe and do not import
  Postgres.js, `pg`, AWS SDK, `node:*`, filesystem APIs, or runner code.
- Verify identity repository code does not import API route handlers, future
  Worker code, `api-edge`, unrelated bounded contexts, or Node-only modules.
- Verify all dynamic values use parameterized SQL. No user-controlled values may
  be string-interpolated into SQL.
- Verify repository methods are persistence-oriented and do not own token
  generation, code generation, email delivery, passwordless flow policy, crypto
  secrets, or identity Worker orchestration.
- Verify expected outcomes map to stable typed results/errors.
- Verify raw SQL errors, connection strings, hostnames, usernames, token
  hashes, code hashes, raw codes, and raw tokens do not appear in returned
  values or thrown/returned errors.
- Pay special attention to `LoginChallenge` and `Session` output types. If they
  expose `codeHash` or `tokenHash` to callers, decide whether that violates
  Task 0012's "no raw code/token values in repository outputs" and "Do not leak
  ... token hashes, code hashes" requirements. If it violates them, fix or
  mark FAIL.
- Verify repository methods distinguish not-found, conflict, expired, consumed,
  and revoked cases well enough for the next identity Worker task. If a method
  returns `already_consumed` for a missing login challenge or `not_found` for an
  already-revoked session, decide whether that ambiguity is acceptable at the
  repository layer and record it.

## Executor Review

- Verify the SQL executor accepts the Cloudflare Hyperdrive binding and uses
  the runtime connection string only.
- Verify typed row results and parameter arrays work without untrusted string
  interpolation.
- Verify disposal is safe and cannot leak credentials.
- Verify `sql.unsafe(text, params)` usage is acceptable for the intended
  parameterized-query contract, or require a narrower wrapper/fix if it can
  bypass parameter binding.
- Verify existing `createHyperdriveAdapter(...).ping()` behavior and live
  `api-edge` health checks remain compatible.

## Tests Review

- Verify tests cover the required Task 0012 surface:
  - parameterized query usage;
  - successful row mapping;
  - not-found behavior;
  - conflict/duplicate behavior;
  - safe error mapping/redaction;
  - no raw code/token values or hashes in repository outputs/errors;
  - import isolation from runner-only modules;
  - identity migration presence/order/checksum/context;
  - identity schema/tables/indexes/secret-storage checks;
  - project-scoped invariant still applies only to `projects` context
    migrations.
- If tests currently assert that `codeHash` or `tokenHash` is returned, decide
  whether those tests need correction as part of a verifier fix.
- Confirm PR CI does not require a live database for repository unit tests.

## Orun And CI Review

- Inspect PR CI run `26335039462` logs. Confirm pull-request jobs are verify
  only and do not apply live migrations.
- Inspect the rendered changed PR plan and confirm it includes:
  - `db` in dev/stage/prod;
  - `db-tests` in dev;
  - `db-migrate` in stage/prod using plan/read-only capabilities only.
- Verify `dependsOn: [component: db]` is valid Orun v2.3.0 syntax and does not
  create unsound environment ordering. In particular, ensure migration changes
  under `packages/db/**` select `db-migrate` without causing `db-migrate` to run
  before `db` package build verification.
- Inspect the rendered main/push plan before merge. Confirm stage/prod
  `db-migrate` jobs would run the apply profile on `github-push-main` and dev
  would not apply migrations.
- Do not pass verification if PR CI applies migrations, if main would skip
  `db-migrate`, or if the plan would apply to the wrong environment.

## Merge And Post-Merge Verification

- If all pre-merge checks pass, merge PR #53 using `gh`.
- Wait for the `main` CI run created by the merge commit.
- Inspect `main` CI logs, not only status summaries. Confirm:
  - the expected Orun jobs ran;
  - `db-migrate.stage` and `db-migrate.prod` used apply capabilities;
  - `010_identity_core` was applied or safely no-op'd in both environments.
- Independently inspect live non-secret database state in stage and prod.
  Acceptable methods include a read-only Supabase Management API query, a local
  authenticated helper using the existing runner/Supabase API adapter, or
  another provider-observed read-only query path. Do not print secrets.
- At minimum, verify in both stage and prod:
  - `_migrations.applied` contains `id = '010_identity_core'` and
    `context = 'identity'`;
  - schema `identity` exists;
  - tables `users`, `auth_identities`, `login_challenges`, and `sessions`
    exist;
  - sensitive columns are hash columns only (`code_hash`, `token_hash`);
  - no raw token/code/password columns exist.
- Run live `api-edge` health checks after merge to make sure the database
  migration did not break existing Worker connectivity:
  - `https://api-edge-stage.rahulvarghesepullely.workers.dev/health`
  - `https://api-edge-prod.rahulvarghesepullely.workers.dev/health`
- Record only non-secret observed state in the verifier report: PR number,
  commit SHAs, run IDs, job IDs, migration IDs, schema/table names, Supabase
  project refs, and public health URLs are acceptable.
- If local AWS/Supabase credentials or provider permissions are unavailable,
  record the exact blocker. Do not claim live DB verification from CI status
  summaries alone.

# Non-Goals

- No `apps/identity-worker`.
- No public auth routes or `api-edge` route changes.
- No login/start, login/complete, logout, session resolution, API key,
  service-principal, organization, membership, project, policy, audit, billing,
  notification, webhook, SDK, CLI, or UI behavior.
- No Supabase Auth adoption.
- No `dev` Supabase project, `dev` Hyperdrive, or dev migration apply.
- No new Cloudflare, Supabase, AWS, S3, Secrets Manager, or Terraform-managed
  resources.
- No `specs-v2/**` work.

# Constraints

- Trust code, PR diff, rendered Orun plans, GitHub Actions logs, local checks,
  and provider-observed database state over stale docs.
- Do not merge while checks are failing, while PR CI mutates live databases,
  while main apply behavior is ambiguous, or while repository outputs leak
  secret hashes/raw secret material.
- Keep any verifier fix strictly bounded to Task 0012. Push it to PR #53's
  branch and wait for replacement green CI before deciding PASS.
- Do not commit ignored/generated outputs.
- Do not log or report secret values.
- If verification reveals a larger design issue, do not solve it with broad
  changes in this verifier task. Mark FAIL/BLOCKED and recommend the next
  bounded implementer task.

# Acceptance Criteria

Verification passes only if all of the following are true:

- PR #53 remains bounded to Task 0012.
- Local checks pass:
  - `pnpm install --frozen-lockfile`
  - `pnpm --filter @saas/db build`
  - `pnpm --filter @saas/db typecheck`
  - `pnpm --filter @saas/db lint`
  - `pnpm --filter @saas/db-tests test`
  - `pnpm --filter @saas/db-tests typecheck`
  - `pnpm --filter @saas/db-tests lint`
  - `rg -n "from ['\\\"]node:|from ['\\\"]pg['\\\"]|@aws-sdk|runner|secrets" packages/db/src/hyperdrive packages/db/src/identity packages/db/src/repositories || true`
- Repository outputs and errors do not expose raw codes, raw tokens, code
  hashes, token hashes, connection strings, hostnames, usernames, or SQL internals.
- Migration schema matches the identity contract and does not force an
  unapproved public ID format.
- Orun checks pass:
  - `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
  - `/Users/irinelinson/.local/bin/kiox -- orun component --intent intent.yaml --long`
  - `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
  - `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`
- PR CI logs for the final head commit are green and show no live migration
  apply on pull request.
- Rendered main/push plan applies `010_identity_core` only to stage/prod.
- If PASS, PR #53 is merged.
- The post-merge `main` pipeline succeeds and applies/no-ops the identity
  migration through `db-migrate` in stage/prod.
- Provider-observed live DB checks confirm the identity schema and migration
  row in stage/prod.
- Existing stage/prod `api-edge` health checks still return database reachable.
- Local `main` is synced to `origin/main` after merge.
- `ai/reports/task-0012-verifier.md` clearly states `Result: PASS`,
  `Result: FAIL`, or `Result: BLOCKED`.

# Verification Procedure

Use the verifier merge protocol:

1. Inspect PR #53 metadata, final diff, commits, files, checks, and CI logs.
2. Run local package, import-boundary, migration, repository, and Orun checks.
3. Confirm schema, repository contract, secret handling, and Orun PR/main
   migration boundaries.
4. If a small fix is required, make it on PR #53, push, and wait for green CI.
5. If PASS pre-merge, merge PR #53.
6. Wait for and inspect the post-merge `main` run.
7. Inspect live stage/prod DB state using a read-only provider-observed path.
8. Hit live stage/prod `/health`.
9. Sync local `main`.
10. Write the verifier report and compact context updates.

# PR Creation Requirement

PR #53 already exists and is the only PR in scope. Do not open a new PR. If
verification requires a small fix, keep it on the existing PR branch, push that
branch, and continue verification there.

# When Done Report

Write `ai/reports/task-0012-verifier.md` with:

- Result: PASS, FAIL, or BLOCKED
- PR Review
- Scope Review
- Migration Review
- Repository Adapter Review
- Executor Review
- Tests Review
- Orun And CI Review
- Merge Pipeline Evidence
- Live Database Evidence
- Api Edge Health Evidence
- Secret Handling Review
- Checks Run
- Issues
- Spec Proposals
- Risk Notes
- Recommended Next Move
- PR Number
