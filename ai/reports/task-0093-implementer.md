# Task 0093 Implementer Report — Class-B Lint Cleanup Wave 1

## Summary

- Resolved all 39 `@typescript-eslint/no-unused-vars` errors across 9
  workspaces by deleting unused imports/locals (the smaller-diff fix in
  every case — none of the bindings were intentionally retained for
  shape/test-harness reasons).
- `pnpm -r --no-bail lint` now exits 0 across all 33 workspaces. The
  only remaining findings are `no-explicit-any` and `no-console`
  warnings, which are explicitly out of scope for Task 0093.
- `pnpm -r typecheck` continues to exit 0 (Task 0091 baseline preserved).
- `pnpm install --frozen-lockfile` exits 0 — lockfile not touched.
- No `eslint.config.js`, no `tooling/eslint/index.js`, no
  `package.json`, no `wrangler.*`, no `infra/**`, no `intent.yaml`,
  no `kiox.lock`, no `packages/**` files modified. No
  `eslint-disable` comments introduced.

## Files Changed

### Production source (apps/*-worker/src/**) — 4 errors cleared

- `apps/config-worker/src/handlers/health.ts` — drop unused
  `errorResponse` from named-import list (response helper is
  untouched).
- `apps/metering-worker/src/handlers/ingest-batch.ts` — drop unused
  `RecordUsageRequest` type-import.
- `apps/metering-worker/src/handlers/list-quota-violations.ts` — drop
  unused `ListQuotaViolationsResponse` type-import.
- `apps/projects-worker/src/handlers/create-project.ts` — drop unused
  `CreateProjectRequest` type-import.

No handler bodies, route shapes, response envelopes, or log lines were
touched. All four edits are import-list-only.

### tests/db/src/** — 10 errors cleared

- `tests/db/src/config.test.ts` — drop unused `ConfigRepository`,
  `Setting`, `FeatureFlag` from type-only import list.
- `tests/db/src/executor.test.ts` — drop unused
  `TransactionalSqlExecutor` type-import.
- `tests/db/src/webhooks.test.ts` — collapse type-only import block
  (all 4 names — `WebhookRepository`, `WebhookEndpoint`,
  `WebhookSubscription`, `WebhookDeliveryAttempt` — were unused;
  removed the entire `import type { ... } from "@saas/db/webhooks"`
  block).
- `tests/db/src/identity-migration.test.ts` — drop unused
  `projectMigrations` local in describe-block prelude.
- `tests/db/src/membership-migration.test.ts` — drop unused
  `projectMigrations` local in describe-block prelude.

### tests/identity-worker/src/** — 2 errors cleared

- `tests/identity-worker/src/security-events.test.ts` — drop unused
  `encodeCursor` import.
- `tests/identity-worker/src/profile.test.ts` — drop unused `userId`
  destructure (test only consumes `token`).

### tests/membership-worker/src/** — 7 errors cleared

`tests/membership-worker/src/membership-worker.test.ts`:

- Drop unused named import `parseMemberPublicId` (rest of import list
  preserved).
- Drop the entire unused `createEnv` helper function (476–501); never
  referenced anywhere in the file.
- Inline the now-unused `repo`/`orgId` destructure into a bare
  `createMemberListRepo();` call site, and drop the dead
  `policyFetcher`/`handler` setup that followed it (the test body
  exercises members-array shape directly without ever invoking the
  handler).
- Drop the unused `allowBillingCheck` helper definition; its
  documenting comment is preserved as orientation for future readers.

### tests/projects-worker/src/** — 7 errors cleared

`tests/projects-worker/src/projects-worker.test.ts`:

- Drop unused type imports `PageQueryParams`, `PagedResult`,
  `EventsResult`, `AppendEventInput`, `EventsPageQueryParams`,
  `EventsPagedResult`.
- Drop unused `MockFn` interface + `mockFn` helper at top of file.

### tests/webhooks-worker/src/** — 8 errors cleared

- `tests/webhooks-worker/src/delivery.test.ts` — drop unused named
  imports `WEBHOOK_LIFECYCLE_EVENT_TYPES`, `CiphertextEnvelope`,
  `WebhookResult`, `PagedResult`, `WebhookEndpoint`,
  `WebhookSubscription`. Drop unused `attemptCounter` local + its
  single increment site (the counter was never read).
- `tests/webhooks-worker/src/webhooks-worker.test.ts` — drop unused
  named import `projectPublicId`.

### tests/policy-worker/src/** — 1 error cleared

`tests/policy-worker/src/policy-worker.test.ts` — `const body = await
json(res);` rewritten to `await json(res);` (response was awaited only
to assert downstream header behaviour).

