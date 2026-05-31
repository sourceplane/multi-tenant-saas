# Task 0108 — Verifier

Agent: Verifier

## Current Repo Context

- Task 0108 implementer is complete. PR #163 OPEN, MERGEABLE, BLOCKED on
  required CI checks (only `plan` lane visible at scope time — additional
  webhooks-worker / db / contracts Verify lanes will appear once `plan`
  produces the changed-set).
- HEAD: `90044b1` on branch `impl/task-0108-webhook-secret-rotation-grace`.
  Sealed main snapshot at PR open: `aae8d35` (Task 0107 verifier-PASS
  bookkeeping).
- Diff: 13 files, +736/-26. Three “bonus” paths beyond the 8-slot prompt
  budget: `apps/webhooks-worker/src/env.ts` (new env var declaration),
  `packages/db/src/manifest.ts` (migration registration), and the
  contracts/db test additions the spec lists as Verifier acceptance gates.
  Implementer footnotes them in §“PR-boundary footnote” of the report —
  evaluate whether the deviation is structural / forced or scope creep.
- This is the **B5 webhook secret rotation backend slice**. Console
  (Task 0109) and CLI (Task 0110) are downstream consumers; both depend
  on the contract shape locked here.

## Objective

Verify PR #163 against the Task 0108 implementer prompt (`ai/tasks/task-0108.md`)
and the Verifier Standard in `agents/orchestrator.md` lines 392–434. Decide
PASS/FAIL. If PASS, merge per Verifier Merge Protocol; if FAIL, leave the
PR open with clear blockers documented in the verifier report.

## PR Boundary

Same as the implementer prompt:

1. `packages/db/src/migrations/130_webhook_secret_rotation_grace/up.sql` NEW
2. `packages/db/src/webhooks/repository.ts`
3. `packages/db/src/webhooks/types.ts`
4. `packages/contracts/src/webhooks.ts`
5. `apps/webhooks-worker/src/handlers/webhook-endpoints.ts`
6. `apps/webhooks-worker/src/delivery.ts`
7. `apps/webhooks-worker/src/__tests__/*` (≥4 new cases) — implementer
   used `tests/webhooks-worker/src/{delivery,webhooks-worker}.test.ts`
   in the workspace test package, not an `__tests__` subdir; this matches
   the repo convention. Confirm equivalence.
8. `ai/reports/task-0108-implementer.md`

Plus the three documented overshoots — accept if structurally forced
(env var declaration is required to wire the new `WEBHOOK_SECRET_ROTATION_GRACE_SECONDS`;
manifest registration is mandatory for any new migration to be picked up
by `applyAllMigrations`; contracts/db test files are explicitly in the
Verifier acceptance criteria), reject otherwise.

## Read First

- `ai/tasks/task-0108.md` — implementer prompt (PR boundary, hard rules,
  acceptance criteria).
- `ai/reports/task-0108-implementer.md` — implementer self-report.
- `agents/orchestrator.md` lines 392–434 — Verifier Standard + Merge
  Protocol.
- `apps/webhooks-worker/src/delivery.ts` — full file (verify dual-sign
  logic + clean fallthrough on decryption failure / null-previous /
  expired-previous).
- `packages/db/src/webhooks/repository.ts` — full file (verify atomic
  single-UPDATE in `rotateEndpointSecret` + `ENDPOINT_SAFE_COLUMNS` does
  NOT leak `previous_secret_ciphertext`).
- `packages/db/src/migrations/130_webhook_secret_rotation_grace/up.sql`
  — confirm idempotent `ADD COLUMN IF NOT EXISTS` for all three columns.
- `packages/contracts/src/webhooks.ts` — confirm `RotateWebhookSecretResponse`
  shape extension is additive and backwards-compatible.
- `apps/webhooks-worker/src/handlers/webhook-endpoints.ts` — confirm
  `handleRotateWebhookSecret` returns plaintext exactly once and the
  audit/event payload carries ONLY `{secretVersion, previousSecretExpiresAt}`.
- `references/verifier-code-path-inspection.md` — for transaction-atomicity
  verification (the rotate is a single-UPDATE, but read the code path to
  confirm there is no read-then-write window or temporary plaintext leak).

## Required Outcomes

- [ ] PR boundary matches prompt (or deviations are structurally forced and
      documented).
- [ ] Hard rules clean: zero new `eslint-disable` / `@ts-ignore` /
      `@ts-expect-error` / `as any` / `as unknown as` under any path in
      scope; zero new `node:*` imports under new code; zero plaintext in
      any event/audit/log emission path; reveal-once (no fetch-secret
      surface introduced).
- [ ] Atomic rotate confirmed by code-path inspection (single UPDATE,
      previous-* columns set in same statement as new ciphertext).
- [ ] `ENDPOINT_SAFE_COLUMNS` does NOT include `previous_secret_ciphertext`.
- [ ] `getEndpointForDelivery` hydrates the three previous-* fields onto
      the delivery-bound endpoint type.
