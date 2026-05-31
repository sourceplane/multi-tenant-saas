# Task 0110 — Verifier

Agent: Verifier

## Current Repo Context

- Task 0110 implementer is COMPLETE. PR #165 OPEN, MERGEABLE/CLEAN, all 4
  PR-CI required lanes SUCCESS at HEAD `3d6b32436d228573c4ed3cb18b282a644f9a2eb9`
  on branch `impl/task-0110-cli-webhook-secrets-rotate` (commits: 2 — feat
  commit `641f8c3` + report-PR-number bookkeeping commit `3d6b324`).
- Sealed snapshot at PR open: main `3cfdeb0` (Task 0109 verifier-PASS
  bookkeeping). At verifier dispatch, main may have advanced past the PR
  base — expect the recurring BEHIND-main pattern observed on
  0103/0104/0105/0106/0107/0108/0109. Handle with `gh pr update-branch 165`
  (Constraint 3 below) and re-watch PR-CI on the rebased HEAD before merge.
- Diff: 4 files, +720/-0, scope-clean, EXACTLY matching the PR boundary
  in `ai/tasks/task-0110.md`:
  - `packages/cli/src/commands/webhook-secrets-rotate.ts` NEW (160 LOC).
  - `packages/cli/src/cli-runner.ts` +3 LOC (route + import + 1 help line).
  - `packages/cli/src/__tests__/webhook-secrets-rotate.test.ts` NEW
    (361 LOC, 13 cases — above the ≥12 floor).
  - `ai/reports/task-0110-implementer.md` NEW (committed on PR branch —
    no 0106 missing-report fix-up needed).
- Zero edits to `packages/sdk/**`, `packages/contracts/**`,
  `packages/webhook-verifier/**`, `apps/**`, `tests/**`, `infra/**`,
  `tooling/**`, `stack-tectonic/**`, `kiox.lock`,
  `packages/cli/package.json`, `pnpm-lock.yaml`. No edits to existing
  CLI command files (`webhook-verify.ts`, `webhook-sign.ts`, `writes.ts`,
  `cross-reads.ts`, `commands/index.ts`). Verify with the exhaustive
  forbidden-zone scan in Phase 1.
- Implementer claims reveal-once discipline: `response.secret` is read
  exactly once and written to stdout exactly once via the
  `${secretPlaintext}` interpolation in the `secret:` line. Test 12
  asserts `stdout.match(/whsec_/g).length === 1` in human mode. Verify
  these are genuinely binding, not just regex-greenwashing.
- This is the **B5 secret-rotation arc CLOSER** — symmetric CLI
  counterpart to Task 0109's console reveal-once UX, completing the
  0108 (backend) → 0109 (console) → 0110 (CLI) trilogy.

## Objective

Verify PR #165 against the Task 0110 implementer prompt
(`ai/tasks/task-0110.md`) and the Verifier Standard in
`agents/orchestrator.md` lines 392–434. Decide PASS/FAIL. If PASS, merge
per Verifier Merge Protocol; if FAIL, leave the PR open with clear
blockers documented in the verifier report.

## PR Boundary

4 paths total. All in scope:

```
ai/reports/task-0110-implementer.md                              NEW
packages/cli/src/__tests__/webhook-secrets-rotate.test.ts        NEW
packages/cli/src/cli-runner.ts                                   modified
packages/cli/src/commands/webhook-secrets-rotate.ts              NEW
```

ANY out-of-scope path → auto-FAIL.

## Read First

- `ai/tasks/task-0110.md` — implementer prompt; the contract this PR
  must satisfy.
- `ai/reports/task-0110-implementer.md` — implementer's self-report;
  cross-check claims against the diff.
- `ai/tasks/task-0109-verifier.md` and
  `ai/reports/task-0109-verifier.md` — sibling console-side closer;
  reveal-once invariant verification pattern carries over.
- `agents/orchestrator.md` — Verifier Standard (lines 392–434), Verifier
  Merge Protocol.
- `packages/cli/src/commands/webhook-verify.ts` and
  `packages/cli/src/commands/webhook-sign.ts` — sibling CLI subcommands
  shipped by Tasks 0106 and 0107; structural reference for this
  command's shape (UsageError on bad args, `ctx.sdk()` wiring through
  `router.js`).
