# Task 0107 — Verifier Prompt

You are the **Verifier** for Task 0107 in the Orun multi-tenant SaaS
monorepo at `/Users/irinelinson/sourceplane/multi-tenant-saas`.

> Load skill `orun-saas-verifier` before starting. It documents the
> verifier workflow for this repo (8-phase shape, evidence
> requirements, post-merge deploy-profile-gap protocol, bookkeeping
> commit format).

## Sealed inputs (do NOT re-derive)

| Field | Value |
|---|---|
| **PR** | `#162` |
| **PR URL** | https://github.com/sourceplane/multi-tenant-saas/pull/162 |
| **Branch** | `impl/task-0107-cli-webhook-sign` |
| **Implementer impl + report HEAD** | `7157f21b37fc75dfbb1f0d8fd32d405a0e176b3f` (single PR HEAD; implementer report `ai/reports/task-0107-implementer.md` IS committed on PR branch — no Phase 0 fix-up required) |
| **Base** | `main` (orchestrator scope commit `16eaae9`; sealed snapshot main referenced by impl prompt: `4387f50`, Task 0106 verifier-PASS bookkeeping) |
| **Implementer report (path on PR branch)** | `ai/reports/task-0107-implementer.md` |
| **Implementer prompt** | `ai/tasks/task-0107.md` |
| **PR-CI at hand-off** | run `26703256895` — 4/4 SUCCESS at HEAD `7157f21` (`plan` + `cli · {dev,stage,prod} · Verify`). Confirmed via `gh pr view 162 --json statusCheckRollup`. |
| **Diff size at hand-off** | 4 files, +818 / -0 (no lockfile delta, no package.json delta — `@saas/webhook-verifier` already on `packages/cli` deps from Task 0106) |
| **Mergeable state at hand-off** | `MERGEABLE` / `CLEAN` |

## Objective

Verify the new `sourceplane webhook sign` CLI subcommand shipped on
PR #162 is correct, safe, and ready to merge. The command is the
symmetric counterpart to Task 0106's `webhook verify`: a pure
local-crypto wrapper around `signWebhookPayload` from
`@saas/webhook-verifier` (Task 0105 / squash `a1436fc`). **No backend,
contract, SDK, console, infra, helper, or api-edge edits in scope.**
This task continues to dogfood the helper inside the monorepo — the
verifier's job is to confirm the wiring is honest (no `Sourceplane`,
no `fetch`, no `/v1/`, no `node:*` crypto, no hazard-suppression
markers, binary-safe body reading, exit-code contract preserved,
round-trip equivalence with `webhook verify` from 0106).

## Phase 0 — Working directory + Phase-0 readiness check

- `cd /Users/irinelinson/sourceplane/multi-tenant-saas`
- `git fetch origin --prune`
- `git checkout main && git pull --ff-only`. Confirm
  `git rev-parse HEAD` ≥ `16eaae9` (orchestrator scope commit;
  the orchestrator-dispatch bookkeeping commit on main may have
  advanced HEAD past `16eaae9` — that is expected and means the PR
  is `BEHIND` per Phase 6 / `gh pr update-branch` recurring pattern).
- `git fetch origin pull/162/head:pr-162-verify` and
  `git checkout pr-162-verify`. Record the resolved HEAD SHA. It
  must be `7157f21b37fc75dfbb1f0d8fd32d405a0e176b3f` unless the
  implementer pushed a follow-up commit before you started.
- **Implementer report on PR branch (READINESS CHECK):**
  `git ls-tree -r HEAD --name-only | grep '^ai/reports/task-0107-implementer\.md$'`
  must return a hit. If it does NOT (regression vs hand-off), fall
  back to the 0106 fix-up protocol: reconstruct from PR body + diff,
  re-run smoke transcripts, commit on `pr-162-verify`, push to
  `impl/task-0107-cli-webhook-sign`, wait for fresh PR-CI 4/4 SUCCESS
  on the new HEAD before merge. **Expected at hand-off: report is
  present; no fix-up needed.**

## Phase 1 — PR sanity

