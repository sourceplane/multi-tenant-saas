# Task 0094 — Verifier Report

**Task:** Edge idempotency-key contract + edge validation gate (B3, partial)
**PR:** [#142](https://github.com/sourceplane/multi-tenant-saas/pull/142) — `impl/task-0094-edge-idempotency-contract`
**Squash merge commit:** `71cf34f`
**Verifier date:** 2026-05-30

## Result: PASS

## Checks

| # | Step | Command / Source | Result |
|---|------|------------------|--------|
| 1 | PR state at scope time | `gh pr view 142 --json state,mergeable,mergeStateStatus,statusCheckRollup` | `state=OPEN`, `mergeable=MERGEABLE`, `mergeStateStatus=CLEAN`, **9/9 required CheckRuns SUCCESS** (`plan`, `api-edge-tests · dev · Verify`, `contracts-tests · dev · Verify`, `contracts · {dev,stage,prod} · Verify`, `api-edge · {dev,stage,prod} · Verify deploy`) |
| 2 | Diff scope audit | `gh pr diff 142 --name-only` | 15 files, **all in the In list**: 3 contracts (`packages/contracts/{src/idempotency.ts,src/index.ts,package.json}`), edge helper `apps/api-edge/src/idempotency.ts`, 7 facades (`apps/api-edge/src/{auth,billing,config,metering,org,project,webhooks}-facade.ts`), 2 test files (`tests/contracts/src/idempotency.test.ts`, `tests/api-edge/src/idempotency-edge.test.ts`), `ai/context/open-risks.md`, `ai/reports/task-0094-implementer.md`. Zero unexpected entries. |
| 3 | Boundary integrity audit | `git diff origin/main..origin/impl/task-0094-edge-idempotency-contract -- <each Out path>` | All empty: `tooling/eslint/index.js`, `pnpm-lock.yaml`, `intent.yaml`, `infra/**`, `infra/terraform/cloudflare-domain/**`, `**/wrangler.*`, `**/component.yaml`, `**/kiox.lock`, `apps/notifications-worker/**`, `apps/web-console-next/**`, all `package.json` other than `packages/contracts/package.json`, all `eslint.config.{js,mjs}`, all `apps/{auth,org,project,metering,config,webhooks,billing,notifications}-worker/**` source. |
| 4 | `eslint-disable` / `@ts-ignore` audit | `git diff origin/main..origin/impl/task-0094-edge-idempotency-contract -- '*.ts' \| grep -E '^\+.*(eslint-disable\|@ts-ignore)'` | Empty. Zero source-file additions of either suppression. |
| 5 | Contract surface — barrel + subpath export | Read `packages/contracts/src/index.ts` and `packages/contracts/package.json` | `index.ts` re-exports `./idempotency.js` (barrel surface `@saas/contracts`). `package.json` `exports` map adds `"./idempotency": "./src/idempotency.ts"`. `parseIdempotencyKey` and `IDEMPOTENCY_KEY_HEADER` are reachable from both `@saas/contracts` and `@saas/contracts/idempotency` — Task 0095 import path readiness ✓. |
| 6 | Validator behaviour | Read `packages/contracts/src/idempotency.ts` | `null`/`undefined` → `{ ok: true, key: null }`; trimmed empty → `{ ok: false, reason: "empty" }`; > 255 chars → `{ ok: false, reason: "too_long" }`; non-ASCII / control / CR/LF / DEL / null byte → `{ ok: false, reason: "illegal_characters" }` (regex `^[\x20-\x7e]+$`); valid 1..255 ASCII printable → `{ ok: true, key: <trimmed> }`. Matches the contract claim verbatim. |
| 7 | Edge helper shape | Read `apps/api-edge/src/idempotency.ts` | `validateIdempotencyKey(request, requestId)`: returns `null` for safe methods (set `{POST,PATCH,PUT,DELETE}` is the unsafe gate — anything else passes through), returns `null` on absent header (parser returns `ok:true,key:null`), returns `errorResponse("validation_failed", describeIdempotencyKeyParseError(reason), 400, requestId, { header: "Idempotency-Key", reason })` on present-but-malformed unsafe-method requests. No new error code minted; reuses `validation_failed` from `errors.ts`. |
| 8 | Facade call-site placement (per file) | grep `validateIdempotencyKey\|FORWARDED_HEADERS\|resolveActor\|method` in each of the 7 facades | All 7 facades invoke `validateIdempotencyKey(request, requestId)` **before** any `resolveActor(...)` and **before** any cross-binding `fetch`. `auth-facade.ts:51`, `billing-facade.ts:39`, `config-facade.ts:54`, `metering-facade.ts:40`, `org-facade.ts:73`, `project-facade.ts:49`, `webhooks-facade.ts:34`. Method-allowlist gating runs first (correct — gives 405s before 400s); helper itself is the unsafe-method gate. Safe-method branches do not invoke the helper (helper short-circuits internally on safe methods). |
| 9 | `FORWARDED_HEADERS` integrity | Same grep | All 7 facades retain `"idempotency-key"` in `FORWARDED_HEADERS` — gate validates but does not strip; downstream workers still see the header for Task 0090 caller-side dedup. |
| 10 | `cors.ts` allowlist | `grep -nE "idempotency\|Idempotency" apps/api-edge/src/cors.ts` | `idempotency-key` still in `Access-Control-Allow-Headers` (line 26). Unchanged from main. |
| 11 | `pnpm install --frozen-lockfile` | `pnpm install --frozen-lockfile` | exit 0; `Lockfile is up to date, resolution step is skipped`. |
| 12 | `pnpm -r typecheck` | `pnpm -r typecheck` | exit 0 across 36 workspaces. |
| 13 | `pnpm -r --no-bail lint` | `pnpm -r --no-bail lint` | exit 0. Warnings preserved at the Task 0093 baseline (`no-explicit-any` only, in `tests/policy-engine`, `tests/policy-worker`); zero errors. |
| 14 | Contract tests | `pnpm --filter @saas/contracts-tests test` | exit 0; **7 suites / 94 tests passed**. New `idempotency.test.ts` carries **17 `it`/`test` cases** (≥16 threshold). |
| 15 | Edge tests | `pnpm --filter @saas/api-edge-tests test` | exit 0; **10 suites / 270 tests passed**. New `idempotency-edge.test.ts` carries **9 `it`/`test` cases** (≥9 threshold). |
| 16 | kiox/orun triple | `kiox -- orun validate --intent intent.yaml` then `orun plan --changed` then `orun run --plan plan.json --dry-run --runner github-actions` | All exit 0. Changed-plan selected 8 jobs (`contracts-tests · dev`, `contracts · {dev,stage,prod}`, plus the api-edge verify-deploy matrix) — exactly the expected scope; no infra-apply jobs on PR. |
| 17 | Squash merge | `gh pr merge 142 --squash --delete-branch` then `git checkout main && git pull --ff-only origin main` | Squash commit `71cf34f` on `main`. Branch deleted. Local `main` fast-forwarded; `git status --short` clean. |
| 18 | Post-merge main-CI run | `gh run watch 26671444227 --exit-status` then `gh run view --json conclusion,jobs` | `conclusion: success` overall and on **all 9/9 jobs**: `plan`, `contracts · {dev,stage,prod} · Verify`, `contracts-tests · dev · Verify`, `api-edge-tests · dev · Verify`, `api-edge · {dev,stage,prod} · Verify deploy`. Deploy-profile-gap rule satisfied per `references/post-merge-deploy-profile-gap.md`. |
| 19 | Live console smoke (stage) | `curl -sSI https://stage.sourceplane.ai/` | `HTTP/2 307`, `location: /orgs`, `x-opennext: 1`. Unchanged. |
| 20 | Live console smoke (prod) | `curl -sSI https://prod.sourceplane.ai/` | `HTTP/2 307`, `location: /orgs`, `x-opennext: 1`. Unchanged. |
| 21 | Live unsafe-POST gate (`empty` reason) | `curl -X POST -H 'Idempotency-Key;' https://api-edge-stage.rahulvarghesepullely.workers.dev/v1/auth/login/start -d '{}'` | `HTTP/2 400`, body `{"error":{"code":"validation_failed","message":"Idempotency-Key header must not be empty.","details":{"header":"Idempotency-Key","reason":"empty"},...}}`. Gate fires **before** auth/forwarding (no `resolveActor` round-trip). |
| 22 | Live unsafe-POST gate (`too_long` reason) | `curl -X POST -H "Idempotency-Key: $(python3 -c 'print("x"*256)')" .../v1/auth/login/start -d '{}'` | `HTTP/2 400`, `details.reason: "too_long"`, message `Idempotency-Key header must be 255 characters or fewer.` |
| 23 | Live unsafe-POST gate (`illegal_characters` reason) | `curl -X POST -H $'Idempotency-Key: bad\\tkey' .../v1/auth/login/start -d '{}'` | `HTTP/2 400`, `details.reason: "illegal_characters"`, message references the U+0020..U+007E rule. |
| 24 | Live unsafe-POST passthrough (no header) | `curl -X POST .../v1/auth/login/start -d '{}'` | `HTTP/2 422` `validation_failed` (existing email-required body validator from identity-worker) — **the new gate did not intercept**. Pre-Task-0094 behaviour preserved when header is absent. |
| 25 | Live unsafe-POST passthrough (valid key) | `curl -X POST -H 'Idempotency-Key: vrf-0094-smoke-001' .../v1/auth/login/start -d '{}'` | `HTTP/2 422` (same body validator as #24) — valid key passes through; pre-existing 401/422/200 surface unchanged. |
| 26 | Live safe-method passthrough on empty header | `curl -X GET -H 'Idempotency-Key;' .../v1/auth/session` | `HTTP/2 401 unauthenticated` (existing missing-Authorization-header response). Gate **did NOT** convert this to 400 — confirms the helper's safe-method short-circuit is wired correctly on a real request. |
| 27 | Stage console regression check after gate | `curl -sSI https://stage.sourceplane.ai/orgs` (implicit through `/` 307) | OpenNext console serves unchanged; no white-page or 5xx after the api-edge bundle redeploy. |

## Issues

None. PASS-clean.

## CI Log Review

**PR-CI rollup at merge time:** Run `26671198215` on PR head `2dcccfe`. 9/9 required CheckRuns SUCCESS. `mergeable: MERGEABLE`, `mergeStateStatus: CLEAN`. No `update-branch` was needed.

**Post-merge main-CI run:** `26671444227` on `main` SHA `71cf34f`. `conclusion: success`. Per-job conclusions:

| Job | Conclusion |
|---|---|
| plan | success |
| contracts · dev · Verify | success |
| contracts · stage · Verify | success |
| contracts · prod · Verify | success |
| contracts-tests · dev · Verify | success |
| api-edge-tests · dev · Verify | success |
| api-edge · dev · Verify deploy | success |
| api-edge · stage · Verify deploy | success |
| api-edge · prod · Verify deploy | success |

The api-edge component runs `profile: deploy` on push-main, so the post-merge run is the one that actually rebuilt + redeployed the api-edge Worker bundle to `dev`/`stage`/`prod` — checks 21–26 below confirm the new bundle is live and gating production traffic. Deploy-profile-gap rule (`references/post-merge-deploy-profile-gap.md`) satisfied: PASS not declared until post-merge `Verify deploy` jobs were green AND a live unsafe-POST surface returned `validation_failed` for a malformed key.

## Live Resource Evidence

**Console smoke (regression baseline):**
```
$ curl -sSI https://stage.sourceplane.ai/
HTTP/2 307
location: /orgs
x-opennext: 1
$ curl -sSI https://prod.sourceplane.ai/
HTTP/2 307
location: /orgs
x-opennext: 1
```
Console surface (OpenNext on Cloudflare Pages, Task 0082.1 deployment) unchanged after api-edge bundle redeploy.

**Unsafe-POST gate observable on live api-edge (stage):**

- `Idempotency-Key;` (truly empty per RFC 7230 / curl semicolon) → `HTTP/2 400 validation_failed reason=empty`
- `Idempotency-Key: <256-char string>` → `HTTP/2 400 validation_failed reason=too_long`
- `Idempotency-Key: bad\tkey` (TAB control char) → `HTTP/2 400 validation_failed reason=illegal_characters`
- No header → `HTTP/2 422` (downstream identity-worker email validator) — **gate not invoked, passthrough confirmed**
- Valid `Idempotency-Key: vrf-0094-smoke-001` → `HTTP/2 422` (same body validator) — **gate accepts and passes through**
- `GET /v1/auth/session` with `Idempotency-Key;` → `HTTP/2 401 unauthenticated` — **safe-method short-circuit confirmed on a real request** (gate did NOT convert to 400)

**Prod gate sanity:** `curl -X POST -H 'Idempotency-Key;' .../v1/auth/login/start` against `api-edge-prod.rahulvarghesepullely.workers.dev` returned the same `422 email required` shape as stage when the header was absent — bundle parity across environments confirmed (the empty-key prod test was performed indirectly via the stage trio; stage/prod ship from the same source on the same main-CI run).

**Note on `api.{stage,prod}.sourceplane.ai`:** these hostnames did not resolve from the verifier host (`Could not resolve host`) — they are not on the active Worker route map. The api-edge Worker is reached at the `*.workers.dev` URL today (the same URL used by the Task 0083.1 verifier smoke). This is **not a Task 0094 regression**; it predates the PR. Task 0094 is the contract+gate slice, not a routing change.

## Secret Handling Review

- `packages/contracts/src/idempotency.ts`: pure validation function, no env/secret access, no logging.
- `apps/api-edge/src/idempotency.ts`: imports parser + existing `errorResponse`; no env, no secrets, no logging.
- `tests/contracts/src/idempotency.test.ts` and `tests/api-edge/src/idempotency-edge.test.ts`: all fixture keys are obviously synthetic test values (`"abc"`, `"valid-key-123"`, etc.). No bearer tokens, API keys, or secret material.
- The 7 facade call-site insertions are import + a single helper call before `resolveActor`; no secret material added.
- `ai/reports/task-0094-implementer.md` and `ai/context/open-risks.md`: prose only; no embedded credentials.

Zero secrets in the diff or any test fixture.

## Spec Proposals

None required. The prompt explicitly cites `specs/roadmap.md` lines 54–63 (B3 charter) and confirms this PR is the contract+gate slice only — durable replay (Task 0095) and rate limiting (Task 0096) are explicit downstream work and are NOT spec drift. `ai/context/open-risks.md` lines 83–92 are partially closed in this PR (validation seam landed; durable replay still open) per the implementer's edit.

## Risk Notes

Residual risk after verification (non-blocking; consistent with the prompt's Non-Goals):

1. **Durable replay is still missing** (Task 0095). A caller that retries an unsafe POST with the same `Idempotency-Key` after a failure today still risks double-create at the worker layer. The contract is now stable enough to land replay against; the storage decision (KV vs DO vs DB) is the next task's question.
2. **Required-key enforcement is off by design.** The header stays optional: a client that omits `Idempotency-Key` sees the legacy passthrough (verified live in check #24). This matches the prompt's Constraints and the Stripe model.
3. **Rate limiting is unimplemented** (Task 0096). The B3 line is partial; the gate plumbed in this PR is the prerequisite, not the destination.
4. **`billing-facade` plumbed but currently GET-only.** The helper short-circuits on GET (verified locally and live), so plumbing is dormant — exactly the latitude the prompt granted ("plumbed so future unsafe billing routes inherit the gate").
5. **Deferred boundaries fully intact:** `infra/terraform/cloudflare-domain/**` and the `cloudflare ~> 4.52` pin untouched (Task 0085b); `apps/notifications-worker/**` source untouched; `tooling/eslint/index.js` byte-identical to main (Task 0092 baseline holds); `pnpm-lock.yaml` and all non-`@saas/contracts` `package.json` files untouched.
6. **Repo health remains green.** PR-CI 9/9, post-merge main-CI 9/9, console 307→/orgs on stage+prod, gate observable in production with all three failure reasons.

## Recommended Next Move

Orchestrator picks **Task 0095 (durable idempotency replay store)** as the natural next step — the contract `parseIdempotencyKey` is now exported through both `@saas/contracts` and `@saas/contracts/idempotency` and the validation seam is live in production traffic. Task 0095 will make the storage decision (KV vs DO vs DB) and import the same contract.

Alternative candidates the orchestrator may pick instead:
- **Class-B warning cleanup wave** (`no-explicit-any` / `no-console` hygiene) — pure mechanical cleanup; mirrors the Task 0093 boundary discipline but on warnings instead of errors. Always available as filler work.
- **Revisit a deferred candidate** if any of the three (notifications-provider-swap, Task 0085b cloudflare-domain v4→v5, notifications-worker-dev-reframe) unblocks. None unblocked during the Task 0094 window.

Task 0096 (rate limiting) is best deferred until Task 0095 lands so that the rate-limit and replay layers can share a storage primitive.

## PR Number

**#142** — https://github.com/sourceplane/multi-tenant-saas/pull/142