- `packages/cli/src/commands/writes.ts` — defines the
  `resolveOrgId(ctx, allowOverride=false)` and `readIdempotencyKey()`
  helpers. Implementer was forbidden from touching `writes.ts`; verify
  any inline reimplementation of `resolveOrgId` matches the
  no-override branch byte-for-byte and that `readIdempotencyKey` is
  imported (not re-implemented).

## Verification Phases

### Phase 0 — Working-dir + readiness gate

1. `cd /Users/irinelinson/sourceplane/multi-tenant-saas`
2. `git checkout main && git pull --ff-only origin main`
3. `git fetch origin impl/task-0110-cli-webhook-secrets-rotate`
4. Confirm `git ls-tree origin/impl/task-0110-cli-webhook-secrets-rotate --name-only ai/reports/task-0110-implementer.md` returns the path
   (no fix-up needed; implementer committed it). If for any reason it is
   missing, reconstruct from PR body + diff and commit on the PR branch
   before continuing (Task 0106 pattern).

### Phase 1 — PR sanity + scope-clean

1. `gh pr view 165 --json number,state,mergeable,mergeStateStatus,headRefOid,baseRefName,files,statusCheckRollup`
2. Confirm `state=OPEN`, `mergeable=MERGEABLE`, `mergeStateStatus=CLEAN`.
3. Confirm exactly the 4 files above. Run an explicit forbidden-zone
   guard:
   ```bash
   gh pr diff 165 --name-only | grep -E '^(packages/(sdk|contracts|webhook-verifier)|apps|tests|infra|tooling|stack-tectonic)/' && echo "FAIL: out-of-scope paths" || echo "OK: scope clean"
   gh pr diff 165 --name-only | grep -E '^(kiox\.lock|packages/cli/package\.json|pnpm-lock\.yaml)$' && echo "FAIL: locked metadata changed" || echo "OK: locks untouched"
   gh pr diff 165 --name-only | grep -E '^packages/cli/src/commands/(writes|webhook-verify|webhook-sign|cross-reads|index)\.ts$' && echo "FAIL: existing command file edited" || echo "OK: existing commands untouched"
   ```

### Phase 2 — Hazard + boundary scan

Run on the PR branch (`git checkout impl/task-0110-cli-webhook-secrets-rotate`):

1. `rg -n '(eslint-disable|@ts-ignore|@ts-expect-error|as any|as unknown as|node:)' packages/cli/src/commands/webhook-secrets-rotate.ts packages/cli/src/__tests__/webhook-secrets-rotate.test.ts packages/cli/src/cli-runner.ts`
   - Diff vs main to confirm zero NEW hits introduced by this PR.
2. `rg -n 'fetch\(|/v1/|Sourceplane' packages/cli/src/commands/webhook-secrets-rotate.ts` → expected: zero hits.
3. **Reveal-once audit (CRITICAL — auto-FAIL on bypass):**
   ```bash
   rg -n 'whsec_' packages/cli/src/commands/webhook-secrets-rotate.ts
   # Expected: ZERO hits in production code (the literal must not appear
   # in source or comments — only the interpolated SDK value flows to stdout).
   rg -n 'response\.secret' packages/cli/src/commands/webhook-secrets-rotate.ts
   # Expected: exactly ONE read.
   rg -n 'ctx\.stdout' packages/cli/src/commands/webhook-secrets-rotate.ts
   # Expected: human-mode prints the secret on exactly one stdout line.
   ```
   Manually trace the data flow: confirm the secret value is NEVER
   passed to `console.*`, `ctx.stderr`, any error constructor, any
   `JSON.stringify` of a wider object (json-mode emitting
   `JSON.stringify(response)` directly per spec is acceptable — that IS
   the single write). Confirm `closeReveal`-style discarding is
   structurally enforced (exit returns; no in-memory retention).
4. `rg -n 'fetch\(' packages/cli/src/__tests__/webhook-secrets-rotate.test.ts` → zero (tests should mock SDK, not fetch).
5. Confirm `readIdempotencyKey` is imported from `writes.ts`, not
   re-implemented:
   ```bash
   rg -n 'readIdempotencyKey' packages/cli/src/commands/webhook-secrets-rotate.ts
   # Expected: import line + at most 1-2 call sites, NO local definition.
   ```

### Phase 3 — Quality gates

