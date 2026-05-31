# Task 0111 — Verifier

Agent: Verifier

## Current Repo Context

- **Implementer pass:** Task 0111 (PR #166) extracted
  `resolveOrgId(ctx, allowOverride)` and `readIdempotencyKey(ctx)` from
  `packages/cli/src/commands/writes.ts` and
  `packages/cli/src/commands/webhook-secrets-rotate.ts` into a new
  shared module `packages/cli/src/commands/helpers.ts`. Pure
  behaviour-preserving refactor — zero observable CLI behaviour change,
  zero new commands, zero new flags.
- **PR:** #166 OPEN, MERGEABLE, mergeStateStatus CLEAN.
  Branch: `impl/task-0111-cli-helpers-extract`.
  HEAD: `ad2964b` (impl `dbb862d` + report PR-number fixup `ad2964b`).
  Base: `fcc5340` (Task 0111 scope commit on top of `142d019` =
  PR #165 squash for Task 0110).
- **PR-CI on HEAD `ad2964b`:** run `26706640065`, **4/4 SUCCESS** —
  `plan` + `cli · {dev,stage,prod} · Verify`. Turbo-package shape, no
  deploy lane, no live URL surface (CLI never deploys).
- **Implementer report:** `ai/reports/task-0111-implementer.md` is on
  the PR branch (commit `dbb862d`), no Task 0106-style fix-up needed.
- **Diff shape:** 5 files, +394/-65. Code-only delta = +232/-65 across
  the four code files; the remaining +162 is the implementer report.
- **Sealed snapshot main:** `142d019` (Task 0110 squash; the scope
  commit `fcc5340` only adds task prompt + state-file bookkeeping).
- **Prior-art baselines:** Task 0107 / 0110 verifier shape (8 phases,
  turbo-package, no deploy lane). Re-use it; this is the same
  component-shape with a smaller surface area.
- **Vitest baseline:** main carries 136/136 across 10 files in
  `@saas/cli`. PR adds 8 cases in `helpers.test.ts` (≥6 floor) →
  expected new floor 144/144 across 11 files.

## Objective

Independently verify PR #166 against Task 0111's PR-Boundary,
Constraints, Acceptance Criteria, and Behaviour-Preservation Rules.
Confirm the refactor is byte-equivalent to the previous inline copies,
that no out-of-scope file was touched, that no hazard-suppressing
syntax was introduced, that the CLI surface and exit codes are
unchanged, and that PR-CI lanes ran and passed. PASS → squash-merge,
fast-forward main, post-merge main-CI watch. FAIL → leave PR open with
clear blockers.

## PR Boundary

The PR must touch **exactly** these 5 paths and nothing else:

1. `packages/cli/src/commands/helpers.ts` — NEW (~50–80 LOC)
2. `packages/cli/src/commands/writes.ts` — deletions + 1 import line
3. `packages/cli/src/commands/webhook-secrets-rotate.ts` — deletions
   + 1 import + comment-block edit + 1 call-site swap
   (`resolveActiveOrgId(ctx)` → `resolveOrgId(ctx, /* allowOverride */ false)`)
4. `packages/cli/src/__tests__/helpers.test.ts` — NEW (≥6 vitest cases)
5. `ai/reports/task-0111-implementer.md` — NEW

## Forbidden Zones (auto-FAIL on any hit)

Any diff under any of these paths fails the PR boundary:

- `packages/sdk/**`
- `packages/contracts/**`
- `packages/webhook-verifier/**`
- `apps/**`
- `tests/**`
- `infra/**`
- `tooling/**`
- `stack-tectonic/**`
- `kiox.lock`
- `packages/cli/package.json`
- `pnpm-lock.yaml`
- All OTHER `packages/cli/src/commands/*.ts` files
  (`cross-reads.ts`, `webhook-sign.ts`, `webhook-verify.ts`, `index.ts`,
  `cli-runner.ts`)
- `packages/cli/src/auth/**`, `packages/cli/src/output/**`,
  `packages/cli/src/sdk/**`, `packages/cli/src/utils/**`,
  `packages/cli/src/config/**`, anything else under
  `packages/cli/src/` outside the 4 listed code paths.

## Read First

- `agents/orchestrator.md` (Verifier Standard sections + Verifier Merge
  Protocol)
- `ai/tasks/task-0111.md` (the Implementer prompt — source of
  acceptance criteria, PR boundary, and behaviour-preservation rules)
- `ai/reports/task-0111-implementer.md` (the report)
- `specs/components/13-cli-and-sdk.md` (locked CLI surface — confirm
  byte-equivalence)
- `ai/tasks/task-0110-verifier.md` and
  `ai/reports/task-0110-verifier.md` (prior-art turbo-package
  verifier shape; same lanes, no deploy)
- PR #166 diff:
  `gh pr view 166 --json files,additions,deletions,headRefOid`
- PR-CI run `26706640065` lane logs via
  `gh run view 26706640065 --log` (per-lane, not summary)

## Required Outcomes

- [ ] PR-Boundary compliance confirmed (exactly 5 listed files; no
      forbidden-zone hits)
- [ ] Behaviour-equivalence confirmed for both extracted helpers:
  - `resolveOrgId(ctx, true)` is byte-equivalent to the previous
    `writes.ts` inline copy (override branch + empty-string fallback +
    `MissingOrgContextError` shape)
  - `resolveOrgId(ctx, false)` is byte-equivalent to the previous
    `webhook-secrets-rotate.ts` `resolveActiveOrgId(ctx)` (no override
    branch, ignores `ctx.flags.org`)
  - `readIdempotencyKey(ctx)` is byte-equivalent to the previous
    inline copies in both files (returns `string | undefined`,
    treats empty/whitespace as undefined exactly as before)
- [ ] No residual duplicate definitions of `resolveOrgId` /
      `readIdempotencyKey` / `resolveActiveOrgId` in the changed files
      (and only the documented pre-existing `cross-reads.ts` no-override
      copy elsewhere)
- [ ] Hazard scan clean across the PR diff (zero new
      `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `as any`,
      `as unknown as`, `node:` imports under PR new code; test file
      may use boundary casts and `node:*` only if they match
      established `helpers.test.ts`-adjacent fixtures)
- [ ] Quality gates green locally on the PR HEAD checkout:
  `pnpm install --frozen-lockfile`, `pnpm -r typecheck=0` (39
  workspaces), `pnpm -r --no-bail lint` (≤ baseline ~45 warnings, all
  in `tests/api-edge/**`), `@saas/cli build/test` green with vitest
  ≥144/144 across 11 files
- [ ] Orun gates green:
  `kiox -- orun validate --intent intent.yaml`,
  `kiox -- orun plan --changed --intent intent.yaml --output plan.json`
  selecting **exactly** `cli · {dev,stage,prod} · Verify` (3 jobs),
  `kiox -- orun run --plan plan.json --dry-run --runner github-actions`
  3/3 green
- [ ] PR-CI on PR HEAD: 4/4 SUCCESS verified via `gh run view --log`
      (per-lane log evidence, not just `statusCheckRollup`)
- [ ] No secret material in diff or report
- [ ] Verifier report at `ai/reports/task-0111-verifier.md`
- [ ] On PASS: squash-merge, sync local main, run post-merge
      main-CI watch (4 lanes: `plan` + `cli · {dev,stage,prod} ·
      Verify`), commit PASS bookkeeping (state.json + current.md +
      task-ledger.md) to main

## Non-Goals

- No CLI surface change (zero new commands, zero new flags, zero
  output-shape change)
- No edits to `cross-reads.ts` to absorb its no-override
  `resolveOrgId` copy (parked as a Remaining Gap; future task)
- No `assertOutputModeValid` extraction (single call site,
  intentionally inline)
- No SDK / contracts / webhook-verifier / api-edge / console / worker /
  Terraform / lockfile / package.json changes
- No deploy-lane verification (turbo-package shape: PR-CI 4/4 + local
  gates suffice; no live URL exists for the CLI)

## Constraints

- Verifier MUST work on a clean checkout of the PR HEAD
  (`gh pr checkout 166`), not on a stale local branch
- Verifier MUST inspect actual GitHub Actions logs via
  `gh run view 26706640065 --log` for the 4 PR-CI jobs (lanes named
  `plan`, `cli · dev · Verify`, `cli · stage · Verify`,
  `cli · prod · Verify`); a `pass` summary alone is NOT acceptable per
  Verifier Standard
- Verifier MUST run all 3 Orun gates locally on the PR HEAD; the
  changed-plan must select exactly the 3 `cli · {*} · Verify` jobs and
  no others (FAIL if any other component is pulled in)
- BEHIND-main pattern: every PR from 0103–0110 hit it. If
  `mergeStateStatus` flips to BEHIND between scoping and verifier
  execution, run `gh pr update-branch 166`, wait for the rebased
  PR-CI to go 4/4 SUCCESS again, THEN merge. Do not force-push unless
  `update-branch` itself fails to re-fire CI (Task 0107 fallback).
- If verifier needs to commit a small fix to the PR branch (e.g.
  missing-report fix-up, which should NOT be needed here), commit on
  the PR branch, push, wait for fresh PR-CI 4/4, then merge
- After merge: `git checkout main && git pull --ff-only`, delete
  local feature branch, run `git status --short` clean

## Verification Phases

### Phase 0 — Working-dir + PR readiness

```bash
cd /Users/irinelinson/sourceplane/multi-tenant-saas
git fetch origin main
git status --short                         # clean
gh pr checkout 166
gh pr view 166 --json state,mergeable,mergeStateStatus,headRefOid
git ls-tree -r HEAD --name-only ai/reports/task-0111-implementer.md
```

Expect: state OPEN, mergeable MERGEABLE, mergeStateStatus CLEAN,
headRefOid `ad2964b…`, implementer report present on PR branch.

### Phase 1 — PR sanity + scope-clean

```bash
gh pr view 166 --json files --jq '.files[].path'
```

Expect EXACTLY these 5 paths and nothing else:

- `ai/reports/task-0111-implementer.md`
- `packages/cli/src/__tests__/helpers.test.ts`
- `packages/cli/src/commands/helpers.ts`
- `packages/cli/src/commands/webhook-secrets-rotate.ts`
- `packages/cli/src/commands/writes.ts`

Forbidden-zone scan (each must return ZERO matches):

```bash
gh pr view 166 --json files --jq '.files[].path' | rg -e '^packages/sdk/' -e '^packages/contracts/' -e '^packages/webhook-verifier/' -e '^apps/' -e '^tests/' -e '^infra/' -e '^tooling/' -e '^stack-tectonic/' -e '^kiox\.lock$' -e '^packages/cli/package\.json$' -e '^pnpm-lock\.yaml$' -e '^packages/cli/src/commands/cross-reads\.ts$' -e '^packages/cli/src/commands/webhook-sign\.ts$' -e '^packages/cli/src/commands/webhook-verify\.ts$' -e '^packages/cli/src/commands/index\.ts$' -e '^packages/cli/src/cli-runner\.ts$'
```

### Phase 2 — Hazard + behaviour-equivalence scan

Hazard scan over PR diff (must all be ZERO new matches):

```bash
git diff origin/main...HEAD -- 'packages/cli/src/**' | rg -n '^\+.*(eslint-disable|@ts-ignore|@ts-expect-error|as any\b|as unknown as|from .node:)' || echo OK
```

(`as unknown as` is acceptable ONLY in the test fixture file if it
mirrors the existing `__tests__` boundary-cast pattern; production
source must have zero hits.)

Residual-duplicate audit:

```bash
rg -n 'async function resolveOrgId\(' packages/cli/src/
# expected: 1 hit in commands/helpers.ts (export)
#         + 1 PRE-EXISTING hit in commands/cross-reads.ts (single-arg, out of scope per PR boundary)

rg -n 'function readIdempotencyKey\(' packages/cli/src/
# expected: exactly 1 hit, in commands/helpers.ts (export)

rg -n 'async function resolveActiveOrgId\(' packages/cli/src/
# expected: 0 hits

rg -n "from ['\"]\\./helpers\\.js['\"]" packages/cli/src/commands/
# expected: writes.ts AND webhook-secrets-rotate.ts both import from ./helpers.js
```

Behaviour-equivalence diff: read `helpers.ts` and confirm both helpers
are byte-equivalent to the previous inline copies on
`origin/main:packages/cli/src/commands/writes.ts` and
`origin/main:packages/cli/src/commands/webhook-secrets-rotate.ts`. The
`allowOverride=false` branch must NOT consult `ctx.flags.org`. Empty
string / whitespace handling must match exactly. Error type must remain
`MissingOrgContextError` with the same message shape. Code-path read
the helpers and the two consumer call-sites manually; do not rely on
test green alone.

Test-coverage audit on `helpers.test.ts`: confirm at least these 6
scenarios are covered (≥6 cases per task):

1. `resolveOrgId(ctx, true)` returns override when `ctx.flags.org` is
   set
2. `resolveOrgId(ctx, true)` falls back to active-org when override
   absent
3. `resolveOrgId(ctx, false)` ignores `ctx.flags.org` (no override
   branch)
4. `resolveOrgId` throws `MissingOrgContextError` when no org context
   anywhere
5. Empty-string / whitespace `ctx.flags.org` does NOT count as an
   override (treated as fallback)
6. `readIdempotencyKey` truthy / undefined / empty branches

### Phase 3 — Quality gates

```bash
pnpm install --frozen-lockfile
pnpm -r typecheck                                # 0 errors across 39 workspaces
pnpm -r --no-bail lint                           # ≤ ~45 warnings, all in tests/api-edge/**
pnpm exec turbo run build --filter=@saas/cli     # green
pnpm exec turbo run test --filter=@saas/cli      # 11 files, ≥144 tests passing
```

### Phase 4 — Orun gates

```bash
kiox -- orun validate --intent intent.yaml
kiox -- orun plan --changed --intent intent.yaml --output plan.json
# expected: 1 component × 3 envs = 3 jobs, all "cli · {dev,stage,prod} · Verify"
kiox -- orun run --plan plan.json --dry-run --runner github-actions
# expected: 3/3 jobs ✓
```

If `orun plan --changed` selects ANY other component (sdk, contracts,
webhook-verifier, console, api-edge, worker, identity-worker,
notifications-worker, audit-worker, terraform-*), FAIL with the
unexpected-component evidence.

### Phase 5 — PR-CI log evidence

```bash
gh run view 26706640065 --json jobs --jq '.jobs[] | {name, conclusion, status}'
gh run view 26706640065 --log | rg -n 'cli · (dev|stage|prod) · Verify' | head -40
```

Confirm: 4/4 success, lane names `plan` + 3× `cli · {*} · Verify`,
each lane shows the actual verify commands ran (typecheck, lint,
build, test) — not just job conclusion. If `mergeStateStatus` has
flipped to BEHIND since scoping, run `gh pr update-branch 166`, wait
for fresh PR-CI 4/4 SUCCESS, capture the new run id, and use it as
the merge-gate evidence.

### Phase 6 — Squash merge + post-merge main-CI watch

```bash
gh pr merge 166 --squash --delete-branch
git checkout main
git pull --ff-only
git status --short        # clean
git log --oneline -3
```

Capture the squash commit SHA. Wait for the post-merge main-CI run on
that SHA and confirm 4/4 SUCCESS:

```bash
gh run list --branch main --limit 5
gh run watch <RUN_ID>     # or gh run view <RUN_ID> --json conclusion,jobs
```

Expected lanes: `plan` + `cli · {dev,stage,prod} · Verify`. No deploy
lane. No live URL.

### Phase 7 — Verifier report

Write `ai/reports/task-0111-verifier.md` with: Result (PASS|FAIL),
Checks (each phase + concrete evidence), Issues (if any), Risk Notes
(carry the `cross-reads.ts` Remaining-Gap forward), Spec Proposals
(none expected — pure refactor), Recommended Next Move (B5/B7/B8 or
console webhooks UX picks per current.md).

### Phase 8 — PASS / FAIL bookkeeping

**On PASS:**

- Add `0111` to `state.json.completed`, set `current_task` to the next
  scoped task or null, set `next_focus` to that task's slug, refresh
  `last_verified` ISO timestamp, set `task_agent` to the next task
  prompt path (or empty if next scope hasn't run), keep `repo_health`
  green, append a verifier-PASS bullet to `notes`.
- Append a Task 0111 entry to `ai/context/task-ledger.md` (Agent,
  Prompt, Status: verified and merged (PASS), Objective, Scope
  boundary, Acceptance: confirmed, Outcome: cli-helpers module on
  main, PR #166 squash, post-merge main-CI run id).
- Update `ai/context/current.md` to reflect Task 0111 closed and the
  new active task or candidate slate.
- Commit on main: `git add ai/state.json ai/context/current.md
  ai/context/task-ledger.md ai/reports/task-0111-verifier.md && git
  commit -m "ai: Task 0111 verifier-PASS bookkeeping" && git push
  origin main`.

**On FAIL:**

- Leave PR #166 open. Do NOT merge.
- Commit the verifier report onto the PR branch (or main with FAIL
  result, depending on blocker shape) with the failure category and
  reproducible evidence.
- Do NOT update state.json `completed`; keep `repo_health` at yellow
  if blockers exist on main, otherwise green.
- Add a clear PR comment with the FAIL summary and the file paths /
  commands the implementer must address.

## PR Creation Requirement

The Implementer has already created PR #166. The Verifier does NOT
open a new PR. Verifier-only commits (e.g. report + state-file
bookkeeping on PASS) land directly on main per the standard verifier
merge protocol.

## When Done Report

`ai/reports/task-0111-verifier.md`:

- Result: PASS | FAIL
- Checks (Phases 0–6 with concrete evidence: PR HEAD SHA, run ids,
  log greps, Orun plan id, post-merge main-CI run id on PASS)
- Issues
- Risk Notes (forward-carry the `cross-reads.ts` no-override
  duplicate as a future cleanup candidate; not a blocker)
- Spec Proposals (none expected)
- Recommended Next Move
