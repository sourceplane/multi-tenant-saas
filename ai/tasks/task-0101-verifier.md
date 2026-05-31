# Task 0101 Verifier

Agent: Verifier

This prompt is **sealed at scoping time** and activates the moment the
Task 0101 implementer opens (or has already opened) a PR for the CLI
write/cross-read fan-out. Run the seven phases below in order. Do not
expand scope into Task 0096f territory, future Task 0102 territory, or
any other workspace.

## Sealing Snapshot

- Sealed at: 2026-05-31
- `main` snapshot at scoping: post-`5cf36d9` (Task 0100 squash); current
  HEAD `8a9a771` is the orchestrator scoping commit on `main` (housekeeping
  Task 0100 close). The implementer branched before this commit landed; a
  rebase / fast-forward is acceptable.
- Implementer prompt: `ai/tasks/task-0101.md`
- Implementer report: `ai/reports/task-0101-implementer.md`
- **Branch (as shipped):** `feat/cli-task-0101-write-and-cross-read-commands`
  (the prompt suggested `impl/task-0101-cli-command-fanout`; the
  implementer used a different convention. This is acceptable — the prompt
  treats branch name as latitude as long as the branch is single-purpose
  and tracks back to Task 0101). Document the actual branch in the
  verifier report.
- PR: #155.
- Verifier report: `ai/reports/task-0101-verifier.md`
- Mirror reference (turbo-package quick-check shape):
  `packages/cli/component.yaml` (must be unchanged in this PR).
- Lint baseline at scoping: `pnpm -r --no-bail lint` exit 0 with **≤ 45
  residual warnings**, ALL in `tests/api-edge` (Task 0096f territory).
  CLI workspace must contribute **0**.
- Spec gaps surfaced by the implementer: TWO. Both are SDK-side.
  Proposal files MUST exist on disk before this verifier can PASS:
  - `ai/proposals/task-0101-spec-update-environments-client.md`
  - `ai/proposals/task-0101-spec-update-audit-pagination.md`
  Both were authored by the orchestrator at scoping time, so they are
  expected to be present on `main` already. If for any reason they are
  missing on the PR branch's merge-base, the verifier MUST stop and
  flag this in Phase 1 — proposals are how unauthorized SDK-surface
  drift gets recorded.

## Out-Of-Scope Territory

Do NOT inspect, comment on, or block on any of:

- `tests/api-edge/**` (Task 0096f / parallel)
- `apps/**` (no consumer or contract drift permitted in this PR)
- `packages/sdk/**` — **read-only** for this verifier. Task 0101 must NOT
  edit the SDK. Any diff under `packages/sdk/**` other than `pnpm-lock.yaml`
  fallout is an immediate **FAIL** in Phase 2. The two SDK-gap proposals
  (above) describe Task 0102 territory.
- `packages/contracts/**`, `packages/db/**`
- `infra/terraform/cloudflare-domain/**` and the cloudflare provider pin
  (deferred 0085b)
- `apps/notifications-worker/**` (deferred provider-swap and dev-reframe)
- `tooling/eslint/**` (sealed since Task 0092)

If the PR diff touches any of the above (other than `pnpm-lock.yaml` and a
workspace-deps update strictly necessary to install / link `packages/cli`
deps), that is an immediate **FAIL** in Phase 2 with no further investigation.

## Latitude Exercised By Implementer (per task-0101.md)

- Splitting tests across `commands.test.ts` vs a new `commands.write.test.ts`
  / `commands.crossread.test.ts` / `writes-and-cross-reads.test.ts`. The
  implementer shipped `writes-and-cross-reads.test.ts` (single new file) —
  accept whichever shape is shipped, provided total `it()` count under
  `packages/cli/src/__tests__/**` is ≥ 81.
- SDK method picks for `usage summary` / `billing summary` — accept
  whichever method the implementer chose, provided the report records the
  picked method + signature.
