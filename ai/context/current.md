# Current Context

Last updated: 2026-05-31 — Task 0105 closed (PASS+MERGED on
`a1436fc`). Task **0106 SCOPED** (orchestrator) — adds the
`sourceplane webhook verify` CLI subcommand that wires the
just-merged `@saas/webhook-verifier` helper into the user-facing CLI.
Pure local-crypto consumer of the Task 0105 deliverable; tightest
possible PR boundary; dogfoods the helper inside the monorepo.

## Current Task — 0106 (scoped, awaiting implementer)

**Agent:** Implementer
**Prompt:** `ai/tasks/task-0106.md`
**Branch:** `impl/task-0106-cli-webhook-verify`
**Roadmap leg:** B5 — Webhooks polish (CLI consumer of the helper;
rotate UX / replay UI / failure-budget alerts remain open follow-ups)
**Sealed snapshot main:** `b619e9d`

### Surface

```
sourceplane webhook verify
  --secret=SECRET                REQUIRED
  --signature=HEADER_VALUE       REQUIRED — `sha256=...` value of X-Webhook-Signature
  --timestamp=HEADER_VALUE       REQUIRED — value of X-Webhook-Timestamp
  --body=PATH                    optional — file path; mutex with STDIN
  --tolerance-seconds=N          optional — default 300
  --output=human|json            optional — default human
```

Exit 0 on valid signature, exit 4 on verifier failure (helper reason
codes passed through verbatim), exit 2 on argument errors via the
existing `UsageError`. Output goes to stdout; exit code carries the
signal. STDIN reads body bytes when `--body` is omitted.

### PR boundary (≤ 5 paths)

1. `packages/cli/package.json` — add `@saas/webhook-verifier`
   workspace dep (`workspace:*`).
2. `packages/cli/src/commands/webhook-verify.ts` — NEW.
3. `packages/cli/src/cli-runner.ts` — register `["webhook", "verify"]`
   + update help block.
4. `packages/cli/src/__tests__/webhook-verify.test.ts` — NEW vitest
   suite, ≥ 12 cases.
5. `pnpm-lock.yaml` — auto delta from the new workspace edge only.

### Hard rules

- Zero edits anywhere outside `packages/cli/**`. In particular, NO
  edits to `packages/webhook-verifier/**` (just merged on Task 0105;
  follow-up issue if a gap surfaces).
- No `Sourceplane`, no `fetch(`, no `/v1/`, no `client.*`. Local
  crypto only.
- No `node:crypto`, no `node:buffer`, no Node-only imports.
- Binary-safe body reading — no JSON-parse, no `.trim()`, no
  decode-then-re-encode.
- No new `eslint-disable` / `@ts-ignore` / `@ts-expect-error` /
  `as unknown as` / `as any` under `packages/cli/**`.

### Acceptance gates

- `pnpm install` exit 0; lockfile delta limited to new workspace edge.
- `pnpm -r typecheck` exit 0 across 39 workspaces.
- `pnpm -r --no-bail lint` ≤ 45 warnings, all in `tests/api-edge/**`.
- `pnpm --filter @saas/cli build / test` exit 0; ≥ 12 new passing
  cases.
- Local e2e smoke: sign-and-verify roundtrip green in both human
  and json modes (transcripts pasted in report).
- `kiox -- orun validate / plan --changed / run --dry-run` green;
  plan selects only CLI lanes.
- PR-CI 4/4 green at PR HEAD SHA via `gh run view --log`.
- Real PR number in implementer report (`TBD` = blocked).

### Why this scope, why now

- Task 0105 just shipped `@saas/webhook-verifier` (zero-dep,
  WebCrypto-only, 22/22 tests). It currently has zero in-repo
  consumers besides its own test fixture.
- `packages/cli` already exposes `webhook create` but NOT
  `webhook verify`. Adding it dogfoods the helper inside the
  monorepo (catches packaging / ESM-resolution issues the helper's
  own test suite cannot reach).
- Pure local-crypto path: zero backend, zero contracts, zero SDK,
  zero console, zero infra surface area. Parallel-safe with
  anything in flight.
- Unlocks future internal use of the helper in `apps/admin-worker`
  (B8) and webhook-replay tooling.

## Next Task After 0106

After Task 0106 verifier PASS+MERGE, candidates in priority order:

- **B5 follow-ups** — rotate UX, replay UI, failure-budget alerts.
  Each likely its own task; the helper unblocks none of these
  directly, but the cluster is in motion.
- **B7 — Audit-log UX expansion** (events-worker read APIs already
  live and console has a basic audit page; full filter set —
  actor/resource/action/time-range + NDJSON export — needs
  SDK+api-edge+contracts changes; multi-PR shape).
- **B8 — admin-worker scaffold** (spec 16 has no app yet;
  greenfield).

## Out of scope (deferred, parked, untouched this cycle)

- `tests/api-edge/**` (sealed Task 0096f verifier prompt remains
  active and orthogonal — zero file overlap with Task 0106)
- `packages/webhook-verifier/**` — just merged on 0105; follow-up
  only.
- `apps/notifications-worker/**` (deferred provider-swap and
  dev-reframe)
- `infra/terraform/cloudflare-domain/**` and the cloudflare provider
  pin (deferred 0085b)
- `tooling/eslint/**` (sealed since Task 0092)
- Optional spec-13 CLI commands (`component list`, `resource
  create/get`, `deployment get`) — deferred behind P2 backend slice
- `apps/web-console/**` (Vite-based legacy console — not in U10
  roadmap)
- `kiox.lock` v2.3.0→v2.9.0 working-tree drift (unrelated to 0106;
  do NOT bundle into the PR)

## Repo Checkpoint

| Attribute | Value |
|-----------|-------|
| **Branch (local)** | `main` (synced with `origin/main`) |
| **HEAD** | `b619e9d` (Task 0105 verifier-PASS bookkeeping) |
| **Repo health** | 🟢 Green |
| **Open PRs** | none |
| **Tasks completed** | 119 (through Task 0105) |
| **Current task** | 0106 (scoped — `sourceplane webhook verify` CLI subcommand, B5 dogfood) |
| **Deferred** | `0085b`, `notifications-provider-swap`, `notifications-worker-dev-reframe`, `optional-spec-13-commands` |
| **Last verified main-CI run** | `26701735837` (post-Task-0105 merge, 4/4 SUCCESS) |
| **`@saas/sdk` clients on main** | 13 (organizations, projects, memberships, apiKeys, webhooks, metering, billing, events, securityEvents, config, notifications, environments, auth) |
| **`@saas/cli` commands on main** | full spec-13 required surface; webhook create exists, webhook verify is the 0106 add |
| **`@saas/webhook-verifier` on main** | 1.0 surface (verifyWebhookSignature + signWebhookPayload + headers + DEFAULT_TOLERANCE_SECONDS=300, 22/22 vitest, zero runtime deps, WebCrypto only) |
| **Console SDK adoption** | `apps/web-console-next` consumes `Sourceplane` end-to-end |
| **Working-tree drift (out of scope)** | `kiox.lock` v2.3.0→v2.9.0 unstaged — do NOT bundle into Task 0106 |
