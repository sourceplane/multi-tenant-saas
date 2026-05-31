# Task 0105 — Verifier Prompt

You are the **Verifier** for Task 0105 in the Orun multi-tenant SaaS
monorepo at `/Users/irinelinson/sourceplane/multi-tenant-saas`.

> Load skill `orun-saas-verifier` before starting. It documents the
> verifier workflow for this repo (8-phase shape, evidence
> requirements, post-merge deploy-profile-gap protocol, bookkeeping
> commit format).

## Sealed inputs (do NOT re-derive)

| Field | Value |
|---|---|
| **PR** | `#160` |
| **PR URL** | https://github.com/sourceplane/multi-tenant-saas/pull/160 |
| **Branch** | `impl/task-0105-webhook-verifier` |
| **Implementer impl commit** | `3279119` |
| **Implementer report commit** | `d6bd7dc` |
| **PR HEAD SHA at hand-off** | `d6bd7dc6f82e095cd6bc14c195cc11708b098f1a` |
| **Base** | `main` (sealed snapshot referenced by prompt: `f01d61f`; orchestrator dispatch commit: `eb40bbb`) |
| **Implementer report** | `ai/reports/task-0105-implementer.md` (committed on PR branch as `d6bd7dc`) |
| **Implementer prompt** | `ai/tasks/task-0105.md` |
| **Implementer-reported PR-CI** | run `26701508678` (impl commit `3279119`) — 4/4 SUCCESS (plan + webhook-verifier · {dev,stage,prod} · Verify) |
| **Re-triggered PR-CI on report commit** | run `26701550634` (impl commit `d6bd7dc`) — was `in_progress` at hand-off; **must finish 4/4 SUCCESS before merge** |
| **Diff size at hand-off** | 10 files, +837 / -8 |
| **Mergeable state at hand-off** | `MERGEABLE` / clean |

## Objective

Verify the new `@saas/webhook-verifier` workspace package shipped on
PR #160 is correct, safe, and ready to merge. The package is a pure
**consumer-side helper** for third parties to verify the HMAC-SHA256
signatures Sourceplane attaches to outbound webhook deliveries
(scheme: `apps/webhooks-worker/src/delivery.ts:45-61`). Zero
runtime deps, WebCrypto only, mirrors `@saas/notifications-client`
packaging shape. **No backend, contract, SDK, CLI, console, or
tooling edits in scope.**

## Phase 0 — Working directory

- `cd /Users/irinelinson/sourceplane/multi-tenant-saas`
- `git fetch origin --prune`
- `git checkout main && git pull --ff-only`
- Confirm `git rev-parse HEAD` ≥ `eb40bbb` (orchestrator dispatch
  commit). If `main` has advanced past `eb40bbb`, that is fine — but
  note new commits in the report.
- `git fetch origin pull/160/head:pr-160-verify` and
  `git checkout pr-160-verify`. Record the resolved HEAD SHA.

## Phase 1 — PR sanity

- `gh pr view 160 --json number,state,mergeable,mergeStateStatus,headRefName,headRefOid,baseRefName,additions,deletions,changedFiles,isDraft -q '.'`
  → must be `OPEN`, `MERGEABLE`, not draft, base `main`, head
  `impl/task-0105-webhook-verifier`. Record the HEAD SHA.
- `gh pr diff 160 --name-only | sort` → record the file list.
  Expected (≤11 paths):
  ```
  ai/reports/task-0105-implementer.md
  packages/webhook-verifier/README.md
  packages/webhook-verifier/component.yaml
  packages/webhook-verifier/eslint.config.js
  packages/webhook-verifier/package.json
  packages/webhook-verifier/src/__tests__/verify.test.ts
  packages/webhook-verifier/src/index.ts
  packages/webhook-verifier/tsconfig.build.json
  packages/webhook-verifier/tsconfig.json
  pnpm-lock.yaml
  ```
