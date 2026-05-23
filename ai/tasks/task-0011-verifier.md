# Task ID

Task 0011 Verifier

# Agent

Verifier

# Current Repo Context

The reusable SaaS starter spec pack under `specs/**` is authoritative for this
verification. `specs-v2/**` is out of scope.

Task 0011 implementation is open as PR #52:

- URL: https://github.com/sourceplane/multi-tenant-saas/pull/52
- Branch: `codex/task-0011-hyperdrive-runtime-adapter`
- Head commit observed when this verifier prompt was written:
  `93798394041763be8b4d6797f689c42d1fea2407`
- Base: `main` at `84cb595569e7572289183ea7a04cdb1657637136`
  after PR #51 (`noisy-fix-971`)
- Current PR state: open, ready for review, mergeable
- Latest observed PR CI run: `26331466802`, all visible checks passed
- Branch content observed: 2 commits ahead of `origin/main`, 0 behind

Observed implementation summary:

- Adds `@saas/db/hyperdrive` with a Worker-safe Hyperdrive/Postgres adapter
  using Postgres.js.
- Extends `apps/api-edge` `/health` with `checks.database`.
- Adds `tests/db/src/hyperdrive.test.ts`.
- Adds `ai/reports/task-0011-implementer.md`.
- No Terraform, Supabase, AWS, domain schema, identity, organization, project,
  billing, or UI source changes were observed in the PR file list.

Important verification risk:

- `apps/api-edge/component.yaml` currently has both `stage` and `prod`
  promotion rules on `github-push-main`, while the single `deployCommand` is
  `pnpm exec wrangler deploy --config wrangler.jsonc --env prod`.
- Before merging, independently inspect the rendered Orun main/push behavior.
  Do not allow a stage job to live-deploy the prod Wrangler environment or any
  other cross-environment resource mutation.

# Objective

Independently verify PR #52 against Task 0011.

If the PR is production-safe after any strictly Task 0011-scoped verifier fixes,
merge it, wait for the `main` merge pipeline, verify the deployed Cloudflare
Worker/resource state with local Wrangler CLI, hit the live operational health
path when a public Worker URL is available, sync local `main`, and write a PASS
report.

If it fails, leave the PR open, do not merge, and write a FAIL report with
concrete blockers. If provider access or live URL discovery blocks required
post-merge evidence, write BLOCKED rather than guessing.

# PR Boundary

This verifier task covers PR #52 only.

Allowed verifier changes are limited to:

- `ai/reports/task-0011-verifier.md`;
- small, strictly Task 0011-scoped fixes needed to make PR #52 safe to merge;
- compact orchestration context/state updates after verification is complete.

Do not start Task 0012. Do not add domain repositories, domain schema,
identity, organizations, projects, policy, events, billing, notifications,
webhooks, SDK, CLI, UI behavior, Terraform provisioning, Supabase resources, or
new Worker apps.

# Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0011.md`
- `ai/reports/task-0011-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `ai/state.json`
- `ai/reports/task-0010-verifier.md`
- `specs/constitution.md`
- `specs/repo.md`
- `specs/access-and-infra.md`
- `specs/components/00-foundation-and-tooling.md`
- `specs/components/01-edge-api.md`
- `specs/contracts/api-guidelines.md`
- `specs/contracts/tenancy-and-rbac.md`
- `specs/orun-golden-path.md`
- `packages/db/**`
- `tests/db/**`
- `apps/api-edge/**`
- PR #52 diff, commits, checks, review state, and CI logs
- GitHub Actions run `26331466802`
- Cloudflare Hyperdrive docs referenced by Task 0011:
  - https://developers.cloudflare.com/hyperdrive/
  - https://developers.cloudflare.com/hyperdrive/get-started/
  - https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/postgres-js/

# Required Outcomes

## PR Review

- Confirm PR #52 has a real PR number, is based on current `main`, is not
  draft, is mergeable, and has green CI for the final head commit.
- Inspect the actual PR diff, commits, implementer report, and CI logs, not
  only PR summaries.
- Verify the PR is bounded to Task 0011:
  - Worker-safe DB runtime adapter;
  - read-only `api-edge` operational DB smoke path;
  - focused tests and package metadata;
  - no domain behavior, writes, schema, infrastructure provisioning, or
    product-specific `specs-v2/**` work.
- Verify no generated/ignored artifacts are staged or committed, including
  `.orun/**`, `plan.json`, `dist/`, `node_modules/`, `.wrangler/`,
  TypeScript build info, Terraform working directories, or aggregate files.
- Verify no secrets, connection strings, database passwords, Supabase API keys,
  Cloudflare API tokens, AWS credentials, or Secrets Manager payloads are
  committed, logged, or returned by the health endpoint.

## Runtime Adapter Review

- Verify `@saas/db/hyperdrive` is an explicit subpath export and that default
  `@saas/db` exports remain Worker-safe.
- Verify the Worker adapter does not import runner-only modules, `pg`,
  `@aws-sdk/*`, `node:*`, filesystem APIs, or raw environment connection
  strings.
- Verify the adapter accepts only the Cloudflare Hyperdrive binding/runtime
  connection string and uses a Worker-compatible Postgres client supported by
  current Cloudflare Hyperdrive docs.
- Verify the smoke query is read-only (`SELECT 1 AS ok` or equivalent), does
  not query or create domain tables, and performs no writes.
- Verify adapter success, query failure, and cleanup/disposal behavior.
- Verify failures are normalized to safe operational status and do not expose
  raw SQL errors, credentials, connection strings, hostnames, usernames, or
  tokens.
- Inspect whether disposal failures can leak or mask the intended safe health
  response. If they can, fix narrowly or mark FAIL.

## Api Edge Health Review

- Verify `GET /health` remains an operational endpoint only and does not
  introduce tenant-domain behavior.
- Verify behavior for all expected states:
  - no `SOURCEPLANE_DB` binding: 200, status `ok`, database configured false;
  - bound and reachable: 200, status `ok`, database reachable true;
  - bound but unreachable: 503, status `degraded`, no raw error details;
  - unknown routes still return the existing 404 shape.
- Verify the route disposes of DB resources after success and failure.
- Original Task 0011 allowed `apps/api-edge` tests or focused verification
  scripts for response shape. If none exist and local/manual checks do not
  independently prove the health behavior, either add a small Task 0011-scoped
  test/script on the PR branch or mark FAIL with the missing coverage.
- Verify the health response shape remains compatible with the existing health
  contract or that any extension is operationally safe and documented.

## Orun And CI Review

- Inspect PR CI run `26331466802` logs. Confirm pull-request jobs are verify
  only and do not live-deploy Cloudflare Workers or mutate databases.
- Verify the rendered PR plan includes only the expected changed components:
  `api-edge`, `db`, and `db-tests` as appropriate.
- Inspect the rendered main/push plan before merging. Confirm exactly which
  environments would deploy on `github-push-main`.
- Do not pass verification if a stage job would execute
  `wrangler deploy --env prod`, if a prod job would use stage resources, if a
  local/default Wrangler config could deploy, or if dev points at stage/prod
  Hyperdrive or Supabase resources.
- If stage is intended to deploy on merge, it must deploy the stage Wrangler
  environment and the stage Hyperdrive ID:
  `08f7c6055f544a3890a585d88fd92348`.
- If prod deploys on merge, it must deploy the prod Wrangler environment and
  the prod Hyperdrive ID:
  `ab2c21c2db6245a59c91588fcac7107a`.
- If the existing component model cannot express different deploy commands per
  environment, record that clearly and do not merge until the live behavior is
  safe for this PR.

## Merge And Post-Merge Verification

- If all pre-merge checks pass, merge PR #52 using `gh`.
- Wait for the `main` CI run created by the merge commit.
- Inspect `main` CI logs, not only status summaries. Confirm the merge pipeline
  ran the expected Orun jobs and deployed only the intended Cloudflare Worker
  environment(s).
- Use local Wrangler CLI to inspect Cloudflare resources after merge:
  - `pnpm --filter @saas/api-edge exec wrangler whoami`
  - `pnpm --filter @saas/api-edge exec wrangler hyperdrive get 08f7c6055f544a3890a585d88fd92348`
  - `pnpm --filter @saas/api-edge exec wrangler hyperdrive get ab2c21c2db6245a59c91588fd92348`
  - `pnpm --filter @saas/api-edge exec wrangler deployments list --env stage --config wrangler.jsonc --json`
  - `pnpm --filter @saas/api-edge exec wrangler deployments list --env prod --config wrangler.jsonc --json`
  - `pnpm --filter @saas/api-edge exec wrangler deployments status --env prod --config wrangler.jsonc --json`
  - `pnpm --filter @saas/api-edge exec wrangler versions list --env prod --config wrangler.jsonc --json`
- Discover the deployed prod Worker URL from Wrangler, CI logs, or Cloudflare
  API/provider output. If a public route exists, run:
  - `curl -fsS <prod-worker-url>/health`
- Confirm the live prod health response includes:
  - `service: "api-edge"`;
  - `environment: "prod"`;
  - `checks.database.configured: true`;
  - `checks.database.reachable: true`;
  - no raw error or secret material.
- If stage is deployed by the merge pipeline, also inspect the stage Worker and
  hit the stage `/health` route if a URL exists. Confirm `environment: "stage"`
  and the stage Hyperdrive ID boundary.
- Record only non-secret observed state in the verifier report: PR number,
  commit SHAs, run IDs, job IDs, Worker names, version IDs, deployment IDs,
  Hyperdrive IDs/names, and public URLs are acceptable.
- If local Wrangler auth, Cloudflare permissions, or public route discovery is
  unavailable, record the exact blocker. Do not claim live verification from CI
  summaries alone.

# Non-Goals

- No new domain repository adapters beyond verifying the narrow Task 0011
  Hyperdrive adapter.
- No schema migrations or domain table queries.
- No writes through Hyperdrive from Worker runtime.
- No identity, sessions, API keys, organizations, memberships, projects,
  policy, audit, events, billing, notifications, webhooks, SDK, CLI, or UI.
- No new Cloudflare, Supabase, AWS, S3, Secrets Manager, or Terraform-managed
  resources.
- No `dev` Supabase project, `dev` Hyperdrive resource, or dev live Worker.
- No `specs-v2/**` work.
- No broad Cloudflare composition refactor unless a tiny environment-boundary
  fix is required to make PR #52 safe.

# Constraints

- Trust code, PR diff, rendered Orun plans, GitHub Actions logs, local
  Wrangler output, and provider-observed state over stale docs.
- Do not merge while checks are failing, while live deploy boundaries are
  ambiguous, or while the health path can expose secrets/raw SQL errors.
- Keep any verifier fix strictly bounded to Task 0011. Push it to PR #52's
  branch and wait for replacement green CI before deciding PASS.
- Do not commit ignored/generated outputs.
- Do not log or report secret values.
- If verification reveals a larger design or orchestration issue, do not solve
  it with broad changes in this verifier task. Mark FAIL/BLOCKED and recommend
  the next bounded implementer task.

# Acceptance Criteria

Verification passes only if all of the following are true:

- PR #52 remains bounded to Task 0011.
- Local package checks pass:
  - `pnpm install --frozen-lockfile`
  - `pnpm --filter @saas/db build`
  - `pnpm --filter @saas/db typecheck`
  - `pnpm --filter @saas/db lint`
  - `pnpm --filter @saas/db-tests test`
  - `pnpm --filter @saas/db-tests typecheck`
  - `pnpm --filter @saas/db-tests lint`
  - `pnpm --filter @saas/api-edge build`
  - `pnpm --filter @saas/api-edge typecheck`
  - `pnpm --filter @saas/api-edge lint`
  - `pnpm --filter @saas/api-edge verify-bindings`
  - `pnpm --filter @saas/api-edge exec wrangler deploy --dry-run --config wrangler.jsonc --env stage`
  - `pnpm --filter @saas/api-edge exec wrangler deploy --dry-run --config wrangler.jsonc --env prod`
- Import-boundary checks prove Worker runtime code does not import Node-only
  runner dependencies or secret managers.
- API health behavior is verified for configured/unconfigured/down states.
- Orun checks pass:
  - `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
  - `/Users/irinelinson/.local/bin/kiox -- orun component --intent intent.yaml --long`
  - `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
  - `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`
- PR CI logs for the final head commit are green and show no live deploys on
  pull request.
- The rendered main/push plan cannot cross stage/prod boundaries.
- If PASS, PR #52 is merged.
- The post-merge `main` pipeline succeeds and deploys only the intended
  Cloudflare Worker environment(s).
- Local Wrangler CLI confirms expected Hyperdrive resources and Worker
  deployments after merge.
- Live `/health` confirms prod DB connectivity when a public Worker URL exists.
- Local `main` is synced to `origin/main` after merge.
- `ai/reports/task-0011-verifier.md` clearly states `Result: PASS`,
  `Result: FAIL`, or `Result: BLOCKED`.

# Verification Procedure

Use the verifier merge protocol:

1. Inspect PR #52 metadata, final diff, commits, files, checks, and CI logs.
2. Run local package, import-boundary, Wrangler dry-run, and Orun checks.
3. Confirm adapter, health route, secret handling, and environment boundaries.
4. If a small fix is required, make it on PR #52, push, and wait for green CI.
5. If PASS pre-merge, merge PR #52.
6. Wait for and inspect the post-merge `main` run.
7. Run local Wrangler CLI resource inspection.
8. Hit live `/health` for prod, and stage if stage is deployed and routable.
9. Sync local `main`.
10. Write the verifier report and compact context updates.

# PR Creation Requirement

PR #52 already exists and is the only PR in scope. Do not open a new PR. If
verification requires a small fix, keep it on the existing PR branch, push that
branch, and continue verification there.

# When Done Report

Write `ai/reports/task-0011-verifier.md` with:

- Result: PASS, FAIL, or BLOCKED
- PR Review
- Scope Review
- Runtime Adapter Review
- Api Edge Health Review
- Orun And CI Review
- Merge Pipeline Evidence
- Wrangler Resource Evidence
- Live Health Evidence
- Environment Boundary Review
- Secret Handling Review
- Checks Run
- Issues
- Spec Proposals
- Risk Notes
- Recommended Next Move
- PR Number
