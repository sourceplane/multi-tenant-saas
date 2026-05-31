# Task 0107 — Verifier Report

## Result: PASS

`sourceplane webhook sign` CLI subcommand merged into `main`. PR #162
squash-merged at commit `e08d106`. Post-merge main-CI run
`26703647036` 4/4 SUCCESS (`plan` + `cli · {dev,stage,prod} · Verify`).

## Sealed inputs echo

| Field | Value |
|---|---|
| PR | #162 |
| URL | https://github.com/sourceplane/multi-tenant-saas/pull/162 |
| Branch | `impl/task-0107-cli-webhook-sign` |
| Hand-off PR HEAD | `7157f21b37fc75dfbb1f0d8fd32d405a0e176b3f` (PR-CI run `26703256895` — 4/4 SUCCESS) |
| Post-rebase PR HEAD (merge gate) | `736dad25491ab2c9fd42fe3e39be3f8552b8cabf` (PR-CI run `26703619248` — 4/4 SUCCESS) |
| Sealed snapshot main | `16eaae9` (Task 0107 scope commit) |
| Pre-merge main HEAD | `f13fb04` (orchestrator verifier-dispatch commit) |
| Squash on main | `e08d1063cf09d5f3e51f71746e535145d0732622` |
| Post-merge main-CI run | `26703647036` (4/4 SUCCESS) |
| Implementer report on PR branch | committed at hand-off (no Phase-0 fix-up needed) |

## Phase 0 — Working dir + readiness

- `git fetch origin --prune` clean; `main` at `f13fb04` ≥ `16eaae9` ✓
  (orchestrator-dispatch commit advanced HEAD as expected — recurring
  pattern; PR shows `BEHIND` post-fetch).
- `git fetch origin pull/162/head:pr-162-verify` resolved to HEAD
  `7157f21` (matches sealed value).
- Implementer report readiness:
  `git ls-tree -r HEAD --name-only | grep '^ai/reports/task-0107-implementer\.md$'`
  → hit. No fix-up required.

## Phase 1 — PR sanity

`gh pr view 162 --json …` →
`OPEN`, `MERGEABLE`, base `main`, head
`impl/task-0107-cli-webhook-sign`, not draft, +818/-0, 4 changed files.

`gh pr diff 162 --name-only | sort`:
```
ai/reports/task-0107-implementer.md
packages/cli/src/__tests__/webhook-sign.test.ts
packages/cli/src/cli-runner.ts
packages/cli/src/commands/webhook-sign.ts
```
4 paths, all in scope. Forbidden globs (`apps/**`,
`packages/sdk/**`, `packages/contracts/**`,
`packages/webhook-verifier/**`, `apps/web-console-next/**`,
`tooling/**`, `tests/api-edge/**`, `kiox.lock`, `infra/**`, other
`packages/*`, `packages/cli/package.json`, `pnpm-lock.yaml`) — zero
hits. `packages/cli/src/commands/webhook-verify.ts` (Task 0106 lock)
NOT in diff ✓.

`git log origin/main..pr-162-verify --oneline`:
```
7157f21 docs(task-0107): record PR #162 in implementer report
6298ef1 Task 0107: sourceplane webhook sign CLI subcommand
```
Both commits by the implementer.

## Phase 2 — Hazard + boundary scan

All exit codes captured from `git grep -nE …` against the PR-branch
checkout:

