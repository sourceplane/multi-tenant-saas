# Task 0104 Verifier

Agent: Verifier

This prompt is **sealed at scoping time** and activates immediately —
PR #159 is already OPEN, MERGEABLE/CLEAN, 4/4 PR-CI green at sealing
(run `26700583663`: plan + web-console-next·{dev,stage,prod}·Verify
deploy). Run the eight phases below in order. Do not expand scope into
Task 0096f territory (`tests/api-edge/**`), Task 0103 territory
(`packages/sdk/**` source — already merged), or any other workspace.

## Sealing Snapshot

- Sealed at: 2026-05-31 (orchestrator close pass after Task 0103 squash
  `0909186` + verifier bookkeeping `6715f58` + orchestrator scoping
  commit `1caa08b` landed on `main`).
- `main` snapshot at sealing: `1caa08b` ("orchestrator: scope Task 0104
  (Console U10 SDK refactor) — pure consumer swap unblocked by 0103
  AuthClient").
- Implementer prompt: `ai/tasks/task-0104.md`
- Implementer report (uncommitted at sealing): local working tree only,
  not yet on the PR branch — see Phase 1 fix-up.
- **Branch (as shipped):** `impl/task-0104-console-u10-sdk-refactor`
- **PR:** #159 — base `main`, head
  `impl/task-0104-console-u10-sdk-refactor`, state `OPEN`, mergeable
  `MERGEABLE`, mergeStateStatus `CLEAN`. Title: "console: migrate
  web-console-next to @saas/sdk (Task 0104)". Authored
  2026-05-31T02:01:45Z. Single commit `a05a269`.
- PR-CI at sealing: run `26700583663` — `plan` SUCCESS,
  `web-console-next · {dev,stage,prod} · Verify deploy` all SUCCESS
  (4/4).
- Diff shape: `+200 / -307` across **17 files**, all under
  `apps/web-console-next/**` plus `pnpm-lock.yaml`. Zero edits to
  `packages/sdk/**`, `packages/contracts/**`, `packages/cli/**`,
  any `apps/*-worker/**`, any `infra/**`, any `tooling/**`,
  `tests/api-edge/**`, or `apps/web-console/**` (Vite legacy).
- Implementer chose **Path A** (direct call-site migration): hand-rolled
  `ApiClient` deleted; `lib/api.ts` shrunk from 297 LOC → ~120 LOC of
  pure console-side glue (`ApiTarget`, `TARGETS`, `DEPLOY_ENV`,
  `IS_LOCKED`, `createClient(target, token) → Sourceplane`, `wrap()`
  helper that adapts `Promise<T>` + thrown `SourceplaneError` into the
  preserved `ApiResult<T>` shape). NO `fetch(`, NO `/v1/` route
  strings, NO header building inside the file.
- One scope-extension that needs explicit verifier acceptance:
  `apps/web-console-next/next.config.mjs` gained 14 lines —
  `transpilePackages: ["@saas/sdk"]` + a webpack `resolve.extensionAlias`
  mapping `.js → [.ts, .tsx, .js]`. This is **necessary** because the
  SDK's NodeNext-style `./auth.js` re-exports cannot be resolved by
  Next's webpack against sibling `.ts` source files in the workspace.
  The implementer report calls this out explicitly. Verifier must
  accept this as in-scope build wiring (no behavior change), not flag
  it as overreach.
- Lint baseline at sealing: `pnpm -r --no-bail lint` exit 0 with **≤ 45
  residual warnings**, ALL in `tests/api-edge/**`. Console must
  contribute **0 new warnings**.
- **Deploy-gated component warning:** `web-console-next` subscribes to
  `verify` on PRs but `deploy` on `triggerRef: github-push-main`. PR-CI
  4/4 green proves only build/typecheck/Verify shape. The actual
  Cloudflare Pages deploy + smoke runs ONLY on the post-merge main-CI
  run. **Phase 6 below is mandatory** — this verifier MUST NOT mark
  PASS based on PR-CI alone. See `references/post-merge-deploy-profile-gap.md`
  in the orun-saas-orchestration skill for the canonical recipe.
- Recovery snapshot if a forced re-base or merge-time drift happens:
  base `main` at `1caa08b`; PR head `a05a269`; the PR is currently
  ahead of base by exactly one commit. If `gh pr merge --squash`
  reports the PR is BEHIND main at merge time, refresh head with
  `gh pr update-branch 159` (or `git fetch origin && git rebase
  origin/main` on the PR branch + force-push) and re-run PR-CI before
  squash-merging with `--admin` if necessary.

## Phase 1 — PR sanity + report-on-branch fix-up

1. `gh pr view 159 --json state,mergeable,mergeStateStatus,headRefName,baseRefName,additions,deletions,statusCheckRollup`
   — confirm `OPEN`, `MERGEABLE`, `CLEAN`, head
   `impl/task-0104-console-u10-sdk-refactor`, base `main`, all 4
   check runs `SUCCESS`. Paste the JSON in the verifier report.
2. `gh pr diff 159 --name-only` — confirm exactly 17 files, all under
   the allowed paths (see Sealing Snapshot). FAIL the PR if ANY file
   appears under `packages/sdk/**`, `packages/contracts/**`,
   `packages/cli/**`, `apps/*-worker/**`, `infra/**`, `tooling/**`,
   `tests/api-edge/**`, or `apps/web-console/** (Vite legacy)`.
3. **Implementer-report-on-branch fix-up (recurring gap, see
   `orun-saas-implementer` SKILL pitfall):** check
   `git ls-tree origin/impl/task-0104-console-u10-sdk-refactor
   --name-only ai/reports/task-0104-implementer.md`. If the report is
   NOT on the branch, check it out, copy
   `ai/reports/task-0104-implementer.md` from main's working tree (or
   re-create it from the local copy if main doesn't have it),
   `git add ai/reports/task-0104-implementer.md`, commit with message
   "verifier: commit Task 0104 implementer report to PR branch", push,
   wait for PR-CI to re-run, confirm green. Only THEN proceed.

## Phase 2 — Hazard scan + boundary scan

1. **Hazard scan under `apps/web-console-next/**`** (must be clean —
   zero NEW occurrences vs `main`):
   ```
   git diff origin/main..HEAD -- 'apps/web-console-next/**' | \
     grep -E '^\+' | grep -E 'eslint-disable|@ts-ignore|@ts-expect-error|as unknown as|as any|node:'
   ```
   Expected output: empty. ANY hit = FAIL.
2. **Path-string scan** — confirm the console no longer hard-codes API
   route paths:
   ```
   rg '"/v1/' apps/web-console-next/src
   ```
   Expected output: zero matches outside of comments / test fixtures.
3. **Hand-rolled HTTP scan** — confirm no `fetch(` survives in the
   console's wire layer:
   ```
   rg 'fetch\(' apps/web-console-next/src/lib
   ```
   Expected output: zero matches (the SDK owns all I/O now).
4. **`ApiClient` class scan** — confirm the duplicated class is gone:
   ```
   rg 'class ApiClient' apps/web-console-next/src
   ```
   Expected output: zero matches.
5. **SDK-source isolation** — confirm zero edits to
   `packages/sdk/**` and `packages/contracts/**`:
   ```
   git diff --name-only origin/main..HEAD | grep -E '^(packages/sdk/|packages/contracts/)'
   ```
   Expected output: empty.
6. **Build-wiring acceptance** — read
   `apps/web-console-next/next.config.mjs` on the PR branch. Confirm
   the only additions are `transpilePackages: ["@saas/sdk"]` and the
   webpack `resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] }`
   block. No environment variables added. No publicRuntimeConfig
   changes. No images/headers/redirects added. Mark this as accepted
   in-scope build wiring in the verifier report.
7. **Multi-target switcher byte-for-byte preservation** — `git diff
   origin/main..HEAD -- apps/web-console-next/src/lib/api.ts` must show
   `ALL_TARGETS` (the URL list), `DEPLOY_ENV`, `IS_LOCKED`, the
   `availableTargets` derivation, and the `NEXT_PUBLIC_DEPLOY_ENV` env
   read all preserved (the surrounding comments may move, but the
   semantics — the URL list, the lock predicate, the env-var name —
   must be identical).
8. **Bearer-token re-construction wiring** — read
   `apps/web-console-next/src/lib/session.tsx` on the PR branch.
   Confirm `useMemo`'s dep array includes BOTH `target` AND `token`,
   so a `setToken(null)` or `setTarget(...)` re-builds the
   `Sourceplane` instance. Confirm `setToken` does NOT mutate an
   existing client in place (no auth-header leak across targets).

## Phase 3 — Quality gates

Run from a clean local checkout of
`origin/impl/task-0104-console-u10-sdk-refactor`:

1. `pnpm install --frozen-lockfile` — exit 0; confirm `@saas/sdk`
   appears as a workspace edge of `@saas/web-console-next` in the
   lockfile.
2. `pnpm -r typecheck` — exit 0 across all 38 workspaces. Paste exit
   code.
3. `pnpm -r --no-bail lint` — confirm warning count ≤ 45 and that
   every warning is in `tests/api-edge/**`. Zero new warnings under
   `apps/web-console-next/**`. Paste the breakdown.
4. `pnpm --filter @saas/web-console-next build` — green. Paste the
   tail (route bundle table). If any route's First Load JS is > +20%
   vs the implementer-report baseline, note it but do NOT FAIL on it
   alone (this PR replaces a hand-rolled client with the SDK barrel —
   small bundle growth is expected).
5. `pnpm --filter @saas/web-console-next test` — green; paste
   pass/fail counts. If any console-side test was updated in this PR,
   spot-check that the assertion change reflects the SDK's typed-error
   shape (not a behavior change).
6. **Pre-existing failure tolerance:** the implementer report flags
   one pre-existing failure in `tests/db` (`migrations.test.ts` —
   bounded-context manifest check) that reproduces on `main` and is
   explicitly out of scope. Verify by running
   `pnpm --filter @saas/db-tests test` against `origin/main` — if it
   fails identically there, accept and note it. If it fails ONLY on
   the PR branch, that's a regression and a FAIL.

## Phase 4 — Orun validation

1. `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml`
   — exit 0.
2. `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json`
   — confirm the plan dispatches the `web-console-next` Verify lanes
   (dev/stage/prod) and ONLY those + `plan`. No SDK lanes, no worker
   lanes, no terraform lanes (the SDK + contracts haven't changed).
   Paste the job count and component list.
3. `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions`
   — green for every planned lane.

## Phase 5 — PR-CI inspection (not summary alone)

1. `gh run view 26700583663 --json conclusion,jobs | jq '.jobs[] |
   select(.name | test("web-console")) | {name, conclusion}'`
   — every job SUCCESS.
2. For ONE web-console Verify lane (pick stage):
   `gh run view 26700583663 --log --job <job-id>` and confirm the
   dispatched commands actually ran (typecheck, lint, build,
   `verify-bindings.sh` if applicable, smoke if any). Don't trust the
   green checkmark alone — read the log tail.
3. Confirm the run wall-clock is consistent with a real Verify lane
   (≥ 60 seconds per env), not a no-op skip.

## Phase 6 — Squash merge + post-merge main-CI watch (DEPLOY-GATED)

This is the gate that PR-CI alone cannot satisfy. `web-console-next`
deploys to Cloudflare Pages on main-push, NOT on PRs. Skipping this
phase is what caused the Task 0082 white-page regression.

1. Squash-merge the PR:
   ```
   gh pr merge 159 --squash --delete-branch
   ```
   If the PR is BEHIND `main` at merge time:
   `gh pr update-branch 159` first, wait for PR-CI green again, then
   retry squash-merge. If GitHub repo settings disable auto-merge or
   require admin override, use `--admin`.
2. After merge, identify the post-merge main-CI run:
   ```
   gh run list --branch main --workflow CI --limit 3 --json databaseId,headSha,status,conclusion,createdAt
   ```
   The run whose `headSha` matches the squash-merge commit is the one
   to watch.
3. **Watch it to completion:**
   `gh run watch <run-id> --exit-status` (or poll
   `gh run view <run-id> --json status,conclusion` until status is
   `completed`). Required: `conclusion == SUCCESS`.
4. **Confirm the deploy lane actually deployed** (not just verified):
   ```
   gh run view <run-id> --json jobs | \
     jq '.jobs[] | select(.name | test("web-console-next.*deploy"; "i")) | {name, conclusion}'
   ```
   Every `web-console-next · {stage,prod} · deploy` (or whatever the
   composition emits) must be SUCCESS. If the post-merge run only has
   `Verify` lanes (no `deploy` lanes), that itself is a regression in
   the composition — escalate, do not mark PASS.
5. **Live-URL smoke** — curl the deployed console URLs and confirm
   non-empty HTML with the expected app shell:
   ```
   curl -sI https://stage.sourceplane.ai
   curl -s  https://stage.sourceplane.ai | head -50
   curl -sI https://prod.sourceplane.ai
   curl -s  https://prod.sourceplane.ai | head -50
   ```
   Expected: HTTP 307 → `/orgs` (or 200 with the Next app shell HTML
   present). NOT a white page, NOT a 404, NOT an OpenNext-on-Pages
   "no _worker.js" placeholder. If you see a white page, load
   `references/opennext-cloudflare-pages-deployment-shape.md` from
   the orun-saas-orchestration skill and use that recipe to triage —
   do not mark PASS.

## Phase 7 — Verifier report

Write `ai/reports/task-0104-verifier.md` with sections:

- **Result:** PASS or FAIL.
- **Checks:** every command from Phases 1–6 with exit codes and
  observed values (warning counts, job conclusions, route bundle
  sizes, run IDs, curl HTTP statuses).
- **PR + CI evidence:** PR #159 details, PR-CI run ID, post-merge
  main-CI run ID, squash-merge commit SHA, branch deletion confirmed.
- **Live resource evidence:** curl outputs (status line + first
  meaningful HTML line) for stage and prod console URLs.
- **Boundary scan:** explicit confirmation that no SDK / contracts /
  CLI / worker / infra / tooling files were touched and that the
  `next.config.mjs` build-wiring extension is accepted in-scope.
- **Hazard scan:** explicit confirmation of zero new
  `eslint-disable` / `@ts-ignore` / `@ts-expect-error` /
  `as unknown as` / `as any` / `node:*` under
  `apps/web-console-next/**`.
- **Spec proposals:** none expected; if a contract or SDK gap
  surfaced (none flagged in the implementer report), link the
  proposal file.
- **Risk notes:** any residual concerns (e.g. bundle-size delta,
  the `next.config.mjs` extensionAlias as a precedent for future
  workspace-source consumers).
- **Recommended next move:** Task 0105 — `packages/cli` auth/SDK
  consumer swap (the symmetric CLI-side migration; estimated single
  PR; unblocked by 0103 AuthClient just like 0104 was).

## Phase 8 — PASS / FAIL bookkeeping

### If PASS

Update on `main` (post-merge, after Phase 6 step 5):

1. `ai/state.json`:
   - Add `"0104"` to `completed`.
   - Set `current_task` to `"0105"` (or whatever the orchestrator
     scopes next; if scoping happens in a follow-up cycle, leave
     `current_task` at `"0104"` and let the next orchestrator pass
     bump it).
   - Set `repo_health` to `"green"`.
   - Set `last_verified` to the verification timestamp (ISO 8601).
   - Update `task_agent` to `"ai/reports/task-0104-verifier.md"`.
   - Prepend a notes entry summarizing the verification outcome
     (PR #159 squash SHA, post-merge main-CI run ID, live-URL curl
     status, console clients still on 13).
2. `ai/context/current.md`:
   - Replace the "Current Task — 0104 (Implementer scoping)" section
     with a "Current Task — 0105 (Implementer scoping)" stub or, if
     no follow-up has been scoped yet, a "What just landed (recap)"
     entry for Task 0104 plus a "Next Task" candidate paragraph for
     the CLI consumer swap.
   - Update Repo Checkpoint: bump HEAD to the verifier bookkeeping
     commit, bump tasks-completed count to 118, update
     last-verified-main-CI-run.
3. `ai/context/task-ledger.md`:
   - Append a `## Task 0104` section with: Agent, Prompt path, Status
     (verified and merged, PASS), PR #159 squash SHA, Reports paths,
     Durable outcome (3–5 bullets: console no longer carries a
     hand-rolled wire client; SDK is the single API surface;
     `lib/api.ts` 297 → 120 LOC of pure glue; `next.config.mjs`
     gained `transpilePackages` + extensionAlias to support
     workspace-source SDK resolution; bundle delta tolerable; live
     stage/prod consoles confirmed serving via curl), Main CI run.
4. Commit + push to `main`:
   ```
   git add ai/state.json ai/context/current.md ai/context/task-ledger.md \
           ai/reports/task-0104-verifier.md ai/tasks/task-0104-verifier.md
   git commit -m "verifier: close Task 0104 (PR #159) — Console U10 SDK refactor (web-console-next on @saas/sdk)"
   git push origin main
   ```

### If FAIL

1. Leave PR #159 open (do NOT merge). If you already merged before
   discovering a failure, scope an immediate follow-on hotfix task
   (Task 0104.1) and document the regression — do NOT revert without
   user direction.
2. Add a PR comment with the specific blocker(s), the exact failing
   command, and the expected vs observed value.
3. Write `ai/reports/task-0104-verifier.md` with `Result: FAIL` and
   the same Checks/Evidence sections as PASS, plus a "Blockers"
   section listing each failed acceptance criterion.
4. Do NOT update `ai/state.json` `completed` list. Do update
   `repo_health` to `"yellow"` and add a `notes` entry pointing at
   the verifier report and the PR comment.
5. Commit on the PR branch:
   ```
   git checkout impl/task-0104-console-u10-sdk-refactor
   git add ai/reports/task-0104-verifier.md
   git commit -m "verifier: FAIL Task 0104 (PR #159) — see report"
   git push origin impl/task-0104-console-u10-sdk-refactor
   ```
   Then return to `main` clean (`git checkout main && git status`
   must show no uncommitted changes after the failure path).

## Hard rules (apply across all phases)

- Trust code, not the implementer report. Read the diff yourself.
- Inspect CI logs, not just the green checkmark.
- For deploy-gated components, post-merge main-CI + live URL curl is
  the gate, NOT PR-CI alone.
- Do not extend scope into Task 0096f, 0103, 0105, or any deferred
  candidate (`0085b`, `notifications-provider-swap`,
  `notifications-worker-dev-reframe`, `optional-spec-13-commands`).
- If a contract or SDK gap surfaces during verification, write a spec
  proposal at `ai/proposals/task-0104-spec-update.md` and continue
  under a narrow assumption — do not block the verifier on it.
- Never merge a PR with unresolved verification blockers.
- Leave the local repo clean after the verifier task ends
  (`git status --short` empty on `main`).
