# Task 0116 Implementer Report

## Summary

- Closes the SDK index re-export gap surfaced by Tasks 0114 and 0115:
  `EnableWebhookEndpointRequest` and `EnableWebhookEndpointResponse` are now
  publicly exported from `@saas/sdk`, restoring symmetry with every other
  webhook-endpoint operation pair (`Create*`, `Update*`, `Disable*`, `Delete*`,
  `Rotate*`).
- Refactored `webhook-enable.test.ts` to import
  `EnableWebhookEndpointResponse` directly from `@saas/sdk` instead of
  reconstructing the shape via a local `interface EnableResponse`. The stale
  "not (yet) re-exported" comment block was deleted. `PublicWebhookEndpoint`
  retained for `FIXTURE_ENDPOINT`.
- Pure type-source swap in the test — zero change to assertions, fixture
  values, harness wiring, or `it(...)` case count (still 9 cases, all green).
- Contracts package untouched (source of truth for these types is already
  correct at `packages/contracts/src/webhooks.ts:80,85`).
- Diff is small and additive: 2 lines added to the SDK index export block,
  6 lines removed from the test (interface + comment), 4 lines adjusted
  (import + 2 type-name swaps).

## Files Changed

### SDK index
- `packages/sdk/src/index.ts` — added `EnableWebhookEndpointRequest` and
  `EnableWebhookEndpointResponse` to the existing webhook-endpoint
  `export type { … } from "@saas/contracts/webhooks"` block, placed adjacent
  to the `Update*`/`Disable*` pairs (mirroring the contract ordering).

### Enable test
- `packages/cli/src/__tests__/webhook-enable.test.ts` —
  - Replaced local `interface EnableResponse { endpoint: PublicWebhookEndpoint }`
    with `import type { EnableWebhookEndpointResponse } from "@saas/sdk"`.
  - Used `EnableWebhookEndpointResponse` for the `RESPONSE` fixture,
    `HarnessOpts.response` field, and the fake `enableEndpoint` return type.
  - Removed the stale "not (yet) re-exported" comment block (lines 10–14 of
    the prior version).
  - Kept `PublicWebhookEndpoint` import (still used for `FIXTURE_ENDPOINT`).

### Report
- `ai/reports/task-0116-implementer.md` (this file).

## Checks Run

- `pnpm install --frozen-lockfile` → clean, "Already up to date", no lockfile drift.
- `pnpm --filter @saas/sdk typecheck` → exit 0.
- `pnpm --filter @saas/cli typecheck` → exit 0.
- `pnpm --filter @saas/sdk lint` → exit 0, no warnings.
- `pnpm --filter @saas/cli lint` → exit 0, no warnings.
- `pnpm --filter @saas/sdk test` → 5 files / 108 tests passed.
- `pnpm --filter @saas/cli test` → 13 files / 164 tests passed;
  `webhook-enable.test.ts` = 9 tests passed (same as main HEAD).
- `./.workspace/bin/orun validate` → ✓ Intent is valid, ✓ All validation passed.
- `./.workspace/bin/orun plan --changed --base origin/main` →
  `2 components × 3 envs → 6 jobs`, components: `cli, sdk` (expected).
- `./.workspace/bin/orun run --plan ... --dry-run --runner github-actions` →
  6/6 jobs ✓ (cli·{dev,stage,prod}·Verify + sdk·{dev,stage,prod}·Verify).
- `kiox.lock` mutation from Orun runs reverted before commit.

## Assumptions

- The two new export names belong adjacent to the sibling `*WebhookEndpoint*`
  request/response pairs, ordered to mirror the contract source
  (Update → Enable → Disable → Delete → Rotate). This matches the contract
  file's ordering (`packages/contracts/src/webhooks.ts:80,85` — Enable defined
  immediately before Disable).
- The enable test case count is unchanged (9). No new cases needed because the
  refactor is purely a type-source swap; the existing 9 cases already cover
  the surface and continue to pass.
- The `as unknown as Sourceplane` boundary cast in the harness (line ~120) is
  pre-existing and may remain — it sits at the mock/SDK boundary, not at the
  type-import surface this PR changes.
- `node:fs`/`node:os`/`node:path` test imports are pre-existing and out of scope
  for this hazard policy (not introduced by this change).

## Spec Proposals

None. This is a pure re-export carry-forward fix; the contract source of truth
already defines both types correctly.

## Remaining Gaps

- No CLI read-side webhook surface yet (`list` / `get` / `update` / `delete`
  subcommands) — separate scope, not regressed by this PR.
- Webhook subscription CLI surface (subscribe/list-subscriptions/etc.) not yet
  exposed at the CLI layer — separate scope.

## Next Task Dependencies

None. This task closes the enable re-export carry-forward gap that has been
trailing since Task 0114; the webhook-endpoint type surface is now uniformly
public for all six CRUD-ish operations (Create/Get/List/Update/Enable/Disable
/Delete/Rotate-secret).

## PR Number

#171