## Per-Workspace Error Inventory Cleared

| Workspace                  | Before | After |
| -------------------------- | -----: | ----: |
| apps/config-worker         | 1      | 0     |
| apps/metering-worker       | 2      | 0     |
| apps/projects-worker       | 1      | 0     |
| tests/db                   | 10     | 0     |
| tests/identity-worker      | 2      | 0     |
| tests/membership-worker    | 7      | 0     |
| tests/projects-worker      | 7      | 0     |
| tests/webhooks-worker      | 8      | 0     |
| tests/policy-worker        | 1      | 0     |
| **Total**                  | **39** | **0** |

## Checks Run

- `pnpm install --frozen-lockfile` → exit 0, "Lockfile is up to date".
- `pnpm -r --no-bail lint` → exit 0; 33/33 workspaces; zero errors;
  warnings unchanged (all `no-explicit-any` / `no-console`).
- `pnpm -r typecheck` → exit 0 (Task 0091 baseline preserved).
- `git diff --stat origin/main..HEAD -- pnpm-lock.yaml` → empty.
- `git diff --stat origin/main..HEAD -- 'tooling/eslint/**'
  '**/eslint.config.js'` → empty.
- `git diff --stat origin/main..HEAD -- 'packages/**'` → empty.
- `git diff --stat origin/main..HEAD -- 'infra/**' 'intent.yaml'
  '**/wrangler.*' '**/component.yaml' kiox.lock` → empty.
- `/Users/irinelinson/.local/bin/kiox -- orun validate --intent
  intent.yaml` → "✓ Intent is valid", "✓ All validation passed".
- `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent
  intent.yaml --output plan.json` → 8 components × 3 envs → 14 jobs.
- `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json
  --dry-run --runner github-actions` → 14 jobs preview ready, all ✓.
- `plan.json` was not committed (used for local validation only).

## Decisions Taken Under Latitude

- All 39 unused-vars errors were resolved by **deletion**, not
  `_`-prefix renaming. The shared rule's `argsIgnorePattern: "^_"`
  legalizes `_`-prefix only for **function arguments**, not for
  destructured locals, named imports, or `const` bindings. Spot-test
  on `const { foo: _foo }` confirmed `_`-prefixing destructured names
  still fires the error, so deletion was the only authorized fix for
  the bulk of the inventory.
- `tests/membership-worker/src/membership-worker.test.ts`: the
  `createEnv` helper, `policyFetcher`/`handler` block, and
  `allowBillingCheck` helper had no callers anywhere in the file or
  package; deleted as dead code rather than `_`-renamed. The
  documenting comment above `allowBillingCheck` is retained as
  orientation for future readers.
- `tests/identity-worker/src/profile.test.ts`: dropped the `userId`
  destructure outright instead of renaming to `_userId`; the test only
  consumes `token`.
- `tests/policy-worker/src/policy-worker.test.ts`: rewrote
  `const body = await json(res);` as a bare `await json(res);` —
  preserves the side-effect (consuming the response stream) without
  an unused binding.
- `tests/webhooks-worker/src/delivery.test.ts`: dropped the
  `attemptCounter` local **and** its sole `attemptCounter++`
  increment site; the counter was never read so the increment was
  also dead.

## Assumptions

- Verifier will accept "delete unused symbol" as a smaller-diff fix
  than `_`-prefix for every error in scope. The task prompt's
  Constraint 3 explicitly endorses this — "When the unused identifier
  is an import, prefer outright deletion over `_`-rename."
- No public package boundary is crossed. All edits live in
  `apps/*-worker/src/**` (production handlers, import-list-only) or
  `tests/*-worker/src/**` (test files, free deletion latitude).
- `kiox.lock` was untouched (initially showed dirty after the
  validation triple, reverted with `git checkout` before commit).

## Spec Proposals

None.

## Remaining Gaps

- 350+ residual lint **warnings** remain across the lint surface
  (`no-explicit-any` dominates, plus a handful of `no-console`).
  These are explicitly out of scope per Task 0093 Non-Goals and per
  the shared rule baseline (`no-explicit-any: warn`,
  `no-console: warn`). Cleaning them up is a separate future task if
  ever taken.
- `tests/api-edge`, `tests/config-worker`, `tests/events-worker`,
  `tests/policy-engine`, and several other workspaces still surface
  warnings — none reach `error` severity.

## Next Task Dependencies

None. Wave 1 lint cleanup is self-contained and unblocks any
subsequent "love the repo" hygiene task (e.g. `no-explicit-any`
sweep, `no-console` sweep) without further sequencing.

## PR Number

TBD — will be filled in after `gh pr create` and committed in a
follow-up patch on the same branch.