- **FAIL if any path matches** any of:
  `apps/webhooks-worker/`, `packages/sdk/`, `packages/cli/`,
  `packages/contracts/`, `apps/web-console-next/`, `tooling/`,
  `tests/api-edge/`, `kiox.lock`,
  `apps/identity-worker/`, `apps/notifications-worker/`, `infra/`.
- Confirm `git log origin/main..pr-160-verify --oneline` is exactly
  two commits (impl `3279119` + report `d6bd7dc`) — or if the
  implementer fix-up consolidated, ≤3 commits all authored as part
  of the task. Reject if the branch contains unrelated drift
  (e.g. a bumped `kiox.lock`).

## Phase 2 — Hazard + boundary scan

Run from PR branch checkout. **All must be exit-1 (no matches).**

- `git grep -nE 'eslint-disable|@ts-ignore|@ts-expect-error|as unknown as|as any' -- 'packages/webhook-verifier/**'`
  → zero hits.
- `git grep -nE "from ['\"]node:" -- 'packages/webhook-verifier/**'`
  → zero hits (WebCrypto only — no `node:crypto`, `node:buffer`, etc.).
- `git grep -nE "require\\(['\"]node:" -- 'packages/webhook-verifier/**'`
  → zero hits.
- `git grep -nE "from ['\"](crypto|buffer|util)['\"]" -- 'packages/webhook-verifier/**'`
  → zero hits (no bare-name node builtin imports either).
- Verify `packages/webhook-verifier/package.json`:
  - `"name": "@saas/webhook-verifier"`, `"private": true`,
    `"type": "module"`, valid `"exports"` map.
  - `"dependencies"` is **absent or `{}`** — zero runtime deps.
  - `"devDependencies"` may include vitest, typescript, eslint, etc.
  - Has `build`, `typecheck`, `lint`, `test` scripts at minimum.
- Verify `packages/webhook-verifier/component.yaml` exists and is
  structurally similar to `packages/notifications-client/component.yaml`
  (`type: turbo-package`, `domain: starter-shared`, all three envs
  configured for `quick-check`). Run
  `diff <(yq '.type,.domain,(.environments|keys)' packages/notifications-client/component.yaml) <(yq '.type,.domain,(.environments|keys)' packages/webhook-verifier/component.yaml)`
  to confirm shape parity.
- Inspect `packages/webhook-verifier/src/index.ts`. Required:
  - `verifyWebhookSignature` async function, returning a tagged
    result `{ ok: true } | { ok: false, reason: <enum> }`.
  - Constant-time HMAC byte comparison — no early `return false`
    inside the comparison loop. Look for an XOR accumulator or
    explicit comment marking the constant-time pattern. **FAIL** if
    you see `if (a[i] !== b[i]) return false;` or equivalent.
  - Case-insensitive header lookup helper that handles both
    `Record<string, string|string[]|undefined>` and `Headers`.
  - `signWebhookPayload` async helper using `crypto.subtle`.
  - Header constants exported (`X-Webhook-Signature`,
    `X-Webhook-Timestamp`, `sha256=` prefix,
    `DEFAULT_TOLERANCE_SECONDS = 300`).
- Inspect `packages/webhook-verifier/src/__tests__/verify.test.ts`:
  - At least 18 `it(...)` / `test(...)` cases.
  - One byte-identity reciprocity case that constructs a signature
    using the exact algorithm shape from
    `apps/webhooks-worker/src/delivery.ts:45-61`
    (`encoder.encode(\`${timestamp}.${body}\`)` →
    `crypto.subtle.sign('HMAC', key, message)` → hex →
    `sha256=${hex}`) and asserts `verifyWebhookSignature` accepts it.
    The fixture must NOT cross-import from `apps/webhooks-worker/**`;
    it must duplicate the algorithm inside the test file (or in a
    `tests/fixtures/` peer file under `packages/webhook-verifier/`).
  - At minimum these reason codes covered:
    `missing_signature_header` /
    `missing_timestamp_header` /
    `malformed_signature` /
    `malformed_timestamp` (if implemented) /
    `timestamp_out_of_tolerance` /
    `signature_mismatch`.