- [ ] Delivery dual-signs only when `previousSecretCiphertext != null` AND
      `previousSecretExpiresAt > now`; clean fallthrough on decryption
      failure (no exception bubbling, no header emitted, primary delivery
      unaffected).
- [ ] ≥4 new worker test cases covering: shape regex (`/^whsec_[0-9a-f]{32}$/`),
      no plaintext in audit/event payload, dual-sig within grace, single-sig
      post-expiry. Implementer claims 6 — confirm.
- [ ] Migration is forward-only and idempotent (re-run safe).
- [ ] Contracts addition is backwards-compatible (existing consumers
      compile with old shape).
- [ ] Quality gates locally: `pnpm -w typecheck` 43/43, `pnpm -w lint` 0
      errors / 45 pre-existing warnings in `tests/api-edge/**`,
      `pnpm --filter @saas/contracts-tests test`,
      `pnpm --filter @saas/db-tests test`,
      `pnpm --filter @saas/webhooks-worker-tests test` all green
      (modulo the documented pre-existing notifications migration test
      failure — confirm by re-running on `main` to ensure unchanged).
- [ ] Orun gates: `kiox -- orun validate --intent intent.yaml`,
      `kiox -- orun plan --changed --intent intent.yaml --output plan.json`
      (selects only the changed components — webhooks-worker, db,
      contracts, plus their test packages — across dev/stage/prod), and
      `kiox -- orun run --plan plan.json --dry-run --runner github-actions`
      green.
- [ ] PR-CI: ALL required checks SUCCESS via `gh run view --log` (NOT just
      summary). Inspect actual `Run orun run \\` output per lane.
- [ ] Implementer report (`ai/reports/task-0108-implementer.md`) is
      committed on the PR branch (it is — commit `cada19b`).
- [ ] No secrets / plaintext credentials in PR diff or CI logs.

## Non-Goals

- Multi-key `@saas/webhook-verifier` extension (out of scope per spec).
- Console reveal-once modal (Task 0109).
- CLI `webhook secrets rotate` subcommand (Task 0110).
- Any backfill of existing endpoints' previous-* columns.
- Any new fetch-secret surface.

## Constraints

1. NEVER merge a PR with failing CI checks.
2. NEVER merge a PR with unresolved verification blockers.
3. If PR is BEHIND `main` at merge time, run `gh pr update-branch 163`,
   wait for fresh PR-CI green at the post-update HEAD, then merge (recurring
   pattern across 0105/0106/0107).
4. After squash merge with `--delete-branch`: checkout `main`, `git pull
   --ff-only origin main`, watch the post-merge main-CI run to completion
   (must include the migration apply lane for `db` if applicable).
5. Migration is applied on stage/prod by post-merge main-CI — confirm the
   apply lane succeeded before declaring PASS bookkeeping.

## Integration Notes

- **Migration apply gate.** Post-merge main-CI runs the migration
  pipeline. The new column adds are idempotent and forward-only; expect
  zero risk on stage. If apply fails, restore from automatic backup is
  not needed (no destructive change) but the PR state must be flagged
  in the verifier report.
- **Encryption adapter coupling.** `encryptSigningSecret(env)` now
  returns `{ secret, ciphertext }` instead of just the ciphertext.
  Confirm no other call site relies on the old shape (search:
  `encryptSigningSecret(`).
- **`X-Webhook-Signature-Previous` is a NEW public header.** Subscribers
  consuming the header today see no change; subscribers willing to
  validate against either secret during the grace window can opt in.
  Document this in the verifier report under Spec Proposals if a
  user-facing webhook docs update is warranted.

## Acceptance Criteria

✅ All Required Outcomes checked.
✅ PR-CI all required lanes SUCCESS (verified via `gh run view --log`,
   not summary).
✅ Migration `130_webhook_secret_rotation_grace` apply succeeds on the
   post-merge main-CI run for stage/prod (or the apply lane is correctly
   gated and runs in the next planned cycle — record observed state).
✅ `ENDPOINT_SAFE_COLUMNS` audit shows `previous_secret_ciphertext` is
   excluded (greppable: search `ENDPOINT_SAFE_COLUMNS` and confirm).
✅ Reveal-once shape regex matches: `/^whsec_[0-9a-f]{32}$/`.
✅ Audit/event payloads contain ONLY `{secretVersion,
   previousSecretExpiresAt}` — greppable: rotate-handler search for
   `payload:` literals + audit description string contains no plaintext
   or `whsec_`.
✅ Local checks all green (typecheck 43/43, lint 0 errors, three test
   filters pass).
✅ Orun gates all green (validate / plan --changed / run --dry-run).
✅ PR squash-merged with `--delete-branch`; main fast-forward pulled;
   post-merge main-CI green; verifier report committed on `main`;
   `state.json` / `current.md` / `task-ledger.md` advanced to Task 0109.

## Verification (executable steps)

