# Task 0092 — Verifier

Agent: Verifier

## Current Repo Context

- Task 0092 implementer (PR #140, branch
  `impl/task-0092-eslint-config-scaffold`) has shipped the canonical
  ESLint v9 flat-config scaffold across the 16 missing workspaces (7
  apps + 1 package + 8 tests). Implementer report:
  `ai/reports/task-0092-implementer.md`. Diff per implementer is 16
  new `eslint.config.js` files (each the canonical 2-line re-export of
  `tooling/eslint/index.js`) plus the implementer report — no
  production source, no devDeps, no `pnpm-lock.yaml` change, no
  `tooling/eslint/index.js` edit, no infra / wrangler / component.yaml
  / orun intent / Terraform touches.
- Repo state at scoping: `main @ 9081cff` (Task 0091 merged). PR-CI
  on PR #140 is currently UNSTABLE — `plan` and the dev/stage `Verify`
  jobs that have completed so far are SUCCESS; deploy-verify jobs for
  the 7 newly-scaffolded apps-workers are IN_PROGRESS / QUEUED. None
  of those workers were touched in source — they only gain a sibling
  `eslint.config.js` file — so a 100% green deploy-verify rollup is
  the expected post-merge shape, not a new risk surface.
- Deferred boundaries that MUST NOT be touched by any verifier-side
  fix: `infra/terraform/cloudflare-domain/**`, the `cloudflare ~> 4.52`
  provider pin, anything in `apps/notifications-worker/**` source,
  anything in `apps/web-console-next/eslint.config.mjs`, and the
  shared `tooling/eslint/index.js` rule baseline.
- Class-B rule-violation workspaces (existing 3 + 6 newly-surfaced)
  are EXPLICITLY out of scope for this task. The verifier confirms
  they are surfaced (proving the scaffold worked) but does NOT fail
  the PR for them — they become Task 0093.

## Objective

Verify PR #140 against Task 0092's PR Boundary, Acceptance Criteria,
and Verifier Standard from `agents/orchestrator.md`. PASS the PR
(merge + sync main + clean local tree) only when every check passes
AND the post-merge main-CI run is green. FAIL with clear blockers
otherwise.

## PR Boundary (must hold)

In:
- 16 new `<workspace>/eslint.config.js` files using the canonical
  2-line re-export shape:
  ```
  import config from "../../tooling/eslint/index.js";
  export default config;
  ```
  Target list: apps/{billing,config,events,metering,policy,projects,
  webhooks}-worker, packages/policy-engine,
  tests/{billing,config,events,metering,policy-engine,policy,projects,
  webhooks}-worker.
- `ai/tasks/task-0092.md`, `ai/tasks/task-0092-verifier.md`,
  `ai/reports/task-0092-{implementer,verifier}.md`, and the standard
  state-file updates (`ai/state.json`, `ai/context/current.md`,
  `ai/context/task-ledger.md`). Verifier is allowed to add the
  verifier report to the PR branch and re-run CI before merging
  (standard verifier merge protocol).

Out (any hit = FAIL with blocker):
- `tooling/eslint/index.js`.
- The 17 existing working `eslint.config.{js,mjs}` files.
- Any `apps/**/src/**`, `packages/**/src/**`, `tests/**/src/**` file.
- Any `wrangler.jsonc`, `component.yaml`, orun intent, Terraform
  config, or `infra/**` file.
- `infra/terraform/cloudflare-domain/**` and the `cloudflare ~> 4.52`
  pin.
- `pnpm-lock.yaml` (unless implementer added a per-workspace devDep
  AND the report explains why transitive resolution failed —
  implementer report says no devDeps were needed, so a lockfile diff
  is a blocker absent that documented justification).
- Any class-B rule-violation fix (would be a scope-creep blocker).

## Read First

- `ai/tasks/task-0092.md` (the implementer prompt: PR Boundary,
  Architect Brief, Acceptance Criteria).
- `ai/reports/task-0092-implementer.md` (claimed diff, before/after
  lint summary, kiox/orun triple results).
- `agents/orchestrator.md` Verifier Standard + Verifier Merge
  Protocol (sections covering PASS/FAIL gating, CI log inspection,
  merge + main sync).
- `ai/context/current.md` and `ai/state.json` (deferred boundaries +
  current focus).
- A canonical re-export sample: `apps/api-edge/eslint.config.js`,
  `tests/identity-worker/eslint.config.js`.
- `tooling/eslint/index.js` (read-only — confirm no diff vs main).

## Required Outcomes

- [ ] `git diff origin/main..origin/impl/task-0092-eslint-config-scaffold
      --name-only` lists ONLY files inside the PR Boundary. Zero hits
      on the OUT list.
