# Task 0113 — Verifier

Agent: Verifier

## Current Repo Context

- **Implementer pass:** Task 0113 (PR #168) ships the webhook-endpoint
  **re-enable** surface as a single coherent vertical-slice PR closing
  the documented contract gap from Task 0112: contract +
  `EnableWebhookEndpoint{Request,Response}` → SDK
  `WebhooksClient.enableEndpoint` → api-edge facade matcher (regex
  already covers `/enable`; pinned by a new `webhooks-facade.test.ts`
  case) → webhooks-worker `POST /v1/organizations/:orgId/webhooks/endpoints/:endpointId/enable`
  → db repo `enableEndpoint(orgId, endpointId)` → console
  detail-page **Re-enable endpoint** button + new
  `enable-endpoint-dialog.tsx`, with the disabled-state inline notice
  card rewritten to point at the new button (no longer at the spec
  proposal). Audit + event description: `"Webhook endpoint re-enabled"`.
- **PR:** #168 OPEN, MERGEABLE.
  Branch: `impl/task-0113-webhook-endpoint-reenable`.
  HEAD: `98cc3d3` (impl commit `d99d695` + PR-number-fixup commit
  `98cc3d3` backfilling `#168` into the implementer report and the
  Task 0112 spec proposal status flip to RESOLVED).
  Base: `aa13ba7` (Task 0112 verifier-PASS bookkeeping on top of
  `84093af` = PR #167 squash for Task 0112).
- **PR-CI on HEAD `98cc3d3`:** mergeStateStatus = `UNSTABLE` at scope
  time because the four `cloudflare-pages-turbo` / cloudflare-worker
  deploy-gated lanes are still IN_PROGRESS:
  `web-console-next · {dev,stage,prod} · Verify deploy` +
  `webhooks-worker · prod · Verify deploy`. The other 13/17 lanes are
  already SUCCESS (plan + contracts × 3 + db × 3 + db-tests · dev +
  sdk × 3 + api-edge-tests · dev + webhooks-worker · {dev,stage} ·
  Verify deploy). Verifier MUST wait for the four IN_PROGRESS lanes
  to land green before declaring Phase 5 pass; if any lane fails,
  Phase 5 = FAIL and the verifier reports blockers without merging.
  Mirror the Task 0112 verifier pattern: PR-CI ≠ deploy proof for
  cloudflare-pages-turbo / cloudflare-worker-turbo subscribers — the
  actual deploy + smoke fires on **post-merge main-CI**, per
  `references/post-merge-deploy-profile-gap.md`. You MUST wait for the
  post-merge main-CI run to complete and curl the live URLs (Console
  + webhooks-worker `/health`) before declaring PASS.
- **Implementer report:** `ai/reports/task-0113-implementer.md` on the
  PR branch with real PR number `#168` (no Task 0106-style fix-up
  needed). Spec proposal `ai/proposals/task-0112-spec-update.md`
  flipped to RESOLVED on the same branch.
- **Diff shape:** 15 files, +799/-15. Code-only delta spans:
  - `packages/contracts/src/webhooks.ts` (Enable* request/response).
  - `packages/sdk/src/webhooks.ts` + `packages/sdk/src/__tests__/resources.test.ts`.
  - `packages/db/src/webhooks/types.ts` + `packages/db/src/webhooks/repository.ts`.
  - `apps/webhooks-worker/src/handlers/webhook-endpoints.ts` +
    `apps/webhooks-worker/src/router.ts`.
  - `apps/web-console-next/src/app/(app)/orgs/[orgSlug]/webhooks/[endpointId]/page.tsx`.
  - `apps/web-console-next/src/components/webhooks/enable-endpoint-dialog.tsx` (NEW).
  - `apps/web-console-next/src/components/webhooks/endpoint-crud.ts` (notice-card
    pointer rewritten — no behaviour change).
  - `tests/api-edge/src/webhooks-facade.test.ts` (+1 matcher pin).
  - `tests/db/src/webhooks.test.ts` (+3).
  - `tests/webhooks-worker/src/webhooks-worker.test.ts` (+5 incl.
    static-source guard for `txExec` wiring).
  - `ai/reports/task-0113-implementer.md` (NEW) +
    `ai/proposals/task-0112-spec-update.md` (status flip).
  Net new passing tests on this branch: **+11** (≥ +6 floor).
- **Sealed snapshot main:** `aa13ba7` (Task 0112 verifier bookkeeping;
  the orchestrator scope commit for Task 0113 lives outside this PR
  and is committed directly to main alongside this verifier prompt).
- **Pre-existing failure (NOT introduced by 0113):**
  `tests/db/src/migrations.test.ts → "each migration declares a valid
  bounded context"` fails on `main` because `VALID_CONTEXTS` is
  missing `"notifications"`. Implementer report flags this and
  recommends a tiny follow-on PR (out of scope for verification of
  0113). Verifier MUST stash the diff, re-run the failing test on
  `aa13ba7`, confirm it fails identically, and document this as a
  pre-existing baseline issue rather than a 0113 regression.
- **Atomicity pattern (verifier code-path inspection target):** the
  worker handler `handleEnableWebhookEndpoint` mirrors the Task 0024
  pattern — both `createWebhookRepository(txExec)` and
  `createEventsRepository(txExec)` MUST be constructed from the same
  `txExec` inside `executor.transaction(async txExec => …)`; mutation
  failure short-circuits without event append; event-append failure
  throws inside the callback so `sql.begin` rolls back. Per
  `references/verifier-code-path-inspection.md`, you MUST read the
  changed handler file and confirm this wiring directly — unit tests
  exercise the dependency-injected sequential seam, the transactional
  seam is only validated by code reading + the static-source guard
  test the implementer added.
- **Repo health at scope time:** green; `main` HEAD `aa13ba7`; one
  open PR (#168, this task).

## Objective

Verify PR #168 — the webhook-endpoint re-enable vertical slice —
passes the Verifier Standard from `agents/orchestrator.md` (sections
349-392) AND the Verifier Merge Protocol AND the deploy-gated
post-merge live-URL probe per
`references/post-merge-deploy-profile-gap.md`. PASS → squash merge,
fast-forward main, post-merge main-CI watch, live-URL probes,
PASS-bookkeeping commit on main. FAIL → leave PR open with clear
blockers; FAIL-bookkeeping (PR comment + verifier report on PR
branch); no merge.

## PR Boundary (matches implementer)

- Symmetric `/enable` route across the full stack (contract → SDK →
  api-edge regex pin → worker route + handler → db repo → console
  button + dialog).
- Empty `EnableWebhookEndpointRequest` (forward-compat).
- Audit description `"Webhook endpoint re-enabled"`.
- Spec proposal `ai/proposals/task-0112-spec-update.md` flipped to
  **RESOLVED — implemented in Task 0113**.
- NO change to api-edge facade source (regex unchanged; new test
  pins the matcher invariant).
- NO CLI surface (intentionally deferred to a future fan-out PR).
- NO migration changes, NO `webhook_deliveries` schema touch, NO
  signing-secret rotation interaction, NO new feature flag.

## Read First

- `agents/orchestrator.md` — Verifier Standard + Verifier Merge
  Protocol (sections 349-392).
- `ai/tasks/task-0113.md` — implementer prompt (scope contract).
- `ai/reports/task-0113-implementer.md` — what was actually built.
- `ai/proposals/task-0112-spec-update.md` — must read RESOLVED on the
  PR branch.
- `ai/reports/task-0112-verifier.md` — prior-cycle shape and
  deploy-gated post-merge protocol exemplar.
- `references/post-merge-deploy-profile-gap.md` — MANDATORY for the
  cloudflare-pages-turbo + cloudflare-worker-turbo subscribers in
  this diff.
- `references/verifier-code-path-inspection.md` — atomicity inspection
  on the new tx callback.
- `specs/orun-golden-path.md`, `specs/access-and-infra.md`,
  relevant B5 spec entries under `specs/**`.
- PR #168 diff: `gh pr diff 168` and per-file `gh pr view 168`.
- CI logs: `gh run view <run-id> --log` per lane (NOT just
  `statusCheckRollup`).

## Required Outcomes

- [ ] Verifier report at `ai/reports/task-0113-verifier.md` with
  Result, Checks, Issues, CI Log Review, Live Resource Evidence,
  Secret Handling Review, Spec Proposals, Risk Notes, Recommended
  Next Move sections.
- [ ] If PASS: PR #168 squash-merged, branch deleted, local `main`
  fast-forwarded to the squash SHA, working tree clean, post-merge
  main-CI run captured (run id + lane conclusions + per-component
  smokeCommand evidence), live-URL probes captured (Console
  `/orgs/<test-org>/webhooks/<endpointId>` confirms working
  Re-enable button on a disabled endpoint OR confirms detail page
  loads and notice card no longer points at the spec proposal +
  webhooks-worker `/health` returns ok), bookkeeping commit on main
  updates `ai/state.json` (add `0113` to completed, clear
  `current_task`, refresh `last_verified` + notes), `ai/context/current.md`,
  and `ai/context/task-ledger.md`.
- [ ] If FAIL: PR remains open; verifier report on PR branch with
  blockers; PR comment summarizing blockers; NO merge; NO
  bookkeeping commit; no state-file mutation other than capturing
  the failed verification result.

## Verification (8-phase shape)

### Phase 0 — Working dir + readiness

- `gh pr checkout 168` into a clean working tree.
- Confirm `ai/reports/task-0113-implementer.md` is committed on the PR
  branch with real PR number `#168` (not `TBD`).
- Confirm `ai/proposals/task-0112-spec-update.md` reads
  **Status: RESOLVED — implemented in Task 0113**.
- `git status --short` clean.

### Phase 1 — PR sanity

- File list EXACTLY 15 paths matching the implementer report. No
  drift, no surprise files.
- Forbidden-zone scans (auto-FAIL on any hit):
  - `packages/cli/**` — CLI surface is out of scope.
  - `packages/db/src/migrations/**` — no migration changes.
  - `packages/db/src/webhooks/secrets/**` and any
    `secret_ciphertext` / `signing_secret` write path.
  - `apps/webhooks-worker/src/delivery.ts` — delivery loop is out
    of scope.
  - `apps/web-console-next/src/components/webhooks/rotate-*.tsx` and
    `rotate-flow.ts` — rotate UX is sealed by Tasks 0108-0110.
  - `apps/web-console-next/src/components/webhooks/disable-*.tsx`,
    `delete-*.tsx`, `create-*.tsx`, `edit-*.tsx` — Task 0112 surface
    is sealed; only `endpoint-crud.ts` may be touched and only for
    the notice-card pointer rewrite (no behaviour change).
  - `apps/web-console-next/src/components/ui/**`, `**/shell/**`.
  - `apps/api-edge/src/webhooks-facade.ts` source itself MUST be
    untouched (only the matching test in `tests/api-edge/` may add
    a case).
  - `infra/tooling/stack-tectonic/**`, `kiox.lock`,
    `pnpm-lock.yaml`, root `package.json`.
- `gh pr view 168 --json mergeable,mergeStateStatus` →
  `mergeable: MERGEABLE`. `mergeStateStatus` should be `CLEAN`
  before merge — if `BEHIND`, run `gh pr update-branch 168` and
  re-watch CI on the rebased HEAD (recurring 0103-0112 pattern).

### Phase 2 — Hazard scan + behaviour audit + code-path inspection

Hazard scan over the 15-file diff:

- Zero new `eslint-disable`, `@ts-ignore`, `@ts-expect-error`,
  `as any`, `as unknown as` in production source. Existing
  StdinLike-style boundary casts elsewhere in the repo are not
  expanded by this diff.
- `apps/webhooks-worker/src/handlers/webhook-endpoints.ts` — the
  new `handleEnableWebhookEndpoint`:
  - opens `executor.transaction(async (txExec) => …)`.
  - constructs **both**
    `createWebhookRepository(txExec)` and
    `createEventsRepository(txExec)` from the SAME `txExec`
    inside the callback.
  - mutation failure returns/short-circuits **without** reaching
    the events `append`.
  - events-append failure `throws` inside the callback (so
    `sql.begin` rolls the row update back).
  - audit description matches `/re-enabled/i`.
  - non-tx fallback path is gated behind injected `deps` (test
    seam only — production always has `executor.transaction`).
- `packages/db/src/webhooks/repository.ts` — the new
  `enableEndpoint(orgId, endpointId)`:
  - `UPDATE … SET status = 'active', disabled_reason = NULL,
    disabled_at = NULL, updated_at = now() WHERE org_id = $1 AND
    id = $2 AND status = 'disabled' RETURNING ${ENDPOINT_SAFE_COLUMNS}`.
  - 0 rowCount → `not_found` envelope (covers both missing AND
    already-active endpoints — `pending` is intentionally excluded).
  - RETURNING does NOT include `secret_ciphertext` (must use
    `ENDPOINT_SAFE_COLUMNS`).
- `packages/contracts/src/webhooks.ts` — `EnableWebhookEndpointRequest`
  is empty (`interface … {}`), `EnableWebhookEndpointResponse` is
  envelope-only (no leaked secret fields).
- `packages/sdk/src/webhooks.ts` — `enableEndpoint` posts to
  `/v1/organizations/:orgId/webhooks/endpoints/:endpointId/enable`,
  forwards `RequestOptions.idempotencyKey`, surfaces 404 as
  `NotFoundError`. No new transport branch.
- `apps/web-console-next/src/components/webhooks/enable-endpoint-dialog.tsx`
  — uses `useSession().client.webhooks.enableEndpoint` via
  `wrap(...)`; mounts `<PreconditionInsight />` on
  `precondition_failed`; toast on other errors. No raw `fetch(`,
  no manual header building.
- `apps/web-console-next/src/app/(app)/orgs/[orgSlug]/webhooks/[endpointId]/page.tsx`
  — Re-enable button is rendered IFF `isDisabled`; the inline
  notice card no longer points at `/ai/proposals/task-0112-spec-update.md`.
  No re-enable button rendered for `pending` or `active` endpoints.
- Signing-secret leak scan over the full diff:
  `rg -n 'whsec_|signingSecret|secret_ciphertext|response\.secret|endpoint\.secret'`
  returns ZERO hits in any console or worker source path
  (documentation comments allowed; rendering paths NOT allowed).

### Phase 3 — Quality gates (local)

- `pnpm install --frozen-lockfile` clean (Scope: 40 workspaces; no
  drift vs main's 40 — no new package added).
- `pnpm -w typecheck` 44/44 success (FULL TURBO acceptable).
- `pnpm -w lint` 37/37 success.
- `pnpm -w test`:
  - All targeted suites green: `tests/db`, `tests/webhooks-worker`,
    `tests/api-edge`, `packages/sdk`.
  - `tests/db/src/migrations.test.ts → notifications context`
    failure expected; verifier stashes the diff, runs the same
    test on `aa13ba7`, confirms identical failure → documented
    as pre-existing baseline (NOT a 0113 regression).
  - Net new passing tests across the 0113 surface ≥ **+11**
    (target floor is ≥ +6 from prompt; report claims 11).

### Phase 4 — Orun gates (local)

- `kiox -- orun validate --intent intent.yaml` → ✓.
- `kiox -- orun plan --changed --intent intent.yaml --output plan.json`
  selects ONLY: `api-edge-tests`, `contracts`, `db`, `db-tests`,
  `sdk`, `web-console-next`, `webhooks-worker`. **No** unrelated
  drag-in (events-worker, identity, billing, notifications,
  api-edge source itself, infra/terraform/* etc. must NOT appear).
  Total job count = 17 (7 components × env mix per the implementer
  report).
- `kiox -- orun run --plan plan.json --dry-run --runner github-actions`
  → 17/17 ✓.

### Phase 5 — PR-CI per-lane log evidence

- Wait for the four currently-IN_PROGRESS deploy-gated lanes
  (`web-console-next · {dev,stage,prod} · Verify deploy` +
  `webhooks-worker · prod · Verify deploy`) to complete. Use
  `gh pr checks 168 --watch` or repeated `gh run view <id>`.
- Final PR-CI on HEAD `98cc3d3` (or rebased HEAD if `gh pr update-branch`
  fired) MUST be **17/17 SUCCESS**. Any FAIL → Phase 5 FAIL, no
  merge, document in verifier report.
- For each of the 17 lanes, run `gh run view <run-id> --log` (NOT
  just `statusCheckRollup`) and confirm the actual verify steps
  ran — typecheck, lint, build, test (where applicable), or for
  deploy lanes the `verify deploy` profile composition. Record
  one representative log line per lane in the verifier report.
- If `mergeStateStatus` flips to `BEHIND` between scope and execution,
  run `gh pr update-branch 168` and re-watch CI on the rebased HEAD
  before merging (recurring 0103-0112 pattern).

### Phase 6 — Squash merge

- `gh pr merge 168 --squash --delete-branch --admin` (mirror prior
  cycles).
- Capture squash SHA from `gh pr view 168 --json mergeCommit,mergedAt`.
- `git checkout main && git pull --ff-only origin main`.
- `git status --short` must be clean post-merge (orchestrator
  bookkeeping for the verifier scope commit lives on main directly,
  not on the impl PR).

### Phase 6.5 — MANDATORY post-merge main-CI watch + live-URL probe

This is the deploy-gated half of `references/post-merge-deploy-profile-gap.md`.
PR-CI proves only `verify`. Deploy + smoke fire on the post-merge
main-CI run.

- `gh run watch <main-ci-run-id>` until the post-merge main-CI run at
  the squash SHA completes. Expect ≥ 17 lanes (same component
  selection as PR-CI; the `verify` profile maps to `verify deploy`
  for cloudflare-pages-turbo / cloudflare-worker-turbo subscribers).
- Required GREEN lanes: `web-console-next · {dev,stage,prod} ·
  Verify deploy` (each contains a per-component `smokeCommand`
  curling `${DEPLOYED_URL}/` + grepping `Sourceplane Console`) AND
  `webhooks-worker · {dev,stage,prod} · Verify deploy` (each
  smoke-curls `/health`).
- Live-URL probes from the verifier shell:
  - `curl -sS -o /dev/null -w '%{http_code}\n' https://stage.sourceplane.ai/orgs`
    → `200`.
  - `curl -sS https://stage.sourceplane.ai/orgs | rg -c '<title>Sourceplane Console</title>'`
    → ≥ 1.
  - `curl -sS https://stage.sourceplane.ai/orgs/test/webhooks` →
    HTTP 200, contains `<title>Sourceplane Console</title>`,
    DOES NOT contain `"Use the API or CLI to create one"`
    (Task 0112 carry-forward sanity), DOES NOT contain
    `/ai/proposals/task-0112-spec-update.md` (Task 0113 carry-forward
    sanity — notice card pointer is rewritten).
  - webhooks-worker `/health` curl per env tier (stage at minimum;
    prod if tier is configured) → `ok`-shaped JSON.
- If the live URL serves a white page, missing title, or 404 on a
  route that PR-CI accepted, this is the **OpenNext / Cloudflare
  pages deployment-shape** class regression (see
  `references/opennext-cloudflare-pages-deployment-shape.md`) — Phase
  6.5 = FAIL even if all lanes are green; revert or hold for hotfix.

### Phase 7 — Verifier report

Write `ai/reports/task-0113-verifier.md` with mandatory sections:

- **Result:** `PASS` or `FAIL`.
- **Checks:** numbered list of every Phase 0-6.5 step run, with the
  exact command and observed result.
- **Issues:** any blockers found (FAIL only) OR explicitly “none”.
- **CI Log Review:** PR-CI run id + per-lane conclusions; post-merge
  main-CI run id + per-lane conclusions + smokeCommand outputs.
- **Live Resource Evidence:** curl outputs (status code + title
  presence + absence of carry-forward strings) for the Console URLs
  and webhooks-worker `/health`.
- **Secret Handling Review:** signing-secret scan result.
- **Spec Proposals:** confirm `ai/proposals/task-0112-spec-update.md`
  is RESOLVED on main post-merge; flag any new proposals (none
  expected).
- **Risk Notes:** the pre-existing `notifications` migration test
  failure (recommend a tiny follow-on PR adding `"notifications"`
  to `VALID_CONTEXTS`).
- **Recommended Next Move:** orchestrator candidate slate —
  CLI `sourceplane webhooks endpoints enable` (mirrors the SDK
  consumer cadence), Console delivery-attempts UX, B7 audit-log
  UX, B8 admin-worker scaffold, OR the `cross-reads.ts:resolveOrgId`
  housekeeping fold (Task 0111 verifier-flagged Remaining Gap).

### Phase 8 — Bookkeeping (PASS path only)

- `git checkout main && git pull --ff-only origin main`.
- Update `ai/state.json`: append `"0113"` to `completed`, set
  `current_task: null`, set `task_agent: "ai/reports/task-0113-verifier.md"`,
  refresh `last_verified` to current ISO timestamp, append a notes
  bullet summarizing the 0113 verification outcome (PR/squash SHA,
  PR-CI + main-CI run ids, live-URL evidence, recommended-next).
- Update `ai/context/current.md`: replace the Task 0113 active-task
  block with a "Just-merged — 0113" block and a refreshed
  Recommended Next Move.
- Append a `## Task 0113` entry to `ai/context/task-ledger.md`.
- Commit on main:
  `git add ai/state.json ai/context/current.md ai/context/task-ledger.md ai/reports/task-0113-verifier.md`
  `git commit -m "chore(ai): close Task 0113 verifier (PR #168 squashed as <sha>)"`
  `git push origin main`.

### FAIL bookkeeping (FAIL path only)

- Verifier report committed on PR branch (NOT main), summarizing
  blockers.
- PR comment via `gh pr comment 168 --body-file ai/reports/task-0113-verifier.md`.
- Do NOT update `ai/state.json` `completed` list. Do NOT merge.
- Do NOT modify `ai/context/current.md` beyond noting the FAIL
  outcome (only if the orchestrator already requested it; default
  is to leave `current.md` untouched on FAIL).

## Acceptance Criteria

✅ PR #168 corresponds exactly to Task 0113 — 15 files, +799/-15,
   no scope drift, no forbidden-zone hits.
✅ Hazard scan clean (zero new ts-ignore/eslint-disable/as any/as
   unknown as in production source; signing-secret scan zero hits).
✅ Code-path inspection confirms transactional atomicity in
   `handleEnableWebhookEndpoint` (both repos from same `txExec`,
   throw-to-rollback on event-append failure).
✅ DB repo SQL matches the prompt exactly (status flip + nulls
   + `WHERE status='disabled'` guard + ENDPOINT_SAFE_COLUMNS).
✅ Local quality gates green: typecheck 44/44, lint 37/37, target
   suites green, ≥ +11 net new passing tests, pre-existing
   `notifications` migration failure documented as baseline.
✅ Orun gates green: validate ✓, plan --changed selects ONLY the 7
   in-scope components, dry-run 17/17 ✓.
✅ PR-CI 17/17 SUCCESS at final HEAD with per-lane log evidence
   captured.
✅ MergeStateStatus CLEAN at merge time; squash merge succeeds with
   branch deletion.
✅ Post-merge main-CI 17/17 SUCCESS with smokeCommand outputs
   captured per deploy lane (web-console-next ×3, webhooks-worker ×3).
✅ Live-URL probes confirm: stage Console `/orgs` and
   `/orgs/test/webhooks` HTTP 200 with Sourceplane Console title,
   notice-card pointer NOT containing the spec-proposal path;
   webhooks-worker `/health` ok across configured envs.
✅ Spec proposal `ai/proposals/task-0112-spec-update.md` reads
   RESOLVED on main post-merge.
✅ Bookkeeping commit on main updates state.json + current.md +
   task-ledger.md + verifier report; working tree clean post-commit.

If ANY criterion fails → Result: FAIL, PR remains open with
documented blockers, no merge.

## PR Creation Requirement

The Implementer has already created PR #168. Your job is to verify
it. No new PR is required for the verifier pass; the verifier
report and bookkeeping commit land directly on `main`.

## When Done Report

Report: `ai/reports/task-0113-verifier.md`

Mandatory sections (per Verifier Standard): Result · Checks ·
Issues · CI Log Review · Live Resource Evidence · Secret Handling
Review · Spec Proposals · Risk Notes · Recommended Next Move.