## Phase 3 — Quality gates

Run from PR branch checkout. Capture exit codes and the relevant
tail lines into the report.

1. `pnpm install --frozen-lockfile` → exit 0. If this fails because
   the implementer needed a lockfile bump, allow non-frozen install
   and confirm the lockfile delta is limited to the new workspace
   (no version bumps to existing packages). Reject anything that
   touches `kiox.lock`.
2. `pnpm -r typecheck` → exit 0. Capture the workspace count from
   the Turbo summary; it must be exactly **+1** vs main
   (i.e. 39 if main was 38).
3. `pnpm -r --no-bail lint` → ≤ 45 warnings, **all** in
   `tests/api-edge/**` (zero new warnings under
   `packages/webhook-verifier/**`). Verify with
   `pnpm -r --no-bail lint 2>&1 | grep -E '^/.+: warning' | grep -v 'tests/api-edge/'`
   returning empty.
4. `pnpm --filter @saas/webhook-verifier build` → exit 0.
5. `pnpm --filter @saas/webhook-verifier test` → exit 0; ≥ 18
   passing cases (implementer reported 22). Capture the vitest
   summary line.
6. Tolerated pre-existing failure (verify it reproduces on main, do
   NOT block on it): `tests/db/migrations.test.ts`. If a different
   test file fails, treat as a real failure and FAIL the task.

## Phase 4 — Orun gates

From PR branch checkout, run via `kiox` (do NOT install or invoke
`orun` directly):

- `kiox -- orun validate` → exit 0.
- `kiox -- orun plan --changed` → exit 0; plan must select
  **exactly 3** lanes, all under `webhook-verifier`
  (`webhook-verifier·dev·Verify`, `webhook-verifier·stage·Verify`,
  `webhook-verifier·prod·Verify`) and all `quick-check`. **FAIL** if
  the plan pulls in unrelated lanes (means `component.yaml` is
  mis-scoped) or if any lane is `deploy` (helper packages must not
  expose deploy lanes).
- `kiox -- orun run --dry-run` → exit 0.
- Capture the plan output to the report.

## Phase 5 — PR-CI inspection

- `gh pr view 160 --json statusCheckRollup -q .statusCheckRollup` →
  must be 4/4 SUCCESS at the **current PR HEAD SHA**. Run id may be
  `26701550634` (already triggered by the report commit) or a newer
  re-run.
- `gh run view <run-id> --log` (NOT just `--log-failed` and NOT just
  the summary) and grep for actual lane completion lines:
  - `plan` job exit 0.
  - Each of the three `webhook-verifier · {env} · Verify` jobs
    completes the `kiox -- orun run --dry-run` step with exit 0
    and shows the expected lane.
- If the latest CI run is on the impl commit only and the report
  commit is HEAD, push a no-op refresh OR confirm the report-commit
  CI run also went 4/4 green. **Do NOT merge until the HEAD SHA's
  CI is green.**
- Record run id, conclusion, and wall-clock per lane.

## Phase 6 — Squash merge + post-merge watch

**Pre-merge gate:** Phases 1-5 all GREEN, PR HEAD CI 4/4 SUCCESS.

- `gh pr merge 160 --squash --delete-branch` → success. Record the
  squash SHA on `main`.
- If `gh pr update-branch 160` is required first because main moved,
  do that, re-watch CI to 4/4, then merge. Note any rebase in the
  report.
- After merge, watch main-CI:
  `gh run watch <main-ci-run-id>` (find via
  `gh run list --branch main --limit 5 --json databaseId,headSha,name,status,conclusion`).
