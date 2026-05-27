# Task 0037 Implementer Report

## Summary

Normalized membership-worker event/audit canonical IDs to use raw internal UUIDs instead of public IDs (`org_`, `inv_`, `mem_` prefixes) in persistence fields. Added backward-compatibility logic in the events repository to query legacy membership audit rows that were previously stored with public `org_` IDs.

## Files Changed

### Membership Worker Handlers
- `apps/membership-worker/src/handlers/create-invitation.ts` — Changed `event.orgId` and `event.subjectId` to raw UUIDs; kept public IDs in payload/description
- `apps/membership-worker/src/handlers/revoke-invitation.ts` — Changed `event.orgId` and `event.subjectId` to raw UUIDs
- `apps/membership-worker/src/handlers/accept-invitation.ts` — Changed `event.orgId` and `event.subjectId` to raw UUIDs
- `apps/membership-worker/src/handlers/update-member-role.ts` — Changed `event.orgId` and `event.subjectId` to raw UUIDs
- `apps/membership-worker/src/handlers/remove-member.ts` — Changed `event.orgId` and `event.subjectId` to raw UUIDs

### Events Repository
- `packages/db/src/events/repository.ts` — Added `queryAuditByOrg` backward-compatibility for legacy public `org_` IDs; query now matches both raw UUID and legacy public ID forms

### Tests
- `tests/membership-worker/src/membership-worker.test.ts` — Updated to expect raw UUIDs in canonical event fields
- `tests/db/src/events.test.ts` — Added tests for backward compatibility with legacy `org_` audit rows

## Checks Run

- Orun validation: `orun validate` — PASS
- Orun changed plan: `orun plan --changed` — PASS (selected relevant components)
- Orun dry-run: `orun run --plan plan.json --dry-run` — PASS (all Verify jobs)
- GitHub PR #78: All 29 CI jobs passed

## Assumptions

- Legacy membership audit rows (stored with `org_` public IDs in `org_id` column) should be queryable alongside new rows without data migration
- Raw UUIDs in canonical fields follow the pattern established by projects-worker
- Public ID mapping in events-worker list-audit handler already handles the `inv_` and `mem_` prefixes

## Spec Proposals

None — Implementation follows existing patterns and task constraints.

## Remaining Gaps

None — All acceptance criteria met.

## Next Task Dependencies

- Next task is Task 0038: None identified (check task-ledger.md for future roadmap)

## PR Number

PR #78 (`feat(membership-worker): canonicalize audit event IDs to raw UUIDs`), squash-merged at commit `de0a351bd223daecee72409a0c14553e9cefc0f1`