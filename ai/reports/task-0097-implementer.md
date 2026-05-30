# Task 0097 Implementer Report — Edge per-org & per-identity rate limiting (B3 second half)

## Summary

Shipped `enforceRateLimit(request, requestId, env, routeFamily)` at the api-edge
Worker layer. The limiter runs BEFORE any KV idempotency lookup and BEFORE any
cross-binding fetch. Two independent token buckets per request: an `org` bucket
keyed on the path-extracted `orgId` (skipped if not org-scoped), and an
`identity` bucket keyed on a SHA-256 of the bearer token, falling back to
`anon:<routeFamily>:<CF-Connecting-IP>` for fully anonymous traffic. 429 if
either bucket overflows. `X-RateLimit-*` headers populate every response
(allowed and denied); `Retry-After` populates 429 responses. Fail-open posture:
missing binding, KV get/put errors → admit + warn (matches replay-store
semantics). Standard `rate_limited` envelope (already declared in
`packages/contracts/src/errors.ts`) on overflow.

## Backend choice — IDEMPOTENCY_KV reuse with `rl:v1:` prefix

**Decision: reuse the existing `IDEMPOTENCY_KV` namespace with mandatory
`rl:v1:` key prefix instead of provisioning a new namespace.** Rationale:

- Single-PR constraint. Provisioning a new KV namespace requires a Terraform
  apply (creates `cloudflare_workers_kv_namespace.api_edge_rate_limit` in
  stage and prod), which produces real 32-char hex IDs only AFTER main-CI
  apply. The PR cannot ship `wrangler.jsonc` with sentinel IDs (Task 0095.1
  Phase 5 explicitly bans them via `KV_ID_SENTINELS` in
  `verify-bindings.mjs`). A second PR after apply is the chicken-and-egg
  Task 0095.1 hit. Sharing the namespace with the existing prefixed key
  pattern is the cheapest single-PR ship.
- Prefix-collision proof: idempotency keys use shape `idem:v1:<requestId>`
  (Task 0095, sealed). Rate-limit keys use shape
  `rl:v1:identity:<family>:<sha>` and `rl:v1:org:<family>:<orgId>`. Distinct
  literal prefixes, no overlap.
- Operational cost: rate-limit entries TTL at 600s vs idempotency 24h. KV
  TTL is per-key, so namespace sharing has no cleanup interaction.
- No `verify-bindings.mjs` change required — `EXPECTED_KV` already asserts
  the shared binding and the same regex+sentinel guards apply.
- Documented at top of `apps/api-edge/src/rate-limit.ts`.

DOs were rejected: per-key DO instance overhead and request-path latency on
every gate is the wrong shape for a fail-open best-effort gate. Native
`RateLimit` binding was rejected: it doesn't yet expose per-bucket configurable
caps with the `org` / `identity` axis we need; binding-managed counters can't
be inspected from the dashboard for ops triage.

## Algorithm choice — token bucket with last-writer-wins

Token bucket with continuous refill (`limit` tokens, `refillPerSec =
limit/windowSec`). KV value: compact JSON `{t,r}` where `t` = tokens (float)
and `r` = `refilledAt` epoch seconds. On each request: read, refill since
`r`, deduct 1, write back with TTL = `windowSec`. Concurrency: last-writer-wins
under contention — V1 imprecision, documented; in practice the limit is at
worst `≤2× nominal` for a single bucket under simultaneous bursts at the same
edge POP. Acceptable for a fail-open admission control gate; the verifier or a
follow-up task can swap the backend to a Durable Object if the precision
budget tightens.

## Per-route-family caps shipped

Each family has independent `identity` and `org` sub-buckets (org bucket
applies only when an org-scoped path is matched).

| Family    | identity limit/window | org limit/window |
|-----------|-----------------------|------------------|
| auth      | 10 / 60s              | 60 / 60s         |
| org       | 60 / 60s              | 300 / 60s        |
| project   | 60 / 60s              | 300 / 60s        |
| config    | 60 / 60s              | 300 / 60s        |
| webhooks  | 60 / 60s              | 300 / 60s        |
| metering  | 60 / 60s              | 300 / 60s        |
| billing   | 60 / 60s              | 300 / 60s        |
| audit     | 60 / 60s              | 300 / 60s        |

Matches the architect-brief recommendation. Refill = `limit / windowSec`.

## Key encoding

- identity (authed):   `rl:v1:identity:<family>:<sha256(bearer-token)>`
- identity (anon):     `rl:v1:identity:<family>:anon:<family>:<CF-Connecting-IP|"unknown">`
- org:                 `rl:v1:org:<family>:<orgId>`

`<family>` ∈ {auth, org, project, config, webhooks, metering, billing, audit}.
SHA-256 prevents the bearer token from appearing in KV. `CF-Connecting-IP` is
the canonical client IP at the edge per architect brief; falls back to
`"unknown"` when absent (covers test harness + non-CF traffic).

`orgId` is extracted from the path with a `/v1/organizations/{orgId}/...`
matcher; routes that don't match skip the org bucket cleanly.

## Headers emitted

On every response (allowed and rejected), per scope that ran:

- `X-RateLimit-Limit-<scope>: <limit>`
- `X-RateLimit-Remaining-<scope>: <floor(tokens)>`
- `X-RateLimit-Reset-<scope>: <epoch-seconds when full>`

`<scope>` is `Identity` or `Org`. When the org bucket didn't run (no orgId in
path), only `Identity` headers are emitted.

On 429 responses, additionally:

- `Retry-After: <ceil(seconds-until-1-token)>`
- Body: `{"error":{"code":"rate_limited","message":"...","details":{"scope":"identity|org","retryAfterSeconds":N}}}`

