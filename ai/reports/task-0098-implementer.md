# Task 0098 — Implementer Report

**Task:** `ai/tasks/task-0098.md` — `packages/sdk` scaffold + base client + orgs/projects pilot (B4 first half).
**Branch:** `impl/task-0098-packages-sdk-scaffold`
**PR Number:** #[PR]

## Summary

- Stood up the new `@saas/sdk` workspace under `packages/sdk/` — typed,
  dependency-free (only `@saas/contracts` workspace types + `vitest` /
  `typescript` / eslint configs in `devDependencies`), runtime-agnostic
  (browser, Node ≥ 20, Cloudflare Workers, Bun).
- Shipped the base `Transport` (configurable `baseUrl`, optional bearer/session
  auth, default headers, per-request `idempotencyKey` / `signal` / `requestId` /
  `headers`) and the typed error hierarchy keyed on
  `@saas/contracts/errors#ERROR_CODES`. `RateLimitError` decodes the headers
  Task 0097 will emit (`Retry-After`, `X-RateLimit-{Limit,Remaining,Reset}-{org,identity}`),
  defensively (missing headers yield `null`, never throw).
- Two pilot resource clients: `client.organizations.{list,get,create}` and
  `client.projects.{list,get,create,archive}`. POST surfaces accept a
  caller-owned `idempotencyKey` (Stripe parity — SDK does NOT auto-generate).
- 31 vitest tests (`src/__tests__/sdk.test.ts`) cover success path, every
  `ERROR_CODES` decode branch reachable from the pilot facades, idempotency
  propagation (presence + absence on POST), abort-signal forwarding, request-id
  auto-gen + passthrough, full Task-0097 rate-limit-header decode, missing
  rate-limit headers, non-JSON 5xx fallback, empty 5xx body, forward-compat
  for unknown error codes, and resource-method URL/method shape.
- Unlocks Task 0099 (resource-client fan-out — memberships, api-keys, webhooks,
  metering, billing, events, security-events, config, notifications) by copy/
  pasting the orgs/projects pattern, and `packages/cli` (B4 second half).

## Files Changed

`packages/sdk/`:
- **config**: `package.json`, `tsconfig.json`, `tsconfig.build.json`,
  `eslint.config.js`
- **src**: `index.ts`, `transport.ts`, `errors.ts`, `organizations.ts`,
  `projects.ts`
- **tests**: `src/__tests__/sdk.test.ts`
- **docs**: `README.md`

Root:
- `pnpm-lock.yaml` — added `vitest@^2.1.9` (devDep on `@saas/sdk`).

No other files in the repo were touched. `apps/**`, `infra/**`,
`packages/contracts/**`, `tests/**`, and other packages are unchanged.

## Checks Run

| Command | Exit | Notes |
| --- | --- | --- |
| `pnpm install` | 0 | New workspace registered; only new dep is `vitest` (devDep). |
| `pnpm --filter @saas/sdk typecheck` | 0 | strict, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`. |
| `pnpm --filter @saas/sdk lint` | 0 | 0 warnings. |
| `pnpm --filter @saas/sdk test` | 0 | 31/31 passed (vitest 2.1.9). |
| `pnpm -r typecheck` | 0 | Repo-wide green (Task 0091 baseline preserved). |
| `pnpm -r --no-bail lint` | 0 | 45 residual warnings, all in `tests/api-edge` (Track B baseline; cleared by Task 0096f). |
| Hazard scan: `git diff main -- 'packages/sdk/**' \| grep -E '^\+.*(eslint-disable\|@ts-ignore\|@ts-expect-error\|as unknown as\|as any)' \| wc -l` | `0` | Track A/B hazard ban honoured. |
| Runtime audit: `grep -rE "from ['\"]node:" packages/sdk/src` | (no matches) | Pure Web Platform. |
| Runtime audit: `grep -rE "from ['\"]@?(apps/\|.*worker)" packages/sdk/src` | (no matches) | No worker / app imports. |
| Surface check (grep on `src/index.ts`) | OK | exports `Sourceplane`, `OrganizationsClient`, `ProjectsClient`, `Transport`, `generateRequestId`, full error hierarchy (`SourceplaneError`, `BadRequestError`, `UnauthenticatedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `ValidationError`, `PreconditionFailedError`, `UnsupportedError`, `InternalError`, `RateLimitError`), `decodeError`, contract type re-exports, `ERROR_CODES`. |

