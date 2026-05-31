# Current Context

Last updated: 2026-05-31 — Task 0114 SCOPED (orchestrator). Awaiting implementer.

PR #168 (Task 0113 webhook re-enable vertical slice) squash-merged to main as
`f5cda64`; verifier bookkeeping at `bc15418`. Repo health: green. Working
tree clean. The B5 endpoint-CRUD arc (create / edit / disable / delete /
re-enable) is closed end-to-end across contract → SDK → api-edge →
webhooks-worker → db → web-console-next.

## Current task — 0114

**Symmetric CLI counterpart for the Task 0113 webhook re-enable surface.**

- Prompt: `ai/tasks/task-0114.md`
- Agent: Implementer
- Branch: `impl/task-0114-cli-webhook-enable`
- PR boundary: 4 files exactly — `packages/cli/src/commands/webhook-enable.ts`
  (NEW), `packages/cli/src/cli-runner.ts` (1 import + 1 register + 1 help
  line), `packages/cli/src/__tests__/webhook-enable.test.ts` (NEW, ≥ 8
  vitest cases), `ai/reports/task-0114-implementer.md` (NEW with real
  PR#, no TBD).
- Mirrors Task 0110 (`webhook-secrets-rotate.ts`) byte-for-byte where
  semantically equivalent. Uses `resolveOrgId(ctx, false)` +
  `readIdempotencyKey(ctx)` from `./helpers.js` (Task 0111 extraction).
- Pure SDK consumer of the locked `client.webhooks.enableEndpoint`
  shape — zero `fetch(`, zero header-building, zero coupling to
  webhooks-worker / api-edge / contracts / db / console.
- Turbo-package shape: Orun changed-plan must select ONLY
  `cli·{dev,stage,prod}·Verify` (3 lanes). No deploy lane, no live URL
  surface.
- BEHIND-main rebase remains verifier responsibility (recurring
  0103–0113 pattern); implementer does not rebase.

## Recommended next focus after 0114

1. **Migration bounded-context cleanup** — extend `VALID_CONTEXTS` in
   `tests/db/src/migrations.test.ts` to include `"notifications"`. Pre-existing
   baseline failure reproducing on `aa13ba7`, low-risk one-line follow-on.
2. **CLI helpers fold for `cross-reads.ts:resolveOrgId`** — single-arg
   no-override variant explicitly deferred from Task 0111 as "Remaining Gap";
   now-eligible one-line import swap + delete (≤ 5-file PR), unblocked by
   0111's `helpers.ts` extraction.
3. **`webhook disable` symmetric CLI subcommand** — explicit non-goal of
   Task 0114; the SDK already exposes `client.webhooks.disableEndpoint`,
   so this is a copy-of-0114 follow-on (≤ 4-file PR, same template).
4. **Delivery-attempts UX** — next B5 leg per `specs/roadmap.md` if a richer
   console slice is preferred over CLI parity work.

Repo health: green. main HEAD `f5cda64` (verifier bookkeeping `bc15418`).
