# Task 0114 — Implementer Report

`sourceplane webhook enable <endpointId>` CLI subcommand.

## Summary

- Added `sourceplane webhook enable <endpointId>` — the symmetric CLI
  counterpart to the Task 0113 console "Re-enable" button + dialog,
  closing the B5 endpoint-CRUD CLI gap for the re-enable surface.
- Pure SDK consumer of the locked `client.webhooks.enableEndpoint(orgId,
  endpointId, {}, opts?)` shape (Task 0113). Zero `fetch(`, zero header
  building, zero auth handling — all I/O flows through the SDK transport.
- Mirrors the `webhook-secrets-rotate.ts` template (Task 0110) byte-for-byte
  where semantically equivalent: `assertOutputModeValid` gate (with the
  `webhook enable:` prefix), `resolveOrgId(ctx, /* allowOverride */ false)`
  + `readIdempotencyKey(ctx)` from `./helpers.js` (Task 0111).
- Re-enable carries no secret material, so the human block is minimal
  (`status` / `secretVersion` / `updatedAt`) with no reveal-once warning.
- 9 new vitest cases (floor was ≥ 8) reusing the rotate fake-SDK-injection
  harness (`MemoryTokenStore` + `ContextStore` + `runCli`).

## Files Changed

Command source:
- `packages/cli/src/commands/webhook-enable.ts` (NEW, 110 LOC) — thin
  one-call adapter; human + json output modes.

Runner registration:
- `packages/cli/src/cli-runner.ts` (+3) — one import, one
  `r.register(["webhook","enable"], …)`, one help-output usage line.

Test:
- `packages/cli/src/__tests__/webhook-enable.test.ts` (NEW, 285 LOC,
  9 cases).

Report:
- `ai/reports/task-0114-implementer.md` (this file).

Net diff: 3 code files, +398/-0. (Report committed as a follow-on with the
real PR number.)

## Checks Run

- `pnpm install --frozen-lockfile` → exit 0, "Already up to date" (no
  lockfile drift).
- `pnpm --filter @saas/cli typecheck` (`tsc --noEmit`) → exit 0.
- `pnpm --filter @saas/cli lint` (`eslint src`) → exit 0 (zero warnings).
- `pnpm --filter @saas/cli test` (`vitest run`) → 12 files, 153 tests
  passed (was 144 → net +9). New suite `webhook-enable.test.ts` 9/9 green.
- `kiox -- orun validate --intent intent.yaml` → "✓ All validation passed".
- `kiox -- orun plan --changed --intent intent.yaml --output plan.json` →
  3 jobs, all `cli` / `turbo-package.quick-check` / `verify`
  (dev, stage, prod). No other component selected.
- `kiox -- orun run --plan plan.json --dry-run --runner github-actions` →
  exit 0; cli dev/stage/prod Verify, "3 selected". (`plan.json` not
  committed; `kiox.lock` touch reverted.)

## Assumptions

- Human-mode field choice: `status` / `secretVersion` / `updatedAt`
  (three indented two-space lines). `disabledReason`/`disabledAt` are
  deliberately omitted — they are `null` after re-enable and printing
  them would be noise (per task Integration Notes).
- Header phrasing `Webhook endpoint re-enabled: ${endpointId} in ${orgId}`
  reuses the worker-side audit description for cross-surface consistency
  with the console enable-endpoint dialog.
- The fake-SDK `enableEndpoint` mock accepts `(orgId, endpointId, body,
  opts)` and the tests assert `body === {}` and `opts === {}` (or
  `{ idempotencyKey }`) to lock the call shape.

## Spec Proposals

None. No contract/SDK/worker gap that alters behavior.

## Remaining Gaps

- `EnableWebhookEndpointResponse` is **not** re-exported from the
  `@saas/sdk` package index (only `PublicWebhookEndpoint` is; Task 0113
  added the SDK method + the `@saas/contracts/webhooks` type but did not
  add the index re-export). The test therefore builds the response shape
  locally as `{ endpoint: PublicWebhookEndpoint }`. Editing
  `packages/sdk/**` is outside this PR's boundary, so this is left as a
  low-priority follow-on: add `EnableWebhookEndpointResponse` (and, for
  symmetry, audit `DisableWebhookEndpointResponse`) to the `@saas/sdk`
  index `export type { … } from "@saas/contracts/webhooks"` block.
- `webhook disable` symmetric CLI subcommand remains absent (explicit
  non-goal of this task; `client.webhooks.disableEndpoint` already exists
  so it is a copy-of-0114 follow-on).

## Next Task Dependencies

None. This closes the B5 endpoint-CRUD CLI gap for the re-enable surface.

## PR Number

#169 — https://github.com/sourceplane/multi-tenant-saas/pull/169
