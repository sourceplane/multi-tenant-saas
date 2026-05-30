# Task 0094 (Verifier)

Agent: Verifier

## Current Repo Context

- Tasks 0001–0093 verified and merged. `main` tip `de0bca1` (post Task 0093 verifier squash + verifier artifacts).
- Task 0094 (Implementer) complete: PR #142 (`impl/task-0094-edge-idempotency-contract`) OPEN against `main`. Implementer report filed at `ai/reports/task-0094-implementer.md`.
- PR-CI rollup at scope time: 9/9 required CheckRuns SUCCESS (`plan` ✓, `api-edge-tests · dev · Verify` ✓, `contracts-tests · dev · Verify` ✓, `contracts · {dev,stage,prod} · Verify` ✓, `api-edge · {dev,stage,prod} · Verify deploy` ✓). `mergeable: MERGEABLE`, `mergeStateStatus: CLEAN`.
- Diff scope per `gh pr diff 142 --name-only`: 15 files — 3 contracts, 8 api-edge (idempotency.ts + 7 facade call-sites), 2 new test files, `ai/context/open-risks.md`, `ai/reports/task-0094-implementer.md`. Zero hits on `tooling/eslint/index.js`, `infra/**`, `intent.yaml`, `component.yaml`, `wrangler.*`, `kiox.lock`, `pnpm-lock.yaml`, `apps/notifications-worker/**`, `apps/web-console-next/**`, the `cloudflare ~> 4.52` pin, or `infra/terraform/cloudflare-domain/**` (Task 0085b deferred boundary).
- Deferred set unchanged: notifications-provider-swap, Task 0085b (cloudflare-domain v4→v5), notifications-worker-dev-reframe.

## Objective

Verify PR #142 against the Task 0094 prompt and the orchestrator Verifier Standard. On PASS, squash-merge per the PR #137–#141 convention, fast-forward `main`, wait for the post-merge main-CI run to complete on the deploy-gated `api-edge` jobs (`api-edge · {dev,stage,prod} · Verify deploy`) and `contracts · {dev,stage,prod} · Verify` jobs, smoke-curl the live console and one unsafe edge POST surface to confirm no regression, then commit verifier report + state-file updates to `main`.

## PR Boundary (must match Task 0094 prompt exactly)

- **In:** `packages/contracts/src/idempotency.ts` (NEW) + barrel re-export in `packages/contracts/src/index.ts` + `packages/contracts/package.json` `exports` entry; `apps/api-edge/src/idempotency.ts` (NEW edge helper); validation-gate call sites in the seven facades (`auth`, `org`, `project`, `metering`, `config`, `webhooks`, `billing`); new tests at `tests/contracts/src/idempotency.test.ts` and `tests/api-edge/src/idempotency-edge.test.ts`; `ai/context/open-risks.md` lines 83–92 partial-closure update; implementer report.
- **Out (verifier FAILS if found):** any KV/DO/database storage; any actual replay/dedup behavior; any rate-limit logic; any change to downstream worker behavior under `apps/{auth,org,project,metering,config,webhooks,billing,notifications}-worker/**`; required-key enforcement on any route; edits to `tooling/eslint/index.js`; edits to `apps/web-console-next/**`; edits to `pnpm-lock.yaml`, any `package.json` other than `packages/contracts/package.json`, `intent.yaml`, `component.yaml`, `wrangler.*`, `kiox.lock`; any `infra/**` change including `infra/terraform/cloudflare-domain/**`; any `// eslint-disable*` or `// @ts-ignore` introduction; any change to the `cloudflare ~> 4.52` pin.

## Read First

