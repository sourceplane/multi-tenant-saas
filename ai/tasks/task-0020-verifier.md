# Task ID

Task 0020 Verifier

# Agent

Verifier

# Current Repo Context

The reusable SaaS starter spec pack under `specs/**` is authoritative for this
verification. `specs-v2/**` is out of scope.

Task 0020 implementation is open as PR #61:

- URL: https://github.com/sourceplane/multi-tenant-saas/pull/61
- Branch: `codex/task-0020-membership-cursor-pagination`
- Head commit observed when this verifier prompt was written:
  `76e327488601ea1a94fe87b49ac66f22c42c83ed`
- Base: `main` at `cadcfef9ec33fe4fdf3c8a9abaee82499696c2b1`
- Current PR state: open, ready for review, mergeable, not draft
- Latest observed PR CI run: `26363373476`, all visible checks passed
- Branch content observed: 1 commit ahead of `main`

Observed implementation summary:

- Adds V1 cursor pagination clarification to
  `specs/contracts/api-guidelines.md`.
- Adds `apps/membership-worker/src/pagination.ts`.
- Adds optional cursor support to `membership-worker` success envelopes.
- Adds paginated repository methods for organizations-for-subject and members.
- Wires pagination into:
  - `GET /v1/organizations`
  - `GET /v1/organizations/{orgId}/members`
- Adds db, membership-worker, and api-edge tests.

Important verification risks:

- PR #61's changed file list does not currently include
  `ai/reports/task-0020-implementer.md`, although the report exists locally as
  an untracked file. A completed implementer report must be committed to the PR
  branch before PASS, or the PR must fail.
- Cursor decoding appears to accept any non-empty `t` and `i` strings from a
  valid base64 JSON payload. Verify malformed cursor payloads such as valid
  base64 with invalid timestamp or invalid UUID return `validation_failed`, not
  an internal database error.
- Cursor tokens use standard base64 (`btoa`). Verify they survive normal query
  parameter round-tripping, or switch to URL-safe encoding if needed.
- Membership-worker tests should prove pagination for both list routes. The
  observed tests heavily exercise member-list; verify `GET /v1/organizations`
  handler behavior is covered directly enough.

# Objective

Independently verify PR #61 against Task 0020.

If the PR is production-safe after any strictly Task 0020-scoped verifier fixes,
merge it, wait for the post-merge `main` pipeline, inspect CI logs, sync local
`main`, update compact orchestration context/state, and write a PASS report.

If it fails, leave the PR open, do not merge, and write a FAIL report with
concrete blockers.

# PR Boundary

This verifier task covers PR #61 only.

Allowed verifier changes are limited to:

- `ai/reports/task-0020-verifier.md`;
- adding or correcting the missing Task 0020 implementer report if the existing
  local report is accurate and task-scoped;
- small, strictly Task 0020-scoped fixes needed to make PR #61 safe to merge;
- compact orchestration context/state updates after verification is complete.

Do not add invitation endpoints, member mutation endpoints, project routes,
audit/event persistence, database migrations, Terraform resources, Supabase
resources, AWS IAM/S3/Secrets Manager resources, Queues, KV, R2, policy-engine
behavior changes, UI, SDK, CLI, billing, or `specs-v2/**` work.

# Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0020.md`
- `ai/reports/task-0020-implementer.md` if present locally or in the PR
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `ai/state.json`
- `specs/constitution.md`
- `specs/repo.md`
- `specs/orun-golden-path.md`
- `specs/contracts/api-guidelines.md`
- `specs/components/04-organizations-membership.md`
- `apps/membership-worker/src/http.ts`
- `apps/membership-worker/src/pagination.ts`
- `apps/membership-worker/src/router.ts`
- `apps/membership-worker/src/handlers/list-organizations.ts`
- `apps/membership-worker/src/handlers/list-members.ts`
- `apps/api-edge/src/org-facade.ts`
- `packages/db/src/membership/**`
- `tests/db/**`
- `tests/membership-worker/**`
- `tests/api-edge/**`
- PR #61 diff, commits, checks, review state, and CI logs
- GitHub Actions run `26363373476`

# Required Outcomes

## PR Review

- Confirm PR #61 has a real PR number, is based on current `main`, is not draft,
  is mergeable, and has green CI for the final head commit.
- Inspect the actual PR diff, commits, implementer report, and CI logs, not only
  PR summaries.
- Verify `ai/reports/task-0020-implementer.md` is committed in the PR before
  PASS. If it remains untracked or absent from the PR, fix or fail.
- Verify the PR is bounded to Task 0020:
  - API-guidelines pagination clarification;
  - membership-worker pagination helper;
  - response-envelope cursor support;
  - paginated membership repository methods;
  - list-route pagination wiring;
  - api-edge query-forwarding tests;
  - focused db and Worker tests.
- Verify no generated/ignored artifacts are committed, including `.orun/**`,
  `plan.json`, `dist/`, `node_modules/`, `.wrangler/`, TypeScript build info,
  Terraform working directories, or aggregate files.
- Verify no raw connection strings, database passwords, Supabase API keys,
  Cloudflare API tokens, AWS credentials, raw bearer tokens, invitation tokens,
  token hashes, signing secrets, encryption secrets, or Secrets Manager payloads
  are committed, logged, returned, or embedded in cursors.

## Pagination Contract Review

- Verify `specs/contracts/api-guidelines.md` clarifies V1 list pagination
  without widening task scope.
