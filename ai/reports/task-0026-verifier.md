# Task 0026 — Verifier Report

## Result: PASS

PR #67 is approved for merge.

## PR Number and Merge Status

- **PR:** #67 — `feat: wire invite.created and invite.accepted events atomically`
- **Branch:** `codex/task-0026-invite-create-accept-events` → `main`
- **Merge status:** Approved, not yet merged

## Checks Run

All 10 local/branch checks passed.

| Command | Result |
|---------|--------|
| `git diff --check` | clean |
| `pnpm --filter @saas/db typecheck` | pass |
| `pnpm --filter @saas/db-tests test` | 228 pass |
| `pnpm --filter @saas/membership-worker typecheck` | pass |
| `pnpm --filter @saas/membership-worker-tests test` | 140 pass |
| `pnpm --filter @saas/membership-worker build` | dry-run pass |
| `pnpm --filter @saas/api-edge-tests test` | 85 pass |
| `orun validate --intent intent.yaml` | pass |
| `orun plan --changed --intent intent.yaml --output plan.json` | 3 components × 3 envs → 7 jobs |
| `orun run --plan plan.json --dry-run --runner github-actions` | 7 jobs OK |
| `gh pr checks 67` | 8/8 checks pass |

## Scope and PR Hygiene

- PR #67 changes exactly 3 files:
  - `apps/membership-worker/src/handlers/create-invitation.ts`
  - `apps/membership-worker/src/handlers/accept-invitation.ts`
  - `tests/membership-worker/src/membership-worker.test.ts`
- No migrations, infra, service bindings, api-edge, events-worker, queue, UI, SDK, CLI, or `specs-v2/**` changes.
- No ignored generated outputs staged or committed (`dist`, `node_modules`, `.orun`, `plan.json`).
- `git diff --check` confirms no whitespace or merge-conflict markers.

## Verification Findings

### 1. `invite.created` behavior — PASS

- Policy authorization and actor role lookup (lines 87-103) execute before the mutation and before event append — fully outside the transaction.
- Production path uses `executor.transaction(...)` (line 113) with both `membershipRepository` and `eventsRepository` constructed from the shared transaction-bound executor.
- `createInvitation(...)` failure returns `{ createResult }` early inside the callback, never reaching the event append call.
- Event/audit append failure throws `new Error("event_append_failed")` (line 156) inside the transaction callback → postgres.js `sql.begin` rolls back the entire transaction, aborting the invitation creation.
- Public response shape retains the existing Task 0021 format: `{ invitation: { id, email, role, status, ... } }` with optional `delivery` envelope. Debug token behavior preserved and the raw token is never emitted in event/audit data.

### 2. `invite.accepted` behavior — PASS

- Acceptance code path has no policy-worker call — no `PolicyWorker` binding access in the handler, no `authorizeViaPolicy` import.
- Production path uses `executor.transaction(...)` (line 87) with both repositories from the transaction-bound executor.
- Repository errors (`not_found`, `expired`, `revoked`, `already_accepted`, `conflict`, internal) are handled **before** event append in both the transactional path (lines 137-150) and the sequential seam (lines 195-208). No event is appended on these paths.
- Event/audit append failure throws `new Error("event_append_failed")` (line 131) inside the transaction → invitation accepted state, member creation, and role-assignment creation roll back together.
- Public response shape matches Task 0022: `{ invitation: {...}, membership: { id, role, joinedAt, status } }`.

### 3. Event/audit contents and secrecy — PASS

- Event types: `invite.created` and `invite.accepted` (matches spec component 04 events list).
- Version: `1`, source: `membership-worker`, actor: authenticated actor context (`actorType` + `actorId`), trace: `requestId`.
- Organization identifier: `orgPublicId(orgUuid)` → `org_` prefixed hex — always public IDs, never raw DB UUIDs.
- Subject kind: `invitation`, subject ID: `invitationPublicId(...)` → `inv_` prefixed hex.
- Accepted member ID: `memberPublicId(member.id)` → `mem_` prefixed hex.
- Payloads contain only audit-safe metadata:
  - `invite.created`: `{ role, expiresAt }` — no email, no token, no hash, no UUID.
  - `invite.accepted`: `{ role, memberId }` — no email, no token, no hash, no UUID.
