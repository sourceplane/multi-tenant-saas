# Task 0092 — Implementer Report

Agent: Implementer
Branch: `impl/task-0092-eslint-config-scaffold`
PR: #TBD (updated after gh pr create)

## Summary

- Added the canonical 2-line ESLint v9 flat-config re-export to all 16
  workspaces previously missing one (7 apps, 1 package, 8 tests). Each
  new file is exactly:
  ```
  import config from "../../tooling/eslint/index.js";
  export default config;
  ```
  No per-workspace rule drift, no `ignores` overrides, no devDep
  additions — transitive resolution of `@typescript-eslint/*` via
  `tooling/eslint/index.js` reaches every workspace.
- `pnpm -r --no-bail lint` no longer reports the
  `ESLint couldn't find an eslint.config.* file` error class anywhere
  in the repo. All 33 lint-bearing workspaces now actually run ESLint.
- Class-A → Class-B shift is visible in the post-scaffold output: the
  16 newly-scaffolded workspaces split into 10 clean (lint=Done) and
  6 surfacing pre-existing rule violations (Class B). Three Class-B
  workspaces from before the task (tests/db, tests/identity-worker,
  tests/membership-worker) are unchanged.
- `pnpm -r typecheck` still exits 0. No production source touched.
- kiox/orun triple green: `orun validate`, `orun plan --changed`,
  `orun run --plan --dry-run --runner github-actions` all pass.
  Plan: 14 components × 3 envs → 30 jobs (`fe61d92dd52b`).

## Files Changed

16 new files, all canonical 2-line re-exports. No other files
modified, no `package.json`/`pnpm-lock.yaml` changes.

Apps (7):
- apps/billing-worker/eslint.config.js
- apps/config-worker/eslint.config.js
- apps/events-worker/eslint.config.js
- apps/metering-worker/eslint.config.js
- apps/policy-worker/eslint.config.js
- apps/projects-worker/eslint.config.js
- apps/webhooks-worker/eslint.config.js

Packages (1):
- packages/policy-engine/eslint.config.js

Tests (8):
- tests/billing-worker/eslint.config.js
- tests/config-worker/eslint.config.js
- tests/events-worker/eslint.config.js
- tests/metering-worker/eslint.config.js
- tests/policy-engine/eslint.config.js
- tests/policy-worker/eslint.config.js
- tests/projects-worker/eslint.config.js
- tests/webhooks-worker/eslint.config.js

## Checks Run

```
pnpm -r --no-bail lint
  before (Task 0091 baseline): 16 workspaces fail with
    "ESLint couldn't find an eslint.config.* file" (Class A) +
    3 workspaces fail with rule violations (Class B:
    tests/db, tests/identity-worker, tests/membership-worker).
  after:  Summary: 9 fails, 24 passes
          0 occurrences of "couldn't find an eslint.config" in output
          (verified via grep -c, exit 1 = no matches).
          The 9 failures are ALL Class-B (rule violations only):
            existing Class-B (3): tests/db, tests/identity-worker,
              tests/membership-worker
            newly-surfaced Class-B (6): apps/config-worker,
              apps/metering-worker, apps/projects-worker,
              tests/policy-worker, tests/projects-worker,
              tests/webhooks-worker
          The other 10 newly-scaffolded workspaces are clean (Done):
            apps/billing-worker, apps/events-worker,
            apps/policy-worker, apps/webhooks-worker,
            packages/policy-engine, tests/billing-worker,
            tests/config-worker, tests/events-worker,
            tests/metering-worker, tests/policy-engine
```

```
pnpm -r typecheck
  exit 0 — no regression from Task 0091 baseline.
```

```
./.workspace/bin/orun validate --intent intent.yaml
  ✓ Intent is valid
  ✓ All validation passed

./.workspace/bin/orun plan --changed --intent intent.yaml --output /tmp/plan-0092.json
  14 components × 3 envs → 30 jobs
  plan: fe61d92dd52b

./.workspace/bin/orun run --plan /tmp/plan-0092.json --dry-run --runner github-actions
  ◌ Preview ready in 0.0s
  30 selected — all ✓
```

```
git diff origin/main..HEAD --name-only
  16 eslint.config.js files (one per target workspace),
  ai/reports/task-0092-implementer.md.
  No other files. (state files left to verifier per workflow.)
```

## Assumptions (durable)

- Transitive resolution of `@typescript-eslint/eslint-plugin` and
  `@typescript-eslint/parser` via the shared `tooling/eslint/index.js`
  is sufficient for every target workspace; no per-workspace
  `devDependencies` additions were required, and `pnpm install` was
  not re-run. This matches the existing 17 working workspaces, all of
  which use the same 2-line re-export with no local devDep entries.
- Existing root-level ignores in `tooling/eslint/index.js`
  (`dist/**`, `.wrangler/**`, `coverage/**`, `*.tsbuildinfo`) cover
  every newly-scaffolded workspace's build outputs; no per-workspace
  `ignores` override is needed.

## Spec Proposals

None.

## Remaining Gaps (Class B follow-up)

The natural follow-up task is "Class B lint cleanup": fix
pre-existing rule violations in the 9 workspaces now failing
`pnpm -F <ws> lint` with rule output. Grouped by error class:

- `@typescript-eslint/no-unused-vars` errors (test files importing
  contract types they no longer reference, plus a few stray
  variables): tests/db, tests/identity-worker, tests/membership-worker,
  tests/projects-worker, tests/webhooks-worker, tests/policy-worker,
  apps/config-worker, apps/metering-worker, apps/projects-worker.
- `@typescript-eslint/no-explicit-any` warnings (non-blocking, but
  numerous in test files): tests/membership-worker (~350),
  tests/projects-worker, tests/policy-engine, etc.

Approximate error totals: 7 errors in tests/membership-worker,
8 errors in tests/webhooks-worker, 7 errors in tests/projects-worker,
1 error in tests/policy-worker, plus the existing tests/db (10) and
tests/identity-worker (1) baselines.

This task explicitly does NOT touch any of these — they are
pre-existing rule violations newly visible because lint can now run.

## Next Task Dependencies

- Task 0093 candidate: "Class B lint cleanup, wave 1" — pick the
  unused-import errors in tests workspaces (mechanical: drop unused
  type imports, prefix unused locals with `_`).
- Wave 2 candidate: tighten `@typescript-eslint/no-explicit-any` in
  test files via targeted `// eslint-disable-next-line` or proper
  type narrowing (heavier, optional).

## PR Number

PR: #TBD (will be filled in after `gh pr create`).