- Verify public semantics match the task:
  - query params: `limit` and `cursor`;
  - default limit `50`;
  - max limit `100`;
  - opaque endpoint-owned cursors;
  - invalid limit/cursor returns `validation_failed`;
  - response `meta.cursor` is next cursor or `null`;
  - no total count required.
- Verify cursor validation handles malformed base64, wrong version, missing
  fields, invalid timestamp, invalid ID, and valid-but-wrong-shape JSON safely.
- Verify cursor tokens are safe to round-trip through URL query parameters using
  normal `URLSearchParams` behavior.

## Repository Review

- Verify existing unpaginated repository methods remain available and compatible.
- Verify paginated methods:
  - use parameterized queries only;
  - use deterministic ordering with timestamp and stable ID tie-breaker;
  - use `limit + 1` reads;
  - apply cursor filtering correctly for descending order;
  - return the cursor for the last returned item when another page exists;
  - return `nextCursor: null` when no further page exists;
  - return safe internal errors without leaking SQL or parameters.
- Verify row-value comparisons are type-safe for actual Postgres columns,
  especially UUID `id` columns and timestamp cursor values.
- Verify db tests prove SQL shape, ordering, limit-plus-one, cursor filtering,
  next cursor behavior, and empty results.

## Membership Worker Review

- Verify `successResponse` still preserves existing envelope behavior when no
  cursor is supplied.
- Verify `GET /v1/organizations` parses and applies pagination.
- Verify `GET /v1/organizations/{orgId}/members` parses and applies pagination.
- Verify invalid `limit` and invalid `cursor` return safe `validation_failed`
  responses before database access where practical.
- Verify member list still authorizes through policy-worker action
  `organization.member.list` before reading member pages.
- Verify policy denial, actor role-list failure, member-list failure,
  member-role-list failure, malformed policy responses, and missing bindings
  still fail closed with no partial data.
- Verify organization create/read behavior remains unchanged.
- Verify public responses do not expose raw organization/member UUIDs,
  role-assignment IDs, project scope refs, token hashes, SQL, stack traces, or
  provider details.

## Api Edge Review

- Verify `api-edge` forwards `limit` and `cursor` query strings for:
  - `GET /v1/organizations`;
  - `GET /v1/organizations/{orgId}/members`.
- Verify `api-edge` continues to resolve auth through `IDENTITY_WORKER`.
- Verify raw bearer tokens are not forwarded to `membership-worker`.
- Verify unsupported methods and deeper nested routes keep existing safe
  behavior.

## CI And Logs Review

- Inspect PR CI logs for run `26363373476`, including successful jobs.
- Verify logs show `orun plan --changed --intent intent.yaml --output plan.json`
  and `orun run --plan plan.json --runner github-actions --remote-state` where
  applicable.
- Verify the changed plan includes expected db/db-tests, membership-worker,
  membership-worker-tests, api-edge/api-edge-tests, and relevant dependency jobs.
- Confirm no Terraform, Supabase, AWS, S3, Secrets Manager, KV, R2, Queue, or
  database migration work runs for this task.

## Merge And Post-Merge

If local review, checks, and PR CI are acceptable:

- Merge PR #61.
- Wait for the post-merge `main` pipeline to complete.
- Inspect post-merge CI logs, not only status summaries.
- Sync local `main` to `origin/main`, leave the local repo clean, and write the
  verifier report.
- Update compact orchestration context/state for Task 0020.

# Non-Goals

- No invitation create/list/revoke/accept endpoints.
- No member remove or role update endpoints.
- No project or environment routes.
- No identity profile enrichment.
- No audit/event persistence.
- No database migration.
- No policy-engine semantic changes.
- No live Terraform, Supabase, AWS IAM, S3, Secrets Manager, Queue, KV, R2, or
  Hyperdrive resource changes beyond Worker deploy/config changes caused by
  merging this PR.
- No product-specific `specs-v2/**` work.

# Acceptance Criteria

- PR #61 is verified against Task 0020 and does not exceed its boundary.
- Task 0020 implementer report is committed to the PR branch.
- Existing list routes support cursor pagination with default limit 50 and max
  limit 100.
- Invalid pagination params return `validation_failed`, including valid base64
  cursor payloads with invalid fields.
- Response `meta.cursor` carries an opaque next cursor only when another page is
  available.
- Repository page queries are deterministic, parameterized, and tested.
- Member list still authorizes before member data is loaded.
- Api-edge forwards pagination query params and still redacts bearer tokens.
- Local checks and PR CI pass for the final head commit.
- If PASS, PR #61 is merged, post-merge main CI passes, compact context/state
  are updated, and local `main` is clean.
- If FAIL or BLOCKED, PR #61 remains open and the verifier report lists concrete
  blockers.

# Verification

Run at minimum:

```bash
pnpm --filter @saas/db typecheck
pnpm --filter @saas/db-tests test
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

Do not create a new implementation PR. Verify PR #61.

If small verifier fixes are required and remain strictly within Task 0020,
commit them to `codex/task-0020-membership-cursor-pagination`, push the branch,
wait for CI again, and verify the final head before merge.

If fixes would exceed Task 0020, leave PR #61 open and write a FAIL report.

# When Done Report

Write `ai/reports/task-0020-verifier.md` with:

- Result: `PASS`, `FAIL`, or `BLOCKED`
- Checks
- Issues
- Risk Notes
- Spec Proposals
- Recommended Next Move

For PASS, include the PR merge commit, post-merge main CI run, and confirmation
that local `main` is clean.
