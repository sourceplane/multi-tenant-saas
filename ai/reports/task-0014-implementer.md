# Task 0014 — Implementer Report

## Summary

Added the first public `api-edge` service-binding facade for authentication. The
`api-edge` Worker now routes `/v1/auth/*` requests to the `identity-worker` via
Cloudflare service bindings (per-environment: stage→identity-worker-stage,
prod→identity-worker-prod). The facade preserves method, path, query string, body,
and required headers (Authorization, Content-Type, X-Request-Id, traceparent,
Idempotency-Key) without reading or logging credentials.

## Files Changed

### apps/api-edge (facade implementation)

| File | Change |
|------|--------|
| `src/index.ts` | Refactored to use request ID resolution, auth routing, and standard error envelopes |
| `src/env.ts` | Extended Env interface with `IDENTITY_WORKER?: Fetcher` |
| `src/auth-facade.ts` | New — route matching, header forwarding, service-binding fetch, error isolation |
| `src/http.ts` | New — request ID resolution, error envelope helpers |
| `wrangler.jsonc` | Added `services` binding for stage (identity-worker-stage) and prod (identity-worker-prod) |
| `scripts/verify-bindings.mjs` | Extended to verify IDENTITY_WORKER service binding targets per environment |

### tests/api-edge (test package)

| File | Change |
|------|--------|
| `package.json` | New — @saas/api-edge-tests package with Jest ESM config |
| `tsconfig.json` | New — includes Cloudflare Workers types for Fetcher |
| `eslint.config.js` | New — shared ESLint config |
| `component.yaml` | New — Orun component (turbo-package, dev/quick-check) |
| `src/auth-facade.test.ts` | New — 30 tests covering all facade behavior |

## Facade Behavior & Service-Binding Boundary

- `api-edge` is a pure transport facade: it does not import identity-worker source,
  query identity tables, or duplicate auth logic.
- Requests to `/v1/auth/login/start`, `/v1/auth/login/complete`, `/v1/auth/session`,
  `/v1/auth/logout` are forwarded via `env.IDENTITY_WORKER.fetch()`.
- The facade constructs a target URL with the original pathname and query string
  against `https://identity.internal` (arbitrary origin for service binding).
- Downstream responses are returned verbatim (status + headers + body).
- If `IDENTITY_WORKER` is not configured (dev/local) or the binding throws, a safe
  503 envelope is returned with code `internal_error`.
- Unknown routes return standard 404 error envelopes with request IDs.
- `/health` reports identity binding status (`configured: true/false`) without
  calling the binding or leaking downstream data.

## Checks Run & Results

| Command | Result |
|---------|--------|
| `pnpm install --frozen-lockfile` | ✓ (after lockfile update for new package) |
| `pnpm --filter @saas/api-edge build` | ✓ 110.77 KiB / gzip 28.14 KiB |
| `pnpm --filter @saas/api-edge typecheck` | ✓ |
| `pnpm --filter @saas/api-edge lint` | ✓ |
| `pnpm --filter @saas/api-edge verify-bindings` | ✓ All passed |
| `pnpm --filter @saas/contracts build` | ✓ |
| `pnpm --filter @saas/contracts typecheck` | ✓ |
| `pnpm --filter @saas/contracts lint` | ✓ |
| `pnpm --filter @saas/api-edge-tests test` | ✓ 30 passed |
| `pnpm --filter @saas/api-edge-tests typecheck` | ✓ |
| `pnpm --filter @saas/api-edge-tests lint` | ✓ (7 warnings, 0 errors) |
| `wrangler deploy --dry-run --env dev` | ✓ |
| `wrangler deploy --dry-run --env stage` | ✓ |
| `wrangler deploy --dry-run --env prod` | ✓ |
| `orun validate` | ✓ |
| `orun plan --changed` | ✓ 2 components × 3 envs → 4 jobs |
| `orun run --dry-run --runner github-actions` | ✓ 4 jobs pass |
| `git diff --check` | ✓ No whitespace errors |

## Wrangler Dry-Run Summary

### dev
- Binding: `env.ENVIRONMENT ("dev")` only
- No service binding (expected for local/dev)

### stage
- `env.SOURCEPLANE_DB (08f7c6055f544a3890a585d88fd92348)` — Hyperdrive Config
- `env.IDENTITY_WORKER (identity-worker-stage)` — Worker
- `env.ENVIRONMENT ("stage")` — Environment Variable

### prod
- `env.SOURCEPLANE_DB (ab2c21c2db6245a59c91588fcac7107a)` — Hyperdrive Config
- `env.IDENTITY_WORKER (identity-worker-prod)` — Worker
- `env.ENVIRONMENT ("prod")` — Environment Variable

## Orun Plan Summary

- Changed scope: `api-edge` + `api-edge-tests`
- Plan ID: `c8cc3993979b`
- Jobs: api-edge (dev verify, stage verify, prod verify) + api-edge-tests (dev verify)
- Dry-run: all 4 jobs pass
- Deploy profile: stage/prod deploy triggered only on `github-push-main`
- The composition template uses `{{ .orun.environment.name }}` for `--env`, correctly
  resolving per-environment service bindings from wrangler.jsonc.

## Security Notes

- Bearer tokens are forwarded via the `Authorization` header but never read, parsed,
  logged, or stored by the facade.
- Request IDs are generated or validated (regex: `^[\w-]{1,128}$`) — no injection risk.
- The facade does not log raw tokens, codes, connection strings, or exception messages.
- Service binding errors produce a generic "Authentication service unavailable" message;
  no Worker names, hostnames, or stack traces are leaked.
- The `DEBUG_DELIVERY` flag is an identity-worker concern; the facade does not read or
  forward it.
- The `verify-bindings.mjs` script validates that stage does not bind to prod and vice
  versa, preventing cross-environment data flow.

## Remaining Gaps

- `api-edge` component.yaml still has dead `dryRunCommand`/`deployCommand` parameters
  pointing at `--env prod`. These are overridden by the composition template's
  `{{ .orun.environment.name }}` interpolation and do not affect actual deploy behavior.
  Left unfixed per task scope (not a new issue introduced here).
- No health-check call to the identity binding in `/health` — by design, to avoid
  leaking downstream response bodies. Only reports `configured: true/false`.

## PR

- **PR #55**: https://github.com/sourceplane/multi-tenant-saas/pull/55
- Branch: `codex/task-0014-api-edge-auth-facade`
- Base: `main`
- Status: Mergeable
