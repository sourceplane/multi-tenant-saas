# Task 0102 Verifier

Agent: Verifier

This prompt is **sealed at scoping time** and activates the moment the
Task 0102 implementer's PR is unblocked (rebased onto `main`). Run the
seven phases below in order. Do not expand scope into Task 0096f
territory, Task 0103 territory, or any other workspace.

## Sealing Snapshot

- Sealed at: 2026-05-31 (orchestrator close pass after Task 0101 +
  Task 0102 implementer phases shipped concurrently).
- `main` snapshot at sealing: post-Task 0100 squash `5cf36d9`, plus the
  orchestrator bookkeeping commit that lands the Task 0101 verifier
  prompt + Task 0102 task prompt + Task 0102 verifier prompt + the
  two SDK-gap proposals on `main`. PR #155 is the predecessor; PR #156
  is stacked on PR #155.
- Implementer prompt: `ai/tasks/task-0102.md`
- Implementer report: `ai/reports/task-0102-implementer.md`
- **Branch (as shipped):** `impl/task-0102-sdk-environments-and-audit-iterator`
- **PR:** #156, currently `baseRefName == feat/cli-task-0101-write-and-cross-read-commands`.
  This is **stacked-on-stacked**. The verifier MUST rebase / re-target to
  `main` BEFORE Phase 5 (see Phase 0 below). The current PR-CI `plan` job
  is failing with `no trigger binding matched github event pull_request
  action opened` precisely because the PR is targeted at a non-`main`
  base. That failure is expected and resolves with the rebase.
- Verifier report: `ai/reports/task-0102-verifier.md`
- Mirror reference (turbo-package quick-check shape):
  `packages/sdk/component.yaml` and `packages/cli/component.yaml`. Both
  must be **byte-identical** in this PR vs `main` (zero component.yaml
  edits — Task 0102 is pure source + tests + lockfile fallout).
- Lint baseline at sealing: `pnpm -r --no-bail lint` exit 0 with **≤ 45
  residual warnings**, ALL in `tests/api-edge` (Task 0096f territory).
  SDK + CLI must contribute **0**.
- The two SDK-gap proposals MUST exist on `main` at merge-base:
  - `ai/proposals/task-0101-spec-update-environments-client.md`
  - `ai/proposals/task-0101-spec-update-audit-pagination.md`
  Task 0102 implements both. After Phase 6 merge, the verifier records
  the proposals as RESOLVED in the verifier report.

## Out-Of-Scope Territory

Do NOT inspect, comment on, or block on any of:

- `tests/api-edge/**` (Task 0096f / parallel)
- `apps/**` (no consumer or contract drift permitted in this PR)
- `packages/contracts/**`, `packages/db/**`
- `infra/terraform/cloudflare-domain/**` and the cloudflare provider
  pin (deferred 0085b)
- `apps/notifications-worker/**` (deferred provider-swap and
  dev-reframe)
- `tooling/eslint/**` (sealed since Task 0092)

If the PR diff touches any of the above (other than `pnpm-lock.yaml`
fallout strictly necessary to install / link new SDK additions), that
is an immediate **FAIL** in Phase 2 with no further investigation.

## Latitude Exercised By Implementer (per task-0102.md)

- **Transport envelope-aware helper shape** (e.g.
  `Transport.requestWithEnvelope<T>()` returning
  `{ data, meta: { requestId, cursor? } }`). Accept whichever shape is
  shipped, provided the existing `Transport.request<T>()` contract is
  unchanged and at least one test asserts the new helper preserves
  `meta.cursor` end-to-end.
- **Single-page primitive shape** for audit reads — implementer may
  expose `EventsClient.listAuditEntriesPage(...)` returning
  `{ entries, cursor }` (or any equivalent). Accept whichever, provided
  the iterator is built on top of it.
- **Iterator return shape** — `AsyncIterable<PublicAuditEntry>` is the
  canonical shape per the proposal. Accept variants (e.g. an explicit
  `AsyncIterableIterator` with `.return()`) provided the contract
  (`for await` consumption, page-cap guard, `seenCursors` guard) holds.
