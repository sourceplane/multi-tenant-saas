# Task 0099 — Implementer Report

**Agent:** Implementer (single-pass closure task — see also `task-0099-verifier.md`)
**Branch:** `impl/task-0099-sdk-resource-fanout`
**Status:** READY FOR MERGE → PASS
**PR:** _(to be filled at PR-open time — placeholder until `gh pr create`)_

## Summary

- Fanned out `@saas/sdk` with 9 new resource clients (memberships, api-keys, webhooks, metering, billing, events, security-events, config, notifications) mirroring the `organizations.ts` / `projects.ts` pilot pattern from Task 0098.
- All clients consume types directly from `@saas/contracts`; no contract edits.
- Wired each into `Sourceplane` in `src/index.ts` as `client.<resource>` and re-exported the public request/response types.
- Added 39 new resource tests in `src/__tests__/resources.test.ts` covering URL shape, idempotency-key passthrough, and typed-error decoding per resource. Total SDK test count: **70 (was 31)**.
- Zero hazard tokens added, zero runtime deps added, zero changes outside `packages/sdk/**`.

## Files changed (grouped)

New resource clients under `packages/sdk/src/`:
- `apiKeys.ts` — `ApiKeysClient` (list/get/create/revoke)
- `billing.ts` — `BillingClient` (listPlans/getCustomer/getSummary/listInvoices/getEntitlements/checkEntitlement)
- `config.ts` — `ConfigClient` with discriminated `ConfigScope` (org/project/environment) covering settings + feature-flags + secrets
- `events.ts` — `EventsClient` with discriminated `ListAuditEntriesQuery` (by:org | by:target)
- `memberships.ts` — `MembershipsClient` (members.{list,updateRole,remove} + invitations.{list,create,revoke,accept})
- `metering.ts` — `MeteringClient` (recordUsage/ingestUsageBatch/getUsageSummary/checkQuota/listQuotaViolations)
- `notifications.ts` — `NotificationsClient` (enqueue/get/getPreferences/updatePreferences/suppressRecipient) — explicit JSDoc note that this is the service-binding-internal surface per spec 14
- `securityEvents.ts` — `SecurityEventsClient` (list against `/v1/auth/security-events`)
- `webhooks.ts` — `WebhooksClient` (org + project-scoped endpoints/subscriptions/deliveries)

Modified:
- `packages/sdk/src/index.ts` — wired the 9 clients, re-exported contract types
- `packages/sdk/src/__tests__/resources.test.ts` — new test file (39 tests)

Untouched (per quality bar):
- `transport.ts`, `errors.ts`, `organizations.ts`, `projects.ts`, `package.json`, `pnpm-lock.yaml`, anything outside `packages/sdk/**`

## Check commands and results

```
pnpm --filter @saas/sdk typecheck   → exit 0
pnpm --filter @saas/sdk lint        → exit 0
pnpm --filter @saas/sdk test        → 70/70 passing (was 31)
pnpm exec turbo run build --filter=@saas/sdk → 2 successful
pnpm -r typecheck                   → exit 0
pnpm -r --no-bail lint              → 0 errors, exactly 45 warnings (Task 0096f baseline preserved)
git diff --cached -- packages/sdk/ | grep -E "^\\+.*(eslint-disable|@ts-ignore|@ts-expect-error|as unknown as|as any)" | wc -l → 0
kiox -- orun validate --intent intent.yaml → All validation passed
kiox -- orun plan --changed --intent intent.yaml --base origin/main → sdk × 3 envs → 3 jobs (expected)
```

## Durable assumptions

- The api-edge facade regex set in `apps/api-edge/src/*-facade.ts` is the source of truth for SDK URL paths. All shapes were derived from the existing facade route tables (org-facade, project-facade, webhooks-facade, billing-facade, config-facade, metering-facade, audit-facade, auth-facade).
- `ConfigClient` uses a discriminated `ConfigScope` (`{kind:'organization'|'project'|'environment', ...ids}`) rather than nine separate methods, keeping the public surface compact while exactly matching the three URL families exposed by `config-facade.ts`.
- `EventsClient.listAuditEntries` takes a discriminated `ListAuditEntriesQuery` (`by:'org'` vs `by:'target'`) so callers don't need to import the `AuditQueryByOrg` / `AuditQueryByTarget` contract shapes at the call site.
- `NotificationsClient` is documented as service-binding-internal; consumers that wire it to a public base URL are explicitly out of scope (no api-edge facade exists; the worker enforces internal-actor headers).
- POST methods that create persistent resources accept `RequestOptions` and propagate `idempotencyKey` per the orgs/projects pattern. The SDK does NOT auto-generate idempotency keys (Stripe parity).

## Ancestors

- Task 0098 / PR #150 / merge `3a52f9b` — SDK scaffold + orgs/projects pilot
- Task 0098.1 / PR #152 / merge `6e161fd` — Orun component manifest

## Deviations / surprises

- None. Spec was clean, contracts were complete, facades were unambiguous.
