# Task ID

Task 0026

# Agent

Verifier

# Current Repo Context

- Task 0026 implementer report: `ai/reports/task-0026-implementer.md`.
- PR #67 is open:
  `feat: wire invite.created and invite.accepted events atomically`
  (`codex/task-0026-invite-create-accept-events` → `main`).
- PR #67 CI run `26382990385` passed all 8 checks:
  - `plan`
  - `membership-worker-tests · dev · Verify`
  - `membership-worker · dev/stage/prod · Verify deploy`
  - `policy-worker · dev/stage/prod · Verify deploy`
- Local orchestrator spot checks passed on the PR branch:
  - `pnpm --filter @saas/membership-worker typecheck`
  - `pnpm --filter @saas/membership-worker-tests test` (140 tests)
- PR #67 changes only:
  - `apps/membership-worker/src/handlers/create-invitation.ts`
  - `apps/membership-worker/src/handlers/accept-invitation.ts`
  - `tests/membership-worker/src/membership-worker.test.ts`
- Tasks 0001-0025 are verified. Task 0024 established the
  `TransactionalSqlExecutor` pattern and wired `invite.revoked`.

# Objective

Verify that PR #67 correctly wires `invite.created` and `invite.accepted`
event/audit emission atomically with invitation create/accept mutations, without
changing public API behavior or broadening scope.

# PR Boundary

One PR verification. Fixes may be committed to the same PR branch only if they
are required to satisfy Task 0026 acceptance criteria. Do not add new feature
scope.

# Read First

- `ai/tasks/task-0026.md`
- `ai/reports/task-0026-implementer.md`
- `ai/context/current.md`
- `ai/context/task-ledger.md`
- `ai/context/decisions.md`
- `ai/context/open-risks.md`
- `specs/contracts/event-envelope.schema.yaml`
- `specs/contracts/tenancy-and-rbac.md`
- `specs/components/04-organizations-membership.md`
- `specs/components/09-events-audit-observability.md`

Then inspect:

- PR #67 diff and changed-file list
- `apps/membership-worker/src/handlers/create-invitation.ts`
- `apps/membership-worker/src/handlers/accept-invitation.ts`
- `apps/membership-worker/src/handlers/revoke-invitation.ts` for the Task 0024
  established pattern
- `packages/db/src/hyperdrive/executor.ts`
- `packages/db/src/events/repository.ts`
- `tests/membership-worker/src/membership-worker.test.ts`

# Required Verification

1. Scope and PR hygiene
   - Confirm PR #67 changes only the membership-worker create/accept handlers
     and focused membership-worker tests.
   - Confirm no migrations, infra, service bindings, api-edge behavior,
     events-worker, queue, UI, SDK, CLI, or `specs-v2/**` changes.
   - Confirm no ignored generated outputs are staged or committed.

2. `invite.created` behavior
   - Confirm policy authorization and actor role lookup happen before mutation
     and before event append.
   - Confirm the production path uses `executor.transaction(...)` and constructs
     membership and events repositories from the transaction-bound executor.
   - Confirm `createInvitation(...)` failure does not append an event.
   - Confirm event/audit append failure throws inside the transaction callback so
     the invitation creation rolls back.
   - Confirm public response shape and debug-delivery token behavior remain
     compatible with Task 0021.

3. `invite.accepted` behavior
   - Confirm acceptance does not add a policy-worker call.
   - Confirm the production path uses `executor.transaction(...)` and constructs
     membership and events repositories from the transaction-bound executor.
   - Confirm repository errors (`not_found`, `expired`, `revoked`,
     `already_accepted`, `conflict`, internal) do not append events and map to
     the existing public status/error behavior.
   - Confirm event/audit append failure throws inside the transaction callback so
     invitation accepted state, member creation, and role-assignment creation
     roll back.
   - Confirm public response shape remains compatible with Task 0022.

4. Event/audit contents and secrecy
   - Confirm event types are exactly `invite.created` and `invite.accepted`.
   - Confirm version `1`, source `membership-worker`, actor from authenticated
     context, and request ID are used.
   - Confirm org, invitation, and accepted member identifiers are public IDs
     (`org_`, `inv_`, `mem_`) and raw database UUIDs are not used in event/audit
     fields intended for public audit queries.
   - Confirm payloads and audit descriptions do not include raw invitation
     tokens, token hashes, bearer tokens, invitee email, provider details, SQL,
     stack traces, or generated debug delivery tokens.
   - Confirm audit category is stable and low-cardinality (`membership`).

5. Test adequacy
   - The implementer report states the unit tests exercise the injected
     sequential seam, while production atomicity is established by code path
     inspection. Treat this as a verification focus.
   - If code review of the production transaction path is sufficient and the
     existing Task 0024 transaction seam tests still cover transaction rollback,
     document that explicitly.
   - If acceptance criteria require a stronger transaction fake or production
     path test for create/accept rollback, add a verifier fix to PR #67 before
     merge.
   - Confirm tests cover no-event behavior for denial, validation/repository
     failures, and accept not-found/expired/revoked/already-accepted/conflict
     paths.

# Required Checks

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
gh pr checks 67
```

If you add verifier fixes, rerun the affected local checks and ensure PR CI is
green after pushing.

# Merge Requirement

If verification passes:

- Merge PR #67.
- Sync local `main` to the merge commit.
- Confirm the post-merge main CI run starts or, if already complete, record its
  result.
- Leave `ai/state.json` and compact context ready for the Orchestrator to record
  Task 0026 as verified.

If verification fails:

- Keep PR #67 open.
- Either commit scoped verifier fixes to the PR branch or write a concise FAIL
  report explaining the blocker.

# Report Expectations

Write `ai/reports/task-0026-verifier.md` with:

- Result: PASS or FAIL.
- PR number and merge status.
- Checks run with exact commands and results.
- Findings/issues, if any.
- Verifier fixes, if any.
- Risk notes, especially around transaction atomicity coverage.
- Spec proposals, if any.
- Recommended next move.