- `gh pr view 162 --json number,state,mergeable,mergeStateStatus,headRefName,headRefOid,baseRefName,additions,deletions,changedFiles,isDraft -q '.'`
  → must be `OPEN`, `MERGEABLE`, not draft, base `main`, head
  `impl/task-0107-cli-webhook-sign`. Record current HEAD SHA.
- `gh pr diff 162 --name-only | sort` → record the file list.
  Expected (≤ 5 paths; hand-off shows exactly 4):
  ```
  ai/reports/task-0107-implementer.md
  packages/cli/src/__tests__/webhook-sign.test.ts
  packages/cli/src/cli-runner.ts
  packages/cli/src/commands/webhook-sign.ts
  ```
  A 5th path `packages/cli/src/utils/webhook-body.ts` (shared
  body-reading helper) is permitted ONLY IF the same diff also
  removes the inline body-reading copy from
  `packages/cli/src/commands/webhook-verify.ts` and re-imports from
  the shared file (i.e. genuine de-dup, not a one-sided extraction).
  The implementer chose NOT to extract — that decision is recorded
  in the report §7 and is acceptable.
- **FAIL if any path matches** any of:
  `apps/**`, `packages/sdk/**`, `packages/contracts/**`,
  `packages/webhook-verifier/**`, `apps/web-console-next/**`,
  `tooling/**`, `tests/api-edge/**`, `kiox.lock`, `infra/**`,
  any other `packages/*` outside `packages/cli/`,
  `packages/cli/package.json` (no dep changes — already on workspace
  edge from 0106), `pnpm-lock.yaml` (no lockfile delta expected).
- **FAIL if `packages/cli/src/commands/webhook-verify.ts` is touched**
  (locked from Task 0106 by impl prompt; only acceptable edit shape
  is the shared-helper de-dup pattern above, which the implementer
  did not take).
- Confirm `git log origin/main..pr-162-verify --oneline` is the impl
  commit set (hand-off: 1–2 commits, all by the implementer). Reject
  unrelated drift (e.g. a bumped `kiox.lock` or any edit under
  `packages/webhook-verifier/**`).

## Phase 2 — Hazard + boundary scan

Run from PR-branch checkout. **All must be exit-1 (no matches)** unless
explicitly noted.

- `git grep -nE 'eslint-disable|@ts-ignore|@ts-expect-error|as any' -- 'packages/cli/src/commands/webhook-sign.ts' 'packages/cli/src/__tests__/webhook-sign.test.ts' 'packages/cli/src/cli-runner.ts'`
  → zero hits.
- `git grep -nE 'as unknown as' -- 'packages/cli/src/commands/webhook-sign.ts'`
  → at most ONE hit, and only if it matches the
  `process.stdin as unknown as StdinLike` boundary cast pattern from
  `webhook-verify.ts:179` (the implementer report §5 documents this
  as the sole acceptable boundary cast). Any other `as unknown as`
  occurrence under `packages/cli/src/commands/webhook-sign.ts` =
  FAIL.
- `git grep -nE "from ['\"]node:" -- 'packages/cli/src/commands/webhook-sign.ts'`
  → zero hits (no `node:crypto`, `node:buffer`, no Node-only imports
  in the new command source).
- `git grep -nE "require\\(['\"]node:" -- 'packages/cli/src/commands/webhook-sign.ts'`
  → zero hits.
- `git grep -nE "from ['\"](crypto|buffer|util)['\"]" -- 'packages/cli/src/commands/webhook-sign.ts'`
  → zero hits (no bare-name node-builtin imports).
- `git grep -nE "Sourceplane|client\\.|fetch\\(|/v1/" -- 'packages/cli/src/commands/webhook-sign.ts'`
  → zero hits. The command must NOT touch the SDK, network, or any
  `/v1/` route. Local crypto only via the helper.
