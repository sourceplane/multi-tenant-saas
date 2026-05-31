# Orchestrator Brief

## Snapshot
- snapshot_at: 2026-05-31T12:20:00Z
- head_sha: ba274f3 (main code) / 269db18 (post-0119 bookkeeping); origin/main = 269db18
- state_json_mtime_marker: post-task-0120-scope
- last_task_id: task-0120 (implementer)
- last_report_id: task-0119-verifier
- cycle_mode: warm
- repo_health: green

## Working Hypothesis
Task 0119 (CI Node-20→Node-24 action bump) is **VERIFIED PASS + MERGED** (PR #174
squash `ba274f3`). No open PRs, working tree clean. The orchestrator's job this
cycle was to **scope the next forward milestone** and emit its implementer prompt.

Selected forward pick: **Task 0120 — B5 webhook delivery history**
(`ai/tasks/task-0120.md`, milestone `B5-webhook-delivery-history`). The
delivery-attempts BACKEND is already fully shipped on main (contracts + worker
routes + cursor pagination + api-edge proxy — all verified by inspection this
cycle, NOT to be rebuilt). The milestone is the three missing CONSUMER surfaces:
SDK `limit`/`cursor` threading, a Console delivery-history panel, and a CLI
`webhook deliveries` command, each with tests. Implementer MUST branch + commit +
push + open ≥1 PR. May land as 1 PR or a short SDK→Console→CLI sequence.

This cycle also committed the philosophy shift in `agents/orchestrator.md`
(PR-sized → milestone-sized tasks) and the scope bookkeeping (state.json +
current.md + task-ledger.md + this brief).

## Ranked Candidate Queue
1. **Task 0120 — B5 webhook delivery history** (EMITTED THIS CYCLE) — implementer
   pickup next. Backend shipped; consumer surfaces only. Human-independent,
   low-risk, buyer-credible.
2. **B7 audit-log console UX** — surface `audit_events` stream in Console. Larger
   multi-PR scope; next-up once B5 closes.
3. **`VALID_CONTEXTS` drift-proofing (hygiene)** — derive the test array from the
   `BoundedContext` union via `as const` so the Task-0117 duplication can't
   re-break. Low priority.
4. **B8 admin-worker scaffold** — greenfield; cross-tenant ops surface. Later.

## In-Flight
- No open PRs. Task 0120 awaiting implementer pickup.
- No mid-write implementer worktree.

## Hot Files
- hot_context_sections: `current.md#active-task-0120`, `task-ledger.md#task-0120`
- hot_code (Task 0120 implementer targets):
  - `packages/sdk/src/webhooks.ts:310-338` (thread `limit`/`cursor`)
  - `packages/sdk/src/transport.ts` (`query` record) + `metering.ts` `buildQueryRecord` pattern
  - `apps/web-console-next/src/app/(app)/orgs/[orgSlug]/webhooks/[endpointId]/page.tsx` (add panel)
  - `packages/cli/src/cli-runner.ts:167-173` + `commands/webhook-*.ts` (add `deliveries`)
  - read-only refs: `packages/contracts/src/webhooks.ts:176-207`,
    `apps/webhooks-worker/src/{router.ts,handlers/webhook-delivery-attempts.ts,pagination.ts}`,
    `apps/api-edge/src/webhooks-facade.ts`

## Deferred Watch
- `0085b` (cloudflare-domain v4→v5): user lifts the defer.
- `notifications-provider-swap`: user names provider + sender domain / API key.
- `notifications-worker-dev-reframe`: depends on dev-deploy-lane design pass.
- `optional-spec-13-commands`: backend lands `/v1/components`, `/v1/resources`,
  `/v1/deployments` GET (+ `resource create` POST) on api-edge + contracts.

## Invalidate When
- A new GitHub PR opens (Task 0120 implementer PR).
- Task 0120 implementer report lands → orchestrator emits the matching verifier task.
- `current.md` rewritten outside the orchestrator's hand.
- `state.json.goal` changes.
- A new spec proposal under `/ai/proposals/` is filed.

## Next Move
Implementer agent (next pickup): execute `ai/tasks/task-0120.md` end-to-end —
plumb SDK `limit`/`cursor`, build the Console delivery-history panel, add the CLI
`webhook deliveries` command, add tests on each surface, then branch + commit +
push + open ≥1 PR and write the implementer report.

After the Task 0120 implementer pass lands a PR, the orchestrator's correct next
move (Operating Loop steps 15-16, "forgetting verifier tasks exist" pitfall) is
to emit the matching **verifier** task BEFORE scoping any new forward work —
multi-component, deploy-gated (Console post-merge main-CI smoke + live-URL is the
PASS gate), SDK-before-consumers merge order, BEHIND-main rebase is the verifier's
responsibility.

## Open Questions To Self
- If the implementer elects a multi-PR sequence, the orchestrator should be ready
  to emit a verifier per PR (or a single verifier covering the merged set) — watch
  the implementer report to learn which shape landed before scoping the verifier.
