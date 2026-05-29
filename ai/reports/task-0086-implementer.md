# Task 0086 — Implementer Report

**Status:** Implementation complete, all checks green, ready for PR.
**Branch:** `impl/task-0086-notifications-worker` (off `main`).
**Spec:** `specs/components/14-notifications.md` (V1, email-only).
**Bounded context:** notifications (new).

## Summary

Delivered the Notifications V1 bounded context as a new Cloudflare Worker
(`apps/notifications-worker`) following the membership-worker reference layout.
The worker exposes an internal-only HTTP API for queuing, fetching, and managing
notification delivery; persists state in a new `notifications` Postgres schema
via Hyperdrive; emits canonical events to `events-worker` via service binding;
and dispatches through a small `NotificationProvider` abstraction whose only
V1 implementation is `local-debug` (always-succeeds, prints to console).

V1 scope held tightly:
- Channel: email only. The data model and contract types model `channel` as an
  enum so SMS/webhook/in-app can be slotted in later without a breaking change,
  but only `email` is validated/accepted in this PR.
- Provider: `local-debug` only. Provider resolution is keyed off
  `env.NOTIFICATIONS_PROVIDER`; unknown values fall back to `local-debug` and
  log a warning, so swapping in a real provider (SES, Resend, Postmark) is a
  one-file change in `src/providers/`.
- No Queues. Enqueue is synchronous: create row → call provider → record
  attempt → mark final state, all in the request. This matches the spec's
  "V1 may dispatch inline" guidance and keeps the per-tenant tracing path
  straightforward.
- No template rendering. `templateKey` + `templateData` are persisted opaquely
  for the provider; the worker never substitutes or logs `templateData` into
  events or audit payloads. (Asserted in tests.)

## Files Added / Changed

**Contracts** (`packages/contracts/`):
- `src/notifications.ts` (new, ~330 lines) — channel/category/status/recipient
  enums, request/response shapes for enqueue/get/prefs GET+PUT/suppress,
  `NotificationProvider`/`ProviderSendContext`/`ProviderSendResult` interfaces,
  event-type constants (`notification.queued|sent|failed|preference_updated|suppressed`),
  `NotificationEventInput` envelope, and `NOTIFICATIONS_INTERNAL_ACTOR_VALUES`
  allow-list.
- `src/index.ts`, `package.json` — added `./notifications` subpath export.

**Database** (`packages/db/`):
- `src/migrations/120_notifications_core/up.sql` (new, ~190 lines) — creates
  `notifications` schema with four tables (`preferences`, `notifications`,
  `notification_attempts`, `suppressions`) + indexes. All FKs tenant-scoped on
  `org_id`. All DDL `IF NOT EXISTS` per house style.
- `src/manifest.ts` — appended `120_notifications_core` migration entry,
  checksum `868cc1092b4b385b6ed3d203efe5302191865131bb98d0e9f5fe5ad6d16f01bb`,
  context `notifications`.
- `src/types.ts` — added `"notifications"` to `BoundedContext` union.
- `src/notifications/{index,types,repository}.ts` (new) — repository contract
  + Result-typed `pg`-backed implementation: `createNotification`,
  `getNotificationById`, `findNotificationByIdempotencyKey`,
  `markNotificationStatus`, `recordAttempt`, `listAttempts`, `listPreferences`,
  `upsertPreference`, `isSuppressed`, `createSuppression`.
- `package.json` — added `./notifications` subpath export.

**Worker** (`apps/notifications-worker/`, new):
- `package.json`, `tsconfig.json`, `eslint.config.js`, `wrangler.jsonc`,
  `component.yaml` — scaffold mirrored from `membership-worker`. Bindings:
  Hyperdrive `SOURCEPLANE_DB`, service binding `EVENTS_WORKER`. Vars:
  `NOTIFICATIONS_PROVIDER=local-debug`, `DEBUG_DELIVERY=true`.
- `src/env.ts` — `Env` shape (Hyperdrive + Fetcher + vars).
- `src/http.ts` — shared response helpers (`successResponse`, `errorResponse`,
  `validationError`, `notFound`, `methodNotAllowed`) returning the same
  `{error:{code,message,fields?},requestId}` envelope as other workers.
- `src/ids.ts` — UUID generation + `ntf_<hex32>` codec for public IDs.
- `src/providers/local-debug.ts` — always-ok provider returning a synthetic
  `local-debug-<short-id>` `providerMessageId`.
- `src/providers/index.ts` — `resolveProvider(env)` selector.
- `src/events-client.ts` — POSTs `NotificationEventInput` to
  `EVENTS_WORKER.fetch(...)` mirroring `api-edge/src/audit-facade.ts`'s
  forwarded-header pattern. Logs but does not throw on event-worker failures
  (notification persistence stays the source of truth).
- `src/services/notifications.ts` — request validation
  (`validateEnqueueRequest`), `enqueueNotification` (idempotency check →
  suppression check → create row → emit `queued` → call provider → record
  attempt → mark final state → emit `sent` or `failed`), `getNotificationByPublicId`,
  and the `StoredNotification → NotificationDeliveryStatus` projector.
