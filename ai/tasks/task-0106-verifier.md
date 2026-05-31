# Task 0106 — Verifier Prompt

You are the **Verifier** for Task 0106 in the Orun multi-tenant SaaS
monorepo at `/Users/irinelinson/sourceplane/multi-tenant-saas`.

> Load skill `orun-saas-verifier` before starting. It documents the
> verifier workflow for this repo (8-phase shape, evidence
> requirements, post-merge deploy-profile-gap protocol, bookkeeping
> commit format).

## Sealed inputs (do NOT re-derive)

| Field | Value |
|---|---|
| **PR** | `#161` |
| **PR URL** | https://github.com/sourceplane/multi-tenant-saas/pull/161 |
| **Branch** | `impl/task-0106-cli-webhook-verify` |
| **Implementer impl commit** | `a39c0d6` |
| **Implementer report commit** | NONE — implementer did NOT commit `ai/reports/task-0106-implementer.md` to the PR branch. **Phase 0 fix-up: commit the report file on the PR branch BEFORE merge** (recurring gap, see `orun-saas-implementer` skill: "Implementer report not committed to PR"). |
| **PR HEAD SHA at hand-off** | `a39c0d6a8b5c4d55dee44a1d5700ad3593f44715` |
| **Base** | `main` (orchestrator scope commit `f614fb1`; sealed snapshot main referenced by impl prompt: `b619e9d`, Task 0105 verifier-PASS bookkeeping) |
| **Implementer report (expected path)** | `ai/reports/task-0106-implementer.md` (NOT YET ON PR BRANCH — see Phase 0) |
| **Implementer prompt** | `ai/tasks/task-0106.md` |
| **PR-CI at hand-off** | run `26702180473` — 4/4 SUCCESS at HEAD `a39c0d6` (`plan` + `cli · {dev,stage,prod} · Verify`). Confirmed via `gh pr view 161 --json statusCheckRollup`. |
| **Diff size at hand-off** | 5 files, +710 / -3 |
| **Mergeable state at hand-off** | `MERGEABLE` / `CLEAN` |

## Objective

Verify the new `sourceplane webhook verify` CLI subcommand shipped on
PR #161 is correct, safe, and ready to merge. The command is a pure
local-crypto consumer of `@saas/webhook-verifier` (Task 0105 / squash
`a1436fc`). **No backend, contract, SDK, console, infra, helper, or
api-edge edits in scope.** This task dogfoods the helper inside the
monorepo — the verifier's job is to confirm the wiring is honest
(no `Sourceplane`, no `fetch`, no `/v1/`, no `node:*`, no
hazard-suppression markers, binary-safe body reading, exit-code
contract preserved).

## Phase 0 — Working directory + missing-report fix-up

- `cd /Users/irinelinson/sourceplane/multi-tenant-saas`
- `git fetch origin --prune`
- `git checkout main && git pull --ff-only`
- Confirm `git rev-parse HEAD` ≥ `f614fb1` (orchestrator scope commit).
  Latest local HEAD on main is `f614fb1` (Task 0106 scope) at hand-off.
- `git fetch origin pull/161/head:pr-161-verify` and
  `git checkout pr-161-verify`. Record the resolved HEAD SHA. It
  must be `a39c0d6a8b5c4d55dee44a1d5700ad3593f44715` unless the
  implementer pushed a follow-up commit.
- **Implementer report fix-up (mandatory):** the impl branch does
  NOT include `ai/reports/task-0106-implementer.md`. The PR body
  contains the equivalent narrative; reconstruct a proper
  implementer report from PR #161's body + the diff and commit it
  to the PR branch:
  - Path: `ai/reports/task-0106-implementer.md`
  - Required sections (per orchestrator standard): Summary, Files
    Changed, Checks Run, Assumptions, Spec Proposals, Remaining
    Gaps, Next Task Dependencies, **PR Number** (= `161`).
  - Include the e2e smoke transcripts (human + json) that the
    impl prompt required — pull them from PR body if present, or
    re-run them yourself against the built CLI and paste both
    transcripts.
  - Commit on `pr-161-verify`: `git add ai/reports/task-0106-implementer.md && git commit -m "ai: Task 0106 implementer report (verifier fix-up)"` then `git push origin pr-161-verify:impl/task-0106-cli-webhook-verify`.
  - This will trigger a fresh PR-CI run on the new HEAD. Wait for
    that run to go 4/4 SUCCESS via `gh run view <run-id> --log`
    (NOT just summary) before proceeding to merge in Phase 6.

