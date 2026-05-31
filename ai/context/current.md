# Current Context

Last updated: 2026-05-31 — Task 0116 VERIFIED + MERGED; Task 0117 SCOPED (orchestrator). Awaiting implementer.

PR #171 (Task 0116 `refactor(sdk): re-export EnableWebhookEndpoint
request/response types`) squash-merged to main as `c860053` (mergedAt
2026-05-31T11:15:50Z). Inline 8-phase verifier PASS adapted for a 2-component
sdk+cli turbo PR: EXACTLY 3 files (+108/-14) on the boundary
(`packages/sdk/src/index.ts` +2 additive re-export of
`EnableWebhookEndpointRequest`+`EnableWebhookEndpointResponse` adjacent to the
Update*/Disable* pairs, `packages/cli/src/__tests__/webhook-enable.test.ts`
pure type-source swap removing the local `interface EnableResponse` + stale
"not yet re-exported" comment, `ai/reports/task-0116-implementer.md` NEW), zero
forbidden-zone hits, re-exported types confirmed live at
`packages/contracts/src/webhooks.ts:80,85` (source of truth). Quality gates:
@saas/sdk + @saas/cli typecheck 0, @saas/cli test 164/164 UNCHANGED (pure type
swap, zero behaviour change), both packages lint 0. Orun: validate ok, plan
`81a5caa8cc5d` = 2 components × 3 envs = 6 jobs (expected union, not overreach),
dry-run 6 selected green. PR-CI run 26710989224 = 7/7 SUCCESS. Post-merge
main-CI run 26711085547 at `c860053` = 7/7 SUCCESS (turbo-package, no deploy
lane / no live-URL surface). **0 behind main at merge — no update-branch needed,
the first non-BEHIND merge since the 0103-0115 streak.** `kiox.lock` Orun-run
mutation reverted. Reports: `ai/reports/task-0116-implementer.md`,
`ai/reports/task-0116-verifier.md`.

The **`@saas/sdk` webhook-endpoint type surface is now fully symmetric** —
Create/Get/List/Update/Enable/Disable/Delete/Rotate request + response types all
re-exported from the package index. The B5 endpoint-CRUD CLI + SDK arc is
complete; no consumer needs to locally reconstruct response shapes.

Repo health: green (modulo the one standing baseline test failure that Task 0117
fixes). Working tree clean. main HEAD `c860053`.

## Current task — 0117

**Stabilize-first: fix the baseline red `migrations.test.ts:66` failure by
syncing the test's local `VALID_CONTEXTS` array with the `BoundedContext`
union.**

- Prompt: `ai/tasks/task-0117.md`
- Agent: Implementer
- Branch: `impl/task-0117-migrations-test-notifications-context`
- Sealed snapshot main: `c860053` (Task 0116 squash).
- The failure: `tests/db/src/migrations.test.ts` hard-codes a local
  `VALID_CONTEXTS: BoundedContext[]` array (lines 52–62) listing 9 contexts, but
  the canonical `BoundedContext` union in `packages/db/src/types.ts:1-11` has 10
  — the 10th, `"notifications"`, is declared by a real migration
  (`packages/db/src/manifest.ts:116`, `context: "notifications"`). The
  `"each migration declares a valid bounded context"` assertion at
  `migrations.test.ts:66` therefore fails (`@saas/db-tests` jest = 1 failed /
  515 passed / 516 total). Reproduces on main; documented as a known baseline
  gap across Tasks 0113/0115 reports.
- PR boundary: 2 files exactly —
  `tests/db/src/migrations.test.ts` (MODIFIED: add `"notifications"` to
  `VALID_CONTEXTS` adjacent to `"metering"` to mirror the type-union ordering;
  NO other change, no new cases, no assertion edits),
  `ai/reports/task-0117-implementer.md` (NEW with real PR#, no TBD).
- Forbidden zones: `packages/db/src/types.ts` (already correct — source of
  truth, already includes `"notifications"`), `packages/db/src/manifest.ts` +
  all migration files, any other `tests/db/**` source,
  lockfiles/package.json/component.yaml.
- **Single-component turbo PR.** Orun changed-plan selects ONLY `db-tests`
  (subscribes `dev` · `quick-check` only) = 1 component × 1 env = 1 job + plan.
  Do NOT expect stage/prod lanes.
- Hard rules: test-only one-line literal add, exact string `"notifications"`
  byte-for-byte; no new eslint-disable/ts-ignore/as any; no deriving the array
  from the type; revert `kiox.lock`; real PR# (TBD = BLOCKED); BEHIND-main
  rebase remains verifier responsibility.
- Title: `fix(db-tests): add notifications to migration VALID_CONTEXTS`.

## Recommended next focus after 0117

1. **CLI helpers fold for `cross-reads.ts:resolveOrgId`** — single-arg
   no-override variant explicitly deferred from Task 0111 as "Remaining Gap";
   now-eligible one-line import swap + delete (≤ 5-file PR).
2. **Delivery-attempts UX** — next B5 leg per `specs/roadmap.md` if a richer
   console slice is preferred now that CLI endpoint-CRUD + SDK symmetry are
   fully closed.
3. **Node 20 → 24 CI actions bump** — non-blocking deprecation warning, but a
   hard cutover lands June 16 2026; a small infra/tooling PR de-risks it early.

Repo health: green (Task 0117 closes the last standing baseline test failure).
main HEAD `c860053`.
