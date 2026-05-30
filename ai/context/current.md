# Current Context

Last updated: 2026-05-30 (Track B (Task 0096) CLOSED — verifier PASS,
PR #144 squash-merged at `e9e432b`, post-merge main-CI `26675733754`
10/10 SUCCESS, console smoke unchanged. Track A (Task 0095.1) still
waiting on implementer fix-up commits to PR #143; head still
`db00843`, mergeStateStatus DIRTY/CONFLICTING vs main — rebase is
implementer's job before fix-ups land. Repo health: green; PR #143 is
the single open PR; main @ `e9e432b`.)

## Active task — Task 0095.1 (verifier resumption staged on PR #143)

The verifier ran on PR #143 today and returned **FAIL** with a single,
specific Phase-5 blocker. Phases 1–4 PASSED (code path correct, 282/282
api-edge-tests green, terraform fmt/validate clean, zero
`eslint-disable` / `@ts-ignore` / boundary breaches). Phases 6–10
(merge, post-merge CI, live stage/prod evidence, KV resource verify,
open-risks closure, state files) are gated by Phase 5 and were not run.

### The Phase-5 blocker (verbatim from `ai/reports/task-0095-verifier.md`)

`apps/api-edge/wrangler.jsonc` declares:

```jsonc
"env": {
  "stage": { "kv_namespaces": [{ "binding": "IDEMPOTENCY_KV",
    "id": "0000000000000000000000000000000a" }] },
  "prod":  { "kv_namespaces": [{ "binding": "IDEMPOTENCY_KV",
    "id": "0000000000000000000000000000000b" }] }
}
```

These are sentinel placeholder IDs. **No substitution mechanism exists
anywhere in the deploy plumbing** — `.github/workflows/ci.yml`, the
`stack-tectonic` `cloudflare-worker-turbo-verify-deploy` composition,
`apps/api-edge/component.yaml`'s `preDeployCommand` (set to a no-op
echo), and `apps/api-edge/scripts/verify-bindings.mjs` (validates only
Hyperdrive + Service bindings — does not even know `IDEMPOTENCY_KV`
exists) were all checked. The Terraform output
`api_edge_idempotency_kv_id` is emitted but never consumed.

**Consequence if merged as-is:** post-merge main-CI either rejects the
deploy outright with "KV namespace not found", or — worse — succeeds
with a phantom binding. Every replay `kv.get` / `kv.put` then throws,
the `logKvFailure` catch-all degrades open, and **the entire B3 replay
store is silently inert in production** while tests and dashboards
report green. The deferred-path failure mode the verifier skill is
explicitly designed to catch.

### Task 0095.1 fix-up shape (suggested, mirrors existing repo precedent)

