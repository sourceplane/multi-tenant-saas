# Task 0024 Implementer Report

## Summary

Added the first production use of the events/audit foundation by implementing a `TransactionalSqlExecutor` interface and wiring invitation revocation to atomically append an `invite.revoked` event and audit entry alongside the existing membership mutation.

## Files Changed

| File | Change |
|------|--------|
| `packages/db/src/hyperdrive/executor.ts` | Added `TransactionalSqlExecutor` interface with `transaction()` method using postgres `begin()` |
| `packages/db/src/hyperdrive/index.ts` | Export `TransactionalSqlExecutor` type |
| `apps/membership-worker/src/handlers/revoke-invitation.ts` | Wire transaction + event/audit append; add `eventsRepo` and `generateId` to deps interface |
| `tests/db/src/executor.test.ts` | 5 new tests for transaction seam |
| `tests/membership-worker/src/membership-worker.test.ts` | 5 new tests for event/audit wiring |
| `tests/membership-worker/package.json` | Add `@saas/db/events` Jest module mapper |

## Checks Run

| Check | Result |
|-------|--------|
| `pnpm --filter @saas/db typecheck` | Pass |
| `pnpm --filter @saas/membership-worker typecheck` | Pass |
| `pnpm --filter @saas/membership-worker build` | Pass |
| `pnpm --filter @saas/db-tests test` | 132 tests pass (2 pre-existing module resolution failures for membership/events test files unrelated to this task) |
| `pnpm --filter @saas/membership-worker-tests test` | 124 tests pass |
| `pnpm --filter @saas/api-edge-tests test` | 85 tests pass |
| `orun validate` | Pass |
| `orun plan --changed` | 11 jobs (5 components) |
| `orun run --dry-run --runner github-actions` | Pass |
| `git diff --check` | Clean |

## Assumptions

1. The `postgres` library's `.begin()` method provides proper `BEGIN`/`COMMIT`/`ROLLBACK` semantics compatible with Hyperdrive session mode.
2. Pre-existing `@saas/db/membership` and `@saas/db/events` module resolution failures in db-tests are unrelated to this task (they fail with the same error on main).
3. The `createSqlExecutor` return type widening to `TransactionalSqlExecutor` is backward-compatible since it extends `SqlExecutor`.

## Spec Proposals

None required. The transaction implementation uses the postgres client's native `.begin()` which is safe in the Worker/Postgres adapter.

## Remaining Gaps

- Other membership mutations (create invitation, accept invitation, member removal, role update) do not yet emit events. Future tasks will wire them using the same transaction pattern.
- The 2 pre-existing db-tests module resolution failures should be fixed in a separate maintenance task.

## Next Task Dependencies

- Future event-emitting tasks can reuse `TransactionalSqlExecutor` without additional db changes.
- Public audit read API (future task) will query `events.audit_entries` populated by this task's writes.

## PR Number

65
