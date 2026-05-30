# Current Context

Last updated: 2026-05-30 (Task 0096e SCOPED — orchestrator emitted
implementer prompt at `ai/tasks/task-0096e.md` AND sealed verifier
prompt at `ai/tasks/task-0096e-verifier.md`. Track B wave 5 mop-up:
five smallest residual `tests/**` workspaces drained in one PR —
`tests/projects-worker` 10 + `tests/events-worker` 7 +
`tests/policy-engine` 7 + `tests/policy-worker` 1 +
`tests/webhooks-worker` 1 = **26** `@typescript-eslint/no-explicit-any`
warnings across 6 source files in 5 workspaces. Parallel-safe with
PR #143 (Track A), Task 0096c (`tests/config-worker`), AND Task 0096d
(`tests/identity-worker`) — zero file overlap with all three. Task
0096c implementer still needs to open its PR; Task 0096d implementer
still needs to open its PR; Track A / PR #143 still blocked on its
implementer rebase (head `db00843`, CONFLICTING vs main). main @
`b565687` (post Task 0096d orchestrator-scope commits). Repo health:
green. PR #143 is the single open PR.)

## Active task — Task 0096e (Class-B warning cleanup wave 5, five-workspace mop-up)

Agent: Implementer.
Prompt: `ai/tasks/task-0096e.md`.
Sealed verifier prompt: `ai/tasks/task-0096e-verifier.md`.
Branch: `impl/task-0096e-class-b-warning-cleanup-wave-5`.

### Scope (one PR, five workspaces, six source files + report)

- Replace every `@typescript-eslint/no-explicit-any` warning across:
  1. `tests/projects-worker/src/projects-worker.test.ts` — 10 anys, 170 `it()`
  2. `tests/events-worker/src/events-worker.test.ts` — 7 anys, 20 `it()`
  3. `tests/policy-engine/src/api-key-policy.test.ts` — 2 anys, 9 `it()`
  4. `tests/policy-engine/src/policy-engine.test.ts` — 5 anys, 131 `it()`
  5. `tests/policy-worker/src/policy-worker.test.ts` — 1 any, 20 `it()`
  6. `tests/webhooks-worker/src/delivery.test.ts` — 1 any, 28 `it()`
- `tests/webhooks-worker/src/webhooks-worker.test.ts` already 0 anys
  at baseline; must stay byte-identical vs `main` @ `b565687`.
- Same discipline as Tasks 0096 / 0096b / 0096c / 0096d: prefer real
  exports from `@saas/contracts/**`, `@saas/db/**`, and the matching
  `apps/<worker>/src/**`. No new `eslint-disable*`, `@ts-ignore`,
  `@ts-expect-error`, or `as unknown as` introductions.
- New `ai/reports/task-0096e-implementer.md` with type-sources +
  hazard-scan sections matching 0096b's report shape.

### Hard non-goals

- No `apps/**`, `packages/**`, `infra/**`, `tooling/**`, `.github/**`,
  `specs/**`, or any other `tests/**` workspace.
- No new `eslint-disable*` / `@ts-ignore` / `@ts-expect-error` /
  `as unknown as` introductions in the diff.
- No assertion / fixture / suite-ordering / `it()`-title changes.
- **No touching of PR #143's surface** (`apps/api-edge/**`,
  `infra/terraform/cloudflare-kv/**`, `tests/api-edge/**`).
- **No touching of Task 0096c's surface** (`tests/config-worker/**`).
- **No touching of Task 0096d's surface** (`tests/identity-worker/**`).

### Acceptance (must all hold on the PR head)

- Each of the five per-workspace lints exits 0 with **0 warnings**:
  `pnpm --filter @saas/projects-worker-tests   lint` (was 10)
  `pnpm --filter @saas/events-worker-tests     lint` (was 7)
  `pnpm --filter @saas/policy-engine-tests     lint` (was 7)
  `pnpm --filter @saas/policy-worker-tests     lint` (was 1)
  `pnpm --filter @saas/webhooks-worker-tests   lint` (was 1)
