# Task ID

Task 0024 Verifier

# Agent

Verifier

# Current Repo Context

The reusable SaaS starter spec pack under `specs/**` is authoritative for this
verification. `specs-v2/**` is out of scope.

Task 0024 implementation is open as PR #65:

- URL: https://github.com/sourceplane/multi-tenant-saas/pull/65
- Branch: `task-0024-invite-revoked-event-audit`
- Head commit observed when this verifier prompt was written:
  `e48c1cfa112b037ba38af95ebe87fb30dd168387`
- Base: `main` at `de89408a7cda9c60ce0fae33d3d2ce09918debb1`
- Current PR state: open, ready for review, mergeable clean, not draft
- Latest observed PR CI run: `26379797141`, completed successfully
- Branch content observed: 1 commit ahead of `main`

Observed implementation summary:

- Adds `TransactionalSqlExecutor` and `transaction(...)` support in
  `@saas/db/hyperdrive`.
- Wires membership-worker invitation revocation to append an `invite.revoked`
  event and audit entry using `@saas/db/events`.
- Adds db executor tests and membership-worker tests for the new event/audit
  path.
- Adds `ai/reports/task-0024-implementer.md`.

Important verification risks:

- The dependency-injected unit-test path can run revoke then event append
  sequentially without rollback. That may be acceptable only as a test seam; the
  production path must always use `TransactionalSqlExecutor.transaction(...)`.
- The verifier must prove event append failure in the production path rolls back
  the invitation revoke, not merely that the injected fake returns a 500.
- The implementer report claims two `@saas/db` module-resolution failures in
  full db-tests are pre-existing. PR CI shows `db-tests` green. Run the full
  local command and investigate any mismatch before PASS.
- PR #65 changes Worker deploy components. Verifier must inspect CI logs for
  membership-worker stage/prod deployment jobs, not just status summaries.

# Objective

Independently verify PR #65 against Task 0024.

If the PR is production-safe after any strictly Task 0024-scoped verifier fixes,
merge it, wait for the post-merge `main` pipeline, inspect CI logs, sync local
`main`, update compact orchestration context/state, and write a PASS report.

If it fails, leave the PR open, do not merge, and write a FAIL report with
concrete blockers.

# PR Boundary

This verifier task covers PR #65 only.

Allowed verifier changes are limited to:

- `ai/reports/task-0024-verifier.md`;
- small, strictly Task 0024-scoped fixes needed to make PR #65 safe to merge;
- compact orchestration context/state updates after verification is complete.

Do not add member removal, member role update, organization settings,
project/environment routes, event emission for other routes, public audit APIs,
events-worker runtime, queue fanout, notification delivery, UI, SDK, CLI,
Terraform resources, Cloudflare resources, Supabase project changes, AWS IAM/S3/
Secrets Manager resources, or `specs-v2/**` work.

# Read First

- `agents/orchestrator.md`
- `ai/tasks/task-0024.md`
- `ai/reports/task-0024-implementer.md`
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
- `specs/components/04-organizations-membership.md`
- `specs/components/09-events-audit-observability.md`
- `packages/db/src/hyperdrive/executor.ts`
- `packages/db/src/hyperdrive/index.ts`
- `packages/db/src/events/repository.ts`
- `apps/membership-worker/src/handlers/revoke-invitation.ts`
- `tests/db/src/executor.test.ts`
- `tests/membership-worker/src/membership-worker.test.ts`
- PR #65 diff, commits, checks, review state, and CI logs
- GitHub Actions run `26379797141`

# Required Outcomes

## PR Review

- Confirm PR #65 has a real PR number, is based on current `main`, is not draft,
  is mergeable, and has green CI for the final head commit.
- Inspect the actual PR diff, commits, implementer report, and CI logs, not only
  PR summaries.
- Verify `ai/reports/task-0024-implementer.md` is committed in the PR.
- Verify the PR is bounded to Task 0024:
  - transaction-capable SQL seam;
  - invitation revoke event/audit wiring;
  - focused db and membership-worker tests.
- Verify no generated/ignored artifacts are committed, including `.orun/**`,
  `plan.json`, `dist/`, `node_modules/`, `.wrangler/`, TypeScript build info,
  Terraform working directories, or aggregate files.
- Verify no raw connection strings, database passwords, Supabase API keys,
  Cloudflare API tokens, AWS credentials, bearer tokens, invitation tokens,
  token hashes, signing secrets, encryption secrets, or Secrets Manager payloads
  are committed, logged, returned, or embedded in fixtures.

## Transaction Seam Review

- Verify `TransactionalSqlExecutor` is backward-compatible with existing
  `SqlExecutor` call sites.
- Verify `createSqlExecutor(...)` still supports existing `execute(...)` and
  `dispose()` behavior.
