# Current Context

Last updated: 2026-05-31 — Task 0111 IMPLEMENTER COMPLETE +
VERIFIER SCOPED. PR #166 OPEN, MERGEABLE/CLEAN, 4/4 PR-CI green at
HEAD `ad2964b` (run `26706640065`: plan + cli·{dev,stage,prod}·Verify).
Verifier prompt at `ai/tasks/task-0111-verifier.md`.

## Active Task — 0111 (Verifier)

**Verifier prompt:** `ai/tasks/task-0111-verifier.md`
**PR:** #166 — https://github.com/sourceplane/multi-tenant-saas/pull/166
**Branch:** `impl/task-0111-cli-helpers-extract` (HEAD `ad2964b`)
**Sealed snapshot main:** `142d019` (scope commit `fcc5340` adds only
the task prompt + state-file bookkeeping)
**Component shape:** `turbo-package`, verify-only on dev/stage/prod,
no deploy lane, no live URL surface.
**Diff:** 5 files +394/-65 (code-only +232/-65 across helpers.ts NEW,
writes.ts, webhook-secrets-rotate.ts, helpers.test.ts NEW; the
remaining +162 is the implementer report `ai/reports/task-0111-implementer.md`).
**Implementer report committed on PR branch** as `dbb862d` — no
Task 0106 missing-report fix-up needed.

**Verifier 8-phase shape (turbo-package, no deploy lane):**

- Phase 0: working-dir + readiness (`gh pr checkout 166`)
- Phase 1: PR sanity, EXACTLY 5 listed paths + forbidden-zone grep
- Phase 2: hazard scan + behaviour-equivalence diff vs origin/main
  inline copies + residual-duplicate audit + ≥6 vitest case audit
- Phase 3: quality gates (`pnpm -r typecheck` / lint / `@saas/cli`
  build+test ≥144/144 across 11 files)
- Phase 4: orun gates (validate / plan --changed selects ONLY
  cli·{dev,stage,prod}·Verify / run --dry-run 3/3 ✓)
- Phase 5: PR-CI lane log evidence via `gh run view --log`
- Phase 6: squash-merge + post-merge main-CI watch (4 lanes)
  (BEHIND-main pattern: `gh pr update-branch 166` if mergeStateStatus
  flips, recurring 0103–0110)
- Phase 7: verifier report `ai/reports/task-0111-verifier.md`
- Phase 8: PASS bookkeeping (state.json/current.md/ledger commit on
  main) or FAIL bookkeeping (PR comment + no merge)

**Documented Remaining Gap (accept; do not block):**
`cross-reads.ts` still carries its own single-arg
`async function resolveOrgId(ctx)` no-override read variant.
PR-Boundary explicitly forbids touching it. Verifier should risk-note
this forward as a tiny future housekeeping task (one line of
deletions + one import). Reads have no idempotency dimension; the
duplication is byte-equivalent and low-risk.

## Original Implementer scope (now complete)

**Objective:** Extract `resolveOrgId(ctx, allowOverride)` and
`readIdempotencyKey(ctx)` from `packages/cli/src/commands/writes.ts` and
`webhook-secrets-rotate.ts` into a new shared module
`packages/cli/src/commands/helpers.ts`. Pure behaviour-preserving
refactor — zero observable CLI behaviour change, zero new commands.

**PR boundary (5 files exactly):**
- `packages/cli/src/commands/helpers.ts` (NEW, ~50–80 LOC)
- `packages/cli/src/commands/writes.ts` (deletions + 1 import)
- `packages/cli/src/commands/webhook-secrets-rotate.ts` (deletions
  + 1 import + 1 comment-block edit + 1 call-site swap)
- `packages/cli/src/__tests__/helpers.test.ts` (NEW, ≥6 vitest cases)
- `ai/reports/task-0111-implementer.md` (NEW)

**Branch:** `impl/task-0111-cli-helpers-extract`
**Sealed snapshot main:** `142d019`
**Vitest baseline:** 136/136 across 10 files → ≥142 across 11 files
on PASS.
**Component shape:** `turbo-package`, verify-only on dev/stage/prod, no
deploy lane, no live URL surface. Orun changed-plan must select ONLY
`cli · {dev,stage,prod} · Verify` (3 jobs).

**Forbidden zones:** `packages/(sdk|contracts|webhook-verifier)/`,
`apps/`, `tests/`, `infra/`, `tooling/`, `stack-tectonic/`, `kiox.lock`,
`packages/cli/package.json`, `pnpm-lock.yaml`, all OTHER
`packages/cli/src/commands/*.ts` files (cross-reads, webhook-sign,
webhook-verify, index, cli-runner).

