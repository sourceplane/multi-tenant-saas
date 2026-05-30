# Current Context

Last updated: 2026-05-31 — Task 0100 SCOPED. `packages/cli` foundation
(B4 second-half opening) is next on deck. SDK side is feature-complete.

## What just landed

**Task 0099 — `@saas/sdk` resource client fan-out (B4 first-half
closure).** PR #153 squash `93ebe0e`. Single-pass closure (Implementer
+ Verifier same session). 13 files / +2,178 / −6, all net-new under
`packages/sdk/**` plus implementer + verifier reports.

`@saas/sdk` now exposes the full 11-client public-API surface:
`organizations`, `projects`, `memberships`, `apiKeys`, `webhooks`,
`metering`, `billing`, `events`, `securityEvents`, `config`,
`notifications`. All consume types directly from `@saas/contracts`;
no contract edits. Stripe parity preserved (caller-owned
`idempotencyKey`, `encodeURIComponent` on every dynamic segment).

Quality gates green: `pnpm --filter @saas/sdk` typecheck/lint/test/build
all exit 0; `pnpm -r typecheck` exit 0; `pnpm -r --no-bail lint` =
0 errors, exactly **45 residual warnings** (all `tests/api-edge`,
Task 0096f territory). Hazard scan `packages/sdk/**` = 0 hits.

PR-CI 4/4 PASS; post-merge main-CI run `26693266415` = 4/4 SUCCESS.

Reports: `ai/reports/task-0099-{implementer,verifier}.md`.

## Track B4 status

**First half CLOSED.** SDK surface is complete against the api-edge
facade route table. **Second half opens with Task 0100** (this scope)
and closes with Task 0101 (CLI write commands + remaining read
commands).

## Current Task — 0100 (Implementer)

**Objective.** Scaffold `packages/cli` per `specs/components/13-cli-and-sdk.md`
on top of `@saas/sdk`. Ship the CLI binary, command framework,
auth flow with keychain (and `~/.config/sourceplane/` fallback)
token storage, org-context persistence, JSON/human output, and a
small pilot of read-only commands wired end-to-end through the SDK.

**PR boundary (single PR):**
1. `packages/cli` workspace (`@saas/cli`, `bin sourceplane`).
2. Command framework foundation (`cli.ts`, `auth/`, `token-store/`,
   `context/`, `output/`, `errors.ts`).
3. Pilot commands: `login`, `logout`, `whoami`, `org list`, `org use`,
   `org members`, `project list`.
4. `packages/cli/component.yaml` mirroring `packages/sdk/component.yaml`
   shape (turbo-package, `domain: starter-cli`, `quick-check` profile
   on dev/stage/prod, `surface: cli`).
5. Test surface ≥30 it()s across the listed test files.
6. Implementer report at `ai/reports/task-0100-implementer.md`.

**Explicit non-goals (Task 0101 territory):** all write commands
(`org invite`, `project create`, `env create`, `api-key create`,
`webhook create`), `usage summary`, `billing summary`, `audit list`,
optional spec-13 commands (`component list`, `resource create/get`,
`deployment get`), console refactor (U10), `--profile` multi-account
UX, publishing config, shell completions.

**Hard rules.** Public-API only (no `apps/**`, no `packages/db/**`,
no worker imports). Zero new `eslint-disable*` / `@ts-ignore` /
`@ts-expect-error` / `as unknown as` / `as any` under `packages/cli/**`.
`keytar` in `optionalDependencies` and lazy-loaded so non-Node test
runs do not crash. POSIX credentials file mode 0600, asserted by test.
JSON output deterministic. Stripe parity preserved (caller-owned
idempotency, no transparent generation layer).

**Branch.** `impl/task-0100-packages-cli-scaffold`.

**Latitude (record rationale in report).** Framework choice
(`commander` / `cac` / `clipanion` / hand-rolled). Auth flow shape
(device-flow if `api-edge` already serves it; else token-paste
fallback validated by `client.organizations.list()`).

## Still in flight

- **Task 0096f** — `tests/api-edge` class-B drain (45 → 0
  no-explicit-any, closes Track B globally). Branch
  `impl/task-0096f-tests-api-edge-class-b`. Implementer prompt at
  `ai/tasks/task-0096f.md`; sealed verifier prompt at
  `ai/tasks/task-0096f-verifier.md`. **Zero file overlap with Task
  0100** — `0096f` owns `tests/api-edge/**`, `0100` owns
  `packages/cli/**` + `packages/cli/component.yaml`. Both can ship
  in parallel.

## Next focus

After Task 0100 lands:
- **Task 0101** — CLI write-command fan-out + remaining read commands
  (B4 second-half closure). Mirrors the Task 0098 → 0099 cadence on
  the CLI side.
- **U10** — console-as-SDK-client (gated on B4 fully closing).

Per `specs/roadmap.md` Sequencing Notes: B4 must close before P2
(Resources / component-manifest extension) starts so the resources
contract ships as a typed client surface from day one.

## Deferred (parked, do not touch)

- `0085b` — cloudflare-domain v4 → v5 + re-import (explicit user
  defer; no edits to `infra/terraform/cloudflare-domain/**` or the
  cloudflare provider `~> 4.52` pin).
- `notifications-provider-swap` — needs Resend/Postmark/SES choice.
- `notifications-worker-dev-reframe` — needs a "dev-deploy lane"
  design pass before the dev-binding work has anywhere to land.

See `ai/deferred.md` for full entries with unblock signals.
