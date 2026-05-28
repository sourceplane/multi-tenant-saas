# Task 0044 — Implementer Report

## Summary

Wired identity-worker auth runtime flows to the identity-owned security-event
source repository (established in task 0043). All auth mutation paths now
record security events via `recordSecurityEvent`:

- **`login.challenge.created`** on successful `startLogin`
- **`session.created`** on successful `completeLogin`
- **`login.complete.failed`** on failed login-complete attempts (invalid format,
  wrong code, expired challenge, already-consumed challenge)
- **`session.revoked`** on successful `logout`

Request context (requestId, IP via `cf-connecting-ip`/`x-forwarded-for`,
user-agent) is threaded through to all security events. Tests import the real
`createAuthService` from source, replacing the mirrored test implementation.

## Files Changed

| File | Change |
|---|---|
| `apps/identity-worker/src/ids.ts` | Added `generateSecurityEventId` |
| `apps/identity-worker/src/request-context.ts` | New: `extractRequestContext` helper |
| `apps/identity-worker/src/services/auth.ts` | Added `RequestContext`, `eventBase()`, security event recording in `startLogin`, `completeLogin`, `logout`; expanded `LogoutError` to include `internal_error` |
| `apps/identity-worker/src/handlers/login-start.ts` | Pass `ctx` from request to auth service |
| `apps/identity-worker/src/handlers/login-complete.ts` | Pass `ctx` from request to auth service |
| `apps/identity-worker/src/handlers/logout.ts` | Pass `ctx` from request to auth service; handle `internal_error` with HTTP 500 |
| `tests/identity-worker/src/helpers/fake-repository.ts` | Added `_securityEvents`, `recordSecurityEvent`, `querySecurityEventsByUser` |
| `tests/identity-worker/src/auth-service.test.ts` | Refactored to import real `createAuthService` and id helpers from source; added 20+ security event tests |

## Checks Run

| Command | Result |
|---|---|
| `pnpm --filter @saas/identity-worker typecheck` | ✅ Pass |
| `pnpm --filter @saas/db typecheck` | ✅ Pass |
| `pnpm --filter @saas/identity-worker-tests test` | ✅ 59 tests pass (2 suites) |
| `kiox -- orun validate --intent intent.yaml` | ✅ Valid |
| `kiox -- orun plan --changed --intent intent.yaml --output plan.json` | ✅ 2 components × 3 envs → 4 jobs |
| `kiox -- orun plan --intent intent.yaml --view dag` | ✅ 25 components × 3 envs → 53 jobs |
| `kiox -- orun run --plan plan.json --dry-run --runner github-actions` | ✅ 4 selected, all pass |

## Plan/DAG Impact

Changed plan scope: `identity-worker` (dev/stage/prod verify-deploy) and
`identity-worker-tests` (dev quick-check). No new components or dependency
edges added. No migration changes.

## Security Event Coverage

| Event Type | Outcome | Fields Populated |
|---|---|---|
| `login.challenge.created` | `success` | userId, challengeId, requestId, ip, userAgent |
| `session.created` | `success` | userId, sessionId, challengeId, requestId, ip, userAgent |
| `login.complete.failed` | `invalid_challenge_format` | requestId, ip, userAgent |
| `login.complete.failed` | `invalid_code_or_challenge` | challengeId, requestId, ip, userAgent |
| `login.complete.failed` | `expired_challenge` | challengeId, requestId, ip, userAgent |
| `login.complete.failed` | `already_consumed` | challengeId, requestId, ip, userAgent |
| `session.revoked` | `success` | userId, sessionId, requestId, ip, userAgent |

Metadata for all events is limited to `{ method: "email_code" }` or `{}`.
All event IDs and entity references use raw UUIDs, not public-prefixed IDs.

## Secret Handling

- **Never stored:** raw one-time codes, code hashes, bearer tokens, token
  secrets, token hashes, API keys, or provider secrets
- **Tests assert:** event metadata and serialized event JSON do not contain
  raw codes or tokens; no suspect keys (`code`, `codeHash`, `tokenHash`,
  `secret`, `token`, `bearerToken`, `apiKey`) appear in metadata
- **Debug delivery unchanged:** `DEBUG_DELIVERY=true` still returns raw codes
  only through the existing handler response path; security events never
  record the code

## Assumptions

1. **Non-transactional recording is acceptable.** The auth service records
   security events as a separate write after the auth mutation. If event
   recording fails after a successful mutation (e.g., challenge created but
   event write fails), the user receives `internal_error` and the orphaned
   challenge/session expires naturally. This is conservative and documented.

2. **Best-effort for failure events.** When a login attempt fails (wrong code,
   expired, etc.), the failure event is recorded best-effort. If recording
   the failure event itself fails, the original auth error is preserved
   unchanged.

3. **IP from headers is informational only.** `cf-connecting-ip` and
   `x-forwarded-for` are used as metadata context, never for authorization
   decisions.

4. **`getSession` does not record events.** It is a read-only operation and
   not an auth mutation.

## Spec Proposals

None required. The non-transactional gap is documented in assumptions above
but does not require a spec proposal because the current behavior is
conservative (fails closed with `internal_error` on event recording failure)
and orphaned entities expire naturally.

## Remaining Gaps

- **No userId on failure events** when the challenge is invalid or not found.
  A future enhancement could look up the challenge to populate userId on
  failure events, but this adds an extra query per failure.
- **No transactional event+mutation atomicity.** Would require either
  `TransactionalSqlExecutor` support in identity-worker or a new migration
  to add trigger-based event recording.
- **No public security-event query route.** Per scope: no `GET` route, no
  api-edge forwarding, no web-console UI.
- **No org-scoped audit copies.** Identity security events remain user-scoped
  in `identity.security_events` until organization context is wired.

## Next Task Dependencies

- Public security-event list route (`GET /v1/auth/security-events`) requires
  api-edge forwarding and pagination contract work.
- Org-scoped audit copies require the shared event envelope and organization
  membership context.
- Transactional event recording requires `TransactionalSqlExecutor` or
  database-side triggers.

## PR Number

87