- `git grep -nE '\.trim\\(|JSON\\.parse' -- 'packages/cli/src/commands/webhook-sign.ts'`
  → zero hits within the body-reading code path. (A `JSON.parse` call
  on flag input or test fixtures is fine; what's prohibited is
  `.trim()` / `JSON.parse` against the body bytes themselves.)
  Inspect the surrounding lines if there are hits to confirm scope.
- Confirm `packages/cli/package.json` is NOT in the diff. If it is →
  FAIL (the workspace edge for `@saas/webhook-verifier` already
  shipped with Task 0106; no new dep is needed).
- Confirm `pnpm-lock.yaml` is NOT in the diff. If it is, inspect the
  delta — only acceptable shape is a no-op resolver re-write with
  zero version bumps. Anything else → FAIL.
- Inspect `packages/cli/src/commands/webhook-sign.ts`. Required:
  - Imports `signWebhookPayload` (and any header / constants needed)
    from `@saas/webhook-verifier`. No `node:crypto.createHmac` /
    `Buffer`-based crypto.
  - Reads `--secret`, `--timestamp` as required flags; missing ones
    throw `UsageError` (from `packages/cli/src/errors.ts`) → exit 2
    via `formatCliError`.
  - Reads `--body=PATH` as optional; if omitted, drains STDIN to
    EOF as a binary stream. `--body` + readable STDIN both →
    `UsageError`.
  - Body bytes are passed to the helper without `.trim()`,
    `JSON.parse`, or decode-then-re-encode. **FAIL** on any
    `.trim()` / `JSON.parse` against the body input.
  - `--timestamp=N` parsed as a non-negative integer string
    (regex `^[0-9]+$` per impl report §6 cases 7–9); bad input →
    `UsageError`. Negative numbers explicitly rejected.
  - `--output=human|json` controls the success shape:
    * human: two lines — `signature: sha256=<hex>\ntimestamp: <ts>`
      (single trailing newline). Exit 0.
    * json: `{"signature":"sha256=<hex>","timestamp":"<ts>"}`. Exit 0.
    * unknown `--output` value → `UsageError` exit 2 (impl report
      §7 documents that the runner's `parseOutputMode` silently
      coerces unknown values to `human`, so the command handler
      explicitly rejects them).
  - All output goes to **stdout** (not stderr). Exit code carries
    the signal.
  - No `webhook verify`-style success/failure branching — `sign` is
    a one-shot command: success or `UsageError`. There is no exit 4
    path because there is nothing to fail except input validation.
- Inspect `packages/cli/src/cli-runner.ts` diff: registration entry
  for `["webhook", "sign"]` must mirror the existing
  `["webhook", "verify"]` pattern from Task 0106. Help-block text
  must list the new subcommand alongside `webhook verify`. The
  implementer report §1 says `RunOptions` gains a `webhookSign`
  test-injection slot mirroring `webhookVerify` — confirm both slot
  registration and route wiring landed. Confirm no unrelated edits
  leaked in (e.g. no rewrites of other command registrations).
- Inspect `packages/cli/src/__tests__/webhook-sign.test.ts`:
  - At least 12 `it(...)` cases (impl prompt requires ≥ 12; impl
    report §6 enumerates exactly 12).
  - Coverage shapes (verify each is present):
    * happy-path human mode: stdin body + valid ts → exit 0; output
      matches `^signature: sha256=[0-9a-f]{64}\ntimestamp: \d+\n$`.
    * happy-path json mode: single-line valid JSON with `signature`
      + `timestamp` string fields.
    * `--body=PATH` reads file bytes binary-safe (no trim) — body
      with leading/trailing whitespace + final newline asserts
      signature equals
      `signWebhookPayload({secret, body, timestamp})` against the
      exact bytes.
    * `--body=PATH` and STDIN both → `UsageError` exit 2.
    * Missing body (no flag, no STDIN) → `UsageError` exit 2.
    * Missing `--secret` → `UsageError` exit 2.
    * Missing `--timestamp` → `UsageError` exit 2.
    * `--timestamp=abc` (non-integer) → `UsageError` exit 2.
    * `--timestamp=-5` (negative) → `UsageError` exit 2.
    * Multi-byte UTF-8 body bytes signed with deterministic
      helper-equivalent value — composes body via
      `Buffer.from("héllo 漢字", "utf8")` and asserts the produced
      signature equals the precomputed value (cross-checked against
      the helper).
    * `--output=invalid` → `UsageError` exit 2 (command-level
      rejection, not runner coercion).
    * Round-trip: sign output verifies against
      `verifyWebhookSignature` directly (NOT through the verify
      CLI — direct helper import).

