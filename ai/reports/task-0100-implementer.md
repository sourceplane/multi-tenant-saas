# Task 0100 Implementer Report — `packages/cli` scaffold

Branch: `impl/task-0100-packages-cli-scaffold`
Status: complete
PR Number: TBD (filled in after `gh pr create`)

## Summary

- **Framework**: hand-rolled command router (`src/router.ts`). One-line
  rationale: zero new runtime deps for argv parsing, fully typed handler
  contract, ~70 lines of logic; the surface (login/logout/whoami + 4 read
  commands) is well below the threshold where `commander`/`cac` start
  paying for themselves.
- **Auth flow**: token-paste fallback. Spec 13 left device-flow as
  optional and `apps/api-edge` does not yet expose a device-flow endpoint
  (B4 second-half). `sourceplane login` accepts `--token` (or prompts
  interactively), validates by calling `client.organizations.list()`,
  persists `{ apiUrl, token }`, and rejects with an actionable message on
  401. Switching to device-flow when the endpoint lands is a one-line
  dispatch in `auth/login.ts`.
- **Token store adapters**: `KeychainTokenStore` (lazy `keytar`,
  service `sourceplane-cli`) + `FileTokenStore`
  (`~/.config/sourceplane/credentials.json`, mode 0600 on POSIX, parent
  dir 0700, graceful Windows fallback). `selectTokenStore()` prefers
  keychain when `keytar` loads; otherwise file. Both are tested via DI.
  `keytar` is in `optionalDependencies`, dynamic-imported only inside the
  keychain adapter — `packages/cli/src/index.ts` stays loadable in
  Workers/Bun.
- **Pilot read-only commands**: `login`, `logout`, `whoami`, `org list`,
  `org use <id>`, `org members`, `project list`. All seven dispatch
  through `@saas/sdk` clients (no direct transport access in production
  code).
- **Tests**: 51 it()s across the 6 listed test files (cli=6, output=12,
  token-store=10, auth=7, context=6, commands=10). Target was ≥30.

## Files Changed

Workspace scaffold:
- `packages/cli/package.json`, `tsconfig.json`, `tsconfig.build.json`,
  `eslint.config.js`, `vitest.config.ts`, `.gitignore`, `README.md`
- `packages/cli/component.yaml` — mirrors `packages/sdk/component.yaml`
  (`turbo-package`, `quick-check` × {dev,stage,prod}, `domain:
  starter-cli`, `surface: cli`, `team: platform`, `layer: shared`)
- `packages/cli/scripts/bundle.mjs` — esbuild step that produces
  `dist/cli.js` from `src/cli.ts` (necessary because `@saas/sdk`'s
  `exports."."` points at raw `.ts`; tsc emits a working `dist/` for
  types/maps and the bundler produces the runnable binary)

Framework:
- `src/cli.ts` — argv entrypoint with shebang
- `src/cli-runner.ts` — dispatch logic, DI seams (stdout/stderr/token
  store/context store/sdk factory/configDir)
- `src/router.ts` — `Router` + `parseArgv` (positional vs `--flag=value`
  / `--flag` boolean)
- `src/version.ts` — `CLI_VERSION` constant
- `src/index.ts` — public package index (no `keytar` at import time)

Auth:
- `src/auth/login.ts`, `auth/logout.ts`, `auth/whoami.ts`

Token store:
- `src/token-store/types.ts` — `TokenStore` adapter interface
- `src/token-store/file.ts` — POSIX-safe credentials.json (0600, parent 0700)
- `src/token-store/keychain.ts` — lazy `keytar` (optional dep)
- `src/token-store/select.ts` — keychain → file fallback selection
- `src/token-store/index.ts`

Context:
- `src/context/store.ts` — `~/.config/sourceplane/config.json`
  (`activeOrgId`, `lastApiUrl`)

Output:
- `src/output/index.ts` — `parseOutputMode` + `formatOutput` (human
  table/kv vs JSON envelope; deterministic shapes asserted in tests)

Errors:
- `src/errors.ts` — `MissingAuthError`, `UsageError`, plus
  `formatCliError` translating `SourceplaneError` subclasses
  (`UnauthenticatedError`, etc.) to actionable CLI messages with request
  IDs and non-zero exit codes

Commands:
- `src/commands/index.ts` — pilot read-only handlers wiring the SDK to
  the formatter

