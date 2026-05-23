# Task 0013 — Implementer Report

## Summary

Created the Identity Worker auth runtime (`apps/identity-worker`) exposing
passwordless email-code login via four auth routes and a health endpoint. Added
auth contract types to `@saas/contracts` and a comprehensive test suite in
`tests/identity-worker` (32 tests). The worker uses the Task 0012 repository
adapters for persistence with proper hashing of codes and tokens.

## Files Changed

### `packages/contracts` (auth contract types)
- `src/auth.ts` — NEW: Request/response types for the auth API surface
- `package.json` — Added `"./auth"` subpath export
- `src/index.ts` — Re-exports auth types

### `apps/identity-worker` (worker app)
- `package.json` — Package manifest
- `tsconfig.json` — TypeScript config extending worker base
- `wrangler.jsonc` — Environment config with Hyperdrive bindings
- `component.yaml` — Orun cloudflare-worker-turbo component
- `eslint.config.js` — Linting config
- `src/env.ts` — Env interface
- `src/crypto.ts` — SHA-256 hashing via Web Crypto
- `src/ids.ts` — Crypto-safe ID generation (usr_, ses_, chl_, req_ prefixes)
- `src/http.ts` — Response envelope helpers and bearer token extraction
- `src/services/auth.ts` — Auth service orchestrating repository + crypto
- `src/handlers/health.ts` — Health endpoint with DB and debug-delivery status
- `src/handlers/login-start.ts` — POST /v1/auth/login/start
- `src/handlers/login-complete.ts` — POST /v1/auth/login/complete
- `src/handlers/session.ts` — GET /v1/auth/session
- `src/handlers/logout.ts` — POST /v1/auth/logout
- `src/router.ts` — Route dispatch with request ID handling
- `src/index.ts` — Worker entrypoint

### `tests/identity-worker` (test package)
- `package.json` — Jest 29 + ts-jest ESM config
- `tsconfig.json` — Path aliases for workspace packages
- `component.yaml` — Orun turbo-package test component
- `eslint.config.js` — Linting config
- `src/helpers/fake-repository.ts` — In-memory IdentityRepository implementation
- `src/auth-service.test.ts` — 27 tests covering all auth flows
- `src/envelope.test.ts` — 5 tests for envelope contract and debug delivery boundary

### Root
- `pnpm-lock.yaml` — Updated workspace resolution

## Auth Behavior and Environment Boundaries

| Environment | DEBUG_DELIVERY | Hyperdrive | Raw code in response |
|-------------|----------------|------------|---------------------|
| local       | true           | none       | yes (local_debug)   |
| dev         | true           | none       | yes (local_debug)   |
| stage       | true           | configured | yes (local_debug)   |
| prod        | **false**      | configured | **never**           |

- Login codes: 6-digit numeric, generated via `crypto.getRandomValues()`, stored
  as SHA-256 hash only.
- Session tokens: `sps_ses_<id>.<64-char-hex-secret>`, only the SHA-256 hash of
  the secret portion is stored.
- Challenge TTL: 10 minutes. Session TTL: 30 days.
- `consumeLoginChallenge` is atomic — verifies code hash and marks consumed in
  one call.

## Verification Results

### Build, Typecheck, Lint
```
pnpm --filter @saas/identity-worker build      ✓
pnpm --filter @saas/identity-worker typecheck   ✓
pnpm --filter @saas/identity-worker lint        ✓
pnpm --filter @saas/contracts build             ✓
pnpm --filter @saas/contracts typecheck         ✓
pnpm --filter @saas/contracts lint              ✓
pnpm --filter @saas/identity-worker-tests test  ✓ (32 tests pass)
pnpm --filter @saas/identity-worker-tests typecheck ✓
pnpm --filter @saas/identity-worker-tests lint  ✓
```

### Wrangler Dry-Run
```
dev:   133.61 KiB / gzip: 31.69 KiB — ENVIRONMENT=dev, DEBUG_DELIVERY=true
stage: 133.61 KiB / gzip: 31.69 KiB — ENVIRONMENT=stage, DEBUG_DELIVERY=true, SOURCEPLANE_DB bound
prod:  133.61 KiB / gzip: 31.69 KiB — ENVIRONMENT=prod, DEBUG_DELIVERY=false, SOURCEPLANE_DB bound
```

### Orun
```
orun validate: ✓ All validation passed
orun plan:     3 components × 3 envs → 7 jobs (contracts, identity-worker, identity-worker-tests)
orun run:      7/7 jobs ✓ (dry-run, github-actions runner)
```

### Whitespace
```
git diff --check: clean
```

## Security Notes

- **No raw codes in persistence**: Only SHA-256 hashes reach the repository.
- **No raw token secrets in persistence**: Only SHA-256 hashes stored.
- **Prod debug delivery disabled**: `DEBUG_DELIVERY=false` in prod wrangler config.
  The handler checks `env.DEBUG_DELIVERY === "true"` — prod will never expose raw
  codes.
- **Web Crypto only**: All randomness from `crypto.getRandomValues()`, all hashing
  from `crypto.subtle.digest()`. No `Math.random()`.
- **No secrets in health**: Health endpoint exposes only boolean status, never
  connection strings, hashes, or tokens.
- **Request ID validation**: Incoming X-Request-Id validated against `/^[\w-]{1,128}$/`
  before use; invalid values are replaced with generated IDs.

## Remaining Gaps

- **api-edge service binding facade**: Intentionally deferred. A follow-up task
  will add the service binding from `api-edge` to `identity-worker` and create
  the `/v1/auth/*` forwarding facade in api-edge.
- **Email delivery integration**: This task uses debug/stub delivery only. A
  future task will integrate an email provider (SES, Resend, etc.).
- **Rate limiting**: Not implemented at the Worker level. Expected to be handled
  by Cloudflare WAF or a future rate-limiting middleware.
- **Session refresh/rotation**: Sessions have a fixed 30-day expiry with no
  refresh mechanism currently.

## PR

- **Number**: #54
- **URL**: https://github.com/sourceplane/multi-tenant-saas/pull/54
- **Branch**: `codex/task-0013-identity-worker-auth-runtime`
- **Base**: `main`
- **Mergeable**: yes