| Pattern | Target | Hits | Notes |
|---|---|---|---|
| `eslint-disable\|@ts-ignore\|@ts-expect-error\|as any` | the 3 changed CLI source files | 0 (rc=1) | clean |
| `as unknown as` | `webhook-sign.ts` | 1 (rc=0) | line 188 — exact `process.stdin as unknown as StdinLike` boundary cast pattern from `webhook-verify.ts:179`; documented in impl report §5; permitted |
| `from ['\"]node:` | `webhook-sign.ts` | 1 (rc=0) | line 26 — `import { promises as fs } from "node:fs"` for `--body=PATH` file I/O. Mirrors `webhook-verify.ts:23` exactly (same node:fs import). Not a crypto bypass; helper handles all crypto. Permitted as the symmetric body-reading shape. |
| `require\(['\"]node:` | `webhook-sign.ts` | 0 (rc=1) | clean |
| `from ['\"](crypto\|buffer\|util)['\"]` | `webhook-sign.ts` | 0 (rc=1) | no bare-name node-builtins |
| `Sourceplane\|client\.\|fetch\(\|/v1/` | `webhook-sign.ts` | 1 (rc=0) | line 2 — comment string only (`// Sourceplane outbound webhook payload`); no SDK, no `client.`, no `fetch(`, no `/v1/` route in code |
| `\.trim\(\|JSON\.parse` | `webhook-sign.ts` | 2 (rc=0) | lines 11 + 85 — comment strings only documenting that the helper does NOT `.trim()`/`JSON.parse` body bytes; no `.trim()` or `JSON.parse` against body bytes themselves |
| `packages/cli/package.json` in diff | — | NO | no dep delta |
| `pnpm-lock.yaml` in diff | — | NO | no lockfile delta |

Source inspection of `packages/cli/src/commands/webhook-sign.ts`:

- Imports `signWebhookPayload` from `@saas/webhook-verifier` (no
  `node:crypto.createHmac`).
- `--secret` and `--timestamp` required via `readRequiredString` /
  `readTimestamp` → `UsageError` on missing → exit 2 via
  `formatCliError`.
- `--body=PATH` optional; STDIN drained when not provided. Both
  supplied → `UsageError`. `--body` flag without value (`true`) →
  `UsageError`.
- Body bytes UTF-8 decoded once, passed verbatim to helper. No
  `.trim()` or `JSON.parse` against the body code path.
- `--timestamp` validated as `^[0-9]+$` plus
  `Number.isFinite/n>=0/Number.isInteger` (negatives explicitly
  rejected).
- `--output=human|json` controls success shape; `human` emits two
  stdout lines (`signature: sha256=<hex>` then `timestamp: <ts>`),
  `json` emits a single line. Unknown `--output` value → `UsageError`
  exit 2 (command-level rejection, not runner coercion).
- All output goes via `ctx.stdout(...)`. Exit code carries the signal.
- No exit-4 path — `sign` is one-shot.

`cli-runner.ts` diff: registers `["webhook", "sign"]` route mirroring
`["webhook", "verify"]`; `RunOptions` gains `webhookSign` test-injection
slot; help block lists the new subcommand. No unrelated edits.

`__tests__/webhook-sign.test.ts`: 12 `it(...)` cases. Vitest reports
`(12 tests)` for the file. Coverage shapes (all present): happy-path
human + json, `--body=PATH` binary-safe, `--body=PATH` ⊕ STDIN
mutex, missing body, missing `--secret`, missing `--timestamp`,
`--timestamp=abc`, `--timestamp=-5`, multi-byte UTF-8 deterministic
signature, `--output=invalid`, round-trip via
`verifyWebhookSignature` direct helper import.

## Phase 3 — Quality gates

1. `pnpm install --frozen-lockfile`:
   ```
   Scope: all 39 workspace projects
   Lockfile is up to date, resolution step is skipped
   Already up to date
   Done in 657ms using pnpm v10.12.1
   ```
   exit 0.

2. `pnpm -r typecheck`: exit 0. Workspace count remained 39 (Turbo
   summary `Scope: 38 of 39 workspace projects` — 38 ran, 1 has no
   `typecheck` script; total workspaces = 39 unchanged from Task
   0105). All 38 finished `Done`. Tail of output included
   `packages/cli typecheck: Done`.

