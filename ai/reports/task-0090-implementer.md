# Task 0090 — Implementer Report

PR: https://github.com/sourceplane/multi-tenant-saas/pull/138
Branch: `impl/task-0090-notifications-idempotency-keys`
Status: PR open, awaiting verifier.

## Summary

- Closed the V1 idempotency-key risk flagged by the Task 0088 verifier:
  all three live `@saas/notifications-client` callers
  (identity-worker `auth.magic_link`, membership-worker
  `invitation.created`, membership-worker `invitation.accepted`) now
  populate a deterministic, template-scoped `idempotencyKey` on the
  enqueue body.
- Added a small shared helper
  `buildIdempotencyKey(scope, ...parts)` in
  `@saas/notifications-client`. Pure, deterministic, scope-prefixed,
  validates segments against whitespace, `:`, and control characters.
  Backward-compatible additive export — no signature change to
  `enqueueNotification`, `NotificationsEnvBinding`,
  `NotificationsClientContext`, or `EnqueueNotificationResult`.
- Per-call-site keys follow the architect's recommended scope-prefixed
  shape:
  - `auth.magic_link:${challengeId}`
  - `invitation.created:${invitationPublicId(inv.id)}`
  - `invitation.accepted:${invitationPublicId(inv.id)}:${memberPublicId(member.id)}`
- Best-effort enqueue contract preserved on every path (no thrown
  errors reach the user-facing response; existing negative tests stay
  green).
- Zero edits outside the documented PR Boundary.

## Files Changed (grouped by subsystem)

Shared client:
- `packages/notifications-client/src/index.ts` — added
  `buildIdempotencyKey` helper.

Caller wiring:
- `apps/identity-worker/src/handlers/login-start.ts` — populated
  `idempotencyKey` from `result.challengeId`. Added optional
  `HandleLoginStartDeps { repo?, enqueueNotification? }` for unit
  testability; production call site is unchanged (deps default to
  the real repository + enqueue function).
- `apps/membership-worker/src/handlers/create-invitation.ts` —
  populated `idempotencyKey` from `invitationPublicId(inv.id)` on
  both the transactional and fallback enqueue paths.
- `apps/membership-worker/src/handlers/accept-invitation.ts` —
  populated `idempotencyKey` from
  `invitationPublicId(inv.id) + memberPublicId(member.id)` composite
  on both the transactional and fallback enqueue paths.

Tests:
- `tests/notifications-client/src/notifications-client.test.ts` —
  7 new `buildIdempotencyKey` tests covering determinism, purity,
  template-scoping, and rejection of empty / control-character
  segments.
- `tests/identity-worker/src/login-start-notifications.test.ts`
  (new file) — asserts the magic-link enqueue carries a
  deterministic `auth.magic_link:chl_*` key, that two distinct
  challenges yield distinct keys, that `rawCode` and any 64-hex
  hash run never appears in the key, and that DEBUG_DELIVERY skips
  the enqueue entirely (no key path).
- `tests/identity-worker/package.json` — added
  `@saas/notifications-client` Jest `moduleNameMapper` entry so
  the new test can resolve the workspace package source.
- `tests/membership-worker/src/create-invitation-notifications.test.ts` —
  added a Task 0090 `describe` block: deterministic
  `invitation.created:inv_…` key across two replays (with
  `crypto.randomUUID` pinned for the synthesized inv id) and no
  raw-token / hash leak.
- `tests/membership-worker/src/accept-invitation-notifications.test.ts` —
  added a Task 0090 `describe` block: composite
  `invitation.accepted:inv_…:mem_…` key, deterministic across
  replays, no raw-token leak.

## Checks Run

- `pnpm -F @saas/notifications-client typecheck` → green.
- `pnpm -F @saas/identity-worker typecheck` → green.
- `pnpm -F @saas/membership-worker typecheck` → green.
- `pnpm -F @saas/notifications-client-tests test` → 15/15 PASS
  (8 pre-existing + 7 new).
- `pnpm -F @saas/identity-worker-tests test` → 122/122 PASS
  (4 new in `login-start-notifications.test.ts`).
- `pnpm -F @saas/membership-worker-tests test` → 244/244 PASS
  (4 new across the two invitation files).
- `kiox -- orun validate --intent intent.yaml` → `✓ Intent is
  valid`, `✓ All validation passed`.