`dependencies` block of `packages/sdk/package.json`:

```json
"dependencies": {
  "@saas/contracts": "workspace:*"
}
```

(`@saas/contracts` is a workspace type-only re-export — no transitive runtime
deps escape into a published bundle.)

## Assumptions

- `@saas/contracts/errors#ERROR_CODES` is the source of truth for decoder
  branches. Any new `ERROR_CODES` value will fall through to the generic
  `SourceplaneError` (forward-compat) until a typed branch is added.
- `globalThis.crypto.randomUUID` is available on every target runtime
  (browsers ≥ Chrome 92 / Firefox 95 / Safari 15.4, Node ≥ 19, Cloudflare
  Workers, Bun). A `getRandomValues`-based fallback covers the rare gap.
- The api-edge success envelope is `{ data, meta: { requestId, cursor? } }`
  (consistent across worker `http.ts` files); the transport unwraps `data`
  and surfaces non-conformant 2xx bodies as the raw payload (defensive).
- `RateLimitError` field shape matches Task 0097's prompt verbatim
  (`retryAfterSeconds`, `scope`, per-window `{limit, remaining, resetAt}`).
  Missing headers yield `null` until Task 0097 lands; no contract change is
  needed when it does.
- Caller-owned `idempotencyKey` on POST (Stripe parity) — SDK does NOT
  auto-generate.

## Latitude Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| HTTP transport | Native `fetch` (no wrapper); `options.fetch` injection seam for tests / polyfills. | Zero runtime deps; works on all four target runtimes. |
| Retry policy | None in this PR. `RateLimitError` exposes `retryAfterSeconds` and per-scope windows so callers (or a future middleware) can implement token-bucket-aware backoff. | Token-bucket parity with Task 0097's emitter is a follow-up; not required by the prompt. |
| Pagination | Returns `cursor` via the success envelope today; iterator helper deferred to Task 0099. | Pilot resources don't paginate end-to-end yet; preserves freedom. |
| Namespace layout | `client.<resource>.<action>` (Stripe-style). One file per resource under `src/`. | Obvious copy-paste pattern for Task 0099. |
| Error class names | One class per `ERROR_CODE` (`BadRequestError`, …) plus `SourceplaneError` base + `RateLimitError`/`ValidationError` extras. | `instanceof` ergonomics > opaque `code` switching. |
| Request-id format | `req_<uuid-no-dashes>` (matches `apps/api-edge/http.ts#generateRequestId` shape). | Server preserves the header verbatim; matching shape avoids surprise in logs. |
| Telemetry hook | Left as a no-op seam — `Transport` is a class, callers can subclass / wrap. | Out-of-scope per prompt; keeps surface minimal. |
| `exports` map | `.` and `./errors` only. | Prompt requires `./errors` for clean `instanceof`; keeps surface tight for now. |

## Spec Proposals

None.

## Remaining Gaps

For Task 0099 to pick up:
- Resource clients for memberships, api-keys, webhooks, metering, billing,
  events, security-events, config, notifications — copy `organizations.ts` /
  `projects.ts` shape.
- Pagination iterator helper (`for await (const page of client.x.list(...)`).
- Optional: token-bucket-aware retry middleware that consumes
  `RateLimitError.{retryAfterSeconds,windows}`.
- Telemetry hook implementation (no-op seam in place).
- B4 second half: `packages/cli` consuming `@saas/sdk`.

## Next Task Dependencies

Task 0099 (resource-client fan-out) needs to know:
- `Transport.request<T>(input, opts)` is the only call into the wire — every
  resource client takes the `Transport` in its constructor.
- Path encoding uses `encodeURIComponent(...)` for every identifier segment.
- POST routes accept an optional `idempotencyKey` in `RequestOptions`. The
  SDK does not auto-generate — if a CLI command wants safe retry, it must
  supply a key.
- `errors.ts` decodes `ERROR_CODES.*` 1:1. Adding a new `ERROR_CODES` value
  requires a new typed class + a `case` in `decodeError`. Forward-compat is
  preserved (unknown codes resolve to base `SourceplaneError`).
- `RateLimitError` field shape is locked; Task 0097 emitting the headers
  flips the SDK from "decoded as `null`" to populated values without code
  change.
- Tests live at `src/__tests__/sdk.test.ts` (vitest). Add per-resource files
  alongside as the surface grows.

## PR Number

#[PR]
