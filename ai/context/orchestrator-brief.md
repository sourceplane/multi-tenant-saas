# Orchestrator Brief

## Snapshot
- snapshot_at: 2026-05-31T21:00:00Z
- head_sha: 2b98507 (origin/main, Task 0121 squash-merge) | 0 open PRs
- state_json_mtime_marker: post-task-0121-verifier-PASS
- last_task_id: task-0121-verifier (DONE — PASS)
- last_report_id: task-0121-verifier
- cycle_mode: warm
- repo_health: green

## Working Hypothesis
Task **0121 is CLOSED** — verifier PASS, PR **#176** squash-merged as `2b98507`
on main. The full B7 audit-log filtering + export milestone shipped end to end in
ONE combined PR (17 files, +1218/-55) across DB → contracts → events-worker → SDK
→ CLI → Console, with the Console deploy leg proven on post-merge main-CI run
`26715563040` (21/21) + a live prod-Worker probe (`/`→307→`/orgs`→200,
`/orgs/test/audit`→200). Both inherited facts resolved: Phase-0 report fix-up done
(`d70291f`), 400→422 accepted as the canonical worker convention (no spec proposal).
The orchestrator's next move is to **scope the next forward milestone** — ranked #1
below is the B7 security-events surface.

Carry-forward nit (non-blocking, no task needed yet): `cross-reads.ts`
`parseAuditFilterFlags` doc-comment still says malformed input "surfaces as a 400" —
worker returns 422. Fold into any future cross-reads touch.

## Hot Files
- hot_context_sections: `current.md#active-task-0121-verifier`,
  `task-ledger.md#task-0121`
- hot_code (Task 0121 verifier inspection targets):
  - `packages/db/src/events/repository.ts` (`queryAuditByOrg` parameterized
    filter clauses; SQL-injection-safety + cursor-keyset-unchanged check)
  - `apps/events-worker/src/pagination.ts` (`parseAuditFilters`) +
    `src/handlers/list-audit.ts` (422 wiring) + `src/http.ts:36` (422 convention)
  - `packages/contracts/src/events.ts` (`AuditQueryByOrg` +7 fields;
    `PublicAuditEntry`/envelope byte-stable)
  - `packages/sdk/src/events.ts` (`iterAuditEntries` per-page filter survival +
    `exportAuditEntriesNdjson`) + `src/index.ts`
  - `packages/cli/src/commands/cross-reads.ts` + `cli-runner.ts` (filter flags +
    `--format=ndjson` mutex)
  - `apps/web-console-next/src/components/audit/audit-log.ts` +
    `audit/page.tsx` (SDK-only, deploy-gated)
  - read-only ref: `apps/api-edge/src/audit-facade.ts` (must be UNCHANGED)

## Deferred Watch
- `0085b` (cloudflare-domain v4→v5): user lifts the defer.
- `notifications-provider-swap`: user names provider + sender domain / API key.
- `notifications-worker-dev-reframe`: depends on dev-deploy-lane design pass.
- `optional-spec-13-commands`: backend lands `/v1/components`, `/v1/resources`,
  `/v1/deployments` GET (+ `resource create` POST) on api-edge + contracts.

## Invalidate When
- Orchestrator scopes the next forward milestone (B7 security-events surface,
  ranked #1) → this brief is superseded.
- `current.md` rewritten outside the orchestrator's hand.
- `state.json.goal` changes, or a new spec proposal under `/ai/proposals/` is filed.

## Next Move
**Orchestrator (next cycle): scope the next forward milestone.** Task 0121 is
closed (verifier PASS, PR #176 merged `2b98507`). Ranked pick #1 below is the
B7 security-events surface — a separate leg from 0121's audit filtering.

## Ranked Candidate Queue
1. **B7 security-events surface** — `querySecurityEvents` consumer exposure
   (DB → contracts → events-worker → SDK → CLI → Console), explicitly out of
   scope for 0121. Next forward leg. Mirror the 0121 keyset/cursor/parameterized
   -SQL/422 conventions.
2. **`VALID_CONTEXTS` drift-proofing (hygiene)** — derive the test array from the
   `BoundedContext` union via `as const`. Low priority.
3. **B8 admin-worker scaffold** — greenfield; cross-tenant ops surface. Later.

## Open Questions To Self
- For the B7 security-events leg: confirm whether `querySecurityEvents` already
  exists in `packages/db` (read-side) or needs the full DB→Console stack — scope
  accordingly to avoid over/under-reach.
- Carry the 0121 cross-reads "400→422" comment nit into the first security-events
  cross-reads touch (non-blocking, no standalone task).