- `audit list --all` JSON shape (NDJSON vs single buffered envelope) —
  accept whichever, provided the report documents the choice and at least
  one test asserts the chosen shape end-to-end.
- Branch name (see Sealing Snapshot above).

Verifier MUST NOT require a particular SDK method or a particular JSON
pagination shape. Verifier MUST require Stripe-parity (caller-owned
idempotency-key, no CLI-side generation), public-API-only consumption, and
zero new hazards under `packages/cli/**`.

---

## Phase 1 — PR Sanity

1. `gh pr view 155 --json
   number,title,headRefName,baseRefName,state,mergeStateStatus,
   isDraft,statusCheckRollup,files`
2. Confirm:
   - `headRefName` == `feat/cli-task-0101-write-and-cross-read-commands`
     (or whatever the implementer recorded; document the actual value).
   - `baseRefName` == `main`.
   - `state` == `OPEN`.
   - `isDraft` == `false`.
   - `mergeStateStatus` ∈ {`CLEAN`, `UNSTABLE` while CI runs} — not
     `BLOCKED` / `DIRTY` / `BEHIND`.
3. Confirm files list contains:
   - `ai/reports/task-0101-implementer.md`
   - At least one new file under `packages/cli/src/commands/` for writes.
   - At least one new file under `packages/cli/src/commands/` for
     cross-reads.
   - At least one new test file under `packages/cli/src/__tests__/`.
   - `packages/cli/README.md` (touch-up expected per prompt).
   - `pnpm-lock.yaml` only if a new devDep is genuinely needed (prompt
     prefers none — flag any new top-level runtime dep).
   - …and **nothing outside** `packages/cli/**` and
     `ai/reports/task-0101-implementer.md` (and the lockfile if needed).
4. Confirm the implementer report has a real `PR Number:` (no `TBD`,
   no `#[PR]`, no `BLOCKED` unless genuinely a blocker filing).
5. Confirm the implementer report records:
   - SDK methods picked for `usage summary` and `billing summary`.
   - `audit list --all` JSON shape decision (NDJSON vs single envelope).
   - Total `it()` count across `packages/cli/src/__tests__/**` (must be
     ≥ 81; orchestrator-counted target).
   - Any spec proposals filed (the two SDK-gap proposals listed in the
     Sealing Snapshot above MUST be referenced).
6. Confirm both proposal files are present on the PR branch:
   - `ai/proposals/task-0101-spec-update-environments-client.md`
   - `ai/proposals/task-0101-spec-update-audit-pagination.md`
   If either is missing, **FAIL** — the implementer (or the orchestrator
   bookkeeping commit) lost track of the SDK-drift record.

If any check fails → **FAIL** with the reason. Do not proceed.

---

## Phase 2 — Hazard + Boundary Scan

1. Hazard scan (zero lines required outside `__tests__/`):
   ```sh
   grep -RnE '(eslint-disable|@ts-ignore|@ts-expect-error|as unknown as|\bas any\b)' \
     packages/cli/src/ \
     | grep -v node_modules | grep -v dist | grep -v __tests__
   ```
   Expect: **no output**. Any hit → **FAIL**.

2. Stripe-parity / idempotency-key generation scan (the load-bearing
   regression guard for B4 closure):
   ```sh
   grep -RnE '(crypto\.randomUUID|Math\.random|randomUUID\()' \
     packages/cli/src/ \
     | grep -v node_modules | grep -v dist
   ```
   Expect: **no output** in any path that constructs SDK call options or
   request bodies. If any match exists at all in non-test code, read the
   matching file and confirm it is NOT used to fabricate an
   `Idempotency-Key`. If the CLI fabricates a key when the user did not
   pass `--idempotency-key`, **FAIL** — Task 0101 cannot ship a transparent
   generation layer that the spec/SDK forbids.

