# Task 0089 — Verifier

## Agent

Verifier

## Current Repo Context

- Task 0089 (Implementer) extracted the byte-near-identical
  `notifications-client.ts` copies out of `apps/identity-worker/src/` and
  `apps/membership-worker/src/` into a single shared workspace package
  `@saas/notifications-client` (`packages/notifications-client/`), and
  wired `accept-invitation` to enqueue `invitation.accepted` via the
  shared client as the contractual third-caller trigger that justified
  the extraction (Tasks 0087 and 0088 explicitly deferred it "until a
  third caller appears").
- Implementer report: `ai/reports/task-0089-implementer.md`.
- PR: **#137** (`impl/task-0089-shared-notifications-client`), base
  `main @ 9811919` (Task 0088 close-out). `gh pr view 137` at scoping
  time: `state=OPEN`, `mergeable=MERGEABLE`, `mergeStateStatus=CLEAN`,
  CI rollup = **13/13 SUCCESS** on workflow run `26665348096` (`plan`,
  `notifications-client · {dev,stage,prod} · Verify`,
  `notifications-client-tests · dev · Verify`,
  `identity-worker · {dev,stage,prod} · Verify deploy`,
  `identity-worker-tests · dev · Verify`,
  `membership-worker · {dev,stage,prod} · Verify deploy`,
  `membership-worker-tests · dev · Verify`).
- Implementer commit: `ca1470d` (code) + `a5e7a3c` (report).
- After this PR there are exactly three consumers of
  `@saas/notifications-client`:
  1. identity-worker `login-start` → `auth.magic_link` (Task 0087)
  2. membership-worker `create-invitation` → `invitation.created` (Task 0088)
  3. membership-worker `accept-invitation` → `invitation.accepted` (NEW)
- Notifications-worker stays on `NOTIFICATIONS_PROVIDER=local-debug`
  (internal-only, `workers_dev: false`) — verifier should NOT expect any
  outbound mail; the wire is exercised end-to-end on stage + prod as a
  local-debug provider row.
- Deferred backlog (do NOT let the PR touch any of these):
  - Real notifications provider swap (no Resend/Postmark/SES wiring).
  - `notifications-worker-dev` provisioning + dev binding for any of
    the three callers (parked as the next-after-0089 narrow follow-up).
  - Task 0085b cloudflare-domain v4→v5 re-import (no
    `infra/terraform/cloudflare-domain/**` edits, no `cloudflare ~> 4.52`
    provider pin bump).

## Objective

Verify PR #137 against Task 0089's prompt, the V1 notifications contract,
the Task 0088 best-effort/post-commit pattern (now mirrored in
`accept-invitation`), and the Verifier Standard in `agents/orchestrator.md`.
PASS and merge only if every acceptance criterion holds AND post-merge
main-CI confirms the new shared-package wire actually shipped to the live
stage + prod deploys of all three consumer workers without regression.

## PR Boundary

Must match the Implementer Task 0089 PR Boundary exactly. No scope
expansion. Specifically only:

1. New workspace package `packages/notifications-client/` —
   `package.json` (`@saas/notifications-client`), `tsconfig.json`,
   `tsconfig.build.json`, `eslint.config.js`, `component.yaml`,
   `src/index.ts` (lifted verbatim from the identity-worker copy; the
   more general doc voice).
2. `apps/identity-worker/`:
   - `package.json` adds `@saas/notifications-client: workspace:*`
   - `src/handlers/login-start.ts` import path swap
   - `src/notifications-client.ts` **deleted**
3. `apps/membership-worker/`:
   - `package.json` adds `@saas/notifications-client: workspace:*`
   - `src/handlers/create-invitation.ts` import path swap (no logic
     change)
   - `src/handlers/accept-invitation.ts` enqueue wire post-commit,
     `enqueueNotification` injected via deps slot, default to real impl
   - `src/notifications-client.ts` **deleted**
4. New tests workspace `tests/notifications-client/` —
   `package.json`, `tsconfig.json`, `eslint.config.js`, `component.yaml`,
   `src/notifications-client.test.ts` (canonical 8-test suite covering
   `no_binding`, internal URL/headers, identity forwarding, `non_2xx`,
   `network_error`, `bad_response` envelope, `bad_response` malformed
   JSON, never-throws).
5. `tests/membership-worker/src/accept-invitation-notifications.test.ts`
   (NEW) — accept-invitation enqueue wire tests.
6. **Deletions** of the now-redundant per-worker client tests:
   - `tests/identity-worker/src/notifications-client.test.ts`
   - `tests/membership-worker/src/notifications-client.test.ts`
7. `ai/tasks/task-0089.md`, `ai/reports/task-0089-implementer.md`.

Out of bounds (auto-FAIL if changed): `apps/notifications-worker/**`,
`packages/contracts/src/notifications.ts`, `packages/db/**`, any
migration, `infra/terraform/cloudflare-domain/**`, the cloudflare
provider pin (`~> 4.52`), `kiox.lock`, any wrangler.jsonc service-binding
edit (the `NOTIFICATIONS_WORKER` binding on identity-worker and
membership-worker stage/prod was already in place from Tasks 0087/0088;
this PR adds NO new wrangler bindings and does NOT add a dev binding).

## Read First

- `ai/tasks/task-0089.md` — implementer prompt, Architect Brief,
  Constraints, failure modes, three-caller framing
- `ai/reports/task-0089-implementer.md` — implementer's decisions and
  any flagged deviations
- `ai/reports/task-0088-verifier.md` — reference PASS shape (the
  pattern this PR's `accept-invitation` enqueue mirrors at
  `create-invitation` lines 280–340)
- `ai/reports/task-0087-verifier.md` — original best-effort/never-throws
  contract verification template
- `agents/orchestrator.md` — Verifier Standard + Verifier Merge Protocol
- `specs/components/14-notifications.md` — V1 contract, category enum,
  internal-actor allow-list, `templateData` redaction rules
- `specs/components/04-organizations-membership.md` — invitation
  acceptance flow ownership
- `specs/constitution.md` — best-effort cross-context calls,
  bounded-context isolation, workspace package conventions
- PR #137 diff and CI logs

## Required Outcomes

1. Verifier report at `ai/reports/task-0089-verifier.md` with `Result:
   PASS` or `Result: FAIL`, mandatory sections per Verifier Standard.
2. If PASS: PR #137 merged (squash), local `main` fast-forwarded to
   `origin/main`, branch cleaned up, working tree clean.
3. If PASS: post-merge main-CI run inspected (NOT just status summary).
   Record run id, conclusion, and the worker version IDs from the
   `identity-worker · {stage,prod}` and
   `membership-worker · {stage,prod}` deploy job logs in the verifier
   report (four version IDs total). identity-worker is in scope here
   because the import path swap touches its build output even though
   no behavior changed.
4. State files updated per `orun-saas-orchestration` skill:
   `ai/state.json` (`current_task=null` or next-task id, `0089` appended
   to `completed`, `last_verified` bumped, `notes` summarizing outcome
   AND surfacing the now-unblocked next candidate
   `notifications-worker-dev provisioning`),
   `ai/context/current.md` (recently-completed entry for 0089, refreshed
   next-task candidates), `ai/context/task-ledger.md` (appended 0089
   entry).
5. If FAIL: PR left OPEN with clear, ordered blocker list in the
   verifier report. State files NOT advanced. `current_task` may be
   updated to `0089` with a note pointing at the FAIL report.

## Non-Goals

- No scope expansion to `revoke-invitation` or any other membership
  flow (revoke is already wired in Task 0024 and is NOT a notifications
  caller in this PR).
- No notifications-worker changes (provider swap stays deferred).
- No `notifications-worker-dev` provisioning (still deferred — that is
  the scoped-next task after 0089 closes).
- No touching `infra/terraform/cloudflare-domain/**` or the cloudflare
  provider pin (Task 0085b deferred).
- No `kiox.lock` bump in the PR.
- No cleanup of the pre-existing `api-key-admin.ts` /
  `policy-engine-tests` failures the implementer report flags as
  unrelated; verifier confirms they reproduce on clean `main` and notes
  them as out-of-scope.

## Constraints

- Raw invitation token (the 64-char hex from the acceptance request) MUST
  NOT appear in `accept-invitation`'s `templateData`, headers, or any
  logged surface. Read the call site and the new test fixture to confirm.
  `templateData` for `invitation.accepted` is restricted to
  `{ invitationId, orgId, role, acceptedBy, acceptedAt }` per the
  implementer report.
- Enqueue MUST be best-effort: missing binding / non-2xx / network error
  / malformed JSON MUST NOT change the acceptance 200/4xx response.
  Verify via the new
  `accept-invitation-notifications.test.ts` cases AND by reading the
  handler control flow.
- Enqueue MUST happen **outside** `executor.transaction(...)`, after a
  successful commit. A rolled-back acceptance MUST NOT produce a
  notification. Compare positionally against `create-invitation.ts`
  lines 280–340 (Task 0088 baseline pattern).
- Enqueue MUST NOT fire on validation / token-mismatch / expired /
  already-accepted / policy-deny / not-found branches.
- The two old per-worker `apps/*/src/notifications-client.ts` files
  MUST be deleted (not just unreferenced).
- The two old per-worker `tests/*/src/notifications-client.test.ts`
  files MUST be deleted (consolidated into the new shared suite).
- `apps/notifications-worker/**` and
  `packages/contracts/src/notifications.ts` UNCHANGED.
- `packages/notifications-client/src/index.ts` MUST preserve the
  never-throws contract verbatim from the identity-worker source
  (logic-equivalent diff acceptable; comment / doc voice differences
  noted but not blocking).
- No new dev wrangler binding on identity-worker or membership-worker
  (no `notifications-worker-dev` exists yet — that is parked).

## Integration Notes

- Local Terraform `validate` may fail without providers installed —
  fall back to PR CI / post-merge main-CI evidence and do NOT block
  on that alone (per skill pitfall).
- `notifications-worker-dev` does not exist; verifier MUST NOT flag
  the dev `no_binding` short-circuit in any of the three callers as a
  regression. It is documented as the scoped-next task.
- This is a workspace-graph change (new package + new tests workspace +
  two deleted per-worker files); the Orun changed-plan output should
  show `notifications-client`, `notifications-client-tests`,
  `identity-worker`, `identity-worker-tests`, `membership-worker`, and
  `membership-worker-tests` jobs touched. Confirm via `kiox -- orun plan
  --changed --intent intent.yaml --output plan.json` and inspect the
  rendered `plan.json`.
- Post-merge deploy IS exercised on the standard `triggerRef:
  github-push-main` profile for both consumer workers — confirm by
  inspecting the main-CI run logs after merge, not just the PR-time
  green.

## Acceptance Criteria

✅ PR #137 corresponds exactly to Task 0089 as scoped above; no
out-of-bounds files touched (`git diff --name-only origin/main...HEAD`
audit).
✅ `packages/notifications-client/` exists with `package.json`
declaring `name: "@saas/notifications-client"`, `private: true`, an
`exports` map pointing at `src/index.ts`, no compiled `dist/`.
✅ `packages/notifications-client/src/index.ts` exports
`enqueueNotification`, `EnqueueNotificationResult`,
`NotificationsEnvBinding` and preserves the never-throws contract
(spot-diff against the pre-PR identity-worker source via
`git show 9811919:apps/identity-worker/src/notifications-client.ts`).
✅ `apps/identity-worker/src/notifications-client.ts` and
`apps/membership-worker/src/notifications-client.ts` are DELETED on the
PR head (`git show HEAD:<path>` returns "does not exist").
✅ `apps/identity-worker/src/handlers/login-start.ts` imports from
`@saas/notifications-client` (no relative `./notifications-client`
remains).
✅ `apps/membership-worker/src/handlers/create-invitation.ts` imports
from `@saas/notifications-client` and the enqueue logic / position
relative to `executor.transaction(...)` is byte-equivalent to the
Task 0088 baseline (only the import line should differ).
✅ `apps/membership-worker/src/handlers/accept-invitation.ts` enqueues
**after** `executor.transaction(...)` commits, does not branch on the
enqueue result, does not fire on negative branches, and uses the same
deps-slot pattern as `create-invitation.ts`.
✅ `accept-invitation` `templateData` is exactly
`{ invitationId, orgId, role, acceptedBy, acceptedAt }` — no token,
no email, no hash. The 64-char hex token from the acceptance request
appears nowhere in the enqueue payload (search the diff for token /
hash / email regex on the new path).
✅ New `tests/notifications-client/src/notifications-client.test.ts`
contains 8 tests covering: `no_binding`, internal URL/headers,
identity forwarding (`x-internal-actor`), `non_2xx`, `network_error`,
`bad_response` envelope, `bad_response` malformed JSON, never-throws.
All pass.
✅ New `tests/membership-worker/src/accept-invitation-notifications.test.ts`
asserts: enqueue called with `category: "invitation"` and
`type: "invitation.accepted"`; post-commit ordering vs the transaction
mock; 200 response invariant on enqueue failure (no_binding / non_2xx
/ network_error); no raw token in `templateData`; no enqueue on
negative branches.
✅ Old `tests/identity-worker/src/notifications-client.test.ts` and
`tests/membership-worker/src/notifications-client.test.ts` are DELETED.
✅ `apps/notifications-worker/**` UNCHANGED.
✅ `packages/contracts/src/notifications.ts` UNCHANGED.
✅ `infra/terraform/cloudflare-domain/**` UNCHANGED.
✅ `kiox.lock` UNCHANGED vs. `main @ 9811919`.
✅ No wrangler.jsonc service-binding edits in either consumer worker.
✅ Local verification block on PR head:
  - `pnpm install --frozen-lockfile`
  - `pnpm --filter @saas/notifications-client typecheck && lint`
  - `pnpm --filter @saas/notifications-client-tests typecheck && lint && test`
  - `pnpm --filter @saas/identity-worker typecheck && lint`
  - `pnpm --filter @saas/identity-worker-tests test` (expect 103/103 pass;
    pre-existing `api-key-admin.test.ts` compile failure unrelated to
    this PR — confirm it reproduces on clean `main` via `git stash` +
    re-run)
  - `pnpm --filter @saas/membership-worker typecheck && lint`
  - `pnpm --filter @saas/membership-worker-tests typecheck && lint && test`
    (incl. both create-invitation and accept-invitation wire tests)
  - `kiox -- orun validate --intent intent.yaml`
  - `kiox -- orun plan --changed --intent intent.yaml --output plan.json`
  - `kiox -- orun run --plan plan.json --dry-run --runner github-actions`
  Record exact outputs in the report.
✅ PR CI rollup green on PR head AT MERGE TIME (re-fetch with
`gh pr view 137 --json statusCheckRollup`); inspect a representative
deploy job log for each of identity-worker (stage), identity-worker
(prod), membership-worker (stage), membership-worker (prod) to confirm
the deploy step actually ran (not just queued/skipped).
✅ Post-merge main-CI run is green and the four consumer-worker
deploys (`identity-worker · {stage,prod}`,
`membership-worker · {stage,prod}`) uploaded the worker with the import
swap. Capture all four worker version IDs.
✅ Apex / hostname invariants and notifications-worker private
`1042` invariants unchanged post-merge (live curl):
  - `https://stage.sourceplane.ai/` → 200
  - `https://prod.sourceplane.ai/`  → 200
  - `https://sourceplane-notifications-worker-stage.rahulvarghesepullely.workers.dev/health`
    → 404 + Cloudflare error `1042` (EXPECTED — private worker)
  - `https://sourceplane-notifications-worker-prod.rahulvarghesepullely.workers.dev/health`
    → 404 + Cloudflare error `1042` (EXPECTED — private worker)
✅ Verifier report enumerates: scope-audit table (file → in/out of
boundary, plus a deletions row), local validation block, PR-CI evidence
with run id, post-merge main-CI evidence with run id + four worker
version IDs, secret-handling audit (search PR diff for raw-token /
email / hash patterns on the new accept-invitation enqueue path),
spec-drift assessment, any implementer deviations and whether they are
accepted (with one-line rationale per the 0088-verifier template).

## Verification

Execute, in order:

1. `gh pr view 137 --json title,state,mergeable,mergeStateStatus,
   headRefName,baseRefName,statusCheckRollup,headRefOid` — confirm
   OPEN + MERGEABLE + CLEAN + all 13 checks SUCCESS.
2. `git fetch origin && git checkout
   impl/task-0089-shared-notifications-client && git pull --ff-only`
   — pin to PR head.
3. Scope audit: `git diff --name-only origin/main...HEAD` against the
   PR Boundary table above. Tabulate every file as in-bounds /
   out-of-bounds / deletion.
4. Read the new shared package end-to-end:
   `packages/notifications-client/package.json`,
   `packages/notifications-client/src/index.ts`. Confirm the
   never-throws contract via `git show 9811919:apps/identity-worker/src/notifications-client.ts`
   diff (only doc-voice / formatting differences expected).
5. Read all three consumer call sites:
   - `apps/identity-worker/src/handlers/login-start.ts` (import-swap only)
   - `apps/membership-worker/src/handlers/create-invitation.ts`
     (import-swap only — confirm logic byte-equivalent to Task 0088 by
     `git diff origin/main..HEAD --
     apps/membership-worker/src/handlers/create-invitation.ts`)
   - `apps/membership-worker/src/handlers/accept-invitation.ts`
     (NEW wire — trace the enqueue position relative to
     `executor.transaction(...)` and every error branch; confirm
     `enqueueNotification` deps-slot mirrors create-invitation)
6. Confirm the two deleted client copies do not exist on PR head:
   `git show HEAD:apps/identity-worker/src/notifications-client.ts`
   and `git show HEAD:apps/membership-worker/src/notifications-client.ts`
   (both must error "does not exist").
7. Read both new test files end-to-end; confirm every test in the
   Acceptance list maps to a real `test(...)` / `it(...)` body.
8. Confirm the two old test files are deleted on PR head:
   `git show HEAD:tests/identity-worker/src/notifications-client.test.ts`
   and `git show HEAD:tests/membership-worker/src/notifications-client.test.ts`.
9. Secret-handling audit via `search_files` on PR-added files only:
   `pattern='rawToken|tokenHash|SUPABASE_DB_PASSWORD|CLOUDFLARE_API_TOKEN'`
   — expect zero hits inside `accept-invitation.ts` enqueue
   construction or the new test fixture's `templateData`.
10. Local validation block: `pnpm install --frozen-lockfile`, then the
    typecheck / lint / test commands listed in Acceptance Criteria,
    plus the three kiox/orun commands. For the pre-existing
    `api-key-admin.test.ts` and `policy-engine` failures the
    implementer flags, run `git stash && pnpm install
    --frozen-lockfile && pnpm typecheck` against clean `9811919` to
    confirm they reproduce on `main`; then `git stash pop` to restore
    the PR head. Record the reproduction in the report.
11. PR CI evidence: `gh run view 26665348096 --log-failed` (expect
    nothing) and `gh run view 26665348096 --json
    name,conclusion,jobs | jq -r '.jobs[] | "\(.name): \(.conclusion)"'`.
    Spot-check one identity-worker deploy job log AND one membership-
    worker deploy job log for the `wrangler deploy --dry-run` line.
12. Confirm `kiox.lock` unchanged: `git diff origin/main...HEAD --
    kiox.lock` must be empty.
13. If everything passes: append verifier report to the PR branch,
    push, wait for CI re-run green, then merge per Verifier Merge
    Protocol:
    `gh pr merge 137 --squash --auto` (or `--squash` directly if CI
    is already green on the new head),
    then `git checkout main && git pull --ff-only origin main`,
    `git branch -D impl/task-0089-shared-notifications-client`.
14. Wait for post-merge main-CI run to complete. Inspect:
    `gh run list --branch main --limit 1` to get the run id;
    `gh run view <run-id> --json conclusion,jobs | jq -r '.jobs[] |
    select(.name | test("identity-worker|membership-worker")) |
    "\(.name): \(.conclusion)"'`. Drill into the four `· {stage,prod}
    · Verify deploy` jobs to capture worker version IDs (`Worker
    Version ID: <uuid>`).
15. Live curl probes per Acceptance Criteria (apex hostnames +
    notifications-worker 1042 invariants).
16. Update state files (see Required Outcomes #4) and commit-push
    them to `main` as a follow-up close-out commit (matches the
    Task 0088 verifier pattern at commit `9811919`).

## PR Creation Requirement

The Implementer has already created PR #137. The Verifier's job is to
verify, append the verifier report to the PR branch (commit + push),
wait for CI, and merge per protocol. No new PR required for the
verification work itself; the report ships on the same branch and is
included in the squash. After the squash merge, the close-out commit
(state files + ledger) goes directly to `main` as a separate commit
matching the established pattern.

## When Done Report

Write `ai/reports/task-0089-verifier.md` with:

- **Result:** `PASS` or `FAIL`
- **Checks:** scope-audit table (incl. deletions row), local validation
  block, PR CI evidence (run id, per-job status), post-merge main-CI
  evidence (run id, four worker version IDs for identity-worker
  stage/prod and membership-worker stage/prod), live curl probes
- **Issues:** any blockers (FAIL) or non-blocking concerns (PASS with
  notes)
- **Implementer Deviations Reviewed:** explicit verdict on each
  deviation flagged in the implementer report — accept or reject each
  with one-line rationale, mirroring the Task 0088 verifier shape.
  Expected deviations to evaluate:
  - Lifted from identity-worker copy (vs membership) for the shared
    package source
  - No `dist/` build (workspace consumers import `src/index.ts` direct)
  - Single canonical test suite under `tests/notifications-client/`
    rather than per-consumer client tests
  - `enqueueNotification` injected via deps slot on accept-invitation
  - `templateData` shape `{ invitationId, orgId, role, acceptedBy,
    acceptedAt }`
  - No `DEBUG_DELIVERY` short-circuit on accept-invitation (request
    response carries no token; stage/prod parity)
- **Secret-Handling Review:** confirmation that no raw token /
  tokenHash / email / secret material is in `templateData`, headers,
  or any new test fixture
- **Pre-Existing Failures Confirmation:** explicit table showing the
  `api-key-admin.ts` and `policy-engine-tests` failures reproduce on
  clean `main @ 9811919` — out of scope for Task 0089, not regressions
- **Spec Proposals:** drift assessment (expected: none — V1 contract
  already covers `category: "invitation"`, `"membership-worker"` in
  the internal-actor allow-list, and the shared workspace-package
  convention)
- **Risk Notes:** residual risks, e.g., the dev `no_binding`
  short-circuit now covers all three callers and is the contractual
  trigger for the next task (notifications-worker-dev provisioning)
- **Recommended Next Move:** orchestrator should pick
  **`notifications-worker-dev` provisioning + dev binding for all three
  callers** as the next implementer task (single wrangler/component
  change closes the dev-wire gap for identity-worker login-start,
  membership-worker create-invitation, and membership-worker
  accept-invitation in one move). Provider swap stays deferred until
  user names a provider; Task 0085b stays deferred per explicit user
  defer.
