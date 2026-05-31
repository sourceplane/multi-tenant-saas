# Task 0115 — Implementer Report

## Summary

- Shipped `sourceplane webhook disable <endpointId> [--reason=TEXT]` as a
  pure SDK consumer of `client.webhooks.disableEndpoint`, closing the
  final B5 endpoint-CRUD CLI gap (disable). CLI endpoint-CRUD is now
  symmetric with console end-to-end (create / disable / re-enable; with
  delete still parked under separate scope).
- Mirrors the Task 0114 (`webhook enable`) cadence and shape exactly,
  diverging only where disable semantics require: optional `--reason`
  flag + body construction, and a 4-line human block
  (`status` / `disabledReason` / `disabledAt` / `updatedAt`).
- Imports `DisableWebhookEndpointResponse` directly from `@saas/sdk` —
  the disable response type is already re-exported (sdk/src/index.ts:174),
  so the test fixture is built from the SDK type rather than locally
  reconstructed.
- 11 new vitest cases (≥ 9 floor) added; total `@saas/cli` test count
  goes 153 → 164 (+11). All four pnpm gates and three Orun local gates
  pass; `orun plan --changed --base origin/main` selects exactly the
  three `cli · {dev,stage,prod} · Verify` lanes.

## Files Changed

Command source:
- `packages/cli/src/commands/webhook-disable.ts` (NEW)

Runner registration:
- `packages/cli/src/cli-runner.ts` (MODIFIED) — one new import, one new
  `r.register([\"webhook\", \"disable\"], …)` line, one new help-output
  usage line. All three insertions placed directly after the `webhook
  enable` peer.

Test:
- `packages/cli/src/__tests__/webhook-disable.test.ts` (NEW) — 11 cases.

Report:
- `ai/reports/task-0115-implementer.md` (this file).

## Checks Run

pnpm gates:
- `pnpm install --frozen-lockfile` → no lockfile drift.
- `pnpm --filter @saas/cli typecheck` → exit 0.
- `pnpm --filter @saas/cli lint` → exit 0, no new warnings vs main HEAD.
- `pnpm --filter @saas/cli test` → 13 files, 164 tests passed (+11 over
  baseline of 153 after Task 0114).

Orun local gates:
- `./.workspace/bin/orun validate` → `✓ Intent is valid`,
  `✓ All validation passed`.
- `./.workspace/bin/orun plan --changed --base origin/main --output
  /tmp/plan-0115.json` → 3 jobs: `cli.dev.verify`, `cli.stage.verify`,
  `cli.prod.verify` (exactly the three expected lanes; no other
  components selected).
- `./.workspace/bin/orun run --plan /tmp/plan-0115.json --dry-run
  --runner github-actions` → `3 selected`, all simulate `✓`.

## Assumptions

- Human-mode field choice for disable: `status` / `disabledReason` /
  `disabledAt` / `updatedAt` (4 lines vs enable's 3-line
  `status` / `secretVersion` / `updatedAt`). The two newly populated
  audit fields (`disabledReason`, `disabledAt`) are surfaced; the
  pre-disable `secretVersion` is omitted because it doesn't change on
  disable. The header phrase "Webhook endpoint disabled: …" mirrors the
  worker-side audit phrasing for cross-surface consistency with the
  console disable dialog.
- `--reason` flag handling:
  - Absent → body `{}`.
  - String value → body `{ reason: "<value>" }`.
  - Bare `--reason` (no value, parsed as boolean `true`) →
    `UsageError("webhook disable: --reason requires a value")`, exit 2.
  - Explicitly empty string (`--reason=""`) → forwarded verbatim as
    `{ reason: "" }`. Per task scope, the worker decides whether to
    accept it.
- The `webhook disable:` subcommand prefix is used in both the
  `--output` and `--reason` `UsageError` messages, matching the existing
  webhook subcommand convention.
- Org id resolution uses `resolveOrgId(ctx, /* allowOverride */ false)`,
  matching `webhook enable` and `webhook secrets rotate` — no `--org`
  flag plumbing, persisted active-org context is the only source.

## Spec Proposals

None. The contract (`DisableWebhookEndpointRequest` + `Response`) and
the SDK shape (`disableEndpoint(orgId, endpointId, body, opts)`) were
already locked and exported; no new gaps discovered during
implementation.

## Remaining Gaps

- The `EnableWebhookEndpointResponse` missing-re-export from
  `@saas/sdk`'s package index (noted in Task 0114) is still open. It is
  a candidate SDK-surface task and is NOT addressable from CLI —
  `packages/sdk/**` is a forbidden zone for this PR. The disable-side
  has no analogous gap (`DisableWebhookEndpointResponse` IS re-exported,
  sdk/src/index.ts:174).
- No CLI surface yet for `webhook endpoints list` / `get` / `delete` /
  `update`. Each is a separate scoped slice; tracked as deferred
  candidates in `/ai/deferred.md` where applicable.

## Next Task Dependencies

None. This PR closes the B5 endpoint-CRUD CLI arc (create / disable /
re-enable) end-to-end. The next CLI cadence is open scope; a natural
follow-on would be `webhook endpoints list` / `get` for read-side
parity, but neither blocks any current orchestrator-tracked task.

## PR Number

#TBD