Per `agents/orchestrator.md` § PR-Sized Task Standard ("Fixes requested
by verification stay in the same PR when they are required to complete
the task"), Task 0095.1 is **NOT a new PR**. It is an additional commit
(or two) on `impl/task-0095-edge-idempotency-replay-store` so PR #143
becomes mergeable.

The repo precedent is already in the same `wrangler.jsonc`: real
Hyperdrive namespace IDs are hardcoded for stage and prod and
`verify-bindings.mjs` asserts them. Mirror that pattern for KV:

1. Apply the new `cloudflare-kv` Terraform slice on stage + prod ONCE
   (via main-CI on a small no-op trigger, or via a manual apply through
   the `aws-admin`-managed role path — implementer's call, document
   which).
2. Replace the sentinels in `apps/api-edge/wrangler.jsonc` with the
   real 32-char hex namespace IDs.
3. Extend `apps/api-edge/scripts/verify-bindings.mjs` with an
   `EXPECTED_KV` block (binding `IDEMPOTENCY_KV`, ID matches
   `^[0-9a-f]{32}$`, ID is NOT `…000a` / `…000b`).
4. Commit `ai/context/open-risks.md` lines 83–91 closure under
   "Resolved Risks" (the implementer claimed this in the report but
   omitted the file from the original diff).
5. Optional CI guard: fail the verify-bindings script if `wrangler.jsonc`
   ever again contains the sentinel strings.

**Sealed (must not change in 0095.1):**
`apps/api-edge/src/idempotency.ts`, `apps/api-edge/src/env.ts`, and the
seven facade call sites — verifier Phase-4 explicitly PASSED these.
Touching them re-opens the entire code path review.

Prompt: `ai/tasks/task-0095.1.md`. Branch:
`impl/task-0095-edge-idempotency-replay-store` (existing, head still
`db00843`, currently CONFLICTING vs main — rebase before fix-ups).

## Verifier re-run plan after Task 0095.1

The verifier resumption is **scoped as a dedicated prompt** at
`ai/tasks/task-0095.1-verifier.md`. It does NOT redo Phases 1–4 (those
are sealed: code path PASS, 282/282 tests, hazard scan clean,
terraform validate green) — only delta-scans the 0095.1 commits
against `e47248e` (the prior verifier head). It then runs:

- **Phase 5-delta** — real 32-char hex KV IDs in `wrangler.jsonc` for
  stage AND prod, `verify-bindings.mjs` extended with an
  `EXPECTED_KV` block mirroring `EXPECTED_HYPERDRIVE`, local script
  exits 0.
- **Phase 2-delta** — `git diff e47248e..HEAD --name-only` shows ONLY
  IN-scope paths; zero `+eslint-disable*` / `+@ts-ignore` / `+as any`
  in the new diff; sealed Phase-4 source files untouched.
- **Phase 3-delta** — typecheck / lint / 282 tests / terraform fmt
  + validate / `kiox -- orun validate-plan-dry-run` all green.
- **Phase 6** — squash-merge PR #143, fast-forward `main`, delete
  branch at the remote.
- **Phase 7** — post-merge main-CI watch with deploy-log inspection
  (per `references/post-merge-deploy-profile-gap.md`), plus
  `wrangler kv namespace list` direct provider verification —
  non-negotiable, because the deferred-path failure mode is exactly
  a phantom binding that succeeds at deploy time but throws on first
  KV op. Only provider-side verification catches it.
- **Phase 8** — live cases (a)–(g) on stage + (a)/(isolation)/(g) on
  prod, including KV isolation between stage and prod namespaces;
  console smoke (307 → `/orgs`) on stage + prod unchanged.
- **Phase 9** — `open-risks.md` lines 83–91 closed under "Resolved
  Risks", state files updated.
- **Phase 10** — working-tree clean, PR closed, 5-min post-merge
  alarm window observation.

Verifier report committed to `ai/reports/task-0095.1-verifier.md`
(separate from the existing 0095 FAIL report — cleaner for cron/log
audit).

## Next-task candidates after Task 0095 finally PASS

1. **Task 0097 — rate limiting (B3 second half).** Reuses the same
   `cloudflare-kv` slice for storage; the slice was deliberately
   structured as a single component for this reason.
2. **Task 0096b — class-B warning cleanup wave 2 (tests/**).** ~625
   warnings across 9 test workspaces (`tests/membership-worker` ~351,
   `tests/config-worker` ~127, `tests/identity-worker` ~81,
   `tests/api-edge` ~46, others). Scope after Track A closes.
3. Revisit deferred candidates if any unblock (none have).

## Recently completed — Task 0096 (Class-B warning cleanup wave 1, apps source, PASS)

- **PR #144** (`impl/task-0096-class-b-warning-cleanup-wave-1`),
  squash `e9e432b` at 2026-05-30 (admin-merge — branch was BEHIND main
  due to two orchestrator scope commits `7d2c332` + `4895cd7` pushed
  direct to main between PR open and merge; source diff itself
  unchanged on the merge target).
- Diff: 4 files —
  `apps/config-worker/src/handlers/update-feature-flag.ts`
  (`UpdateFeatureFlagInput` from `@saas/db/config` replaces 2× `as any`
  at L139,213; `description:null` narrowed to skip-the-field matching
  sibling `update-setting.ts` / `create-feature-flag.ts` precedent),
  `apps/metering-worker/src/rollups.ts:147` (`console.log` →
  `console.warn`), `apps/webhooks-worker/src/index.ts:30,36` (2×
  `console.log` → `console.warn`),
  `ai/reports/task-0096-implementer.md` (NEW).
- Zero `+eslint-disable*` / `+@ts-ignore` / `+@ts-expect-error` /
  `+as unknown as` introductions in source.
- PR-CI rollup: 7/7 SUCCESS at `78720ef`; post-merge main-CI
  `26675733754` on `e9e432b` = 10/10 SUCCESS, including the 9
  deploy-gated jobs (`{config,metering,webhooks}-worker × {dev,stage,prod}
  · Verify deploy`).
- Per-workspace lint: exit 0, 0 warnings on each of the three touched
  apps. `pnpm -r typecheck` exit 0. `pnpm -r --no-bail lint` exit 0
  with **625 residual warnings, all in `tests/**`** (apps source 0).
- Touched test suites green: `tests/config-worker` 5 suites / 174
  tests, `tests/metering-worker` 2 suites / 32 tests,
  `tests/webhooks-worker` 2 suites / 66 tests.
- Behavioural review: `description:null → undefined` narrowing is
  safe — `UpdateFeatureFlagInput.description` is `string | undefined`
  (`packages/db/src/config/types.ts`), sibling handlers use the
  identical pattern, no fixture or historical commit invokes the
  prior semantic.
- Live: `https://{stage,prod}.sourceplane.ai/` → `HTTP/2 307` to
  `/orgs` unchanged.
- Reports: `ai/reports/task-0096-implementer.md`,
  `ai/reports/task-0096-verifier.md`.

## Recently completed — Task 0094 (Edge idempotency-key contract + gate, PASS)

- **PR #142** (`impl/task-0094-edge-idempotency-contract`), squash
  `71cf34f` at 2026-05-30. Live gate evidence on
  `api-edge-stage.workers.dev`: malformed `Idempotency-Key` on POST →
  400 `validation_failed`; absent → passthrough; valid → passthrough.
  Console / → 307 /orgs unchanged on stage + prod.
- Reports: `ai/reports/task-0094-implementer.md`,
  `ai/reports/task-0094-verifier.md`.

## Repo health: green

`main` tip on `origin/main` is `e9e432b` (post Task 0096 verifier
squash). PR #143 is the single open PR. `kiox.lock` pinned at orun
v2.9.0. Provider pin holds at `cloudflare ~> 4.52` (Task 0085b
deferred). Apex hostnames `stage.sourceplane.ai` and
`prod.sourceplane.ai` live.

Workspace-wide `pnpm -r typecheck` exits 0 cleanly (Task 0091 baseline
holds through 0096). Workspace-wide `pnpm -r --no-bail lint` exits 0
across all 33 lint-bearing workspaces with 625 residual warnings, all
in `tests/**` (apps source 0 — Tasks 0093 + 0096 outcome).

Notifications-worker V1 stays deployed on stage + prod (private,
`workers_dev: false`, `NOTIFICATIONS_PROVIDER=local-debug`).

api-edge `Idempotency-Key` validation gate is live in production for
all unsafe-method POSTs across the seven facades — malformed keys
return 400 `validation_failed` before any `resolveActor` or downstream
forwarding (Task 0094). The durable replay layer (Task 0095) is in
flight on PR #143 and gated by Task 0095.1 above.

## Deferred (orchestrator skips, loop keeps moving)

1. **Real notifications provider swap** (Resend / Postmark / SES) —
   waiting on user provider choice. Adapter seam at
   `apps/notifications-worker/src/providers/` is ready and
   safety-unblocked by Task 0090's idempotency-key population.
2. **Task 0085b — cloudflare-domain v4 → v5 + re-import** — explicit
   user defer. Boundary `infra/terraform/cloudflare-domain/**` and
   `cloudflare ~> 4.52` pin stay untouched.
3. **`notifications-worker-dev-reframe`** — needs a "dev-deploy lane"
   design pass before the dev-binding work has anywhere to land.

## Orchestrator Policy — Deferred Decision Protocol

Per `agents/orchestrator.md`, candidates that would require human input
are **deferred to `/ai/deferred.md`** instead of pausing the loop.
`waiting_for_input` only flips to `"true"` if EVERY candidate is
genuinely blocked on a human decision. Currently `waiting_for_input` is
`false` and the loop is on Task 0095.1.

## Roadmap Position

- B1 (real auth) is wired and idempotency-hardened on the caller side
  (Tasks 0086–0090). Real provider swap is unblocked from a safety
  standpoint when the user picks a provider.
- B2 (notifications worker) shipped in Task 0086.
- B3 (Edge idempotency + rate limiting) is in flight: Task 0094 landed
  the contract + edge validation gate; Task 0095 is shipping the
  durable replay store (PR #143) and is currently blocked on the Task
  0095.1 fix-up; Task 0097 (rate limiting) is the explicit successor
  and reuses the `cloudflare-kv` slice from 0095.

## Repo Reality

- 100 tasks on the completed list (0001–0096 plus splits and `.1`
  follow-ups, with Task 0095 still open). Task 0095 is **not**
  completed yet — implementer phase shipped on PR #143, verifier
  returned FAIL, Task 0095.1 fix-up scoped.
- Task 0085 split into 0085a (Phase 1, DONE) + 0085b (Phase 2,
  EXPLICITLY DEFERRED by user).
- Active spec pack: reusable SaaS starter under `specs/**`.
- Console live at `https://{stage,prod}.sourceplane.ai` (307 → `/orgs`).
- Notifications-worker V1 internal-only on stage/prod.
- 33/33 lint-bearing workspaces ship a working `eslint.config.js`
  (Task 0092). `pnpm -r --no-bail lint` exits 0 across all of them
  (Task 0093). `pnpm -r typecheck` exits 0 (Task 0091). Apps source
  class-B warnings eliminated for config/metering/webhooks workers
  (Task 0096); tests/** cleanup deferred to Task 0096b.
- api-edge `Idempotency-Key` validation gate live in production
  (Task 0094). Durable replay layer in flight on PR #143 (Task 0095,
  gated by 0095.1).
