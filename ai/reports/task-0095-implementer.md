# Task 0095 Implementer Report — Edge idempotency replay store (B3, partial)

## Summary
- Closed the open-risk gap from Task 0094: a duplicate POST with valid Idempotency-Key could create duplicate pending invitations. Added a Cloudflare KV-backed durable replay store at the api-edge layer with Stripe-style semantics (24h TTL, identity-agnostic key, 4xx cached, 5xx not cached, GET passthrough, missing binding degrades open).
- Storage decision: **Cloudflare Workers KV**. Rationale: the api-edge runs on Workers, KV reads are <10ms eventually-consistent in-region (acceptable since the replay window is 24h and idempotent retries are typically seconds-apart), and KV is the cheapest, lowest-cost-of-failure primitive that Cloudflare runtime offers without adding a Durable Object class or a Postgres roundtrip on every unsafe-method request. DOs were considered but rejected: per-key DO instance overhead and request-path latency for a best-effort cache is the wrong shape. Postgres was rejected: replay must succeed even when downstream workers are degraded, so coupling replay to SOURCEPLANE_DB defeats the purpose.
- Migrated all 7 facades from `validateIdempotencyKey` to `replayOrExecute` so every unsafe-method route through api-edge now flows through a single chokepoint that does both header validation AND replay lookup.
- Shipped the first KV terraform slice at `infra/terraform/cloudflare-kv/` with stage + prod namespaces (NOT dev — dev is verify-only). The slice is a single component; future KV uses (rate-limit, caches) add resources to the same slice rather than spawning new modules.
- Envelope is versioned (`v: 1`) with explicit `bodyEncoding: utf8|base64` so non-text responses round-trip correctly. Header allowlist persists only safe headers — never auth/cookies.

## Files Changed

Terraform:
- `infra/terraform/cloudflare-kv/component.yaml` (new) — Orun component manifest mirroring `cloudflare-hyperdrive`
- `infra/terraform/cloudflare-kv/terraform/main.tf` (new) — `cloudflare_workers_kv_namespace.idempotency` keyed by `var.environment` (stage|prod)
- `infra/terraform/cloudflare-kv/terraform/{backend,variables,outputs}.tf` (new)
- `infra/terraform/cloudflare-kv/README.md` (new)

api-edge runtime:
- `apps/api-edge/src/idempotency.ts` — added `replayOrExecute(request, requestId, env, downstream)`, KV envelope v1, allowlisted header capture, base64 fallback, 24h TTL. Retained `validateIdempotencyKey` as thin wrapper for symmetry.
- `apps/api-edge/src/env.ts` — `IDEMPOTENCY_KV?: KVNamespace` (optional)
- `apps/api-edge/src/{auth,billing,config,metering,org,project,webhooks}-facade.ts` — all 7 migrated to `replayOrExecute`
- `apps/api-edge/wrangler.jsonc` — added `kv_namespaces` binding under `env.stage` and `env.prod` (NOT env.dev). IDs are placeholders pending terraform apply.

Tests:
- `tests/api-edge/src/idempotency-replay.test.ts` (new, 12 cases) — covers cache miss/hit, GET passthrough, absent header passthrough, KV unbound degradation, 5xx not cached, 4xx cached, base64 round-trip, identity-agnostic key, malformed key short-circuit, KV failure degradation.

## Checks Run
- `pnpm --filter @saas/api-edge typecheck` → pass
- `pnpm -r typecheck` → pass (33 workspaces)
- `pnpm -r lint` → pass (0 errors; pre-existing warnings only)
- `pnpm --filter @saas/api-edge-tests test` → 282 pass / 0 fail (270 prior + 12 new replay cases)
- `pnpm -r test` → all green except `tests/db/src/migrations.test.ts` (1 pre-existing failure unrelated to this task — confirmed identical on `git stash`-baseline)
- `terraform fmt -check` → clean
- `terraform init -backend=false && terraform validate` → Success

## Assumptions
- KV namespace IDs in `wrangler.jsonc` are placeholders (`0000…000a`/`…000b`); they will be replaced post-terraform-apply by the deploy pipeline. The optional `IDEMPOTENCY_KV` binding shape lets dev / local runs proceed without KV bound.
- Identity-agnostic replay key: per architect brief, Stripe semantics. `resolveActor` runs only on cache-miss inside the lambda — a hit short-circuits before any identity resolution.
- 4xx cached, 5xx not cached: matches Stripe's published behaviour for stable client errors vs transient server errors.

## Spec Proposals
None.

## Remaining Gaps
- Rate-limiting half of B3 (Task 0096) is unblocked by this slice — future KV resources land in the same `cloudflare-kv` component.
- Required-key *enforcement* (rejecting POST without `Idempotency-Key` on specific routes) is intentionally out of scope; current behaviour matches Stripe (header is optional, replay only fires when present).
- Secrets-rotate route caching: 4xx caching includes secrets-rotate failure responses. If a future review wants secret routes excluded from replay entirely, add a route-allowlist check inside `replayOrExecute`.

## Next Task Dependencies
- Task 0096 (rate limiting) can now share the `cloudflare-kv` slice.
- Verifier should confirm post-merge that `IDEMPOTENCY_KV` binding IDs are populated by the pipeline and that replay actually fires on stage / prod (e.g. POST same Idempotency-Key twice to a benign route, expect `x-saas-replay-source: edge-idempotency` on the 2nd response).

## PR Number
TBD — recorded after `gh pr create` below.
