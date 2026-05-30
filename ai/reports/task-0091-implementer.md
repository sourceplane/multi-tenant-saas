# Task 0091 — Implementer Report

## Summary
- Cleaned the workspace `pnpm -r typecheck` baseline by fixing the two test-only workspaces that were failing on a clean checkout of `main @ a5aa47d`.
- `tests/identity-worker/tsconfig.json`: added `"lib": ["ES2022", "DOM"]` so `globalThis.crypto` (Web Crypto / `Crypto` interface) resolves under `tsc`. The test files import `node:crypto` for the polyfill but read from `globalThis.crypto` — DOM lib provides the type without changing runtime behavior.
- `tests/policy-engine/tsconfig.json`: removed `"node"` from `compilerOptions.types`. The package has no `@types/node` devDep and no test source references Node globals, so requesting the `node` type lib was the only thing keeping `tsc` from succeeding.
- Smallest diff achievable: 2 lines across 2 files. No `package.json`, no `pnpm-lock.yaml`, no ambient declaration files, no production source touched.

## Files Changed
Tests config (only):
- `tests/identity-worker/tsconfig.json` — add `"lib": ["ES2022", "DOM"]`.
- `tests/policy-engine/tsconfig.json` — `"types": ["jest", "node"]` → `"types": ["jest"]`.

State / report files (this commit and follow-up):
- `ai/reports/task-0091-implementer.md` (this file).

## Checks Run
All commands executed at branch `impl/task-0091-tests-typecheck-baseline` against `main @ a5aa47d`.

1. `pnpm -F @saas/identity-worker-tests typecheck` → exit 0 ✅
2. `pnpm -F @saas/policy-engine-tests typecheck` → exit 0 ✅
3. `pnpm -F @saas/identity-worker-tests test` → 7 suites, 122 passed (matches prior baseline) ✅
4. `pnpm -F @saas/policy-engine-tests test` → 2 suites, 177 passed (baseline captured) ✅
5. `kiox -- orun validate --intent intent.yaml` → `✓ Intent is valid`, `✓ All validation passed` ✅
6. `kiox -- orun plan --changed --intent intent.yaml --output /tmp/plan-0091.json` → 2 components × 3 envs → 2 jobs (identity-worker-tests, policy-engine-tests) ✅
7. `kiox -- orun run --plan /tmp/plan-0091.json --dry-run --runner github-actions` → 2 jobs preview, both `✓ Verify 0.0s` ✅
8. `git diff main --stat` → only `tests/identity-worker/tsconfig.json` and `tests/policy-engine/tsconfig.json` ✅

`pnpm install` was not required (no devDep added; no `pnpm-lock.yaml` change).

## Assumptions (durable)
- `tooling/tsconfig/base.json` sets `"lib": ["ES2022"]`. The identity-worker test `tsconfig.json` extends base and now narrows-overrides with `["ES2022", "DOM"]`. DOM lib is the canonical TS source for `Crypto` / `SubtleCrypto` typings; adding it to a workers test workspace matches what `@cloudflare/workers-types` expects at runtime and what the polyfill block in `src/*.test.ts` already implies.
- The `policy-engine-tests` workspace has zero Node runtime dependency in source today. If a future test imports `node:*`, the implementer should re-add `@types/node` to that package's `devDependencies` and restore `"node"` to `types`.

## Spec Proposals
None.

## Remaining Gaps
- Out of scope: a workspace-wide `pnpm -r typecheck` is not part of this task and was not asserted clean. Other workspaces may still have pre-existing typecheck noise; this task only addresses the two named in the brief. If a future pass wants a green `pnpm -r typecheck`, a follow-up task should sweep the remaining workspaces.
- Out of scope: the verify-profile composition for these two test workspaces was not modified — they remain test-only without `typecheck` in their orun verify profile, matching the current main shape.

## Next Task Dependencies
None. This unblocks (but does not require) any future task that wants to add `pnpm -r typecheck` to a verify profile or to introduce a workspace-wide typecheck gate.

## PR Number
TBD (filled in after `gh pr create`).
