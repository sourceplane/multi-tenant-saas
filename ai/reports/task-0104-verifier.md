# Task 0104 — Verifier Report

## Result: PASS

Console U10 SDK refactor (PR #159) verified PASS and merged. The
`web-console-next` app now consumes `@saas/sdk` for all wire I/O; the
hand-rolled `ApiClient` is gone. Post-merge main-CI deployed stage and
prod, and live `https://{stage,prod}.sourceplane.ai` both serve the
real Next/OpenNext app shell (HTTP/2 307 → `/orgs`,
`<title>Sourceplane Console</title>`, `x-opennext: 1`).

## Phase 1 — PR sanity + report-on-branch fix-up

- `gh pr view 159 --json …` at start: state OPEN, mergeable MERGEABLE,
  mergeStateStatus initially CLEAN then BEHIND (sealed PR-CI run
  `26700583663` 4/4 SUCCESS: plan + web-console-next·{dev,stage,prod}·
  Verify deploy).
- PR was BEHIND `main` at verification time (Task 0103 verifier
  bookkeeping `9b48df4` had landed since sealing). Refreshed via
  `gh pr update-branch 159` → branch fast-forward landed the missing
  implementer report (it was on `main` already from a prior session)
  plus the verifier-prompt-on-branch sync. New branch HEAD `d2aec28`.
- Re-run PR-CI after rebase: run `26700827443` — all 4/4 SUCCESS:
  - `plan` (78693294086, 02:14:43→02:14:53Z)
  - `web-console-next · dev · Verify deploy` (78693304366,
    02:14:55→02:16:19Z)
  - `web-console-next · stage · Verify deploy` (78693304373,
    02:14:55→02:16:18Z)
  - `web-console-next · prod · Verify deploy` (78693304369,
    02:14:55→02:17:35Z)
- `gh pr diff 159 --name-only` → exactly **17 files**, all under
  `apps/web-console-next/**` plus `pnpm-lock.yaml`. No
  `packages/sdk/**`, `packages/contracts/**`, `packages/cli/**`,
  `apps/*-worker/**`, `infra/**`, `tooling/**`, `tests/api-edge/**`,
  or `apps/web-console/**` (Vite legacy).
- Implementer report on PR branch confirmed via
  `git ls-tree origin/impl/task-0104-console-u10-sdk-refactor --name-only
  ai/reports/task-0104-implementer.md` → present.

## Phase 2 — Hazard scan + boundary scan

- Hazard scan
  `git diff origin/main..HEAD -- 'apps/web-console-next/**' | grep '^+' |
  grep -E 'eslint-disable|@ts-ignore|@ts-expect-error|as unknown
  as|as any|node:'` → empty.
- `rg '"/v1/' apps/web-console-next/src` → zero matches.
- `rg 'fetch\(' apps/web-console-next/src/lib` → zero matches.
- `rg 'class ApiClient' apps/web-console-next/src` → zero matches.
- `git diff --name-only origin/main..HEAD | grep -E
  '^(packages/sdk/|packages/contracts/)'` → empty.
- `apps/web-console-next/next.config.mjs` build-wiring extension
  inspected: only added `transpilePackages: ["@saas/sdk"]` + webpack
  `resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] }`. No env
  vars, publicRuntimeConfig, images, headers, redirects added.
  **Accepted in-scope** per Sealing Snapshot.
- `apps/web-console-next/src/lib/api.ts` preserves `ALL_TARGETS`
  (stage + prod URLs verbatim), `DEPLOY_ENV`, `IS_LOCKED`,
  `availableTargets` derivation, and the `NEXT_PUBLIC_DEPLOY_ENV`
  env read.
- `apps/web-console-next/src/lib/session.tsx`:
  `client = useMemo(() => createClient(target, token), [target, token])`
  — both deps in array. `setToken` updates state and localStorage only;
  no in-place mutation of an existing client. No auth-header leak
  across targets.

## Phase 3 — Quality gates

Run from `origin/impl/task-0104-console-u10-sdk-refactor` (HEAD
`d2aec28`):

| Command | Exit | Notes |
|---|---|---|
| `pnpm install --frozen-lockfile` | 0 | `Lockfile is up to date`. `apps/web-console-next` lockfile entry: `'@saas/sdk': specifier: workspace:* version: link:../../packages/sdk`. |
| `pnpm -r typecheck` | 0 | All 38 workspaces `Done`. |
| `pnpm -r --no-bail lint` | 0 | **45 warnings total**, all in `tests/api-edge/**` (`✖ 45 problems (0 errors, 45 warnings)`). Zero warnings under `apps/web-console-next/**`. |
| `pnpm --filter @saas/web-console-next build` | 0 | Next 15.0.3 + OpenNext 1.0.4 build green. Worker emitted at `.open-next/worker.js`. Route bundles (First Load JS): `/orgs/[orgSlug]/invitations` 162 kB, `/orgs/[orgSlug]/members` 126 kB, `/orgs/[orgSlug]/projects` 170 kB, `/orgs/[orgSlug]/projects/[…]/environments` 170 kB, `/orgs/[orgSlug]/projects/[…]/environments/[envSlug]` 117 kB, shared 99.9 kB. No alarming delta (small growth expected from SDK barrel). |
| `pnpm --filter @saas/web-console-next test` | 0 | No `test` script declared in `apps/web-console-next/package.json` — pnpm exits 0 (consistent with implementer report; vitest is not wired for this app). |
| Pre-existing failure tolerance: `pnpm --filter @saas/db-tests test` | non-zero | `tests/db/src/migrations.test.ts` fails with the same assertion (line 66) on both `main` and the PR branch. The file is byte-identical between branches (`git checkout origin/main -- tests/db/src/migrations.test.ts` produced no diff). Accepted as pre-existing per Sealing Snapshot. |

## Phase 4 — Orun validation

| Command | Exit | Notes |
|---|---|---|
| `kiox -- orun validate --intent intent.yaml` | 0 | Intent valid; 1 provider cached. |
| `kiox -- orun plan --changed --intent intent.yaml --output /tmp/plan-0104.json` | 0 | **3 jobs** for **1 component** (`web-console-next`) × 3 envs (dev, stage, prod), all `Verify deploy`. No SDK lanes, no worker lanes, no terraform lanes. Plan ID `2e71b2728aab`. |
| `kiox -- orun run --plan /tmp/plan-0104.json --dry-run --runner github-actions` | 0 | All 3 lanes `✓` in 0.0s preview. |

## Phase 5 — PR-CI inspection (not summary alone)

- All web-console jobs from run `26700827443` SUCCESS (see Phase 1
  table for IDs and timing).
- Stage Verify lane log (job 78693304373) shows the dispatched
  commands actually ran: `Verify deploy completed · 1m13.9s`,
  `7 passed, 0 failed, 0 skipped`, slowest `build-app 43.8s`. Wall-
  clock well above the 60s threshold — real Verify lane, not no-op.

## Phase 6 — Squash merge + post-merge main-CI watch (DEPLOY-GATED)

- `gh pr merge 159 --squash --delete-branch` → succeeded.
  Squash-merge commit: **`c78592f303ea3f957aea8928d44543ac4d168820`**
  (`c78592f console: migrate web-console-next to @saas/sdk (Task 0104)
  (#159)`). Branch `impl/task-0104-console-u10-sdk-refactor` deleted.
- Post-merge main-CI run: **`26700942407`** (`headSha c78592f…`).
  Watched to completion via `gh run watch --exit-status` →
  `status: completed, conclusion: success`.
- Job conclusions (all `success`): `plan`, `web-console-next · dev ·
  Verify deploy`, `web-console-next · stage · Verify deploy`,
  `web-console-next · prod · Verify deploy`. Note the orun
  `checkName` is `Verify deploy` for all envs even on main; the
  *runtime profile* is selected per-env per `component.yaml`
  `profileRules: profile: deploy when: triggerRef: github-push-main`.
- Confirmed actual deploy (not just verify) by inspecting log content:
  - **Stage** (job 78693588380): `Uploaded sourceplane-web-console-
    next-stage (8.87 sec)`, `Deployed sourceplane-web-console-next-
    stage triggers (1.25 sec)`, `https://sourceplane-web-console-
    next-stage.rahulvarghesepullely.workers.dev`, smoke step
    `08 smoke 1.6s`, total `1m22.1s`.
  - **Prod** (job 78693588371): `Uploaded sourceplane-web-console-
    next-prod (9.12 sec)`, `Deployed sourceplane-web-console-next-prod
    triggers (0.66 sec)`, smoke `08 smoke 1.0s`, total `1m19.2s`.
  - **Dev** (job 78693588389): kept the `verify` profile (per
    component.yaml, no profileRule for dev) — `--dry-run: exiting now.`
    `Verify deploy completed · 1m14.1s`. As designed.

## Live resource evidence — curl smoke on stage and prod

```
$ curl -sI https://stage.sourceplane.ai
HTTP/2 307
location: /orgs
x-opennext: 1
x-powered-by: Next.js
…

$ curl -sL https://stage.sourceplane.ai | head -1
<!DOCTYPE html><html lang="en"><head>…<title>Sourceplane Console</title>…

$ curl -sI https://prod.sourceplane.ai
HTTP/2 307
location: /orgs
x-opennext: 1
x-powered-by: Next.js
…

$ curl -sL https://prod.sourceplane.ai | head -1
<!DOCTYPE html><html lang="en"><head>…<title>Sourceplane Console</title>…
```

Both consoles return the expected 307 → `/orgs` (per the root
`redirect("/orgs")`) with the OpenNext-on-Workers `x-opennext: 1`
marker and the real Next app shell HTML (CSS, chunked JS, the SSR'd
"Loading session…" boundary, RSC payload). NOT a white page, NOT a
404, NOT an OpenNext "no _worker.js" placeholder.

## Boundary scan (explicit)

- No edits to `packages/sdk/**`, `packages/contracts/**`,
  `packages/cli/**`, `apps/*-worker/**`, `apps/web-console/**` (Vite
  legacy), `infra/**`, `tooling/**`, or `tests/api-edge/**`.
- `apps/web-console-next/next.config.mjs` build-wiring extension
  (`transpilePackages` + webpack `resolve.extensionAlias`) accepted
  in-scope per Sealing Snapshot — necessary to resolve the SDK's
  NodeNext-style `./*.js` re-exports against workspace-source `.ts`
  siblings; no behavior change.

## Hazard scan (explicit)

- Zero new `eslint-disable`, `@ts-ignore`, `@ts-expect-error`,
  `as unknown as`, `as any`, or `node:*` under
  `apps/web-console-next/**` (the surviving `node:path` /
  `node:url` imports in `next.config.mjs` are unchanged from `main`
  and pre-date this PR).

## Spec proposals

None. No SDK or contracts gap surfaced during the consumer swap; the
existing `Sourceplane` clients (13 on main after Task 0103) cover
every call site touched by the refactor. The implementer report did
not flag any proposals.

## Risk notes

1. **Bundle delta tolerance.** Route First-Load JS bumped slightly
   from the pre-PR baseline (the SDK barrel adds shared chunks the
   hand-rolled client did not need). Numbers are well within Next/CF
   Workers limits and the deployed assets serve correctly. Monitor
   if future SDK growth pushes any route past 200 kB.
2. **`extensionAlias` precedent.** The `.js → [.ts, .tsx, .js]`
   webpack alias unblocks workspace-source consumption of the SDK
   from a Next app. Future Next consumers of any other workspace-
   source TS package with NodeNext-style re-exports will hit the
   same need; the convention is now documented in `next.config.mjs`
   comments.
3. **Single-resolution path.** Both target switching and bearer
   re-issue go through `useMemo([target, token])`. If a future
   refactor adds another auth dimension (e.g. impersonation header),
   the dep array needs the new key or the client will be stale.

## Recommended next move

**Task 0105 — `packages/cli` auth/SDK consumer swap.** Symmetric
CLI-side migration: drop any direct `fetch` / route-string / header
construction in `packages/cli/src/auth/**` and dispatch through
`client.auth.*` from `@saas/sdk`. Estimated single PR. Unblocked by
Task 0103 AuthClient (same trigger as 0104). To be re-evaluated and
scoped by the next orchestrator pass against current repo state.

## PR + CI evidence

- PR: **#159** — https://github.com/sourceplane/multi-tenant-saas/pull/159
- PR head at verification: `d2aec28` (post-`update-branch`)
- PR-CI run (post-rebase): **`26700827443`** — 4/4 SUCCESS
- Squash-merge commit: **`c78592f303ea3f957aea8928d44543ac4d168820`**
- Post-merge main-CI run: **`26700942407`** — 4/4 SUCCESS, conclusion
  `success`
- Branch `impl/task-0104-console-u10-sdk-refactor` deleted on merge
- Live URL evidence: stage + prod each return HTTP/2 307 → `/orgs`
  with `x-opennext: 1` and the expected `<title>Sourceplane
  Console</title>` app-shell HTML

PR #159 — https://github.com/sourceplane/multi-tenant-saas/pull/159
