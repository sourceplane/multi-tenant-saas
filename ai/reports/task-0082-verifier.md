# Task 0082 — Verifier Report

## Result: FAIL

## Summary

PR #125 introduces a greenfield `apps/web-console-next/` Next.js 15 console.
The code-level acceptance criteria are largely met (PreconditionInsight with
four shapes, Cmd-K palette wired via Providers, Zod-driven create flows on
≥5 routes, URL-as-source-of-truth scoping, old `apps/web-console`
byte-identical). However, **all three `web-console-next · {dev,stage,prod} ·
Verify deploy` jobs remain RED**, and the underlying cause is a contract
mismatch between the Orun component definition and the actual build
toolchain that the verifier cannot fix within scope.

The verifier did apply the surgical prerender fix sanctioned by the task
prompt (commit `875e6e6`), which provably resolves the original blocker
(static export `TypeError: Cannot read properties of undefined (reading
'url')` in `useMemo`). CI now advances past prerender, builds 16/16 routes
as dynamic, and fails at the **next** stage — `verify-build-output` — for a
different reason that requires implementer-level changes.

Per the verifier prompt's boundary, the verifier MUST NOT add new
dependencies (`@opennextjs/cloudflare`), modify `component.yaml`'s
`outputDir`, or change the deploy model. Returning to the orchestrator.

## Checks

| Check | Status | Notes |
|---|---|---|
| PR mapped to single task | PASS | Task 0082, scope contained in `apps/web-console-next/**` (+ verifier fix) |
| `apps/web-console` byte-identical | PASS | `git diff origin/main..HEAD -- apps/web-console` is empty |
| No worker/contract/db/policy/api-edge/Terraform touched | PASS | Diff confined to `apps/web-console-next/**` and `ai/reports/**` |
| Implementer report committed on PR branch | PASS | `ai/reports/task-0082-implementer.md` present at `9f3ec6b` |
| Screenshots directory populated | PASS | 12 PNGs at `ai/reports/task-0082-shots/` (matches implementer report) |
| `PreconditionInsight` four reason shapes | PASS | `limit_reached`, `disabled`, `not_configured`, `malformed_limit` rendered in `/demo` and component branches |
| Cmd-K palette wired globally | PASS | `CommandPaletteProvider` mounted in `apps/web-console-next/src/app/providers.tsx`; `usePalette` consumed in `topbar.tsx` |
| ≥3 Zod-driven create flows | PASS | `ZodForm` used in `orgs`, `projects`, `environments`, `invitations`, `api-keys` (and `/demo`, `/login`) |
| No `sessionStorage`-based routing | PASS | Only doc comment in `scope-switcher.tsx` mentions it; zero runtime uses |
| Bearer-token display redaction | PASS | `login/page.tsx` uses `type="password"` for token input |
| `pnpm --filter @saas/web-console-next typecheck` | PASS | Zero errors |
| `pnpm --filter @saas/web-console-next build` (no env) | PASS | 7 static + 9 dynamic routes after layout fix |
| `NEXT_PUBLIC_DEPLOY_ENV=dev pnpm build` (CI parity) | PASS | All 16 routes dynamic after layout fix |
| `pnpm --filter @saas/web-console typecheck` (old console) | PASS | Untouched |
| PR `mergeStateStatus = CLEAN` | n/a | UNCLEAN — required checks RED |
| All `web-console-next · * · Verify deploy` SUCCESS | **FAIL** | All three fail at `verify-build-output` step |

## CI Log Review

- Original failing run: **`26622616478`** (pre-fix head `9f3ec6b`).
  Failure: `Error occurred prerendering page "/demo"` →
  `TypeError: Cannot read properties of undefined (reading 'url')` in
  `useMemo` during static export. Matches task prompt's diagnosis.
- Verifier fix run 1: **`26623449990`** (head `ea197d6`).
  /demo passed; /login then hit the same prerender error. Confirmed the
  failure mode lives in the root `Providers` tree (`SessionProvider`),
  not in any individual route, so per-route opt-outs are insufficient.
- Verifier fix run 2: **`26623666583`** (head `875e6e6`, current).
  Next.js build now **succeeds** for all 16 routes (all reported as
  `ƒ (Dynamic)`). New, distinct failure surfaces in the orun
  `verify-build-output` step on all three envs:
  ```
   WARNING  no output files found for task @saas/web-console-next#build.
            Please check your `outputs` key in `turbo.json`
  ##[error]web-console-next · dev · Verify deploy ›
           verify-build-output: command exited with code 1
  ```
  Root cause is now an **implementer-scope bug**, not a prerender bug
  (see Issues §1).

Required CI status at current head `875e6e6`:
- `plan` = SUCCESS
- `web-console-next · dev · Verify deploy` = FAILURE
- `web-console-next · stage · Verify deploy` = FAILURE
- `web-console-next · prod · Verify deploy` = FAILURE