- Audit descriptions: `"Invitation inv_... created"` / `"Invitation inv_... accepted"` — human-readable, no secrets.
- Audit category: `membership` — stable, low-cardinality.
- No raw invitation tokens, token hashes, bearer tokens, invitee email, provider details, SQL, stack traces, or debug delivery tokens in any event/audit field.
- Tests explicitly verify these exclusions for both create and accept.

### 4. Test adequacy — PASS

The implementer added 16 new tests (7 for create events + 9 for accept events):

**Create event tests:**
- `successful create appends invite.created event/audit via eventsRepo` — covers type, version, source, actor, subject, org ID, request ID, payload (role, expiresAt), audit category and description.
- `create event/audit append failure returns safe error and prevents commit` — append fails → 500.
- `create policy denial appends no event` — denial exits before mutation → no event.
- `create validation failure appends no event` — bad email/role exits before mutation.
- `create repository failure appends no event` — createInvitation failure exits before event.
- `create event/audit values use public IDs and do not expose raw UUIDs or tokens` — secrets audit.
- `create response shape remains compatible with existing tests` — backward compatibility.

**Accept event tests:**
- `successful accept appends invite.accepted event/audit via eventsRepo`
- `accept event/audit append failure returns safe error and prevents commit`
- `accept not-found appends no event` — not_found → 404, no event.
- `accept expired appends no event` — expired → 404, no event.
- `accept revoked appends no event` — revoked → 404, no event.
- `accept already-accepted appends no event` — already_accepted → 404, no event.
- `accept conflict appends no event` — conflict → 409, no event.
- `accept event/audit values use public IDs and do not expose raw UUIDs or tokens`
- `accept response shape remains compatible`

**Transaction atomicity coverage note:**
The unit tests exercise the dependency-injected sequential seam (`deps.eventsRepo`), not the production `executor.transaction()` path directly. Production atomicity is established by:
1. Code path inspection of both handlers confirming the `executor.transaction(...)` pattern mirrors Task 0024's verified `invite.revoked` wiring exactly.
2. The same `createSqlExecutor` / `TransactionalSqlExecutor` implementation (`packages/db/src/hyperdrive/executor.ts`) used across all existing transactional paths.
3. The `throw new Error("event_append_failed")` pattern is identical to the Task 0024 revoke pattern, and postgres.js `sql.begin` guarantees full rollback on unhandled exceptions.
4. Existing executor unit tests (`tests/db/src/executor.test.ts`) validate the transaction seam behavior.

This is a conscious design choice documented in the implementer report's "Remaining Gaps" section. The code path inspection is sufficient — adding a production transaction fake would require either an integration test with a real Hyperdrive/Postgres connection or a major test infrastructure change.

## Verifier Fixes

None required. The implementation matches the task spec and the established Task 0024 pattern. All local checks pass, all PR CI checks pass, and git diff --check is clean.

## Risk Notes

1. **Transaction atomicity in unit tests** — documented above. Acceptable risk; the production code path is verified by code review and mirrors the proven Task 0024 pattern.
2. **`randomHex` helper duplication** — both `create-invitation.ts` and `accept-invitation.ts` define an identical `randomHex(bytes)` function. This was noted in the implementer report as acceptable duplication. Low risk; a future cleanup task could extract it.
3. **Event ID collision risk** — event event IDs are `randomHex(16)` (128 bits random). Extremely low collision probability within a single transaction. If a collision occurs, `appendEventWithAudit` uses `ON CONFLICT (id) DO NOTHING` and returns `conflict`, which causes the throw inside the transaction → rollback. Safe behavior.
4. **No invitee email in event payload** — per task spec preference ("Prefer omitting invitee email from event/audit payload"). If audit requirements later demand email in events, a redaction path and tests will be needed.

## Spec Proposals

None. The implementation matches the active specs:
- `specs/components/04-organizations-membership.md` — lists `invite.created`, `invite.accepted`, `invite.revoked` as required events. All three are now wired.
- `specs/contracts/event-envelope.schema.yaml` — event content complies with the envelope schema.
- `specs/components/09-events-audit-observability.md` — audit coverage now includes member invitation and acceptance.

## Recommended Next Move

**Merge PR #67** — all verification criteria are satisfied:

1. Scope and PR hygiene: PASS
2. `invite.created` behavior: PASS
3. `invite.accepted` behavior: PASS
4. Event/audit contents and secrecy: PASS
5. Test adequacy: PASS

After merge, sync local `main` to the merge commit, confirm the post-merge main CI run starts, and leave `ai/state.json` and compact context ready for the Orchestrator.