# Task ID

Task 0023 Verifier

# Agent

Verifier

# Current Repo Context

The reusable SaaS starter spec pack under `specs/**` is authoritative for this
verification. `specs-v2/**` is out of scope.

Task 0023 implementation is open as PR #64:

- URL: https://github.com/sourceplane/multi-tenant-saas/pull/64
- Branch: `task-0023/events-audit-foundation`
- Head commit observed when this verifier prompt was written:
  `5ebbcb32e9cf369b0a6b05f41163386318b8acac`
- Base: `main` at `2c8ebb5a425b61e12abc1d963800dcb9de561987`
- Current PR state: open, ready for review, mergeable clean, not draft
- Latest observed PR CI run: `26378962779`, completed successfully
- Branch content observed: 2 commits ahead of `main`

Observed implementation summary:

- Adds `packages/contracts/src/events.ts` with event envelope and audit types.
- Adds migration `030_events_audit_core` for `events.event_log` and
  `events.audit_entries`.
- Adds `@saas/db/events` repository adapter with `appendEvent`,
  `appendEventWithAudit`, `queryAuditByOrg`, and `queryAuditByTarget`.
- Adds focused contract, migration, and repository tests.
- Adds `ai/reports/task-0023-implementer.md`.

Important local-worktree note:

- The current checkout may contain local orchestration files and historical
  untracked task/report files that are not part of PR #64. Verify the PR using
  the PR diff (`origin/main...HEAD` or `gh pr view 64 --json files`) and do not
  commit unrelated local artifacts.

Important verification risks:

- `appendEventWithAudit` currently selects `event_log` rows and `audit_entries`
  rows through a `UNION ALL`. These tables have different column counts and
  column meanings. Do not trust mocked executor tests for this path; prove the
  SQL is valid against Postgres semantics. If the query is invalid or maps
  misaligned columns, fix it before PASS.
- The implementer report says full `pnpm --filter @saas/db-tests test` has a
  pre-existing `membership.test.ts` TS2307 error and only the new events tests
  were run. Confirm whether this is truly pre-existing on `main`; do not accept
  a task-scoped regression.
- This PR adds a migration that will apply to stage/prod after merge through the
  existing db migration path. Verification must inspect PR CI logs and, after
  merge, main CI logs for db migration behavior, not just status summaries.

# Objective

Independently verify PR #64 against Task 0023.

If the PR is production-safe after any strictly Task 0023-scoped verifier fixes,
merge it, wait for the post-merge `main` pipeline, inspect CI logs, sync local
`main`, update compact orchestration context/state, and write a PASS report.

If it fails, leave the PR open, do not merge, and write a FAIL report with
concrete blockers.

# PR Boundary

This verifier task covers PR #64 only.

Allowed verifier changes are limited to:

- `ai/reports/task-0023-verifier.md`;
- small, strictly Task 0023-scoped fixes needed to make PR #64 safe to merge;
- compact orchestration context/state updates after verification is complete.

Do not add member removal, member role update, organization settings,
project/environment routes, events-worker runtime, public audit APIs, service
bindings, queue fanout, notification delivery, UI, SDK, CLI, Terraform
resources, Cloudflare resources, Supabase project changes, AWS IAM/S3/Secrets
Manager resources, or `specs-v2/**` work.

# Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0023.md`
- `ai/reports/task-0023-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `ai/state.json`
- `specs/constitution.md`
- `specs/repo.md`
- `specs/orun-golden-path.md`
- `specs/domain-model.md`
- `specs/contracts/api-guidelines.md`
- `specs/contracts/tenancy-and-rbac.md`
- `specs/contracts/event-envelope.schema.yaml`
- `specs/components/09-events-audit-observability.md`
- `packages/contracts/src/events.ts`
- `packages/db/src/events/types.ts`
- `packages/db/src/events/repository.ts`
- `packages/db/src/migrations/030_events_audit_core/up.sql`
- `packages/db/src/manifest.ts`
- `tests/contracts/src/events.test.ts`
- `tests/db/src/events.test.ts`
- `tests/db/src/events-migration.test.ts`
- PR #64 diff, commits, checks, review state, and CI logs
- GitHub Actions run `26378962779`

# Required Outcomes

## PR Review

- Confirm PR #64 has a real PR number, is based on current `main`, is not draft,
  is mergeable, and has green CI for the final head commit.
- Inspect the actual PR diff, commits, implementer report, and CI logs, not only
  PR summaries.
- Verify `ai/reports/task-0023-implementer.md` is committed in the PR.
- Verify the PR is bounded to Task 0023:
  - event/audit contract types;
  - events migration;
  - `@saas/db/events` repository adapter;
  - focused contract, migration, and repository tests.
- Verify no generated/ignored artifacts are committed, including `.orun/**`,
  `plan.json`, `dist/`, `node_modules/`, `.wrangler/`, TypeScript build info,
  Terraform working directories, or aggregate files.
- Verify no raw connection strings, database passwords, Supabase API keys,
  Cloudflare API tokens, AWS credentials, bearer tokens, invitation tokens,
  token hashes, signing secrets, encryption secrets, or Secrets Manager payloads
  are committed, logged, returned, or embedded in fixtures.

## Contract Review

- Verify event contract types match `specs/contracts/event-envelope.schema.yaml`
  closely enough for downstream callers:
  - required event envelope fields are required in TypeScript;
  - actor type values match the schema;
  - tenant requires `orgId` and supports optional project/environment;
  - trace requires `requestId`;
  - payload is JSON-safe and does not use unsafe `any`.
- Verify audit entry and query types are public-contract safe and do not expose
  database row coupling, platform clients, or implementation-only types.
- Verify `packages/contracts/src/index.ts` exports the new module.

## Migration Review

- Verify `030_events_audit_core` is ordered after membership and has context
  `events`.
- Recompute and verify the manifest checksum for
  `packages/db/src/migrations/030_events_audit_core/up.sql`.
- Verify DDL is idempotent and does not require extensions.
- Verify every tenant-scoped table includes direct `org_id`.
- Verify project/environment columns are present for future project-scoped audit
  records.
- Verify no cross-context foreign keys exist. The same-schema FK from
  `events.audit_entries.event_id` to `events.event_log.id` is allowed if it is
  migration-safe.
- Verify useful indexes exist for organization/time, target lookup, and category
  filtering.
- Verify JSON payload and redaction path storage is present and not plaintext
  secret-specific.
- Verify the migration is safe under the current Supabase API adapter's
  autocommit behavior and idempotent reruns.

## Repository Review

- Verify repository code imports only the `SqlExecutor` seam and local contract
  types, not platform clients or Worker env types.
- Verify SQL is parameterized and does not interpolate event/audit values.
- Verify duplicate event IDs cannot overwrite stored events.
- Verify `appendEventWithAudit` is genuinely atomic:
  - if event insert conflicts, no audit row is inserted;
  - if audit insert conflicts or fails, no event row is left committed;
  - the returned event and audit rows are mapped from valid SQL result shapes.
- Specifically inspect/fix the `UNION ALL` row-shape risk in
  `appendEventWithAudit`. A valid solution may return two JSON-typed columns or
  use another deterministic single-row shape instead of unioning incompatible
  table rows.
- Verify audit query methods scope by organization and target kind/id and never
  query by target alone.
- Verify cursor pagination follows `(occurred_at DESC, id DESC)` or an equally
  documented stable ordering and returns a correct next cursor.
- Verify cursor and limit handling cannot create malformed SQL or unbounded
  reads for expected caller inputs.
- Verify JSON payloads and redaction paths round-trip for string and driver-
  parsed JSON values.

## Test Review

- Run the full required test surface, not only focused events tests.
- If `pnpm --filter @saas/db-tests test` fails with the reported
  `membership.test.ts` TS2307 error, prove whether it also fails on untouched
  `main`. If it is pre-existing, record it clearly as residual risk; if it is
  caused by PR #64, fix it before PASS.
- Add or update tests if verifier fixes `appendEventWithAudit` SQL shape,
  duplicate audit behavior, pagination, or checksum behavior.
- Ensure tests do not require live Supabase, Cloudflare, AWS, Wrangler, or
  external network access.

## CI And Migration Evidence

- Inspect PR CI run `26378962779` logs, including successful jobs.
- Confirm PR CI logs show Orun planned and ran the expected components:
  contracts, contracts-tests, db, and db-tests across the selected environments.
- If PR CI did not exercise a key local command, run it locally and record the
  result.
- After merge, inspect post-merge `main` CI logs for db migration apply behavior
  in stage and prod. Confirm `030_events_audit_core` is applied or explicitly
  reported already applied in both environments.
- If direct Supabase inspection is available, optionally confirm
  `_migrations.applied` includes `030_events_audit_core` in stage/prod without
  exposing secrets. If local provider access is unavailable, record the blocker
  and rely on CI logs.

# Verification Commands

Run at minimum:

```bash
pnpm --filter @saas/contracts typecheck
pnpm --filter @saas/contracts-tests test
pnpm --filter @saas/db typecheck
pnpm --filter @saas/db-tests test
pnpm --filter @saas/db build
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
git diff --check
```

Also inspect PR CI run `26378962779` and its logs. The observed run completed
successfully with 9/9 checks.

# Merge And Post-Merge

If local review, checks, and PR CI are acceptable:

- Merge PR #64.
- Wait for the post-merge `main` pipeline to complete.
- Inspect post-merge CI logs, including db stage/prod jobs, not only status
  summaries.
- Sync local `main` to `origin/main`.
- Update `ai/context/current.md`, `ai/context/task-ledger.md`,
  `ai/context/decisions.md`, `ai/context/open-risks.md`, and `ai/state.json`.
- Leave the local repo clean except for unrelated pre-existing user artifacts.
- Write `ai/reports/task-0023-verifier.md`.

If verification fails:

- Leave PR #64 open.
- Do not merge.
- Write `ai/reports/task-0023-verifier.md` with `Result: FAIL` and concrete
  blockers.

# Verifier Report

Write `ai/reports/task-0023-verifier.md` with:

- Result: PASS|FAIL
- Checks
- Issues
- Risk Notes
- Spec Proposals
- Recommended Next Move

If PASS, include PR number, merge commit, post-merge main CI run, and non-secret
migration evidence for stage/prod.