## Verifier Fix

Commit `875e6e6` on `impl/task-0082-web-console-next`:
- `apps/web-console-next/src/app/layout.tsx` — added
  `export const dynamic = "force-dynamic"` with rationale comment.
- `apps/web-console-next/src/app/demo/page.tsx` — reverted the
  intermediate per-route opt-out (no longer needed once the root layout
  forces dynamic for the whole app).

Rationale (one line): the root `Providers` tree (`SessionProvider`,
`next-themes`, `CommandPaletteProvider`) is fully client-only and the
session-authenticated console has no static content to prerender, so
forcing the root dynamic resolves the Next.js 15 useMemo `undefined.url`
crash for every route (including `/_not-found`) without enlarging diff
scope. Verified locally with `NEXT_PUBLIC_DEPLOY_ENV=dev pnpm build`.

The earlier commit `ea197d6` (per-route /demo opt-out) is now redundant
but kept on the branch for forensic clarity.

## Secret Handling Review

- No bearer tokens, API keys, or live credentials present anywhere in
  the diff, in `ai/reports/task-0082-shots/`, or in this report.
- Bearer-token paste affordance on `/login` uses `<Input type="password">`
  for display redaction.
- `ai/reports/task-0082-shots/` are static UI captures with mock data only.

## Issues

### 1. (Blocker) Implementer scope gap — opennextjs/cloudflare wiring missing
`apps/web-console-next/component.yaml` declares
`outputDir: .open-next/assets` and the README states
"opennextjs/cloudflare delivery", but:
- `apps/web-console-next/package.json` has no `@opennextjs/cloudflare`
  dependency and no `opennextjs-cloudflare` script.
- The `build` script is plain `next build`, which emits `.next/` — not
  `.open-next/assets`.
- `turbo.json` declares `outputs: ["dist/**", ".wrangler/**"]`, neither
  of which the new app produces.
- The orun `verify-build-output` step therefore fails on every env with
  "no output files found".

Resolving this is **out of verifier scope** because it requires either:
(a) adding `@opennextjs/cloudflare` to `package.json` and wiring an
`opennextjs-cloudflare build` step, **or**
(b) switching the component to a vanilla static-export model and
producing assets the existing pipeline can consume.

Either path is implementer territory and likely needs a Task 0082
follow-up commit (or a Task 0083 sibling) — not a single-line verifier
patch.

### 2. (Non-blocking) Stale per-route opt-out commit on branch
Commit `ea197d6` (verifier's first attempt to opt /demo out per-route)
was superseded by `875e6e6`. Both remain on the branch. Squash-merge at
final disposition will collapse them; leaving them for now to keep the
diagnostic trail visible.

## Risk Notes

- Forcing the root layout dynamic is the correct call for a
  session-authenticated app, but it does mean **zero pages get
  statically prerendered** — every route is a server render. For the
  current console this is correct; if marketing pages are added later
  under this app they will need `export const dynamic = "force-static"`
  on those individual routes.
- The component's `smokeCommand` expects
  `https://${EFFECTIVE_PROJECT_NAME}.pages.dev/` to return HTML containing
  `'Sourceplane Console'`. With the dynamic-root change, the response is
  generated server-side by the Pages Function (once deployment works);
  the document `<title>` is still `'Sourceplane Console'`, so the smoke
  string match should still pass. Verify after Issue §1 is resolved.

## Spec Proposals

None required. The `/demo` and `/login` failure modes are well-known
Next.js 15 static-export pitfalls (see
`https://nextjs.org/docs/messages/prerender-error` and
`https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout`),
not new spec territory.

## Live Resource Evidence

No live Pages preview to evidence — the verify-deploy jobs never reached
the build-asset-publish step on any environment. Once Issue §1 is
resolved and CI goes green, the per-env Pages projects
(`sourceplane-web-console-next-{dev,stage,prod}`) should become reachable
and the smokeCommand will validate `Sourceplane Console` in the response
body.

## Recommended Next Move

**Open a Task 0082-followup** (implementer) scoped narrowly to:
1. Decide between (a) `@opennextjs/cloudflare` adoption (matches the
   declared `outputDir: .open-next/assets`) or (b) switching component
   `type` / `outputDir` to match a `next build` output.
2. Wire the chosen path (one new dep + `opennextjs-cloudflare build`
   script + `turbo.json` outputs update, OR component.yaml update).
3. Push to the same `impl/task-0082-web-console-next` branch; reopen
   verification.

**Do NOT** scope Task 0083 (cutover from `apps/web-console`) until the
new console actually deploys.

The prerender fix on commit `875e6e6` should be retained as-is; the
follow-up does not need to re-derive it.

## PR Number

**#125** — https://github.com/sourceplane/multi-tenant-saas/pull/125
(left OPEN; head `875e6e67caf3e5555679e966eba1b9f4245e6a29`)