## Phase 3 — Quality gates

Run from PR-branch checkout. Capture exit codes and the relevant
tail lines into the report.

1. `pnpm install --frozen-lockfile` → exit 0. Lockfile should be
   up-to-date (no delta expected). If it fails, fall back to a
   non-frozen install and confirm the lockfile delta is empty / a
   no-op resolver re-write. Reject any version bumps to existing
   pinned packages. Reject any change to `kiox.lock`.
2. `pnpm -r typecheck` → exit 0. Workspace count from the Turbo
   summary must remain **39** (Task 0105 added the +1 for
   `@saas/webhook-verifier`; Task 0106 did not add a workspace; Task
   0107 does not add one either). If the count drifts, investigate.
3. `pnpm -r --no-bail lint` → ≤ 45 warnings, **all** in
   `tests/api-edge/**`. Verify with
   `pnpm -r --no-bail lint 2>&1 | grep -E '^/.+: warning' | grep -v 'tests/api-edge/'`
   returning empty. **FAIL** if any new warning appears under
   `packages/cli/**` or `packages/webhook-verifier/**`.
4. `pnpm --filter @saas/cli build` → exit 0
   (`tsc --project tsconfig.build.json && node scripts/bundle.mjs`).
5. `pnpm --filter @saas/cli test` → exit 0. Vitest summary must show
   **≥ 123 cases** (111 prior from Task 0106 + ≥ 12 new in
   `webhook-sign.test.ts`). Pre-existing CLI tests still pass.
6. **Local e2e smoke (mandatory regardless of report content):**
   from a clean shell, build the CLI then drive both subcommands via
   `node:child_process.spawn` against the built `dist/cli.js`:
   - `webhook sign --secret=… --timestamp=1700000000 --output=json`
     with a fixed body via stdin → exit 0; capture stdout JSON.
   - Pipe the same body into `webhook verify` with the
     `signature` + `timestamp` from step 1 and a tolerance large
     enough to cover the 2023 fixed timestamp (e.g.
     `--tolerance-seconds=3153600000`) → exit 0; stdout `{"ok":true}`.
   - Pipe a one-byte-flipped body into `webhook verify` with the
     same signature/timestamp → exit 4; stdout
     `{"ok":false,"reason":"signature_mismatch"}`.
   - Paste all three transcripts into the verifier report. The impl
     report §4 documents the exact harness pattern at
     `/tmp/task-0107-smoke.mjs`; you may reuse the harness or
     re-derive it — the requirement is that you re-run it from your
     own checkout, not just trust the impl transcripts.
7. Tolerated pre-existing failure (verify it reproduces on main, do
   NOT block on it): `tests/db/migrations.test.ts`. If a different
   test file fails, treat as a real failure and FAIL the task.

## Phase 4 — Orun gates

From PR-branch checkout, run via `kiox` (do NOT install or invoke
`orun` directly):

