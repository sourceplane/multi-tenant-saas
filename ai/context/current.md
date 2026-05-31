# Current Context

Last updated: 2026-05-31 — Task 0113 IMPLEMENTER COMPLETE + VERIFIER
SCOPED. PR #168 OPEN, MERGEABLE, mergeStateStatus UNSTABLE because
4 of 17 deploy-gated PR-CI lanes are still IN_PROGRESS at HEAD
`98cc3d3` (web-console-next · {dev,stage,prod} · Verify deploy +
webhooks-worker · prod · Verify deploy). 13/17 lanes already SUCCESS.
The Task 0113 verifier prompt is on disk at
`ai/tasks/task-0113-verifier.md` and is the agent's next pickup.

## Active Task — 0113 (verifier pass)

**Implementer pass status:** complete on PR #168.
**Verifier prompt:** `ai/tasks/task-0113-verifier.md` (8-phase shape
adapted for cloudflare-pages-turbo + cloudflare-worker-turbo
deploy-gated subscribers — mandatory Phase 6.5 post-merge main-CI
watch + live-URL curl per `references/post-merge-deploy-profile-gap.md`).

**PR:** #168 — https://github.com/sourceplane/multi-tenant-saas/pull/168
**Branch:** `impl/task-0113-webhook-endpoint-reenable`
**HEAD:** `98cc3d3` (impl commit `d99d695` + PR-number-fixup `98cc3d3`
backfilling `#168` into the implementer report and the Task 0112
spec proposal status flip to RESOLVED).
**Base:** `aa13ba7` (Task 0112 verifier-PASS bookkeeping on top of
`84093af` = PR #167 squash for Task 0112).

**Diff:** 15 files, +799/-15.
- `packages/contracts/src/webhooks.ts` (Enable* req/resp).
- `packages/sdk/src/webhooks.ts` + `packages/sdk/src/__tests__/resources.test.ts` (+2).
- `packages/db/src/webhooks/types.ts` + `repository.ts`
  (`enableEndpoint(orgId, endpointId)`: `WHERE status='disabled'`
  guard, sets `status='active'` + nulls `disabled_reason`/`disabled_at`,
  RETURNING `ENDPOINT_SAFE_COLUMNS` — no `secret_ciphertext` leak).
- `apps/webhooks-worker/src/{router,handlers/webhook-endpoints}.ts`
  (`POST /enable` + `handleEnableWebhookEndpoint` mirroring Task 0024
  atomicity: both repos from same `txExec` inside
  `executor.transaction`, throw-to-rollback on event-append failure,
  audit description "Webhook endpoint re-enabled").
- `apps/web-console-next/src/app/(app)/orgs/[orgSlug]/webhooks/[endpointId]/page.tsx`
  (Re-enable button rendered IFF `isDisabled`; notice-card pointer
  rewritten away from the spec-proposal path).
- `apps/web-console-next/src/components/webhooks/enable-endpoint-dialog.tsx`
  NEW (`wrap()` + `<PreconditionInsight />` pattern).
- `apps/web-console-next/src/components/webhooks/endpoint-crud.ts`
  (notice-card pointer comment swap, no behaviour change).
- `tests/api-edge/src/webhooks-facade.test.ts` (+1 matcher pin for
  `/enable`).
- `tests/db/src/webhooks.test.ts` (+3).
- `tests/webhooks-worker/src/webhooks-worker.test.ts` (+5 incl.
  static-source guard for `txExec` wiring).
- `ai/reports/task-0113-implementer.md` NEW (real PR `#168`).
- `ai/proposals/task-0112-spec-update.md` flipped to **RESOLVED**.

**Net new passing tests:** +11 (≥ +6 floor).

**API-edge facade source UNCHANGED.** The existing regex already
covers `/enable`; the matcher invariant is pinned by the new test in
`tests/api-edge/`.

**Pre-existing failure (NOT 0113):** `tests/db/src/migrations.test.ts
→ "each migration declares a valid bounded context"` reproduces on
`aa13ba7`; recommend a tiny follow-on adding `"notifications"` to
`VALID_CONTEXTS`.

**CI snapshot at scope time (HEAD `98cc3d3`):**
- 13/17 SUCCESS: plan + contracts × {dev,stage,prod} +
  db × {dev,stage,prod} + db-tests · dev + sdk × {dev,stage,prod} +
  api-edge-tests · dev + webhooks-worker · {dev,stage} · Verify deploy.
- 4/17 IN_PROGRESS: web-console-next · {dev,stage,prod} · Verify
  deploy + webhooks-worker · prod · Verify deploy.

**Verifier expectation:** wait for the four IN_PROGRESS lanes to
complete green; if any FAIL, Phase 5 = FAIL; merge only on 17/17 +
post-merge main-CI 17/17 + live-URL probes green.

## Just-merged (prior cycle) — 0112

**PR:** #167 squash `84093af` (merged 2026-05-31T08:55:05Z).
Post-merge main-CI run `26708243701` 5/5 SUCCESS at squash SHA;
live-URL probes green. Reports:
- Implementer: `ai/reports/task-0112-implementer.md`
- Verifier: `ai/reports/task-0112-verifier.md`
- Spec Proposal: `ai/proposals/task-0112-spec-update.md` (now
  RESOLVED on the 0113 PR branch — will land on main when 0113
  merges).

## B5 secret-rotation arc + housekeeping closer — FULLY CLOSED

| Task | Slice | PR | Squash | Verifier |
|------|-------|-----|--------|----------|
| 0108 | Backend dual-secret grace + reveal-once response | #163 | `28b3ca1` | PASS |
| 0109 | Console reveal-once UX (discriminated-union state machine) | #164 | `84a69c2` | PASS |
| 0110 | CLI `webhook secrets rotate` reveal-once UX | #165 | `142d019` | PASS |
| 0111 | Shared cli-helpers module (resolveOrgId / readIdempotencyKey) | #166 | `da9810f` | PASS |
| 0112 | Console webhook-endpoint CRUD | #167 | `84093af` | PASS |

## Repo health

**Repo health:** green
**HEAD on main:** `aa13ba7`
**Open PRs:** #168 (Task 0113, awaiting verifier).

## Next orchestrator candidates (post-0113)

1. **CLI `sourceplane webhooks endpoints enable`** — pure SDK
   consumer mirroring Tasks 0106/0107/0110 cadence. Depends on
   0113 merge (SDK method must be on main).
2. **Console delivery-attempts UX** (B5 console leg) — surface
   webhook delivery history per endpoint.
3. **B7 audit-log console UX** — surface the `audit_events`
   stream in the Console.
4. **B8 admin-worker scaffold** — start the cross-tenant
   operations surface (org admin, billing admin, etc.).
5. **Housekeeping follow-up:** fold `cross-reads.ts:resolveOrgId`
   into the shared `helpers.ts:resolveOrgId(ctx, false)` (Task 0111
   verifier-flagged Remaining Gap). One-line delete + one import;
   parallel-safe with anything in flight.
6. **Tiny follow-on:** add `"notifications"` to
   `tests/db/src/migrations.test.ts → VALID_CONTEXTS` to clear the
   pre-existing baseline failure surfaced by Task 0113 verification.

## Documented carry-forward Remaining Gap (NOT a blocker)

`packages/cli/src/commands/cross-reads.ts:36` still defines its own
single-arg `async function resolveOrgId(ctx)` no-override read variant.
The Task 0111 PR-Boundary explicitly forbade touching `cross-reads.ts`,
so the duplicate body was preserved by design. Folding it into
`helpers.ts:resolveOrgId(ctx, false)` is a one-line future
housekeeping task; reads have no idempotency dimension and the
duplicate body is byte-equivalent — low-risk.

## Deferred (still parked)

- `0085b` (notifications-provider swap)
- `notifications-provider-swap`
- `notifications-worker-dev-reframe`
- `optional-spec-13-commands` (replay UI / failure-budget alerts —
  needs backend `/v1/.../replay` endpoint exposure first)
