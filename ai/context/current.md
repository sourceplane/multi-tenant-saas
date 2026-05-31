# Current Context

Last updated: 2026-05-31 — Task 0112 VERIFIED PASS + MERGED. PR #167
squash-merged as `84093af` on main; post-merge main-CI run `26708243701`
5/5 SUCCESS at squash SHA; live-URL probes green
(`https://stage.sourceplane.ai/orgs/test/webhooks` HTTP/2 200 with
`<title>Sourceplane Console</title>`, old "Use the API or CLI" placeholder
gone). B5 console webhook-endpoint CRUD shipped. Recommended next:
Task 0113 (re-enable surface) per Spec Proposal at
`/ai/proposals/task-0112-spec-update.md`.

## Active Task — none

Awaiting orchestrator scope for the next task. Current candidate slate
(see Recommended Next Move in `ai/reports/task-0112-verifier.md`):

1. **Task 0113 — webhook endpoint re-enable surface** (closes the
   documented contract gap from 0112; bounded contract + SDK + worker
   route + console wiring single-PR).
2. Console delivery-attempts UX (B5 forward-look — surface webhook
   delivery history per endpoint).
3. B7 audit-log UX OR B8 admin-worker scaffold (greenfield).
4. `cross-reads.ts:resolveOrgId` housekeeping fold (Task 0111
   verifier-flagged Remaining Gap).

## Just-merged — 0112

**Branch (deleted):** `impl/task-0112-console-webhook-endpoint-crud`
**Squash merge:** `84093af` (merged 2026-05-31T08:55:05Z)
**PR:** #167 — https://github.com/sourceplane/multi-tenant-saas/pull/167
**PR-CI:** run `26708143076` at post-`update-branch` HEAD `a7f60e4` =
5/5 SUCCESS (plan + web-console-next · {dev,stage,prod} · Verify deploy
+ web-console-next-tests · dev · Verify). Initial PR-CI `26707949013`
at `2e9bdb0` also 5/5 SUCCESS.
**Post-merge main-CI:** run `26708243701` 5/5 SUCCESS at `84093af`;
per-component `smokeCommand` (curl `${DEPLOYED_URL}/` + `Sourceplane
Console` marker + api-edge `/health` ok) green inside each Verify
deploy lane.
**Live-URL probes:** `https://stage.sourceplane.ai/orgs` → 200 (11475 B,
`<title>Sourceplane Console</title>`); `/orgs/test/webhooks` → 200
(12813 B, same title; old "Use the API or CLI to create one"
placeholder absent from SSR HTML).

**Reports:**
- Implementer: `ai/reports/task-0112-implementer.md`
- Verifier: `ai/reports/task-0112-verifier.md`
- Spec Proposal: `ai/proposals/task-0112-spec-update.md` (re-enable
  surface — recommended Task 0113).

**Durable outcome on main:** Webhook endpoint **create / edit /
disable / delete** now ships from the org-scoped Console. New "New
endpoint" button + "Create endpoint" empty-state CTA replace the prior
"Use the API or CLI" placeholder. Edit dialog uses diff-only PATCH
with a "Nothing to update" short-circuit toast. Delete dialog gates
submit on a typed-URL exact-match confirm (`confirmDeleteMatches`).
Idempotency-Key on create only via `crypto.randomUUID` with documented
`idem-<ts>-<rand>` fallback. Disabled-state detail page renders an
inline notice card pointing at the re-enable Spec Proposal — NO
re-enable button (contract-blocked). All four dialogs route I/O
through `client.webhooks.*` + `wrap()` with `<PreconditionInsight />`
on `precondition_failed`. Pure helper module `endpoint-crud.ts`
exports URL validation, bounded-string rules, `buildUpdatePatch`,
`confirmDeleteMatches`, `generateIdempotencyKey`. Vitest baseline
under `@saas/web-console-next-tests` lifted to **40/40 across 2 suites**
(18 prior + 22 new in `endpoint-crud.test.ts`).