## Phase 1 — PR sanity

- `gh pr view 161 --json number,state,mergeable,mergeStateStatus,headRefName,headRefOid,baseRefName,additions,deletions,changedFiles,isDraft -q '.'`
  → must be `OPEN`, `MERGEABLE`, not draft, base `main`, head
  `impl/task-0106-cli-webhook-verify`. Record the HEAD SHA after the
  Phase 0 fix-up commit.
- `gh pr diff 161 --name-only | sort` → record the file list.
  Expected after Phase 0 fix-up (≤ 6 paths):
  ```
  ai/reports/task-0106-implementer.md
  packages/cli/package.json
  packages/cli/src/__tests__/webhook-verify.test.ts
  packages/cli/src/cli-runner.ts
  packages/cli/src/commands/webhook-verify.ts
  pnpm-lock.yaml
  ```
- **FAIL if any path matches** any of:
  `apps/**`, `packages/sdk/**`, `packages/contracts/**`,
  `packages/webhook-verifier/**`, `apps/web-console-next/**`,
  `tooling/**`, `tests/api-edge/**`, `kiox.lock`, `infra/**`,
  any other `packages/*` outside `packages/cli/`.
- Confirm `git log origin/main..pr-161-verify --oneline` is exactly
  the impl commit (`a39c0d6`) plus the Phase 0 fix-up report commit
  (≤ 3 commits total). Reject unrelated drift (e.g. a bumped
  `kiox.lock` or any edit under `packages/webhook-verifier/**`).

## Phase 2 — Hazard + boundary scan

Run from PR-branch checkout. **All must be exit-1 (no matches).**

- `git grep -nE 'eslint-disable|@ts-ignore|@ts-expect-error|as unknown as|as any' -- 'packages/cli/src/commands/webhook-verify.ts' 'packages/cli/src/__tests__/webhook-verify.test.ts' 'packages/cli/src/cli-runner.ts'`
  → zero hits.
- `git grep -nE "from ['\"]node:" -- 'packages/cli/src/commands/webhook-verify.ts' 'packages/cli/src/__tests__/webhook-verify.test.ts'`
  → zero hits (no `node:crypto`, `node:buffer`, no Node-only imports
  in the new code paths).
- `git grep -nE "require\\(['\"]node:" -- 'packages/cli/src/commands/webhook-verify.ts' 'packages/cli/src/__tests__/webhook-verify.test.ts'`
  → zero hits.
- `git grep -nE "from ['\"](crypto|buffer|util)['\"]" -- 'packages/cli/src/commands/webhook-verify.ts' 'packages/cli/src/__tests__/webhook-verify.test.ts'`
  → zero hits (no bare-name node-builtin imports).
- `git grep -nE "Sourceplane|client\\.|fetch\\(|/v1/" -- 'packages/cli/src/commands/webhook-verify.ts'`
  → zero hits. The command must NOT touch the SDK, network, or any
  `/v1/` route. Local crypto only.
- Confirm `packages/cli/package.json` adds exactly one new edge:
  `"@saas/webhook-verifier": "workspace:*"`. No other dep version
  bumps. Run
  `git diff origin/main..pr-161-verify -- packages/cli/package.json`
  and inspect.
- Confirm `pnpm-lock.yaml` delta is limited to the new workspace
  edge under `packages/cli`. Run
  `git diff origin/main..pr-161-verify -- pnpm-lock.yaml | head -120`
  and verify there are no version bumps to existing pinned packages.
  **FAIL** if `kiox.lock` is part of the diff.