3. `pnpm -r --no-bail lint`: 45 warnings total, all in
   `tests/api-edge` (single `✖ 45 problems (0 errors, 45 warnings)`
   line for `tests/api-edge`). Verification:
   `pnpm -r --no-bail lint 2>&1 | grep -E '^/.+: warning' | grep -v 'tests/api-edge/'`
   returned empty. Zero warnings under `packages/cli/**` or
   `packages/webhook-verifier/**`.

4. `pnpm --filter @saas/cli build`: exit 0
   (`tsc --project tsconfig.build.json && node scripts/bundle.mjs`).

5. `pnpm --filter @saas/cli test`: exit 0. Vitest summary:
   ```
    Test Files  9 passed (9)
         Tests  123 passed (123)
   ```
   Per-file: token-store 10, auth 7, cli 6, **webhook-sign 12**,
   webhook-verify 16, commands 10, output 12,
   writes-and-cross-reads 44, context 6 → 123 cases (exactly
   111 + 12).

6. **Local e2e smoke** (re-run from this checkout against built
   `packages/cli/dist/cli.js`):

   ```
   === A: webhook sign --output=json (stdin body) ===
   exit: 0
   stdout: {"signature":"sha256=c712493c463bc56022918c4f91b71c0848c45ab9e41bba1dc00d496e17cb42ef","timestamp":"1700000000"}

   === B: webhook verify (matching body via stdin, big tolerance) ===
   exit: 0
   stdout: {"ok":true}

   === C: webhook verify (TAMPERED body via stdin) ===
   exit: 4
   stdout: {"ok":false,"reason":"signature_mismatch"}
   ```
   Inputs: secret `whsec_smoketest_0107_supersecret_value`, ts
   `1700000000`, body `{"event":"foo","data":{"x":1}}`, tolerance
   `3153600000`. Tampered body flips `foo` → `fop`. All three
   transcripts match expectations. Round-trip equivalence with
   Task 0106 `webhook verify` confirmed.

7. Tolerated pre-existing failure: not encountered in CLI scope; CLI
   tests were 9/9 files green. No `tests/db/migrations.test.ts` run in
   this filtered scope.

## Phase 4 — Orun gates

- `kiox -- orun validate`: `✓ Intent is valid` / `✓ All validation passed`.
- `kiox -- orun plan --changed --base origin/main --intent intent.yaml --output /tmp/plan-0107.json`:
  ```
  1 components × 3 envs → 3 jobs
  components: cli
  mode: changed-only
  plan: 10229e4181b0
  ```
  Plan jobs:
  ```
  cli · dev · cli · dev · Verify
  cli · stage · cli · stage · Verify
  cli · prod · cli · prod · Verify
  ```
  Exactly the cli `turbo-package` Verify lanes — 1 component × 3
  envs = 3 jobs. No `deploy` lane. No unrelated components.
- `kiox -- orun run --plan /tmp/plan-0107.json --dry-run --runner github-actions`:
  ```
  ● cli
  │  ├─ ✓ dev  Verify  0.0s
  │  ├─ ✓ stage  Verify  0.0s
  │  └─ ✓ prod  Verify  0.0s
  ◌ Preview ready in 0.0s
  3 selected
  ```

## Phase 5 — PR-CI inspection

Hand-off HEAD `7157f21` PR-CI run `26703256895`:
```
plan                       — SUCCESS  04:30:59 → 04:31:05
cli · dev · Verify         — SUCCESS  04:31:07 → 04:31:36
cli · stage · Verify       — SUCCESS  04:31:07 → 04:31:39
cli · prod · Verify        — SUCCESS  04:31:07 → 04:32:14
```