- Verify `transaction(...)` uses the underlying `postgres` client's native
  transaction support and passes a transaction-bound executor to the callback.
- Verify callback success commits and callback throw rejects/rolls back according
  to postgres.js semantics.
- Verify transaction support does not leak the root executor into transaction
  repository calls.
- Verify no Supabase migration runner or unrelated adapter behavior changed.

## Invitation Revoke Event/Audit Review

- Verify production revoke flow creates membership and events repositories from
  the same transaction executor.
- Verify authorization remains outside the mutation and fails closed:
  - invalid org/invitation IDs append no event;
  - missing DB appends no event;
  - missing policy-worker appends no event;
  - policy denial appends no event;
  - policy service errors append no event.
- Verify `revokeInvitation(...)` not found/internal errors append no event.
- Verify `appendEventWithAudit(...)` failure or conflict rolls back the
  invitation revoke in the production transaction path.
- Verify the dependency-injected non-transaction path is only a unit-test seam
  and cannot be reached in production with real `SOURCEPLANE_DB`.
- Verify public API response shape for successful revoke is unchanged from
  Task 0021.
- Verify route still returns safe envelopes for not found, policy denial,
  internal errors, and event append failure.

## Event/Audit Content Review

- Verify event type is exactly `invite.revoked`, version `1`, source
  `membership-worker`.
- Verify actor values come from authenticated actor context.
- Verify event/audit org and invitation identifiers use public IDs (`org_...`,
  `inv_...`) and do not expose raw UUIDs.
- Verify tenant scope is the route organization, not inferred from invitation
  alone.
- Verify event subject is the invitation target.
- Verify trace includes `requestId`.
- Verify payload and audit description contain no raw invitation token, token
  hash, bearer token, raw DB UUID, SQL, provider details, stack trace, or secret
  values.
- Verify audit category is stable and low-cardinality, such as `membership`.
- If email or other sensitive metadata is included, verify redaction paths are
  present and follow the Task 0023 convention.

## Test Review

- Run the full required test surface, not only focused tests.
- If full db-tests fail locally with module-resolution errors, prove whether the
  same failure exists on untouched `main`. If not pre-existing, fix it before
  PASS.
- Add or update tests if verifier fixes production-path transaction atomicity,
  event/audit content, or unsafe dependency-injection behavior.
- Confirm tests exercise production transaction behavior where practical, not
  only the injected sequential path.

## CI And Deployment Evidence

- Inspect PR CI run `26379797141` logs, including successful jobs.
- Confirm PR CI logs show Orun planned and ran expected components:
  db, db-tests, membership-worker-tests, membership-worker deploy verification,
  and policy-worker dependencies where selected by the plan.
- Confirm membership-worker stage/prod deploy verification jobs ran and passed.
- If verification adds a fix, push it and wait for a new PR CI run to pass.
- After merge, inspect post-merge `main` CI logs, especially membership-worker
  stage/prod deploy jobs.
- If Cloudflare inspection is available, verify non-secret deployed Worker
  metadata for membership-worker stage/prod. If local provider access is
  unavailable, record the blocker and rely on CI logs.

# Verification Commands

Run at minimum:

```bash
pnpm --filter @saas/db typecheck
pnpm --filter @saas/db-tests test
pnpm --filter @saas/membership-worker typecheck
pnpm --filter @saas/membership-worker-tests test
pnpm --filter @saas/membership-worker build
pnpm --filter @saas/api-edge-tests test
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
git diff --check
```

Also inspect PR CI run `26379797141` and its logs. The observed run completed
successfully with 12/12 checks.

# Merge And Post-Merge

If local review, checks, and PR CI are acceptable:

- Merge PR #65.
- Wait for the post-merge `main` pipeline to complete.
- Inspect post-merge CI logs, including membership-worker stage/prod jobs, not
  only status summaries.
- Sync local `main` to `origin/main`.
- Update `ai/context/current.md`, `ai/context/task-ledger.md`,
  `ai/context/decisions.md`, `ai/context/open-risks.md`, and `ai/state.json`.
- Leave the local repo clean except for unrelated pre-existing user artifacts.
- Write `ai/reports/task-0024-verifier.md`.

If verification fails:

- Leave PR #65 open.
- Do not merge.
- Write `ai/reports/task-0024-verifier.md` with `Result: FAIL` and concrete
  blockers.

# Verifier Report

Write `ai/reports/task-0024-verifier.md` with:

- Result: PASS|FAIL
- Checks
- Issues
- Risk Notes
- Spec Proposals
- Recommended Next Move

If PASS, include PR number, merge commit, post-merge main CI run, and non-secret
deployment evidence for membership-worker stage/prod.
