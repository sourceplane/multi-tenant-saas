# Task 0093 (Verifier)

Agent: Verifier

## Current Repo Context

- Implementer (Task 0093) opened **PR #141** on branch
  `impl/task-0093-lint-cleanup-wave-1` against `main`.
- All 15 required PR CI checks are reporting SUCCESS as of the time
  this prompt was written:
  `plan`, `db-tests · dev · Verify`, `identity-worker-tests · dev ·
  Verify`, `membership-worker-tests · dev · Verify`, `policy-worker-tests
  · dev · Verify`, `projects-worker-tests · dev · Verify`,
  `config-worker · {dev,stage,prod} · Verify deploy`,
  `metering-worker · {dev,stage,prod} · Verify deploy`, and
  `projects-worker · {dev,stage,prod} · Verify deploy`.
  `mergeable: MERGEABLE`, `mergeStateStatus: UNSTABLE` (no failing
  required check, just GitHub's flag for an in-progress queue at view
  time — confirm CLEAN before merge).
- Implementer report at `ai/reports/task-0093-implementer.md` claims
  39 → 0 `@typescript-eslint/no-unused-vars` errors across 9
  workspaces, achieved by **deletion only** (no `_`-prefix renames
  used; no `eslint-disable` comments introduced). Claims
  `pnpm -r --no-bail lint` exits 0 across all 33 workspaces, with only
  warnings (`no-explicit-any`, `no-console`) remaining.
- `pnpm -r typecheck` is claimed unchanged from the Task 0091 baseline
  (exits 0).
- No deferred items are touched: `notifications-provider-swap`,
  `0085b cloudflare-domain v4→v5`, `notifications-worker-dev-reframe`
  remain parked in `/ai/deferred.md`.
- Three deploy-gated apps (`config-worker`, `metering-worker`,
  `projects-worker`) had `src/**` edits, so this is a deploy-gated
  task — PR-time `verify` profile passing is necessary but not
  sufficient. Post-merge main CI must run and the live URLs must still
  serve expected content.

## Objective

Verify PR #141 against the Task 0093 prompt and the orchestrator
Verifier Standard. Confirm exactly the 39 `no-unused-vars` errors are
cleared, no out-of-boundary files were touched, no behavior changed in
the three deploy-gated workers, and the deploy profile re-runs cleanly
on `main` post-merge before declaring PASS.

## PR Boundary

This verification covers exactly the scope of Task 0093:

- Allowed edits: `src/**` files in the 9 named workspaces only
  (`apps/{config,metering,projects}-worker`,
  `tests/{db,identity-worker,membership-worker,projects-worker,
  webhooks-worker,policy-worker}`).
- Forbidden anywhere in the diff: `eslint.config.js`,
  `tooling/eslint/**`, `packages/**`, `package.json`, `pnpm-lock.yaml`,
  `wrangler.*`, `infra/**`, `intent.yaml`, `component.yaml`,
  `kiox.lock`, any new `eslint-disable` comments, any logic/behavior
  edit (handler bodies, response envelopes, route wiring, log lines).

If the diff crosses any of those lines, FAIL and document the
overreach.

## Read First

- `ai/tasks/task-0093.md` — Implementer prompt (scope + acceptance)
- `ai/reports/task-0093-implementer.md` — Implementer report
- `agents/orchestrator.md` — Verifier Standard + Verifier Merge
  Protocol (sections on merge protocol, post-merge cleanup, branch
  hygiene)
- `ai/state.json` — current task pointer + deferred list
- PR #141 diff and CI logs:
  `gh pr view 141 --json files,statusCheckRollup` and
  `gh pr diff 141`

## Required Outcomes

- [ ] Verifier report at `ai/reports/task-0093-verifier.md` with the
      mandatory sections (Result, Checks, Issues, Risk Notes, Spec
      Proposals, Recommended Next Move).
- [ ] PR #141 merged on PASS (squash, follow repo convention used on
      PRs #137–#140), local `main` fast-forwarded to `origin/main`,
      task branch deleted locally, working tree clean.
- [ ] Post-merge main CI run confirmed green for the deploy-gated
      apps (`config-worker`, `metering-worker`, `projects-worker`)
      across `dev`/`stage`/`prod` profiles.