- **Test file split** — implementer may extend `events.test.ts` in
  place or split iterator tests into a new file. Accept whichever,
  provided iterator coverage gates of Phase 3 are met.
- **Branch name** — `impl/task-0102-sdk-environments-and-audit-iterator`
  per as-shipped record.

Verifier MUST NOT require a particular helper shape or iterator class
name. Verifier MUST require Stripe-parity (caller-owned idempotency-key
on `environments.create` and `environments.archive`, no SDK-side
generation), `encodeURIComponent` on every dynamic segment, public-API
preservation (existing `Transport.request<T>` and
`EventsClient.listAuditEntries` shapes unchanged), and zero new hazards
under `packages/sdk/**` and `packages/cli/**`.

---

## Phase 0 — Stacked-PR Rebase (PRECONDITION)

PR #156 was opened against `feat/cli-task-0101-write-and-cross-read-commands`
(Task 0101's PR branch). The plan job currently fails with
`no trigger binding matched github event pull_request action opened`
because the change-detection plan is configured for `main`-targeted PRs.

**Order of operations (non-negotiable):**

1. Confirm Task 0101 (PR #155) has merged successfully and post-merge
   main-CI is 4/4 green. If not, STOP — Task 0101 verifier must close
   first. Task 0102 verification cannot proceed against a PR whose base
   branch is still in flight.
2. Re-target PR #156 to `main`:
   ```sh
   gh pr edit 156 --base main
   ```
3. Rebase the PR branch onto current `origin/main` (which now contains
   the squashed Task 0101 commit + the orchestrator bookkeeping commit
   + the Task 0101 verifier housekeeping commit):
   ```sh
   gh pr checkout 156
   git fetch origin main
   git rebase origin/main
   git push --force-with-lease
   ```
   If the rebase has conflicts inside `packages/cli/src/commands/writes.ts`
   or `packages/cli/src/commands/cross-reads.ts`, take the Task 0102
   shipped version (it removes the Task 0101 `transport.*` workaround
   sites — that is the whole point of Task 0102). Document the conflict
   resolution in the verifier report.
4. Wait for PR-CI to re-run and confirm `plan` job exits 0 with the
   real-`main` change-detection. If `plan` still fails, STOP and
   investigate before Phase 1.

If Task 0101 is **not yet merged** at the time the verifier picks up
this prompt, the verifier may either (a) wait for Task 0101 to close
(preferred — sequencing is clean) or (b) FAIL with `Recommended Next
Move = "block on Task 0101 merge"` and leave PR #156 open.

---

## Phase 1 — PR Sanity

1. `gh pr view 156 --json
   number,title,headRefName,baseRefName,state,mergeStateStatus,
   isDraft,statusCheckRollup,files`
2. Confirm:
   - `headRefName` == `impl/task-0102-sdk-environments-and-audit-iterator`.
   - `baseRefName` == `main` (after Phase 0 re-target).
   - `state` == `OPEN`.
   - `isDraft` == `false`.
   - `mergeStateStatus` ∈ {`CLEAN`, `UNSTABLE` while CI runs} — not
     `BLOCKED` / `DIRTY` / `BEHIND`.
3. Confirm files list contains:
   - `ai/reports/task-0102-implementer.md`
   - `packages/sdk/src/environments.ts` (NEW)
   - `packages/sdk/src/__tests__/environments.test.ts` (NEW)
   - `packages/sdk/src/events.ts` (modified — iterator + page primitive)
   - `packages/sdk/src/__tests__/events.test.ts` (modified)
   - `packages/sdk/src/transport.ts` (modified — envelope-aware helper)
   - `packages/sdk/src/index.ts` (modified — `client.environments` wiring)
   - `packages/cli/src/commands/writes.ts` (modified — `env create`
     uses `sdk.environments.create`)
   - `packages/cli/src/commands/cross-reads.ts` (modified — `audit list`
     uses `sdk.events.listAuditEntriesPage` / `iterAuditEntries`)
   - `pnpm-lock.yaml` only if a workspace-deps update is genuinely
     needed (no new top-level runtime dep expected).
   - …and **nothing outside** `packages/sdk/**`, `packages/cli/**`, and
     `ai/reports/task-0102-implementer.md` (and the lockfile if needed).
4. Confirm the implementer report has a real `PR Number:` (no `TBD`,
   no `#[PR]`, no `BLOCKED` unless genuinely a blocker filing).
5. Confirm the implementer report records:
   - Final SDK `it()` count (Task 0099 baseline 70 + ≥ 19 new = ≥ 89).
   - Final CLI `it()` count (Task 0101 baseline ≥ 81; CLI behaviour
     unchanged so unit-test count may stay flat).
   - Transport envelope-aware helper shape decision.
   - Iterator page-cap value and `seenCursors` loop-guard shape.
   - Confirmation that
     `grep -RnE 'transport\.(request|fetchImpl)' packages/cli/src/commands`
     returns **no matches** post-PR.
   - Both proposal files marked RESOLVED (one-line each).
6. Confirm both proposal files exist on `main` at merge-base:
   - `ai/proposals/task-0101-spec-update-environments-client.md`
   - `ai/proposals/task-0101-spec-update-audit-pagination.md`
   If either is missing, **FAIL** — orchestrator bookkeeping lost
   track of the SDK-drift record.

If any check fails → **FAIL** with the reason. Do not proceed.

---

## Phase 2 — Hazard + Boundary Scan

1. Hazard scan (zero lines required outside `__tests__/`):
   ```sh
   grep -RnE '(eslint-disable|@ts-ignore|@ts-expect-error|as unknown as|\bas any\b)' \
     packages/sdk/src/ packages/cli/src/ \
     | grep -v node_modules | grep -v dist | grep -v __tests__
   ```
   Expect: **no output**. Any hit → **FAIL**.

2. Stripe-parity / idempotency-key generation scan:
   ```sh
   grep -RnE '(crypto\.randomUUID|Math\.random|randomUUID\()' \
     packages/sdk/src/environments.ts packages/sdk/src/events.ts \
     packages/sdk/src/transport.ts packages/sdk/src/index.ts \
     packages/cli/src/
   ```
   Expect: **no match in any path that constructs an `Idempotency-Key`
   header or a `RequestOptions.idempotencyKey` value**. The existing
   `transport.ts` request-id auto-generation (Task 0098) is OK and
   pre-existing; confirm by reading any match. If
   `EnvironmentsClient.create` / `EnvironmentsClient.archive` mints a
   key when the caller did not supply one, **FAIL**.

3. `encodeURIComponent` audit on `EnvironmentsClient`:
   ```sh
   grep -nE 'encodeURIComponent' packages/sdk/src/environments.ts
   ```
   Expect: **at least one match per dynamic segment** (orgId, projectId,
   envId). Read the file and confirm every URL template uses
   `encodeURIComponent` on every interpolated segment. Any raw
   interpolation (e.g. `` `/v1/organizations/${orgId}/...` `` without
   `encodeURIComponent`) → **FAIL**. Mirror the shape of
   `packages/sdk/src/projects.ts`.

4. Public-API preservation guard — confirm existing exports are
   unchanged in shape:
   ```sh
   git diff origin/main -- packages/sdk/src/transport.ts \
     | grep -E '^[-+] +(export |class |interface |type )'
   git diff origin/main -- packages/sdk/src/events.ts \
     | grep -E '^[-+] +(export |listAuditEntries)'
   git diff origin/main -- packages/sdk/src/index.ts \
     | grep -E '^[-+] +(export |environments|projects)'
   ```
   Expect: existing `Transport.request<T>`, existing
   `EventsClient.listAuditEntries(...)`, and existing `Sourceplane.*`
   client surface remain present and signature-compatible. Pure
   additions (`requestWithEnvelope`, `iterAuditEntries`,
   `listAuditEntriesPage`, `client.environments`) are expected. Any
   removal or signature-narrowing of an existing method → **FAIL**
   (would break Task 0099 / 0100 / 0101 consumers).

5. Boundary scan — confirm SDK has no node-only or apps imports:
   ```sh
   grep -RnE "from ['\"](apps/|packages/db|@saas/db|workers/|node:)" \
     packages/sdk/src \
     | grep -v node_modules | grep -v __tests__
   ```
   Expect: **no output**. SDK must remain runtime-agnostic
   (browser/Node ≥ 20/Workers/Bun). Any `node:*` import in non-test
   code → **FAIL** (regression of Task 0098 invariant).

6. CLI `transport.*` workaround removal proof:
   ```sh
   grep -RnE 'transport\.(request|fetchImpl)' packages/cli/src/commands
   ```
   Expect: **no output**. Any match → **FAIL** with "Task 0102's whole
   point is to remove these; the implementer report must not claim
   removal if greps still hit."

7. Contracts / app drift guard:
   ```sh
   git diff --name-only origin/main...HEAD -- packages/contracts apps
   ```
   Expect: **no output**. Any hit → **FAIL**.

8. Component.yaml lock guard:
   ```sh
   git diff origin/main -- packages/sdk/component.yaml packages/cli/component.yaml
   ```
   Expect: **no diff**. Any diff → **FAIL** unless the implementer
   report explains and the rationale is reasonable (e.g. comment-only
   touch-up).

9. `keytar` invariant unchanged from Task 0100:
   - `packages/cli/package.json` still lists `keytar` under
     `optionalDependencies`.
   - No new static `import keytar` at module top level.

If any check fails → **FAIL** with the reason. Do not proceed.

---

## Phase 3 — Local Quality Gates

Run from the rebased PR branch (post-Phase-0). All commands must
exit 0 unless explicitly noted.

1. `pnpm install` — frozen-lockfile if no lockfile delta; otherwise
   plain install. Document which path.
2. `pnpm --filter @saas/sdk typecheck` — exit 0.
3. `pnpm --filter @saas/sdk lint` — exit 0 with **0 warnings**.
4. `pnpm --filter @saas/sdk test` — exit 0; record the `it()` total
   under `packages/sdk/src/__tests__/**`:
   ```sh
   grep -RcE "^\s*it\(" packages/sdk/src/__tests__/*.test.ts \
     | awk -F: '{s+=$2} END {print s}'
   ```
   Must be **≥ 89** (Task 0099 baseline 70 + ≥ 19 new). Record the
   exact count.
5. `pnpm --filter @saas/sdk build` — exit 0; confirm `.d.ts`
   emission for `environments.ts`.
6. `pnpm --filter @saas/cli typecheck` — exit 0.
7. `pnpm --filter @saas/cli lint` — exit 0 with **0 warnings**.
8. `pnpm --filter @saas/cli test` — exit 0; record the `it()` total
   under `packages/cli/src/__tests__/**`. Must be **≥ 81** (Task 0101
   baseline preserved).
9. `pnpm --filter @saas/cli build` — exit 0; confirm
   `packages/cli/dist/cli.js` still starts with `#!/usr/bin/env node`.
10. **Repo-wide gates**:
    - `pnpm -r typecheck` — exit 0.
    - `pnpm -r --no-bail lint` — exit 0 with **≤ 45 residual
      warnings**, ALL in `tests/api-edge` (Task 0096f territory). Any
      new warning outside `tests/api-edge/**` → **FAIL**. SDK + CLI
      must contribute **0**.

11. Iterator coverage proof — at least one test exercises each of:
    - Multi-page consumption — feed N pages, assert all entries
      observed in order.
    - Single-page termination — `cursor === null` (or `undefined`)
      stops the loop.
    - Page-cap guard — feed > cap pages, assert termination at cap
      (no infinite loop).
    - `seenCursors` loop-guard — feed a repeated cursor, assert
      termination (no infinite loop).
    - Abort-on-error — a fetch failure mid-iteration propagates as
      `SourceplaneError` with `requestId`.
    Spot-check by grep:
    ```sh
    grep -RnE '(maxPages|seenCursors|cursor.*null|requestId)' \
      packages/sdk/src/__tests__/events.test.ts
    ```
    All five guards must be present somewhere in the iterator test
    surface. Read the file to confirm. Missing any guard → **FAIL**.

12. `EnvironmentsClient` coverage proof — at least one test per
    method exercises:
    - URL shape + `encodeURIComponent` on every dynamic segment
      (test with a segment that requires escaping, e.g. a UUID with
      a slash injection or a unicode character).
    - Idempotency-key verbatim passthrough on `create` and `archive`
      (`expect(call.headers['Idempotency-Key']).toBe(callerKey)` or
      equivalent).
    - `SourceplaneError` propagation with `requestId` on a 4xx wire
      response.
    Spot-check:
    ```sh
    grep -RnE '(encodeURIComponent|idempotencyKey|Idempotency-Key|requestId)' \
      packages/sdk/src/__tests__/environments.test.ts
    ```
    All three concerns must be visibly tested.

13. CLI byte-identical behaviour proof — confirm
    `packages/cli/src/__tests__/writes-and-cross-reads.test.ts`
    `it()` count is unchanged or higher vs Task 0101 baseline, and
    the existing CLI output assertions (NDJSON / JSON envelope /
    human table) still pass. The fake SDK in tests must now expose
    `environments.create` and `events.iterAuditEntries` /
    `listAuditEntriesPage` (whichever the implementer wired). Read
    the diff for that test file and confirm only fake-SDK shape
    changed; CLI behaviour assertions are byte-identical.

If any check fails → **FAIL** with the reason. Do not proceed.

---

## Phase 4 — Orun Validation

Run from repo root (using `/Users/irinelinson/.local/bin/kiox` if
`kiox` is not on `PATH`):

1. `kiox -- orun validate --intent intent.yaml` — exit 0.
2. `kiox -- orun component --intent intent.yaml --long` — confirm
   both `sdk` (`domain: starter-sdk`) and `cli` (`domain: starter-cli`)
   listed unchanged.
3. `kiox -- orun plan --changed --intent intent.yaml --output plan.json`
   — exit 0; plan includes `sdk · {dev,stage,prod} · Verify` and
   `cli · {dev,stage,prod} · Verify`.
4. `kiox -- orun run --plan plan.json --dry-run --runner github-actions`
   — exit 0; rendered Verify YAML mirrors Task 0099 / Task 0100 shape
   (no apply lanes, no Cloudflare deploy step, no wrangler call).
5. `component.yaml` byte-shape diff vs main:
   ```sh
   git diff origin/main -- packages/sdk/component.yaml packages/cli/component.yaml
   ```
   Expect: **no diff** (already covered in Phase 2; re-confirm here).

If any step fails → **FAIL** with the reason.

---

## Phase 5 — PR-CI Log Inspection

Only meaningful AFTER Phase 0 rebase has completed and PR-CI has
re-run against `main` as base.

1. `gh pr checks 156` — confirm rollup green. Required jobs:
   - plan
   - `sdk · dev · Verify`
   - `sdk · stage · Verify`
   - `sdk · prod · Verify`
   - `cli · dev · Verify`
   - `cli · stage · Verify`
   - `cli · prod · Verify`

   The plan job determines which Verify jobs are actually required.
   Because both `packages/sdk/**` and `packages/cli/**` change in this
   PR, expect **7 jobs** (1 plan + 3 sdk Verify + 3 cli Verify). If
   change-detection legitimately drops one workspace (e.g. the SDK
   diff is type-only and quick-check skips it), document and accept;
   otherwise demand the full 7.

2. For each `· Verify` job, fetch logs with `gh run view <run-id>
   --log` and confirm:
   - `pnpm install` succeeded.
   - The build / typecheck / test commands defined in the matching
     `component.yaml` actually ran (grep `pnpm exec turbo run test
     --filter=./` and similar).
   - **No deploy step ran.** No `wrangler deploy`. No Cloudflare API
     call.
   - No secret material printed to logs.

3. Document the run ID(s) in the verifier report.

If any required check is failing or any deploy step ran, **FAIL**.

---

## Phase 6 — Squash Merge + Post-Merge Watch

Only if Phases 1–5 all pass.

1. If a small verification-only fix is needed (e.g., the verifier
   commits `ai/reports/task-0102-verifier.md` to the PR branch to
   keep history together), commit and push. Wait for PR-CI to
   re-green. Otherwise skip.

2. Squash merge:
   ```sh
   gh pr merge 156 --squash --delete-branch
   ```
   If the branch is `BEHIND` after Phase 0 rebase (it should not be,
   but rebase + immediate orchestrator commits can race), use
   `--admin` (matches Task 0098 / 0099 / 0100 / 0101 cadence).
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
   Required: 7/7 SUCCESS on plan + sdk · {dev,stage,prod} · Verify +
   cli · {dev,stage,prod} · Verify (or whatever change-detection
   selected). Record the run ID and conclusion. If main CI fails,
   **FAIL** the verifier report.

5. Resource verification: Task 0102 creates **no** Cloudflare,
   Supabase, AWS, or Terraform resources. Record the explicit no-op
   in the verifier report.

---

## Phase 7 — Bookkeeping (PASS path)

1. Write `ai/reports/task-0102-verifier.md` with sections:
   - **Result**: PASS
   - **Checks**: enumerate Phases 0–6 with one line per gate
     (rebase outcome, PR sanity, hazard scan, boundary scan,
     `transport.*` removal proof, public-API preservation,
     local typecheck/lint/test/build with exact `it()` counts for
     SDK and CLI, repo-wide lint baseline preserved at ≤ 45
     warnings all `tests/api-edge`, iterator coverage proof,
     EnvironmentsClient coverage proof, Orun validate/plan/dry-run,
     PR-CI green, post-merge main-CI green with run ID).
   - **Issues**: any non-blocking observations.
   - **Risk Notes**:
     - Track B4 fully CLOSED: every CLI command now dispatches
       through a typed `@saas/sdk` resource client.
     - SDK iterator page-cap is hardcoded; if a real-world audit
       stream exceeds the cap, the iterator silently terminates.
       Recommend documenting the cap in `packages/sdk/README.md`
       and emitting a structured warning at cap-hit (Task 0103
       follow-up candidate).
   - **Spec Proposals**:
     - `ai/proposals/task-0101-spec-update-environments-client.md`
       — RESOLVED in this PR.
     - `ai/proposals/task-0101-spec-update-audit-pagination.md`
       — RESOLVED in this PR.
   - **Recommended Next Move**: scope **Task 0103** — candidate set
     includes (a) optional spec-13 commands (`component list`,
     `resource create`/`get`, `deployment get`), (b) console U10
     (SDK-as-client refactor), (c) Task 0096f verifier resumption
     when its implementer opens the PR. Orchestrator picks the
     highest-leverage candidate.

2. Update `ai/state.json`:
   - Append `"0102"` to `completed`.
   - Set `current_task` to `"0103"` (or to the orchestrator's chosen
     next task ID).
   - Set `repo_health` to `"green"`.
   - Update `task_agent` to the next task prompt path (or to
     `ai/tasks/task-0102-verifier.md` if this is the last write).
   - Set `last_verified` to the current ISO timestamp.
   - Append a `notes` entry summarising: PR #156 squash hash,
     post-merge main-CI run ID, transport envelope-aware helper
     shape, iterator page-cap value, both proposals RESOLVED,
     final SDK + CLI `it()` counts, lint residual.

3. Append a Task 0102 entry to `ai/context/task-ledger.md` (verified
   and merged, with PR #156 squash hash, both proposals resolved,
   Track B4 fully closed).

4. Update `ai/context/current.md`:
   - Move "Task 0102" from "Current Task" to "What just landed".
   - Promote the next chosen task to "Current Task".
   - Refresh "Track B4 status" — fully CLOSED. SDK is feature-complete
     against the api-edge facade route table; every CLI command is
     dispatched through a typed `@saas/sdk` resource client.

5. Update `ai/context/decisions.md`:
   - Record: "SDK exposes `EnvironmentsClient` mirroring
     `ProjectsClient`; caller-owned idempotency-key on `create` and
     `archive`."
   - Record: "SDK exposes `EventsClient.iterAuditEntries`
     (`AsyncIterable<PublicAuditEntry>`) on top of
     `listAuditEntriesPage`; page cap and `seenCursors` loop guard
     prevent infinite iteration on misbehaving servers."
   - Record: "`Transport.requestWithEnvelope<T>()` (or whatever shape
     shipped) is the canonical hook for SDK methods that need
     `meta.cursor`; `Transport.request<T>` continues to drop
     envelope metadata for back-compat."

6. Commit verifier artefacts to `main`:
   ```sh
   git add ai/reports/task-0102-verifier.md ai/context/task-ledger.md \
           ai/context/current.md ai/context/decisions.md ai/state.json
   git commit -m "housekeeping: close Task 0102 (PR #156 merged, EnvironmentsClient + audit iterator, Track B4 fully CLOSED)"
   git push origin main
   ```

7. `git status --short` must be empty when finished.

---

## Phase 7 (FAIL path)

If any phase fails:

1. Leave the PR open. Do NOT merge.
2. Write `ai/reports/task-0102-verifier.md` with:
   - **Result**: FAIL
   - **Checks**: enumerate which phases passed and which failed.
   - **Issues**: each blocker with the exact command, expected
     output, observed output, and minimal repro path.
   - **Spec Proposals**: link the two original SDK-gap proposals
     plus any new proposal filed by this verifier pass.
   - **Recommended Next Move**: either "implementer fix-up on same
     PR" (preferred — same branch, additive commit) or "scope Task
     0102.1 fix-up" if the gap is structural.
3. Commit the verifier report to the PR branch (so history stays
   together), push, and `gh pr comment 156 --body-file
   ai/reports/task-0102-verifier.md` so the implementer sees the
   blockers in the PR thread.
4. Update `ai/state.json` only insofar as `repo_health` may move to
   `"yellow"`; do NOT add 0102 to `completed`.

Never merge a PR with unresolved verification blockers.

---

## Verifier Pitfalls (sealed reminders)

- **Stacked-PR plan failure is expected pre-rebase**: PR #156 was
  opened against `feat/cli-task-0101-write-and-cross-read-commands`.
  The current `plan` failure (`no trigger binding matched github
  event pull_request action opened`) is purely a base-branch
  artefact. Phase 0 rebase resolves it. Do NOT treat the pre-rebase
  failure as a real CI blocker.
- **Stripe-parity regression on EnvironmentsClient**: the load-bearing
  invariant. If `crypto.randomUUID` / `Math.random` is used inside
  `environments.ts` to construct a default `Idempotency-Key`, that
  is an immediate FAIL — caller-owned idempotency is non-negotiable.
- **`encodeURIComponent` drift**: every dynamic segment must be
  encoded. `projects.ts` is the canonical mirror. Any raw template
  interpolation → FAIL.
- **Iterator infinite loop**: missing page cap OR missing
  `seenCursors` guard → FAIL. Both must be tested.
- **Public-API narrowing**: `Transport.request<T>` and
  `EventsClient.listAuditEntries` MUST remain shape-compatible.
  Task 0099 / 0100 / 0101 consumers depend on them.
- **`node:*` regression in SDK**: SDK must remain runtime-agnostic.
  Any `node:*` import in non-test SDK code → FAIL (regresses
  Task 0098 invariant).
- **`pnpm-lock.yaml` churn**: small lockfile delta is OK if a new
  devDep is genuinely needed. FAIL if a new top-level workspace
  runtime dep is introduced under `packages/sdk` or `packages/cli`.
- **CLI `transport.*` workaround removal**: greps under
  `packages/cli/src/commands` for `transport.request` /
  `transport.fetchImpl` MUST return zero matches. The whole point
  of this task is to delete those workaround sites.
- **Component.yaml drift**: both `packages/sdk/component.yaml` and
  `packages/cli/component.yaml` are LOCKED. Any edit → FAIL unless
  the implementer report justifies it.
- **Branch-name latitude**: branch as shipped is
  `impl/task-0102-sdk-environments-and-audit-iterator`. Document
  in the verifier report and merge as-is.
