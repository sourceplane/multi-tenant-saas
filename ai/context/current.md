# Current Context

Last updated: 2026-05-31 — Task 0099 (SDK resource fan-out, B4 first half)
CLOSED. `@saas/sdk` now exposes the full 11-client surface.

## What just landed

**Task 0099 — `@saas/sdk` resource client fan-out (B4 first-half closure).**
PR #153 squash `93ebe0e`. Single-pass closure (Implementer + Verifier same
session). 13 files / +2,178 / −6, all net-new under `packages/sdk/**` plus
implementer + verifier reports.

Nine new resource clients wired into `Sourceplane`:

| Client                 | URL family                                                                 |
|------------------------|---------------------------------------------------------------------------|
| `apiKeys`              | `/v1/organizations/:orgId/api-keys[/:id]`                                  |
| `billing`              | `/v1/organizations/:orgId/billing/...`                                     |
| `config` (discriminated `ConfigScope`) | `/v1/organizations/:orgId[/projects/:projectId[/environments/:envId]]/config/...` |
| `events` (discriminated `ListAuditEntriesQuery`) | `/v1/organizations/:orgId/audit?by=org\|target...`               |
| `memberships`          | `/v1/organizations/:orgId/{members,invitations}/...`                       |
| `metering`             | `/v1/organizations/:orgId/{usage,usage/batch,quotas/check,...}`            |
| `notifications`        | `/v1/notifications/...` (service-binding-internal per spec 14)             |
| `securityEvents`       | `/v1/auth/security-events` (actor-scoped)                                  |
| `webhooks`             | `/v1/organizations/:orgId[/projects/:projectId]/webhooks/...`              |

All consume types directly from `@saas/contracts`; no contract edits. URL
paths cross-checked against the api-edge facade route tables. Stripe
parity preserved: `encodeURIComponent` on every dynamic path segment;
caller-owned `idempotencyKey` on POSTs (SDK never auto-generates).

Test surface: `packages/sdk/src/__tests__/resources.test.ts` adds 39 new
tests covering URL shape + idempotency passthrough + typed error decoding
per resource. SDK total 31 → **70 pass**.

Quality gates:
- `pnpm --filter @saas/sdk typecheck` → exit 0
- `pnpm --filter @saas/sdk lint` → exit 0
- `pnpm --filter @saas/sdk test` → 70/70 pass
- `pnpm exec turbo run build --filter=@saas/sdk` → 2 successful
- `pnpm -r typecheck` → exit 0
- `pnpm -r --no-bail lint` → 0 errors, exactly **45** warnings (all
  `tests/api-edge`, Task 0096f territory — baseline preserved)
- Hazard scan `packages/sdk/**` → 0 hits (no new `eslint-disable*`,
  `@ts-ignore`, `@ts-expect-error`, `as unknown as`, `as any`)

CI: PR-CI 4/4 PASS (`plan` + `sdk · {dev,stage,prod} · Verify`).
Post-merge main-CI run `26693266415` = 4/4 SUCCESS.

Reports: `ai/reports/task-0099-{implementer,verifier}.md`.

## Track B4 status

**First half CLOSED.** `@saas/sdk` is now feature-complete against the
api-edge facade surface. Next leg is Task 0100 (`packages/cli` per spec
13) on top of the SDK.

## Still in flight

- **Task 0096f** — `tests/api-edge` class-B drain (45 → 0
  no-explicit-any, closes Track B globally). Branch
  `impl/task-0096f-tests-api-edge-class-b`. Implementer prompt at
  `ai/tasks/task-0096f.md`; sealed verifier prompt at
  `ai/tasks/task-0096f-verifier.md`. Zero file overlap with the Task
  0099 surface.

## Next focus

Per `specs/roadmap.md`:
- **Task 0100** — `packages/cli` per spec 13, consumes `@saas/sdk` as
  its sole transport (B4 second half).
- **B5 per-tenant rate-limit overrides** — natural extension of Task
  0097 once tenant-specific configuration is needed.

Deferred candidates unchanged: `0085b`, `notifications-provider-swap`,
`notifications-worker-dev-reframe` (see `ai/deferred.md`).
