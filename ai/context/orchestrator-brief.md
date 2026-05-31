# Orchestrator Brief

## Snapshot
- snapshot_at: 2026-05-31T14:00:00Z
- head_sha: 99877e0 (main code, PR #175 squash) / bookkeeping advancing past c393dc3
- state_json_mtime_marker: post-task-0121-scope
- last_task_id: task-0121 (implementer)
- last_report_id: task-0120-verifier
- cycle_mode: warm
- repo_health: green

## Working Hypothesis
Task 0120 (B5 webhook delivery history) is **VERIFIED PASS + MERGED** (PR #175
squash `99877e0`); its verifier report has landed. No open PRs, working tree
clean. The orchestrator's job this cycle was to **scope the next forward
milestone** and emit its implementer prompt.

Selected forward pick: **Task 0121 — B7 audit-log filtering + export**
(`ai/tasks/task-0121.md`, milestone `B7-audit-log-filtering-export`). The audit
BACKEND is shipped but filter-poor: the org-scoped read API supports ONLY a
`category` filter + cursor pagination (verified by inspection this cycle, NOT to
be rebuilt). The milestone makes the stream buyer-credible by adding actor /
resource(subject) / action(eventType) / time-range filters + an NDJSON export,
end to end across DB → worker → contracts → SDK → CLI → Console, each with tests.
api-edge needs NO change (audit-facade forwards query string verbatim).
Implementer MUST branch + commit + push + open ≥1 PR. May land as 1 PR or a
SDK-before-consumers sequence.

## Ranked Candidate Queue
1. **Task 0121 — B7 audit-log filtering + export** (EMITTED THIS CYCLE) —
   implementer pickup next. Backend shipped (category-only); add filters +
   export across all consumers. Human-independent, buyer-credible.
2. **B7 follow-on / security-events surface** — `querySecurityEvents` consumer
   exposure (explicitly out of scope for 0121). Next-up once 0121 closes.
3. **`VALID_CONTEXTS` drift-proofing (hygiene)** — derive the test array from the
   `BoundedContext` union via `as const`. Low priority.
4. **B8 admin-worker scaffold** — greenfield; cross-tenant ops surface. Later.

## In-Flight
- No open PRs. Task 0121 awaiting implementer pickup.
- No mid-write implementer worktree.

## Hot Files
- hot_context_sections: `current.md#active-task-0121`, `task-ledger.md#task-0121`
- hot_code (Task 0121 implementer targets):
  - `packages/db/src/events/repository.ts:~295` (`queryAuditByOrg` filter clauses;
    mirror `queryAuditByTarget`)
  - `apps/events-worker/src/pagination.ts` (parse from/to + ISO_TS_RE) +
    `src/handlers/list-audit.ts` (new param validation) + `src/router.ts` (read-only)
  - `packages/contracts/src/events.ts:110` (`AuditQueryByOrg` filter fields;
    keep `PublicAuditEntry`/envelope stable)
  - `packages/sdk/src/events.ts:21,127,177` (`ListAuditEntriesQuery` org arm +
    `buildAuditRequest` + iterator query reconstruction + NDJSON helper)
  - `packages/cli/src/commands/cross-reads.ts` (`auditListCommand`) +
    `cli-runner.ts:179` (new flags + export)
  - `apps/web-console-next/src/app/(app)/orgs/[orgSlug]/audit/page.tsx`
    (filter UI + Load-more + export, SDK-only)
  - read-only ref: `apps/api-edge/src/audit-facade.ts` (NO change — forwards verbatim)

## Deferred Watch
- `0085b` (cloudflare-domain v4→v5): user lifts the defer.
- `notifications-provider-swap`: user names provider + sender domain / API key.
- `notifications-worker-dev-reframe`: depends on dev-deploy-lane design pass.
- `optional-spec-13-commands`: backend lands `/v1/components`, `/v1/resources`,
  `/v1/deployments` GET (+ `resource create` POST) on api-edge + contracts.

## Invalidate When
- A new GitHub PR opens (Task 0121 implementer PR).
- Task 0121 implementer report lands → orchestrator emits the matching verifier task.
- `current.md` rewritten outside the orchestrator's hand.
- `state.json.goal` changes.
- A new spec proposal under `/ai/proposals/` is filed.

## Next Move
Implementer agent (next pickup): execute `ai/tasks/task-0121.md` end-to-end —
extend `queryAuditByOrg` with actor/subject/eventType/time-range clauses, add
worker param validation, widen contracts `AuditQueryByOrg` + SDK org query arm +
NDJSON export helper, add CLI filter flags + export, build the Console filter UI
+ Load-more + export, add tests on each surface, then branch + commit + push +
open ≥1 PR and write the implementer report.

After the Task 0121 implementer pass lands a PR, the orchestrator's correct next
move (Operating Loop steps 15-16, "forgetting verifier tasks exist" pitfall) is
to emit the matching **verifier** task BEFORE scoping any new forward work —
multi-component, Console leg deploy-gated (post-merge main-CI smoke + live-URL is
the PASS gate), SDK-before-consumers merge order, BEHIND-main rebase is the
verifier's responsibility.

## Open Questions To Self
- If the implementer elects a multi-PR sequence, the orchestrator should be ready
  to emit a verifier per PR (or a single verifier covering the merged set) — watch
  the implementer report for the chosen split + merge order.
- Confirm the implementer carries filters into `iterAuditEntries` per-page query
  reconstruction (events.ts ~L177) — easy silent drop-after-page-1 bug; the task
  calls for an explicit ≥2-page filter-survival test.