- [ ] Each of the 16 target workspaces gained an `eslint.config.js`
      and the file content is exactly the canonical 2-line re-export
      (allow trailing newline). Any deviation must be documented in
      the implementer report with a structural rationale; otherwise
      FAIL.
- [ ] `tooling/eslint/index.js` is byte-for-byte identical to its
      main-branch contents (`git diff origin/main -- tooling/eslint/index.js`
      empty).
- [ ] Locally on the PR HEAD: `pnpm install --frozen-lockfile` exits
      0 (implementer report claims no devDep additions, so the
      frozen lockfile must hold).
- [ ] Locally: `pnpm -r --no-bail lint` produces ZERO occurrences of
      `couldn't find an eslint.config.* file` (verify with
      `grep -c`). Class-A is fully cleared.
- [ ] Locally: `pnpm -r typecheck` exits 0 (Task 0091 baseline holds;
      no regression).
- [ ] Locally: kiox/orun triple green —
      `kiox -- orun validate --intent intent.yaml`,
      `kiox -- orun plan --changed --intent intent.yaml --output plan.json`,
      `kiox -- orun run --plan plan.json --dry-run --runner github-actions`.
- [ ] PR-CI rollup on PR #140 is fully green (every required CheckRun
      `conclusion=SUCCESS`). The currently-in-progress deploy-verify
      jobs must complete green before merge — do NOT merge an UNSTABLE
      rollup.
- [ ] No secrets / tokens / credentials in any added file
      (`search_files` for `CLOUDFLARE_API_TOKEN`, `SUPABASE_*`,
      `*_SECRET`, `*_KEY` patterns — should match nothing inside the
      16 new config files; they are 2-line re-exports).
- [ ] No spec drift requiring a proposal (this is pure config-bootstrap).
- [ ] After PASS: PR squash-merged, local `main` checked out and
      fast-forwarded from `origin/main`, working tree clean
      (`git status --short` empty), task branch deleted locally.
- [ ] Post-merge main-CI run is green (every job SUCCESS) on the
      squash SHA. Verifier records the run id + SHA in the report.
- [ ] State files updated: `ai/state.json` adds `0092` to `completed`,
      bumps `current_task` to the next scoped task or to a clean
      "awaiting next selection" placeholder, updates `last_verified`
      and `repo_health`. `ai/context/current.md` and
      `ai/context/task-ledger.md` reflect the verified-and-merged
      outcome plus the next-task pointer. (Orchestrator will scope
      Task 0093 in the next loop turn — verifier just records the
      handoff.)

## Non-Goals

- Do NOT fix any class-B rule violation. They are the explicit
  follow-up (Task 0093 candidate per implementer report).
- Do NOT touch `tooling/eslint/index.js` even if a rule baseline tweak
  would clear class-B errors.
- Do NOT widen the diff to include any production source, infra, or
  the deferred boundaries.
- Do NOT mark PASS while the PR-CI rollup is UNSTABLE.

## Constraints

1. Verifier merges only with BOTH local checks green AND PR-CI rollup
   green AND post-merge main-CI green.
2. Class-A elimination is the success bar; class-B rule output is
   captured in the verifier report as expected residual surface, not
   as failure.
3. No edits to deferred boundaries.
4. No state-file change unless this verification reaches PASS.

## Acceptance Criteria

- ✅ Diff scope, file shape, and `tooling/eslint/index.js` integrity
     all confirmed.
- ✅ Local validation block green: `pnpm install --frozen-lockfile`,
     `pnpm -r --no-bail lint` (class-A=0), `pnpm -r typecheck` exit 0,
     kiox/orun triple ✓.
