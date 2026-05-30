# Task 0096f Verifier

Agent: Verifier

This prompt is sealed at scoping time and activates the moment the
Task 0096f implementer opens a PR on branch
`impl/task-0096f-tests-api-edge-class-b`. Run the seven phases below
in order. Do not expand scope into Task 0097 territory or any other
workspace.

## Sealing Snapshot

- Sealed at: 2026-05-30
- `main` snapshot: `2991229286e713cbdc1bdce4ba8e719114161c49`
- Implementer prompt: `ai/tasks/task-0096f.md`
- Implementer report: `ai/reports/task-0096f-implementer.md`
- Branch: `impl/task-0096f-tests-api-edge-class-b`
- Verifier report: `ai/reports/task-0096f-verifier.md`

## Out-Of-Scope Territory

Do NOT inspect, comment on, or block on any of:

- `apps/api-edge/src/**` (Track A / Task 0097)
- `apps/api-edge/scripts/verify-bindings.mjs` (Task 0097)
- `apps/api-edge/wrangler.jsonc` (Task 0097)
- `infra/terraform/cloudflare-kv/**` (Task 0097)
- Any `tests/**` workspace other than `tests/api-edge/`
- `tooling/eslint/**` (sealed)

If the PR diff touches any of the above, that is an immediate
**FAIL** in Phase 2 with no further investigation.

---

## Phase 1 — PR Sanity

1. `gh pr view <PR#> --json
   number,title,headRefName,baseRefName,state,mergeStateStatus,
   isDraft,statusCheckRollup,files`