1. `git fetch origin && git checkout impl/task-0108-webhook-secret-rotation-grace && git pull --ff-only`.
2. `gh pr view 163 --json title,state,mergeable,mergeStateStatus,headRefOid` — sanity.
3. `gh pr diff 163 --name-only | sort -u` — file boundary check (≤13
   paths, all under documented subsystems).
4. Hazard scan:
   ```bash
   git diff main...HEAD -- 'apps/webhooks-worker/**' \
     'packages/db/**' 'packages/contracts/**' 'tests/**' \
     | grep -nE 'eslint-disable|@ts-ignore|@ts-expect-error|as any|as unknown as|^\+.*from .node:'
   ```
   Expect zero hits (or zero NEW vs main).
5. Plaintext-leak scan in rotate handler + delivery:
   ```bash
   git show HEAD:apps/webhooks-worker/src/handlers/webhook-endpoints.ts \
     | grep -nE 'plaintextSecret|whsec_'
   ```
   Confirm `whsec_` appears ONLY in the response builder, not in any
   audit/event payload literal.
6. `ENDPOINT_SAFE_COLUMNS` audit:
   ```bash
   grep -nE 'ENDPOINT_SAFE_COLUMNS|previous_secret_ciphertext' \
     packages/db/src/webhooks/repository.ts
   ```
   Confirm `previous_secret_ciphertext` is NEVER in `ENDPOINT_SAFE_COLUMNS`.
7. `pnpm install --frozen-lockfile`.
8. `pnpm -w typecheck` (expect 43/43 OK).
9. `pnpm -w lint` (expect 0 errors, 45 warnings all in `tests/api-edge/**`).
10. `pnpm --filter @saas/contracts-tests test`.
11. `pnpm --filter @saas/db-tests test` (note + suppress the documented
    pre-existing notifications failure; confirm by stashing this PR's
    changes and re-running on `main`).
12. `pnpm --filter @saas/webhooks-worker-tests test` (expect 70/70 pass,
    +6 new vs baseline).
13. `kiox -- orun validate --intent intent.yaml`.
14. `kiox -- orun plan --changed --base origin/main --intent intent.yaml --output plan.json`.
15. `kiox -- orun run --plan plan.json --dry-run --runner github-actions`.
16. `gh pr checks 163 --watch` until all required lanes terminal.
17. `gh run view <plan-run-id> --log | grep -E 'webhooks-worker|^db|contracts'`
    — confirm expected components selected.
18. For each non-plan lane: `gh run view <run-id> --log` and grep for
    `Run orun run \\` step output. Confirm typecheck/lint/test commands
    actually executed (NOT just summary green).
19. If MERGEABLE/BLOCKED is solely on required-checks-pending and all
    are green: proceed to merge. If BEHIND: `gh pr update-branch 163`,
    wait for fresh PR-CI green, then merge.
20. `gh pr merge 163 --squash --delete-branch`.
21. `git checkout main && git pull --ff-only origin main`.
22. `gh run watch <main-ci-run-id>` (post-merge main-CI; confirm the
    `db` migration apply lane succeeds for stage and prod).
23. Write `ai/reports/task-0108-verifier.md` with: Result, Checks,
    CI Log Review, Live Resource Evidence (migration apply confirmation),
    Issues, Risk Notes, Spec Proposals, Recommended Next Move.
24. Update `ai/state.json` (add `0108` to `completed`, advance
    `current_task` to `0109`, refresh `last_verified`),
    `ai/context/current.md` (Task 0108 closed, Task 0109 next),
    `ai/context/task-ledger.md` (append 0108 entry).
25. `git add ai/reports/task-0108-verifier.md ai/context/* ai/state.json
    && git commit -m "ai: Task 0108 verifier PASS — webhook secret rotation grace merged"
    && git push origin main`.

## PR Creation Requirement

The Implementer has already created the PR (#163). Your job is to
verify and merge it.

## When Done Report

Save to `ai/reports/task-0108-verifier.md` with these sections:

- `Result: PASS` or `Result: FAIL`
- `Checks` — full list of validation steps performed with actual outputs
- `Issues` — any problems found, severity-tagged
- `CI Log Review` — PR-CI run IDs, post-merge main-CI run ID, with
  `gh run view --log` evidence per lane
- `Live Resource Evidence` — migration apply confirmation on stage/prod
  (Supabase / Cloudflare side observable state)
- `Secret Handling Review` — confirm zero plaintext leaks; greppable
  evidence for `ENDPOINT_SAFE_COLUMNS` audit + payload sanitisation
- `Spec Proposals` — drift assessment; webhook docs update for the new
  `X-Webhook-Signature-Previous` header (if appropriate)
- `Risk Notes` — residual risks (e.g., `@saas/webhook-verifier` is
  single-key today; subscribers must hand-pick which key during grace)
- `Recommended Next Move` — Task 0109 (console reveal-once modal) or
  Task 0110 (CLI rotate subcommand)