- Per-workspace tests at parity counts (1×170 / 1×20 / 2×177 /
  1×20 / 2×66) with per-file `it()` parity (170 / 20 / 9 / 131 /
  20 / 28).
- `pnpm -r typecheck` exit 0 (Task 0091 baseline).
- `pnpm -r --no-bail lint` exit 0 with **≤ 251** residual if neither
  0096c nor 0096d has merged ahead (≤ 171 if 0096d merged, ≤ 125 if
  0096c merged, ≤ 45 if both merged; subtract 45 more if Track A
  also merged). All residual in the remaining `tests/**` workspaces.
  Apps source still 0 (Task 0096 invariant).
- `git diff origin/main --stat` shows files only under the six
  listed test files plus the report.
- Hazard scan empty:
  `git diff origin/main -- 'tests/projects-worker/**'
  'tests/events-worker/**' 'tests/policy-engine/**'
  'tests/policy-worker/**' 'tests/webhooks-worker/**' |
  grep -E '^\+.*(eslint-disable|@ts-(ignore|expect-error)|as unknown as)'`
  → no output.
- `tests/webhooks-worker/src/webhooks-worker.test.ts` byte-identical
  vs `main` @ `b565687`.
- PR opened on `impl/task-0096e-class-b-warning-cleanup-wave-5`,
  real PR number substituted in the report before the final push.

### Why this task now (rationale)

- Tasks 0096c (tests/config-worker 126) and 0096d (tests/identity-worker
  80) are scoped + sealed but waiting on their implementer agents to
  open PRs. Track A / PR #143 is also waiting on its implementer's
  rebase. The orchestrator loop must NOT pause — per
  `agents/orchestrator.md` Operating Loop step 14 + the Deferred
  Decision Protocol, scope the next parallel-safe PR-sized task and
  keep moving.
- The five smallest residual workspaces (26 anys total) were already
  pre-named as the wave-5 mop-up bundle in the previous
  `current.md`. Bundling them into one PR (rather than five
  micro-PRs) is the right reviewable unit per `agents/orchestrator.md`
  § Architect Mode → "When To Prefer A Large Coherent PR": one primary
  outcome, one ownership boundary (lint cleanup), one rollback story
  (revert one squash), one acceptance block (the five lint exits + the
  six `it()` counts), and the alternative would be artificial micro-PRs.
- Zero file overlap with PR #143, Task 0096c, AND Task 0096d, so
  this PR can ship in parallel with all three with no rebase pain.
- Same template as 0096b/c/d (which all went / will go clean), so
  the diff shape, review checklist, and CI behaviour are
  well-known — known-safe pattern, not a new risk.
- After this lands, the residual lint surface drops to
  `tests/api-edge` 45 (Track-A-gated) + whichever of `tests/config-worker`
  126 / `tests/identity-worker` 80 hasn't merged. If all three
  Track-B waves plus Track A all merge, residual reaches 0 and the
  class-B no-explicit-any track is fully drained.

## Track B wave 4 — Task 0096d (in flight, no PR yet)

Agent: Implementer.
Prompt: `ai/tasks/task-0096d.md`. Sealed verifier prompt:
`ai/tasks/task-0096d-verifier.md`.
Branch (local only so far):
`impl/task-0096d-tests-identity-worker-class-b`.
Targets `tests/identity-worker` 80 → 0 across 5 source files
(api-key-admin.test.ts 33, security-events.test.ts 22,
profile.test.ts 13, login-start-notifications.test.ts 8,
helpers/fake-repository.ts 4). Baseline parity targets: 7 suites /
122 tests, per-file `it()` counts 15/51/8/4/15/12/17 vs `main` @
`b0bc233`. PR not opened yet.

## Track B wave 3 — Task 0096c (in flight, no PR yet)

Agent: Implementer.
Prompt: `ai/tasks/task-0096c.md`. Sealed verifier prompt:
`ai/tasks/task-0096c-verifier.md`.
Branch (local only so far): `impl/task-0096c-tests-config-worker-class-b`.
Targets `tests/config-worker` 126 → 0 across 3 files
(mutation-handlers.test.ts 47, secret-mutation-handlers.test.ts 43,
encrypted-secret-storage.test.ts 36). Baseline parity targets:
5 suites / 174 tests, per-file `it()` 39/39/29/54/8 vs `main` @
`1c6fcba`. PR not opened yet — implementer phase still in flight.

