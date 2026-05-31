# Current Context

Last updated: 2026-05-31 — Task 0115 VERIFIED + MERGED; Task 0116 SCOPED (orchestrator). Awaiting implementer.

PR #170 (Task 0115 `sourceplane webhook disable <endpointId> [--reason=TEXT]`
CLI subcommand) squash-merged to main as `558d8d5` (mergedAt
2026-05-31T10:58:56Z). 8-phase verifier PASS: exactly 4 files (+566/-0), zero
forbidden-zone touches, pure SDK consumer (single `sdk.webhooks.disableEndpoint`
call, `resolveOrgId(ctx,false)`, no auth/header/idempotency auto-mint), 4 pnpm
gates green (164/164 tests across 13 files, +11 over baseline 153), 3 Orun gates
green (cli·{dev,stage,prod}·Verify, plan `3101ef9487df`), PR-CI 4/4 SUCCESS with
per-lane `gh run view --log` evidence. The scope commit `ac40edb` was already on
origin/main, so PR #170 showed the exact 4-file boundary from the start — no
merge-base recompute needed. `kiox.lock` local Orun-run mutation reverted before
merge. Post-merge main-CI run 26710731525 = 4/4 SUCCESS at `558d8d5`. Reports:
`ai/reports/task-0115-implementer.md`, `ai/reports/task-0115-verifier.md`.

The **B5 endpoint-CRUD CLI arc is now closed end-to-end** — create / disable /
re-enable + sign / verify / secrets-rotate all have CLI parity with the console.

Repo health: green. Working tree clean. main HEAD `558d8d5`.

## Current task — 0116

**Re-export the `EnableWebhookEndpoint` request/response types from `@saas/sdk`
(close the carry-forward re-export gap).**

- Prompt: `ai/tasks/task-0116.md`
- Agent: Implementer
- Branch: `impl/task-0116-sdk-enable-response-reexport`
- Sealed snapshot main: `558d8d5` (Task 0115 squash).
- The gap: `packages/sdk/src/index.ts` (lines 165–186) re-exports the entire
  webhook-endpoint type surface (Create/Get/List/Update/Disable/Delete/Rotate)
  but is MISSING `EnableWebhookEndpointRequest` + `EnableWebhookEndpointResponse`
  — both defined in `packages/contracts/src/webhooks.ts:80,85` and already
  imported+used in `packages/sdk/src/webhooks.ts:10-11,170-178`. Because the
  types can't be imported, `webhook-enable.test.ts` reconstructs
  `interface EnableResponse { endpoint: PublicWebhookEndpoint }` locally (the
  disable test, by contrast, imports `DisableWebhookEndpointResponse` directly).
- PR boundary: 3 files exactly —
  `packages/sdk/src/index.ts` (MODIFIED, additive: add the 2 names to the
  existing `export type` block adjacent to the Disable pair),
  `packages/cli/src/__tests__/webhook-enable.test.ts` (MODIFIED: swap the local
  interface for `import type EnableWebhookEndpointResponse` from `@saas/sdk`,
  delete the stale "not yet re-exported" comment, keep the `PublicWebhookEndpoint`
  import for the fixture, ZERO assertion / case-count change),
  `ai/reports/task-0116-implementer.md` (NEW with real PR#, no TBD).
- Forbidden zones: `packages/contracts/**` (source of truth — re-export only,
  never redefine), `packages/sdk/src/webhooks.ts` + all other `packages/sdk/**`,
  `packages/cli/**` except the named test, apps/infra/tooling/stack-tectonic/
  lockfiles/package.json/component.yaml.
- **NOT a single-component turbo PR.** Orun changed-plan selects BOTH `sdk` and
  `cli` lanes (2 components × 3 envs = 6 jobs + plan) because both packages have a
  changed file. That union is expected/correct — do NOT try to force it down to
  one component.
- Hard rules: additive re-export only (no reorder/removal); the test refactor is
  a pure type-source swap with zero behaviour change; no new
  eslint-disable/ts-ignore/as any in the SDK index change; revert `kiox.lock`;
  real PR# (TBD = BLOCKED); BEHIND-main rebase remains verifier responsibility.
- Title: `refactor(sdk): re-export EnableWebhookEndpoint request/response types`.

## Recommended next focus after 0116

1. **CLI helpers fold for `cross-reads.ts:resolveOrgId`** — single-arg
   no-override variant explicitly deferred from Task 0111 as "Remaining Gap";
   now-eligible one-line import swap + delete (≤ 5-file PR).
2. **Migration bounded-context cleanup** — extend `VALID_CONTEXTS` in
   `tests/db/src/migrations.test.ts` to include `"notifications"`. Pre-existing
   baseline failure (reproduces on main), low-risk one-line follow-on.
3. **Delivery-attempts UX** — next B5 leg per `specs/roadmap.md` if a richer
   console slice is preferred now that CLI endpoint-CRUD is fully closed.
4. **Node 20 → 24 CI actions bump** — non-blocking deprecation warning, but a
   hard cutover lands June 16 2026; a small infra/tooling PR de-risks it early.

Repo health: green. main HEAD `558d8d5`.
