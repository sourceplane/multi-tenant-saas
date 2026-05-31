# Task 0111 — Implementer Report

Agent: Implementer
Task: Extract shared `cli-helpers` module (`resolveOrgId` /
`readIdempotencyKey`)
Branch: `impl/task-0111-cli-helpers-extract`
Base: `main` @ `fcc5340` (Task 0111 scope commit on top of `142d019`
PR #165 squash)
PR Number: #166

## Summary

- New `packages/cli/src/commands/helpers.ts` (61 LOC) exports exactly
  two functions: `resolveOrgId(ctx, allowOverride)` and
  `readIdempotencyKey(ctx)`. Semantics are byte-equivalent to the
  Task 0101 inline copy in `writes.ts` (canonical source); the
  `webhook-secrets-rotate.ts` no-override branch is now expressed as
  `resolveOrgId(ctx, /* allowOverride */ false)`.
- `writes.ts` drops the inline `resolveOrgId` (lines 41–55) and
  `readIdempotencyKey` (lines 63–66) and imports both from
  `./helpers.js`. All 5 `resolveOrgId(...)` and 5 `readIdempotencyKey(...)`
  call sites are unchanged in shape — diff is a single import line
  swap plus the two function-body deletions.
- `webhook-secrets-rotate.ts` drops the `resolveActiveOrgId` and
  inline `readIdempotencyKey` definitions, imports both from
  `./helpers.js`, and updates the single call site to
  `resolveOrgId(ctx, /* allowOverride */ false)`. The header comment
  block (around lines 45–51) is replaced with a short pointer to
  `./helpers.js` — the obsolete "the task forbids touching
  `writes.ts`" sentence (Task 0110 constraint, no longer applicable)
  is gone.
- New `packages/cli/src/__tests__/helpers.test.ts` adds 8 vitest
  cases (≥6 required) covering all six required scenarios plus a
  bonus "boolean `true` flag" guard. Vitest goes from 136/136 across
  10 files (baseline) to 144/144 across 11 files (passing).
- All local quality gates green; `kiox -- orun plan --changed`
  selects only `cli · {dev,stage,prod} · Verify` (3 jobs,
  turbo-package shape, no deploy lane). PR creation pending — see
  `PR Creation` section below.

## Files Changed

```
packages/cli/src/__tests__/helpers.test.ts         | 161 +++++++++++++++++++++  (NEW)
packages/cli/src/commands/helpers.ts               |  61 ++++++++           (NEW)
packages/cli/src/commands/webhook-secrets-rotate.ts |  35 +----
packages/cli/src/commands/writes.ts                |  40 +----
ai/reports/task-0111-implementer.md                | (this file)         (NEW)
```

5 files changed; ~232 insertions / 65 deletions in code, plus this
report. No `pnpm-lock.yaml`, no `package.json`, no `kiox.lock`, no
`component.yaml`, no SDK / contracts / api-edge / worker / Terraform
edits. Boundary respected.

## Checks Run

Local quality gates (clean checkout state, `fcc5340` + branch tip):

```
pnpm install --frozen-lockfile
  → Lockfile is up to date, resolution step is skipped. PASS.

pnpm exec turbo run typecheck --filter=@saas/cli
  → @saas/cli:typecheck PASS (cache miss). 4/4 tasks successful.

pnpm exec turbo run lint --filter=@saas/cli
  → @saas/cli:lint PASS (eslint src, no warnings). 1/1 task successful.

pnpm exec turbo run build --filter=@saas/cli
  → @saas/cli:build PASS (tsc + bundle.mjs). 4/4 tasks successful.

pnpm exec turbo run test --filter=@saas/cli
  → 11 test files, 144/144 passing, 0 failed, 0 skipped. PASS.
    (baseline 136 across 10 files + 8 new in helpers.test.ts.)
```

Orun gates:

```
kiox -- orun validate --intent intent.yaml
  → ✓ Intent is valid; ✓ All validation passed.

kiox -- orun plan --changed --intent intent.yaml --output plan.json
  → 1 components × 3 envs → 3 jobs (cli only, plan id 08b3e6024e48).

kiox -- orun run --plan plan.json --dry-run --runner github-actions
  → 3/3 jobs ✓ (cli · {dev,stage,prod} · Verify). Preview ready.
```

Acceptance regex audits:

```
rg "async function resolveOrgId\(" packages/cli/src/commands/
  → 1 hit in helpers.ts (export); 1 PRE-EXISTING hit in cross-reads.ts.
    See "Remaining Gaps" below.

rg "function readIdempotencyKey\(" packages/cli/src/commands/
  → 1 hit, in helpers.ts (export). PASS.

rg "async function resolveActiveOrgId\(" packages/cli/src
  → 0 hits. PASS.
```

CI lanes (PR-CI 4/4): pending PR creation.

## Assumptions

- The task statement that `rg "async function resolveOrgId\("
  packages/cli/src/commands/` returns "exactly ONE hit (in
  `helpers.ts`)" overlooked the pre-existing single-arg
  `async function resolveOrgId(ctx)` in `cross-reads.ts` (no-override
  read variant, byte-equivalent to today's reads-only resolver). The
  task's PR-Boundary section explicitly forbids edits to
  `cross-reads.ts`, so I did NOT extract it. The acceptance criterion
  is in tension with the boundary; I held the boundary. A follow-on
  alignment task can collapse the reads variant onto
  `resolveOrgId(ctx, false)` if/when that's worth a PR — see
  "Remaining Gaps".
- The new `helpers.test.ts` does NOT import the existing test fixture
  `__tests__/helpers.ts` for its core fixture surface (only
  `MemoryTokenStore`); the file-name collision is harmless because
  the source file under test lives at
  `commands/helpers.ts`, distinct from the test fixture path.
- `outputMode: "human"` is set on the synthetic `CommandContext`
  fixture in `helpers.test.ts` because the type requires it; the
  helpers under test never read it.

## Spec Proposals

None. Pure behaviour-preserving refactor; locked CLI surface in
`specs/components/13-cli-and-sdk.md` is byte-equivalent.

## Remaining Gaps

- `cross-reads.ts` still carries its own single-arg
  `async function resolveOrgId(ctx)` — pre-existing on main
  (`bced5fa`), out of scope per the task's PR-Boundary "No changes
  to `cross-reads.ts`". Future cleanup could replace it with
  `resolveOrgId(ctx, false)` from `./helpers.js` (one line of
  deletions + one import). Not needed before the next CLI write
  surface lands; reads have no idempotency dimension.
- `assertOutputModeValid` remains inlined in
  `webhook-secrets-rotate.ts` — single call site, narrower scope,
  task explicitly defers extraction until a second consumer appears.
- Future CLI write/rotate surfaces are now the natural next consumer
  of `helpers.ts`; the module is sized to absorb them without
  growth.

## Next Task Dependencies

None. This refactor is a leaf in the dependency graph and unblocks
nothing specific; it removes a duplication hazard ahead of the next
CLI write/rotate surface.

## PR Creation

- Branch: `impl/task-0111-cli-helpers-extract`
- Title: `Task 0111: extract shared cli-helpers module (resolveOrgId / readIdempotencyKey)`
- URL: https://github.com/sourceplane/multi-tenant-saas/pull/166
- PR #166, opened against `main`. CI lanes (plan + cli·{dev,stage,prod}·Verify)
  watching post-push.
