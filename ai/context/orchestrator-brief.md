# Orchestrator Brief

## Snapshot
- snapshot_at: 2026-05-31T11:30:00Z
- head_sha: aa13ba7 (main)
- state_json_mtime_marker: post-task-0113-verifier-scope
- last_task_id: task-0113-verifier
- last_report_id: task-0112-verifier
- cycle_mode: warm
- repo_health: green

## Working Hypothesis
B5 webhook-endpoint surface remains the active arc. Task 0113 implementer
pass is **complete on PR #168** (HEAD `98cc3d3`, MERGEABLE/UNSTABLE; 13/17
PR-CI lanes green, 4/17 deploy lanes IN_PROGRESS). Implementer report is
on the PR branch with real PR `#168`; spec proposal
`ai/proposals/task-0112-spec-update.md` flipped to RESOLVED on the same
branch. The orchestrator's job this cycle is to (a) emit the matching
**verifier prompt** at `ai/tasks/task-0113-verifier.md` adapted for
cloudflare-pages-turbo + cloudflare-worker-turbo deploy-gated subscribers,
and (b) commit the verifier-scope bookkeeping on `main` (state.json +
current.md + task-ledger.md). Both done this cycle.

The verifier agent's next pickup is the 8-phase verification of PR #168
with mandatory Phase 6.5 post-merge main-CI watch + live-URL probe
(stage Console + webhooks-worker `/health`).

## Ranked Candidate Queue
1. **Task 0113 verifier** (EMITTED THIS CYCLE) — PR #168 verification
   gates the next forward pick. Mirrors Task 0112 verifier shape;
   deploy-gated for `web-console-next` AND `webhooks-worker`.
2. **CLI `sourceplane webhooks endpoints enable`** — pure SDK consumer
   mirroring 0106/0107/0110 cadence. Depends on 0113 merge (SDK method
   must be on main).
3. **Console delivery-attempts UX** — B5 forward-look. Verify SDK +
   worker list-delivery-attempts surface exists before scoping.
4. **B7 audit-log console UX** — surface `audit_events` stream in
   Console. Larger scope; multi-PR.
5. **B8 admin-worker scaffold** — greenfield; cross-tenant ops surface.
6. **Tiny follow-on:** add `"notifications"` to
   `tests/db/src/migrations.test.ts → VALID_CONTEXTS` to clear the
   pre-existing baseline failure surfaced by Task 0113 verification.
7. **Housekeeping:** fold `cross-reads.ts:resolveOrgId` into
   `helpers.ts:resolveOrgId(ctx, false)` (Task 0111 verifier-flagged
   Remaining Gap). One-line; parallel-safe.

## In-Flight
- PR #168 (Task 0113 implementer pass) OPEN, MERGEABLE, mergeStateStatus
  UNSTABLE at HEAD `98cc3d3`. 13/17 PR-CI lanes SUCCESS. 4/17 still
  IN_PROGRESS: `web-console-next · {dev,stage,prod} · Verify deploy` +
  `webhooks-worker · prod · Verify deploy`. Verifier waits for green.
- No other open PRs.
- No mid-write implementer worktree (the cycle-2 mid-write state has
  been resolved — implementer committed `d99d695` + `98cc3d3` and pushed).

## Hot Files
- hot_context_sections: `current.md#active-task-0113`,
  `task-ledger.md#task-0113`
- hot_specs: `ai/proposals/task-0112-spec-update.md` (status flipped on
  PR branch; will land on main with the squash merge)
- hot_code (verifier inspection targets):
  - `apps/webhooks-worker/src/handlers/webhook-endpoints.ts`
    (`handleEnableWebhookEndpoint` — atomicity pattern code-path
    inspection per `references/verifier-code-path-inspection.md`)
  - `apps/webhooks-worker/src/router.ts` (POST `/enable` dispatch)
  - `packages/db/src/webhooks/repository.ts` (`enableEndpoint` SQL —
    status flip + WHERE-guard + ENDPOINT_SAFE_COLUMNS)
  - `packages/sdk/src/webhooks.ts` (`enableEndpoint` — URL/method/
    NotFoundError mapping)
  - `apps/web-console-next/src/app/(app)/orgs/[orgSlug]/webhooks/[endpointId]/page.tsx`
    (Re-enable button gating + notice-card rewrite)
  - `apps/web-console-next/src/components/webhooks/enable-endpoint-dialog.tsx`
    (NEW — wrap()+PreconditionInsight)

## Deferred Watch
- `0085b` (cloudflare-domain v4→v5): user lifts the defer.
- `notifications-provider-swap`: user names provider + sender domain /
  API key path.
- `notifications-worker-dev-reframe`: depends on dev-deploy-lane design
  pass.
- `optional-spec-13-commands`: backend lands `/v1/components`,
  `/v1/resources`, `/v1/deployments` GET (+ `resource create` POST) on
  api-edge with corresponding contracts.

## Invalidate When
- A PR-CI lane on #168 conclusion flips (SUCCESS or FAIL).
- PR #168 merges (squash SHA appears in `gh pr view --json mergeCommit`).
- A new GitHub PR opens.
- `current.md` rewritten outside the orchestrator's hand.
- `state.json.goal` changes.
- A new spec proposal under `/ai/proposals/` is filed.
- A verifier FAIL appears for #168.
- Implementer reverts or force-pushes branch
  `impl/task-0113-webhook-endpoint-reenable`.

## Next Move
Verifier agent (next pickup): execute `ai/tasks/task-0113-verifier.md`
end-to-end. On PASS: squash merge PR #168, post-merge main-CI watch +
live-URL probes, then write `ai/reports/task-0113-verifier.md` and
commit Phase 8 bookkeeping on main. On FAIL: leave PR open with
documented blockers; PR comment + report on PR branch; no merge.

If the verifier passes and the user wants the loop to keep producing,
the next orchestrator pick is the CLI re-enable subcommand (single-PR,
SDK-consumer cadence) OR Console delivery-attempts UX OR a greenfield
B7/B8 candidate — whichever matches user intent at that moment.

## Open Questions To Self
- Does the post-merge main-CI run cover `webhooks-worker · {dev,stage,prod}`
  with a `/health` smokeCommand bound at the deploy step? PR-CI shows
  the verify-deploy lane; verifier should confirm the post-merge run
  exercises the same six lanes (web-console-next ×3 + webhooks-worker ×3).
  If not, that's a secondary post-merge-deploy-profile-gap finding to
  document for orchestrator follow-up.
- The pre-existing `tests/db/src/migrations.test.ts` notifications
  failure is recurring — keep it as a tiny follow-on candidate so it
  doesn't drift into 0113's verifier blockers.