- Inspect `packages/cli/src/commands/webhook-verify.ts`. Required:
  - Imports `verifyWebhookSignature` (and the reason-code / header
    constants as needed) from `@saas/webhook-verifier`.
  - Reads `--secret`, `--signature`, `--timestamp` as required
    flags; missing ones throw `UsageError` (from
    `packages/cli/src/errors.ts`) → exit 2 via `formatCliError`.
  - Reads `--body=PATH` as optional; if omitted, drains STDIN to
    EOF as a binary stream. `--body` + readable STDIN both →
    `UsageError`.
  - Body bytes are passed to the helper without `.trim()`,
    `JSON.parse`, or decode-then-re-encode. **FAIL** on any
    `.trim()` / `JSON.parse` against the body input.
  - `--tolerance-seconds=N` parsed as non-negative integer; bad
    input → `UsageError`.
  - `--output=human|json` controls the success/failure shape:
    * human success: `ok: true` (single trailing newline). Exit 0.
    * human failure: `ok: false\nreason: <code>`. Exit 4.
    * json success: `{"ok":true}`. Exit 0.
    * json failure: `{"ok":false,"reason":"<code>"}`. Exit 4.
  - All output goes to **stdout** (not stderr). Exit code carries
    the signal.
- Inspect `packages/cli/src/cli-runner.ts` diff: registration entry
  for `["webhook", "verify"]` must mirror the existing
  `["webhook", "create"]` pattern. Help-block text must list the
  new subcommand alongside `webhook create`. Confirm no unrelated
  edits leaked in (e.g. no rewrites of other command registrations).
- Inspect `packages/cli/src/__tests__/webhook-verify.test.ts`:
  - At least 12 `it(...)` cases (impl prompt requires ≥ 12; PR
    body claims 16).
  - Coverage shapes (verify each is present):
    * happy-path human mode (sign with helper → command exits 0,
      prints `ok: true`).
    * happy-path json mode → `{"ok":true}` + exit 0.
    * each of `--secret`, `--signature`, `--timestamp` missing →
      `UsageError` exit 2.
    * tampered body → exit 4 with `reason: signature_mismatch`.
    * tampered signature → exit 4.
    * timestamp older than `--tolerance-seconds` → exit 4
      `reason: timestamp_out_of_tolerance`.
    * `--tolerance-seconds=0` boundary case.
    * `--body=PATH` reads file bytes (binary-safe).
    * STDIN read path (synthetic stdin iterable).
    * `--body` + STDIN both readable → `UsageError` exit 2.
    * JSON-mode failure shape.
    * Reason-code passthrough verbatim (test against the helper's
      reason enum).

## Phase 3 — Quality gates

Run from PR-branch checkout. Capture exit codes and the relevant
tail lines into the report.

1. `pnpm install --frozen-lockfile` → exit 0. If this fails because
   the workspace edge bumped the lockfile shape, allow non-frozen
   install and confirm the lockfile delta is limited to the new
   `@saas/webhook-verifier` workspace edge under `packages/cli`. No
   version bumps to existing pinned packages. Reject anything that
   touches `kiox.lock`.
2. `pnpm -r typecheck` → exit 0. The workspace count from the Turbo
   summary must remain **39** (Task 0105 already added the +1 for
   `@saas/webhook-verifier`). If the count drifts, investigate.
3. `pnpm -r --no-bail lint` → ≤ 45 warnings, **all** in
   `tests/api-edge/**`. Verify with
   `pnpm -r --no-bail lint 2>&1 | grep -E '^/.+: warning' | grep -v 'tests/api-edge/'`
   returning empty. **FAIL** if any new warning appears under
   `packages/cli/**` or `packages/webhook-verifier/**`.
4. `pnpm --filter @saas/cli build` → exit 0.
5. `pnpm --filter @saas/cli test` → exit 0; capture vitest summary.
   Pre-existing CLI tests still pass; new `webhook-verify.test.ts`
   has ≥ 12 passing cases (PR body claims 8/8 files, 111/111 cases
   with 16 new — confirm).