## Failure-open behavior

- Missing `IDEMPOTENCY_KV` binding → admit, no headers (no state to report).
- KV `get` throws → log via `console.warn("rate_limit.kv_get_failed", ...)`,
  treat as cache miss (full bucket), admit.
- KV `put` throws → log via `console.warn("rate_limit.kv_put_failed", ...)`,
  admit (the request was already counted in-memory; failure to persist means
  the next request gets a fresh budget — strictly fail-open).
- Tested directly in `tests/api-edge/src/rate-limit.test.ts` "fail open"
  describe block (KV get failure / KV put failure).

## Integration into facades

- `replayOrExecute(request, requestId, env, routeFamily, downstream)` —
  added required positional `routeFamily` arg before the `downstream` lambda.
  All 7 unsafe-method facades (auth/org/project/config/webhooks/metering/
  billing) updated. Forces explicit family selection at every call site.
- The limiter runs as the FIRST step inside `replayOrExecute`, before
  `parseIdempotencyKey` and before any KV cache lookup.
- `audit-facade.ts` (GET-only, doesn't go through `replayOrExecute`)
  integrates `enforceRateLimit` directly after method check, decorating
  503/auth-fail/downstream/catch responses with `mergeRateLimitHeaders`.
- All response paths (replay hit, miss-then-store, malformed key 400,
  no-key passthrough, no-KV passthrough, downstream error) now decorate
  through `mergeRateLimitHeaders` so the contract is uniform.

## Diff stat

```
 ai/reports/task-0097-implementer.md           | (new)
 apps/api-edge/src/audit-facade.ts             | +28 -7
 apps/api-edge/src/auth-facade.ts              |  +1 -1
 apps/api-edge/src/billing-facade.ts           |  +1 -1
 apps/api-edge/src/config-facade.ts            |  +1 -1
 apps/api-edge/src/idempotency.ts              | +30 -13
 apps/api-edge/src/metering-facade.ts          |  +1 -1
 apps/api-edge/src/org-facade.ts               |  +1 -1
 apps/api-edge/src/project-facade.ts           |  +1 -1
 apps/api-edge/src/rate-limit.ts               | (new, 377 lines)
 apps/api-edge/src/webhooks-facade.ts          |  +1 -1
 tests/api-edge/src/idempotency-replay.test.ts | (signature + prefix-filter updates)
 tests/api-edge/src/rate-limit.test.ts         | (new, 503 lines, 35 it())
```

api-edge-tests count: 263 → 298 (+35 new it() in rate-limit.test.ts; existing
suites unchanged).

## Checks run

- `pnpm --filter @saas/api-edge typecheck` → exit 0
- `pnpm --filter @saas/api-edge-tests typecheck` → exit 0
- `pnpm -w typecheck` → exit 0 (38 workspaces)
- `pnpm -w lint` → exit 0 (33 workspaces; 45 residual warnings unchanged,
  all in tests/api-edge — Task 0096f's territory)
- `pnpm --filter @saas/api-edge-tests test` → 298/298 pass
- `node apps/api-edge/scripts/verify-bindings.mjs` → exit 0
  (`IDEMPOTENCY_KV → 2f5a03d0… [stage]`, `→ fac1d319… [prod]`)
- Hazard scan on apps/** source: zero new `eslint-disable*`, `@ts-ignore`,
  `@ts-expect-error`, `as unknown as`. (Test file uses the established
  `as unknown as KVNamespace | Fetcher` mock pattern that other api-edge
  test files use; Task 0096f territory.)

## Latitude decisions taken (one line each)

- Backend: reused `IDEMPOTENCY_KV` with `rl:v1:` prefix. Rationale: single-PR
  ship without sentinel-ID dance; distinct prefix proves no collision.
- Algorithm: token bucket, continuous refill, last-writer-wins. Rationale:
  fail-open gate; ≤2× burst under contention is acceptable V1 precision.
- Key encoding: `rl:v1:<bucket>:<family>:<id>`; SHA-256 the bearer token to
  keep secrets out of KV; raw orgId is non-sensitive.
- TTL = `windowSec` per bucket (60s shipped). Rationale: stale state self-cleans
  in one window, no cleanup pass needed.
- `routeFamily` as required positional arg to `replayOrExecute` (not an
  options object). Rationale: forces visible callsite update on every facade,
  prevents silent miscategorization.

## Open risks / verifier notes

- **Last-writer-wins under burst**: in practice tolerated; if real traffic shows
  >2× burst overrun, swap to a Durable Object backend (single-line change in
  `rate-limit.ts:loadBucket / saveBucket`). Not blocking V1.
- **No new Cloudflare-side resource**: the `cloudflare-kv` Terraform component
  is unchanged. Verifier's "cloudflare-kv apply jobs the PR triggers" check
  per Acceptance Criteria → no new apply jobs expected; existing
  `cloudflare-kv · {stage,prod}` plan jobs run as no-ops.
- **`verify-bindings.mjs`**: not extended (no new binding to assert). Existing
  `EXPECTED_KV.IDEMPOTENCY_KV` covers the only KV binding the wrangler config
  declares.
- **Replay-store regression**: Task 0095.1 Phase 8 case (a) (hit replay)
  continues to pass — `replayOrExecute` still hits KV idempotency lookup
  exactly as before, the rate-limit gate is strictly additive in front and
  contributes only header decoration to the existing return path.
- Audit-facade has no `replayOrExecute` chokepoint (GET-only); the limiter
  is wired in directly. Verifier should confirm 429 emits with the standard
  envelope on overflow against `/v1/audit-log/...` on stage.