- **Post-merge expectation:** `webhook-verifier` is a
  `turbo-package`, so its main-CI lanes are
  `webhook-verifier · {dev,stage,prod} · Verify` — **no deploy
  profile**. Unlike app components, there is nothing to smoke-test
  on a live URL. Confirm the lanes still run `quick-check`
  (`pnpm --filter @saas/webhook-verifier build / typecheck / test /
  lint`) on main.
- Main-CI must be **4/4 SUCCESS**. Record run id, conclusion,
  wall-clock per lane.
- If main-CI fails post-merge: do NOT revert blindly. Open an
  immediate revert PR if the failure is regression-confirmed; if
  flaky, re-run once and document.

## Phase 7 — Verifier report

Write `ai/reports/task-0105-verifier.md`. Required sections:

1. Outcome (PASS / FAIL).
2. Sealed inputs echo (PR, SHAs, branch).
3. Per-phase evidence with command outputs, exit codes, file lists,
   greps, run ids, lane wall-clocks. Quote tail lines from
   `pnpm -r typecheck`, `pnpm -r lint`, vitest, and `orun plan`.
4. Hazard scan output (the actual grep commands and their exit
   codes).
5. PR-CI run id + 4/4 SUCCESS confirmation via `gh run view --log`.
6. Squash SHA on main + main-CI run id + 3-lane wall-clocks.
7. Any caveats (e.g. lockfile delta, tolerated pre-existing failures).
8. Recommended-next.

## Phase 8 — Bookkeeping commit

After Phase 7 PASS, on `main`:

- Update `ai/state.json`:
  - Append `"0105"` to `completed`.
  - Set `current_task` to `null` (or to the next task id once
    orchestrator schedules it).
  - Refresh `last_verified` timestamp (UTC, ISO-8601).
  - Set `next_focus` per orchestrator's recommended-next at hand-off.
  - Prepend a `notes[0]` entry summarizing PASS+MERGE (squash SHA,
    main-CI run id, package size, key gate results).
- Append `## Task 0105` block to `ai/context/task-ledger.md` with
  the durable outcome.
- Refresh `ai/context/current.md` with the post-0105 checkpoint and
  the new "Next Task" framing.
- `git add ai/ && git commit -m "ai: Task 0105 verifier PASS — @saas/webhook-verifier helper merged"`
  and `git push origin main`.

If Phase 7 is FAIL: do NOT merge. Push a PR-branch commit containing
`ai/reports/task-0105-verifier.md` with the FAIL evidence; leave a
`gh pr comment 160` with the FAIL summary; do NOT touch state.json
or task-ledger.md beyond appending a brief failure note.

## Hard rules (verifier-side)

- Trust code reality over the implementer report. The report is a
  hypothesis; phases 2-5 prove or refute it.
- **Do NOT merge** until the PR HEAD SHA's CI run is 4/4 SUCCESS
  (re-trigger CI by an empty commit if the report commit didn't
  re-run the verify lanes).
- **Do NOT touch** any path outside `packages/webhook-verifier/**`,
  `pnpm-lock.yaml`, `ai/**` from the PR branch. If you discover
  something needing to change elsewhere, open a follow-up issue, do
  not mutate the PR.
- If lockfile delta touches existing pinned versions (anything
  beyond adding the new workspace), FAIL.
- `kiox.lock` working-tree drift (v2.3.0→v2.9.0) is unrelated and
  must remain untouched on `main`. Do not stage it.
- Real PR + run ids in the report (`TBD` is a FAIL).

## Recommended-next on PASS

After Task 0105 PASS+MERGE, candidates in priority order:

- **B5 follow-ups** — `webhook secrets rotate` UX, replay UI,
  failure-budget alerts. The helper unblocks none of these directly,
  but the cluster is now in motion.
- **B7 — Audit-log UX** (events-worker read API surfaces are live;
  console UI is the gap).
- **B8 — admin-worker scaffold** (spec 16 has no app yet).

Pick whichever has the lowest spec drift / highest leverage at the
time of the next orchestrator pass.
