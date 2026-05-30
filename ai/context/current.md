# Current Context

Last updated: 2026-05-30 (Track B (Task 0096) CLOSED — verifier PASS,
PR #144 squash-merged at `e9e432b`, post-merge main-CI `26675733754`
10/10 SUCCESS, console smoke unchanged. Track A (Task 0095.1) STILL
waiting on implementer fix-up commits to PR #143; head still
`db00843`, mergeStateStatus DIRTY/CONFLICTING vs main — rebase is
implementer's job before fix-ups land. Orchestrator output today:
**Task 0096b SCOPED** — class-B warning cleanup wave 2,
`tests/membership-worker` only (350 / 627 residual warnings → 0).
Repo health: green; PR #143 is the single open PR; main @ `d2187f1`.)

## Active task — Task 0096b (class-B warning cleanup wave 2, tests/membership-worker)

The orchestrator advanced the loop while Track A waits on its
implementer. Task 0096b is the **largest single concentration** of the
post-Task-0096 residual lint surface: 350 of 627 warnings live in
`tests/membership-worker`, all of them `@typescript-eslint/no-explicit-any`,
distributed across five test files in a single workspace.

### Why this task, why now

- Track A (Task 0095.1) cannot move without implementer fix-up commits
  on PR #143 (still at `db00843`, conflicting). Verifier prompt is
  sealed at `ai/tasks/task-0095.1-verifier.md` and waits.
- Track B (Task 0096) closed today and locked in apps-source 0 class-B
  warnings. The user's recorded preference after Task 0096 is to
  "drain `tests/**`."
- A single-workspace PR scoped to `tests/membership-worker/src/**`
  cannot collide with PR #143's surface (`apps/api-edge/**`,
  `infra/terraform/cloudflare-kv/**`, `tests/api-edge/**`), so Track A
  can rebase and ship at any moment without conflict.
- Single-rule, single-workspace, behaviour-preserving cleanup is a
  clean PR-sized unit: one primary outcome, one ownership boundary,
  one test suite, one validation pass. It also establishes the
  template for the remaining seven workspace waves.

### PR boundary (Task 0096b)

In scope (one PR):

1. Edits inside `tests/membership-worker/src/**/*.ts` only — five
   files (`membership-worker.test.ts` 3637 LOC dominates with ~330 of
   the 350 warnings; `accept-invitation-notifications.test.ts`,
   `authorization-context.test.ts`,
   `create-invitation-notifications.test.ts`,
   `service-principal-bindings.test.ts`).
2. Optional in-workspace `_types.ts` for shared fixture types when it
   materially reduces duplication.
3. `ai/reports/task-0096b-implementer.md` (NEW).

Out of scope (hard non-goals):

- No edits under `apps/**`, `packages/**`, `infra/**`, `tooling/**`,
  `.github/**`, `specs/**`, or any other `tests/<workspace>/**`.
- No `eslint-disable*`, `@ts-ignore`, `@ts-expect-error`, or
  `as unknown as` introductions in the diff.
- **No touching of PR #143 surface (`apps/api-edge/**`,
  `infra/terraform/cloudflare-kv/**`, `tests/api-edge/**`)** — Track A
  territory.
- No rule-severity flip from `warn` to `error`.
- No assertion / fixture-value / suite-ordering changes.

### Type-source preference (mirrors Task 0096 discipline)

Replace `any` with the narrowest accurate real type. Preference order:

1. `@saas/contracts` (request/response contracts the worker exposes).
2. `@saas/db/membership` (row shapes used in fixtures).
3. `apps/membership-worker/src/**` exported types (handler IO).
4. In-workspace `_types.ts` (last resort, only when the fixture shape
   is genuinely synthetic).

`as T` is acceptable only when the call-site value is provably a
superset of `T`; `as unknown as T` is forbidden in the diff.

### Acceptance (Task 0096b)

✅ `pnpm --filter tests/membership-worker lint` → exit 0, **0 warnings** (was 350).

✅ `pnpm --filter tests/membership-worker test` → exit 0, suite +
test count UNCHANGED vs `main` @ `d2187f1` (record both).

✅ `pnpm -r typecheck` → exit 0 (Task 0091 baseline holds).

✅ `pnpm -r --no-bail lint` → exit 0, **277 residual warnings**
(627 − 350), all in `tests/**` other workspaces, apps-source still 0.

✅ `git diff origin/main --stat` shows files only under
`tests/membership-worker/src/**` plus
`ai/reports/task-0096b-implementer.md`.

✅ Hazard scan empty:
`git diff origin/main -- 'tests/membership-worker/**' | grep -E '^\+.*(eslint-disable|@ts-(ignore|expect-error)|as unknown as)'`
→ no output.