2. Confirm:
   - `headRefName` == `impl/task-0096f-tests-api-edge-class-b`
   - `baseRefName` == `main`
   - `state` == `OPEN`
   - `isDraft` == `false`
   - `mergeStateStatus` ∈ {`CLEAN`, `UNSTABLE` while CI runs} — not
     `BLOCKED` / `DIRTY` / `BEHIND` (rebase-on-main is the
     implementer's job)
3. Confirm files list contains exactly:
   - `ai/reports/task-0096f-implementer.md`
   - `tests/api-edge/src/org-facade.test.ts`
   - `tests/api-edge/src/project-facade.test.ts`
   - `tests/api-edge/src/auth-facade.test.ts`
   - `tests/api-edge/src/audit-facade.test.ts`
   - `tests/api-edge/src/api-key-routes.test.ts`
   - …and **nothing else**.
4. Confirm the implementer report has a real `PR Number:` (no `TBD`,
   no `#[PR]`).

If any check fails → **FAIL** with the reason. Do not proceed.

---

## Phase 2 — Hazard + Boundary Scan

1. `git fetch origin && git checkout
   impl/task-0096f-tests-api-edge-class-b && git pull --ff-only`
2. Hazard scan on diff side:
   ```
   git diff origin/main -- tests/api-edge/ \
     | grep -E '^\+' \
     | grep -E 'eslint-disable|@ts-ignore|@ts-expect-error|as unknown as'
   ```
   Expect: **no output**. Any match → **FAIL**.
3. Boundary scan: `git diff origin/main --name-only` must list only
   the seven files from Phase 1 step 3. Any file outside
   `tests/api-edge/src/*.test.ts` ∪ `ai/reports/task-0096f-*` →
   **FAIL** (and especially any path matching the Out-Of-Scope
   Territory list at the top).
4. Byte-identical check on the six unchanged files:
   ```
   for f in webhooks-facade idempotency-replay idempotency-edge \
            cors config-facade billing-facade; do
     git diff origin/main -- "tests/api-edge/src/$f.test.ts" | wc -l
   done
   ```
   Expect six zeros. Any non-zero → **FAIL**.

---

## Phase 3 — Local Gates

1. `pnpm install --frozen-lockfile` (only if needed; usually a no-op).
2. `pnpm --filter @saas/api-edge-tests lint` → exit 0, **0 warnings**.
   (Capture the tail of output in the verifier report.)
3. `pnpm --filter @saas/api-edge-tests test` → exit 0, all suites
   green.
4. `pnpm -r typecheck` → exit 0.
5. `pnpm -r --no-bail lint` → exit 0 with **0 residual warnings**
   repo-wide. Capture the residual count line in the verifier report
   ("Track B class-B drain CLOSED globally").
6. Apps-source class-B invariant:
   ```
   pnpm -r --no-bail lint 2>&1 \
     | grep '@typescript-eslint/no-explicit-any\|no-console' \
     | grep -v 'tests/'
   ```
   Expect no output. Any line → **FAIL**.

Any non-zero exit or unexpected residual → **FAIL** with the failing
command and tail.

---

## Phase 4 — Behaviour-Preservation `it()` Count Parity

For each file in `tests/api-edge/src/`, compare it+test counts on
the PR head vs `main` @ `2991229`. Use:

```
for f in org-facade project-facade auth-facade audit-facade \
         api-key-routes webhooks-facade idempotency-replay \
         idempotency-edge cors config-facade billing-facade; do
  pr=$(grep -cE "^\s*(it|test)\(" "tests/api-edge/src/$f.test.ts")
  base=$(git show 2991229:tests/api-edge/src/$f.test.ts \
         | grep -cE "^\s*(it|test)\(")
  printf "%-28s PR=%-4s base=%-4s %s\n" "$f" "$pr" "$base" \
    "$([ "$pr" = "$base" ] && echo OK || echo MISMATCH)"
done
```

Required exact equality (PR == base) on every row. Reference
expected values per the implementer prompt:

- `org-facade.test.ts` = 64
- `project-facade.test.ts` = 42
- `auth-facade.test.ts` = 38
- `audit-facade.test.ts` = 12
- `api-key-routes.test.ts` = 7
- `webhooks-facade.test.ts` = 19
- `idempotency-replay.test.ts` = 12
- `idempotency-edge.test.ts` = 9
- `cors.test.ts` = 37
- `config-facade.test.ts` = 26
- `billing-facade.test.ts` = 16

Total = 252. Any MISMATCH → **FAIL**.

---

## Phase 5 — PR-CI Log Inspection

1. `gh pr checks <PR#>` — collect the rollup. Confirm only `plan` +
   `*-tests · dev · Verify` profiles ran (no deploy-gated jobs,
   because no `apps/**` or `infra/**` files changed).
2. `gh run view <run-id> --log` for the api-edge-tests run; confirm
   `lint` and `test` steps emit the same numbers Phase 3 saw locally
   (warnings = 0, all tests pass).
3. Any red check or unexpected job → **FAIL** with the run URL.

---

## Phase 6 — Squash Merge + Post-Merge Watch

Only enter this phase if Phases 1–5 are PASS.

1. `gh pr merge <PR#> --squash --delete-branch` (or with
   `--admin` if branch protection requires it AND PR-CI is green).
2. After merge:
   - `git checkout main && git pull --ff-only`
   - Confirm clean tree: `git status --short` empty.
   - Capture the squash SHA from `git log -1 --format=%H`.
3. Watch post-merge main-CI:
   ```
   gh run list --branch main --limit 5
   gh run watch <main-run-id>
   ```
   Expect SUCCESS on every job that fires (likely a small `plan` +
   the api-edge-tests profile). Any failure → mark verifier
   **FAIL-after-merge**, file an open-risks entry, and propose a
   revert task.
4. Confirm the working tree is clean and we are on `main` at the
   post-merge SHA.

---

## Phase 7 — State Bookkeeping

Update the following files in a single small commit on `main` (or
fold into the verifier report commit if the orchestrator prefers
batched bookkeeping — match precedent from Tasks 0096c–0096e):

1. `ai/state.json`:
   - Append `"0096f"` to `completed`.
   - Update `next_focus` to reflect Track B globally CLOSED and
     point at Task 0097 (or whatever is in flight).
   - Refresh `last_verified` to the verifier-completion timestamp.
   - Append a one-paragraph note summarizing the merge SHA,
     post-merge main-CI run id, residual warning count (0), and
     invariants held.
   - Set `task_agent` to `ai/reports/task-0096f-verifier.md`.
2. `ai/context/current.md`:
   - Move the "Track B drain summary" table to show
     `tests/api-edge` as **0 (Task 0096f)** in the "After all waves"
     column.
   - Replace the "Current task" pointer to whatever is now in flight
     (Task 0097 if still open).
   - Note "Track B class-B no-explicit-any drain CLOSED globally
     2026-MM-DD".
3. Write `ai/reports/task-0096f-verifier.md` with:
   - **Result**: `PASS` or `FAIL`
   - **Checks** (each phase's commands + outcome)
   - **Issues** (none if PASS; otherwise the failing phase)
   - **Risk Notes** (short — Track A still has Task 0097 in flight
     in parallel, but that's separate territory)
   - **Spec Proposals** (likely none)
   - **Recommended Next Move**: pointer to Task 0097 verifier (when
     it opens) or the next orchestrator decision (B4 SDK rollout vs
     B5 per-tenant rate-limit overrides per `specs/roadmap.md`).

---

## Verifier Merge Protocol Reminders

- Prefer `/Users/irinelinson/.local/bin/kiox` if `kiox` not on PATH.
- `intent.yaml` exists at repo root → run
  `kiox -- orun validate --intent intent.yaml` as part of Phase 3
  if Orun is scaffolded for this surface (no-op if no jobs are
  planned for tests-only changes — record the no-op result).
- After merge, always fast-forward `main` and resolve any verifier-
  created local changes before ending the verifier task.
- Never merge with unresolved verification blockers.

---

## On FAIL

Leave the PR open. File a verifier report with the failing phase,
the exact command + output, and a one-line recommended fix. Do not
attempt opportunistic fixes outside the failing phase's scope.
Append a one-line entry to `ai/state.json.notes` summarizing the
FAIL state for the next orchestrator pass.