6. **Local e2e smoke (mandatory regardless of report content):**
   from a clean shell, sign a known body via the helper's
   `signWebhookPayload` and pipe the body into the built CLI:
   - human mode: `ok: true` + exit 0.
   - json mode: `{"ok":true}` + exit 0.
   - tampered-body case: exit 4 + `reason: signature_mismatch`.
   - Paste the three transcripts into the verifier report.
7. Tolerated pre-existing failure (verify it reproduces on main, do
   NOT block on it): `tests/db/migrations.test.ts`. If a different
   test file fails, treat as a real failure and FAIL the task.

## Phase 4 — Orun gates

From PR-branch checkout, run via `kiox` (do NOT install or invoke
`orun` directly):

- `kiox -- orun validate` → exit 0.
- `kiox -- orun plan --changed` → exit 0; plan must select
  **exactly the cli component's lanes** (`cli·{dev,stage,prod}·Verify`).
  **FAIL** if the plan pulls in unrelated lanes (means the diff
  accidentally trespassed into another component's `spec.path`) or
  if any lane is `deploy` (CLI is a `turbo-package`-shaped lane).
- `kiox -- orun run --dry-run` → exit 0. Capture the simulated job
  count.
- Capture the plan output to the report.

## Phase 5 — PR-CI inspection

- After the Phase 0 fix-up commit, the PR HEAD will have changed.
  Re-poll: `gh pr view 161 --json statusCheckRollup -q .statusCheckRollup`
  → must be 4/4 SUCCESS at the **current PR HEAD SHA** (not the
  hand-off HEAD `a39c0d6`).
- `gh run view <run-id> --log` (NOT `--log-failed`, NOT just the
  summary) and grep for actual lane completion lines:
  - `plan` job exit 0.
  - Each of the three `cli · {env} · Verify` jobs completes the
    `kiox -- orun run --dry-run` step with exit 0 and shows the
    expected lane.
- Record run id, conclusion, and per-lane wall-clock.
- Hand-off PR-CI run `26702180473` (HEAD `a39c0d6`) was 4/4 SUCCESS
  per `gh pr view 161` at scope time — but that was on the impl
  commit only. Do NOT merge based on that run; the report-commit
  CI run is the merge gate.

## Phase 6 — Squash merge + post-merge watch

**Pre-merge gate:** Phases 0–5 all GREEN; PR HEAD CI 4/4 SUCCESS at
the post-fix-up HEAD SHA.

- If `gh pr view 161 --json mergeStateStatus -q .mergeStateStatus`
  reports `BEHIND` after the fix-up, run
  `gh pr update-branch 161` first, then re-watch CI to 4/4 SUCCESS,
  then merge.
- `gh pr merge 161 --squash --delete-branch` → success. Record the
  squash SHA on `main`. If standard merge is blocked by branch
  protection due to required-check ordering, `--admin` is
  acceptable but record the reason.
- After merge, watch main-CI:
  `gh run watch <main-ci-run-id>` (find via
  `gh run list --branch main --limit 5 --json databaseId,headSha,name,status,conclusion`).
- **Post-merge expectation:** `cli` is a `turbo-package`, so its
  main-CI lanes are `cli · {dev,stage,prod} · Verify` — **no deploy
  profile**. Confirm the lanes still run `quick-check`
  (`pnpm --filter @saas/cli build / typecheck / test / lint`) on
  main. Plan-job + 3 verify lanes = **4/4 SUCCESS** expected.
- Record run id, conclusion, wall-clock per lane.
- If main-CI fails post-merge: do NOT revert blindly. Open an
  immediate revert PR if the failure is regression-confirmed; if
  flaky, re-run once and document.

## Phase 7 — Verifier report

Write `ai/reports/task-0106-verifier.md`. Required sections:

1. Outcome (PASS / FAIL).
2. Sealed inputs echo (PR, SHAs, branch, hand-off + post-fix-up
   HEAD).
3. Per-phase evidence with command outputs, exit codes, file lists,
   greps, run ids, lane wall-clocks. Quote tail lines from
   `pnpm -r typecheck`, `pnpm -r lint`, vitest, and `orun plan`.
4. Hazard scan output (the actual grep commands and their exit
   codes).
5. PR-CI run id + 4/4 SUCCESS confirmation via `gh run view --log`
   on the **post-fix-up HEAD SHA**.
6. Squash SHA on main + main-CI run id + 4-lane wall-clocks.
7. The three e2e smoke transcripts (human / json / tampered).
8. Phase 0 fix-up note (implementer report committed by verifier;
   commit SHA on PR branch).
9. Any caveats (e.g. lockfile delta, tolerated pre-existing
   failures).
10. Recommended-next.

## Phase 8 — Bookkeeping commit

After Phase 7 PASS, on `main`:

- Update `ai/state.json`:
  - Append `"0106"` to `completed`.
  - Set `current_task` to the next scoped task id once orchestrator
    schedules it, or leave it as the last verifier path until the
    next orchestrator pass.
  - Refresh `last_verified` timestamp (UTC, ISO-8601).
  - Set `next_focus` per the recommended-next at hand-off (B5
    follow-up cluster, B7 audit-log UX, or B8 admin-worker
    scaffold — whichever the orchestrator's next pass selects).
  - Prepend a `notes[0]` entry summarizing PASS+MERGE (squash SHA,
    main-CI run id, key gate results, e2e smoke confirmation).
- Append `## Task 0106` block to `ai/context/task-ledger.md` with
  the durable outcome.
- Refresh `ai/context/current.md` with the post-0106 checkpoint and
  the new "Next Task" framing.
- `git add ai/ && git commit -m "ai: Task 0106 verifier PASS — sourceplane webhook verify CLI subcommand merged"`
  and `git push origin main`.

If Phase 7 is FAIL: do NOT merge. Push a PR-branch commit containing
`ai/reports/task-0106-verifier.md` with the FAIL evidence; leave a
`gh pr comment 161` with the FAIL summary; do NOT touch state.json
or task-ledger.md beyond appending a brief failure note.

## Hard rules (verifier-side)

- Trust code reality over the implementer report (and over the
  implementer PR body, which is the only narrative artifact at
  hand-off). Phases 2–5 prove or refute it.
- **Do NOT merge** until the PR HEAD SHA's CI run is 4/4 SUCCESS
  on the post-fix-up HEAD (re-trigger CI if needed by pushing the
  Phase 0 report-commit, which automatically triggers a fresh run).
- **Do NOT touch** any path outside `packages/cli/**`,
  `pnpm-lock.yaml`, `ai/**` from the PR branch. If you discover a
  gap in `packages/webhook-verifier/**`, file a follow-up issue;
  do NOT in-flight patch it.
- If the lockfile delta touches existing pinned versions (anything
  beyond adding the new workspace edge under `packages/cli`), FAIL.
- `kiox.lock` working-tree drift (v2.3.0→v2.9.0) is unrelated and
  must remain untouched on `main`. Do not stage it.
- Real PR + run ids in the report (`TBD` is a FAIL).

## Recommended-next on PASS

After Task 0106 PASS+MERGE, candidates in priority order (the
orchestrator picks at the next pass):

- **B5 follow-ups** — `webhook secrets rotate` UX, replay UI,
  failure-budget alerts. The helper + the new CLI subcommand
  unblock none of these directly, but the cluster is now in
  motion and dogfooded.
- **B7 — Audit-log UX expansion** (events-worker read APIs are
  live; the console has a basic audit page, but the full filter
  set — actor / resource / action / time-range + NDJSON export —
  needs SDK + api-edge + contracts changes; multi-PR shape).
- **B8 — admin-worker scaffold** (spec 16 has no app yet;
  greenfield).

Pick whichever has the lowest spec drift / highest leverage at the
time of the next orchestrator pass.
