# Task 0090 — Verifier Report

Result: **PASS**

PR #138 (`impl/task-0090-notifications-idempotency-keys`, head `b8940df`)
squash-merged to `main` as `a5aa47d` at 2026-05-29T23:53:44Z. Post-merge
main-CI run `26668188122` = 13/13 SUCCESS.

## Checks

### PR Boundary
- `gh pr diff 138 --name-only` → 16 paths, all inside the documented PR
  Boundary. Zero hits on `apps/notifications-worker/**`,
  `packages/contracts/src/notifications.ts`, `packages/db/**`,
  `infra/terraform/cloudflare-domain/**`, the `cloudflare ~> 4.52` pin,
  any `apps/*/wrangler.jsonc`, or any `apps/*/component.yaml`. PR-Sized
  Task Standard satisfied.

### Code-Path Inspection
- `apps/identity-worker/src/handlers/login-start.ts` — `idempotencyKey`
  set to `buildIdempotencyKey("auth.magic_link", result.challengeId)`.
  `result.rawCode` only flows into `templateData.code` (pre-existing V1
  behavior, explicitly preserved by the prompt) and the debug response;
  it does NOT appear in any `idempotencyKey`. Verified by grep over the
  three handler files — only two `rawCode` references, both on the
  templateData path.
- `apps/membership-worker/src/handlers/create-invitation.ts` — both
  transactional and post-tx fallback enqueue paths use
  `buildIdempotencyKey("invitation.created", invitationPublicId(inv.id))`.
  `inv.id` is the post-commit invitation row UUID; durable across retries.
- `apps/membership-worker/src/handlers/accept-invitation.ts` — both
  transactional and fallback enqueue paths use
  `buildIdempotencyKey("invitation.accepted", invitationPublicId(inv.id), memberPublicId(member.id))`.
  Composite is durable: `inv.id` + the new `member.id` minted in the
  acceptance transaction.
- All three keys are scope-prefixed (template-scoped) — same upstream id
  on a different template would not collide.
- Best-effort enqueue contract preserved: enqueues remain wrapped such
  that no thrown error reaches the user-facing 2xx response (244/244
  membership-worker tests + 122/122 identity-worker tests pass; existing
  negative tests around enqueue failure still green).
- `buildIdempotencyKey` helper in `packages/notifications-client/src/index.ts`
  is pure, deterministic, throws on empty/whitespace/`:`/control-character
  segments. Helper is an additive export — `enqueueNotification`,
  `NotificationsEnvBinding`, `NotificationsClientContext`,
  `EnqueueNotificationResult` signatures unchanged.

### Local Validation
- `pnpm install --frozen-lockfile` → up to date.
- `pnpm -F @saas/notifications-client typecheck` → clean.
- `pnpm -F @saas/notifications-client-tests test` → 15/15 PASS
  (8 pre-existing + 7 new `buildIdempotencyKey` tests).
- `pnpm -F @saas/identity-worker-tests test` → 122/122 PASS
  (includes new `login-start-notifications.test.ts`).
- `pnpm -F @saas/membership-worker-tests test` → 244/244 PASS
  (includes new Task 0090 describe blocks on both invitation files).
- `kiox -- orun validate --intent intent.yaml` → `✓ All validation passed`.
- `kiox -- orun plan --changed --intent intent.yaml --output plan.json`
  → 6 components × 3 envs = 12 jobs (identity-worker,
  identity-worker-tests, membership-worker, membership-worker-tests,
  notifications-client, notifications-client-tests). Notifications-worker
  was NOT planned — boundary preserved.
- `kiox -- orun run --plan plan.json --dry-run --runner github-actions`
  → all 12 jobs preview OK in 0.0s.
- Pre-existing failures called out in the implementer report
  (api-key-admin compile, policy-engine `node` types, projects-worker
  eslint v9) reproduce on clean main and are out of scope.

### CI Log Review
- PR-CI run `26668028804` = 13/13 SUCCESS (plan + 12 verify jobs).
- Post-merge main-CI run `26668188122` = 13/13 SUCCESS.
  Job rollup:
    - plan: success
    - notifications-client {dev,stage,prod} · Verify: success
    - notifications-client-tests · dev · Verify: success
    - identity-worker {dev,stage,prod} · Verify deploy: success
    - identity-worker-tests · dev · Verify: success
    - membership-worker {dev,stage,prod} · Verify deploy: success
    - membership-worker-tests · dev · Verify: success