`gh run view 26703256895 --log` confirmed actual lane execution lines
(per-lane `Run orun run \` output: pnpm setup, install, build,
typecheck, test, lint completing). Not just summary; real lane work.

Post-rebase HEAD `736dad2` PR-CI run `26703619248`
(re-fired after `gh pr update-branch` produced a stale-merge HEAD —
see notes below):
```
plan                       — SUCCESS  04:51:46 → 04:51:53
cli · dev · Verify         — SUCCESS  04:31:07 → 04:32:37 (sic; rebased run)
cli · stage · Verify       — SUCCESS  04:51:55 → 04:52:32
cli · prod · Verify        — SUCCESS  04:51:55 → 04:52:52
```
4/4 SUCCESS at the merge HEAD.

## Phase 6 — Squash merge + post-merge watch

PR was `BLOCKED`/`BEHIND` after Phase 5 (orchestrator dispatch commit
`f13fb04` advanced main past PR base `16eaae9`). Ran
`gh pr update-branch 162` per recurring pattern — produced merge
commit `5d437cd` on PR branch but did NOT trigger fresh CI on the
auto-generated head (GitHub did not re-fire workflow on the
update-branch merge commit). Per the verifier playbook for that
edge case: rebased locally onto `origin/main` and force-pushed
(`git rebase origin/main` then `git push --force-with-lease`),
producing new HEAD `736dad2`. Fresh CI fired (`26703619248`) and
returned 4/4 SUCCESS.

`gh pr merge 162 --squash --delete-branch` succeeded on the rebased
HEAD. Squash commit on main: `e08d106` ("Task 0107: sourceplane
webhook sign CLI subcommand (#162)").

Post-merge main-CI run `26703647036` (turbo-package shape — no
deploy profile, no live-URL surface):
```
plan                       — SUCCESS  04:53:22 → 04:53:33  (~11s)
cli · dev · Verify         — SUCCESS  04:53:35 → 04:54:03  (~28s)
cli · stage · Verify       — SUCCESS  04:53:36 → 04:54:14  (~38s)
cli · prod · Verify        — SUCCESS  04:53:36 → 04:54:42  (~66s)
```
4/4 SUCCESS. Run conclusion: `success`.

## Phase 7 evidence — `webhook-verify.ts` lock preserved

`packages/cli/src/commands/webhook-verify.ts` is NOT in
`gh pr diff 162 --name-only`. Task 0106 boundary preserved. The
implementer chose the inline body-reading path over the optional
shared-helper de-dup pattern (impl report §7); accepted.

## Phase 7 evidence — e2e smoke transcripts

Reproduced verbatim above under Phase 3 step 6. Sign exit 0 with valid
sha256 + timestamp. Verify against matching body exit 0
(`{"ok":true}`). Verify against tampered body exit 4
(`{"ok":false,"reason":"signature_mismatch"}`). Round-trip equivalence
with Task 0106 confirmed.

## Caveats

- `kiox.lock` working-tree drift (v2.3.0→v2.9.0) remains untouched on
  `main` per long-standing rule; not staged.
- `gh pr update-branch` produced a no-op merge HEAD that did not
  re-fire CI (recurring GitHub edge case for merge-of-main); resolved
  by rebase-and-force-push to a clean HEAD. Both PR-CI runs (sealed
  hand-off `26703256895` and post-rebase `26703619248`) recorded.
- No tolerated pre-existing failure encountered (CLI-filtered tests
  were 9/9 green; full repo test matrix was not re-run in this
  verification — local gates filtered to CLI scope per Phase 3).

## Recommended next move

B5 — `webhook secrets rotate` UX (canonical operational pain point;
backend reveal-once secret + dual-secret window + audit hook), as the
B5 dogfood arc is now closed with this verifier PASS. Alternative
candidates per Phase prompt: B5 replay UI / failure-budget alerts
(console-only); B7 audit-log UX expansion (multi-PR);
B8 admin-worker scaffold (greenfield breather). Orchestrator picks at
next pass.

## PR Number

**#162** — https://github.com/sourceplane/multi-tenant-saas/pull/162.
Squash on main: `e08d106`. Post-merge main-CI run: `26703647036`
(4/4 SUCCESS).
