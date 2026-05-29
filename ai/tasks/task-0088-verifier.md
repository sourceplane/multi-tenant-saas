# Task 0088 — Verifier

## Agent

Verifier

## Current Repo Context

- Task 0088 (Implementer) wired `membership-worker`'s `create-invitation`
  flow to enqueue an `invitation.created` notification via the new
  `NOTIFICATIONS_WORKER` service binding. Mirrors the Task 0087 pattern
  for `identity-worker → notifications-worker` (PR #135, merged at
  `5192ffd`).
- Implementer report: `ai/reports/task-0088-implementer.md`.
- PR: **#136** (`impl/task-0088-membership-notifications-wire`), base
  `main @ 0b33184`. `gh pr view 136` at scoping time:
  `state=OPEN`, `mergeable=MERGEABLE`, `mergeStateStatus=CLEAN`,
  CI rollup = **5/5 SUCCESS** (`plan`, `membership-worker · dev · Verify
  deploy`, `· stage · Verify deploy`, `· prod · Verify deploy`,
  `membership-worker-tests · dev · Verify`) on workflow run
  `26658570311`.
- Notifications-worker stays on `NOTIFICATIONS_PROVIDER=local-debug`
  (internal-only, `workers_dev: false`) — verifier should NOT expect any
  outbound mail; the wire is exercised end-to-end on stage + prod as a
  local-debug provider row.
- Deferred backlog (do not let the PR touch any of these):
  Task 0085b cloudflare-domain v4→v5 re-import (no
  `infra/terraform/cloudflare-domain/**` edits, no cloudflare provider
  pin bump), real notifications provider swap (no Resend/Postmark/SES
  wiring).

## Objective

Verify PR #136 against Task 0088's prompt, the V1 notifications
contract, and the Verifier Standard in `agents/orchestrator.md`. PASS
and merge only if every acceptance criterion holds AND post-merge
main-CI confirms the `NOTIFICATIONS_WORKER` binding actually shipped to
the live stage + prod `membership-worker` deploys.

## PR Boundary

Must match the Implementer Task 0088 PR Boundary exactly. No scope
expansion. Specifically only:

1. `apps/membership-worker/src/env.ts` — `NOTIFICATIONS_WORKER?: Fetcher`
2. `apps/membership-worker/wrangler.jsonc` — service binding on `stage` +
   `prod` only (no `dev` binding)
3. `apps/membership-worker/src/notifications-client.ts` (new, mirrors
   identity-worker reference)
4. `apps/membership-worker/src/handlers/create-invitation.ts` — wire
   added after `executor.transaction(...)` commit
5. `tests/membership-worker/src/notifications-client.test.ts` (new)
6. `tests/membership-worker/src/create-invitation-notifications.test.ts`
   (new)
7. `ai/tasks/task-0088.md`, `ai/reports/task-0088-implementer.md`

Out of bounds (auto-FAIL if changed): `apps/notifications-worker/**`,
`apps/identity-worker/**`, `packages/contracts/src/notifications.ts`,
`packages/db/**`, `infra/terraform/cloudflare-domain/**`, any other
worker, any migration, `kiox.lock`, the cloudflare provider pin.

## Read First

- `ai/tasks/task-0088.md` — implementer prompt, Architect Brief,
  Constraints, failure modes
- `ai/reports/task-0088-implementer.md` — implementer's decisions and
  deviations
- `ai/reports/task-0087-verifier.md` — reference PASS shape, accepted
  deviation pattern, post-merge main-CI inspection template
- `agents/orchestrator.md` — Verifier Standard + Verifier Merge Protocol
- `specs/components/14-notifications.md` — V1 contract, category enum,
  internal-actor allow-list, `templateData` redaction rules
  (lines 86–89, 91–101, 287–298)
- `specs/components/04-organizations-membership.md` — invitation flow
  ownership
- `specs/constitution.md` — best-effort cross-context calls,
  bounded-context isolation
