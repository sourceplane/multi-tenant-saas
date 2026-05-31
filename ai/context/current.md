# Current Context

Last updated: 2026-05-31 — Task 0106 closed (PASS+MERGED on
`a99788b`). Task **0107 SCOPED** (orchestrator) — adds the
`sourceplane webhook sign` CLI subcommand, the symmetric
counterpart to 0106's `webhook verify`. Pure local crypto consumer
of `signWebhookPayload` from `@saas/webhook-verifier`. Tight 5-path
PR boundary mirroring 0106. Sealed snapshot main: `4387f50`.

## Current Task — 0107 (scoped, awaiting implementer)

**Agent:** Implementer
**Prompt:** `ai/tasks/task-0107.md`
**Branch:** `impl/task-0107-cli-webhook-sign`
**Roadmap leg:** B5 — Webhooks polish (CLI sign symmetric to verify)
**Sealed snapshot main:** `4387f50`

### Surface

```
sourceplane webhook sign
  --secret=SECRET                 (required)
  --timestamp=UNIX_SECONDS        (required, integer)
  [--body=PATH]                   file bytes — mutex with piped STDIN
  [--output=human|json]           default human
```

Output (human): `signature: sha256=<hex>\ntimestamp: <ts>`.
Output (json): `{"signature":"sha256=...","timestamp":"..."}`.
Exit 0 on success, exit 2 on `UsageError`.

### PR boundary (≤ 5 paths)

- `packages/cli/src/commands/webhook-sign.ts` — NEW
- `packages/cli/src/cli-runner.ts` — register `["webhook","sign"]`
  route + help line
- `packages/cli/src/__tests__/webhook-sign.test.ts` — NEW, ≥ 12
  cases including round-trip integration with helper's
  `verifyWebhookSignature`
- `pnpm-lock.yaml` — likely no delta (helper dep already on
  `packages/cli` from 0106)
- `ai/reports/task-0107-implementer.md` — committed on PR branch
  (do NOT repeat 0106 missing-report gap)

### Hard rules

- Zero edits anywhere outside `packages/cli/**` (apps, sdk,
  contracts, console, tooling, tests/api-edge, infra, kiox.lock all
  forbidden).
- `packages/webhook-verifier/**` is locked from 0105 — do NOT touch.
- No `node:crypto` / `node:buffer` / Node-only crypto. Sign through
  `signWebhookPayload` only.
- Body bytes verbatim — no `.trim()`, no `JSON.parse`, no
  decode-then-re-encode.
- No new `eslint-disable` / `@ts-ignore` / `@ts-expect-error` /
  `as any`. The single `as unknown as StdinLike` boundary cast at
  the `process.stdin` seam (pattern from `webhook-verify.ts:179`)
  is acceptable.

### Acceptance gates

- `pnpm -r typecheck=0` across all 39 workspaces.
- `pnpm -r --no-bail lint` ≤ 45 warnings, all in
  `tests/api-edge/**`.
- `@saas/cli` build + test green with ≥ 123 total cases (existing
  111 + ≥ 12 new).
- Mandatory local e2e smoke 3 transcripts via
  `child_process.spawn` harness (sign+verify roundtrip green,
  sign+verify tampered → exit 4 `signature_mismatch`).
- `kiox -- orun validate / plan --changed --base origin/main / run
  --dry-run` green selecting ONLY `cli·{dev,stage,prod}·Verify`
  lanes.
- PR-CI 4/4 SUCCESS via `gh run view --log`.

## Pipeline status

- **Active task:** 0107 (Implementer, awaiting dispatch).
- **Open PRs:** none from orchestrator workflow.
- **`main` HEAD:** `4387f50` (Task 0106 verifier-PASS bookkeeping).
- **Working tree:** clean except long-standing unrelated `kiox.lock`
  v2.3.0→v2.9.0 drift (NOT bundled).

## Recommended Next Move (after 0107 PASS)

- **B5 rotate UX** (multi-PR shape — backend reveal-once changes
  required since rotate currently returns no plaintext: the
  webhooks-worker handler `randomHex(32)` then encrypts; never
  echoes — would need a `revealNewSecret`-style response shape
  change in contracts + worker + SDK + console).
- **B5 replay UI / failure-budget alerts** (similarly multi-PR).
- **B7 audit-log UX expansion** (events-worker reads already live;
  needs SDK + api-edge + contracts + console — multi-PR).
- **B8 admin-worker scaffold** (greenfield, larger).

## Deferred (unchanged)

- `0085b` — see `ai/deferred.md`.
- `notifications-provider-swap` — see `ai/deferred.md`.
- `notifications-worker-dev-reframe` — see `ai/deferred.md`.
- `optional-spec-13-commands` — see `ai/deferred.md`.