- `src/handlers/{health,enqueue,get-notification,get-preferences,put-preferences,create-suppression}.ts`
  — thin HTTP wrappers that resolve repo + provider + actor and delegate to
  the service. Every write handler emits the corresponding event.
- `src/router.ts` — internal-actor gate (`x-internal-actor` /
  `x-actor-subject-id` / `x-actor-subject-type`) for everything except
  `/health`. Routes: `GET /health`, `POST /v1/notifications`,
  `GET /v1/notifications/:id`, `GET|PUT /v1/notifications/preferences`,
  `POST /v1/notifications/recipients/:recipient/suppress`. 405/404 fall-throughs
  use the standard envelope.
- `src/index.ts` — `fetch` -> `route(request, env)`.

**Tests** (`tests/notifications-worker/`, new):
- `package.json`, `tsconfig.json`, `eslint.config.js`, `component.yaml` —
  Jest ESM via `ts-jest`, same `moduleNameMapper` shape as
  `tests/membership-worker`.
- `src/notifications-service.test.ts` — 13 tests over `validateEnqueueRequest`,
  `enqueueNotification` (happy path, suppression short-circuit, provider
  failure, idempotency replay), `getNotificationByPublicId`, the local-debug
  provider, and the `toDeliveryStatus` projector. Uses an in-memory
  `NotificationsRepository` fake; injects a capturing emitter to assert event
  shapes (and to assert no `templateData` ever leaks into event payloads).
- `src/router.test.ts` — 7 tests covering the `/health` route, the
  internal-actor gate (missing header → 403, unknown actor → 403),
  503-when-DB-not-configured, 422 on malformed body, 405 on PATCH, 404 on
  unknown path.

**Task tracking**:
- `ai/tasks/task-0086.md` — already on disk from orchestrator.
- `ai/reports/task-0086-implementer.md` — this report.

## Checks Run

From repo root (`/Users/irinelinson/sourceplane/multi-tenant-saas`), on branch
`impl/task-0086-notifications-worker`:

```
$ ./.workspace/bin/orun validate
✓ Intent is valid
✓ All validation passed

$ ./.workspace/bin/orun component --changed --base main
Changed
  ✓ contracts                turbo-package                dev,prod,stage
  ✓ db                       turbo-package                dev,prod,stage
  ✓ db-migrate               db-migrate                   prod,stage
  ✓ notifications-worker     cloudflare-worker-turbo      dev,prod,stage
  ✓ notifications-worker-tests turbo-package              dev

$ ./.workspace/bin/orun plan --changed --base main
5 components × 3 envs → 12 jobs
mode: changed-only
plan: 712b683413dd

$ ./.workspace/bin/orun run 712b683413dd --dry-run
▲ orun multi-tenant-saas
  Plan: 712b683413dd
  Scope: 5 components · 12 jobs · 4× parallel · gha
  (all 12 jobs ✓ in preview)
```

Package-level:

```
$ pnpm exec turbo run build \
    --filter=@saas/notifications-worker \
    --filter=@saas/notifications-worker-tests \
    --filter=@saas/contracts \
    --filter=@saas/db
Tasks:    4 successful, 4 total
(wrangler --dry-run upload: 150.63 KiB / gzip 34.73 KiB)

$ cd tests/notifications-worker && pnpm test
Test Suites: 2 passed, 2 total
Tests:       20 passed, 20 total
```

Note: `pnpm -w build` surfaces one unrelated pre-existing failure on `main`
(`@saas/identity-worker-tests` — `Property 'crypto' does not exist on type
typeof globalThis` in identity-worker test files). I confirmed this also fails
on a clean `git stash` of my changes, so it is out of scope for this task and
will need its own fix (likely adding `node:crypto` import or `@types/node`
globals).

## Tenancy & Security Notes

- Every row in `notifications.*` carries `org_id` and indexes are tenant-scoped.
- `recipient_address` is stored lower-cased; suppression matches use the
  lower-cased form so casing tricks can't bypass a suppression.
- The router refuses every non-health request without a valid
  `x-internal-actor` from the `NOTIFICATIONS_INTERNAL_ACTOR_VALUES` allow-list
  (`membership-worker`, `billing-worker`, `policy-worker`, `events-worker`,
  `api-edge`). External callers must go through one of those workers.
- No secrets in DB rows: `template_data` is opaque, `provider_message_id` is
  opaque, suppression `reason` is a bounded enum. The service explicitly
  excludes `templateData` from event payloads (asserted by test).
- Idempotency is per-org: `(org_id, idempotency_key)` unique index in the
  repo + a pre-create check in the service to keep replays cheap.

## Follow-ups (out of scope)

1. Real provider adapter (SES / Resend / Postmark) — slot into
   `src/providers/`, gate via `NOTIFICATIONS_PROVIDER`.
2. Retry / Queues — V2 will likely move dispatch to a Cloudflare Queue with
   exponential backoff; the `notification_attempts` table is already shaped
   for multi-attempt history.
3. Hyperdrive + service-binding IDs in `wrangler.jsonc` are currently the
   shared placeholder IDs copied from events-worker — deployment to real envs
   will need real binding IDs (verifier should confirm during the deploy step).
4. Fix the pre-existing `identity-worker-tests` `crypto` type error on main
   (separate task — not introduced or aggravated here).