## Just-merged — 0110

**Branch (deleted):** `impl/task-0110-cli-webhook-secrets-rotate`
**Squash merge:** `142d019` (merged 2026-05-31)
**PR:** #165 — https://github.com/sourceplane/multi-tenant-saas/pull/165
**PR-CI lanes (all SUCCESS, post-update-branch HEAD `927270f`):** plan +
`cli · {dev,stage,prod} · Verify`.
**Initial PR-CI** at HEAD `3d6b324` (run `26705959245`) also 4/4 SUCCESS.
**Post-merge main-CI:** run `26706238108` 4/4 SUCCESS at `142d019`.

**Reports:**
- Implementer: `ai/reports/task-0110-implementer.md`
- Verifier: `ai/reports/task-0110-verifier.md`

**Durable outcome on main:** `sourceplane webhook secrets rotate
<endpointId> [--idempotency-key=KEY] [--output=human|json]` CLI
subcommand. Pure SDK consumer of the locked
`client.webhooks.rotateSecret` shape. 13 vitest cases under
`packages/cli/src/__tests__/webhook-secrets-rotate.test.ts` lift the
`@saas/cli` suite to 136/136 passing across 10 files.

## B5 secret-rotation arc — CLOSED

| Task | Slice | PR | Squash | Verifier |
|------|-------|-----|--------|----------|
| 0108 | Backend dual-secret grace + reveal-once response | #163 | `28b3ca1` | PASS |
| 0109 | Console reveal-once UX (discriminated-union state machine) | #164 | `84a69c2` | PASS |
| 0110 | CLI `webhook secrets rotate` reveal-once UX | #165 | `142d019` | PASS |

## Repo health

**Repo health:** green
**HEAD on main:** `142d019`
**Sealed snapshot for Task 0111:** `142d019`
**Open PRs:** none at scope time

## Selection rationale (Task 0111)

Picked CLI helpers extraction over the other current.md candidates:

1. **Verifier-endorsed:** Task 0110 verifier explicitly recommends this
   extraction "before the next CLI write/rotate surface" lands.
2. **Leaf in dependency graph:** pure refactor, no spec/contract/SDK
   coupling. Strong rollback story (revert is mechanical).
3. **File-disjoint** from every deferred candidate
   (`apps/notifications-worker/**`, `infra/terraform/cloudflare-domain/**`)
   and from every in-flight area.
4. **Removes a known duplication hazard** before it propagates into the
   next CLI write surface (e.g. `webhook secrets list/reveal/revoke`,
   future writes against new resources).

Other candidates evaluated and not picked:

- **B5 replay UI** — backend `/v1/.../replay` endpoint not yet exposed
  in webhooks-facade routes (audit at scoping confirmed only
  `replayOrExecute`-style idempotency uses; no delivery-attempt replay
  surface). Would need a backend P2 slice first; deferred shape mirrors
  the deferred spec-13 commands case.
- **B5 failure-budget alerts** — depends on the notifications provider
  swap (deferred) for live alert delivery; can scope a stage-only
  scaffold but not a complete PR yet.
- **Console webhook subscriptions UX / delivery-attempts UX** — viable
  next candidates after 0111; will pick one for Task 0112+.
- **B7 audit-log UX** — larger greenfield surface; better landed after
  the cleaner CLI seam.
- **B8 admin-worker scaffold** — long-deferred breather; legitimate
  candidate for Task 0112+.

## Next Tasks (orchestrator candidates after 0111)

1. Console webhook subscriptions UX (event-type subscription management).
2. Console delivery-attempts UX (history + retry visibility).
3. B7 audit-log UX — surface the audit/event stream that B5 handlers
   populate.
4. B8 admin-worker scaffold — platform-internal admin surface.

## Recurring patterns to honour

- BEHIND-main on orchestrator-dispatch commit: every PR from 0103–0110
  has hit it. Verifier handles via `gh pr update-branch <PR#>` +
  re-watch PR-CI on rebased HEAD before merge. Implementer is NOT
  responsible for the rebase.
- CI log evidence (not just `statusCheckRollup`) for the required
  lanes is mandatory per Verifier Standard.
- Implementer report MUST be committed on PR branch (no 0106
  missing-report gap recurred on 0107–0110).
- Behaviour-preserving refactors must run a residual-duplicate `rg`
  audit before reporting (catch any `resolveActiveOrgId` /
  duplicate-definition leftovers).
