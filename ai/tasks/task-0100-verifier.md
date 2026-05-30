# Task 0100 Verifier

Agent: Verifier

This prompt is **sealed at scoping time** and activates the moment the
Task 0100 implementer opens a PR on branch
`impl/task-0100-packages-cli-scaffold`. Run the seven phases below in
order. Do not expand scope into Task 0096f territory, Task 0101
territory, or any other workspace.

## Sealing Snapshot

- Sealed at: 2026-05-31
- `main` snapshot: `c5dbd992883f687febbdf78410e551d6fbe5b64e`
- Implementer prompt: `ai/tasks/task-0100.md`
- Implementer report: `ai/reports/task-0100-implementer.md`
- Branch: `impl/task-0100-packages-cli-scaffold`
- Verifier report: `ai/reports/task-0100-verifier.md`
- Mirror reference (turbo-package quick-check shape):
  `packages/sdk/component.yaml` (byte-shape-equivalent target apart
  from `name`, `domain`, `surface`, `description`).
- Lint baseline at scoping: `pnpm -r --no-bail lint` exit 0 with
  exactly **45 residual warnings**, ALL in `tests/api-edge`
  (Task 0096f territory). CLI workspace must contribute **0**.

## Out-Of-Scope Territory

Do NOT inspect, comment on, or block on any of:

- `tests/api-edge/**` (Task 0096f / parallel)
- `apps/api-edge/src/**`, `apps/api-edge/scripts/verify-bindings.mjs`,
  `apps/api-edge/wrangler.jsonc`, `infra/terraform/cloudflare-kv/**`
  (Track A / Task 0097, sealed)
- `packages/sdk/**` (Task 0099 closed; consume only)
- `packages/contracts/**`, `apps/**` (no consumer or contract drift
  permitted in this PR)
- `infra/terraform/cloudflare-domain/**` and the cloudflare provider
  `~> 4.52` pin (deferred 0085b)
- `apps/notifications-worker/**` (deferred provider-swap and
  dev-reframe)
- `tooling/eslint/**` (sealed since Task 0092)

If the PR diff touches any of the above (other than `pnpm-lock.yaml`
and a workspace-deps update strictly necessary to install
`packages/cli`), that is an immediate **FAIL** in Phase 2 with no
further investigation.

## Latitude Exercised By Implementer

Per Task 0100 prompt, the implementer has explicit latitude on:

- **Framework choice** — `commander`, `cac`, `clipanion`, or
  hand-rolled. Verifier accepts whichever is shipped, provided the
  implementer report records a one-line rationale and the resulting
  runtime tree honours hard rule §4 (no new top-level workspace
  runtime deps).
- **Auth flow** — device-flow if `apps/api-edge` already serves a
  device-code endpoint, else token-paste fallback validated by
  `client.organizations.list()`. Verifier accepts whichever is
  shipped, provided the implementer report records the choice + the
  fallback switch is a one-line dispatch in `auth/login.ts`.

Verifier MUST NOT require a particular framework or a particular auth
flow. Verifier MUST require that whichever was chosen is documented
in the implementer report and is consistent with the test surface.

---

## Phase 1 — PR Sanity

1. `gh pr view <PR#> --json
   number,title,headRefName,baseRefName,state,mergeStateStatus,
   isDraft,statusCheckRollup,files`