- PR #136 diff and CI logs

## Required Outcomes

1. Verifier report at `ai/reports/task-0088-verifier.md` with `Result:
   PASS` or `Result: FAIL`, mandatory sections per Verifier Standard.
2. If PASS: PR #136 merged (squash), local `main` fast-forwarded to
   `origin/main`, branch cleaned up, working tree clean.
3. If PASS: post-merge main-CI run inspected (not just status summary).
   Record run id, conclusion, and the `membership-worker · stage` /
   `· prod` worker version IDs from the deploy job logs in the verifier
   report.
4. State files updated per `orun-saas-orchestration` skill:
   `ai/state.json` (`current_task=null`, `0088` appended to
   `completed`, `last_verified` bumped, `notes` summarizing outcome),
   `ai/context/current.md` (recently-completed entry for 0088, refreshed
   next-task candidates), `ai/context/task-ledger.md` (appended 0088
   entry).
5. If FAIL: PR left OPEN with clear, ordered blocker list in the
   verifier report. State files NOT advanced. `current_task` may be
   updated to `0088` with a note pointing at the FAIL report.

## Non-Goals

- No scope expansion to `accept-invitation`, `revoke-invitation`, or
  any other membership flow.
- No notifications-worker changes (provider swap stays deferred).
- No `notifications-worker-dev` provisioning (still deferred).
- No touching `infra/terraform/cloudflare-domain/**` or the cloudflare
  provider pin (Task 0085b deferred).
- No `kiox.lock` bump in the PR (implementer report records they
  reverted the auto-bump; verifier must confirm `kiox.lock` is
  unchanged vs. `main @ 0b33184`).

## Constraints

- Raw invitation token MUST NOT appear in `templateData`, headers, or
  any logged surface. Read `create-invitation.ts` call site and the
  added test cases to confirm.
- Enqueue MUST be best-effort: notifications-worker downtime / missing
  binding / non-2xx / network error MUST NOT change the invitation
  201 / 4xx response. Verify via the new
  `create-invitation-notifications.test.ts` cases AND by reading the
  handler control flow.
- Enqueue MUST happen **outside** `executor.transaction(...)`, after a
  successful commit. A rolled-back invitation MUST NOT produce a
  notification.
- Enqueue MUST NOT fire on validation / policy-deny / billing-deny /
  `not_found` branches.
- `dev` env block in `wrangler.jsonc` MUST stay bindings-less for
  `NOTIFICATIONS_WORKER` (no `notifications-worker-dev` exists).
- `templateData` keys and values stay redaction-safe per V1 contract
  (`Record<string, string | number | boolean | null>` only).
- The new `notifications-client.ts` MUST mirror identity-worker's
  never-throws contract and return shape. Spot-diff it against
  `apps/identity-worker/src/notifications-client.ts`.

## Integration Notes

- Local Terraform `validate` may fail without providers installed —
  fall back to PR CI / post-merge main-CI evidence and do NOT block
  on that alone (per skill pitfall).
- `notifications-worker-dev` does not exist; verifier MUST NOT flag
  the dev `no_binding` short-circuit as a regression.
- Post-merge deploy IS exercised on the standard `triggerRef:
  github-push-main` profile for membership-worker — confirm by
  inspecting the main-CI run logs after merge, not just the PR-time
  green.

## Acceptance Criteria

