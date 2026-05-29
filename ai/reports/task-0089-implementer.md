# Task 0089 — Implementer Report

**Agent:** Implementer
**Branch:** `impl/task-0089-shared-notifications-client`
**PR:** #137 — https://github.com/sourceplane/multi-tenant-saas/pull/137
**Base:** `main` @ `9811919` (post Task 0088 close-out)
**Implementer commit:** `ca1470d`

## Summary

Two coupled changes in one coherent PR (the third caller is the
contractual trigger to extract — extracting earlier would have produced
a 2-consumer abstraction identical to the duplication):

1. **Extract** `notifications-client.ts` from identity-worker and
   membership-worker into a single shared workspace package
   `@saas/notifications-client` (`packages/notifications-client/`).
2. **Wire** `accept-invitation` to enqueue `invitation.accepted` via
   the shared client, strictly outside `executor.transaction()`
   (mirrors Task 0088's create-invitation pattern at lines 280–340).

Three consumers of the shared package after this PR:
- identity-worker login-start (`auth.magic_link`) — Task 0087
- membership-worker create-invitation (`invitation.created`) — Task 0088
- membership-worker accept-invitation (`invitation.accepted`) — **NEW**

## Key decisions

- **Lifted from identity-worker copy**, not membership: identity's
  comment block is more general; the two files were byte-identical in
  logic, so the choice was purely about doc voice.
- **No compiled `dist/`**: workspace consumers import from
  `packages/notifications-client/src/index.ts` directly via the package
  `exports` map. Matches the existing convention used elsewhere in the
  repo for worker-only shared code; avoids a build step that buys
  nothing.
- **Single canonical test suite** under `tests/notifications-client/`
  rather than duplicating the client-shape tests per consumer. The
  per-consumer test files now only assert the wire (handler-level), not
  the client itself.
- **`enqueueNotification` injected via deps** on `accept-invitation`
  (mirrors `create-invitation`): preserves the deps-path test ergonomics
  while the real-path enqueue lives inside the handler with a default
  binding to the actual implementation.
- **`templateData` for `invitation.accepted`** is
  `{ invitationId, orgId, role, acceptedBy, acceptedAt }` — no token,
  no email, no hash. Tests assert the 64-char hex token from the
  acceptance request never appears in the enqueued payload.
- **DEBUG short-circuit not added on accept-invitation**: the request
  carries no token in the response (the token was already consumed by
  acceptance), so there's no `local_debug` parity issue. Stage and prod
  enqueue identically.

## Files Changed

### New package

- `packages/notifications-client/package.json` — `@saas/notifications-client`
- `packages/notifications-client/tsconfig.json` (+ `tsconfig.build.json`)
- `packages/notifications-client/eslint.config.js`
- `packages/notifications-client/component.yaml`
- `packages/notifications-client/src/index.ts` — exports
  `enqueueNotification`, `EnqueueNotificationResult`,
  `NotificationsEnvBinding` (lifted verbatim from identity-worker copy)

### identity-worker

- `apps/identity-worker/package.json` — `+ @saas/notifications-client: workspace:*`
- `apps/identity-worker/src/handlers/login-start.ts` — import path swap
- `apps/identity-worker/src/notifications-client.ts` — **deleted**

### membership-worker

- `apps/membership-worker/package.json` — `+ @saas/notifications-client: workspace:*`
- `apps/membership-worker/src/handlers/create-invitation.ts` — import path swap
- `apps/membership-worker/src/handlers/accept-invitation.ts` —
  enqueue wire post-commit, `enqueueNotification` deps slot
- `apps/membership-worker/src/notifications-client.ts` — **deleted**

### Tests

- `tests/notifications-client/{package.json,tsconfig.json,eslint.config.js,component.yaml}`
- `tests/notifications-client/src/notifications-client.test.ts` — 8 tests
  (no_binding, internal URL/headers, identity forwarding, non_2xx,
  network_error, bad_response envelope, bad_response malformed JSON,
  never-throws)
- `tests/membership-worker/src/accept-invitation-notifications.test.ts` —
  enqueue wire tests (Task 0089 mirror of Task 0088 coverage)
- `tests/identity-worker/src/notifications-client.test.ts` — **deleted**
  (consolidated into shared suite)
- `tests/membership-worker/src/notifications-client.test.ts` — **deleted**
  (consolidated into shared suite)

## Checks Run

| Command | Result |
|---|---|
| `pnpm --filter @saas/notifications-client typecheck` | ✅ |
| `pnpm --filter @saas/identity-worker typecheck` | ✅ |
| `pnpm --filter @saas/membership-worker typecheck` | ✅ |
| `pnpm --filter @saas/notifications-client lint` | ✅ |
| `pnpm --filter @saas/identity-worker lint` | ✅ |
| `pnpm --filter @saas/membership-worker lint` | ✅ |
| `pnpm --filter @saas/notifications-client-tests lint` | ✅ |
| `pnpm --filter @saas/notifications-client-tests test` | ✅ 8/8 |
| `pnpm --filter @saas/membership-worker-tests test` | ✅ green (incl. both wire tests) |
| `pnpm --filter @saas/identity-worker-tests test` | ✅ 103/103 |
| Repo-wide `pnpm typecheck` | ✅ except pre-existing failures (see below) |

## Pre-existing failures (NOT regressions)

Confirmed via `git stash` against clean `main`:

- `apps/identity-worker/src/handlers/api-key-admin.ts:3:39` — TS2307
  `Cannot find module '@saas/db/events'`
- `apps/identity-worker/src/handlers/api-key-admin.ts:136:21` — TS2304
  `Cannot find name 'Fetcher'`
- `tests/identity-worker/src/api-key-admin.test.ts` — fails to compile
  due to the above (full identity-worker test suite still passes the
  103 tests that do compile)
- `tests/policy-engine` — TS2688 `Cannot find type definition file for
  'node'`

These reproduce on clean `main` and are out of scope for Task 0089.

## Best-effort contract — invariants

- Missing `NOTIFICATIONS_WORKER` binding → `{ ok: false, reason: "no_binding" }`,
  no throw, no log noise (binding genuinely absent on dev).
- non_2xx / network_error / bad_response → advisory log, response to
  the user is byte-identical to the no-enqueue path.
- Enqueue failure NEVER 5xx's the handler.
- Enqueue is sequenced AFTER `executor.transaction()` commit — a
  rolled-back acceptance cannot produce a notification.

## Workspace count

- Before: 35 workspace projects.
- After: 36 (`+ @saas/notifications-client`,
  `+ @saas/notifications-client-tests`,
  `- 2× per-worker notifications-client.test.ts`).

## Handoff to verifier

PR #137 ready for verifier review. Suggested checks:
1. Confirm the three import sites all resolve to `@saas/notifications-client`
   and the two old `apps/*/src/notifications-client.ts` are gone.
2. Confirm `accept-invitation.ts` enqueues strictly post-commit and that
   the result is awaited but discarded (best-effort).
3. Confirm `templateData` does not include the raw token, the
   `tokenHash`, or the user's email.
4. Confirm wrangler bindings unchanged from Task 0088 (this PR adds no
   new wrangler config — the binding `NOTIFICATIONS_WORKER` already
   exists on membership-worker stage+prod from Task 0088).
5. Confirm CI green; post-merge soak: hit
   `https://stage.sourceplane.ai/` and `https://prod.sourceplane.ai/`
   for liveness; verify no regression in invitation-accept flow.