- `kiox -- orun validate` → exit 0.
- `kiox -- orun plan --changed --base origin/main --intent intent.yaml --output /tmp/plan-0107.json`
  → exit 0; plan must select **exactly the cli component's lanes**
  (`cli·{dev,stage,prod}·Verify`) — 1 component × 3 envs = 3 jobs.
  **FAIL** if the plan pulls in unrelated lanes (means the diff
  accidentally trespassed into another component's `spec.path`) or
  if any lane is `deploy` (CLI is a `turbo-package`-shaped lane).
- `kiox -- orun run --plan /tmp/plan-0107.json --dry-run --runner github-actions`
  → exit 0. Capture the simulated job count and per-lane preview
  lines (all three should show `cli · {env} · Verify ✓`).
- Capture the plan + run output to the report.

## Phase 5 — PR-CI inspection

- `gh pr view 162 --json statusCheckRollup -q .statusCheckRollup`
  → must be 4/4 SUCCESS at the **current PR HEAD SHA**. Hand-off
  HEAD `7157f21` already shows 4/4 SUCCESS via run `26703256895`;
  if no follow-up commit was pushed, that run is the merge gate.
- `gh run view 26703256895 --log` (NOT `--log-failed`, NOT just the
  summary) and grep for actual lane completion lines:
  - `plan` job exit 0.
  - Each of the three `cli · {env} · Verify` jobs completes the
    `kiox -- orun run ... --runner github-actions` step (or the
    `quick-check` profile equivalent — `pnpm --filter @saas/cli
    build / typecheck / test / lint`) with exit 0 and shows the
    expected lane.
- Record run id, conclusion, and per-lane wall-clock.

## Phase 6 — Squash merge + post-merge watch

**Pre-merge gate:** Phases 0–5 all GREEN; PR HEAD CI 4/4 SUCCESS at
the current HEAD SHA.

- If `gh pr view 162 --json mergeStateStatus -q .mergeStateStatus`
  reports `BEHIND` after the orchestrator's verifier-dispatch commit
  advances main (recurring pattern — see ledger note for Task 0106:
  orchestrator-dispatch commit `1a01dba` made PR #161 BEHIND), run
  `gh pr update-branch 162` first, then re-watch CI to 4/4 SUCCESS
  on the post-update HEAD, then merge.
- `gh pr merge 162 --squash --delete-branch` → success. Record the
  squash SHA on `main`. If standard merge is blocked by branch
  protection due to required-check ordering, `--admin` is
  acceptable but record the reason.
- After merge, watch main-CI:
  `gh run watch <main-ci-run-id>` (find via
  `gh run list --branch main --limit 5 --json databaseId,headSha,name,status,conclusion`).
- **Post-merge expectation:** `cli` is a `turbo-package`, so its
  main-CI lanes are `cli · {dev,stage,prod} · Verify` — **no deploy
  profile, no live-URL surface**. Confirm the lanes still run
  `quick-check` (`pnpm --filter @saas/cli build / typecheck / test
  / lint`) on main. Plan-job + 3 verify lanes = **4/4 SUCCESS**
  expected.
- Record run id, conclusion, wall-clock per lane.
- If main-CI fails post-merge: do NOT revert blindly. Open an
  immediate revert PR if the failure is regression-confirmed; if
  flaky, re-run once and document.

## Phase 7 — Verifier report

Write `ai/reports/task-0107-verifier.md`. Required sections:

1. Outcome (PASS / FAIL).
2. Sealed inputs echo (PR, SHAs, branch, hand-off + post-merge HEAD).
3. Per-phase evidence with command outputs, exit codes, file lists,
   greps, run ids, lane wall-clocks. Quote tail lines from
   `pnpm -r typecheck`, `pnpm -r lint`, vitest, and `orun plan`.
4. Hazard scan output (the actual grep commands and their exit
   codes), explicitly noting the single permitted boundary
   `as unknown as StdinLike` cast (or its absence).
5. PR-CI run id + 4/4 SUCCESS confirmation via `gh run view --log`
   on the **current PR HEAD SHA**.
6. Squash SHA on main + main-CI run id + 4-lane wall-clocks.
7. The three e2e smoke transcripts (sign+verify roundtrip, verify
   tampered → exit 4 / signature_mismatch).
8. Confirmation that `packages/cli/src/commands/webhook-verify.ts`
   was NOT touched (Task 0106 lock preserved).
9. Any caveats (e.g. tolerated pre-existing
   `tests/db/migrations.test.ts` failure).
10. Recommended-next.

## Phase 8 — Bookkeeping commit

After Phase 7 PASS, on `main`:

- Update `ai/state.json`:
  - Append `"0107"` to `completed`.
  - Set `current_task` to the next scoped task id once orchestrator
    schedules it, or leave it as the last verifier path until the
    next orchestrator pass.
  - Refresh `last_verified` timestamp (UTC, ISO-8601).
  - Set `next_focus` per the recommended-next at hand-off (B5
    rotate UX, B5 replay UI / failure-budget alerts, B7 audit-log
    UX, or B8 admin-worker scaffold — whichever the orchestrator's
    next pass selects).
  - Prepend a `notes[0]` entry summarizing PASS+MERGE (squash SHA,
    main-CI run id, key gate results, e2e smoke confirmation).
- Append `## Task 0107` block to `ai/context/task-ledger.md` with
  the durable outcome.
- Refresh `ai/context/current.md` with the post-0107 checkpoint and
  the new "Next Task" framing.
- `git add ai/ && git commit -m "ai: Task 0107 verifier PASS — sourceplane webhook sign CLI subcommand merged"`
  and `git push origin main`.

If Phase 7 is FAIL: do NOT merge. Push a PR-branch commit containing
`ai/reports/task-0107-verifier.md` with the FAIL evidence; leave a
`gh pr comment 162` with the FAIL summary; do NOT touch state.json
or task-ledger.md beyond appending a brief failure note.

## Hard rules (verifier-side)

- Trust code reality over the implementer report. Phases 2–5 prove
  or refute it. The impl report on PR branch is a starting point,
  not a substitute for re-running the gates yourself.
- **Do NOT merge** until the PR HEAD SHA's CI run is 4/4 SUCCESS.
  If any follow-up commit is pushed during verification (yours or
  the implementer's), re-watch CI on the new HEAD before merge.
- **Do NOT touch** any path outside `packages/cli/**` and `ai/**`
  from the PR branch. If you discover a gap in
  `packages/webhook-verifier/**` or in the existing
  `webhook-verify.ts` (e.g. a bug uncovered by the round-trip
  smoke), file a follow-up issue or write a spec proposal under
  `ai/proposals/`; do NOT in-flight patch it.
- **`webhook-verify.ts` is locked.** Any edit to
  `packages/cli/src/commands/webhook-verify.ts` in this PR =
  immediate FAIL (Task 0106 boundary preserved). The acceptable
  shared-helper de-dup pattern requires touching it AND the new
  `webhook-sign.ts` AND a new shared module — the implementer chose
  the inline-duplication path and that decision is final for 0107.
- If `pnpm-lock.yaml` is in the diff, inspect carefully — only a
  no-op resolver re-write is acceptable; any version bumps = FAIL.
- If `packages/cli/package.json` is in the diff, FAIL (the dep was
  already added in Task 0106).
- `kiox.lock` working-tree drift (v2.3.0→v2.9.0) is unrelated and
  must remain untouched on `main`. Do not stage it.
- Real PR + run + squash ids in the report (`TBD` is a FAIL).

## Recommended-next on PASS

After Task 0107 PASS+MERGE, candidates in priority order (the
orchestrator picks at the next pass — full B5 dogfood arc closes
with this verifier PASS):

- **B5 — `webhook secrets rotate` UX** (canonical operational pain
  point: reveal-once secret on rotate, dual-secret window, audit
  hook). Backend-touching multi-PR shape; smallest opening PR is the
  api-edge + contracts surface or the events-worker dual-secret
  verification path. Highest user-visibility of remaining B5 work.
- **B5 — webhook replay UI / failure-budget alerts** (console-side;
  pure consumer of existing events-worker read APIs once the SDK
  delivery-history client is final).
- **B7 — Audit-log UX expansion** (events-worker read APIs are
  live; the console has a basic audit page, but the full filter set
  — actor / resource / action / time-range + NDJSON export — needs
  SDK + api-edge + contracts changes; multi-PR shape).
- **B8 — admin-worker scaffold** (spec 16 has no app yet;
  greenfield; cleanest single-PR shape if the orchestrator wants a
  greenfield breather between B5 multi-PR clusters).

Pick whichever has the lowest spec drift / highest leverage at the
time of the next orchestrator pass.
