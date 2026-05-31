# Orchestrator Brief

## Snapshot
- snapshot_at: 2026-05-31T22:30:00Z
- head_sha: 2b52d2b (origin/main, Task 0121 verifier-PASS bookkeeping) | 0 open PRs
- state_json_mtime_marker: post-task-0122-scope
- last_task_id: task-0122 (SCOPED — implementer not yet started)
- last_report_id: task-0121-verifier (DONE — PASS)
- cycle_mode: warm
- repo_health: green

## Working Hypothesis
Task **0121 is CLOSED** (verifier PASS, PR #176 squash `2b98507`; bookkeeping
committed `2b52d2b` this cycle — it had been left uncommitted in the working tree).
Task **0122 is SCOPED** (`ai/tasks/task-0122.md`), not yet implemented. Milestone
**B7-security-events-consumer-surfaces**: surface the already-shipped account
security-events read backend (DB `querySecurityEventsByUser` + api-edge
`/v1/auth/security-events` + contracts + flat SDK `SecurityEventsClient.list()`)
through SDK cursor pagination + a CLI command + a new Console account-security
page. Actor-scoped (NOT org-scoped). Mirrors Task 0120 byte-for-byte. The
implementer's next move is to branch `impl/task-0122-security-events-surfaces`,
build the three surfaces, open ≥1 PR, write the report. Then the orchestrator
scopes the matching **verifier** task (deploy-gated — post-merge main-CI + live
`/account/security` curl is the PASS gate).

## Hot Files
- hot_context_sections: `current.md#active-task-0122`, `task-ledger.md#task-0122`
- hot_code (Task 0122 implementer targets):
  - `packages/sdk/src/securityEvents.ts` (flat `list()` → add limit/cursor +
    meta.cursor) + `src/transport.ts` (query + `meta.cursor` seam) + `src/index.ts`
  - `packages/cli/src/commands/webhook-deliveries.ts` (CLI cursor-loop template) +
    `cli-runner.ts` (register)
  - `apps/web-console-next/src/app/(app)/orgs/[orgSlug]/audit/page.tsx` +
    `components/audit/audit-log.ts` (Console page+helper template) +
    `components/shell/sidebar.tsx` (nav)
  - read-only refs (must be UNCHANGED): `packages/contracts/src/security-events.ts`,
    `apps/api-edge/src/auth-facade.ts`, `packages/db/src/identity/repository.ts`
  - prior-art: `ai/tasks/task-0120.md` + `ai/reports/task-0120-implementer.md`

## Deferred Watch
- `0085b` (cloudflare-domain v4→v5): user lifts the defer.
- `notifications-provider-swap`: user names provider + sender domain / API key.
- `notifications-worker-dev-reframe`: depends on dev-deploy-lane design pass.
- `optional-spec-13-commands`: backend lands `/v1/components`, `/v1/resources`,
  `/v1/deployments` GET (+ `resource create` POST) on api-edge + contracts.

## Invalidate When
- Implementer opens the Task 0122 PR → orchestrator scopes the verifier task →
  this brief is superseded.
- `current.md` rewritten outside the orchestrator's hand.
- `state.json.goal` changes, or a new spec proposal under `/ai/proposals/` is filed.

## Next Move
**Implementer (next): execute Task 0122** (`ai/tasks/task-0122.md`) — three
consumer surfaces (SDK pagination + CLI + Console account-security page), open
≥1 PR, write `ai/reports/task-0122-implementer.md` with the real PR#. **Then
orchestrator: scope the Task 0122 verifier** (deploy-gated: post-merge main-CI
smoke + live `/account/security` curl is the PASS gate; BEHIND-main rebase is
verifier's job).

## Ranked Candidate Queue (after 0122)
1. **`VALID_CONTEXTS` drift-proofing (hygiene)** — derive the test array from the
   `BoundedContext` union via `as const`. Low priority.
2. **B8 admin-worker scaffold** — greenfield cross-tenant ops surface (spec 16).
3. **B6 Stripe / B1 real auth** — larger baseline legs; B6 waits on U7.

## Open Questions To Self
- Task 0122 Console route placement: there is no existing `/account/*` route group
  in web-console-next (nav is org-scoped only) — the implementer must create the
  first account-scoped route + nav affordance. Watch the verifier for nav/route
  correctness, not just the page.
- Carry the 0121 cross-reads "400→422" comment nit into the first future
  cross-reads touch (non-blocking, no standalone task).
- Recurring ops gap: verifier PASS bookkeeping was left UNCOMMITTED after Task
  0121 (caught + fixed this cycle as `2b52d2b`). Confirm each verifier cycle ends
  with the report + state files committed AND pushed, not just written.
