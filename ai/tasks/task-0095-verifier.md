# Task 0095 — Verifier

Agent: Verifier

## Current Repo Context

The Implementer for Task 0095 ("Edge idempotency replay store, B3 partial")
has finished. PR **#143** (`impl/task-0095-edge-idempotency-replay-store`)
is OPEN, `mergeable: MERGEABLE`, `mergeStateStatus: CLEAN`. PR-CI rollup is
7/7 SUCCESS at the time of scoping (run id `26672319378`):

- `plan` ✓
- `api-edge · {dev,stage,prod} · Verify deploy` ✓
- `api-edge-tests · dev · Verify` ✓
- `cloudflare-kv · {stage,prod} · Terraform` ✓ (the new slice)

Implementer report: `ai/reports/task-0095-implementer.md`. Original prompt:
`ai/tasks/task-0095.md`. Diff is 22 files, +2,171 / −353; key surfaces:

- New Terraform slice `infra/terraform/cloudflare-kv/` (component.yaml,
  main.tf with `cloudflare_workers_kv_namespace.idempotency` keyed by
  `var.environment` ∈ {stage,prod}, backend.tf, README, lock).
- Extended `apps/api-edge/src/idempotency.ts` with `replayOrExecute(...)`
  (24h TTL, identity-agnostic key, 4xx cached / 5xx not, GET passthrough,
  KV-missing degrades open).
- All seven facades (`auth`, `billing`, `config`, `metering`, `org`,
  `project`, `webhooks`) migrated from `validateIdempotencyKey` to
  `replayOrExecute` at the same call site.
- `apps/api-edge/wrangler.jsonc` gains `kv_namespaces` under `env.stage`
  and `env.prod` (NOT `env.dev`). **Implementer recorded namespace IDs as
  placeholders** (`0000…000a` / `…000b`) "to be replaced post-terraform-apply
  by the deploy pipeline." This is a Constraint-adjacent risk you must
  inspect carefully — see Verification below.
- New tests: `tests/api-edge/src/idempotency-replay.test.ts` (12 cases).

Repo health: green. Console live on `https://{stage,prod}.sourceplane.ai`
(307 → /orgs). Cloudflare provider pin holds at `~> 4.52`. Deferred
boundaries (`infra/terraform/cloudflare-domain/**`, the cloudflare 4.52
pin, `apps/notifications-worker/**`, `apps/web-console-next/**`,
`tooling/eslint/index.js`, `pnpm-lock.yaml`, all non-`@saas/contracts`
`package.json`) must remain untouched.

## Objective

Independently verify that PR #143 ships a Stripe-quality durable idempotency
replay store at `api-edge` matching Task 0095's acceptance criteria, that
the new `cloudflare-kv` slice is real (Terraform-owned, observable resource
state), that the `wrangler.jsonc` placeholder-ID strategy actually resolves
to real namespace IDs at deploy time, and that nothing leaks into deferred
boundaries. PASS or FAIL with explicit live evidence on stage. Merge on
PASS; leave open on FAIL.

## PR Boundary

Same boundary as Task 0095. No scope expansion permitted at verification.

## Read First

- `agents/orchestrator.md` § Verifier Standard, § Verifier Merge Protocol
- `ai/tasks/task-0095.md` (the implementer prompt — acceptance + constraints
  are quoted there verbatim)
- `ai/reports/task-0095-implementer.md`
- `ai/context/open-risks.md` lines 83–91 (the open risk this PR is closing)
- PR #143 full diff
- `apps/api-edge/src/idempotency.ts` (the seam)
- `apps/api-edge/wrangler.jsonc` (placeholder-ID question)
- `infra/terraform/cloudflare-kv/**`
- `infra/terraform/cloudflare-hyperdrive/**` (pattern template the new
  slice should mirror)
- `specs/access-and-infra.md`, `specs/orun-golden-path.md`,
  `specs/roadmap.md` § B3

## Required Outcomes

A `Result: PASS` or `Result: FAIL` written to
`ai/reports/task-0095-verifier.md`, with concrete evidence in each section
below. PASS additionally requires:

- PR merged via squash; local `main` fast-forwarded to `origin/main`;
  branch deleted; `git status --short` clean.
- `ai/state.json` updated (Task 0095 added to `completed`, `current_task`
  advanced, notes describe outcome, `task_agent` points to the verifier
  report, `last_verified` updated).