- `kiox -- orun plan --changed --intent intent.yaml --output plan.json`
  → 6 components × 3 envs → 12 jobs. Plan selects exactly
  identity-worker, identity-worker-tests, membership-worker,
  membership-worker-tests, notifications-client,
  notifications-client-tests across stage / prod / dev as
  applicable. Notifications-worker is NOT in the plan
  (PR Boundary respected).
- `kiox -- orun run --plan plan.json --dry-run --runner github-actions`
  → all 12 jobs preview OK in 0.0s.

Out-of-scope pre-existing failures (confirmed reproducing on a
clean stash of working changes):

- `@saas/policy-engine-tests typecheck` — `Cannot find type
  definition file for 'node'`. Pre-existing on main.
- `@saas/projects-worker-tests lint` — ESLint v9 config migration
  required (project still on legacy `.eslintrc.*`). Pre-existing
  on main.
- `tests/identity-worker/src/api-key-admin.test.ts` — pre-existing
  compile failure called out as out-of-scope by the orchestrator.
- `profile.test.ts` (1 unused-var error) and `security-events.test.ts`
  (1 unused-import error) lint errors. Pre-existing on main; the
  new `login-start-notifications.test.ts` file lints clean (0
  errors, 8 `no-explicit-any` warnings consistent with sibling
  test files).

## Assumptions

- `result.challengeId` is the canonical durable handle for a
  magic-link challenge row. It is returned to the caller, persisted,
  and is not secret material — the rawCode is hashed server-side
  before any persistence; the public id only references the row.
- `invitationPublicId(inv.id)` and `memberPublicId(member.id)` are
  pure deterministic encodings of UUIDs that are themselves stable
  for the lifetime of the row. Acceptance creates `member.id` in the
  same committed transaction as the acceptance transition, so both
  ids are durable for any future retry of the same logical action.
- The notifications-worker's existing pre-insert idempotency lookup
  + conflict-race re-fetch + `idempotent_hit` outcome shape on
  `(org_id, idempotency_key)` is the source of truth for collapse
  semantics — this PR only populates the caller side; nothing in
  `apps/notifications-worker/**` was touched.
- The Jest `moduleNameMapper` extension on
  `tests/identity-worker/package.json` is the minimum-viable change
  to let the new test import from `@saas/notifications-client` —
  matches the pattern used by the membership-worker test workspace.

## Spec Proposals

None. The contract field `NotificationEnqueueRequest.idempotencyKey?`
already exists in `packages/contracts/src/notifications.ts`; only its
caller-side population is changing.

## Remaining Gaps

- `notifications-provider-swap` candidate stays DEFERRED — waiting
  on user provider choice (Resend / Postmark / SES). This PR is
  the precondition that lets the swap ship safely; it does not
  itself ship a provider.
- Task 0085b (cloudflare-domain v4→v5 + re-import) stays DEFERRED
  per explicit user defer; this PR did not touch
  `infra/terraform/cloudflare-domain/**` or the
  `cloudflare ~> 4.52` pin.
- `notifications-worker-dev` provisioning candidate needs reframing
  at a later orchestrator pass — every worker component runs
  `verify`-only on dev with no `profileRules` adding `deploy` on
  dev, so no live `*-dev` worker exists for any consumer; the
  candidate as currently scoped would be redundant.

## Next Task Dependencies

- Verifier should:
  1. Confirm PR diff is strictly within the documented PR Boundary
     (no notifications-worker, contracts, db, or infra touches).
  2. Inspect each call site and confirm `idempotencyKey` is
     deterministic, secret-free, and template-scoped.
  3. Inspect the magic-link path to confirm `rawCode` does not
     appear in the key (the test asserts this; verifier should
     re-read the code path to confirm the assertion isn't trivially
     satisfied by mocking).
  4. Run the per-package test suites and the kiox/orun triple
     locally; PR-CI should produce the same 13-job rollup shape as
     Task 0089.
  5. After PR merge, watch the post-merge main CI run, confirm
     13/13 SUCCESS, capture the four consumer-worker version IDs
     (identity stage, identity prod, membership stage, membership
     prod), and curl-verify `https://stage.sourceplane.ai/` and
     `https://prod.sourceplane.ai/` still 200/redirect to `/orgs`
     and the notifications-worker private 1042 invariant still
     holds.
- Once verified + merged, the orchestrator can promote the
  `notifications-provider-swap` candidate to scoped task as soon as
  the user picks a provider — the V1 idempotency precondition is
  now in place.

## PR Number

138