## Previously merged — 0111

**Branch (deleted):** `impl/task-0111-cli-helpers-extract`
**Squash merge:** `da9810f` (merged 2026-05-31)
**PR:** #166 — https://github.com/sourceplane/multi-tenant-saas/pull/166
**PR-CI lanes (post-update-branch HEAD `66729b5`, run `26706832113`):**
4/4 SUCCESS — plan + `cli · {dev,stage,prod} · Verify`.
**Initial PR-CI** at HEAD `ad2964b` (run `26706640065`) also 4/4 SUCCESS.
**Post-merge main-CI:** run `26706881757` 4/4 SUCCESS at `da9810f`.

**Reports:**
- Implementer: `ai/reports/task-0111-implementer.md`
- Verifier: `ai/reports/task-0111-verifier.md`

**Durable outcome on main:** Shared `packages/cli/src/commands/helpers.ts`
module exports `resolveOrgId(ctx, allowOverride)` and
`readIdempotencyKey(ctx)`. `writes.ts` and `webhook-secrets-rotate.ts`
both consume them via `from "./helpers.js"`. Inline duplicates removed.
Pure behaviour-preserving refactor — byte-equivalent semantics; zero
new CLI commands, zero new flags, zero output-shape change. Vitest
floor lifted to **144/144 across 11 files** (added
`__tests__/helpers.test.ts` with 8 cases above the ≥6 floor).

## B5 secret-rotation arc + housekeeping closer — FULLY CLOSED

| Task | Slice | PR | Squash | Verifier |
|------|-------|-----|--------|----------|
| 0108 | Backend dual-secret grace + reveal-once response | #163 | `28b3ca1` | PASS |
| 0109 | Console reveal-once UX (discriminated-union state machine) | #164 | `84a69c2` | PASS |
| 0110 | CLI `webhook secrets rotate` reveal-once UX | #165 | `142d019` | PASS |
| 0111 | Shared cli-helpers module (resolveOrgId / readIdempotencyKey) | #166 | `da9810f` | PASS |

## Repo health

**Repo health:** green
**HEAD on main:** `da9810f`
**Open PRs:** none

## Documented carry-forward Remaining Gap (NOT a blocker)

`packages/cli/src/commands/cross-reads.ts:36` still defines its own
single-arg `async function resolveOrgId(ctx)` no-override read variant.
The Task 0111 PR-Boundary explicitly forbade touching `cross-reads.ts`,
so the duplicate body was preserved by design. Folding it into
`helpers.ts:resolveOrgId(ctx, false)` is a one-line future housekeeping
task; reads have no idempotency dimension and the duplicate body is
byte-equivalent — low-risk.

`assertOutputModeValid` remains intentionally inlined in
`webhook-secrets-rotate.ts` (single call site). Extract once a second
consumer appears.

## Next orchestrator candidates

1. **Console webhook subscriptions UX** (B5 console leg) — list /
   create / edit / delete `webhook_endpoints` from the Console.
2. **Console delivery-attempts UX** (B5 console leg) — show recent
   delivery attempts per endpoint, expose retry / replay (when
   backend exposes the surface).
3. **B7 audit-log console UX** — surface the audit_events stream in
   the Console.
4. **B8 admin-worker scaffold** — start the cross-tenant operations
   surface (org admin, billing admin, etc.).
5. **Housekeeping follow-up:** fold `cross-reads.ts:resolveOrgId`
   into the new shared `helpers.ts:resolveOrgId(ctx, false)`. One-line
   delete + one import; parallel-safe with anything in flight.

## Deferred (still parked)

- `0085b` (notifications-provider swap)
- `notifications-provider-swap`
- `notifications-worker-dev-reframe`
- `optional-spec-13-commands` (replay UI / failure-budget alerts —
  needs backend `/v1/.../replay` endpoint exposure first)
