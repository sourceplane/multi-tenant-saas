# Current Context

Last updated: 2026-05-31 — Task 0112 implementer complete; verifier
SCOPED (`ai/tasks/task-0112-verifier.md`). PR #167 OPEN, MERGEABLE/CLEAN,
5/5 PR-CI green at HEAD `2e9bdb0`. Awaiting verifier execution
(8-phase shape adapted for `cloudflare-pages-turbo` deploy-gated
component — mandatory Phase 6.5 post-merge main-CI + live-URL curl).

## Active Task — 0112 (verifier scoped)

**Branch:** `impl/task-0112-console-webhook-endpoint-crud`
**HEAD:** `2e9bdb0` (single implementer commit on top of `c683f4f`)
**PR:** #167 — https://github.com/sourceplane/multi-tenant-saas/pull/167
**Verifier prompt:** `ai/tasks/task-0112-verifier.md`

**Scope shipped:** Full webhook-endpoint CRUD wired into the
org-scoped Console:

- New "New endpoint" button on the list page; empty-state placeholder
  copy ("Use the API or CLI to create one — UI creation is coming in
  a follow-up.") replaced with a primary "Create endpoint" CTA.
- `CreateEndpointDialog` (URL/name/description, Idempotency-Key via
  `crypto.randomUUID` w/ documented `idem-<ts>-<rand>` fallback).
- `EditEndpointDialog` (rename / re-target / edit description) with
  diff-only PATCH and "Nothing to update" short-circuit toast.
- `DisableEndpointDialog` (optional reason, bounded 280 chars).
- `DeleteEndpointDialog` (typed-URL confirm gate, density mirrors
  `rotate-secret-dialog.tsx`).
- Disabled-state inline notice card in place of a re-enable button —
  re-enable is contract-blocked (see Spec Proposal below).
- Pure helper module `endpoint-crud.ts` (URL validation,
  bounded-string rules, `buildUpdatePatch`, `confirmDeleteMatches`,
  `generateIdempotencyKey`).
- 22 jest cases in `tests/web-console-next/src/endpoint-crud.test.ts`
  (well above the +6 floor).

**Spec Proposal carried forward:**
`/ai/proposals/task-0112-spec-update.md` — webhook endpoint
re-enable surface (contract + SDK + worker route + console wiring).
Recommended Task 0113 follow-on; not a blocker.

**Test-harness deviation (documented assumption):** implementer used
the existing `tests/web-console-next/` jest workspace (matches
`rotate-flow.test.ts` prior-art) instead of vitest under `apps/`
(no vitest harness configured for `@saas/web-console-next` today —
that's its own future scaffolding task).

## Just-merged — 0111

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