✅ PR #136 corresponds exactly to Task 0088 as scoped above; no
out-of-bounds files touched.
✅ `apps/membership-worker/src/env.ts` declares `NOTIFICATIONS_WORKER?:
Fetcher`.
✅ `apps/membership-worker/wrangler.jsonc` adds the `NOTIFICATIONS_WORKER`
service binding on `stage` + `prod` only; `dev` block unchanged.
✅ `apps/membership-worker/src/notifications-client.ts` mirrors
identity-worker's never-throws contract (compare both files).
✅ `apps/membership-worker/src/handlers/create-invitation.ts` enqueues
**after** `executor.transaction(...)` commits, does not branch on the
enqueue result, and does not fire on validation / policy-deny /
billing-deny / not-found paths.
✅ `rawToken` never appears in the `templateData` construction
(read the call site in the diff).
✅ New tests (`notifications-client.test.ts` + `create-invitation-
notifications.test.ts`) cover: `no_binding`, `non_2xx`,
`network_error`, `bad_response`, 201-unchanged on enqueue failure,
no-enqueue on negative branches, no raw token in payload, lower-cased
email, `category: "invitation"`, `DEBUG_DELIVERY` skip behavior as
implementer documented.
✅ `packages/contracts/src/notifications.ts` UNCHANGED.
✅ `apps/notifications-worker/**` and `apps/identity-worker/**`
UNCHANGED.
✅ `infra/terraform/cloudflare-domain/**` UNCHANGED.
✅ `kiox.lock` UNCHANGED vs. `main @ 0b33184`.
✅ Local verification block: `pnpm --filter @saas/membership-worker
typecheck && lint && build`, `pnpm --filter @saas/membership-worker-tests
typecheck && test`, and the three Orun commands
(`validate`, `plan --changed --intent intent.yaml --output plan.json`,
`run --plan plan.json --dry-run --runner github-actions`) all pass on
PR head. Record exact outputs in the report.
✅ PR CI rollup green on PR head AT MERGE TIME (re-fetch with `gh pr
view 136 --json statusCheckRollup`); inspect a representative
membership-worker deploy job log to confirm the deploy step actually
ran (not just queued/skipped).
✅ Post-merge main-CI run is green and the `membership-worker · stage`
/ `· prod` deploys uploaded the worker with the new
`NOTIFICATIONS_WORKER` binding. Capture the worker version IDs.
✅ Apex / hostname invariants and notifications-worker private
`1042` invariants unchanged post-merge (live curl):
  - `https://stage.sourceplane.ai/` → 200
  - `https://prod.sourceplane.ai/`  → 200
  - `https://sourceplane-notifications-worker-stage.rahulvarghesepullely.workers.dev/health`
    → 404 + Cloudflare error `1042` (EXPECTED — private worker)
  - `https://sourceplane-notifications-worker-prod.rahulvarghesepullely.workers.dev/health`
    → 404 + Cloudflare error `1042` (EXPECTED — private worker)
✅ Verifier report enumerates: scope-audit table (file → in/out of
boundary), local validation block, PR-CI evidence with run ids,
post-merge main-CI evidence with run id + worker version IDs, secret-
handling audit (search PR diff for the rawToken / API key patterns),
spec-drift assessment, any implementer deviations and whether they are
accepted (with one-line rationale per the 0087-verifier template).

## Verification

Execute, in order:

1. `gh pr view 136 --json title,state,mergeable,mergeStateStatus,
   headRefName,baseRefName,statusCheckRollup,headRefOid` — confirm
   OPEN + MERGEABLE + CLEAN + all checks SUCCESS.
2. `git fetch origin && git checkout
   impl/task-0088-membership-notifications-wire && git pull --ff-only`
   — pin to PR head.
3. Scope audit: `git diff --name-only origin/main...HEAD` against the
   PR Boundary table above.
4. Read the four primary source files end-to-end:
   `apps/membership-worker/src/env.ts`,
   `apps/membership-worker/wrangler.jsonc`,
   `apps/membership-worker/src/notifications-client.ts`,
   `apps/membership-worker/src/handlers/create-invitation.ts`.
   For `create-invitation.ts`, trace the enqueue's position relative
   to `executor.transaction(...)` and every error branch.
5. Read both new test files end-to-end; confirm every test in the
   Acceptance list maps to a real `test(...)` / `it(...)` body.
