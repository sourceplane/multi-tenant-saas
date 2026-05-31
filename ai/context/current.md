# Current Context

Last updated: 2026-05-31 — Task 0104 closed (PASS+MERGED). Task **0105
SCOPED** (orchestrator). Pivoted from the originally sketched
"`packages/cli` auth/SDK consumer swap" — that work is **already on
main** (login/whoami/logout already construct `Sourceplane`, zero
`fetch(`, zero `/v1/`, zero header building) and the only remaining
move (swap validation to `client.auth.getSession()`) would regress
because CLI uses API-key bearers (`actorType=service_principal`) but
`/v1/auth/session` only accepts user-session bearers. Per orchestrator
"trust code reality over stale docs" rule, pivoted Task 0105 to the
next-highest-leverage human-independent candidate: **B5 webhook-verifier
helper** (`specs/roadmap.md:81-82`).

## Current Task — 0105 (scoped, awaiting implementer)

**Agent:** Implementer
**Prompt:** `ai/tasks/task-0105.md`
**Branch:** `impl/task-0105-webhook-verifier`
**Roadmap leg:** B5 — Webhooks polish (helper-library surface only;
rotate UX / replay UI / failure-budget alerts remain open for later)
**Sealed snapshot main:** `f01d61f`

### Objective

Add a new workspace package `@saas/webhook-verifier` at
`packages/webhook-verifier/`. Tiny, dependency-free helper for
**third-party consumers** to verify the HMAC-SHA256 signatures
Sourceplane attaches to outbound webhook deliveries. Codifies the
existing scheme from `apps/webhooks-worker/src/delivery.ts:45-61`
(HMAC-SHA256 over `${timestamp}.${body}`, header
`X-Webhook-Signature`, prefix `sha256=`) so external customers and
future replay tooling don't reinvent it. WebCrypto only — runs verbatim
on Workers / Bun / browsers / modern Node.

### PR Boundary

1. New `packages/webhook-verifier/` directory: `package.json`
   (zero runtime deps), `tsconfig.json`, `tsconfig.build.json`,
   `component.yaml` (mirrors `packages/notifications-client/component.yaml`
   structurally — `turbo-package`, `starter-shared`, 3-env quick-check),
   `README.md` (≤1.5 KB), `src/index.ts`,
   `src/__tests__/verify.test.ts` (≥18 tests).
2. `src/index.ts` exports: `SIGNATURE_HEADER`, `TIMESTAMP_HEADER`,
   `WEBHOOK_ID_HEADER`, `SIGNATURE_PREFIX`,
   `DEFAULT_TOLERANCE_SECONDS=300`, async `verifyWebhookSignature(input)`
   returning a tagged result with eight enumerated `reason` codes,
   async `signWebhookPayload({secret, body, timestamp})`. Constant-time
   comparison; case-insensitive header lookup for both
   `Record<string, string|string[]|undefined>` and `Headers`.

### Hard rules

- WebCrypto only — zero `node:` imports anywhere under
  `packages/webhook-verifier/**`.
- Zero runtime `dependencies` (devDependencies only).
- `component.yaml` MANDATORY (workspace-package-component-yaml audit).
- Zero edits to `apps/webhooks-worker/**`, `packages/sdk/**`,
  `packages/cli/**`, `packages/contracts/**`,
  `apps/web-console-next/**`, `tooling/**`, `tests/api-edge/**`,
  `kiox.lock`.
- Constant-time signature comparison — no early `return` mid byte loop.
- Real PR number in implementer report (`TBD` = blocked).

### Acceptance

- `pnpm -r typecheck` exit 0 (workspace count +1 vs main).
- `pnpm -r --no-bail lint` ≤45 warnings, all in `tests/api-edge/**`.
- `pnpm --filter @saas/webhook-verifier build/test` exit 0,
  ≥18 tests passing.
- `kiox -- orun validate/plan --changed/run --dry-run` green;
  plan selects exactly 3 `webhook-verifier` Verify lanes.
- PR-CI 4/4 green via `gh run view --log` (not just summary).

### Why this scope, why now

- Task 0104 closed Console U10; SDK is at 13 clients on main; B4 +
  U10 fully closed both directions.
- Originally-sketched CLI consumer swap is already on main (verified
  by inspecting `packages/cli/src/auth/{login,whoami,logout}.ts` —
  all three flows construct `Sourceplane` and use it as the wire).
- Roadmap B5 explicitly lists "ship a small `webhook-verifier`
  helper" as a leaf candidate (`specs/roadmap.md:81-82`).
- Pure external-consumer helper, zero coupling to internal workers,
  parallel-safe with the still-active Task 0096f verifier prompt
  (zero file overlap with `tests/api-edge/**`).
- Mirrors the proven `@saas/notifications-client` zero-deps shape.

## Next Task After 0105

After Task 0105 verifier PASS+MERGE, candidates in priority order:

- **B5 follow-ups** — rotate-UX, replay UI, failure-budget alerts
  (each likely its own task; the helper unblocks none of these
  directly, but B5 cluster polish is now in-flight).
- **B7 — Audit-log UX** (events-worker read API surfaces are live;
  console UI is the gap).
- **B8 — admin-worker scaffold** (spec 16 has no app yet).

## Out of scope (deferred, parked, untouched this cycle)

- `tests/api-edge/**` (sealed Task 0096f verifier prompt remains
  active and orthogonal — zero file overlap with Task 0105)
- `packages/cli/**` (CLI consumer swap is already on main; auth
  validation surface change is a backend-decision deferral)
- `apps/notifications-worker/**` (deferred provider-swap and
  dev-reframe)
- `infra/terraform/cloudflare-domain/**` and the cloudflare provider
  pin (deferred 0085b)
- `tooling/eslint/**` (sealed since Task 0092)
- Optional spec-13 CLI commands (`component list`, `resource
  create/get`, `deployment get`) — deferred behind P2 backend slice
- `apps/web-console/**` (Vite-based legacy console — not in U10
  roadmap)
- `kiox.lock` v2.3.0→v2.9.0 working-tree drift (unrelated to 0105;
  do NOT bundle into the PR)

## Repo Checkpoint

| Attribute | Value |
|-----------|-------|
| **Branch (local)** | `main` (synced with `origin/main`) |
| **HEAD** | `f01d61f` (verifier bookkeeping for Task 0104 PASS+MERGED) |
| **Repo health** | 🟢 Green |
| **Open PRs** | none |
| **Tasks completed** | 118 (through Task 0104) |
| **Current task** | 0105 (scoped — `@saas/webhook-verifier` helper, B5) |
| **Deferred** | `0085b`, `notifications-provider-swap`, `notifications-worker-dev-reframe`, `optional-spec-13-commands` |
| **Last verified main-CI run** | `26700942407` (post-Task-0104 merge, 4/4 SUCCESS) |
| **Console live URL** | `https://{stage,prod}.sourceplane.ai` (HTTP/2 307 → /orgs, `x-opennext: 1`, real Next app shell) |
| **`@saas/sdk` clients on main** | 13 (organizations, projects, memberships, apiKeys, webhooks, metering, billing, events, securityEvents, config, notifications, environments, auth) |
| **`@saas/cli` commands on main** | full spec-13 required surface live, dispatched through `@saas/sdk` |
| **Console SDK adoption** | `apps/web-console-next` consumes `Sourceplane` end-to-end (hand-rolled `ApiClient` deleted) |
| **Working-tree drift (out of scope)** | `kiox.lock` v2.3.0→v2.9.0 unstaged — do NOT bundle into Task 0105 |
