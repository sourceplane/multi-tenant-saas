# Task 0125 — Implementer Report

**Role:** Implementer
**Milestone:** `hygiene-bounded-context-drift-proofing`
**Branch:** `impl/task-0125-bounded-context-single-source`
**Base:** main HEAD `0a8f9d7` (Task 0124 / B9 observability squash, PR #179)
**PR title:** `refactor(db): single source of truth for bounded contexts (drift-proof VALID_CONTEXTS)`
**Lane:** `@saas/db` (source of truth) + `tests/db` (consumer). turbo db-tests lane, **no deploy gate**.

---

## Summary

Killed a recurring drift failure class by making the set of valid bounded contexts a single
**runtime** source of truth (`BOUNDED_CONTEXTS` `as const`) in `@saas/db`, and deriving **both**
the `BoundedContext` type union **and** the migration verifier's `VALID_CONTEXTS` array from it.

Previously the test array (`tests/db/src/migrations.test.ts`) and the `BoundedContext` type union
(`packages/db/src/types.ts`) were two hand-maintained lists. TypeScript types erase at runtime, so
the compiler could never check the test array against the union — they drifted silently every time a
context was added (bit the repo on Task 0117 / PR #172, re-flagged in 0117/0118/0120/0124 verifier
reports). After this change it is **structurally impossible** for the test list to drift from the
type union: both flow from one runtime constant.

Pure refactor. The effective `BoundedContext` union is byte-for-byte unchanged (same 11 members,
same order). No migration, manifest, checksum, schema, worker, infra, lockfile, or dependency touched.

## Files changed (3 source + this report)

| File | Rationale |
|------|-----------|
| `packages/db/src/types.ts` | Replaced the 11-member literal union with a `BOUNDED_CONTEXTS` `as const` runtime constant; re-derived `BoundedContext = (typeof BOUNDED_CONTEXTS)[number]`. |
| `packages/db/src/index.ts` | Added value export `export { BOUNDED_CONTEXTS } from "./types.js"` alongside the existing `export type { ... }` line (kept the type/value export split — types stay in `export type`, the const gets its own value-export line with the ESM `.js` specifier). |
| `tests/db/src/migrations.test.ts` | Deleted the hand-maintained `VALID_CONTEXTS: BoundedContext[]` literal (13 lines); now `import { manifest, BOUNDED_CONTEXTS } from "@saas/db"` and `const VALID_CONTEXTS = BOUNDED_CONTEXTS`. `toContain` assertion semantics identical. |
| `ai/reports/task-0125-implementer.md` | NEW — this report. |

## Before / after

### `types.ts` (literal union → `as const` + derived type)

Before:
```ts
export type BoundedContext =
  | "control" | "identity" | "membership" | "projects" | "billing"
  | "events" | "config" | "webhooks" | "metering" | "notifications" | "support";
```

After:
```ts
export const BOUNDED_CONTEXTS = [
  "control", "identity", "membership", "projects", "billing",
  "events", "config", "webhooks", "metering", "notifications", "support",
] as const;

export type BoundedContext = (typeof BOUNDED_CONTEXTS)[number];
```

### `index.ts` (barrel — type/value split preserved)

```ts
export type { BoundedContext, MigrationEntry, MigrationManifest } from "./types.js";
export { BOUNDED_CONTEXTS } from "./types.js";   // NEW value export
export { manifest } from "./manifest.js";
```

### `migrations.test.ts` (literal → import)

Before: `const VALID_CONTEXTS: BoundedContext[] = [ ...11 literals... ];`
After:  `const VALID_CONTEXTS = BOUNDED_CONTEXTS;` (import added at top).

The two `PROJECT_SCOPED_CONTEXTS: BoundedContext[] = ["projects"]` locals (the deliberate narrow
subset, not the drift source) were left untouched, so the `BoundedContext` **type** import is still
used — no unused-import error.

## Verification

1. **Union unchanged.** Built `@saas/db` and inspected the runtime constant:
   `BOUNDED_CONTEXTS.length === 11`, members `["control","identity","membership","projects","billing","events","config","webhooks","metering","notifications","support"]`, order matches the prior union exactly.
2. **Typecheck — both clean.**
   - `pnpm --filter @saas/db typecheck` → OK (tsc --noEmit, 0 errors)
   - `pnpm --filter @saas/db build` → OK
   - `pnpm --filter @saas/db-tests typecheck` → OK
   `BoundedContext` still resolves to the same union: a valid literal (`"support"`) compiles, an
   invalid literal would error — the derived type behaves identically to the old hand-written union.
3. **Test suite — 522/522 pass** (15 suites), including `each migration declares a valid bounded
   context`, now backed by the derived constant.
4. **Drift-proofing proven (by construction).** Adding a new context now requires editing only
   `BOUNDED_CONTEXTS`; the `BoundedContext` type and the test's `VALID_CONTEXTS` both re-derive
   automatically from that one array. There is no longer a second hand-maintained list to forget.
5. **Boundary clean** — `git diff --stat`:
   ```
   packages/db/src/index.ts        |  2 ++
   packages/db/src/types.ts        | 27 +++++++++++++++------------
   tests/db/src/migrations.test.ts | 16 ++--------------
   3 files changed, 19 insertions(+), 26 deletions(-)
   ```
   Zero forbidden-zone hits (no migration/manifest/checksum/.sql, no worker/component.yaml/wrangler,
   no infra/terraform, no lockfile/package.json, no other tests/* package, no new dependency,
   no roadmap/deferred edit).

## Pitfalls encountered

- **ESM value export split.** `index.ts` uses `export type { ... }` for the type re-export. The
  const must NOT be folded into that line (TS forbids a value in an `export type`); it needs its own
  `export { BOUNDED_CONTEXTS } from "./types.js"` line, with the `.js` specifier (NodeNext ESM
  resolution) even though the source is `.ts`.
- **`BoundedContext` import retention.** Deleting the literal almost orphaned the `import type {
  BoundedContext }` in the test, but the two `PROJECT_SCOPED_CONTEXTS: BoundedContext[]` annotations
  still reference it, so no unused-import error surfaced. Left those untouched per task boundary.

## Carry-forward notes for the verifier

- Branch is off the sealed snapshot `0a8f9d7`. If main has advanced, **rebase-if-BEHIND is the
  verifier's job** — the diff is a 3-file refactor with no migration/manifest/lockfile surface, so
  conflicts are unlikely outside those three files.
- PASS gate is **green CI (typecheck + db tests)** — no post-merge worker deploy (no deploy job in
  this lane).
- To re-confirm union equivalence post-rebase: build `@saas/db` and check
  `BOUNDED_CONTEXTS.length === 11` with the exact member order above, then run the db test suite
  (expect 522/522).