3. Boundary scan — confirm CLI imports only the public API:
   ```sh
   grep -RnE "from ['\"](apps/|packages/db|@saas/db|workers/|packages/contracts/src/[^']+/internal)" \
     packages/cli/src \
     | grep -v node_modules
   ```
   Expect: **no output**. Any hit → **FAIL**.

   Allowed imports: `@saas/sdk`, `@saas/contracts` (top-level types only),
   `node:*` (CLI binary is Node-only), and `keytar` via lazy/dynamic
   import (unchanged from Task 0100).

4. SDK-edit guard:
   ```sh
   git diff --name-only origin/main...HEAD -- packages/sdk
   ```
   Expect: **no output**. Any file under `packages/sdk/**` in the diff →
   **FAIL** with "Task 0101 must not edit @saas/sdk; SDK gaps go to
   ai/proposals/task-0101-spec-update-*.md and ship as Task 0102".

5. Contracts-edit guard:
   ```sh
   git diff --name-only origin/main...HEAD -- packages/contracts apps
   ```
   Expect: **no output**. Any hit → **FAIL**.

6. `transport.fetchImpl` / `transport.request` audit on the CLI side:
   The implementer report acknowledges TWO bypass paths
   (`env create` via `transport.request`, `audit list --all` via
   `transport.fetchImpl`). These are acceptable for THIS PR because the
   `Transport` is a documented public export and the caller-owned
   idempotency-key invariant is preserved. Verifier MUST:
   - Confirm `transport.request` and `transport.fetchImpl` calls in
     `packages/cli/src/commands/**` are annotated with a comment pointing
     at the relevant proposal file.
     ```sh
     grep -RnE 'transport\.(request|fetchImpl|baseUrl|defaultHeaders|auth)' \
       packages/cli/src/commands
     ```
   - Confirm each match either (a) does NOT construct an `Idempotency-Key`
     header at all (reads), or (b) forwards the user-supplied key verbatim
     (writes). Read the matching file and check.
   - Confirm no other CLI module reaches into `transport.*` (only the two
     annotated workaround sites).
   If a `transport.*` call appears outside the two documented sites
   without an annotation pointing at the proposal, **FAIL**.

7. `keytar` invariant unchanged from Task 0100:
   - `packages/cli/package.json` still lists `keytar` under
     `optionalDependencies`.
   - No new static `import keytar` at module top level.

If any check fails → **FAIL** with the reason. Do not proceed.

---

## Phase 3 — Local Quality Gates

Run from the PR branch (`gh pr checkout 155`). All commands must exit 0
unless explicitly noted.

1. `pnpm install` (frozen-lockfile if no lockfile delta; otherwise plain
   install — document which path).
2. `pnpm --filter @saas/cli typecheck` — exit 0.
3. `pnpm --filter @saas/cli lint` — exit 0 with **0 warnings**.
4. `pnpm --filter @saas/cli test` — exit 0; record the `it()` total under
   `packages/cli/src/__tests__/**`. Use:
   ```sh
   grep -RcE "^\s*it\(" packages/cli/src/__tests__/*.test.ts | awk -F: '{s+=$2} END {print s}'
   ```
   Must be **≥ 81** (Task 0100 baseline 51 + ≥ 30 new). Record the exact
   count in the verifier report.
5. `pnpm --filter @saas/cli build` — exit 0; confirm
   `packages/cli/dist/cli.js` still starts with `#!/usr/bin/env node`.
6. CLI smoke test — help text covers the new commands:
   ```sh
   node packages/cli/dist/cli.js --help | grep -E '(org invite|project create|env create|api-key create|webhook create|usage summary|billing summary|audit list)'
   ```
   All eight strings must appear at least once.
7. **Repo-wide gates** (Task 0091 + Task 0099 + Task 0100 baselines preserved):
   - `pnpm -r typecheck` — exit 0.
   - `pnpm -r --no-bail lint` — exit 0 with **≤ 45 residual warnings**,
     ALL in `tests/api-edge` (Task 0096f territory). Any new warnings
     outside `tests/api-edge/**` → **FAIL**. CLI must contribute **0**.

