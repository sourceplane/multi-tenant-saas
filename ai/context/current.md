# Current Context

Last updated: 2026-05-31 — Task 0114 VERIFIED + MERGED; Task 0115 SCOPED (orchestrator). Awaiting implementer.

PR #169 (Task 0114 `sourceplane webhook enable` CLI subcommand) squash-merged to
main as `227face`. 8-phase verifier PASS: exactly 4 files (+494/-0), zero
forbidden-zone touches, pure SDK consumer (no fetch/header/auth/env, no
idempotency auto-mint), 4 pnpm gates green (153/153 tests, 12 files), 3 Orun
gates green (cli·{dev,stage,prod}·Verify), PR-CI 4/4 SUCCESS. Verifier note: the
0114 scope commit `0bf3b80` was sealed on local main only and not pushed, so PR
#169 initially showed 8 files; verifier pushed `bc15418..0bf3b80` to origin/main
to recompute the merge-base down to the exact 4-file boundary before merging.
Reports: `ai/reports/task-0114-implementer.md`, `ai/reports/task-0114-verifier.md`.

The B5 endpoint-CRUD CLI arc now has re-enable closed. The **only remaining open
CLI leg is `webhook disable`** — that is Task 0115.

Repo health: green. Working tree clean.

## Current task — 0115

**Symmetric CLI counterpart for the webhook disable surface (final B5
endpoint-CRUD CLI leg).**

- Prompt: `ai/tasks/task-0115.md`
- Agent: Implementer
- Branch: `impl/task-0115-cli-webhook-disable`
- PR boundary: 4 files exactly — `packages/cli/src/commands/webhook-disable.ts`
  (NEW), `packages/cli/src/cli-runner.ts` (1 import + 1 register + 1 help line),
  `packages/cli/src/__tests__/webhook-disable.test.ts` (NEW, ≥ 9 vitest cases),
  `ai/reports/task-0115-implementer.md` (NEW with real PR#, no TBD).
- Mirrors Task 0114 (`webhook-enable.ts`) where semantically equivalent. Three
  intentional divergences: (1) new optional `--reason=TEXT` flag forwarded into
  `DisableWebhookEndpointRequest.reason` (body `{ reason }` when supplied, `{}`
  when absent, `UsageError` on bare boolean); (2) 4-line human block
  (`status`/`disabledReason`/`disabledAt`/`updatedAt`); (3) test imports
  `DisableWebhookEndpointResponse` directly from `@saas/sdk` (it IS re-exported,
  unlike the enable response — no local-reconstruction workaround needed).
- Pure SDK consumer of the locked `client.webhooks.disableEndpoint` shape — zero
  `fetch(`, zero header-building, zero coupling to webhooks-worker / api-edge /
  contracts / db / console. Uses `resolveOrgId(ctx, false)` +
  `readIdempotencyKey(ctx)` from `./helpers.js`.
- Turbo-package shape: Orun changed-plan must select ONLY
  `cli·{dev,stage,prod}·Verify` (3 lanes). No deploy lane, no live URL surface.
- BEHIND-main rebase remains verifier responsibility; implementer does not rebase.
- Orchestrator lesson carried into 0115 verifier Phase 1: push the scope commit
  to origin/main BEFORE judging the PR file count (recompute merge-base), so the
  PR shows the exact 4 implementer files rather than scope+impl = 8.

## Recommended next focus after 0115

1. **`EnableWebhookEndpointResponse` SDK re-export** — surfaced as a remaining gap
   in both Task 0114 implementer + verifier reports: the type is NOT re-exported
   from `@saas/sdk` index (sdk/src/index.ts), forcing local response-shape
   reconstruction in `webhook-enable.test.ts`. A small SDK-surface task (1-line
   re-export + optionally refactor the enable test to import it). Lives in
   `packages/sdk/**` so it cannot be folded into a CLI task.
2. **CLI helpers fold for `cross-reads.ts:resolveOrgId`** — single-arg
   no-override variant explicitly deferred from Task 0111 as "Remaining Gap";
   now-eligible one-line import swap + delete (≤ 5-file PR).
3. **Migration bounded-context cleanup** — extend `VALID_CONTEXTS` in
   `tests/db/src/migrations.test.ts` to include `"notifications"`. Pre-existing
   baseline failure, low-risk one-line follow-on.
4. **Delivery-attempts UX** — next B5 leg per `specs/roadmap.md` if a richer
   console slice is preferred over CLI parity work (CLI endpoint-CRUD will be
   fully closed after 0115).

Repo health: green. main HEAD `227face`.
