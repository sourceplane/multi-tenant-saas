# Current Context

Last updated: 2026-05-31 — Task 0104 IMPLEMENTER COMPLETE + VERIFIER
SEALED. PR #159 OPEN, MERGEABLE/CLEAN, 4/4 PR-CI green (run
`26700583663`: plan + web-console-next·{dev,stage,prod}·Verify deploy).
Verifier prompt sealed at `ai/tasks/task-0104-verifier.md` — 8-phase
shape with mandatory **post-merge main-CI watch + live-URL curl**
because `web-console-next` is deploy-gated (verify on PR, deploy on
main-push).

## Current Task — 0104 (Verifier sealed, awaiting handoff)

**Agent:** Verifier (awaiting handoff)
**Branch:** `impl/task-0104-console-u10-sdk-refactor`
**PR:** #159 (`a05a269` console: migrate web-console-next to @saas/sdk)
**Verifier prompt:** `ai/tasks/task-0104-verifier.md`
**Implementer prompt:** `ai/tasks/task-0104.md`
**Implementer report:** `ai/reports/task-0104-implementer.md`
(uncommitted on PR branch — Phase 1 fix-up handles)
**Sealed snapshot main:** `1caa08b`

### Implementer outcome (Path A — direct call-site migration)

- Hand-rolled `ApiClient` deleted from
  `apps/web-console-next/src/lib/api.ts`. File shrunk from 297 LOC →
  ~120 LOC of pure console-side glue: `ApiTarget`, `TARGETS`,
  `DEPLOY_ENV`, `IS_LOCKED`, `createClient(target, token) →
  Sourceplane`, and a `wrap()` helper that adapts `Promise<T>` +
  thrown `SourceplaneError` into the preserved `ApiResult<T>` shape.
- Zero `fetch(`, zero `/v1/` route strings, zero header building
  inside the console anymore — the SDK owns all wire I/O.
- Multi-target switcher (`ALL_TARGETS`, `DEPLOY_ENV`, `IS_LOCKED`,
  `NEXT_PUBLIC_DEPLOY_ENV` lock) preserved byte-for-byte.
  `useMemo([target, token])` rebuilds the `Sourceplane` on every
  `setTarget` / `setToken` — no auth-header leak across targets.
- Diff `+200 / -307` across **17 files**, all under
  `apps/web-console-next/**` plus `pnpm-lock.yaml`. Zero edits to
  `packages/sdk/**`, `packages/contracts/**`, `packages/cli/**`,
  any `apps/*-worker/**`, any `infra/**`, any `tooling/**`,
  `tests/api-edge/**`, or `apps/web-console/**`.

### Scope-extension explicitly accepted in verifier prompt

`apps/web-console-next/next.config.mjs` gained 14 lines —
`transpilePackages: ["@saas/sdk"]` + a webpack `resolve.extensionAlias`
mapping `.js → [.ts, .tsx, .js]`. Necessary because Next's webpack
cannot pair NodeNext-style `./auth.js` re-exports to sibling `.ts`
source files in workspace-source packages. Build-wiring only, no
runtime/UX behavior change. Verifier Phase 2.6 acknowledges this as
in-scope.

### Verifier 8-phase shape

1. PR sanity + implementer-report-on-PR-branch fix-up (recurring gap)
2. Hazard scan + boundary scan (zero new
   `eslint-disable`/`@ts-ignore`/`@ts-expect-error`/`as unknown
   as`/`as any`/`node:*` under `apps/web-console-next/**`; zero `/v1/`
   strings; zero `fetch(` in `lib/`; no SDK/contracts edits;
   multi-target switcher byte-identity; bearer-token re-construction)
3. Quality gates (`pnpm -r typecheck=0` across 38 workspaces;
   `pnpm -r --no-bail lint` ≤ 45 warnings all in `tests/api-edge/**`;
   build green; vitest green; tolerate pre-existing `tests/db`
   `migrations.test.ts` failure that reproduces on `main`)
4. Orun validate / plan --changed / run --dry-run (1 × 3
   `web-console-next` Verify lanes only)
5. PR-CI inspection via `gh run view --log` (not just summary)
6. **Squash merge + post-merge main-CI watch + live-URL curl on
   stage/prod** — DEPLOY-GATED, post-merge-deploy-profile-gap
   protocol mandatory (Task 0082 white-page regression precedent)
7. Verifier report at `ai/reports/task-0104-verifier.md`
8. PASS bookkeeping (state.json/current.md/ledger commit on main) or
   FAIL bookkeeping (PR comment + report on PR branch, no merge)

## What just landed (recap)

**Task 0103 — SDK AuthClient (13th typed resource client).** PR #158
squash `0909186`, post-merge main-CI run `26699966952` 4/4 SUCCESS.
SDK clients on main: 12 → 13 (`auth` added). Last SDK gap closed,
unblocking Task 0104.

**Track B4 fully closed (Task 0102, prior).** SDK on main exposes 13
typed resource clients; `@saas/cli` ships the full spec-13 required
command surface and every command dispatches through `@saas/sdk`.

## Next Task After 0104 (likely candidate)

**Task 0105 — `packages/cli` auth/SDK consumer swap.** Symmetric
CLI-side migration: drop any direct `fetch` / route-string / header
building in `packages/cli/src/auth/**` and dispatch through
`client.auth.*` from `@saas/sdk`. Estimated single PR. Unblocked by
Task 0103 AuthClient (same trigger as 0104). Will be re-evaluated
against repo state once Task 0104 verifies PASS.

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
| **Branch (local)** | `main` (synced with `origin/main` at sealing) |
| **HEAD** | `1caa08b` (orchestrator: scope Task 0104) — verifier sealing commit will follow |
| **Repo health** | 🟢 Green |
| **Open PRs** | #159 (Task 0104) — OPEN, MERGEABLE/CLEAN, 4/4 PR-CI green |
| **Tasks completed** | 117 (through Task 0103) |
| **Current task** | 0104 — Console U10 SDK refactor (Verifier sealed) |
| **Deferred** | `0085b`, `notifications-provider-swap`, `notifications-worker-dev-reframe`, `optional-spec-13-commands` |
| **Last verified main-CI run** | `26699966952` (post-Task-0103 merge, 4/4 SUCCESS) |
| **Console live URL** | `https://{stage,prod}.sourceplane.ai` (307 → /orgs) — verifier Phase 6 will re-confirm post-merge |
| **`@saas/sdk` clients on main** | 13 (organizations, projects, memberships, apiKeys, webhooks, metering, billing, events, securityEvents, config, notifications, environments, **auth**) |
| **`@saas/cli` commands on main** | full spec-13 required surface live |