8. `--idempotency-key` passthrough proof — at least one test per write
   command asserts the SDK was called with the user-supplied key
   verbatim. Spot-check by grep:
   ```sh
   grep -RnE 'idempotencyKey' packages/cli/src/__tests__
   ```
   Read the matching tests; confirm the captured SDK call options
   contain the literal user-supplied key (e.g. `"my-key-123"` →
   `expect(call.options.idempotencyKey).toBe("my-key-123")`). If no
   write-command test asserts this, **FAIL** (Stripe-parity regression
   not covered).

9. `webhook create` deterministic suffix invariant — if the implementer
   ships a multi-call webhook flow (root POST + N subscription POSTs),
   confirm the per-subscription idempotency key is a deterministic
   suffix of the user's root key (`KEY:sub:0`, `KEY:sub:1`, …), NOT a
   newly generated UUID. The implementer report calls this out
   explicitly; verify with a test grep:
   ```sh
   grep -RnE ':sub:[0-9]' packages/cli/src/
   ```
   At least one match in the commands path; at least one matching test.

10. `audit list --all` cursor-loop guard — confirm a test exists that
    feeds a misbehaving server (cursor loop or > N pages) and asserts
    the CLI terminates without infinite looping. Spot-check:
    ```sh
    grep -RnE '(seenCursors|maxPages|1000)' packages/cli/src/
    ```
    Match expected; if absent, request the test be added before merge.

---

## Phase 4 — Orun Validation

Run from repo root (using `/Users/irinelinson/.local/bin/kiox` if `kiox`
is not on `PATH`):

1. `kiox -- orun validate --intent intent.yaml` — exit 0.
2. `kiox -- orun component --intent intent.yaml --long` — confirm `cli`
   still listed with `domain: starter-cli`, `type: turbo-package`, and
   the same profile shape as `packages/sdk/component.yaml`.
3. `kiox -- orun plan --changed --intent intent.yaml --output plan.json`
   — exit 0; plan includes `cli · {dev,stage,prod} · Verify`.
4. `kiox -- orun run --plan plan.json --dry-run --runner github-actions`
   — exit 0; rendered Verify YAML mirrors the SDK shape (no apply lanes,
   no Cloudflare deploy step, no wrangler call).
5. `packages/cli/component.yaml` byte-shape diff vs Task 0100:
   ```sh
   git diff origin/main -- packages/cli/component.yaml
   ```
   Expect: **no diff** (this PR only adds CLI command source + tests +
   README; component.yaml is locked from Task 0100). Any diff → **FAIL**
   unless implementer report explains it AND rationale is reasonable.

If any step fails → **FAIL** with the reason.

---

## Phase 5 — PR-CI Log Inspection

1. `gh pr checks 155` — confirm rollup green. Required jobs (4, mirroring
   SDK / Task 0100 shape):
   - plan
   - `cli · dev · Verify`
   - `cli · stage · Verify`
   - `cli · prod · Verify`

2. For each `cli · <env> · Verify` job, fetch logs with
   `gh run view <run-id> --log` and confirm:
   - `pnpm install` succeeded.
   - The build / typecheck / test commands defined in
     `packages/cli/component.yaml` actually ran (grep
     `pnpm exec turbo run test --filter=./` and similar).
   - **No deploy step ran.** No `wrangler deploy`. No Cloudflare API call.
   - No secret material printed to logs (no token, no API-key payload, no
     `idempotencyKey: "<actual-uuid-leak>"`).

3. Idempotent re-run sanity: latest run is the one that counts. Document
   the run ID(s) in the verifier report.

If any required check is failing or any deploy step ran, **FAIL**.

---

## Phase 6 — Squash Merge + Post-Merge Watch

Only if Phases 1–5 all pass.