## Track A — Task 0095.1 (verifier resumption staged on PR #143)

Unchanged. PR #143 head still `db00843`, mergeStateStatus
DIRTY/CONFLICTING vs main. Implementer needs to rebase onto current
`main` (`b0bc233`), apply the Phase-5 fix-up (real 32-char hex KV IDs
in `apps/api-edge/wrangler.jsonc` for stage + prod, `EXPECTED_KV` block
in `apps/api-edge/scripts/verify-bindings.mjs`,
`ai/context/open-risks.md` lines 83–91 closure), and push. The verifier
prompt at `ai/tasks/task-0095.1-verifier.md` is sealed (Phases 1–4 PASS)
and runs Phase 5-delta → 2-delta → 3-delta → 6 squash → 7 post-merge
main-CI watch + `wrangler kv namespace list` provider verification → 8
live cases (a)–(g) on stage and (a)/(isolation)/(g) on prod → 9
open-risks closure → 10 alarm window.

Sealed (must not change in 0095.1):
`apps/api-edge/src/idempotency.ts`, `apps/api-edge/src/env.ts`, and
the seven facade call sites — verifier Phase-4 explicitly PASSED these.

## Recently completed — Task 0096b (Class-B warning cleanup wave 2, tests/membership-worker, PASS)

- **PR #145** (`impl/task-0096b-tests-membership-worker-class-b`),
  squash `6b738c0` at 2026-05-30 (clean fast-forward; branch deleted
  on merge).
- Diff: 5 files — 4 test files in `tests/membership-worker/src/**`
  (`membership-worker.test.ts` 305 → 0,
  `create-invitation-notifications.test.ts` 20 → 0,
  `accept-invitation-notifications.test.ts` 16 → 0,
  `service-principal-bindings.test.ts` 9 → 0; sum 350) +
  `ai/reports/task-0096b-implementer.md` (NEW).
  `authorization-context.test.ts` was at 0 anys at baseline and was
  untouched.
- Type sources: real exports from `@saas/contracts/billing`
  (`CheckBillingEntitlementResponse`), `@saas/db/membership`
  (`AcceptInvitationInput`, `CreateInvitationInput`,
  `CreateRoleAssignmentInput`, `MembershipResult`,
  `OrganizationInvitation`), `@saas/db/events`
  (`AppendEventWithAuditInput`, `StoredEvent`, `StoredAuditEntry`),
  `apps/membership-worker/src/env` (`Env`),
  `apps/membership-worker/src/billing-client`
  (`typeof checkBillingEntitlement`). Three small in-file structural
  types added (`JsonResp` envelope family, `CapturedPolicyBody`,
  inlined `NotificationsClientContext`).
- Zero `+eslint-disable*` / `+@ts-ignore` / `+@ts-expect-error` /
  `+as unknown as` introductions in the diff.
- Per-workspace lint: exit 0, 0 warnings (was 350).
  `pnpm --filter @saas/membership-worker-tests test`: 5 suites / 244
  tests, unchanged vs `main` @ `d2187f1` (it()/test() count parity
  holds per file: 179, 11, 11, 27). `pnpm -r typecheck` exit 0.
  `pnpm -r --no-bail lint` exit 0 with **277 residual warnings**
  (627 − 350), all in other `tests/**` workspaces; apps-source
  remains 0.
- PR-CI rollup at `d68cf19`: 2/2 SUCCESS (`plan` + `membership-worker-tests
  · dev · Verify`). Plan job emitted 1 component × 3 envs → 1 jobs,
  components: `membership-worker-tests` — diff was correctly
  picked up.
- Post-merge main-CI run `26677189951` on `6b738c0` = 2/2 SUCCESS.
- Reports: `ai/reports/task-0096b-implementer.md`,
  `ai/reports/task-0096b-verifier.md`.

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

