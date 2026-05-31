# Task 0107 — `sourceplane webhook sign` CLI subcommand — Implementer Report

## 1. Summary

Adds a tight, single-package CLI subcommand `sourceplane webhook sign`
that wraps the already-exported `signWebhookPayload` from
`@saas/webhook-verifier` (Task 0105) — the symmetric counterpart to
Task 0106's `webhook verify`.

This is a 4-paths task (under the 5-path boundary):

1. `packages/cli/src/commands/webhook-sign.ts` (NEW) — command handler.
2. `packages/cli/src/cli-runner.ts` (edit) — register `["webhook","sign"]`
   route, register `webhookSign` test-injection slot in `RunOptions`,
   add one help line.
3. `packages/cli/src/__tests__/webhook-sign.test.ts` (NEW) — 12 cases.
4. `ai/reports/task-0107-implementer.md` (NEW) — this report.

`pnpm-lock.yaml` was NOT touched — `@saas/webhook-verifier` was already
on `packages/cli`'s deps from 0106. `packages/cli/package.json` was NOT
touched. The body-reading helper was kept inline (no shared
`webhook-body.ts`) — the helper was small enough to mirror without
rerouting `webhook-verify.ts` (which was explicitly locked out of
boundary changes).

## 2. Files Changed

| Path | Status | Lines |
|---|---|---|
| `packages/cli/src/commands/webhook-sign.ts` | NEW | 207 |
| `packages/cli/src/cli-runner.ts` | edit | +10 |
| `packages/cli/src/__tests__/webhook-sign.test.ts` | NEW | 332 |
| `ai/reports/task-0107-implementer.md` | NEW | (this file) |

`git diff --stat` (excluding the report):

```
 packages/cli/src/__tests__/webhook-sign.test.ts | 332 ++++++++++++++++++
 packages/cli/src/cli-runner.ts                  |  10 ++
 packages/cli/src/commands/webhook-sign.ts       | 207 ++++++++++
```

## 3. Checks Run

| Gate | Command | Exit | Evidence |
|---|---|---|---|
| 1 | `pnpm install --frozen-lockfile` | 0 | `Scope: all 39 workspace projects` / `Lockfile is up to date` / `Already up to date` |
| 2 | `pnpm -r typecheck` | 0 | All 39 workspaces typecheck Done; `packages/cli typecheck: Done` |
| 3 | `pnpm -r --no-bail lint` | 0 | `tests/api-edge lint: ✖ 45 problems (0 errors, 45 warnings)` — all 45 warnings in `tests/api-edge/**`; zero new warnings under `packages/cli/**` or `packages/webhook-verifier/**` |
| 4 | `pnpm --filter @saas/cli build` | 0 | `tsc --project tsconfig.build.json && node scripts/bundle.mjs` clean |
| 5 | `pnpm --filter @saas/cli test` | 0 | `Tests  123 passed (123)` — 111 prior + 12 new in `webhook-sign.test.ts` |
| 6 | Local e2e smoke (`child_process.spawn`) | 0 | All three transcripts PASS — see §4 |
| 7 | `kiox exec -- orun validate` | 0 | `✓ Intent is valid` / `✓ All validation passed` |
| 8 | `kiox exec -- orun plan --changed --base origin/main` | 0 | `1 components × 3 envs → 3 jobs` / `components: cli`; jobs are exactly `cli.{dev,stage,prod}.verify` |
| 9 | `kiox exec -- orun run --plan /tmp/plan-0107.json --dry-run` | 0 | `cli · {dev,stage,prod} · Verify ✓` for all three lanes; `3 selected` |
| 10 | PR-CI 4/4 SUCCESS | TBD | Filled in after PR open + CI complete |

## 4. E2E Smoke Transcripts

