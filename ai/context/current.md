# Current Context

Last updated: 2026-05-31 — Task 0104 **VERIFIED PASS + MERGED**. PR #159
squash `c78592f` via `gh pr merge --squash --delete-branch`. Post-merge
main-CI run `26700942407` 4/4 SUCCESS (plan + web-console-next·{dev,
stage,prod}·Verify deploy). Live URL smoke: `https://stage.sourceplane.ai`
and `https://prod.sourceplane.ai` both return HTTP/2 307 → /orgs with
`x-opennext: 1` and the real Next app-shell HTML. Console U10 SDK
refactor landed.

## Current Task — 0104 (closed)

**Agent:** Verifier (PASS + MERGED — task closed)
**PR:** #159 squash `c78592f` (merged 2026-05-31)
**Verifier prompt:** `ai/tasks/task-0104-verifier.md`
**Verifier report:** `ai/reports/task-0104-verifier.md`
**Implementer report:** `ai/reports/task-0104-implementer.md`
**Branch:** deleted post-merge
**Sealed snapshot main (pre-0104):** `1caa08b`
**Squash commit on main:** `c78592f`
**Post-merge main-CI run:** `26700942407` (4/4 SUCCESS)

### What landed (Path A — direct call-site migration)

- Hand-rolled `ApiClient` deleted from
  `apps/web-console-next/src/lib/api.ts`. File shrunk from 297 LOC →
  ~120 LOC of pure console-side glue (`ApiTarget`, `TARGETS`,
  `DEPLOY_ENV`, `IS_LOCKED`, `createClient(target, token) →
  Sourceplane`, `wrap()` helper that adapts `Promise<T>` + thrown
  `SourceplaneError` into the preserved `ApiResult<T>` shape).
- Zero `fetch(`, zero `/v1/` route strings, zero header building inside
  the console anymore — the SDK owns all wire I/O.
- Multi-target switcher (`ALL_TARGETS`, `DEPLOY_ENV`, `IS_LOCKED`,
  `NEXT_PUBLIC_DEPLOY_ENV` lock) preserved byte-for-byte.
  `useMemo([target, token])` rebuilds the `Sourceplane` on every
  `setTarget` / `setToken` — no auth-header leak across targets.
- Diff `+200 / -307` across **17 files**, all under
  `apps/web-console-next/**` plus `pnpm-lock.yaml`. Zero edits to
  `packages/sdk/**`, `packages/contracts/**`, `packages/cli/**`,
  `apps/*-worker/**`, `infra/**`, `tooling/**`, `tests/api-edge/**`,
  or `apps/web-console/**`.
- Accepted scope-extension: `apps/web-console-next/next.config.mjs`
  +14 lines (`transpilePackages: ["@saas/sdk"]` + webpack
  `resolve.extensionAlias` `.js → [.ts, .tsx, .js]`) — build-wiring
  only, no runtime change.

### Verifier outcome by phase

1. **PR sanity** — PR #159 was BEHIND main (Task 0103 verifier
   bookkeeping `9b48df4` had landed); resolved with
   `gh pr update-branch 159` → new HEAD `d2aec28`, MERGEABLE/CLEAN.
   Diff scope confirmed 17 files all under `apps/web-console-next/**`.
2. **Hazard + boundary scan** — clean. Zero new `eslint-disable` /
   `@ts-ignore` / `@ts-expect-error` / `as unknown as` / `as any` /
   `node:*` under `apps/web-console-next/**`. Zero `fetch(` in
   `lib/`. Zero `/v1/` strings. SDK/contracts untouched. Multi-target
   switcher byte-identical. Bearer-token re-construction confirmed via
   `useMemo([target, token])` in `session.tsx`.
3. **Quality gates** — `pnpm -r typecheck` exit 0 across **38
   workspaces**. `pnpm -r --no-bail lint` exactly **45 warnings**, all
   in `tests/api-edge/**`. `pnpm --filter @saas/web-console-next build`
   green (Next 15.0.3 + OpenNext 1.0.4). Pre-existing
   `tests/db/migrations.test.ts` failure tolerated (reproduces
   byte-identical on `main`).