Tests (`packages/cli/src/__tests__/`):
- `helpers.ts` — DI fakes (in-memory token/context stores, stdout/stderr
  capture, fake `Sourceplane`)
- `cli.test.ts`, `output.test.ts`, `token-store.test.ts`,
  `auth.test.ts`, `context.test.ts`, `commands.test.ts`

Other:
- `packages/cli/src/prompt.ts`, `config-paths.ts` — small helpers
- `pnpm-lock.yaml` — workspace `packages/cli` entry + esbuild devDep
- `ai/reports/task-0100-implementer.md` — this report

## Checks Run

```
pnpm install                                       → OK
pnpm --filter @saas/cli build                      → OK (tsc + bundle.mjs)
node packages/cli/dist/cli.js --help                → exit 0, prints help
head -1 packages/cli/dist/cli.js                    → "#!/usr/bin/env node"
pnpm --filter @saas/cli typecheck                  → exit 0
pnpm --filter @saas/cli lint                       → exit 0, 0 warnings
pnpm --filter @saas/cli test                       → 51 tests pass (6 files)
pnpm -r typecheck                                  → exit 0 (Task 0091 baseline)
pnpm -r --no-bail lint                             → exactly 45 warnings,
                                                     all in tests/api-edge
                                                     (Task 0096f territory);
                                                     CLI contributes 0
hazard scan packages/cli/                          → 0 hits
                                                     (eslint-disable | @ts-ignore
                                                      | @ts-expect-error
                                                      | as unknown as | as any)
./.workspace/bin/orun validate --intent intent.yaml          → "Intent is valid"
./.workspace/bin/orun component --intent intent.yaml --long  → cli discovered
                                                                domain: starter-cli
                                                                envs: dev/stage/prod
./.workspace/bin/orun plan --changed --intent intent.yaml \
    --output /tmp/plan.json                                  → 1 component × 3 envs
                                                                cli.{dev,stage,prod}.verify
                                                                profile: turbo-package.quick-check
./.workspace/bin/orun run --plan /tmp/plan.json --dry-run \
    --runner github-actions                                  → 3/3 ✓
```

Hazard scan command literal:
```sh
grep -RnE '(eslint-disable|@ts-ignore|@ts-expect-error|as unknown as|as any\b)' \
  packages/cli/ | grep -v node_modules | grep -v dist
```
→ 0 lines.

## Assumptions

- **Auth flow**: device-flow endpoint not yet on `apps/api-edge`. Shipped
  token-paste flow that validates the token by calling
  `client.organizations.list()` before persisting. Switch to device-flow
  is a one-line dispatch in `auth/login.ts` once the endpoint lands.
- **Build pipeline**: `@saas/sdk`'s `exports."."` resolves to
  `./src/index.ts` (workspace convention — sdk consumers in this repo
  use the bundler-resolution mode). Node ESM cannot load that directly,
  so the CLI bin is produced by an esbuild step that bundles the
  `@saas/sdk` source into `dist/cli.js`. tsc still runs first to emit
  `.d.ts` and to enforce the strict project config (composite,
  declarationMap, etc.). `keytar` stays external in the bundle so it
  remains an optional runtime dep. This keeps the constraint
  ("No change to `@saas/sdk`") intact.
- **Output stability**: JSON envelopes contain only data the CLI was
  asked to render or the SDK returned. No CLI-side timestamps or
  request-IDs are injected; request-IDs that flow through error
  envelopes come from the SDK's `SourceplaneError` subclasses.

## Spec Proposals

None. The pilot command surface is a strict subset of spec 13 commands;
no surface deviation. Write commands (`org invite`, `project create`,
`env create`, `api-key create`, `webhook create`) are explicitly Task
0101.

## Remaining Gaps (for Task 0101)

- Write commands: `org invite`, `project create`, `env create`,
  `api-key create`, `webhook create`. Each must accept
  `--idempotency-key` and forward it through the SDK. Caller-owned
  idempotency: the CLI must NOT auto-generate keys.
- Cross-resource read: `usage summary`, `billing summary`, `audit list`.
- Optional spec 13 commands (gated): `component list`, `resource get`,
  `deployment get`.
- Console U10 refactor (consume the SDK) — gated on B4 fully closing.
- Device-flow swap in `auth/login.ts` once the API endpoint exists.
- Publishing config (npm tarball, oclif manifest, brew tap), shell
  completions, and `--profile` multi-account UX are explicitly post-B4.

## PR Number

TBD — filled in after `gh pr create` in the next step.