1. If a small verification-only fix is needed (e.g., the implementer
   report needs a final sentence, or the verifier needs to commit
   `ai/reports/task-0101-verifier.md` to the PR branch to keep history
   together), commit and push to the PR branch. Wait for PR-CI to
   re-green. Otherwise skip.

2. Squash merge:
   ```sh
   gh pr merge 155 --squash --delete-branch
   ```
   If the branch is `BEHIND` and the repo's auto-merge is disabled, use
   `--admin` (matches Task 0098 / 0099 / 0100 cadence). Document which
   path was taken.

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
   Record the run ID and conclusion in the verifier report. If main CI
   fails, **FAIL** the verifier report (do not silently ignore;
   open-risks must be updated).

5. Resource verification: Task 0101 creates **no** Cloudflare, Supabase,
   AWS, or Terraform resources. The "verify provider state" requirement
   from `agents/orchestrator.md` is satisfied trivially — record the
   explicit no-op in the verifier report.

---

## Phase 7 — Bookkeeping (PASS path)

1. Write `ai/reports/task-0101-verifier.md` with sections:
   - **Result**: PASS
   - **Checks**: enumerate Phases 1–6 with one line each per gate
     (PR sanity, hazard scan, boundary scan, SDK-edit guard,
     transport.* audit, local typecheck/lint/test/build with exact
     it() count, repo-wide lint baseline preserved at ≤ 45 warnings
     all `tests/api-edge`, idempotency-key passthrough proof, audit
     `--all` cursor guard, Orun validate/plan/dry-run, PR-CI 4/4,
     post-merge main-CI 4/4 with run ID).
   - **Issues**: any non-blocking observations (the two `transport.*`
     bypass sites; both are pre-paired with proposals).
   - **Risk Notes**:
     - SDK-gap residual: `EnvironmentsClient` and audit-pagination
       iterator are not yet on `@saas/sdk`. Task 0102 must close both
       and remove the two `transport.*` workaround sites in the CLI.
     - Track B4 closes when Task 0102 lands (or when the user explicitly
       declares B4 closed at the current state with the SDK gaps logged
       as Task 0102 backlog — recommend closing B4 only after Task 0102).
   - **Spec Proposals**:
     - `ai/proposals/task-0101-spec-update-environments-client.md`
     - `ai/proposals/task-0101-spec-update-audit-pagination.md`
   - **Recommended Next Move**: scope **Task 0102 — `@saas/sdk`
     `EnvironmentsClient` + audit-pagination iterator + CLI
     re-wiring** (orchestrator pre-scoped at
     `ai/tasks/task-0102.md`), and Task 0096f verifier resumption
     when its implementer opens the PR.

2. Update `ai/state.json`:
   - Append `"0101"` to `completed`.
   - Set `current_task` to `"0102"` (orchestrator scope present at
     `ai/tasks/task-0102.md`).
   - Set `repo_health` to `"green"`.
   - Update `task_agent` to `"ai/tasks/task-0102.md"`.
   - Set `last_verified` to the current ISO timestamp.
   - Append a `notes` entry summarising: PR # squash hash, post-merge
     main-CI run ID, SDK methods picked, audit-`--all` JSON shape,
     total `it()` count, lint residual, two `transport.*` workaround
     sites + linked proposal files.