- `agents/orchestrator.md` § Verifier Standard and § Verifier Merge Protocol
- `ai/tasks/task-0094.md` (the implementer prompt — full Required Outcomes / Constraints / Acceptance / Architect Brief)
- `ai/reports/task-0094-implementer.md` (implementer's claims to validate)
- `specs/roadmap.md` lines 54–63 (B3 charter — confirm scope is the contract+gate slice only, not the full B3 line)
- `ai/context/open-risks.md` lines 83–92 (the open risk this PR partially closes)
- `packages/contracts/src/errors.ts` (verify the implementer reused `validation_failed` rather than minting a new code)
- `apps/api-edge/src/cors.ts` (verify `idempotency-key` allowlist remains intact and unchanged)
- `references/post-merge-deploy-profile-gap.md` (api-edge has `deploy` profile on push-main → smoke gate is mandatory)

## Required Outcomes

- [ ] Diff-scope audit: `gh pr diff 142 --name-only` matches the In list above; zero Out hits.
- [ ] `parseIdempotencyKey` is reachable from outside `packages/contracts` (i.e. importable as `@saas/contracts/idempotency` AND via the contracts barrel `@saas/contracts`) — confirm by `node -e` or by inspecting Task 0095 import path readiness.
- [ ] Validator behavior matches the contract claims in the implementer report:
  - absent header → `{ ok: true, key: null }` (pass-through)
  - empty/whitespace-only after trim → `{ ok: false, reason: \"empty\" }`
  - over 255 chars → `{ ok: false, reason: \"too_long\" }`
  - non-ASCII / control chars / CR / LF / null byte / DEL → `{ ok: false, reason: \"illegal_characters\" }`
  - valid 1..255 ASCII printable → `{ ok: true, key: <trimmed> }`
- [ ] Edge helper (`apps/api-edge/src/idempotency.ts`) returns 400 `validation_failed` with `details: { header: \"Idempotency-Key\", reason: <one of empty|too_long|illegal_characters> }` on present-but-malformed unsafe-method requests; returns `null`/pass on safe methods (GET/HEAD) regardless of header validity; returns `null` on absent header for any method.
- [ ] In each of the seven facades, every unsafe-method (POST/PATCH/PUT/DELETE) branch invokes the helper **before** any `resolveActor`/forwarding `fetch`. Safe-method branches do NOT invoke the helper. (Read each facade file to confirm; do not trust grep alone.)
- [ ] `FORWARDED_HEADERS` in each touched facade still includes `idempotency-key` (the gate validates but does not strip — downstream workers still receive the header for Task 0090 caller-side dedup).
- [ ] Local re-execution passes:
  - `pnpm install --frozen-lockfile` exit 0
  - `pnpm -r typecheck` exit 0
  - `pnpm -r --no-bail lint` exit 0 (warnings preserved; zero new errors)
  - `pnpm --filter @saas/contracts-tests test` exit 0 (≥ 16 new idempotency cases pass)
  - `pnpm --filter @saas/api-edge-tests test` exit 0 (≥ 9 new edge integration cases pass)
- [ ] `kiox -- orun validate --intent intent.yaml` exit 0; `kiox -- orun plan --changed --intent intent.yaml --output plan.json` produces a plan; `kiox -- orun run --plan plan.json --dry-run --runner github-actions` exit 0.
- [ ] Boundary integrity audit (`git diff origin/main..impl/task-0094-edge-idempotency-contract -- <path>` empty for):
  - `tooling/eslint/index.js`
  - `pnpm-lock.yaml`
  - `intent.yaml`
  - `infra/**`
  - `infra/terraform/cloudflare-domain/**`
  - any `**/wrangler.*`, `**/component.yaml`, `**/kiox.lock`
  - `apps/notifications-worker/**`
  - `apps/web-console-next/**`
  - any `package.json` other than `packages/contracts/package.json`
  - any `eslint.config.js` or `eslint.config.mjs`
  - any worker source under `apps/{auth,org,project,metering,config,webhooks,billing,notifications}-worker/**`
- [ ] No `// eslint-disable*` or `// @ts-ignore` lines added (`git diff origin/main..impl/task-0094-edge-idempotency-contract -- '*.ts' | grep -E '^\\+.*(eslint-disable|@ts-ignore)'` returns empty; if it matches inside the implementer-report markdown describing absence, that is fine — only source-file additions count).
- [ ] PR-CI rollup at merge time: all required CheckRuns SUCCESS, `mergeable: MERGEABLE`, `mergeStateStatus: CLEAN`. If `mergeStateStatus` is `BEHIND`, run `gh pr update-branch 142` and wait for CI re-run before merging.
- [ ] Post-merge: squash-merge with `gh pr merge 142 --squash --delete-branch`; checkout `main`; `git pull --ff-only origin main`; `git status --short` clean.
- [ ] Post-merge main-CI run completes with `conclusion: success` overall AND on each of: `api-edge · {dev,stage,prod} · Verify deploy`, `contracts · {dev,stage,prod} · Verify`, `api-edge-tests · dev · Verify`, `contracts-tests · dev · Verify`. (api-edge has `deploy` profile on push-main — `references/post-merge-deploy-profile-gap.md` applies; do NOT mark PASS until this run is green.)
- [ ] Live smoke after main-CI green:
  - `curl -sSI https://stage.sourceplane.ai/` → `HTTP/2 307` `location:/orgs`
  - `curl -sSI https://prod.sourceplane.ai/` → `HTTP/2 307` `location:/orgs`
  - One representative unsafe-POST surface end-to-end smoke that exercises the new gate: e.g. `curl -sS -X POST -H \"Idempotency-Key: \" https://stage.sourceplane.ai/v1/auth/magic-link/send -d '{}'` should return 400 with the chosen `validation_failed` envelope (empty key) BEFORE any worker is reached. A request with a valid key (or with no header) should pass through to the existing 401/403/200 behavior unchanged.
- [ ] Verifier report at `ai/reports/task-0094-verifier.md` with all mandatory sections (Result, Checks, Issues, CI Log Review, Live Resource Evidence, Secret Handling Review, Spec Proposals, Risk Notes, Recommended Next Move).
- [ ] State-file updates (`ai/state.json`, `ai/context/current.md`, `ai/context/task-ledger.md`) committed to `main` after merge.

## Non-Goals

- No follow-up scoping for Task 0095 (durable replay) or Task 0096 (rate limiting) — orchestrator owns next-task selection.
- No required-key enforcement audit (header stays optional in this PR by design).
- No spec edits beyond drift-reporting (specs already align; the prompt cites `specs/roadmap.md` lines 54–63 correctly).
- No infra / migration / deployed-resource changes beyond the api-edge worker bundle redeploy that the post-merge main-CI run performs automatically.
- No second PR for verifier artifacts; verifier commits go directly to `main` post-merge per the established protocol.

## Constraints

1. Do not merge until BOTH PR-CI is fully green AND the deploy-profile-gap rule is satisfied (post-merge main-CI green on api-edge × {dev,stage,prod} `Verify deploy`).
2. Do not introduce any source change in this verifier pass — verifier-only artifacts are the report + state files. If a real bug is found, leave the PR open and document the blocker; do NOT push a fix on the implementer's branch.
3. Do not mint a new error code, refactor `errors.ts`, or rename `validation_failed`. The implementer reused the existing surface intentionally.
4. Do not flag `billing-facade` as overreach for being plumbed despite being GET-only today — the prompt explicitly grants this latitude (\"plumbed so future unsafe billing routes inherit the gate\"). Only flag it if the helper actually rejects a current GET request.
5. Boundaries to preserve from prior tasks: do not modify `tooling/eslint/index.js`, `infra/terraform/cloudflare-domain/**`, the `cloudflare ~> 4.52` pin, or `apps/notifications-worker/**`.

## Integration Notes

- The PR is the contract + edge-validation slice of B3 only. Task 0095 (durable replay) and Task 0096 (rate limiting) are explicit follow-ups; do not require this PR to ship those.
- `parseIdempotencyKey` is the contract Task 0095 will import — verifier MUST confirm it is exported through both `packages/contracts/src/index.ts` (barrel) and the `./idempotency` `exports` subpath in `packages/contracts/package.json`.
- `apps/api-edge` follows the `cloudflare-worker-turbo` deploy-on-push-main pattern. PR-time `Verify deploy` exercises the bundle build + typecheck only; the actual Cloudflare deploy + smoke happens on the post-merge main run. This is the same shape that produced the Task 0082/0082.1 white-page miss when skipped.

## Acceptance Criteria

✅ Diff-scope audit clean (15 files, all in the In list).
✅ Boundary integrity audit clean (zero Out hits).
✅ Local validation block green (frozen-lockfile, typecheck, lint, contract tests, api-edge tests, kiox/orun triple).
✅ PR-CI 9/9 SUCCESS, `mergeStateStatus: CLEAN` at merge time.
✅ Squash-merged with `--delete-branch`; local `main` fast-forwarded; working tree clean.
✅ Post-merge main-CI run `conclusion: success` overall and on each api-edge × {dev,stage,prod} `Verify deploy` and contracts × {dev,stage,prod} `Verify` job.
✅ Live smoke confirms console unchanged (307 → /orgs on stage + prod) AND the new gate is observable on at least one unsafe-POST surface (malformed key → 400 `validation_failed`).
✅ Zero source-level `+eslint-disable*` / `+@ts-ignore` lines.
✅ Verifier report at `ai/reports/task-0094-verifier.md` with all mandatory sections.
✅ State-file updates committed on `main` (`ai/state.json` adds `\"0094\"` to completed; `current_task` advances; `current.md` and `task-ledger.md` reflect verified outcome).
✅ `git status --short` clean at end.

If any ✅ fails: result is FAIL. Leave PR open, document the blocker in the verifier report, do not merge.

## Verification

The Verifier executes (in order):

1. `gh pr view 142 --json state,mergeable,mergeStateStatus,statusCheckRollup` — confirm OPEN, MERGEABLE, CLEAN, 9/9 SUCCESS.
2. `gh pr diff 142 --name-only` — diff-scope audit against the In list.
3. Targeted boundary integrity audit (`git diff origin/main..origin/impl/task-0094-edge-idempotency-contract -- <each Out path>` empty).
4. Read each touched facade source: confirm the helper is invoked on unsafe methods only and runs before forwarding; confirm `FORWARDED_HEADERS` still includes `idempotency-key`.
5. Read `packages/contracts/src/idempotency.ts`, `packages/contracts/src/index.ts`, and `packages/contracts/package.json`: confirm `parseIdempotencyKey` and `IDEMPOTENCY_KEY_HEADER` are exported through both the barrel and the `./idempotency` subpath.
6. Local: `git fetch origin && git checkout impl/task-0094-edge-idempotency-contract && git pull --ff-only`.
7. `pnpm install --frozen-lockfile` (exit 0; \"Lockfile is up to date\").
8. `pnpm -r typecheck` (exit 0).
9. `pnpm -r --no-bail lint` (exit 0; warnings preserved).
10. `pnpm --filter @saas/contracts-tests test` and `pnpm --filter @saas/api-edge-tests test` (both exit 0; new cases present).
11. `kiox -- orun validate --intent intent.yaml`; `kiox -- orun plan --changed --intent intent.yaml --output plan.json`; `kiox -- orun run --plan plan.json --dry-run --runner github-actions` (all exit 0).
12. `git grep -nE '^\\+.*(eslint-disable|@ts-ignore)' -- '*.ts'` against the diff — zero source-file matches.
13. If `mergeStateStatus` becomes `BEHIND`, run `gh pr update-branch 142` and wait for CI re-run.
14. Squash-merge: `gh pr merge 142 --squash --delete-branch`.
15. `git checkout main && git pull --ff-only origin main && git status --short` (clean).
16. Wait for post-merge main-CI run to complete; `gh run view <id> --json conclusion,jobs` — confirm `conclusion: success` overall and on each api-edge × {dev,stage,prod} `Verify deploy` and contracts × {dev,stage,prod} `Verify` job.
17. Live smoke: console 307 on stage + prod; one unsafe-POST surface returns 400 `validation_failed` for a malformed `Idempotency-Key`.
18. Write `ai/reports/task-0094-verifier.md` with all mandatory sections.
19. Update `ai/state.json` (`completed += [\"0094\"]`, `current_task` → orchestrator-next, `last_verified` = now, `task_agent` = `/ai/reports/task-0094-verifier.md`, `notes` updated), `ai/context/current.md` (mark Task 0094 verified + merged, refresh repo health block, update next-task candidate list), `ai/context/task-ledger.md` (append the verified-and-merged status block).
20. Commit verifier artifacts on `main`: `git add ai/reports/task-0094-verifier.md ai/state.json ai/context/current.md ai/context/task-ledger.md && git commit -m \"Task 0094 verification PASS: edge idempotency-key contract + validation gate\" && git push origin main`.
21. `git status --short` clean at end.

If verification adds verifier-only commits to the PR branch (e.g. inserting the verifier report on the PR branch before merge), follow the standard \"push, wait for CI again, then merge\" pattern. The default and preferred path here is verifier-artifacts-on-main *after* merge — it keeps PR scope to implementer changes.

## PR Creation Requirement

The Implementer has already created PR #142. Your job is to verify it. No new PR is created by this task.

## When Done Report

File at `ai/reports/task-0094-verifier.md` with sections:
- **Result:** PASS or FAIL
- **Checks:** numbered list of every validation step actually performed (commands + exit codes / observed values)
- **Issues:** any blockers or non-blocking concerns; empty list if PASS-clean
- **CI Log Review:** PR-CI rollup snapshot at merge time + post-merge main-CI run id and per-job conclusion for the deploy-gated set
- **Live Resource Evidence:** stage + prod console smoke output; the unsafe-POST gate smoke output
- **Secret Handling Review:** confirmation that no secret material appears in the diff, the new idempotency contract, or any test fixture
- **Spec Proposals:** none expected — note explicitly if found
- **Risk Notes:** residual risk after verification (Task 0095 durable replay still missing; required-key enforcement still off; B3 line still partial)
- **Recommended Next Move:** orchestrator picks Task 0095 (durable replay, KV/DO storage decision) OR pivots to class-B warning cleanup wave OR revisits a deferred candidate when one unblocks