- [ ] Live console smoke check (`https://stage.sourceplane.ai`,
      `https://prod.sourceplane.ai`) confirmed still 307 → `/orgs`
      with no regression — Task 0093 should not change this surface,
      but the three deploy-gated workers landed src changes, so a
      smoke read is mandatory.
- [ ] State files updated (`ai/state.json`, `ai/context/current.md`,
      `ai/context/task-ledger.md`) and committed to `main`.

## Non-Goals

- No fixing of `no-explicit-any` or `no-console` warnings (those are
  intentionally out of scope and may stay).
- No additional lint rule changes, no shared-rule edits, no eslint
  config restructuring.
- No infra, no migrations, no spec edits beyond drift-reporting.
- No follow-up scoping for B3 edge idempotency or class-B warning
  cleanup waves — that's the orchestrator's next turn.

## Constraints

1. The diff must touch only `src/**` in the 9 listed workspaces.
   Use `gh pr view 141 --json files -q '.files[].path'` and assert
   every path matches `^(apps/(config|metering|projects)-worker|tests/(db|identity-worker|membership-worker|projects-worker|webhooks-worker|policy-worker))/src/.+`.
   Treat the implementer report and any ai/* support files as the
   only allowed exception when they were added to the same PR.
2. No new `eslint-disable*` comments anywhere in the diff. Run
   `gh pr diff 141 | grep -nE 'eslint-disable'` and require zero
   matches in `+` lines.
3. `pnpm -r --no-bail lint` must exit 0 locally on the PR branch.
   Capture the trailing summary lines.
4. `pnpm -r typecheck` must exit 0 locally on the PR branch (Task
   0091 baseline preserved).
5. `pnpm install --frozen-lockfile` must exit 0 locally (lockfile
   untouched).
6. Do NOT merge until `mergeStateStatus` is `CLEAN` AND every
   required check is SUCCESS.
7. After merge, the post-merge `main` CI run for `config-worker`,
   `metering-worker`, `projects-worker` `deploy` profiles (dev +
   stage + prod) must complete successfully before recording PASS.
8. The verifier may commit small verifier-only artifacts (the
   verifier report) to `main` after merge, not to the PR branch,
   following the repo's recent convention.

## Verification

Execute, in order:

1. Repo prep
   - `git fetch origin`
   - `git checkout impl/task-0093-lint-cleanup-wave-1`
   - `git pull --ff-only`
   - `git status --short` (must be clean)

2. Diff boundary audit
   - `gh pr view 141 --json files -q '.files[].path'`
   - Assert every path is in-boundary per Constraint 1.
   - `gh pr diff 141 | grep -nE '^\+.*eslint-disable' || true`
     — must be empty.

3. Local quality gates on PR branch
   - `pnpm install --frozen-lockfile`
   - `pnpm -r --no-bail lint` — must exit 0; capture
     "Lint completed in N workspaces, 0 errors" or equivalent
     trailing summary.
   - `pnpm -r typecheck` — must exit 0.

4. PR CI re-check
   - `gh pr checks 141` — every required row must be `pass`.
   - `gh pr view 141 --json mergeable,mergeStateStatus` — must be
     `MERGEABLE` + `CLEAN` (or `UNSTABLE` only when no failing
     required check is the cause).

5. Merge
   - `gh pr merge 141 --squash --delete-branch` (match recent
     PRs #137–#140 convention).
   - `git checkout main && git pull --ff-only origin main`.
   - Confirm merge SHA via `git log --oneline -2`.

6. Post-merge main CI inspection (deploy-gated profile gap rule)
   - Find the `main`-triggered run after merge:
     `gh run list --branch main --limit 5 --json
     databaseId,headSha,name,status,conclusion`.
   - For the run whose `headSha` matches the merge SHA, wait for it
     to complete (`gh run watch <id>`).
   - Confirm `conclusion: success` overall.
   - Inspect the deploy-gated jobs for the three apps × three envs:
     `gh run view <id> --json jobs -q
     '.jobs[] | select((.name | contains("config-worker")) or
                     (.name | contains("metering-worker")) or
                     (.name | contains("projects-worker"))) |
       "\(.name): \(.conclusion)"'`
   - Every printed line must end in `success`.

7. Live smoke check
   - `curl -sSI https://stage.sourceplane.ai/` and
     `curl -sSI https://prod.sourceplane.ai/` — both must return
     `HTTP/2 307` with `location: /orgs`. (No regression on the
     console redirect, which Task 0093 should not affect.)
   - For sanity, `curl -sS https://stage.sourceplane.ai/orgs -I`
     must return a 2xx or 3xx (whatever was true before; do not
     manufacture a new bar).

8. Spec drift
   - The diff is mechanical lint cleanup. No spec drift expected.
     If any non-trivial deviation appears, draft a proposal under
     `/ai/proposals/task-0093-spec-update.md` instead of silently
     accepting it.

9. Write `ai/reports/task-0093-verifier.md` with the mandatory
   sections.

10. Update orchestration state files on `main`:
    - `ai/state.json`: add `"0093"` to `completed`, set
      `current_task` to next focus (orchestrator will rescope after
      this verifier turn — leave `current_task` as `"0093"` and
      flag in `notes` that orchestrator should pick up B3 edge
      idempotency or class-B warning cleanup wave next),
      update `last_verified` ISO timestamp, keep `repo_health:
      green` on PASS.
    - `ai/context/task-ledger.md`: append the Task 0093 entry —
      Agent, prompt path, status `verified and merged (PASS)`,
      objective, scope, outcome, PR + merge SHA + post-merge run id.
    - `ai/context/current.md`: bump roadmap state past 0093, list
      the candidates the orchestrator may pick from next per the
      `state.json` notes.
    - Commit on `main`:
      `git add ai/reports/task-0093-verifier.md ai/state.json
       ai/context/task-ledger.md ai/context/current.md`
      `git commit -m "Task 0093 verification PASS: class-B
       no-unused-vars 39→0 across 9 workspaces"`
      `git push origin main`.

## Acceptance Criteria

✅ Diff boundary audit passes (only the 9 workspaces' `src/**`
   plus the implementer report under `ai/reports/`).
✅ Zero `+eslint-disable*` comments introduced in the diff.
✅ `pnpm -r --no-bail lint` exits 0 on the PR branch.
✅ `pnpm -r typecheck` exits 0 on the PR branch.
✅ `pnpm install --frozen-lockfile` exits 0 (lockfile untouched).
✅ All 15 required PR CI checks SUCCESS;
   `mergeStateStatus = CLEAN` at merge time.
✅ PR #141 squash-merged; branch deleted; local `main` fast-forwarded.
✅ Post-merge main CI run conclusion = success; every deploy-gated
   job (`{config,metering,projects}-worker` × `{dev,stage,prod}`)
   = success.
✅ Live smoke: stage + prod `/` → 307 to `/orgs` unchanged.
✅ `ai/reports/task-0093-verifier.md` filed with all mandatory
   sections (Result, Checks, Issues, Risk Notes, Spec Proposals,
   Recommended Next Move).
✅ State files updated and committed to `main` with the Task 0093
   completion entry.
✅ `git status --short` clean at end of verifier run.

## PR Creation Requirement

The Implementer has already created PR #141. The Verifier's job is
to verify and merge it. No new PR creation is expected from this
verifier task. State-file updates land directly on `main` per repo
convention.

## When Done Report

Save report to: `ai/reports/task-0093-verifier.md`

Required sections:

- **Result**: `PASS` or `FAIL` with one-line justification.
- **Checks**: bullets for each verification step (1–10) above with
  exact commands run and one-line outcomes. Include the post-merge
  main CI run id and the deploy-gated job conclusions.
- **Issues**: any blockers (FAIL only) or non-blocking concerns
  (PASS may have minor notes).
- **Risk Notes**: residual risk after verification — at minimum
  acknowledge that warning-class lint findings (`no-explicit-any`,
  `no-console`) remain by design.
- **Spec Proposals**: links to any new
  `/ai/proposals/task-0093-*.md` files, or "none required".
- **Recommended Next Move**: prompt the orchestrator with the two
  natural next candidates from `ai/state.json` notes — (1) B3 edge
  idempotency at api-edge, (2) class-B warning cleanup wave
  (`no-explicit-any`) — and let the orchestrator choose.