- `ai/context/current.md` updated to reflect closure.
- `ai/context/task-ledger.md` appended with the Task 0095 entry.
- `ai/context/open-risks.md` lines 83–91: confirm the implementer (or you)
  marked the durable-replay risk **closed** and moved it under
  "Resolved Risks". The implementer report claims the gap is closed but
  the PR diff does NOT include `ai/context/open-risks.md` modifications —
  you must either commit the open-risks update on the PR branch before
  merge, or commit it directly to main as a verifier artifact post-merge.
  Pick one explicitly and document.

## Non-Goals

- Re-litigating implementer design choices that fall under the Architect
  Brief's "Free to make" list (KV key encoding, envelope shape, header
  allow-list, org-scope source). Verify they hold to the listed Constraints
  and failure modes; do not push for a different shape on taste.
- Provisioning a dev KV namespace (deferred — `env.dev` is verify-only).
- Rate-limiting half of B3 (becomes the next implementer task).

## Constraints

1. PASS requires live duplicate-POST replay evidence on `api-edge` stage
   (and a smoke check on prod). PR-CI alone is **not sufficient** —
   `api-edge` is a deploy-gated component and per the
   post-merge-deploy-profile-gap rule the deploy + smoke flow runs on the
   post-merge main-CI run, not on the PR's `verify` profile.
2. Wait for the post-merge main-CI run to complete and inspect the
   `api-edge · {stage,prod} · Verify deploy` and
   `cloudflare-kv · {stage,prod} · Terraform` jobs in detail (logs, not
   just status).
3. Inspect `wrangler.jsonc` placeholder-ID handling: confirm there is a
   real CI step that substitutes the placeholders with Terraform-output
   namespace IDs before `wrangler deploy` runs, OR confirm the placeholders
   ARE the real IDs (matching `terraform output` for the
   cloudflare-kv-{stage,prod} slice). If neither holds, the binding is
   broken in production and this is a FAIL — the worker would deploy with
   a non-existent KV namespace ID and replay would silently degrade-open
   forever.
4. Run `wrangler kv namespace list` against the relevant Cloudflare account
   and match IDs to Terraform state for both stage and prod.
5. Diff must contain zero `+eslint-disable*`, `+@ts-ignore`,
   `+@ts-expect-error`, or `+as any` source additions. (Test files are
   allowed mild casts only if narrow and justified.)
6. Confirm deferred boundaries intact (paths listed in Current Repo
   Context above). Run a path-grep against the diff.
7. KV-failure path inspection: read `replayOrExecute` end-to-end and
   confirm a `kv.put` throw, `kv.get` throw, or missing `IDEMPOTENCY_KV`
   binding all fall through to "execute downstream once, no replay" —
   never 5xx the request. Stripe-quality fail-open is mandatory.

## Verification (Steps)

Run in order:

1. **Repo state.** `git fetch origin && git checkout main && git status --short`.
   Expect clean. `git log --oneline -3`.

2. **PR sanity.** `gh pr view 143 --json title,headRefName,state,mergeable,mergeStateStatus,statusCheckRollup`.
   Confirm 7/7 SUCCESS, MERGEABLE, CLEAN.

3. **Diff scan.**
   - `gh pr diff 143 | grep -E '^\+\s*(// eslint-disable|@ts-ignore|@ts-expect-error|as any\b)' || echo CLEAN`
   - `gh pr diff 143 --name-only` — confirm no paths under
     `infra/terraform/cloudflare-domain/`, `apps/notifications-worker/`,
     `apps/web-console-next/`, `tooling/eslint/`, `pnpm-lock.yaml`, or any
     non-`@saas/contracts` `package.json`.

