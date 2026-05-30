# Task 0096 — Verifier

Agent: Verifier

## Current Repo Context

- main tip: `d94bf92` (orchestrator scope commit for Task 0095.1).
  No production source has changed on main since Task 0094 closed at `71cf34f`.
- Implementer phase for Task 0096 (class-B warning cleanup wave 1, apps source)
  is complete. Branch `impl/task-0096-class-b-warning-cleanup-wave-1`, head
  `78720ef` ("docs: add PR url to task-0096 implementer report"). Behind that:
  `d4c9339` (report) → `38f07e7` (the 4-file source diff) → `7d2c332`
  (orchestrator scope) → `d94bf92` main.
- **PR #144** is OPEN at `78720ef`,
  `mergeable=MERGEABLE`, `mergeStateStatus=CLEAN`, status checks 7/7 SUCCESS
  (1× plan + 6× worker × env Verify-deploy across config/metering/webhooks ×
  dev/stage). Title: "Task 0096: Class-B warning cleanup wave 1 (apps source)".
- Implementer report committed to the PR branch at
  `ai/reports/task-0096-implementer.md`.
- This task is **strictly disjoint** from in-flight PR #143 (Task 0095 /
  0095.1). PR #143 is in a verifier-FAIL → fix-up cycle on a separate branch,
  separate file set. No merge-conflict risk between them. PR #143 head still
  `db00843` (no 0095.1 commits pushed yet — that track stays staged on
  `ai/tasks/task-0095.1-verifier.md` independent of this verification).
- Deferred set unchanged (`notifications-provider-swap`, Task 0085b
  `cloudflare-domain` v4→v5, `notifications-worker-dev-reframe`) — verifier
  must not reach into any of these.

## Objective

Verify that PR #144 lands the Task 0096 PR boundary exactly: 5 lint warnings
across 3 production-source files cleared with the smallest viable diff, no
suppression, no shared-rule edits, no behavioural change beyond the documented
`description: null → undefined` narrowing on `update-feature-flag.ts`. On
PASS, squash-merge PR #144 and confirm post-merge main-CI deploy lane stays
green for the three affected workers across dev/stage/prod.

## PR Boundary (must match implementer report exactly)

In:

1. `apps/config-worker/src/handlers/update-feature-flag.ts` — two `as any`
   casts at lines 139 & 213 replaced with the canonical
   `UpdateFeatureFlagInput` from `@saas/db/config`; one import widened on
   line ~3 to add the type symbol; `description === null` narrowed to
   "skip the field" matching the sibling `update-setting.ts` /
   `create-feature-flag.ts` handlers.
2. `apps/metering-worker/src/rollups.ts:147` — single `console.log` →
   `console.warn` on the scheduled-rollup summary line.
3. `apps/webhooks-worker/src/index.ts:30,36` — two `console.log` →
   `console.warn` on the scheduled dispatch + retry summary lines.
4. `ai/reports/task-0096-implementer.md` — implementer report (NEW).

Total: **4 files**, ~10 inserts / ~10 deletes in source, ~212 inserts in
the report. (`git diff origin/main...HEAD --stat` confirms.)

Out (must NOT appear in the diff):

- Any file under `tests/**`, `apps/api-edge/**`, `packages/**`, `infra/**`,
  `tooling/**`, `stack-tectonic/**`.
- Any `*.json`, `*.jsonc`, `*.yaml`, `*.yml`, `*.lock`, `kiox.lock`,
  `pnpm-lock.yaml`, `package.json`, `wrangler.*`, `component.yaml`,
  `intent.yaml`.
- `tooling/eslint/index.js` or any other shared rule baseline.
- Any new logger import / new dependency / new export.
- Any `+eslint-disable*`, `+@ts-ignore`, `+@ts-expect-error`,
  `+as unknown as` introduction.

## Read First

- `ai/tasks/task-0096.md` — original implementer task prompt (PR boundary,
  acceptance criteria, blocker protocol).
- `ai/reports/task-0096-implementer.md` — implementer report (per-file
  diff summary, validation gates, suppression audit, the
  `description: null` narrowing rationale, the global-warning-count drift
  note 644 → 632 baseline → 627 after).
- `agents/orchestrator.md` — Verifier Standard, Verifier Merge Protocol.
- `tooling/eslint/index.js` — confirm shared baseline allows
  `console.warn` / `console.error` and bans only `console.log`; confirm
  `@typescript-eslint/no-explicit-any` is `warn` (not `error`).
- `packages/db/src/config/types.ts` lines 108–112 — canonical
  `UpdateFeatureFlagInput` shape.
- `apps/config-worker/src/handlers/update-setting.ts` lines ~131 & ~204 —
  the sibling-handler precedent the implementer cites for the
  `description: null → undefined` narrowing.
- `references/post-merge-deploy-profile-gap.md` — for the post-merge
  main-CI deploy-lane discipline. Three affected workers
  (`config-worker`, `metering-worker`, `webhooks-worker`) all subscribe
  to the standard `cloudflare-worker-turbo-verify-deploy` shape.

## Verification Phases

### Phase 1 — Boundary scan