6. `diff apps/membership-worker/src/notifications-client.ts
   apps/identity-worker/src/notifications-client.ts` — note any
   intentional differences (e.g., `x-internal-actor` value) and
   confirm the never-throws contract is preserved.
7. Secret-handling audit via `search_files`:
   `pattern='rawToken|SUPABASE_DB_PASSWORD|CLOUDFLARE_API_TOKEN'`
   on PR-added files only. Expect zero hits in any added file outside
   the existing `DEBUG_DELIVERY` response path.
8. Local validation block: `pnpm install --frozen-lockfile`, then the
   `membership-worker` + `membership-worker-tests` typecheck / lint /
   test / build commands, plus the three kiox/orun commands.
9. PR CI evidence: `gh run view 26658570311 --log-failed` (expect
   nothing) and `gh run view 26658570311 --json
   name,conclusion,jobs | jq -r '.jobs[] | "\(.name): \(.conclusion)"'`.
   Spot-check a membership-worker deploy job's log for the
   `wrangler deploy --dry-run` line.
10. Confirm `kiox.lock` unchanged: `git diff origin/main...HEAD --
    kiox.lock` must be empty.
11. If everything passes: append verifier report to the PR branch,
    push, wait for CI re-run green, then merge per Verifier Merge
    Protocol:
    `gh pr merge 136 --squash --auto` (or `--squash` directly if CI
    is already green on the new head),
    then `git checkout main && git pull --ff-only origin main`,
    `git branch -D impl/task-0088-membership-notifications-wire`.
12. Wait for post-merge main-CI run to complete. Inspect:
    `gh run list --branch main --limit 1` to get the run id;
    `gh run view <run-id> --json conclusion,jobs | jq -r '.jobs[] |
    select(.name | contains("membership-worker")) | "\(.name):
    \(.conclusion)"'`. Drill into the stage + prod deploy logs to
    capture the worker version IDs (`Worker Version ID: <uuid>`).
13. Live curl probes per Acceptance Criteria (apex hostnames +
    notifications-worker 1042 invariants).
14. Update state files (see Required Outcomes #4) and commit-push
    them to `main` as a follow-up close-out commit (matches the
    Task 0087 verifier pattern at commit `0b33184`).

## PR Creation Requirement

The Implementer has already created PR #136. The Verifier's job is to
verify, append the verifier report to the PR branch (commit + push),
wait for CI, and merge per protocol. No new PR required for the
verification work itself; the report ships on the same branch and is
included in the squash.

## When Done Report

Write `ai/reports/task-0088-verifier.md` with:

- **Result:** `PASS` or `FAIL`
- **Checks:** scope-audit table, local validation block, PR CI
  evidence (run id, per-job status), post-merge main-CI evidence
  (run id, worker version IDs for stage + prod), live curl probes
- **Issues:** any blockers (FAIL) or non-blocking concerns (PASS with
  notes)
- **Implementer Deviations Reviewed:** explicit verdict on each
  deviation flagged in the implementer report (here: template-key
  choice, in-place client duplication vs shared package, DEBUG
  short-circuit, dev block left bindings-less, kiox.lock revert) —
  accept or reject each with one-line rationale, mirroring the
  Task 0087 verifier shape
- **Secret-Handling Review:** confirmation that no raw token / no
  secret material is in `templateData` or any new test fixture
- **Spec Proposals:** drift assessment (expected: none — V1 contract
  already covers `category: "invitation"` and `"membership-worker"`
  in the internal-actor allow-list)
- **Risk Notes:** residual risks, e.g., dev `no_binding` short-circuit
  is intentional but worth a follow-up task; in-place client
  duplication is now in two places — extract to shared package when a
  third caller appears
- **Recommended Next Move:** what the orchestrator should pick after
  0088 closes (current top candidates: `notifications-worker-dev`
  provisioning to close the dev-wire gap; or `accept-invitation` fold-
  in as `invitation.accepted` second-template exercise; or wait for
  user to lift the provider-swap defer)
