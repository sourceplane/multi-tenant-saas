# Task 0090 — Verifier

Agent: Verifier

## Current Repo Context

- Task 0090 Implementer (PR #138, branch `impl/task-0090-notifications-idempotency-keys`,
  head `b8940df`) has populated `idempotencyKey` on all three V1 notifications
  callers and added a `buildIdempotencyKey(scope, ...parts)` helper to
  `@saas/notifications-client`. Implementer report at
  `ai/reports/task-0090-implementer.md`.
- PR is MERGEABLE / mergeStateStatus CLEAN. PR-CI run `26668028804` shows 13/13
  SUCCESS (plan + 12 verify jobs covering identity-worker, membership-worker,
  notifications-client × dev/stage/prod plus tests workspaces). The PR diff
  touches exactly: three caller handler files, `packages/notifications-client/src/index.ts`,
  `tests/identity-worker/package.json`, three new/extended test files under
  `tests/{notifications-client,identity-worker,membership-worker}/`, plus the
  `ai/` task + state docs. No notifications-worker, contracts, db, infra,
  wrangler.jsonc, or component.yaml edits — initial diff sweep matches the
  PR Boundary in `ai/tasks/task-0090.md`.
- Repo health prior to this task: 🟢 green, main `8d4eb26`, last verified
  main-CI `26666036515` (Task 0089 post-merge). Notifications-worker V1 stays
  on `local-debug`; this task is hardening before any real provider swap.
- Deferred candidates that must NOT have been touched: (a)
  `notifications-provider-swap`, (b) Task 0085b cloudflare-domain v4→v5
  (`infra/terraform/cloudflare-domain/**` and the `cloudflare ~> 4.52` pin),
  (c) `notifications-worker-dev-reframe`.

## Objective

Verify PR #138 against the Task 0090 acceptance criteria, the Implementer
Standard, and the orchestrator's PR-Sized Task Standard. Confirm the three
caller idempotency keys are deterministic, secret-free, and template-scoped;
that best-effort enqueue semantics are preserved; that the PR Boundary held;
and that the post-merge main-CI run + live console URLs remain green. PASS or
FAIL.

## PR Boundary (must match Task 0090)

In:
- `apps/identity-worker/src/handlers/login-start.ts`
- `apps/membership-worker/src/handlers/create-invitation.ts`
- `apps/membership-worker/src/handlers/accept-invitation.ts`
- `packages/notifications-client/src/index.ts` (additive helper only)
- `tests/{notifications-client,identity-worker,membership-worker}/...`
- `tests/identity-worker/package.json` (Jest moduleNameMapper extension)
- `ai/tasks/task-0090.md`, `ai/reports/task-0090-implementer.md`,
  `ai/state.json`, `ai/context/current.md`, `ai/context/task-ledger.md`,
  `ai/deferred.md`, `ai/waiting_for_input.md`.

Out (any hit = FAIL):
- `apps/notifications-worker/**`
- `packages/contracts/src/notifications.ts`
- `packages/db/**`
- any `apps/*/wrangler.jsonc`, any `apps/*/component.yaml`
- `infra/terraform/cloudflare-domain/**`
- the `cloudflare ~> 4.52` provider pin

## Read First

- `agents/orchestrator.md` — Verifier Standard, Verifier Merge Protocol,
  Post-Merge Deploy-Profile Gap rule.
- `ai/tasks/task-0090.md` — full prompt, especially Architect Brief,
  Required Outcomes, Acceptance Criteria.
- `ai/reports/task-0090-implementer.md` — what was actually shipped.
- `ai/reports/task-0088-verifier.md` — original V1 risk note this PR closes.
- `packages/notifications-client/src/index.ts` and the three caller files
  on the PR branch — read the actual code, not just the report.
- `apps/notifications-worker/src/services/notifications.ts` — confirm the
  caller-side keys feed into the existing `(orgId, idempotencyKey)`
  idempotent-hit path unchanged.

## Required Verifications

- [ ] PR diff matches the PR Boundary exactly. `gh pr diff 138 --name-only`
      reveals zero out-of-scope paths.
- [ ] Each call site sets `idempotencyKey` from a stable, durable, durable-
      across-retries source: `result.challengeId` for magic-link;
      `invitationPublicId(inv.id)` for `invitation.created`;
      `invitationPublicId(inv.id) + ':' + memberPublicId(member.id)` for
      `invitation.accepted`.
