# Orchestrator Brief

## Snapshot
- snapshot_at: 2026-05-31T20:00:00Z
- head_sha: ef38e780 (origin/main, Task 0121 scope commit) | PR #176 head 40d9f43
- state_json_mtime_marker: post-task-0121-verifier-scope
- last_task_id: task-0121-verifier (emitted)
- last_report_id: task-0121-implementer (UNTRACKED — Phase-0 fix-up owed)
- cycle_mode: warm
- repo_health: green

## Working Hypothesis
Last cycle the brief said "Task 0121 scoped, awaiting implementer." Reality this
cycle: the **implementer pass completed** — PR **#176** is OPEN, MERGEABLE/CLEAN,
**21/21 PR-CI green** at HEAD `40d9f43` (base `ef38e780` = origin/main, 0 behind),
delivering the full B7 audit-log filtering + export milestone in ONE combined PR
(17 files, +1218/-55). Per Operating Loop steps 15-16 + the "forgetting verifier
tasks exist" pitfall, the orchestrator's correct move was to **emit the matching
verifier task BEFORE any new forward work** — done: `ai/tasks/task-0121-verifier.md`.

Two facts the verifier inherits, both pre-resolved by orchestrator inspection:
1. **Phase-0 report fix-up** — `ai/reports/task-0121-implementer.md` is UNTRACKED,
   never committed to the PR branch (recurring 0031-0034/0106 gap). Verifier
   commits + pushes it, re-polls CI before merge.
2. **400 → 422 reconciliation** — task prompt acceptance said 400 on malformed
   from/to + bad actorType; implementer shipped **422 validation_failed**.
   Confirmed 422 is the canonical events-worker convention
   (`apps/events-worker/src/http.ts:36` `validationError` → 422). ACCEPT per
   trust-code-over-docs; NO spec proposal (worker error-envelope detail).

## Ranked Candidate Queue
1. **Task 0121 verifier** (EMITTED THIS CYCLE) — execute next. Console leg
   DEPLOY-GATED: PASS gate = post-merge main-CI smoke + live prod-Worker
   audit-page probe (`/`→307→`/orgs`→200), not PR-CI alone.
2. **B7 follow-on / security-events surface** — `querySecurityEvents` consumer
   exposure (explicitly out of scope for 0121). Next forward leg once 0121 closes.
3. **`VALID_CONTEXTS` drift-proofing (hygiene)** — derive the test array from the
   `BoundedContext` union via `as const`. Low priority.
4. **B8 admin-worker scaffold** — greenfield; cross-tenant ops surface. Later.

## In-Flight
- PR #176 OPEN (`impl/task-0121-audit-filter-export`), 21/21 CI green, 0 behind.
- Verifier task awaiting pickup. No mid-write implementer worktree.

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
- Task 0121 verifier merges PR #176 → orchestrator scopes the next forward
  milestone (B7 security-events surface is the ranked #2).
- Verifier reports FAIL → orchestrator re-scopes blockers within the milestone.
- `current.md` rewritten outside the orchestrator's hand.
- `state.json.goal` changes, or a new spec proposal under `/ai/proposals/` is filed.

## Next Move
Verifier agent (next pickup): execute `ai/tasks/task-0121-verifier.md` —
Phase-0 commit the untracked implementer report to the PR branch + re-poll CI;
Phase 1 confirm the 17-file boundary; Phase 2 hazard/forbidden-zone scan
(api-edge UNCHANGED, zero `fetch` in Console, no parked-zone touches); Phase 3
SQL-safety + cursor-keyset-unchanged + filter-survives-≥2-pages + 422-accept;
Phase 4-6 quality + Orun + PR-CI log gates; Phase 6.5 BEHIND-main rebase if needed;
**Phase 7 MANDATORY** squash-merge + post-merge main-CI deploy + live prod-Worker
audit-page probe; Phase 8 verifier report + PASS/FAIL bookkeeping on main.

After Task 0121 verifier closes (PASS + merged), the orchestrator's next forward
pick is the **B7 security-events (`querySecurityEvents`) consumer surface** — a
separate leg from 0121's audit filtering.

## Open Questions To Self
- Confirm the verifier actually inspects the `iterAuditEntries` per-page query
  reconstruction (events.ts ~L177) and the ≥2-page filter-survival test — the
  silent drop-after-page-1 bug is the highest-risk seam in this milestone.
- If post-merge prod-Worker audit-page probe needs a seeded org slug, fall back to
  `/orgs` 200 + green web-console-next-tests jest as the Console proof (do not
  invent an org/audit fixture).
