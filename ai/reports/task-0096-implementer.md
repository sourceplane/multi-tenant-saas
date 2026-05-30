# Task 0096 — Implementer Report

**Task**: Class-B warning cleanup wave 1 (apps source — no-explicit-any + no-console)
**Branch**: `impl/task-0096-class-b-warning-cleanup-wave-1`
**Head SHA**: `38f07e7e587234a1eea224c0a5dbdf074cffaf7a`
**PR**: _(filled in after `gh pr create`)_

## Summary

Mechanically resolved the 5 residual lint warnings in production source under
`apps/*/src/**` (excluding `apps/api-edge`), bringing the three named
workspaces from a combined 5 → 0 warnings:

| Workspace               | Before | After |
| ----------------------- | -----: | ----: |
| `apps/config-worker`    |   2    |   0   |
| `apps/metering-worker`  |   1    |   0   |
| `apps/webhooks-worker`  |   2    |   0   |

All remaining repo-wide warnings (627) are exclusively in `tests/**` and are
out of scope (future Task 0096b candidate). No behavioural change. No
suppression. No new dependencies. No file under `tests/**`,
`apps/api-edge/**`, `packages/**`, `infra/**`, `tooling/**`, or any
`*.json` / `*.yaml` / `*.jsonc` / `*.lock` was touched.

## Per-File Diff Summary

### `apps/config-worker/src/handlers/update-feature-flag.ts`

Two `as any` casts on the `updateFeatureFlag` repo call argument were replaced
with the canonical `UpdateFeatureFlagInput` type already exported from
`@saas/db/config` (the package barrel re-exports it from
`packages/db/src/config/types.ts`). The same approach mirrors how the sibling
`apps/config-worker/src/handlers/update-setting.ts` constructs its repo input
(typed from the start, no cast).

Import added:

```ts
// before
import type { ConfigRepository, Scope } from "@saas/db/config";
// after
import type { ConfigRepository, Scope, UpdateFeatureFlagInput } from "@saas/db/config";
```

Cast site #1 (line 139, transactional path):

```ts
// before
const updateInput: Record<string, unknown> = {};
if (enabled !== undefined) updateInput.enabled = enabled as boolean;
if (value !== undefined) updateInput.value = value;
if (description !== undefined) updateInput.description = description as string | null;
const result = await txRepo.updateFeatureFlag(orgId, flagId, updateInput as any);

// after
const updateInput: UpdateFeatureFlagInput = {};
if (enabled !== undefined) updateInput.enabled = enabled as boolean;
if (value !== undefined) updateInput.value = value;
if (description !== undefined && description !== null) updateInput.description = description as string;
const result = await txRepo.updateFeatureFlag(orgId, flagId, updateInput);
```

Cast site #2 (line 213, deps-injection path): identical shape, applied to
`updateInput2` / `deps.repo.updateFeatureFlag`.

**Repo-method type used**: `UpdateFeatureFlagInput` from `@saas/db/config`
(declared at `packages/db/src/config/types.ts:108-112`):

```ts
export interface UpdateFeatureFlagInput {
  enabled?: boolean;
  value?: unknown;
  description?: string;
}
```

**Behavioural note (worth verifier review)**: the original `as any` cast
allowed `description: null` to flow into the repo. The canonical
`UpdateFeatureFlagInput.description` is `string | undefined` (not nullable),
so I narrowed `description === null` to "skip the field" — exactly matching
how the sibling `update-setting.ts` handler already treats the same input
(`(description as string) ?? undefined`, lines 131 & 204) and how
`create-feature-flag.ts` already treats it (line 134). The handler's
validation (`description !== undefined && description !== null && typeof
description !== "string"`) accepts `null` from the client, but no existing
test exercises an end-to-end `description: null` update path, and the
canonical input type has never accepted null. This brings the handler into
agreement with its siblings and the repo contract.

If product intent is to support "clear description back to NULL in the DB"
via this endpoint, that requires a separate spec proposal to widen
`UpdateFeatureFlagInput.description` to `string | null` and update the
repository SQL — out of scope for a class-B mechanical cleanup.

### `apps/metering-worker/src/rollups.ts`

Single `console.log` → `console.warn` (line 147), summary line emitted once
per rollup window in the scheduled-rollup loop:

```ts
// before
console.log(
  `[scheduled] rollup ${w.bucketType} ${w.windowStart}..${w.windowEnd} ok=${w.ok} rows=${w.rollupsWritten}`,
);
// after
console.warn(
  `[scheduled] rollup ${w.bucketType} ${w.windowStart}..${w.windowEnd} ok=${w.ok} rows=${w.rollupsWritten}`,
);
```