- [ ] No raw secret material in any key. In particular: read
      `apps/identity-worker/src/handlers/login-start.ts` and confirm the key
      uses `result.challengeId` (a public id), NOT `result.rawCode` or any
      hashed token. Spot-check the test asserting this is not satisfied by
      trivial mocking — the assertion must reference the real handler output.
- [ ] Keys are template-scoped (scope prefix differs per `templateKey`).
- [ ] Best-effort enqueue contract preserved: enqueue still happens via
      `ctx.waitUntil`/fire-and-forget on the create-invitation and
      accept-invitation paths (both transactional and post-tx fallback);
      no thrown error reaches the user-facing 2xx response. Existing
      negative tests on those workers still pass.
- [ ] `buildIdempotencyKey(...)` (if present) is pure, deterministic, and
      rejects whitespace/control characters in segments. Helper export is
      additive — no signature changes to `enqueueNotification`,
      `NotificationsEnvBinding`, `NotificationsClientContext`,
      `EnqueueNotificationResult`.
- [ ] Local checks: `pnpm install --frozen-lockfile`,
      `pnpm -F @saas/notifications-client typecheck && test`,
      `pnpm -F @saas/identity-worker-tests test`,
      `pnpm -F @saas/membership-worker-tests test`. Pre-existing failures
      called out in the implementer report (api-key-admin compile,
      policy-engine `node` types, projects-worker eslint v9 migration) are
      out of scope and remain on main.
- [ ] kiox/orun triple:
      `kiox -- orun validate --intent intent.yaml`,
      `kiox -- orun plan --changed --intent intent.yaml --output plan.json`,
      `kiox -- orun run --plan plan.json --dry-run --runner github-actions`.
- [ ] PR-CI rollup `26668028804` is 13/13 SUCCESS (plan + 12 verify jobs).
      Inspect the plan job log — confirm orun selected exactly the changed
      components, no notifications-worker job materialized.
- [ ] Secret scan on PR-touched files: `rawCode`, `password`,
      `CLOUDFLARE_API_TOKEN`, `SUPABASE_DB_PASSWORD`, full bearer tokens,
      magic-link plaintext — none present.
- [ ] Spec drift: none expected (contract field already exists). If found,
      file proposal under `ai/proposals/`.

## Merge & Post-Merge

If all checks PASS:
1. `gh pr merge 138 --squash --delete-branch`.
2. `git checkout main && git pull --ff-only origin/main`.
3. Confirm worktree clean (`git status --short`).
4. Watch the post-merge main-CI run (per `post-merge-deploy-profile-gap.md`):
   wait for completion, confirm 13/13 SUCCESS (or whatever the main-CI
   shape is — Task 0089 last produced 13/13 in `26666036515`). Capture
   the four consumer-worker version IDs (identity stage/prod,
   membership stage/prod) from the deploy logs.
5. `curl -sS -o /dev/null -w '%{http_code} -> %{redirect_url}\n' https://stage.sourceplane.ai/`
   and the same for prod — both must be 200 (or redirect chain landing on
   `/orgs`).
6. Confirm notifications-worker private invariant holds: a curl to its
   public hostname must NOT respond 200 with the enqueue contract — V1
   stays internal-only.

If any check FAILS:
- Leave PR open with a clear blocker comment on the PR.
- Do not merge.
- File issues in the verifier report.

## When Done Report

Save to `ai/reports/task-0090-verifier.md` with sections:
- Result: PASS | FAIL
- Checks (exact commands + outcomes; group local + CI + post-merge)
- Issues (severity-tagged)
- CI Log Review (PR run `26668028804` + post-merge main-CI run id)
- Live Resource Evidence (worker version IDs, curl outputs, notifications-worker
  privacy check)
- Secret Handling Review
- Spec Proposals (likely none)
- Risk Notes (residual V1 hardening, deferred candidates)
- Recommended Next Move (orchestrator pick after this PASS)

## State Updates After PASS

Standard sequence:
1. `ai/state.json` — append `"0090"` to `completed`, advance `current_task`
   to next scoped task or set `next_focus` to candidate-selection in
   progress, refresh `last_verified` timestamp, update `notes`.
2. `ai/context/task-ledger.md` — append the Task 0090 entry (verified +
   merged, PR #138, post-merge main-CI run id).
3. `ai/context/current.md` — replace the active-task section with the
   Task 0090 close-out summary; flag the next orchestrator pick.
4. `ai/waiting_for_input.md` — leave at "no input requested" (orchestrator
   loop continues).
5. Commit + push state updates directly to `main` per the verifier
   close-out pattern used in Task 0089.
