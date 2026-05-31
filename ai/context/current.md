# Current Context

Last updated: 2026-05-31 — Task 0104 SCOPED. Implementer prompt at
`ai/tasks/task-0104.md`. Branch
`impl/task-0104-console-u10-sdk-refactor`. Console U10 SDK refactor:
replace `apps/web-console-next/src/lib/api.ts` (297 LOC duplicated
ApiClient) with `Sourceplane` from `@saas/sdk`. Pure consumer-side
swap, now unblocked by AuthClient (Task 0103, PR #158 squash
`0909186`).

## Current Task — 0104 (Implementer scoping)

**Agent:** Implementer (awaiting handoff)
**Branch:** `impl/task-0104-console-u10-sdk-refactor`
**Prompt:** `ai/tasks/task-0104.md`
**Two acceptable paths:**
- **Path A** — delete `lib/api.ts`, migrate consumers to
  `Promise<T>` + typed errors via try/catch (8 page files +
  `useAsync` + `scope-switcher` + `precondition/insight`).
- **Path B** — keep ≤60 LOC envelope adapter wrapping `Sourceplane`
  and re-exporting an `ApiResult<T>` shim (no fetch / no headers /
  no paths inside it).

Implementer picks based on call-site churn; document the choice.

**Hard rules:** zero new `eslint-disable` / `@ts-ignore` /
`@ts-expect-error` / `as unknown as` / `as any` / `node:*` under
`apps/web-console-next/**`; no edits to `packages/sdk/**` or
`packages/contracts/**` (proposal-then-defer if a contract gap
surfaces); multi-target switcher (`ALL_TARGETS`, `DEPLOY_ENV`,
`IS_LOCKED`, `NEXT_PUBLIC_DEPLOY_ENV`) preserved byte-for-byte;
bearer-token re-construction wired on `setTarget` and `setToken`.

**Acceptance:** `pnpm -r typecheck` exit 0 across 38 workspaces;
`pnpm -r --no-bail lint` ≤ 45 warnings, all in `tests/api-edge/**`
(no new warnings under `apps/web-console-next/**`);
`pnpm --filter @saas/web-console-next build` green; vitest green;
kiox orun validate/plan/run dry-run green for the changed
`web-console-next` Verify lanes; PR-CI green (plan + every
dispatched web-console Verify lane); real PR number in report
(`TBD` = blocked, not complete).

## What just landed (recap)

**Task 0103 — SDK AuthClient (13th typed resource client).** PR #158
squash `0909186`, post-merge main-CI run `26699966952` 4/4 SUCCESS.
SDK clients on main: 12 → 13 (`auth` added). Last SDK gap closed,
unblocking Task 0104.

**Track B4 fully closed (Task 0102, prior).** SDK on main exposes 13
typed resource clients; `@saas/cli` ships the full spec-13 required
command surface and every command dispatches through `@saas/sdk`.

## Next Task After 0104

**Likely candidate — packages/cli auth/SDK consumer swap.** The CLI
auth flow currently works via token-paste; once Console U10 lands,
migrating CLI to dispatch the auth flow through `@saas/sdk` becomes
the natural symmetric follow-up. Estimated single PR. Will be
re-evaluated against repo state after Task 0104 verifies.

## Out of scope (deferred, parked, untouched this cycle)

- `tests/api-edge/**` (sealed Task 0096f verifier prompt remains
  active and orthogonal — zero file overlap with Task 0104)
- `packages/cli/**` (next-likely task, but a separate PR)
- `apps/notifications-worker/**` (deferred provider-swap and
  dev-reframe)
- `infra/terraform/cloudflare-domain/**` and the cloudflare provider
  pin (deferred 0085b)
- `tooling/eslint/**` (sealed since Task 0092)
- Optional spec-13 CLI commands (`component list`, `resource
  create/get`, `deployment get`) — deferred behind P2 backend slice
- `apps/web-console/**` (Vite-based legacy console — not in U10
  roadmap)

## Repo Checkpoint

| Attribute | Value |
|-----------|-------|
| **Branch (local)** | `main` (synced with `origin/main`) |
| **HEAD** | `6715f58` (post-Task-0103 verifier bookkeeping) |
| **Repo health** | 🟢 Green |
| **Open PRs** | none (Task 0104 not yet pushed) |
| **Tasks completed** | 117 (through Task 0103) |
| **Current task** | 0104 — Console U10 SDK refactor (Implementer scoping) |
| **Deferred** | `0085b`, `notifications-provider-swap`, `notifications-worker-dev-reframe`, `optional-spec-13-commands` |
| **Last verified main-CI run** | `26699966952` (post-Task-0103 merge, 4/4 SUCCESS) |
| **Console live URL** | `https://{stage,prod}.sourceplane.ai` (307 → /orgs) |
| **`@saas/sdk` clients on main** | 13 (organizations, projects, memberships, apiKeys, webhooks, metering, billing, events, securityEvents, config, notifications, environments, **auth**) |
| **`@saas/cli` commands on main** | full spec-13 required surface live |
