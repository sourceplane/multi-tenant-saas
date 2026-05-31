# Current Context

Last updated: 2026-05-31 — Task 0103 implementer phase complete; PR
#158 OPEN, MERGEABLE/CLEAN, 4/4 PR-CI green. Verifier prompt sealed
at `ai/tasks/task-0103-verifier.md` and active. Orchestrator
hand-off complete; next move is the verifier execution.

## Current Task — 0103 (sdk AuthClient)

**Agent:** Verifier (sealed and active)
**Branch:** `impl/task-0103-sdk-auth-client`
**Implementer prompt:** `ai/tasks/task-0103.md`
**Implementer report:** `ai/reports/task-0103-implementer.md`
**Verifier prompt:** `ai/tasks/task-0103-verifier.md`
**PR:** #158 — base `main`, head `impl/task-0103-sdk-auth-client`,
state OPEN/MERGEABLE/CLEAN, PR-CI run `26699737104` 4/4 SUCCESS
(plan + sdk·{dev,stage,prod} Verify).
**Status:** verifier sealed, awaiting execution.

**Objective.** Add a 13th `@saas/sdk` resource client `AuthClient`
that wraps the identity-worker public auth surface (`loginStart`,
`loginComplete`, `getSession`, `logout`, `getProfile`,
`updateProfile`). This is the last SDK gap before Task 0104 (Console
U10 SDK refactor) can be a pure consumer-side swap.

**PR boundary.** New `packages/sdk/src/auth.ts` + wiring on
`Sourceplane` + new `packages/sdk/src/__tests__/auth.test.ts` (≥10
new `it()` blocks). Zero edits to `packages/contracts/**`,
`packages/cli/**`, `apps/**`, `packages/sdk/src/transport.ts`. Mirrors
`EnvironmentsClient` cadence from Task 0102 (caller-owned
Idempotency-Key, `encodeURIComponent` on dynamic segments,
`transport.request<T>` only — no `fetchImpl` reach-around).

**Hard rules (Task 0096b–f / 0097–0102 carry-over).** Zero new
`eslint-disable` / `@ts-ignore` / `@ts-expect-error` / `as unknown as` /
`as any` under `packages/sdk/**`; no `node:*` imports;
`packages/sdk/component.yaml` byte-identical vs main; types from
`@saas/contracts/auth` only (proposal-then-defer if
`UpdateProfileRequest` / `ProfileResponse` missing).

**Acceptance.** SDK ≥99 tests (89 → ≥99); `pnpm -r typecheck` exit 0
across 38 workspaces; `pnpm -r --no-bail lint` ≤45 residual warnings,
all in `tests/api-edge` (Task 0096f territory unchanged); `kiox -- orun
validate / plan / run --dry-run` all green; PR-CI 4/4 (`plan + sdk ×
{dev,stage,prod} Verify`, no deploy step).

## Why this task now (orchestrator rationale)

Three candidates evaluated this pass:

1. **Optional spec-13 CLI commands** (`component list`, `resource
   create`, `resource get`, `deployment get`) — **deferred.** Audit of
   `apps/api-edge/src/*.ts` (2026-05-31) confirms zero `/v1/components`,
   `/v1/resources`, or `/v1/deployments` routes. Per spec-13 lines
   72–75 these are explicitly optional, and they require a P2 backend
   slice first. Parked in `/ai/deferred.md` with unblock signal.
2. **Console U10 — SDK-as-client refactor** — close, but the SDK is
   missing an `AuthClient`. U10 would either reach into
   `client.transport.request` (the same workaround pattern Task 0101
   shipped and Task 0102 had to clean up) or keep `apps/web-console-next/src/lib/api.ts`
   for auth-only — defeating U10's "single client surface" premise.
   **Pre-requisite identified: ship `AuthClient` first.**
3. **Task 0096f verifier resumption** — implementer hasn't opened a PR
   on `impl/task-0096f-tests-api-edge-class-b`; not actionable this
   pass. Task 0096f-verifier prompt remains sealed at
   `ai/tasks/task-0096f-verifier.md` and activates the moment the
   implementer ships.

Selected #2's blocker (the AuthClient gap) as the highest-leverage
PR-sized task. Task 0104 (Console U10 SDK refactor) becomes the
natural follow-on once 0103 lands.

## What just landed (recap)

**Task 0102 — SDK EnvironmentsClient + audit iterator + CLI
re-wiring** (Track B4 final closure). PR #157 squash `bced5fa`,
post-merge main-CI run `26699284529` 7/7 SUCCESS. Both Task 0101
SDK-gap proposals (`environments-client`, `audit-pagination`)
RESOLVED.

**Track B4 fully closed.** SDK on main now exposes 12 typed resource
clients; `@saas/cli` ships the full spec-13 required command surface.

## Out of scope (deferred, parked, untouched this cycle)

- `apps/web-console-next/**` (Task 0104 territory — pure consumer swap)
- `packages/cli/**` (CLI auth flow already works via token-paste; can
  be migrated in a future task once SDK shape is stable)
- `tests/api-edge/**` (Task 0096f territory; parallel-safe)
- `packages/contracts/**` (proposal-then-defer if a type is missing)
- `apps/notifications-worker/**` (deferred provider-swap and
  dev-reframe)
- `infra/terraform/cloudflare-domain/**` and the cloudflare provider
  pin (deferred 0085b)
- `tooling/eslint/**` (sealed since Task 0092)
- Optional spec-13 CLI commands (`component list`, `resource
  create/get`, `deployment get`) — deferred behind P2 backend slice

## Next Task After 0103

**Task 0104 — Console U10 SDK refactor.** Drop
`apps/web-console-next/src/lib/api.ts` (297 LOC, 8 consumer call
sites), replace with `Sourceplane` from `@saas/sdk`. Pure
consumer-side swap once 0103 lands; estimated single PR. Will subsume
the auth flow in `apps/web-console-next/src/app/login/page.tsx`
through `client.auth.*`.

## Repo Checkpoint

| Attribute | Value |
|-----------|-------|
| **Branch (local)** | `main` (synced with `origin/main`) |
| **HEAD** | `b7efb89` (verifier bookkeeping over Task 0102 squash `bced5fa`) |
| **Repo health** | 🟢 Green |
| **Open PRs** | none (Track B4 closed) |
| **Tasks completed** | 116 (through Task 0102) |
| **Current task** | **0103** (scoped, awaiting implementer) |
| **Deferred** | `0085b`, `notifications-provider-swap`, `notifications-worker-dev-reframe`, `optional-spec-13-commands` |
| **Last verified main-CI run** | `26699284529` (post-Task-0102 merge, 7/7 SUCCESS) |
| **Console live URL** | `https://{stage,prod}.sourceplane.ai` (307 → /orgs) |
| **`@saas/sdk` clients on main** | 12 (organizations, projects, memberships, apiKeys, webhooks, metering, billing, events, securityEvents, config, notifications, environments) — Task 0103 adds **auth** as the 13th |
| **`@saas/cli` commands on main** | full spec-13 required surface live |