## Sealed verifier prompt — Task 0096c

`ai/tasks/task-0096c-verifier.md` is now scoped and runnable the
moment the Task 0096c implementer opens a PR on
`impl/task-0096c-tests-config-worker-class-b`. Same shape as
`task-0096b-verifier.md`: 7 phases (PR sanity → hazard+boundary scan →
local gates → behaviour-preservation `it()`/`test()` count parity vs
`main` @ `1c6fcba` (39/39/29 on the three modified test files;
byte-identical on `config-worker.test.ts` and `deployment-config.test.ts`)
→ PR-CI log inspection → squash merge + post-merge main-CI watch →
state bookkeeping). Track A territory (`apps/api-edge/**`,
`infra/terraform/cloudflare-kv/**`, `tests/api-edge/**`) is explicitly
out of scope. On PASS, Recommended-Next-Move points the orchestrator
at `tests/identity-worker` (80 warnings) for Task 0096d —
`tests/api-edge` (45, second-largest by raw count) is gated behind
Track A's merge.

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

`main` tip on `origin/main` is `6b738c0` (squash of PR #145 / Task
0096b on top of `6f1e65d` which itself sat on `e9e432b` — Task 0096
verifier state-files commit). PR #143 is the single open PR.
`kiox.lock` pinned at orun v2.9.0. Provider pin holds at
`cloudflare ~> 4.52` (Task 0085b deferred). Apex hostnames
`stage.sourceplane.ai` and `prod.sourceplane.ai` live.

Workspace-wide `pnpm -r typecheck` exits 0 cleanly (Task 0091 baseline
holds through 0096b). Workspace-wide `pnpm -r --no-bail lint` exits 0
across all 33 lint-bearing workspaces with **277 residual warnings**,
all in other `tests/**` workspaces (apps source 0 — Tasks 0093 + 0096
outcome; `tests/membership-worker` 0 — Task 0096b outcome). Remaining
distribution: tests/config-worker 126, tests/identity-worker 80,
tests/api-edge 45, tests/projects-worker 10, tests/events-worker 7,
tests/policy-engine 7, tests/policy-worker 1, tests/webhooks-worker 1.

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
`false` and the loop is between tasks — Task 0096b just shipped; Track
A waits on its implementer, but Track A is not blocked on the user, it
is blocked on the implementer agent's next run, so the orchestrator is
free to ship parallel independent tests-only work (next wave:
tests/config-worker).

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
- Lint hygiene track (parallel to B3): Tasks 0092 → 0093 → 0096 →
  0096b drained apps-source class-B warnings to 0 and
  `tests/membership-worker` to 0; subsequent waves drain the remaining
  seven test workspaces (277 warnings, largest = `tests/config-worker`
  126).

## Repo Reality

- 101 tasks on the completed list (0001–0096 plus splits and `.1`
  follow-ups plus 0096b, with Task 0095 still open). Task 0095 is
  **not** completed yet — implementer phase shipped on PR #143,
  verifier returned FAIL, Task 0095.1 fix-up scoped.
- Task 0085 split into 0085a (Phase 1, DONE) + 0085b (Phase 2,
  EXPLICITLY DEFERRED by user).
- Active spec pack: reusable SaaS starter under `specs/**`.
- Console live at `https://{stage,prod}.sourceplane.ai` (307 → `/orgs`).
- Notifications-worker V1 internal-only on stage/prod.
- 33/33 lint-bearing workspaces ship a working `eslint.config.js`
  (Task 0092). `pnpm -r --no-bail lint` exits 0 across all of them
  (Task 0093). `pnpm -r typecheck` exits 0 (Task 0091). Apps source
  class-B warnings eliminated for config/metering/webhooks workers
  (Task 0096); `tests/membership-worker` class-B warnings eliminated
  (Task 0096b); remaining seven `tests/**` workspaces queue for
  subsequent waves (next: `tests/config-worker` 126 → Task 0096c).
- api-edge `Idempotency-Key` validation gate live in production
  (Task 0094). Durable replay layer in flight on PR #143 (Task 0095,
  gated by 0095.1).