```bash
pnpm install --frozen-lockfile          # expect: 39 workspaces, no lockfile churn
pnpm -r typecheck                       # expect: exit 0 across all 39
pnpm -r --no-bail lint                  # expect: ≤45 warnings, ALL in tests/api-edge/**
pnpm --filter @saas/cli build           # expect: clean tsc + bundle
pnpm --filter @saas/cli test            # expect: ≥136 cases (123 prior + 13 new)
```

If lint warning count > 45 or any new warning under `packages/cli/**`,
FAIL.

### Phase 4 — Orun gates

```bash
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --base origin/main --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
```

Expected plan: ONLY `cli·{dev,stage,prod}·Verify` (1 component × 3
envs = 3 jobs). If any other component is selected (sdk, contracts,
api-edge, web-console-next, webhooks-worker, webhook-verifier, db,
notifications-client, tests/*) → FAIL: scope leak via Orun selection.

### Phase 5 — Local CLI smoke (mandatory)

`@saas/cli` builds to `dist/cli.js`. Run a child-process smoke harness
that exercises the actual built bundle (NOT the Vitest mocks):

```bash
node -e "
const { spawnSync } = require('node:child_process');
// Help line registers the route?
const help = spawnSync('node', ['packages/cli/dist/cli.js', '--help'], { encoding: 'utf8' });
console.log('HELP_HAS_ROUTE:', /webhook\s+secrets\s+rotate/i.test(help.stdout));
// Missing endpointId → UsageError, exit 2
const r = spawnSync('node', ['packages/cli/dist/cli.js', 'webhook', 'secrets', 'rotate'], { encoding: 'utf8' });
console.log('NO_ENDPOINT_EXIT:', r.status);  // expect: 2
console.log('NO_ENDPOINT_HAS_USAGE:', /usage|endpointId/i.test(r.stderr));
// Invalid --output → UsageError, exit 2
const r2 = spawnSync('node', ['packages/cli/dist/cli.js', 'webhook', 'secrets', 'rotate', 'whep_1', '--output=garbage'], { encoding: 'utf8' });
console.log('BAD_OUTPUT_EXIT:', r2.status);  // expect: 2
"
```

Capture transcripts in the verifier report. If `--help` does not list
the new subcommand or any exit code deviates, FAIL.

### Phase 6 — PR-CI verification via `gh run view --log`

DO NOT trust `statusCheckRollup` summaries alone. For each of the 4
required lanes (`plan`, `cli · dev · Verify`, `cli · stage · Verify`,
`cli · prod · Verify`) at run id `26705959245` (HEAD `3d6b324`):

```bash
gh run view 26705959245 --log | grep -E '(orun (validate|plan|run)|cli · (dev|stage|prod))'
```

Confirm `orun run --plan plan.json --runner github-actions` actually
executed (logs show the command, not just the job conclusion).

### Phase 7 — Update-branch + merge

If `gh pr view 165 --json mergeStateStatus` returns BEHIND (recurring
0103–0109 pattern):

1. `gh pr update-branch 165`
2. Wait for fresh PR-CI on rebased HEAD via `gh pr checks 165 --watch`.
3. Re-confirm 4/4 SUCCESS via `gh run view --log` (NOT just
   `--json conclusion`).
4. If `update-branch` produces a merge commit that does NOT re-fire CI
   (Task 0107 pattern), local-rebase + force-push the PR branch and
   wait for fresh CI before merging.

Then squash-merge:
```bash
gh pr merge 165 --squash --delete-branch
```

### Phase 8 — Post-merge main-CI watch

Turbo-package shape, no deploy lane, no live URL surface — expect 4/4:
`plan` + `cli · {dev,stage,prod} · Verify`.

```bash
git checkout main && git pull --ff-only origin main
gh run list --branch main --limit 1 --json databaseId,headSha,status,conclusion
gh run watch <run-id>
gh run view <run-id> --log | grep -E 'orun (validate|plan|run)'
```

If any post-merge lane fails or the smoke step doesn't actually run,
FAIL: revert via `git revert <merge-sha>` and PR + escalate to
orchestrator.

### Phase 9 — Verifier report + bookkeeping

1. Write `ai/reports/task-0110-verifier.md` with: `Result: PASS|FAIL`,
   Checks (all phases above with exact commands + outputs), Issues,
   CI Log Review (run ids + log evidence), Reveal-Once Audit (rg output
   + data flow trace), Secret Handling Review, Spec Proposals (none
   expected), Risk Notes (e.g., dual-secret grace verification still
   inherits from 0108; SDK seam is locked from 0109), Recommended Next
   Move.
2. Update `ai/state.json`: append `"0110"` to `completed`, update
   `current_task` to next task number, `repo_health=green`,
   `last_verified=<ISO timestamp>`, `task_agent` → next prompt path.
3. Update `ai/context/current.md`: roll Task 0109's "Just-merged"
   → 0110, propose next task per "Next Tasks" list.
4. Append entry to `ai/context/task-ledger.md`.
5. Single bookkeeping commit on `main` titled
   `ai: Task 0110 verifier-PASS bookkeeping`, push to `origin/main`.
6. Run `git status --short` — must be empty before ending the verifier
   task.

## Acceptance Criteria

- ✅ PR #165 corresponds exactly to Task 0110 (4 files, no out-of-scope).
- ✅ Reveal-once invariant: production code reads `response.secret`
  exactly once and writes the plaintext to stdout exactly once
  (human-mode `secret:` line + json-mode verbatim response).
- ✅ Zero `whsec_` literal in production source/comments.
- ✅ Subcommand path `["webhook", "secrets", "rotate"]` (durable plural).
- ✅ `readIdempotencyKey` imported from `writes.ts`, not duplicated.
- ✅ Zero new `eslint-disable`/`@ts-ignore`/`@ts-expect-error`/`as any`/
     `as unknown as`/`node:*`/`fetch(`/`/v1/` under PR diff.
- ✅ `pnpm -r typecheck` exit 0 across 39 workspaces.
- ✅ `pnpm -r --no-bail lint` ≤ 45 warnings, ALL in `tests/api-edge/**`.
- ✅ `pnpm --filter @saas/cli test` ≥ 136 passing cases (13 new).
- ✅ `kiox -- orun plan --changed --base origin/main` selects ONLY
     `cli·{dev,stage,prod}·Verify` (3 jobs).
- ✅ Local `dist/cli.js` smoke: `--help` shows the new subcommand;
     missing-endpoint and invalid-output exit code 2.
- ✅ PR-CI 4/4 SUCCESS confirmed via `gh run view --log` (not just
     summary), at the rebased HEAD if BEHIND pattern hit.
- ✅ Post-merge main-CI 4/4 SUCCESS (turbo-package shape, no deploy
     lane).
- ✅ `ai/state.json` / `current.md` / `task-ledger.md` rolled forward
     in a single bookkeeping commit on `main`.

## Constraints

1. **No scope expansion.** Verifier-only fixes (e.g., implementer-report
   reconstruction) are allowed on the PR branch; feature/code edits are
   not. Any code defect → FAIL with PR open and blockers documented.
2. **PR-CI log evidence, not summary.** Use `gh run view --log` for the
   4 required lanes; recurring 0103–0109 pattern proved summary-only
   verification masks lane misconfiguration.
3. **Update-branch on BEHIND-main.** PR will likely be BEHIND main on
   the orchestrator-dispatch commit. Run `gh pr update-branch 165` and
   wait for fresh PR-CI 4/4 SUCCESS before merging. If `update-branch`
   produces a merge commit that does NOT re-fire CI (0107 pattern),
   force-push a clean rebase locally.
4. **Never merge with failing CI checks** even if verification PASS.
5. **No deploy-profile gap risk.** `@saas/cli` is a turbo-package
   workspace — no deploy lane, no live URL. PR-time `verify` is
   sufficient; post-merge main-CI is purely a regression sanity
   check, not a deploy-gate.

## PR Creation Requirement

The Implementer has already created PR #165. Your job is to verify it
and merge (PASS) or block with clear reasons (FAIL).

## When Done Report

Save to `/ai/reports/task-0110-verifier.md` with mandatory sections:

- `Result: PASS|FAIL`
- `Checks` — every phase above with exact command + outcome.
- `Issues` — any blockers or non-blocking concerns; reveal-once audit
  detail.
- `CI Log Review` — PR-CI run id + post-merge run id + grep evidence.
- `Reveal-Once Audit` — `rg whsec_` output + data-flow trace.
- `Secret Handling Review` — confirmation no plaintext leaked.
- `Spec Proposals` — drift assessment (none expected).
- `Risk Notes` — residual risk surface.
- `Recommended Next Move` — next orchestrator task pointer.