2. Confirm:
   - `headRefName` == `impl/task-0100-packages-cli-scaffold`
   - `baseRefName` == `main`
   - `state` == `OPEN`
   - `isDraft` == `false`
   - `mergeStateStatus` ∈ {`CLEAN`, `UNSTABLE` while CI runs} — not
     `BLOCKED` / `DIRTY` / `BEHIND` (rebase-on-main is the
     implementer's job)
3. Confirm files list contains:
   - `ai/reports/task-0100-implementer.md`
   - `packages/cli/package.json`
   - `packages/cli/tsconfig.json`
   - `packages/cli/tsconfig.build.json`
   - `packages/cli/eslint.config.js`
   - `packages/cli/vitest.config.ts`
   - `packages/cli/component.yaml`
   - `packages/cli/README.md` (optional but expected)
   - `packages/cli/src/cli.ts` (or equivalent argv entrypoint per
     framework choice — name latitude allowed)
   - At least one `packages/cli/src/auth/*.ts`
   - At least one `packages/cli/src/token-store/*.ts`
   - At least one `packages/cli/src/context/*.ts`
   - At least one `packages/cli/src/output/*.ts`
   - `packages/cli/src/errors.ts`
   - At least six `packages/cli/src/__tests__/*.test.ts` files
     (cli, output, token-store, auth, context, commands)
   - `pnpm-lock.yaml` (workspace install delta)
   - …and **nothing outside** `packages/cli/**`,
     `ai/reports/task-0100-implementer.md`, and the lockfile.
4. Confirm the implementer report has a real `PR Number:` (no `TBD`,
   no `#[PR]`, no `BLOCKED` unless the report is itself a blocker
   filing — in which case escalate, do NOT proceed).
5. Confirm the implementer report records:
   - Framework choice + one-line rationale
   - Auth flow choice (device-flow vs token-paste) + one-line
     rationale
   - Total it() count across the listed test files (must be ≥ 30)

If any check fails → **FAIL** with the reason. Do not proceed.

---

## Phase 2 — Hazard + Boundary Scan

1. Hazard scan (zero lines required):
   ```sh
   grep -RnE '(eslint-disable|@ts-ignore|@ts-expect-error|as unknown as|as any\b)' \
     packages/cli/ \
     | grep -v node_modules | grep -v dist
   ```
   Expect: **no output**. Any hit → **FAIL**.

2. Boundary scan — confirm CLI imports only the public API:
   ```sh
   grep -RnE "from ['\"](apps/|packages/db|@saas/db|workers/)" packages/cli/src \
     | grep -v node_modules
   ```
   Expect: **no output**. Any hit → **FAIL**.

3. `keytar` confirmation:
   - `packages/cli/package.json` lists `keytar` under
     `optionalDependencies` (or `peerDependencies` with
     `peerDependenciesMeta.<keytar>.optional: true`). NOT under
     `dependencies` or `devDependencies` proper.
   - `grep -RnE "import .* from ['\"]keytar['\"]" packages/cli/src`
     returns either no static imports OR only inside a try/catch /
     dynamic-import boundary (`await import('keytar')`). Verifier
     reads the matching file; static `import keytar from 'keytar'`
     at module top level → **FAIL** because non-Node test runs would
     crash on the missing native build.

4. node:* leakage scan on shared modules:
   - `grep -RnE "from ['\"]node:" packages/cli/src/index.ts
     packages/cli/src/cli.ts` is allowed (CLI binary is Node-only),
     but the test helper modules (`packages/cli/src/__tests__/*`)
     and the SDK-facing client modules MUST be importable in a
     vanilla Node test runner without triggering keychain access.
     If `vitest run` exits 0 in Phase 3, this is satisfied.

If any check fails → **FAIL** with the reason. Do not proceed.

---

## Phase 3 — Local Quality Gates

Run from the PR branch (`gh pr checkout <PR#>` then back to local
checkout). All commands must exit 0 unless explicitly noted.

1. `pnpm install --frozen-lockfile` (or `pnpm install` if lockfile
   updates land in the PR — both acceptable; document which).
2. `pnpm --filter @saas/cli typecheck` — exit 0.
3. `pnpm --filter @saas/cli lint` — exit 0 with **0 warnings**.
4. `pnpm --filter @saas/cli test` — exit 0; record the it() total.
   Must be ≥ 30 across the listed test files.
5. `pnpm --filter @saas/cli build` — exit 0; confirm
   `packages/cli/dist/cli.js` exists and starts with
   `#!/usr/bin/env node`:
   ```sh
   head -1 packages/cli/dist/cli.js
   ```
6. `node packages/cli/dist/cli.js --help` — exit 0, produces help
   text covering all seven pilot commands (`login`, `logout`,
   `whoami`, `org list`, `org use`, `org members`, `project list`).
7. `node packages/cli/dist/cli.js --version` — exit 0.
8. **Repo-wide gates** (Task 0091 + Task 0099 baseline preserved):
   - `pnpm -r typecheck` — exit 0.
   - `pnpm -r --no-bail lint` — exit 0 with **exactly 45 residual
     warnings**, ALL in `tests/api-edge` (Task 0096f territory).
     Any new warnings outside `tests/api-edge/**` → **FAIL**.
9. POSIX file-mode check (FileTokenStore):
   - The unit test asserting `mode 0600` on the credentials file
     and `mode 0700` on the parent directory MUST be present and
     green on POSIX. Inspect the test source:
     ```sh
     grep -RnE '(0o600|0600|S_IRUSR|S_IWUSR)' packages/cli/src/__tests__
     grep -RnE '(0o700|0700)' packages/cli/src/__tests__
     ```
     Both should produce at least one hit. If neither is asserted,
     **FAIL** (constraint §5).
10. JSON output stability check:
    - At least one test asserts the exact JSON shape of `--output=json`
      for a list command and the error envelope shape
      `{ error: { code, message, requestId? } }`. Inspect tests:
      ```sh
      grep -RnE "(toEqual|toStrictEqual)\(" packages/cli/src/__tests__/output.test.ts
      ```
      Hits expected. If `output.test.ts` does not exist or does not
      assert the envelope, **FAIL** (constraint §6).

---

## Phase 4 — Orun Validation

Run from repo root:

1. `kiox -- orun validate --intent intent.yaml` — exit 0.
2. `kiox -- orun component --intent intent.yaml --long` — confirm
   `cli` is listed with `domain: starter-cli` and `type: turbo-package`.
3. `kiox -- orun plan --changed --intent intent.yaml --output plan.json`
   — exit 0, plan includes `cli · {dev,stage,prod} · Verify` lanes.
4. `kiox -- orun run --plan plan.json --dry-run --runner github-actions`
   — exit 0; rendered Verify YAML mirrors the SDK shape (no apply
   lanes, no Cloudflare deploy step).
5. Byte-shape diff:
   ```sh
   diff -u packages/sdk/component.yaml packages/cli/component.yaml
   ```
   Allowed differences are only on lines for `metadata.name`,
   `metadata.description`, `spec.domain`, and `labels.surface`. Any
   other delta (extra profiles, extra labels, mismatched node /
   pnpm version, different commands) → **FAIL** unless implementer
   report explains it AND the rationale is reasonable (verifier
   judgement; document the call).

If any step fails → **FAIL** with the reason.

---

## Phase 5 — PR-CI Log Inspection

1. `gh pr checks <PR#>` — confirm rollup is all green or, if still
   running, wait/poll. Required jobs:
   - plan
   - `cli · dev · Verify`
   - `cli · stage · Verify`
   - `cli · prod · Verify`
   (4 total, mirroring SDK shape post-Task 0098.1.)

2. For each `cli · <env> · Verify` job, fetch logs with
   `gh run view <run-id> --log` and confirm:
   - `pnpm install` succeeded.
   - The build / typecheck / test commands defined in
     `packages/cli/component.yaml` actually ran (grep for
     `pnpm exec turbo run test --filter=./` and similar).
   - No deploy step ran. No `wrangler deploy` invocation. No
     Cloudflare API calls.
   - No secret material printed to logs.

3. Idempotent re-run sanity: if PR-CI was triggered more than once,
   the latest run is the one that counts. Document the run ID.

If any required check is failing or any deploy step ran, **FAIL**.

---

## Phase 6 — Squash Merge + Post-Merge Watch

Only if Phases 1–5 all pass.

1. If a small verification-only fix is needed (e.g., the
   implementer report still has a stale placeholder, or the
   verifier needs to commit `ai/reports/task-0100-verifier.md`
   to the PR branch to keep history together), commit and push
   to `impl/task-0100-packages-cli-scaffold`. Wait for PR-CI to
   re-green. Otherwise skip.
2. Squash merge:
   ```sh
   gh pr merge <PR#> --squash --delete-branch
   ```
   If the branch is `BEHIND` and the repo's auto-merge is disabled,
   use `--admin` (matches the Task 0098 / 0099 / 0095.1 cadence).
   Document which path was taken.
3. Sync local `main`:
   ```sh
   git checkout main
   git pull --ff-only origin main
   git status --short   # must be empty
   ```
4. Watch post-merge main-CI:
   ```sh
   gh run list --branch main --limit 5
   gh run watch <run-id>
   ```
   Required: 4/4 SUCCESS on plan + `cli · {dev,stage,prod} · Verify`.
   Record the run ID and conclusion in the verifier report. If main
   CI fails, **FAIL** the verifier report (do not silently ignore;
   open-risks must be updated).
5. Resource verification: Task 0100 creates **no** Cloudflare,
   Supabase, AWS, or Terraform resources. The "verify provider
   state" requirement from `agents/orchestrator.md` is satisfied
   trivially — record the explicit no-op in the verifier report.

---

## Phase 7 — Bookkeeping (PASS path)

1. Write `ai/reports/task-0100-verifier.md` with sections:
   - **Result**: PASS
   - **Checks**: enumerate Phases 1–6 with one line each per gate
     (PR sanity, hazard scan, boundary scan, local typecheck/lint/
     test/build, repo-wide lint baseline preserved at 45 warnings,
     POSIX file mode, Orun validate/plan/dry-run, PR-CI 4/4,
     post-merge main-CI 4/4 with run ID).
   - **Issues**: any non-blocking observations.
   - **Risk Notes**: residual risk for Task 0101 fan-out (e.g.,
     "device-flow endpoint not yet on api-edge → Task 0101 must
     keep token-paste fallback as the default until the endpoint
     ships").
   - **Spec Proposals**: link only if the implementer filed one.
   - **Recommended Next Move**: scope **Task 0101 — CLI
     write-command fan-out** (see "Task 0101 Stub" at the bottom
     of `ai/context/current.md` after this task lands), and
     **Task 0096f** verifier resumption when its implementer
     opens the PR.

2. Update `ai/state.json`:
   - Append `"0100"` to `completed`.
   - Set `current_task` to `"0101"` (if scoped) or to a placeholder
     pending orchestrator scoping pass.
   - Set `repo_health` to `"green"`.
   - Update `task_agent` to point at the next runnable task spec.
   - Set `last_verified` to the current ISO timestamp.
   - Append a `notes` entry summarising: PR # squash hash, post-
     merge main-CI run ID, framework + auth-flow choices, total
     it() count, lint residual.

3. Append a Task 0100 entry to `ai/context/task-ledger.md`
   (verified and merged, with PR # and squash hash).

4. Update `ai/context/current.md`:
   - Move "Task 0100" from "Current Task" to "What just landed".
   - Promote Task 0101 to "Current Task" if scoped, else mark
     "Awaiting orchestrator scoping for Task 0101".
   - Refresh "Track B4 status" to note second-half foundation
     landed; closure pending Task 0101.

5. Commit verifier artefacts to `main`:
   ```sh
   git add ai/reports/task-0100-verifier.md ai/context/task-ledger.md \
           ai/context/current.md ai/state.json
   git commit -m "housekeeping: close Task 0100 (PR #<N> merged, packages/cli scaffold + auth + pilot read-only commands, B4 second-half foundation)"
   git push origin main
   ```

6. `git status --short` must be empty when finished. If any local
   verifier-created changes remain, resolve them before ending.

---

## Phase 7 (FAIL path)

If any phase fails:

1. Leave the PR open. Do NOT merge.
2. Write `ai/reports/task-0100-verifier.md` with:
   - **Result**: FAIL
   - **Checks**: enumerate which phases passed and which failed.
   - **Issues**: each blocker with the exact command, expected
     output, observed output, and minimal repro path.
   - **Spec Proposals**: file at `ai/proposals/task-0100-spec-update.md`
     if the failure indicates spec drift (unlikely; spec 13 is
     stable).
   - **Recommended Next Move**: either "implementer fix-up on same
     PR" (preferred — same branch, additive commit) or "scope
     Task 0100.1 fix-up" if the gap is structural.
3. Commit the verifier report to the PR branch (so history stays
   together):
   ```sh
   gh pr checkout <PR#>
   git add ai/reports/task-0100-verifier.md
   git commit -m "verifier: FAIL Task 0100 — <one-line reason>"
   git push
   ```
4. Update `ai/state.json` only insofar as `repo_health` may move
   to `"yellow"`; do NOT add 0100 to `completed`.
5. `gh pr comment <PR#> --body-file ai/reports/task-0100-verifier.md`
   so the implementer sees the blockers in the PR thread.

Never merge a PR with unresolved verification blockers.

---

## Verifier Pitfalls (sealed reminders)

- **`keytar` static import would crash CI**: if the implementer
  imports keytar at the top of any module that the test suite
  loads, `vitest` will fail on environments without native build
  tools. Phase 3 step 4 (`pnpm --filter @saas/cli test` exit 0) is
  the load-bearing check, but Phase 2 step 3 catches it earlier.
- **Lint warning leak from CLI**: the 45-warning baseline is
  exactly `tests/api-edge`. If the global count drifts to 46+,
  bisect with `pnpm --filter <each cli test file> lint` to confirm
  the new warning is from `packages/cli/**` before failing.
- **`component.yaml` profile drift**: the SDK ships `quick-check`
  on dev/stage/prod with no apply lanes. Any apply lane on CLI is
  out of scope for this PR (and would imply Cloudflare deploy,
  which CLI must not do).
- **`pnpm-lock.yaml` churn**: a clean install of `keytar` as an
  optional dep + the chosen framework can produce a sizeable
  lockfile delta. That's expected; do NOT fail on lockfile size.
  Do fail if the lockfile introduces a new top-level workspace
  runtime dep that did not exist on `main` snapshot
  `c5dbd992883f687febbdf78410e551d6fbe5b64e` (constraint §4).
- **Test count drift**: spec asks for ≥ 30 it()s across the listed
  test files. Use `grep -c "it(" packages/cli/src/__tests__/*.test.ts`
  rather than trusting the implementer report's number — count
  yourself.
- **Sealed-snapshot drift**: if the implementer rebased the branch
  past the sealed `main` snapshot and incidentally touched files
  outside `packages/cli/**`, that's an immediate Phase 2 FAIL
  unless the rebase is a clean merge with no semantic conflict
  (consult `git log --oneline main..HEAD` — only Task 0100 commits
  should appear).
- **Stripe-parity regression**: Task 0100 must NOT introduce a
  transparent idempotency-generation layer (constraint §3). Even
  though no write commands ship in this PR, scan
  `packages/cli/src/**` for `randomUUID()` / `crypto.randomUUID`
  calls in any code path that constructs request options. If
  found and not gated behind explicit `--idempotency-key` user
  input, **FAIL** (otherwise Task 0101 would inherit the regression
  by accident).