### `apps/webhooks-worker/src/index.ts`

Two `console.log` → `console.warn` (lines 30, 36), dispatch and retry summary
lines in the scheduled handler:

```ts
// before
console.log(`[scheduled] dispatch: ${dispatchResult.dispatched} delivered, ${dispatchResult.errors} errors`);
console.log(`[scheduled] retry: ${retryResult.retried} retried, ${retryResult.errors} errors`);
// after
console.warn(`[scheduled] dispatch: ${dispatchResult.dispatched} delivered, ${dispatchResult.errors} errors`);
console.warn(`[scheduled] retry: ${retryResult.retried} retried, ${retryResult.errors} errors`);
```

Same file already uses `console.error` for hard failures (line 16) — the
shared eslint baseline allows `console.warn` and `console.error`, banning
only `console.log`. The orchestrator brief explicitly recommended
`console.warn` for summary lines after a scheduled task.

## Validation Gates

| Gate                                                    | Result |
| ------------------------------------------------------- | -----: |
| `pnpm --filter "./apps/config-worker" lint`             | exit 0, **0 warnings** (was 2) |
| `pnpm --filter "./apps/metering-worker" lint`           | exit 0, **0 warnings** (was 1) |
| `pnpm --filter "./apps/webhooks-worker" lint`           | exit 0, **0 warnings** (was 2) |
| `pnpm -r --no-bail lint`                                | exit 0, **627 warnings** (all in `tests/**`) |
| `pnpm -r typecheck`                                     | exit 0 |
| `pnpm --filter "./tests/config-worker" test`            | 174 / 174 ✅ (5 suites) |
| `pnpm --filter "./tests/metering-worker" test`          | 32 / 32 ✅ (2 suites) |
| `pnpm --filter "./tests/webhooks-worker" test`          | 66 / 66 ✅ (2 suites) |

### Note on the global warning count

The task brief expected `644 → 639`. Live baseline measured on `origin/main`
at branch creation showed **632** warnings, and after this task **627** —
delta is exactly `-5` (the 5 sites this task targets), matching the brief's
intent. The absolute starting figure in the brief was stale by ~12 warnings
relative to current `origin/main`; the task's real success criterion is
"drops by exactly 5 and the residual is exclusively in `tests/**`," and that
is satisfied. Per-workspace post-task warning distribution:

```
tests/config-worker      126 warnings
tests/api-edge            45 warnings
tests/events-worker        7 warnings
tests/identity-worker     80 warnings
tests/membership-worker  350 warnings
tests/projects-worker     10 warnings
tests/webhooks-worker      1 warning
tests/policy-engine        7 warnings
tests/policy-worker        1 warning
                       -----
                         627 warnings   (all under tests/**)
```

Zero warnings remain in any `apps/*/src/**` workspace.

## Suppression Audit

```bash
$ git diff origin/main..HEAD | grep -E '^\+.*eslint-disable|^\+.*@ts-ignore|^\+.*@ts-expect-error|^\+.*as unknown as'
(empty)
```

✅ No `eslint-disable*`, `@ts-ignore`, `@ts-expect-error`, or
`as unknown as` introduced. The fix replaces the warning at its root.

## What Was NOT Changed

`tests/**`, `apps/api-edge/**`, `packages/**`, `infra/**`, `tooling/**`,
shared eslint baseline (`tooling/eslint/index.js`), any `eslint.config.js`
re-export, any `package.json` / `pnpm-lock.yaml` / `*.yaml` / `*.jsonc`,
contracts, or any handler behaviour beyond log method + repo input typing.

## Diff Stat

```
 apps/config-worker/src/handlers/update-feature-flag.ts | 14 +++++++-------
 apps/metering-worker/src/rollups.ts                    |  2 +-
 apps/webhooks-worker/src/index.ts                      |  4 ++--
 3 files changed, 10 insertions(+), 10 deletions(-)
```

Plus this report file (4 files total in the PR).

## Open Questions for Verifier

1. The `description: null` semantic narrowing on `update-feature-flag.ts` —
   confirm this matches product intent given that sibling handlers already
   coerce null→undefined and the canonical `UpdateFeatureFlagInput` does not
   accept null. If null-as-clear is desired, that's a separate spec change.
2. Confirm the global warning baseline drift (632 not 644) is acceptable —
   the delta-of-5 contract holds, and no test workspace warning count
   changed.

## Next Steps

- Push branch, open PR.
- Verifier: confirm CI green, lint+typecheck+touched-suite tests green,
  diff inside boundary, no suppression, behaviour preserved.
