# Task 0120 — Verifier

Agent: Verifier

## Current Repo Context

- Task 0120 implementer pass is **complete on PR #175** (HEAD
  `60776a01c1112839ce1724985b8e5ea72e0f8ab5`, branch
  `impl/task-0120-webhook-delivery-history`, base `main`, OPEN, MERGEABLE,
  mergeStateStatus CLEAN, 0 commits behind `origin/main`). Sealed snapshot
  main: `180a7ea` (Task 0120 orchestrator scope commit) → scope commit
  `652a060` (code) + `60776a0` (implementer report w/ real PR #175).
- Milestone `B5-webhook-delivery-history`: the per-endpoint delivery-history
  observability surface, shipped end to end across the **three consumer legs**
  in ONE combined PR. The delivery-attempts BACKEND (contracts + worker +
  api-edge facade) was already on main and is **consumed as-is** — NO
  contract/DB/worker/api-edge behaviour change is in scope or expected.
- Diff is 13 files (+1474/−30 across the diff; the implementer report is one of
  them). Three components + their tests + lockfile + harness plumbing:
  - **SDK** (`packages/sdk`): `src/webhooks.ts` (+87/−5 — `ListDeliveryAttemptsQuery`,
    `DeliveryAttemptsPage`, threaded `query` onto `listDeliveryAttempts`, new
    `listDeliveryAttemptsPage` reading `meta.cursor`, `buildDeliveryAttemptsRequest`
    helper), `src/index.ts` (+5/−1, two new type exports),
    `src/__tests__/resources.test.ts` (+69, 5 new tests).
  - **Console** (`apps/web-console-next`):
    `src/components/webhooks/delivery-history.ts` (NEW +160, dependency-free
    pure helper), `src/app/(app)/orgs/[orgSlug]/webhooks/[endpointId]/page.tsx`
    (+154, `DeliveryHistoryPanel`).
  - **CLI** (`packages/cli`): `src/commands/webhook-deliveries.ts` (NEW +229),
    `src/cli-runner.ts` (+3, register + help), `src/__tests__/webhook-deliveries.test.ts`
    (NEW +392, 14 tests).
  - **Test harness**: `tests/web-console-next/package.json` (+3),
    `tests/web-console-next/tsconfig.json` (+9/−2),
    `tests/web-console-next/src/delivery-history.test.ts` (NEW +172),
    `pnpm-lock.yaml` (+121/−22, single `@saas/contracts` link line).
  - `ai/reports/task-0120-implementer.md` (NEW +131).
- **Load-bearing architectural fact** the implementer threaded everywhere: the
  webhooks-worker emits its continuation cursor as an **opaque base64 token in
  `meta.cursor`** (envelope meta), NOT in body `nextCursor` (which the report
  calls vestigial). Every consumer reads the cursor from the envelope meta and
  forwards it verbatim — never constructs, never parses it. Verify this is
  actually what the code does (it is the one place a subtle bug could hide).
- Parked candidates you MUST NOT reach into: notifications-provider swap,
  `0085b` cloudflare-domain bump, notifications-worker dev reframe, optional
  spec-13 CLI commands. See `ai/deferred.md`.

## Objective

Verify PR #175 against Task 0120 (`ai/tasks/task-0120.md`) and the Verifier
Standard (`agents/orchestrator.md`). On PASS: rebase-if-behind, squash-merge,
sync local main, **wait for the post-merge main-CI deploy of web-console-next
(smoke + live-URL probe)**, then file the verifier report + Phase-8
bookkeeping. On FAIL: leave the PR open with documented blockers.

## PR Boundary (must match exactly — 13-file allowlist)

SDK: `packages/sdk/src/webhooks.ts`, `packages/sdk/src/index.ts`,
`packages/sdk/src/__tests__/resources.test.ts`.
Console: `apps/web-console-next/src/components/webhooks/delivery-history.ts`
(NEW), `apps/web-console-next/src/app/(app)/orgs/[orgSlug]/webhooks/[endpointId]/page.tsx`.
CLI: `packages/cli/src/commands/webhook-deliveries.ts` (NEW),
`packages/cli/src/cli-runner.ts`,
`packages/cli/src/__tests__/webhook-deliveries.test.ts` (NEW).
Harness: `tests/web-console-next/package.json`,
`tests/web-console-next/tsconfig.json`,
`tests/web-console-next/src/delivery-history.test.ts` (NEW),
`pnpm-lock.yaml`.
Report: `ai/reports/task-0120-implementer.md` (NEW).

No other file. Any file outside this list = FAIL.

## Read First

- `ai/tasks/task-0120.md` — original implementer scope, Architect Brief,
  Constraints, Non-Goals, Acceptance Criteria.
- `ai/reports/task-0120-implementer.md` — what shipped + the 5 latitude
  decisions (one combined PR; pure-helper Console extraction; CLI modelled on
  `audit list`; dropped optional single-`getDeliveryAttempt`; added
  `@saas/contracts` to the console test project).
- `packages/contracts/src/webhooks.ts:176-207` — the delivery-attempt types
  (source of truth — confirm they are CONSUMED/re-exported, never redefined).
- `packages/sdk/src/metering.ts` + `packages/sdk/src/transport.ts` — the
  established `buildQueryRecord` + `query` + `meta.cursor` pattern the SDK leg
  must mirror.
- `apps/webhooks-worker/src/http.ts` (`listResponse(data, requestId, cursor)`)
  + `src/pagination.ts` — confirm the cursor really is emitted in `meta.cursor`,
  so the SDK reading `meta.cursor ?? null` is correct.
- `packages/cli/src/commands/audit-list.ts` (or `cross-reads.ts` audit path) —
  the cursor-pagination CLI prior-art the new command claims to mirror.
- `agents/orchestrator.md` — Verifier Standard + Verifier Merge Protocol.
- `references/post-merge-deploy-profile-gap.md` (orun-saas skills) — the
  deploy-gated PASS gate for the web-console-next leg.

## Verification (phased)

**Phase 0 — Readiness.** Working tree clean on `main` at `180a7ea` (or later).
Implementer report present on the PR branch with real PR `#175` (no Phase-0
reconstruction fix-up needed — confirm). `gh pr view 175 --json
state,mergeable,mergeStateStatus` = OPEN / MERGEABLE / CLEAN.

**Phase 1 — PR sanity / boundary.** `gh pr view 175 --json files` = EXACTLY the
13 files in the allowlist above. `git diff origin/main...impl/task-0120-webhook-delivery-history
--stat` matches. No file outside the allowlist; no new top-level
package/app/discovery-root directory (so no missing `component.yaml` — all
three targets are existing components).

**Phase 2 — Hazard + forbidden-zone scan.** Across all production source in the
diff (not tests):
- ZERO new `eslint-disable` / `@ts-ignore` / `@ts-expect-error` / `as any` /
  `as unknown as` in production source (`packages/sdk/src/webhooks.ts`,
  `packages/sdk/src/index.ts`, `delivery-history.ts`, `page.tsx`,
  `webhook-deliveries.ts`, `cli-runner.ts`).
- Console talks to the backend ONLY via the SDK (`client.webhooks.*` + `wrap()`):
  ZERO direct `fetch(`, ZERO header-building, ZERO api-edge bypass in `page.tsx`
  or `delivery-history.ts`.
- CLI is a pure SDK consumer: ZERO `fetch(`, ZERO `node:*` crypto, ZERO auth
  header building in `webhook-deliveries.ts`; uses `resolveOrgId(ctx, /* allowOverride */ false)`
  and `assertOutputModeValid`.
- **Leak scan (Constraint / failure-mode):** grep the Console panel + helper
  AND the CLI command for `secret`, `whsec_`, `signingSecret`, `payload`,
  `rawBody`, `response.body`, `event.payload` — must render ONLY status,
  attempt number, `httpStatusCode`, safe `failureReason`, and the
  `nextRetryAt`/`completedAt` timestamps. NO secret, raw response body, or full
  event payload anywhere. A raw `failureReason`/HTTP-code string reaching the
  user with no designed treatment is a FAIL even if tests pass.
- **No overreach:** ZERO replay/redeliver action on any surface (no `replay`,
  `redeliver`, `retry` POST/action in any leg); ZERO new server-side query
  filter (the SDK/CLI may thread ONLY `limit`+`cursor` — no `status`,
  `eventType`, time-range params; the worker `parsePageParams` reads only
  `limit`+`cursor`). Confirm NO touch to `packages/contracts/**`,
  `apps/webhooks-worker/**`, `apps/api-edge/**`, `packages/db/**`, or any
  parked-candidate path.

**Phase 3 — Cursor-handling correctness (the load-bearing seam).** Read
`packages/sdk/src/webhooks.ts` and confirm: `listDeliveryAttempts` threads
`limit`/`cursor` through the transport `query` record (undefined params
omitted, per `buildDeliveryAttemptsRequest`); `listDeliveryAttemptsPage` reads
the continuation token from `meta.cursor ?? null` (NOT body `nextCursor`) and
returns it verbatim. Cross-check against `apps/webhooks-worker/src/http.ts`
`listResponse(...)` that the cursor really is emitted in envelope `meta.cursor`.
Confirm the CLI `--all` loop has a seen-cursor pagination-loop guard (no
infinite loop on a repeated cursor) and forwards the opaque cursor verbatim.

**Phase 4 — Quality gates (local, exact commands).**
- `pnpm install --frozen-lockfile` → clean (lockfile gained only the
  `@saas/contracts` link for `tests/web-console-next`).
- `pnpm --filter @saas/sdk typecheck` = 0, `lint` = 0 new warnings,
  `test` green (report claims 113 passing, +5 new).
- `pnpm --filter @saas/cli typecheck` = 0, `lint` = 0 new, `test` green
  (report claims 178 passing, +14 new in `webhook-deliveries.test.ts`).
- `pnpm --filter @saas/web-console-next typecheck` = 0, `lint` = 0 new.
- `pnpm --filter @saas/web-console-next-tests typecheck` = 0, `lint` = 0,
  `test` green (report claims 53 passing).

**Phase 5 — Orun local gates.**
- `kiox -- orun validate --intent intent.yaml` (or
  `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`) → valid.
- `kiox -- orun plan --changed --base origin/main --intent intent.yaml --output plan.json`
  → EXPECT `4 components × 3 envs → 10 jobs`, components
  `{cli, sdk, web-console-next, web-console-next-tests}`. Record verbatim.
- `kiox -- orun run --plan plan.json --dry-run --runner github-actions` → 10
  jobs preview; `web-console-next` lanes carry `Verify` (PR) and the
  `deploy` profile is reserved for `github-push-main`.
- Revert any `kiox.lock` mutation; do NOT commit `plan.json` (gitignored).

**Phase 6 — PR-CI log inspection (the real proof).** `gh pr checks 175` shows
11/11 SUCCESS (plan + cli×3 Verify + sdk×3 Verify + web-console-next×3 Verify
deploy + web-console-next-tests·dev·Verify). `gh run view 26713434492 --log`
(or current HEAD run) — confirm the actual job step output (NOT just the
summary): e.g. a `sdk·dev·Verify` step ran `orun run` (vitest, not a no-op);
a `cli·dev·Verify` ran the cli test step; a `web-console-next·*·Verify deploy`
lane ran its `Verify` step. If the PR is BEHIND main at merge time, the new
run on the rebased HEAD is the authority.

**Phase 6.5 — Merge (PASS only).** If all green: `gh pr merge 175 --squash
--delete-branch` (use `--admin` only if auto-merge is disabled and checks are
green). If BEHIND main, `gh pr update-branch 175` first and re-confirm PR-CI
green before merging (recurring 0103–0119 pattern — the implementer did NOT
pre-rebase; that is your responsibility).

**Phase 7 — Post-merge main-CI deploy gate (MANDATORY for the Console leg).**
`web-console-next` is a `cloudflare-pages-turbo` deploy-gated component: PR-CI
runs `Verify` only; the `deploy` + smoke step runs ONLY on the post-merge main
CI run. Per `references/post-merge-deploy-profile-gap.md` you MUST NOT call the
Console leg done off PR-CI alone.
- Watch the main-CI run at the squash SHA to completion.
- Confirm every lane SUCCESS, and that the `web-console-next·{stage,prod}·Verify
  deploy` smoke step exits 0 in the `gh run view <run-id> --log` output.
- **Live-URL probe:** `curl -sS -o /dev/null -w '%{http_code}'
  https://stage.sourceplane.ai/orgs` = 200, and `curl -s
  https://stage.sourceplane.ai/orgs/test/webhooks` returns HTTP 200 with
  `<title>Sourceplane Console</title>` and ZERO carry-forward placeholder
  strings. Note: the delivery-history panel lives on the dynamic endpoint
  detail route `/orgs/<slug>/webhooks/<endpointId>` which needs a live
  endpointId — if no seeded endpoint exists, confirm the webhooks list page
  serves 200 with the title and the deploy/smoke step is green; record that the
  panel route is dynamic and not directly curl-probeable without a seeded
  endpoint (the build + deploy + the green `web-console-next-tests` jest panel
  test are then the proof for the panel logic). Do not invent an endpointId.

**Phase 8 — Verifier report + bookkeeping.**
- Write `ai/reports/task-0120-verifier.md`: Result PASS|FAIL, Checks, Issues,
  CI Log Review, Live Resource Evidence (main-CI run id + smoke step + curl
  results), Secret Handling Review, Spec Proposals (none expected — replay is a
  separate future proposal, not this milestone), Risk Notes, Recommended Next
  Move.
- On PASS, on main: update `ai/state.json` (add `0120` to `completed`, advance
  `current_task` to the next selected task, refresh `notes` + `last_verified`),
  `ai/context/current.md`, `ai/context/task-ledger.md` (append/mark Task 0120
  verified + merged). Commit + push on main.
- On FAIL: PR comment + report on the PR branch, no merge, document blockers.

## Acceptance Criteria

✅ PR #175 maps EXACTLY to Task 0120 (13-file allowlist; no overreach file)
✅ NO replay/redeliver action; NO new server-side query filter (limit+cursor only);
   NO contract/db/worker/api-edge behaviour change
✅ NO secret / raw response body / full event payload rendered on any surface;
   Console renders only status + attempt metadata + safe `failureReason` + timestamps
✅ SDK threads `limit`/`cursor` and reads the continuation token from
   `meta.cursor` verbatim (round-trip proven by the new unit tests)
✅ Console talks to backend ONLY via SDK + `wrap()` (zero `fetch(`); CLI is a
   pure SDK consumer (zero `fetch(`, zero `node:*`); zero new hazard suppressions
✅ All quality gates green (sdk/cli/web-console-next/web-console-next-tests
   typecheck 0, lint 0 new, tests green at the claimed counts)
✅ Orun validate ok; `plan --changed` = 4 components × 3 envs → 10 jobs
   {cli, sdk, web-console-next, web-console-next-tests}; run --dry-run green
✅ PR-CI 11/11 SUCCESS confirmed via `gh run view --log` (not just the summary)
✅ Post-merge main-CI green; `web-console-next` deploy + smoke step exits 0;
   live `https://stage.sourceplane.ai/orgs` + `/orgs/test/webhooks` = 200 with
   `<title>Sourceplane Console</title>` (deploy-gated PASS gate satisfied)
✅ MergeStateStatus CLEAN at merge; no `kiox.lock`/`plan.json` drift on branch
✅ If any check fails → Result: FAIL, PR stays open with clear blockers

## PR Creation Requirement

The Implementer has already created PR #175. Your job is to verify it, and on
PASS merge it (rebasing if behind), wait for the post-merge main-CI deploy
gate, and commit the Phase-8 bookkeeping on main.

## When Done Report

`ai/reports/task-0120-verifier.md` — Result, Checks, Issues, CI Log Review,
Live Resource Evidence, Secret Handling Review, Spec Proposals, Risk Notes,
Recommended Next Move.