```bash
git fetch origin
git checkout impl/task-0096-class-b-warning-cleanup-wave-1
git pull --ff-only
git diff origin/main...HEAD --stat
git diff origin/main...HEAD --name-only
```

PASS criteria: exactly 4 files listed above. Any extra path → FAIL.

### Phase 2 — Hazard scan on the diff

```bash
git diff origin/main...HEAD | grep -E '^\+.*(eslint-disable|@ts-ignore|@ts-expect-error|as unknown as)' | head
```

Empty output required. Any hit → FAIL.

Also confirm zero new imports of `console` redirection / new logger
shims, zero new dependencies in any `package.json` (and `package.json`
isn't even in the diff per Phase 1).

### Phase 3 — Code path inspection

Read `apps/config-worker/src/handlers/update-feature-flag.ts` after the
diff and confirm:

- The added import names `UpdateFeatureFlagInput` from `@saas/db/config`
  (NOT a re-declaration, NOT a fresh inline shape).
- Both call sites (transactional `txRepo.updateFeatureFlag` and
  deps-injected `deps.repo.updateFeatureFlag`) pass a value typed
  `UpdateFeatureFlagInput`.
- The `description === null` branch skips assignment instead of writing
  `null` to the input — matches the sibling `update-setting.ts`
  precedent on the same handler boundary.
- No `as any` / `as unknown as X` remains anywhere in the touched file
  (`grep -E 'as any|as unknown as' apps/config-worker/src/handlers/update-feature-flag.ts` empty).

Read `apps/metering-worker/src/rollups.ts` and
`apps/webhooks-worker/src/index.ts` and confirm:

- The three sites use `console.warn` (not a new logger).
- No `console.log` survives anywhere in the touched files
  (`rg '^[^/]*console\.log' apps/{metering,webhooks}-worker/src/index.ts apps/metering-worker/src/rollups.ts` empty).
- `console.error` usage on hard-failure paths (e.g.
  `apps/webhooks-worker/src/index.ts` line ~16) is unchanged.

### Phase 4 — Local validation gates

```bash
pnpm --filter "./apps/config-worker"   lint
pnpm --filter "./apps/metering-worker" lint
pnpm --filter "./apps/webhooks-worker" lint
pnpm -r --no-bail lint                          # capture global count
pnpm -r typecheck
pnpm --filter "./tests/config-worker"   test
pnpm --filter "./tests/metering-worker" test
pnpm --filter "./tests/webhooks-worker" test
```

PASS criteria:

- Each per-workspace lint exits 0 with **0 warnings** (down from 2 / 1 / 2).
- Global `pnpm -r --no-bail lint` exits 0 with the residual warning count
  exclusively in `tests/**` (the implementer recorded 627 against a
  baseline drift of 632 — accept any number provided the per-workspace
  apps-source counts are zero AND no new warning surfaced in any
  non-tests/* workspace).
- `pnpm -r typecheck` exits 0 (Task 0091 baseline holds).
- All three touched-workspace test suites green.

### Phase 5 — `description: null` semantic change review

The implementer narrowed `description === null` to "skip the field"
because the canonical `UpdateFeatureFlagInput.description` is
`string | undefined`. Confirm:

- `git log --all --oneline -S '"description"' -- apps/config-worker/src/handlers/update-feature-flag.ts | head` —
  no historical evidence of an end-to-end test relying on
  `description: null` clearing the description.
- `rg -n '"description"\s*:\s*null' tests/config-worker/src` — no
  fixture exercises `description: null` on the update-feature-flag
  handler. (If one exists, FAIL with a spec-proposal blocker — the
  product-intent question must be resolved before merge.)
- `apps/config-worker/src/handlers/update-setting.ts` and
  `apps/config-worker/src/handlers/create-feature-flag.ts` already use
  the same `null → undefined` coercion — narrow precedent in the same
  handler family.

If the test surface is clean and the precedent holds, the change is
safe to merge. Document the inspection in the verifier report under
"Behavioural Review".

### Phase 6 — PR / CI audit

```bash
gh pr view 144 --json state,mergeable,mergeStateStatus,headRefOid,statusCheckRollup
```

PASS criteria:

- `state=OPEN`, `mergeable=MERGEABLE`, `mergeStateStatus=CLEAN`.
- All 7 checks `SUCCESS` (1× `plan` + 6× `{config,metering,webhooks}-worker · {dev,stage} · Verify deploy`).
- Note: PR-CI does NOT exercise the `prod` deploy lane for these workers
  on a feature branch — that runs only on the post-merge main-CI run.
  PR-CI green is necessary but not sufficient (see
  `references/post-merge-deploy-profile-gap.md`).

### Phase 7 — Squash-merge + post-merge main-CI watch

If Phases 1–6 PASS, follow the Verifier Merge Protocol from
`agents/orchestrator.md`:

```bash
gh pr merge 144 --squash --delete-branch
git checkout main
git pull --ff-only
```

Then watch the main-CI run that fires off the squash:

```bash
gh run list -L 5 --branch main
gh run watch <run-id>
gh run view <run-id> --json conclusion,jobs \
  | jq -r '.jobs[] | "\(.name): \(.conclusion)"'
```

PASS criteria:

- Run conclusion `success`.
- Nine deploy-gated jobs all green:
  `{config,metering,webhooks}-worker × {dev,stage,prod} · Verify deploy`.

### Phase 8 — Live smoke (light, this is hygiene-only behaviour)

The diff is logging-method + typing only. No request-path behaviour
should change. Light live confirmation:

- `curl -sI https://stage.sourceplane.ai/ | head -1` → `HTTP/2 307` to
  `/orgs` (console smoke, unchanged).
- `curl -sI https://prod.sourceplane.ai/ | head -1` → `HTTP/2 307` to
  `/orgs`.
- For the three affected workers, no live HTTP probe is required (none
  publish a public URL contributors smoke-test). The post-merge deploy
  lane greens are the sufficient signal.

If the console smoke regresses, FAIL even though the diff doesn't
appear to touch web-console-next — investigate cross-coupling.

### Phase 9 — Closure: state files + ledger

Update on main after merge:

- `ai/state.json`:
  - Add `"0096"` to `completed`.
  - Set `current_task` to next candidate (Track A still staged →
    `"0095.1"` if PR #143 fix-up has landed; otherwise the next-
    candidate proposal in the orchestrator's next pass).
  - `task_agent` → next prompt path.
  - Append a `notes` entry summarising Task 0096 closure (PR #144
    squash SHA, post-merge run ID, residual warning count, the
    `description: null` narrowing decision recorded as durable).
- `ai/context/current.md`: rewrite the Track B section as closed,
  carry forward Track A and the deferred backlog verbatim.
- `ai/context/task-ledger.md`: append `## Task 0096` (Implementer +
  Verifier outcomes, PR #144, squash SHA, run ID, residual count,
  3-bullet durable outcome).
- `ai/context/open-risks.md`: no change required (this task does not
  open or close any tracked risk).
- `ai/waiting_for_input.md`: leave as "no input currently requested".

Commit those four files to main with a single
`Task 0096 verification PASS: <summary>` commit and push.

### Phase 10 — Working-tree clean + post-merge alarm window

- `git status` clean on main.
- 5-minute observation window after the post-merge main-CI run completes
  — re-run `curl` smoke and `gh run list -L 1 --branch main` to confirm
  no spurious downstream run flips RED.

## Acceptance Criteria

- ✅ PR #144 diff = exactly the 4 files listed in PR Boundary, no extra
  paths.
- ✅ Hazard scan empty (no `+eslint-disable*` / `+@ts-ignore` /
  `+@ts-expect-error` / `+as unknown as`).
- ✅ `pnpm --filter` lint exits 0 with **0 warnings** for each of the
  three workspaces.
- ✅ `pnpm -r typecheck` exits 0.
- ✅ Touched-workspace test suites green
  (`tests/config-worker`, `tests/metering-worker`,
  `tests/webhooks-worker`).
- ✅ `description: null` narrowing is safe (no fixture / spec depends
  on the prior behaviour).
- ✅ PR #144 mergeable, CI 7/7 green, squash-merged with branch deleted.
- ✅ Post-merge main-CI run all green, including 9 deploy-gated jobs
  across the three workers × {dev, stage, prod}.
- ✅ Console smoke unchanged on stage + prod (307 → /orgs).
- ✅ State files (`state.json`, `current.md`, `task-ledger.md`)
  updated and committed to main.
- ✅ `git status` clean, 5-min alarm window quiet.

## When Done Report

Save to `ai/reports/task-0096-verifier.md`:

- **Result**: PASS or FAIL.
- **Checks**: every phase 1–10 with command + outcome.
- **Issues**: any non-blocking concerns (e.g. global warning baseline
  drift 644 vs 632 — note but do not block; the delta-of-5 contract
  holds).
- **Behavioural Review**: explicit note on the `description: null →
  undefined` narrowing — sibling-handler precedent, no test/fixture
  dependence, no spec drift.
- **CI Log Review**: PR #144 CI run ID, post-merge main-CI run ID,
  per-job conclusions for the 9 deploy-gated jobs.
- **Live Resource Evidence**: stage + prod console smoke headers.
- **Suppression Audit**: confirmed empty.
- **Spec Proposals**: none expected; if `description: null` semantics
  warrant a spec change, propose under `ai/proposals/`.
- **Risk Notes**: none expected.
- **Recommended Next Move**:
  - If Track A (Task 0095.1) implementer fix-up commits are pushed by
    then, run `ai/tasks/task-0095.1-verifier.md`.
  - Otherwise: Task 0096b (tests/** warning cleanup, 627 sites across
    9 workspaces) OR Task 0097 rate-limiting (B3 second half, reuses
    cloudflare-kv slice from Task 0095 once that closes).

## Verifier Merge Protocol Reminder

- PASS + CI green → squash-merge, delete branch, fast-forward main,
  commit closure files, push.
- PASS but CI red → leave PR open, document blocker.
- FAIL → leave PR open, document each failed criterion with file:line
  evidence. Do NOT merge.
- Never merge a PR with unresolved verification blockers or red CI.