### Live Resource Evidence (post-merge)
Worker version IDs captured from `26668188122` deploy logs:
- `identity-worker-stage`: `cd7e6c39-23b8-428c-87a0-30820ead3e18`
- `identity-worker-prod`:  `4d3d0944-16b4-45cd-a9c2-bcdcaebccd3a`
- `membership-worker-stage`: `ba8f0b9f-4fdb-4274-baa4-6d0411d54417`
- `membership-worker-prod`:  `149c3df0-adc8-412f-91e2-e3aef5f923a3`

Live curl:
- `https://stage.sourceplane.ai/` → 307 → `/orgs` (expected console redirect).
- `https://prod.sourceplane.ai/`  → 307 → `/orgs` (expected console redirect).

Notifications-worker private invariant intact:
- `notifications-worker-stage.sourceplane.ai` and
  `notifications-worker-prod.sourceplane.ai` both fail public DNS
  resolution — V1 stays internal-only, `workers_dev: false`.

### Secret Handling Review
- Grep on the four code files in scope returned only the pre-existing
  `result.rawCode` references on the templateData/debug-response paths
  (NOT on `idempotencyKey`). No bearer tokens, no API keys, no full
  database connection strings, no Cloudflare/Supabase secrets present.
- `idempotencyKey` values are exclusively built from public IDs
  (`challengeId`, `invitationPublicId`, `memberPublicId`) prefixed with
  the template key. All segment values are checked against control
  chars / whitespace / `:` by the helper.

## Issues
None blocking.

## Spec Proposals
None. The contract field `NotificationEnqueueRequest.idempotencyKey?`
already exists in `packages/contracts/src/notifications.ts`; only its
caller-side population changed.

## Risk Notes
- V1 notifications path is now idempotency-hardened end-to-end on the
  caller side. The notifications-worker idempotent-hit pre-insert lookup
  + `(orgId, idempotencyKey)` uniqueness invariant was already in place;
  this PR closed the gap that left it unused.
- `notifications-provider-swap` candidate (Resend / Postmark / SES)
  remains DEFERRED — awaiting user provider choice. The hardening
  shipped here is the precondition for that swap to ship safely (no
  customer-visible duplicate-email risk on `NOTIFICATIONS_PROVIDER`
  flip).
- Task 0085b (`cloudflare-domain` v4 → v5 + re-import) remains
  EXPLICITLY DEFERRED. PR #138 did NOT touch
  `infra/terraform/cloudflare-domain/**` or the `cloudflare ~> 4.52`
  pin — risk window stays sealed.
- `notifications-worker-dev-reframe` candidate remains DEFERRED. No
  consumer worker has a `*-dev` deploy lane today (every worker's
  `component.yaml` is `verify`-only on dev), so provisioning
  `notifications-worker-dev` alone gives the three callers no dev
  binding to consume. Needs a larger "introduce dev-deploy lane"
  design pass before the dev-binding work has anywhere to land.

## Recommended Next Move
Two viable next-task candidates, both safe to scope without human input:

1. **Pre-existing `identity-worker-tests` `Fetcher`/crypto TS-type fix**
   — small, isolated, removes ambient noise on every clean main test
   run (`api-key-admin.ts:77,112,136 — TS2304 Cannot find name 'Fetcher'`,
   plus `tests/policy-engine` TS2688 `node`). Quick, repo-health win.
2. **Dev-deploy lane design pass** — introduces `profileRules` adding
   `deploy` on `dev` for at least one consumer worker (most likely
   identity-worker or notifications-worker first), unblocking the
   reframed `notifications-worker-dev` candidate and closing the V1
   dev-wire gap for all three callers in a follow-up.

Recommendation: pick #1 next — it is the smaller, lower-risk PR that
clears repeating background noise and stays well clear of every
deferred boundary. #2 is a richer design pass that benefits from a
clean `pnpm typecheck` baseline.