3. Append a Task 0101 entry to `ai/context/task-ledger.md` (verified and
   merged, with PR # and squash hash, plus the two proposals).

4. Update `ai/context/current.md`:
   - Move "Task 0101" from "Current Task" to "What just landed".
   - Promote Task 0102 to "Current Task".
   - Refresh "Track B4 status" — second-half closure landed for the CLI
     command surface; full B4 closure pending Task 0102 SDK gap closure.

5. Update `ai/context/decisions.md`:
   - Record: "CLI write commands forward caller-supplied
     `--idempotency-key` verbatim; CLI never auto-mints a key. Webhook
     multi-call flows derive sub-keys deterministically as
     `KEY:sub:N`."
   - Record the audit `--all` JSON output shape decision (NDJSON or
     single buffered envelope, whichever shipped).

6. Commit verifier artefacts to `main`:
   ```sh
   git add ai/reports/task-0101-verifier.md ai/context/task-ledger.md \
           ai/context/current.md ai/context/decisions.md ai/state.json
   git commit -m "housekeeping: close Task 0101 (PR #155 merged, CLI write + cross-read fan-out, B4 second-half closure pending Task 0102 SDK gap closure)"
   git push origin main
   ```

7. `git status --short` must be empty when finished.

---

## Phase 7 (FAIL path)

If any phase fails:

1. Leave the PR open. Do NOT merge.
2. Write `ai/reports/task-0101-verifier.md` with:
   - **Result**: FAIL
   - **Checks**: enumerate which phases passed and which failed.
   - **Issues**: each blocker with the exact command, expected
     output, observed output, and minimal repro path.
   - **Spec Proposals**: link the two SDK-gap proposals plus any new
     proposal filed by this verifier pass.
   - **Recommended Next Move**: either "implementer fix-up on same PR"
     (preferred — same branch, additive commit) or "scope Task 0101.1
     fix-up" if the gap is structural.
3. Commit the verifier report to the PR branch (so history stays
   together), push, and `gh pr comment 155 --body-file
   ai/reports/task-0101-verifier.md` so the implementer sees the
   blockers in the PR thread.
4. Update `ai/state.json` only insofar as `repo_health` may move to
   `"yellow"`; do NOT add 0101 to `completed`.

Never merge a PR with unresolved verification blockers.

---

## Verifier Pitfalls (sealed reminders)

- **Stripe-parity regression on writes**: the load-bearing invariant.
  If `crypto.randomUUID` / `Math.random` / equivalent is used anywhere in
  the CLI's write code path to construct a default `Idempotency-Key`, that
  is an immediate FAIL. Even a "fallback for unattended automation" is a
  regression — the SDK contract requires caller-owned idempotency.
- **Webhook sub-key derivation**: if the implementer ships a multi-call
  webhook flow but uses random per-subscription keys instead of a
  deterministic `KEY:sub:N` suffix, retry-after-partial-failure is
  unsafe. Confirm the deterministic shape and that a test asserts it.
- **`audit list --all` infinite loop**: a misbehaving server can return
  the same cursor forever. The CLI workaround installs a 1000-page cap
  + `seenCursors` Set. If either guard is missing or untested, FAIL.
- **`transport.*` boundary creep**: the only acceptable bypass sites are
  the two documented in the proposals (`env create`, `audit list --all`).
  Any other `transport.request` / `transport.fetchImpl` call from the
  CLI is unauthorized scope and must be either reverted or covered by a
  third proposal file before merge.
- **Lint warning leak from CLI**: the ≤ 45-warning baseline is exactly
  `tests/api-edge`. If the global count drifts to 46+, bisect with
  per-file lint to confirm the new warning is from `packages/cli/**`
  before failing.
- **`component.yaml` profile drift**: the CLI ships `quick-check` on
  dev/stage/prod with no apply lanes. Any apply lane on CLI is out of
  scope (and would imply Cloudflare deploy, which CLI must not do).
- **`pnpm-lock.yaml` churn**: small lockfile delta is OK if a new devDep
  is genuinely needed. Fail if a new top-level workspace runtime dep is
  introduced.
- **Branch-name latitude**: the prompt suggested
  `impl/task-0101-cli-command-fanout` but the implementer used
  `feat/cli-task-0101-write-and-cross-read-commands`. This is acceptable;
  document the actual branch in the verifier report and merge as-is.
- **SDK edit drift**: any diff under `packages/sdk/**` other than
  `pnpm-lock.yaml` resolution is FAIL. SDK gaps go to Task 0102.
