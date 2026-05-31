# Task 0126 — B5 Webhooks Polish: Manual Delivery Replay — Implementer Report

## Summary

Shipped a buyer-credible **Redeliver** action across the full stack
(worker → contracts → SDK → CLI → Console). From a terminal webhook delivery
attempt in per-endpoint history, an org operator can trigger a fresh delivery of
the **same event to the same endpoint** through the existing signing/delivery
seam, with the new attempt appearing in history. This fills the one named,
human-independent B5 gap still missing on main.

Design pillars:
- **Single delivery chokepoint** — `replayDeliveryAttempt()` reuses
  `deliverAttempt()`; no second delivery path. Endpoint-disabled gating, HMAC
  signing + dual-signature grace window, retry/backoff, lifecycle events, and
  consecutive-failure auto-disable are inherited unchanged.
- **Full original payload** — unlike `retryFailedDeliveries()` (`event=null` →
  `data:{}`), manual replay rehydrates the full `StoredEvent` by id via the new
  `EventsRepository.getEventById()`. A missing event degrades to `data:{}`
  rather than failing.
- **Replay-distinct idempotency key** — `${subscriptionId}:${eventId}:replay:${newAttemptId}`,
  never colliding with the dispatch key `…:1` or another replay.
- **Authz** — replay requires `organization.webhook.write` (triggers outbound
  delivery), not read; deny → 404 (no existence leak). Missing/cross-org → 404.
  Disabled endpoint → `endpoint_disabled` terminal path.
- **Additive only** — existing webhook contract bytes unchanged; automatic
  dispatch/retry paths unchanged; no secret/ciphertext/raw payload in responses.

## Files Changed

Implementation:
- `apps/webhooks-worker/src/delivery.ts` — `replayDeliveryAttempt()` seam
- `apps/webhooks-worker/src/handlers/webhook-delivery-attempts.ts` —
  `handleReplayDeliveryAttempt()` + parameterized `authorizeWebhookAction()`
- `apps/webhooks-worker/src/router.ts` — `POST …/delivery-attempts/:id/replay`
  (ordered before the item GET so longest-specific wins)
- `packages/db/src/events/types.ts` + `repository.ts` — `getEventById()`
- `packages/contracts/src/webhooks.ts` — additive `ReplayWebhookDelivery{Request,Response}`
- `packages/sdk/src/webhooks.ts` + `index.ts` — `replayDelivery()` + re-exports
- `packages/cli/src/commands/webhook-deliveries-replay.ts` + `cli-runner.ts` —
  `webhook deliveries replay <attemptId>`
- `apps/web-console-next/.../webhooks/[endpointId]/page.tsx` +
  `components/webhooks/delivery-history.ts` — Redeliver button + `canReplayAttempt()`

Tests (+14):
- `tests/webhooks-worker/src/delivery.test.ts` — 5 replay seam tests
- `tests/webhooks-worker/src/webhooks-worker.test.ts` — 1 replay route plumbing
- `tests/db/src/events.test.ts` — 3 getEventById tests
- `tests/contracts/src/webhooks.test.ts` — 2 Replay shape tests
- `packages/sdk/src/__tests__/resources.test.ts` — 3 replayDelivery tests
- `packages/cli/src/__tests__/webhook-deliveries-replay.test.ts` — 7 CLI tests
- `tests/api-edge/src/webhooks-facade.test.ts` — 1 facade route-match test
- `tests/{events,identity,projects}-worker` — EventsRepository mocks updated for
  the new interface method

## Checks Run

- `pnpm -r typecheck` — clean (all 42 workspace projects)
- `pnpm -r lint` — 0 errors (pre-existing `any` warnings in test files only)
- `pnpm -r test` — **2283 passed** across 17 test packages
- `kiox -- orun validate --intent intent.yaml` — ✓ intent valid
- `kiox -- orun plan --changed --intent intent.yaml --output plan.json` — ✓
  23 jobs across 11 changed components
- `kiox -- orun run --plan plan.json --dry-run --runner github-actions` — ✓
  all 23 jobs Verify-clean

## Assumptions

- New attempts start at `attemptNumber = 1` (the `createDeliveryAttempt` column
  default), symmetric to a first dispatch.
- Read-back failure after a successful delivery falls back to the freshly-created
  (pending) row rather than reporting a replay failure — the delivery did happen.
- 201 Created is the correct status (a new delivery-attempt resource is created).

## Spec Proposals

None. Implementation fits within existing B5 webhook specs; the replay
contract types are purely additive and the delivery seam is reused.

## Remaining Gaps

- Carry-forward nit (non-blocking): `packages/cli/src/commands/cross-reads.ts`
  `parseAuditFilterFlags` doc-comment says malformed input "surfaces as a 400"
  but the worker returns 422 — fold into any future cross-reads touch.

## Next Task Dependencies

None blocking. Replay is self-contained and additive; downstream B5/B6 work can
proceed independently.

## PR Number

181
