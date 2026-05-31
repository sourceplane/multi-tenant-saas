# Current Context

Last updated: 2026-05-31 — Task 0110 SCOPED. B5 secret-rotation arc closer:
0108 (backend) → 0109 (console) → **0110 (CLI)**. Implementer dispatch ready.

## Just-merged — 0109

**Branch (deleted):** `impl/task-0109-webhook-console-reveal-once`
**Squash merge:** `84a69c2` (merged 2026-05-31T06:27:59Z)
**PR:** #164 — https://github.com/sourceplane/multi-tenant-saas/pull/164
**PR-CI lanes (all SUCCESS, post-update-branch HEAD `5aab758`):** plan +
`web-console-next-tests · dev · Verify` +
`web-console-next · {dev,stage,prod} · Verify deploy`.
**Post-merge main-CI:** run `26705368955` 5/5 SUCCESS.
**Live Workers:**
- stage: https://sourceplane-web-console-next-stage.rahulvarghesepullely.workers.dev
  (version `37a3e7ff-f0b4-4235-b8fe-c2c38836b331`, HTTP/2 307 → /orgs).
- prod: https://sourceplane-web-console-next-prod.rahulvarghesepullely.workers.dev
  (version `b209ca74-031a-49ae-992e-1753e702fec8`, HTTP/2 307 → /orgs).

**Reports:**
- Implementer: `ai/reports/task-0109-implementer.md`
- Verifier: `ai/reports/task-0109-verifier.md`

**Durable outcome on main:** reveal-once console rotate UX with type-system-
enforced discriminated-union state machine; sidebar "Webhooks" entry under
`Org · {orgSlug}`; new `tests/web-console-next` workspace (18-test Jest
suite). Full detail in prior `current.md` revision (preserved in
`task-ledger.md`).

## Active Task — 0110

**Agent:** Implementer
**Prompt:** `ai/tasks/task-0110.md`
**Branch:** `impl/task-0110-cli-webhook-secrets-rotate`
**Sealed snapshot main:** `3cfdeb0` (Task 0109 verifier-PASS bookkeeping).
**Status:** scoped and ready to begin (2026-05-31).

### Objective

Add `sourceplane webhook secrets rotate <endpointId>` — symmetric CLI
counterpart to the 0109 console reveal-once UX. Pure SDK consumer of
`client.webhooks.rotateSecret`; reveal-once `whsec_<32hex>` plaintext
printed exactly once on stdout, never persisted/logged/stashed; legacy
no-encryption-key branch renders amber-toned no-plaintext affordance
(no fake placeholder), mirroring the 0109 console behaviour.

### PR Boundary (≤ 4 paths + report)

- `packages/cli/src/commands/webhook-secrets-rotate.ts` — NEW.
- `packages/cli/src/cli-runner.ts` — register
  `["webhook", "secrets", "rotate"]` route + 1 help line.
- `packages/cli/src/__tests__/webhook-secrets-rotate.test.ts` — NEW
  (≥ 12 cases including reveal-once stdout discipline check).
- `ai/reports/task-0110-implementer.md` — NEW, committed on PR
  branch.

Forbidden zones (auto-FAIL): `packages/sdk/**`, `packages/contracts/**`,
`packages/webhook-verifier/**`, `apps/**`, `tests/**`, `infra/**`,
`tooling/**`, `stack-tectonic/**`, `kiox.lock`,
`packages/cli/package.json`, `pnpm-lock.yaml`, the existing
`webhook-{verify,sign}.ts` / `writes.ts` / `cross-reads.ts` /
`commands/index.ts`.

### Why this is parallel-safe

File-disjoint from every deferred candidate and there are zero open
PRs at scope time. Only collision risk is another `packages/cli/**`
task touching `cli-runner.ts` — none in flight.

### Acceptance Snapshot

- `pnpm -r typecheck=0` (39 workspaces).
- `pnpm -r --no-bail lint` ≤ 45 warnings, ALL in `tests/api-edge/**`.
- `@saas/cli build/test` green with ≥ 135 total cases (existing 123 +
  ≥ 12 new).
- `kiox -- orun plan --changed --base origin/main` selects ONLY
  `cli·{dev,stage,prod}·Verify` (1 component × 3 envs = 3 jobs).
- PR-CI 4/4 SUCCESS via `gh run view --log`.
- Real PR number recorded in implementer report (TBD = blocked).

## Pipeline status

- **Active task:** 0110 (Implementer dispatch ready).
- **Open PRs:** none.
- **`main` HEAD:** `3cfdeb0` (Task 0109 verifier-PASS bookkeeping on top
  of the 0109 squash `84a69c2`).
- **B5 webhook-helper dogfood arc:** CLOSED (0105/0106/0107 merged).
- **B5 secret-rotation arc:** backend (0108) + console (0109) MERGED;
  CLI rotate (0110) is the active in-flight slice that closes the arc.

## Next Tasks (post-0110)

- **B5 — replay UI / failure-budget alerts** (console-side; consumer
  of existing events-worker read APIs once SDK delivery-history is
  final).
- **B5 — webhook subscriptions UX / delivery-attempts UX** (console;
  separate B5 follow-ups deferred from 0109).
- **B5 (record-only) — Cmd-K palette entry for "Rotate signing
  secret"**; re-evaluate when other "Rotate {x}" actions land.
- **B5 (record-only) — console-side endpoint creation UX** (was out
  of scope per 0109 prompt).
- **B5 (record-only) — `@saas/webhook-verifier` multi-key extension**
  to accept an array of secrets and validate against any (out-of-
  scope per 0108 spec).
- **B7 — Audit-log UX expansion.**
- **B8 — admin-worker scaffold** (greenfield single-PR breather).

## Spec Proposals (non-blocking)

- Webhook docs update for the new `X-Webhook-Signature-Previous`
  header + grace-window operational guidance for subscribers
  (verify-either-key during the window) — outstanding from 0108.

## Deferred (unchanged)

- `0085b` — see `ai/deferred.md`.
- `notifications-provider-swap` — see `ai/deferred.md`.
- `notifications-worker-dev-reframe` — see `ai/deferred.md`.
- `optional-spec-13-commands` — see `ai/deferred.md`.
