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
VERIFIED PASS + MERGED 2026-05-30 via PR #151 squash `adba1a3`. Single-pass
closure (Implementer + Verifier same session). Post-merge main-CI run
`26687672741` = 5/5 SUCCESS on `plan` + `api-edge × {dev,stage,prod} Verify
deploy` + `api-edge-tests × dev Verify`. Track B3 (Edge idempotency + rate
limiting) **CLOSED** — both halves shipped.

Durable outcome: `enforceRateLimit(...)` lives in `apps/api-edge/src/rate-limit.ts`
(377 LOC), wired as the FIRST step inside `replayOrExecute` and called
directly from `audit-facade.ts` (GET-only path). Two independent token
buckets per request — `org` (path-extracted from `/v1/organizations/{orgId}/...`,
skipped when no orgId) and `identity` (SHA-256 of bearer token, falls back
to `anon:<family>:<CF-Connecting-IP>`). 429 if either overflows; standard
`rate_limited` envelope + `Retry-After` + `X-RateLimit-*` headers on every
response. Backend: reuses `IDEMPOTENCY_KV` with mandatory `rl:v1:` key
prefix (vs `idem:v1:` replay store) — single-PR ship without sentinel-ID
dance. Caps: auth 10/60 identity 60/60 org; ops families (org/project/
config/webhooks/metering/billing) 60/60 identity 300/60 org; audit 120/60
identity 600/60 org. Failure-open posture matches replay store. 35 new
it() in `tests/api-edge/src/rate-limit.test.ts` (api-edge-tests 263 → 298).

Reports: `ai/reports/task-0097-{implementer,verifier}.md`.

## Next focus

Two PRs scoped and parallel-safe vs main @ `adba1a3`:

- **Task 0096f** — `tests/api-edge` class-B drain (45 → 0
  no-explicit-any, closes Track B globally). Branch
  `impl/task-0096f-tests-api-edge-class-b`. Implementer prompt at
  `ai/tasks/task-0096f.md`; sealed verifier prompt at
  `ai/tasks/task-0096f-verifier.md`.
- **Task 0098** — `packages/sdk` scaffold + base client + orgs/projects
  pilot (B4 first half). Branch `impl/task-0098-packages-sdk-scaffold`.
  Implementer prompt at `ai/tasks/task-0098.md`.

Both have zero file overlap with the merged Task 0097 surface and zero
overlap with each other (Task 0096f owns `tests/api-edge/src/**` only;
Task 0098 owns the new `packages/sdk/**` workspace only).

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

## Parallel sibling: Task 0098 (scoped 2026-05-30)

**Task 0098 — `packages/sdk` scaffold + base client + orgs/projects
pilot (B4 first half).** Implementer prompt at `ai/tasks/task-0098.md`.
Branch `impl/task-0098-packages-sdk-scaffold`. Agent: Implementer.

Greenfield workspace under `packages/sdk/` (`name: "@saas/sdk"`).
Architect-Mode brief targets **Stripe SDK quality**: runtime-agnostic
(browser / Node ≥ 20 / Workers / Bun), zero runtime deps preferred,
typed error hierarchy keyed 1:1 on `ERROR_CODES` from
`@saas/contracts/errors`, `RateLimitError` decoding the exact headers
Task 0097 will emit (`Retry-After`, `X-RateLimit-{Limit,Remaining,Reset}-<scope>`),
caller-owned `idempotencyKey` per request (Stripe parity — sdk does NOT
auto-generate). Two pilot resource clients only: `organizations.{list,get,create}`
and `projects.{list,get,create,archive}`. Task 0099 will fan out the
remaining 8 resource clients off the contract this PR establishes.

**Parallel-safety vs Tasks 0097 and 0096f**: zero file overlap. Task 0098
lives entirely under `packages/sdk/**`. Task 0097 owns `apps/api-edge/**`
+ `infra/terraform/cloudflare-kv/**`; Task 0096f owns
`tests/api-edge/src/**`. All three PRs can ship in any order.

Same hazard ban as Tasks 0096b–f / 0097: no new `eslint-disable*`,
`@ts-ignore`, `@ts-expect-error`, `as unknown as`, or `as any` introduced
by the PR.

## Next focus (after 0097 / 0096f / 0098)

The road forks per `specs/roadmap.md`:
- **Task 0099** — fan out the remaining 8 SDK resource clients
  (memberships, api-keys, webhooks, metering, billing, events,
  security-events, config, notifications) off the orgs/projects contract
  established by Task 0098.
- **Task 0100** — `packages/cli` per spec 13 on top of the SDK (B4
  second half).
- **B5 per-tenant rate-limit overrides** — natural extension of Task 0097
  once the chokepoint is live.

Deferred candidates unchanged: `0085b`, `notifications-provider-swap`,
`notifications-worker-dev-reframe` (see `ai/deferred.md`).

## Follow-on: Task 0098.1 (scoped 2026-05-30)

**Task 0098.1 — `packages/sdk` Orun component alignment.** Implementer
prompt at `ai/tasks/task-0098.1.md`. Branch
`impl/task-0098.1-sdk-component-yaml`. Agent: Implementer.

Adds `packages/sdk/component.yaml` (`type: turbo-package`,
`domain: starter-sdk`, mirrors `packages/contracts` / `packages/shared`
shape). PR #150 shipped the SDK source/tests/README/eslint config but
omitted the component manifest — without it, Orun discovery and CI
component-scoped plans don't see `packages/sdk/**`. This is bootstrap
polish, not new feature work. Gated on PR #150 merge.

**Parallel-safety**: zero file overlap with Tasks 0097, 0096f, 0098,
or any deferred candidate. Touches only `packages/sdk/component.yaml`
(new) and at most a script alias in `packages/sdk/package.json`.