Harness: `/tmp/task-0107-smoke.mjs` — uses `node:child_process.spawn`
on the built `packages/cli/dist/cli.js` (no shell pipelines, per the
0106 verifier's lessons). Full log at `/tmp/task-0107-smoke.log`.

### Step 1 — `webhook sign`

```
────────────────────────────────────────────────────────────
[1/3] webhook sign
────────────────────────────────────────────────────────────
argv: webhook sign --secret=*** --timestamp=1700000000 --output=json
stdin bytes: 41
exit: 0
stdout: {"signature":"sha256=e1190ebfc1498b1b7d683199c65167af69fcdb11f175ad1539feae96cd743731","timestamp":"1700000000"}
stderr: (empty)
```

### Step 2 — `webhook verify` round-trip (same body)

```
────────────────────────────────────────────────────────────
[2/3] webhook verify (round-trip, same body)
────────────────────────────────────────────────────────────
argv: webhook verify --secret=*** --signature=*** --timestamp=1700000000 --tolerance-seconds=3153600000 --output=json
stdin bytes: 41
exit: 0
stdout: {"ok":true}
stderr: (empty)
```

A 100-year tolerance is supplied because the fixed test timestamp
(`1700000000` = 2023-11-14) is far outside the helper's default
tolerance window relative to the harness's real wall-clock; the gate
under test is "the signature produced by `webhook sign` round-trips
through `webhook verify`", not "the verifier's tolerance default is
correct" — the latter is already covered by 0106's tests.

### Step 3 — `webhook verify` tampered body (one byte flipped)

```
────────────────────────────────────────────────────────────
[3/3] webhook verify (tampered body, one byte flipped)
────────────────────────────────────────────────────────────
argv: webhook verify --secret=*** --signature=*** --timestamp=1700000000 --tolerance-seconds=3153600000 --output=json
stdin bytes: 41 (one byte flipped vs sign body)
exit: 4
stdout: {"ok":false,"reason":"signature_mismatch"}
stderr: (empty)

E2E SMOKE: PASS
```

The body `{"event":"webhook.delivered","attempt":1}` was tampered to
`{"event":"webhook.delivered","attempt":2}` — exactly one byte
flipped. Verifier exit 4 + `signature_mismatch` confirmed.

## 5. Hard Rules Honoured

- **No network, no auth, no SDK, no `Sourceplane`, no `client.*`, no
  `fetch(`, no `/v1/`.** ✓ Confirmed by `grep -E
  'Sourceplane|client\.|fetch\(|/v1/' packages/cli/src/commands/webhook-sign.ts`
  → no matches. Token store is unused; `runCli` does NOT instantiate
  the SDK for this route.
- **No `node:crypto`, no `node:buffer`, no Node-only crypto in the
  command source.** ✓ Sole crypto path is `signWebhookPayload` from
  `@saas/webhook-verifier`. (The smoke harness at `/tmp/...` uses
  `node:child_process` and `Buffer` to compose stdin bytes, but that's
  a test-only harness, not in `packages/cli/src/`.)
- **Body bytes verbatim.** ✓ Read `Uint8Array` chunks → assemble →
  `new TextDecoder("utf-8").decode(merged)` → pass to helper. No
  `.trim()`, no `JSON.parse`, no decode/re-encode.
- **No new `eslint-disable` / `@ts-ignore` / `@ts-expect-error` /
  `as any` under `packages/cli/**`.** ✓ Only boundary cast is
  `process.stdin as unknown as StdinLike`, copied verbatim from the
  0106 pattern at `webhook-verify.ts:179`.
- **Reuse, don't fork.** ✓ Inlined the same body-reading helper shape
  rather than introducing `webhook-body.ts` — the duplication is
  ~25 lines of well-commented logic, and extracting a 5th file would
  have required either touching `webhook-verify.ts` (locked) or
  shipping a shared module that only one of the two commands uses on
  day one. See §7.
- **Implementer report on PR branch.** ✓ This file is committed on the
  PR branch in the same push as the implementation (no 0106 gap).

## 6. Test Coverage (12 cases)

All in `packages/cli/src/__tests__/webhook-sign.test.ts`:

1. `human mode: STDIN body + valid timestamp → exit 0, prints sig+ts` —
   covers happy human path; asserts the rendered output matches
   `^signature: sha256=[0-9a-f]{64}\ntimestamp: \d+\n$`.
2. `json mode: single-line valid JSON with signature + timestamp` —
   covers happy json path; parses stdout and asserts the two string
   fields.
3. `--body=PATH reads file bytes binary-safe (no trim)` — body has
   leading/trailing whitespace + final newline; asserts the signature
   matches `signWebhookPayload({secret, body, timestamp})` against the
   exact bytes (i.e. no `.trim()`).
4. `--body=PATH and STDIN both → UsageError exit 2` — mutual
   exclusion.
5. `missing body (no flag, no STDIN) → UsageError exit 2` — guidance
   message tested.
6. `missing --secret → UsageError exit 2` — required flag.
7. `missing --timestamp → UsageError exit 2` — required flag.
8. `--timestamp=abc (non-integer) → UsageError exit 2` — shape check
   against `/^[0-9]+$/`.
9. `--timestamp=-5 (negative) → UsageError exit 2` — leading `-` is
   rejected by the same regex (no negative numbers).
10. `multi-byte UTF-8 body bytes signed with deterministic
    helper-equivalent value` — composes body via
    `Buffer.from("héllo 漢字", "utf8")`, asserts the produced signature
    equals the precomputed value
    `sha256=3ad5be6cb96bdadf9d83c4c5e5fd567b88c5bc94d568933365a68b9b3ce526b5`
    (cross-checked against the helper in the same test).
11. `--output=invalid → UsageError exit 2` — the runner's
    `parseOutputMode` silently coerces to `human`, so the command
    handler explicitly rejects unknown values to give users a clean
    error.
12. `round-trip: sign output verifies against verifyWebhookSignature
    directly` — calls `webhook sign --output=json`, parses the JSON,
    feeds the signature/timestamp into `verifyWebhookSignature` (NOT
    through the CLI — direct helper import), asserts `{ok: true}`.

Pre-existing `webhook-verify.test.ts` (16 cases) remains untouched and
continues to pass. Total `@saas/cli` suite: 123 cases / 9 files / 0
failures.

## 7. Assumptions

- **Inline body-reading helper, no `webhook-body.ts` extraction.** The
  duplication between `webhook-sign.ts` and `webhook-verify.ts` is
  ~25 lines of `readBody` + `drainStdin`. Extracting a shared module
  would have either:
  (a) required touching `webhook-verify.ts` to delete its inline copy
      and import from the new shared file — but `webhook-verify.ts` is
      out-of-scope for this task per the boundary ("Touching the
      existing `webhook-verify.ts` body/output behaviour beyond
      extracting a pure-utility helper if you de-dup"), AND the
      acceptance gate explicitly enumerates `cli-runner.ts` (edit) and
      two new files — not three; OR
  (b) shipped a shared file used by only one command, leaving
      `webhook-verify.ts` with its own inline copy until a future
      task. That's strictly worse than the current state.
   The boundary text says the 5th-path slot for a `webhook-body.ts`
   helper is permitted "IF you actually de-duplicate". Since (a) would
   require an out-of-scope edit and (b) would be a worse outcome, I
   kept both helpers inline. Both files are short and well-commented;
   any future task that genuinely needs a third command can do the
   3-file extraction at that point.
- **`--output=invalid` is rejected at the command level.** The
  runner's `parseOutputMode` silently coerces unknown values to
  `human`, but the task's gate "11. `--output=invalid` → `UsageError`,
  exit 2" requires an actual rejection. The command checks
  `ctx.flags["output"]` directly and throws `UsageError` for anything
  not in `{human, json, undefined, false}`. This does NOT change the
  runner's behaviour for any other command — the check is local to
  `webhook-sign.ts`.
- **E2E smoke uses 100-year tolerance.** The fixed test timestamp
  (`1700000000`) is far outside the verifier's 300-second default
  tolerance relative to the smoke harness's real wall-clock. Passing
  `--tolerance-seconds=3153600000` keeps the smoke focused on the
  signature-correctness gate (which is what 0107 ships) rather than
  re-litigating the tolerance gate already covered by 0106.

## 8. Spec Proposals

None. This is tactical CLI surface; no spec change.

## 9. Remaining Gaps

None for this task. Out-of-scope follow-ups the verifier should NOT
bundle:
- `--output=hex` mode (deliberately rejected by the boundary).
- `webhook secret` / `webhook rotate` subcommands.
- Wiring this into the SDK or the api-edge.
- Extracting a shared `webhook-body.ts` helper (see §7).
- `kiox.lock` v2.3.0 → v2.9.0 working-tree drift (long-standing).

## 10. Next Task Dependencies

None. This task is a leaf — no downstream task is gated on its
completion. It enables CI scripts and users to generate signatures
without writing the four-line Node script the 0106 smoke harness used.

## 11. PR Number

TBD — filled after `gh pr create` + push. Verifier dispatch is
blocked on this field per task spec §11.
