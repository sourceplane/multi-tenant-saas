# Current Context

Last updated: 2026-05-30 — Track B class-B `@typescript-eslint/no-explicit-any`
drain CLOSED for every workspace not gated behind Track A.

## What just landed

Three Track B PRs squash-merged in one ship cycle, each with post-merge
main-CI SUCCESS:

| PR   | Task  | Squash SHA | Workspace(s)                                                                                  | anys |
|------|-------|------------|-----------------------------------------------------------------------------------------------|------|
| #146 | 0096e | `5b33a13`  | tests/projects-worker, tests/events-worker, tests/policy-engine, tests/policy-worker, tests/webhooks-worker | 26 → 0 |
| #148 | 0096d | `10e213a`  | tests/identity-worker                                                                         | 80 → 0 |
| #149 | 0096c | `ea99924`  | tests/config-worker                                                                           | 126 → 0 |

Per-file deltas:

- 0096c: mutation-handlers 47→0, secret-mutation-handlers 43→0, encrypted-secret-storage 36→0
- 0096d: api-key-admin 33→0, security-events 22→0, profile 13→0, login-start-notifications 8→0, helpers/fake-repository 4→0
- 0096e: projects-worker 10→0, events-worker 7→0, policy-engine (api-key-policy 2 + policy-engine 5) 7→0, policy-worker 1→0, webhooks-worker delivery 1→0

Hazard scan empty on all three PRs (zero new `eslint-disable*`, `@ts-ignore`,
`@ts-expect-error`, or `as unknown as`). No production source touched —
tests/** only.

## Final code-quality scan on main

- `pnpm -r typecheck` → exit 0 (Task 0091 baseline holds)
- `pnpm -r --no-bail lint` → exit 0
- Residual warnings: **45**, all `@typescript-eslint/no-explicit-any` in
  `tests/api-edge` only
- `no-console` warnings: 0
- Apps source class-B: 0 (Task 0096 invariant holds)

## Track B drain summary

| Workspace                     | Before 0096b | After all waves |
|-------------------------------|--------------|-----------------|
| tests/membership-worker       | 350          | 0 (Task 0096b)  |
| tests/config-worker           | 126          | 0 (Task 0096c)  |
| tests/identity-worker         | 80           | 0 (Task 0096d)  |
| tests/projects-worker         | 10           | 0 (Task 0096e)  |
| tests/events-worker           | 7            | 0 (Task 0096e)  |
| tests/policy-engine           | 7            | 0 (Task 0096e)  |
| tests/policy-worker           | 1            | 0 (Task 0096e)  |
| tests/webhooks-worker         | 1            | 0 (Task 0096e)  |
| **tests/api-edge** (gated)    | 45           | 45 (Track A)    |

## Track A status (2026-05-30)

CLOSED. PR #147 (Task 0095.0) merged `40974e5` provisioning the
Cloudflare Workers KV namespaces (stage `2f5a03d0a14e4ead8f2b6658f6bfd722`,
prod `fac1d319c8894466b4860bff9c6cb99d`). PR #143 (Task 0095 / 0095.1)
merged `d9116aa` with the real KV IDs wired into `apps/api-edge/wrangler.jsonc`
and an `EXPECTED_KV` guard in `apps/api-edge/scripts/verify-bindings.mjs`.
Post-merge main-CI run `26684916084` SUCCESS on api-edge ×
{dev, stage, prod} Verify-deploy. Live replay traffic verified end-to-end
on both stage and prod (hit, miss-then-store, GET passthrough, 4xx cached,
identity-agnostic key, header allowlist; stage/prod KV isolation
confirmed). Verifier report: `ai/reports/task-0095.1-verifier.md`.

## Current task

**Task 0097 — Edge per-org + per-identity rate limiting (B3 second half).**
Implementer prompt at `ai/tasks/task-0097.md`. Branch
`impl/task-0097-edge-rate-limiting`. Agent: Implementer.

Single chokepoint extension: a new `enforceRateLimit(...)` in
`apps/api-edge/src/rate-limit.ts`, called from inside the existing
`replayOrExecute(...)` in `idempotency.ts` BEFORE the KV cache lookup.
Each facade passes a `routeFamily` literal so the limiter doesn't have
to parse URLs. Two independent buckets: `org` (when org-scoped actor
resolved) and `identity` (actor or anon `CF-Connecting-IP` fallback).
429 with `rate_limited` envelope (code already in
`specs/contracts/api-guidelines.md`) + `Retry-After` + full
`X-RateLimit-*` headers on every response.

Backend default: token-bucket on a new sibling KV namespace
`api_edge_rate_limit_{stage,prod}` added to the existing
`infra/terraform/cloudflare-kv/` component as
`cloudflare_workers_kv_namespace.api_edge_rate_limit` — no new TF
slice. Cloudflare provider pin in `cloudflare-kv` stays at `~> 4.30`
(do NOT touch the `cloudflare-domain` `~> 4.52` pin behind deferred
0085b). New wrangler binding `RATE_LIMIT_KV` under `env.stage` and
`env.prod`; `verify-bindings.mjs` extended with an `EXPECTED_KV` entry
for it using the same regex + sentinel pattern as `IDEMPOTENCY_KV`.
Fail-open posture identical to the replay store.

Parallel-safe with Task 0096f (`tests/api-edge` 45→0 closes Track B
globally) — that PR touches only `tests/**`, zero overlap with
`apps/api-edge/**` source.

## Parallel sibling: Task 0096f (scoped 2026-05-30)

**Task 0096f — drain `tests/api-edge` 45→0
`@typescript-eslint/no-explicit-any` (closes Track B globally).**
Implementer prompt at `ai/tasks/task-0096f.md`. Sealed verifier
prompt at `ai/tasks/task-0096f-verifier.md`. Branch
`impl/task-0096f-tests-api-edge-class-b`. Agent: Implementer.

Five files in scope at `main` @ `2991229` (live eslint baseline):
`org-facade.test.ts` 15, `project-facade.test.ts` 11,
`auth-facade.test.ts` 9, `audit-facade.test.ts` 8,
`api-key-routes.test.ts` 2. Six byte-identical-locked files at 0 anys:
`webhooks-facade`, `idempotency-replay`, `idempotency-edge`, `cors`,
`config-facade`, `billing-facade`. Per-file it+test parity targets:
64/42/38/12/7/19/12/9/37/26/16 = 252 total.

**Parallel-safety vs Task 0097**: zero file overlap. Task 0097 owns
`apps/api-edge/src/**`, `apps/api-edge/scripts/verify-bindings.mjs`,
`apps/api-edge/wrangler.jsonc`, and `infra/terraform/cloudflare-kv/**`.
Task 0096f owns `tests/api-edge/src/**`. Both PRs can ship in either
order.

After both merge: `pnpm -r --no-bail lint` exits 0 with 0 residual
warnings repo-wide (Track B class-B drain CLOSED globally).

## Next focus (after 0097 / 0096f)

The road forks per `specs/roadmap.md` — B4 SDK rollout (required-key
enforcement on POST routes lives there) or B5 per-tenant rate-limit
overrides.

Deferred candidates unchanged: `0085b`, `notifications-provider-swap`,
`notifications-worker-dev-reframe` (see `ai/deferred.md`).