✅ PR opened on
`impl/task-0096b-tests-membership-worker-class-b`, real PR number
substituted into the report before final push.

Prompt: `ai/tasks/task-0096b.md`. Branch (to be created):
`impl/task-0096b-tests-membership-worker-class-b`.

## Track A — Task 0095.1 (verifier resumption staged on PR #143)

Unchanged from last update. PR #143 head still `db00843`,
mergeStateStatus DIRTY/CONFLICTING vs main. Implementer needs to
rebase onto `d2187f1`, apply the Phase-5 fix-up (real 32-char hex KV
IDs in `apps/api-edge/wrangler.jsonc` for stage + prod, `EXPECTED_KV`
block in `apps/api-edge/scripts/verify-bindings.mjs`,
`ai/context/open-risks.md` lines 83–91 closure), and push. The
verifier prompt at `ai/tasks/task-0095.1-verifier.md` is sealed
(Phases 1–4 PASS) and runs Phase 5-delta → 2-delta → 3-delta →
6 squash → 7 post-merge main-CI watch + `wrangler kv namespace list`
provider verification → 8 live cases (a)–(g) on stage and
(a)/(isolation)/(g) on prod → 9 open-risks closure → 10 alarm window.

Sealed (must not change in 0095.1):
`apps/api-edge/src/idempotency.ts`, `apps/api-edge/src/env.ts`, and
the seven facade call sites — verifier Phase-4 explicitly PASSED these.

## Verifier re-run plan after Task 0095.1

Unchanged. Verifier prompt at `ai/tasks/task-0095.1-verifier.md`
delta-scans the 0095.1 commits against `e47248e` (the prior verifier
head); verifier report goes to `ai/reports/task-0095.1-verifier.md`
(separate from the existing 0095 FAIL report).

## Next-task candidates after Task 0096b PASS + merge

1. **If Track A (Task 0095.1) has shipped by then** — run
   `ai/tasks/task-0095.1-verifier.md` against PR #143's new head.
2. **Class-B wave 3** — `tests/config-worker` (126 warnings, the
   largest remaining single workspace). Same PR-shape template as
   0096b.
3. **Task 0097 — rate limiting (B3 second half)** — reuses the
   `cloudflare-kv` slice from Task 0095, so this is gated on Track A
   actually merging.
4. Revisit deferred candidates if any unblock (none have).

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
  with **627 residual warnings, all in `tests/**`** (apps source 0 —
  Task 0096b will drain `tests/membership-worker` 350 of those).
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

`main` tip on `origin/main` is `d2187f1` (post Task 0096 verifier
state-files commit on top of squash `e9e432b`). PR #143 is the single
open PR. `kiox.lock` pinned at orun v2.9.0. Provider pin holds at
`cloudflare ~> 4.52` (Task 0085b deferred). Apex hostnames
`stage.sourceplane.ai` and `prod.sourceplane.ai` live.

Workspace-wide `pnpm -r typecheck` exits 0 cleanly (Task 0091 baseline
holds through 0096). Workspace-wide `pnpm -r --no-bail lint` exits 0
across all 33 lint-bearing workspaces with 627 residual warnings, all
in `tests/**` (apps source 0 — Tasks 0093 + 0096 outcome). Task 0096b
targets 350 of those (`tests/membership-worker`); the remaining 277
will be drained by subsequent waves.

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
`false` and the loop is on Task 0096b — Track A waits on its
implementer, but Track A is not blocked on the user, it is blocked on
the implementer agent's next run, so the orchestrator is free to ship
parallel independent tests-only work.

## Roadmap Position

- B1 (real auth) is wired and idempotency-hardened on the caller side
  (Tasks 0086–0090). Real provider swap is unblocked from a safety
  standpoint when the user picks a provider.
- B2 (notifications worker) shipped in Task 0086.
- B3 (Edge idempotency + rate limiting) is in flight: Task 0094 landed
  the contract + edge validation gate; Task 0095 is shipping the
  durable replay store (PR #143) and is currently blocked on the Task
  0095.1 implementer fix-up; Task 0097 (rate limiting) is the explicit
  successor and reuses the `cloudflare-kv` slice from 0095.
- Lint hygiene track (parallel to B3): Tasks 0092 → 0093 → 0096
  drained apps-source class-B warnings to 0; Task 0096b drains
  `tests/membership-worker` (350 of 627 residual); subsequent waves
  drain the remaining seven test workspaces (277).

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
  (Task 0096); `tests/membership-worker` cleanup is the active task
  (0096b); remaining `tests/**` workspaces queue for subsequent waves.
- api-edge `Idempotency-Key` validation gate live in production
  (Task 0094). Durable replay layer in flight on PR #143 (Task 0095,
  gated by 0095.1).
