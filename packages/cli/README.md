# `@saas/cli`

`sourceplane` — first-class TypeScript CLI for the Sourceplane control
plane. Wraps `@saas/sdk` (the only transport allowed) and surfaces a
small set of read-only commands today; write commands land in Task 0101.

## Install (workspace)

This package is internal to the `multi-tenant-saas` monorepo and is not
published. Build the binary with:

```sh
pnpm --filter @saas/cli build
node packages/cli/dist/cli.js --help
```

## Pilot commands (Task 0100)

```
sourceplane login    [--api-url=URL] [--token=BEARER]
sourceplane logout
sourceplane whoami
sourceplane org list
sourceplane org use <org-id>
sourceplane org members
sourceplane project list
```

All commands accept `--output=human|json`. JSON mode emits one document
per invocation; on error, `{ "error": { "code", "message", "requestId? } }`.

## Auth

The shipped V1 is **token-paste**: `sourceplane login` prompts for a
Bearer token, validates it via `client.organizations.list()`, and stores
it. Switching to a device-flow grant once api-edge ships
`/v1/auth/device/{start,poll}` is a one-line dispatch in
`src/auth/login.ts`.

Token storage:
- `KeychainTokenStore` (preferred): macOS Keychain / Windows Credential
  Vault / Secret Service via `keytar` (lazy import; in
  `optionalDependencies`).
- `FileTokenStore` fallback: `~/.config/sourceplane/credentials.json`,
  mode **0600**, parent directory mode **0700**.

Active organization context lives at
`~/.config/sourceplane/config.json` (mode 0644, not a secret). Override
both via `SOURCEPLANE_CONFIG_DIR` (used by tests).

## Output stability

JSON output is deterministic given a deterministic SDK response. The CLI
adds **no** timestamps to JSON envelopes. `formatOutput()` is the only
emission path and is fully covered by tests.

## Hazards / constraints

- Zero hazards under `packages/cli/**`. The hazard set is the same as
  the rest of the monorepo: disabled-eslint comments, ts-ignore,
  ts-expect-error, and force-cast escape hatches via `as` chains.
- The package index (`src/index.ts`) is loadable in non-Node hosts; the
  keychain adapter dynamic-imports `keytar` only when needed.
- Idempotency-Key is **caller-owned**. This PR ships no write commands;
  Task 0101 wires `--idempotency-key` through to the SDK.

## Testing

```sh
pnpm --filter @saas/cli typecheck
pnpm --filter @saas/cli lint
pnpm --filter @saas/cli test
pnpm --filter @saas/cli build
```

## Related

- `specs/components/13-cli-and-sdk.md` — surface contract.
- `packages/sdk` — the only allowed transport.
- Task 0101 — write commands + remaining read-only fan-out.