4. **Local install + gates.**
   - `gh pr checkout 143`
   - `pnpm install --frozen-lockfile` → 0
   - `pnpm -r typecheck` → 0
   - `pnpm -r --no-bail lint` → 0
   - `pnpm --filter @saas/api-edge-tests test` → all green; replay suite
     12/12 included; total ≥ 282
   - `pnpm --filter @saas/contracts-tests test` if any contracts changes,
     else skip
   - `terraform -chdir=infra/terraform/cloudflare-kv/terraform fmt -check` → clean
   - `terraform -chdir=infra/terraform/cloudflare-kv/terraform init -backend=false -input=false`
     (provider install may fail locally; if it does, document and rely on
     CI's `cloudflare-kv · {stage,prod} · Terraform` jobs as authoritative)
   - `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml` → ✓
   - `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json` → ✓; plan must include `cloudflare-kv.{stage,prod}.terraform` and the api-edge verify-deploy jobs
   - `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions` → ✓

5. **Code-path inspection of `replayOrExecute`.**
   - Read `apps/api-edge/src/idempotency.ts` end to end.
   - Confirm: validation gate fires before any KV touch on unsafe POST
     with a present-but-malformed key (Task 0094 contract preserved).
   - Confirm: GET / safe methods short-circuit before any KV touch.
   - Confirm: absent header on unsafe POST does NOT write to KV and does
     NOT cache.
   - Confirm: KV `get` throw / `put` throw / missing binding all degrade
     open (downstream executed exactly once, no cache write, no 5xx).
   - Confirm: cache hit returns the stored envelope without invoking
     `resolveActor` or any downstream fetch.
   - Confirm: 4xx responses ARE cached, 5xx responses are NOT cached.
   - Confirm: scoping key includes (orgId-or-anon, key, routePath) — a
     same-key collision across orgs or routes does NOT replay.

6. **Wrangler binding inspection (CRITICAL).**
   - Open `apps/api-edge/wrangler.jsonc`. Note the placeholder IDs under
     `env.stage` and `env.prod`.
   - Search the repo for any deploy-time substitution mechanism:
     `search_files` for `IDEMPOTENCY_KV` and `kv_namespaces` across
     `infra/`, `.github/`, `apps/api-edge/`, and any deploy script paths
     surfaced by `intent.yaml` / `component.yaml`.
   - Inspect the post-merge main-CI logs for the
     `api-edge · {stage,prod} · Verify deploy` jobs: confirm the
     `wrangler deploy` step references a real KV namespace ID (not the
     placeholder string). If the build-time substitution is real, capture
     the exact step and the resolved ID. If it is NOT real, FAIL the PR
     and document — Stripe-quality replay cannot ship with a dangling
     binding.
   - If the placeholders ARE the real IDs (i.e. implementer hardcoded
     post-apply values into wrangler.jsonc), match them against
     `terraform output` and `wrangler kv namespace list`. Hardcoding is
     acceptable only if the IDs are real and Terraform-owned.

7. **Live evidence on stage (Stripe-quality replay).**

   Pick a benign authenticated POST route the verifier can exercise (e.g.
   `POST /v1/organizations/{orgId}/invitations` against a stage-test org,
   or any POST surface the verifier deems safe to re-run). Use a UUID v4
   as `Idempotency-Key`. Capture for each case: HTTP status, `x-saas-*`
   headers, response body, AND a downstream-side observation (worker log
   line, DB row count delta, or queue-message count delta — pick one
   stable channel) that proves whether the downstream fired or not.

   Required cases on stage:

   a. Same key, same route, same org, twice → second response IDENTICAL
      to first; downstream observed exactly **once**. Capture the
      response-replay header (the implementer report mentions a header
      like `x-saas-replay-source: edge-idempotency`, which suggests a
      hint header — confirm whatever marker the implementer chose is
      present on the replay).

   b. Different key, same route, same org → downstream fires both times.

   c. Same key, **different route**, same org → downstream fires both
      times (route-scope isolation).

   d. Same key, same route, **different org** → downstream fires both
      times (org-scope isolation). Pick a second test org you control.

   e. GET on a safe route with the same `Idempotency-Key` → no cache
      effect, downstream behaves normally on subsequent identical GET.

   f. Header absent on POST → downstream fires; second identical POST
      ALSO fires (no implicit caching).

   g. Malformed header on POST (e.g. `Idempotency-Key;` empty) → 400
      `validation_failed reason=empty` (Task 0094 contract preserved end
      to end).

   At minimum case (a), one of (b/c/d), and (g) must also be smoke-checked
   on **prod** — pick the lowest-risk surface available. Document the
   choice.

8. **KV resource verification.**
   - `wrangler kv namespace list` against the stage account → expect
     `api-edge-idempotency-stage` (or whatever name `main.tf` declares).
   - Same for prod. Match IDs to Terraform state.
   - Sanity-read one freshly-written replay key from KV (e.g. via
     `wrangler kv key get --namespace-id=<id> "<key>"`) right after
     reproducing case (a) — confirm the envelope is well-formed JSON
     with the `v: 1` shape and a sane TTL.

9. **Console smoke.**
   - `curl -sI https://stage.sourceplane.ai/ | head -3` → `HTTP/2 307`,
     `location: /orgs`.
   - Same on prod. Confirm console untouched.

10. **Open-risks update.**
    - Re-read `ai/context/open-risks.md` lines 83–91. Confirm the durable
      replay risk is now marked closed and moved (or annotated) under
      "Resolved Risks". If the implementer omitted this from the PR diff
      (it appears to be missing), commit the update directly to main as
      a verifier artifact post-merge alongside the verifier report and
      state-file updates.

11. **Decision and merge.**
    - PASS path: `gh pr merge 143 --squash --delete-branch`. Then
      `git checkout main && git pull --ff-only origin main`. Wait for the
      post-merge main-CI run to complete; inspect logs (not just status)
      for all relevant Verify-deploy and Terraform jobs. If the post-merge
      run regresses, revert your PASS decision via the verifier report
      and document. After post-merge live verification (steps 7+8
      repeated against the merged commit on stage and prod, OR confirmed
      identical to PR-time evidence because the deploy hash matches),
      commit the verifier report + state-file updates +
      `ai/context/open-risks.md` update directly to main (or via a small
      verifier follow-up PR if main is protected — match the Task 0094
      precedent).
    - FAIL path: leave PR open. Document blockers explicitly in the
      verifier report. Do not merge.

## Acceptance Criteria

✅ PR #143 corresponds exactly to Task 0095 — no scope drift, no deferred
boundary violations, no unrelated refactors.
✅ Diff contains zero `+eslint-disable*`, `+@ts-ignore`,
`+@ts-expect-error`, `+as any` source additions.
✅ All gates green locally and on PR-CI: `pnpm install --frozen-lockfile`,
`pnpm -r typecheck`, `pnpm -r --no-bail lint`,
`pnpm --filter @saas/api-edge-tests test`, kiox/orun triple.
✅ `cloudflare-kv` Terraform slice mirrors the `cloudflare-hyperdrive`
posture (backend, provider pin `~> 4.52`, no inline secrets,
sensitive outputs).
✅ Wrangler `IDEMPOTENCY_KV` binding resolves to a real Terraform-owned
namespace ID at deploy time (substitution mechanism documented OR IDs
match `terraform output` directly).
✅ `wrangler kv namespace list` shows both namespaces in stage and prod.
✅ Live duplicate-POST replay evidence on stage covers cases (a)–(g);
prod smoke covers (a) + one isolation case + (g).
✅ KV-failure / KV-missing path provably degrades open (no 5xx).
✅ Cache-hit short-circuits before `resolveActor`; cache-miss writes
exactly once with 24h TTL; 4xx cached, 5xx not cached.
✅ Post-merge main-CI: 100% required-jobs SUCCESS, including
`api-edge · {stage,prod} · Verify deploy` and
`cloudflare-kv · {stage,prod} · Terraform`.
✅ Console `/` → 307 `/orgs` unchanged on stage + prod.
✅ Open-risks lines 83–91 marked closed (Resolved Risks section).
✅ State files updated (`ai/state.json`, `ai/context/current.md`,
`ai/context/task-ledger.md`); local `main` clean and synced.

## PR Creation Requirement

The Implementer has already created PR #143. The Verifier's job is to
verify and merge (or leave open on FAIL). If a verifier-only fix is
required (e.g. open-risks closure commit, a small doc nit), commit it to
the PR branch and re-await CI before merging — do not bundle implementer
scope changes.

## When Done Report

Write `ai/reports/task-0095-verifier.md` with mandatory sections:

- `Result: PASS` or `Result: FAIL`
- `Checks` — every command run + result
- `Issues` — blockers (FAIL) or non-blocking concerns (PASS)
- `CI Log Review` — PR-CI run id + post-merge main-CI run id, jobs
  inspected, any noteworthy log lines
- `Live Resource Evidence` — the exact request/response/headers/downstream
  observations for cases (a)–(g) on stage and the (a/isolation/g) smoke
  on prod; KV namespace IDs from `wrangler kv namespace list`
- `Wrangler Binding Resolution` — explicit answer to "how do the
  placeholder IDs in `wrangler.jsonc` become real namespace IDs in
  production?"
- `Secret Handling Review` — confirmation that no plaintext tokens, KV
  values containing auth headers, etc., leak in source / report / logs
- `Spec Proposals` — links + one-line reason; none expected
- `Risk Notes` — residual risks (e.g. 4xx caching of secrets-rotate
  failures noted by the implementer)
- `Recommended Next Move` — Task 0096 (rate-limiting half of B3, can
  reuse the cloudflare-kv slice) is the strongest next candidate; or a
  class-B `no-explicit-any` cleanup wave as filler