- ✅ PR-CI on PR #140 fully green at merge time. `gh pr view 140
     --json mergeable,mergeStateStatus` shows `mergeable: MERGEABLE`
     and `mergeStateStatus: CLEAN` (or `BEHIND` after a fast-forward
     update — but never `UNSTABLE` / `BLOCKED` at merge time).
- ✅ Post-merge main-CI run is green on the squash SHA.
- ✅ Local repo synced to `origin/main`, working tree clean.
- ✅ State files updated: `ai/state.json`, `ai/context/current.md`,
     `ai/context/task-ledger.md`. Verifier report committed.

## Verification

Run in order:

1. **Diff scope audit**
   ```
   gh pr diff 140 --name-only | sort
   ```
   Must list exactly: 16 `eslint.config.js` files at the listed
   workspace paths + `ai/reports/task-0092-implementer.md` (and any
   verifier-side state-file updates committed during verification).

2. **Canonical-shape audit**
   For each of the 16 new files:
   ```
   cat <workspace>/eslint.config.js
   ```
   Confirm exactly 2 non-blank lines:
   `import config from "../../tooling/eslint/index.js";`
   `export default config;`
   (allow path depth variation only if the workspace nests deeper —
   none in the target list do).

3. **Shared rule baseline integrity**
   ```
   git diff origin/main -- tooling/eslint/index.js
   ```
   Must be empty.

4. **Local install + lint + typecheck**
   ```
   git fetch origin
   git checkout impl/task-0092-eslint-config-scaffold
   pnpm install --frozen-lockfile
   pnpm -r --no-bail lint 2>&1 | tee /tmp/lint-0092-verify.log
   grep -c "couldn't find an eslint.config" /tmp/lint-0092-verify.log
     # must be 0 (grep exit 1 = good)
   pnpm -r typecheck   # must exit 0
   ```

5. **kiox/orun triple**
   ```
   kiox -- orun validate --intent intent.yaml
   kiox -- orun plan --changed --intent intent.yaml \
     --output /tmp/plan-0092-verify.json
   kiox -- orun run --plan /tmp/plan-0092-verify.json \
     --dry-run --runner github-actions
   ```

6. **PR-CI rollup gate**
   ```
   gh pr view 140 \
     --json mergeable,mergeStateStatus,statusCheckRollup
   gh run view <ci-run-id> --log-failed   # if any failures
   ```
   Wait for all IN_PROGRESS / QUEUED jobs to complete. Block merge if
   any required check is not SUCCESS.

7. **Secret / drift sweep**
   ```
   git diff origin/main -- ':(glob)**/eslint.config.js' \
     | grep -iE 'token|secret|key|password' || true
   ```
   Should match nothing meaningful (the word "key" may appear in
   comments inside `tooling/eslint/index.js` but that file is not
   diffed — verify by inspection).

8. **Merge protocol** (only if 1–7 PASS)
   ```
   gh pr merge 140 --squash --delete-branch
   git checkout main
   git pull --ff-only origin main
   git status --short    # must be empty
   ```

9. **Post-merge main-CI**
   ```
   gh run list --branch main --limit 1
   gh run view <run-id> --json conclusion,jobs
   ```
   All jobs must be SUCCESS. Record the run id + squash SHA in the
   verifier report.

10. **State-file updates** (PASS only)
    - `ai/state.json`: append `"0092"` to `completed`, set
      `last_verified` to the merge timestamp, hold `repo_health` at
      `green`, update `notes` to capture Task 0092 PASS + the
      orchestrator's expected next pick (class-B lint cleanup as Task
      0093 candidate).
    - `ai/context/current.md`: move Task 0092 to "Recently completed",
      record PR #140 squash SHA + post-merge run id, surface the
      class-B follow-up as the leading next-task candidate.
    - `ai/context/task-ledger.md`: append the verifier outcome under
      the existing `## Task 0092` section using the same shape as
      Task 0091's verifier entry (PR/SHA/run-id, diff scope, local
      validation block, durable outcome, next task).
    - Commit and push the verifier report + state-file updates
      directly to `main` (the verifier-side updates land on main via
      the standard "verify, merge PR, then commit verifier artifacts
      on main" pattern — same as Tasks 0090, 0091).

## PR Creation Requirement

The Implementer has already created PR #140. Verifier does NOT open a
new PR. Verifier MAY commit the verifier report to the PR branch
during verification (standard merge protocol) before merging.

## When Done Report

Save to `ai/reports/task-0092-verifier.md` with sections:
- `Result: PASS` or `Result: FAIL`
- `Checks` — every step from the Verification block, with command
  + result. Include the exact `git diff --name-only` listing,
  the canonical-shape audit summary, and the lint before/after
  Class-A=0 confirmation.
- `Issues` — empty on PASS; clear blockers on FAIL.
- `CI Log Review` — PR-CI run id + final rollup, post-merge main-CI
  run id + final rollup, both with conclusion per job.
- `Live Resource Evidence` — N/A for this task (no live resource
  changes; verifier records "no infra / wrangler / component touches
  in diff" as the explicit non-evidence).
- `Secret Handling Review` — confirm no token/key/secret in any new
  file.
- `Spec Proposals` — none expected.
- `Risk Notes` — class-B rule-violation workspaces are surfaced and
  documented (per implementer report's Remaining Gaps); they become
  Task 0093.
- `Recommended Next Move` — orchestrator scopes Task 0093 (class-B
  lint cleanup, wave 1: mechanical `no-unused-vars` errors in tests
  workspaces) OR pivots to B3 edge idempotency, depending on
  orchestrator selection in the next loop turn.