4. **Orun** — `kiox -- orun validate` exit 0; `orun plan --changed`
   produced exactly 3 `web-console-next` Verify lanes; `orun run --plan
   --dry-run` green.
5. **PR-CI** — post-rebase run `26700827443` 4/4 SUCCESS via
   `gh run view --log` (real lanes, not no-op). Stage Verify lane
   wall-clock 1m13.9s.
6. **Squash merge + post-merge watch + live-URL smoke** —
   `gh pr merge 159 --squash --delete-branch` → `c78592f`. Post-merge
   main-CI run `26700942407` 4/4 SUCCESS. Logs prove stage+prod ran
   the **deploy** profile (Uploaded `sourceplane-web-console-next-{stage,
   prod}` + Deployed triggers + smoke); dev kept verify (`--dry-run`).
   Live curl: stage and prod both `HTTP/2 307` → `/orgs` with
   `x-opennext: 1` and `<title>Sourceplane Console</title>`.
7. **Verifier report** — written at
   `ai/reports/task-0104-verifier.md` (PASS verdict).
8. **PASS bookkeeping** — this commit.

## Next Task — 0105 (queued, awaiting orchestrator scoping)

**Task 0105 — `packages/cli` auth/SDK consumer swap.** Symmetric
CLI-side migration: drop any direct `fetch` / route-string / header
building in `packages/cli/src/auth/**` and dispatch through
`client.auth.*` from `@saas/sdk`. Estimated single PR. Unblocked by
Task 0103 AuthClient (same trigger as 0104). Now also unblocked by
the Console U10 SDK refactor pattern proven in 0104.

## What just landed (recap)

**Task 0104 — Console U10 SDK refactor.** PR #159 squash `c78592f`,
post-merge main-CI run `26700942407` 4/4 SUCCESS, stage+prod live
URLs serving real Next app shell. Console clients now consume the
13-resource `@saas/sdk` end-to-end (no hand-rolled `ApiClient`).

**Task 0103 — SDK AuthClient (13th typed resource client).** PR #158
squash `0909186`, post-merge main-CI run `26699966952` 4/4 SUCCESS.
SDK clients on main: 12 → 13 (`auth` added).

**Track B4 fully closed (Task 0102, prior).** SDK exposes 13 typed
resource clients; `@saas/cli` ships the full spec-13 required command
surface and every command dispatches through `@saas/sdk`.

## Out of scope (deferred, parked, untouched this cycle)

- `tests/api-edge/**` (sealed Task 0096f verifier prompt remains
  active and orthogonal — zero file overlap with Task 0104)
- `packages/cli/**` (next-likely task — Task 0105, separate PR)
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
| **HEAD** | `c78592f` (squash merge of PR #159, Task 0104) — verifier bookkeeping commit will follow |
| **Repo health** | 🟢 Green |
| **Open PRs** | none |
| **Tasks completed** | 118 (through Task 0104) |
| **Current task** | 0104 closed — 0105 queued (CLI auth/SDK consumer swap) |
| **Deferred** | `0085b`, `notifications-provider-swap`, `notifications-worker-dev-reframe`, `optional-spec-13-commands` |
| **Last verified main-CI run** | `26700942407` (post-Task-0104 merge, 4/4 SUCCESS) |
| **Console live URL** | `https://{stage,prod}.sourceplane.ai` (HTTP/2 307 → /orgs, `x-opennext: 1`, real Next app shell) |
| **`@saas/sdk` clients on main** | 13 (organizations, projects, memberships, apiKeys, webhooks, metering, billing, events, securityEvents, config, notifications, environments, auth) |
| **`@saas/cli` commands on main** | full spec-13 required surface live |
| **Console SDK adoption** | `apps/web-console-next` consumes `Sourceplane` end-to-end (hand-rolled `ApiClient` deleted) |
